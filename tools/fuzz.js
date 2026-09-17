/* Random-play soak test for the village.

   Not a unit test: it drives the REAL tap handler and the real step loop with
   thousands of random actions, and after every single one it checks the things
   that must be true of any village whatever the player did. Every economy bug
   that mattered here was found this way rather than by reading the code --
   spending into the negative, placing on unclaimed land, a storehouse upgrade
   zeroing its own capacity, villagers frozen mid-stride.

   Run it against a page that already has the game loaded:

     const s = document.createElement('script');
     s.src = 'tools/fuzz.js'; document.head.appendChild(s);
     await window.fuzz(15000);

   It plays on a throwaway village, and it puts the real save back when it is
   done -- place(), sell() and the rest all call save(), so a run WILL overwrite
   whatever was in local storage while it is going. Do not kill it halfway
   through on a device whose village you care about. */
(function () {
  const V = window.__v;
  if (!V) { console.error('fuzz: load this on a page with the game running'); return; }

  const R = n => (Math.random() * n) | 0;
  const pick = a => a[R(a.length)];

  /* An invariant is written as "what must hold after ANY action", never as
     "what a healthy village looks like at this instant" -- the difference cost
     two rounds of false failures, once by asking whether a villager was still
     walking to work after eighty frames, which is true of a perfectly healthy
     one mid-cycle. */
  const INVARIANTS = [
    ['no negative resources', () => V.res.wood >= 0 && V.res.food >= 0],
    // the goal strip's "ready" must be a purchase the game will actually make
    ['a goal that says ready can be bought', () => {
      if (V.buyProgress('hall').startsWith('ready') && !V.canUpgrade(V.hallOf())) return false;
      if (V.buyProgress('land').startsWith('ready') && !V.canClaim()) return false;
      return true;
    }],
    /* An offer stays in its stall until it is gone: filling one used to slide the
       rest left under the player's finger. Remembers each id's stall between
       checks; a reload issues new ids, so it cannot be fooled across one. */
    ['an offer never moves to another stall', (() => { const at = new Map(); return () => {
      V.orderRects();
      const seen = new Set();
      for (const o of V.orders) {
        if (seen.has(o.slot)) return false;
        seen.add(o.slot);
        if (at.has(o.id) && at.get(o.id) !== o.slot && o.slot < V.orderSlots() && at.get(o.id) < V.orderSlots()) return false;
        at.set(o.id, o.slot);
      }
      return true;
    }; })()],
    // an upgrade leaves the building standing: only a first build rises from the ground
    ['an upgrading building keeps its full size', () => V.placed.every(p => {
      if (p.t >= 1 || !V.established(p)) return true;
      const now = V.artRect(p), done = V.artRect({ ...p, t: 1 });
      return !now || Math.abs(now.wid - done.wid) < 1e-6;
    })],
    /* The hall's advice names something the player can actually do. It said
       "build a house" above a locked House card. Checked against the tray's and
       the upgrade button's own rules, not the advice's. */
    ['the village only advises what can be done', () => {
      for (const short of ['people', 'jobs']) {
        const say = V.remedy(short);
        const kinds = V.BUILDINGS.filter(b => b.key !== 'hall' && !b.decor && (short === 'people' ? b.pop : b.jobs && b.makes));
        if (say.startsWith('build') && !kinds.some(b => V.unlocked(b.key) && !V.atLimit(b.key))) return false;
        if (say.startsWith('improve') && !V.placed.some(p => kinds.some(b => b.key === p.key)
          && p.t >= 1 && !V.upInfo(p).max && !V.upInfo(p).gate)) return false;
        if (say.startsWith('raise') && (!V.hallOf() || V.upInfo(V.hallOf()).max)) return false;
      }
      return true;
    }],
    /* NOT "resources never exceed the cap" -- that is false for an honest
       village, because selling a storehouse drops the ceiling below what is
       already in the barn and the goods do not evaporate. The rule that
       actually holds is that nothing ever RISES past the ceiling: over the cap,
       the only legal direction is down. Getting this wrong produced two rounds
       of confident false failures before it was stated correctly. */
    ['nothing rises above its cap', () => {
      for (const k of ['wood', 'food']) {
        if (V.res[k] <= V.caps[k] + 1e-6) continue;
        if (V.res[k] > prev[k] + 1e-6) return false;
      }
      return true;
    }],
    // nothing in the game can build a second one, which is exactly why the
    // save loader never checked
    ['exactly one town hall', () => V.placed.filter(p => p.key === 'hall').length === 1],
    /* No dead ends. Every scrap of income in this game comes from a villager,
       so a village with none and an empty barn stays that way for ever -- and
       the autosave writes it down. The hall keeps one caretaker so there is
       always a way back; this is the rule that says so. Only after a step,
       because syncVillagers is what enforces it. */
    ['the village always has somebody', what =>
      what !== 'step' || V.villagers.length >= 1],
    ['no two buildings share a tile', () => {
      const seen = new Set();
      for (const p of V.placed) {
        const b = V.B(p.key);
        for (let c = p.c; c < p.c + (b.w || 1); c++)
          for (let r = p.r; r < p.r + (b.h || 1); r++) {
            if (seen.has(c + ':' + r)) return false;
            seen.add(c + ':' + r);
          }
      }
      return true;
    }],
    ['everything stands on claimed land', () => V.placed.every(p => {
      const b = V.B(p.key);
      return V.inLand(p.c, p.r) && V.inLand(p.c + (b.w || 1) - 1, p.r + (b.h || 1) - 1);
    })],
    ['no building outranks the hall', () =>
      V.placed.every(p => p.key === 'hall' || V.lvlOf(p) <= V.hallLevel())],
    ['the hall allows what is standing', () => {
      for (const b of V.BUILDINGS) {
        if (b.key === 'hall' || V.isDecor(b.key)) continue;
        if (V.countOf(b.key) > (V.allowedOf(b.key) || 0)) return false;
      }
      return true;
    }],
    ['villagers stay inside the world', () => V.villagers.every(g =>
      Number.isFinite(g.x) && Number.isFinite(g.y)
      && Math.abs(g.x) < 1e5 && Math.abs(g.y) < 1e5)],
    ['no villager holds a job that is gone', () => V.villagers.every(g =>
      g.job == null || V.placed.some(p => p.id === g.job))],
    /* A load exists only while it is being carried to a store. Anyone holding
       one in any other state is holding it for ever -- there is no way to put
       it down again -- and the goods are gone from the village without ever
       arriving. Both the sell path and the upgrade path did this. */
    ['a carried load is always on its way somewhere', () =>
      V.villagers.every(g => !g.carry || g.st === 'toStore')],
    /* Liveness, not safety: the village should not be standing around with
       people to spare and posts asking for them. It is the property the hall's
       woodpile broke for months -- two villagers minding a pile at a quarter of
       the rate while the lumber camp beside them sat empty, because a job, once
       taken, was never reconsidered.

       Only judged after a step, because every other action changes the village
       without running assignJobs: building something makes a vacancy that is
       filled on the next tick, not on the same one. */
    ['nobody idle while a post is asking', what => {
      if (what !== 'step') return true;
      const { want } = V.desiredJobs();
      const count = new Map();
      for (const g of V.villagers) if (g.job != null) count.set(g.job, (count.get(g.job) || 0) + 1);
      const short = [...want].some(([id, n]) => (count.get(id) || 0) < n);
      /* Someone carrying is not free; they take a post after they put it down.
         Nor is someone who put one down DURING this step.

         assignJobs runs at the top of the tick and skips anyone holding a load,
         so a villager whose workplace was sold delivers halfway through the
         same tick and ends it with no job and no load -- idle by the letter of
         this rule, for exactly one frame, by a design assignJobs states
         outright. It cost one failure in 240,000 rounds and the game was right
         both times. carriedBefore is the set from before the step. */
      const free = V.villagers.some(g => g.job == null && !g.carry && !carriedBefore.has(g));
      return !(short && free);
    }],
    ['a post is never over-staffed', () => {
      for (const p of V.placed) if (V.B(p.key).jobs)
        if (V.workersAt(p.id) > V.jobsOf(p)) return false;
      return true;
    }],
    ['the camera stays finite', () =>
      Number.isFinite(V.CAM.x) && Number.isFinite(V.CAM.y) && V.CAM.z > 0.01],
    ['stock never goes negative or runs away', () => V.placed.every(p =>
      p.stock === undefined || (p.stock >= -1e-6 && p.stock < 1e4))],
    /* The two caches. Both are rebuilt by hand at the points where the village
       changes, which is the kind of arrangement that works until someone adds a
       twelfth of those points -- so the soak test recomputes them from scratch
       after every action and insists they agree. */
    ['the cached store list is not stale', () => {
      // the same line the game draws: an upgrading store is still a store
      const want = V.placed.filter(p => V.established(p) && (V.B(p.key).caps || p.key === 'hall'));
      const have = V.stores();
      return have.length === want.length && want.every(p => have.includes(p));
    }],
    ['the cached charm total is not stale', () =>
      V.charmTotal() === V.placed.reduce((n, p) =>
        n + (V.isDecor(p.key) ? V.B(p.key).charm : 0), 0)],
    /* The paved-tile set and the travel times come off the same rebuild. A
       stale path set makes every delivery figure in the interface wrong the
       moment a road is laid or pulled up. */
    ['the cached path set is not stale', () => {
      const want = V.placed.filter(q => q.key === 'path').map(q => q.c + ',' + q.r);
      const have = V.pathSet;
      return have.size === want.length && want.every(k => have.has(k));
    }],
    ['cached travel times are not stale', () => V.placed.every(q => {
      if (!V.B(q.key) || !V.B(q.key).jobs) return true;
      const cached = V.routeOf(q).secs;
      const fresh = V.routeOf({ ...q, id: -1 }).secs;
      return Math.abs(cached - fresh) < 1e-6;
    })],
    /* And the job plan, which is cached off the same events plus the
       population. A stale one puts villagers at the wrong posts quietly -- the
       village still works, it just earns less, which is precisely the kind of
       fault that goes unnoticed for months. */
    ['the cached job plan is not stale', () => {
      const cached = V.desiredJobs(), fresh = V.computeJobs();
      if (cached.want.size !== fresh.want.size) return false;
      for (const [id, n] of fresh.want) if (cached.want.get(id) !== n) return false;
      return true;
    }],
    /* And a store the cache still believes in must be where it says it is:
       moving one changes no membership at all, only a position. */
    ['a cached store is where it stands', () => V.stores().every(p => {
      const b = V.B(p.key), c = V.tileToWorld(p.c + (b.w - 1) / 2, p.r + (b.h - 1) / 2);
      return V.nearestStore(c.x, c.y) !== null;
    })],
  ];

  let prev = { wood: 0, food: 0 };
  /* Filled just before every step, read by the idle rule just after it. */
  let carriedBefore = new Set();
  function check(what) {
    for (const [name, f] of INVARIANTS) {
      let ok;
      try { ok = f(what); } catch (e) { return name + ' threw: ' + e.message + ' (after ' + what + ')'; }
      if (!ok) return name + ' (after ' + what + ')';
    }
    prev = { wood: V.res.wood, food: V.res.food };
    return null;
  }

  const W = 1024, H = () => document.querySelector('canvas').height;

  /* Start from a village that is actually WORKING. Random tapping on its own
     never gets houses finished, so a run that begins from bare ground checks
     every invariant about workforces, stock and delivery against an empty
     island and reports a confident pass. */
  function seed() {
    V.landTier = 2; V.placed[0].lvl = 4;
    V.grant('wood', 9000, 0, 0); V.grant('food', 9000, 0, 0);
    const L = V.landBounds();
    for (const k of ['store', 'farm', 'farm', 'lumber', 'lumber', 'well',
                     'house', 'house', 'house', 'house', 'flowers', 'path']) {
      for (let tries = 0; tries < 40; tries++)
        if (V.place(k, L.lo + R(L.hi - L.lo + 1), L.lo + R(L.hi - L.lo + 1))) break;
    }
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);   // let it build and staff up
  }

  /* A signature of everything the save is supposed to carry, so a round trip
     can be compared field by field. Written the day a new field on trade orders
     was added to makeOrder and quietly dropped by load(), which stopped the
     board marking its best stall -- an invisible failure that only began after
     a reload, which is the hardest kind to notice by playing. */
  function signature() {
    return JSON.stringify({
      placed: V.placed.map(p => [p.key, p.c, p.r, p.lvl | 0, Math.round((p.t || 0) * 100)]).sort(),
      /* Clamped to the ceiling, because a surplus ABOVE the ceiling is not state
         a reload is supposed to preserve.

         Sell storage while the barn holds more than what is left and the village
         legitimately carries more than it can store -- that is why the rule
         above is "nothing RISES above its cap" rather than "nothing exceeds
         it" -- and the excess drains away on the next delivery. load() clamps it
         at once instead, which is the same answer sooner. Comparing the raw
         number made that a round-trip failure: five in 120,000 rounds, every one
         of them the game doing exactly what it says it does, and a false failure
         is worse than none because it teaches you to ignore the report. */
      res: { wood: Math.round(Math.min(V.res.wood, V.caps.wood)),
             food: Math.round(Math.min(V.res.food, V.caps.food)) },
      land: V.landTier, goal: V.goalIdx, done: V.ordersDone, mute: V.muted,
      orders: V.orders.map(o => [o.tier, o.giveK, o.giveN, o.getK, o.getN]),
    });
  }
  function roundTrip() {
    const was = signature();
    V.save();
    const keep = V.placed.slice(), kv = V.villagers.slice();
    V.placed.length = 0; V.villagers.length = 0; V.orders = [];
    V.load();
    const now = signature();
    if (now === was) return null;
    V.placed.length = 0; for (const p of keep) V.placed.push(p);
    V.villagers.length = 0; for (const g of kv) V.villagers.push(g);
    /* Putting the village back by hand leaves every cache describing the one
       that was just loaded. Without this the next check reports a stale store
       list, which is this restore's fault and not the game's -- one failure
       became two, and the second pointed at the wrong place. */
    V.rebuildStores();
    return 'a save/load round trip changed the village';
  }

  /* The whole arc, under the same invariants.

     The fuzzer taps at random, and random tapping demolishes about as often as
     it builds: six runs of six thousand rounds each ended at hall 4 or below,
     twenty buildings at most, three villagers at most, and never once reached
     hall 5 or the full island. So every rule in the list above -- the workforce
     ones, the carried-load ones, the cache ones -- had only ever been tested on
     a small early-game village.

     That is the same blind spot the drawing sweeps had: the exceptional state is
     the one nobody visits. This plays deliberately instead, with a policy good
     enough to finish: fill a trade when the village is rich in what it is being
     asked for, claim land when it can, build the next thing that is allowed and
     affordable, and otherwise improve the lowest-level building. Invariants are
     checked after every action and every step, exactly as in the fuzzer.

       arcSweep()  -> { minutes, goals, hall, land, placed, villagers, fails }
  --------------------------------------------------------------------------- */
  window.arcSweep = function (maxMinutes = 90) {
    const realSave = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 0;
    V.goalIdx = 0; V.ordersDone = 0; V.orders = []; V.tutSeen.length = 0;
    V.res.wood = 60; V.res.food = 40; V.ensureHall();
    const fails = [], seen = new Set();
    const note = bad => { if (bad && !seen.has(bad)) { seen.add(bad); fails.push(bad); } };
    /* Nearest free spot to the middle, so the village grows as a village rather
       than a line down one edge -- distance matters to every delivery figure,
       and a pathological layout would test the rules on a village no player
       would ever build. */
    const spotFor = key => {
      const L = V.landBounds(), occ = V.occupied(), mid = V.tileToWorld(7, 7);
      let best = null, bd = Infinity;
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) {
        if (!V.canPlace(key, c, r, occ)) continue;
        const w = V.tileToWorld(c, r), d = Math.hypot(w.x - mid.x, (w.y - mid.y) * 2);
        if (d < bd) { bd = d; best = [c, r]; }
      }
      return best;
    };
    /* The hall first, always. It gates how many of everything else you may
       have, so a policy that treats it as just another building never leaves
       the early game: the first version of this bought statues with the wood
       and finished ninety simulated minutes at hall 2 and goal 5. Decorations
       come last, and only once the charm goal is the one on the strip. */
    const ORDER = ['house', 'lumber', 'farm', 'house', 'store', 'well', 'farm',
                   'lumber', 'mill', 'house', 'store', 'market', 'farm', 'lumber',
                   'well', 'mill', 'house', 'store', 'market'];
    const budget = maxMinutes * 60 * 30;
    const afford = c => (c.wood || 0) <= V.res.wood && (c.food || 0) <= V.res.food;
    // when each goal was reached, in simulated minutes -- where the dead stretches are
    const goalTimes = []; let lastGoal = V.goalIdx;
    for (let i = 0; i < budget; i++) {
      carriedBefore = new Set(V.villagers.filter(g => g.carry));
      V.step(1 / 30);
      if (V.goalIdx !== lastGoal) { goalTimes.push([lastGoal, +(i / 1800).toFixed(1)]); lastGoal = V.goalIdx; }
      note(check('step'));
      if (i % 15) continue;
      let acted = false;
      for (const o of V.orders.slice())
        if (V.canFill(o) && V.res[o.giveK] / V.caps[o.giveK] > 0.55) {
          V.fillOrder(o); note(check('fillOrder')); acted = true;
        }
      const hall = V.hallOf();
      if (!acted && V.canUpgrade(hall)) { V.upgradeBuilding(hall); note(check('upgradeHall')); acted = true; }
      if (!acted && V.canClaim && V.canClaim() && V.claimLand()) { note(check('claim')); acted = true; }
      /* What the strip is asking for comes before what the list would pick.

         Skipping anything with no spare hands is sound policy in general and
         wrong when a goal names the building: a run measured a forty-minute
         stretch on "Open a market" because the market has one post and the
         village never had a spare pair of hands to fill it. A player reading
         that goal would simply build the thing. Since the market takes a hand
         from somewhere else rather than standing empty -- which is what the
         warning now says -- following the goal is the honest policy. */
      const goalNow = V.currentGoal();
      const wanted = goalNow && ['house', 'lumber', 'farm', 'store', 'well', 'mill', 'market']
        .find(k => new RegExp(k === 'store' ? 'storehouse' : k, 'i').test(goalNow.text));
      if (!acted && wanted && V.unlocked(wanted) && !V.atLimit(wanted) && afford(V.B(wanted).cost)) {
        const sp = spotFor(wanted);
        if (sp && V.place(wanted, sp[0], sp[1])) { note(check('placeForGoal')); acted = true; }
      }
      if (!acted) for (const k of ORDER) {
        if (!V.unlocked(k) || V.atLimit(k) || !afford(V.B(k).cost)) continue;
        if (V.noSpareHands(k)) continue;
        const sp = spotFor(k);
        if (sp && V.place(k, sp[0], sp[1])) { note(check('place')); acted = true; break; }
      }
      if (!acted) {
        const ups = V.placed.filter(q => q.key !== 'hall' && V.canUpgrade(q))
          .sort((x, y) => V.lvlOf(x) - V.lvlOf(y));
        if (ups.length) { V.upgradeBuilding(ups[0]); note(check('upgrade')); acted = true; }
      }
      /* Charm is a goal of its own near the end, and statues are the cheapest
         way to it. Only then, because a statue early is wood that should have
         been a lumber camp. */
      if (!acted) {
        const g2 = V.currentGoal();
        if (g2 && /charm|decoration/i.test(g2.text) && !V.atLimit('statue') && afford(V.B('statue').cost)) {
          const sp = spotFor('statue');
          if (sp && V.place('statue', sp[0], sp[1])) { note(check('decorate')); acted = true; }
        }
      }
      if (V.goalIdx >= V.GOALS.length) break;
    }
    /* The HUD quotes expectedRate below a few loads a window and until the
       measurement catches up, so it has to be the truth about what arrives.
       Measured the plain way -- stock gained over two minutes with the stores
       kept half empty so nothing is refused -- in the finished village. */
    {
      const secs = 120, got = { wood: 0, food: 0 };
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half(); for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);   // settle
      half();
      const want = V.expectedRate();
      for (let s2 = 0; s2 < secs; s2++) {
        const before = { wood: V.res.wood, food: V.res.food };
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        for (const k of ['wood', 'food']) got[k] += V.res[k] - before[k];
        half();
      }
      for (const k of ['wood', 'food']) {
        const real = got[k] / secs;
        if (Math.abs(real - want[k]) > 0.15 * Math.max(real, want[k]))
          fails.push('the HUD rate for ' + k + ' is not what arrives: expected ' + want[k].toFixed(2) + '/s, got ' + real.toFixed(2) + '/s');
      }
    }
    try { if (realSave !== null) localStorage.setItem(V.KEY, realSave); } catch (e) {}
    return { goals: V.goalIdx + '/' + V.GOALS.length, hall: V.hallLevel(), land: V.landTier,
      placed: V.placed.length, villagers: V.villagers.length,
      res: { wood: Math.round(V.res.wood), food: Math.round(V.res.food) },
      caps: { ...V.caps }, trades: V.ordersDone, goalTimes, fails };
  };

  /* What a damaged save does.

     An app killed mid-write leaves a truncated one; storage that has been
     tampered with or half-cleared leaves worse. load() is written defensively
     and mostly held up -- but it took every building POSITION on trust, so a
     save with its buildings off the map loaded them off the map, and one with
     all of them on the same tile loaded twelve stacked on a single square. Both
     are states place() refuses outright and the rules above say cannot exist.

     Seventeen kinds of damage, each loaded the way a cold start loads: nothing
     in memory, resources at their opening values, then load, ensureHall and
     collectAway in that order. The village that comes out has to be playable --
     one hall, no shared tiles, nothing off the claimed land, resources finite
     and inside the ceiling, somebody alive.

       corruptSweep()  -> { cases, unplayable, bad, buildingsKept }
  --------------------------------------------------------------------------- */
  window.corruptSweep = function () {
    const real = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2;
    V.ensureHall(); V.placed[0].lvl = 4;
    const L = V.landBounds();
    for (const k of ['house', 'farm', 'lumber', 'store', 'well']) {
      V.grant('wood', 9999, 0, 0); V.grant('food', 9999, 0, 0);
      let done = false;
      for (let c = L.lo; c <= L.hi && !done; c++) for (let r = L.lo; r <= L.hi && !done; r++)
        if (V.canPlace(k, c, r, V.occupied())) { V.place(k, c, r); done = true; }
    }
    for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
    V.save();
    const good = localStorage.getItem(V.KEY), o = JSON.parse(good);
    const cases = {
      truncated: good.slice(0, Math.floor(good.length * 0.6)),
      notJson: 'nope', empty: '', nullish: 'null', arrayNotObject: '[1,2,3]',
      negativeRes: JSON.stringify({ ...o, res: { wood: -500, food: -9e9 } }),
      hugeRes: JSON.stringify({ ...o, res: { wood: 1e12, food: Number.MAX_VALUE } }),
      nanRes: JSON.stringify({ ...o, res: { wood: 'lots', food: null } }),
      placedNotArray: JSON.stringify({ ...o, placed: 'nope' }),
      placedGarbage: JSON.stringify({ ...o, placed: [{ key: 'dragon', c: 99, r: -5, lvl: 99 }, null, 42] }),
      badLand: JSON.stringify({ ...o, land: 999 }),
      badGoal: JSON.stringify({ ...o, goal: -7 }),
      ordersGarbage: JSON.stringify({ ...o, orders: [{ giveK: 'gold', giveN: NaN }, 'x'] }),
      versionFromFuture: JSON.stringify({ ...o, v: 999 }),
      tilesOffTheMap: JSON.stringify({ ...o, placed: o.placed.map(p => ({ ...p, c: -40, r: 80 })) }),
      everythingOnOneTile: JSON.stringify({ ...o, placed: o.placed.map(p => ({ ...p, c: 7, r: 7 })) }),
      landShrunkUnderTheVillage: JSON.stringify({ ...o, land: 0 }),
      sharedGarbage: JSON.stringify({ ...o, shared: { wood: -5, food: 'lots' } }),
      sharedHuge: JSON.stringify({ ...o, shared: { wood: 1e300, food: NaN } }),
    };
    const bad = [], kept = {};
    for (const [name, raw] of Object.entries(cases)) {
      try {
        localStorage.setItem(V.KEY, raw); localStorage.removeItem(V.KEY_BAK);
        V.placed.length = 0; V.villagers.length = 0; V.orders = [];
        V.res.wood = 60; V.res.food = 40; V.landTier = 0; V.goalIdx = 0; V.ordersDone = 0;
        V.sharedTotal = { wood: 0, food: 0 };
        V.load(); V.ensureHall(); V.collectAway();
        for (let i = 0; i < 5 * 30; i++) V.step(1 / 30);
        V.draw();
        const occ = new Set(); let shared = 0, off = 0;
        for (const q of V.placed) { const b = V.B(q.key);
          for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) {
            const key = (q.c + dc) + ',' + (q.r + dr);
            if (occ.has(key)) shared++; occ.add(key);
            if (!V.inLand(q.c + dc, q.r + dr)) off++; } }
        const why = [];
        const halls = V.placed.filter(q => q.key === 'hall').length;
        if (halls !== 1) why.push('halls=' + halls);
        if (shared) why.push(shared + ' shared tiles');
        if (off) why.push(off + ' tiles off the claimed land');
        for (const k of ['wood', 'food'])
          if (!Number.isFinite(V.res[k]) || V.res[k] < 0 || V.res[k] > V.caps[k] + 1) why.push(k + ' out of range');
        if (V.villagers.length < 1) why.push('nobody alive');
        if (!V.placed.every(q => V.B(q.key))) why.push('unknown building key');
        for (const k of ['wood', 'food'])
          if (!Number.isFinite(V.sharedTotal[k]) || V.sharedTotal[k] < 0) why.push('shared tally ' + k + ' broken');
        kept[name] = V.placed.length;
        if (why.length) bad.push({ name, why });
      } catch (e) { bad.push({ name, threw: String(e.message || e).slice(0, 70) }); }
    }
    try { if (real !== null) localStorage.setItem(V.KEY, real); } catch (e) {}
    return { cases: Object.keys(cases).length, unplayable: bad.length, bad, buildingsKept: kept };
  };

  /* The badges over the buildings, which nothing had ever checked.

     contrastFrame and its sweep look only at HUD text -- anything drawn under
     the camera transform is skipped, because world text is SUPPOSED to be able
     to run off the side of the screen. That exemption quietly covered the
     badges too: the level on the hall, the green arrow for an affordable
     upgrade, the amber "!" for a post with nobody at it, the "-N%" for one
     losing itself to the walk. Those are information, and the world they sit on
     is washed darker at night.

     Sampled ABOVE and BELOW the glyph rather than beside it. Beside lands on the
     badge's own bright border -- a 34-wide pill around a 20-wide glyph leaves
     about six pixels of interior -- and measuring text against its own outline
     reported 1.2 where the truth is 8.8, the same mistake emoji caused in the
     HUD checker.

       badgeSweep()  -> { failing, worst, samples }
  --------------------------------------------------------------------------- */
  window.badgeSweep = function () {
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const realNow = Date.now;
    /* Its own copies: the HUD checker's helpers live in the other closure in
       this file, and reaching across silently threw inside a draw. */
    const luminance = (r, g, b) => { const f = v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const parseColour = c => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(c));
      if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
      const r2 = /rgba?(([^)]+))/.exec(String(c));
      if (!r2) return null;
      const q = r2[1].split(',').map(Number); return [q[0], q[1], q[2]];
    };
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2;
    V.ensureHall(); V.placed[0].lvl = 3;
    const L = V.landBounds();
    const put = k => { V.grant('wood', 99999, 0, 0); V.grant('food', 99999, 0, 0);
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); };
    for (const k of ['house', 'house', 'store', 'farm', 'farm', 'lumber', 'lumber', 'mill']) put(k);
    /* One workplace in the far corner, so the "losing it to the walk" badge has
       something to appear on. */
    V.grant('wood', 99999, 0, 0); V.grant('food', 99999, 0, 0);
    outer: for (let c = L.hi; c >= L.lo; c--) for (let r = L.hi; r >= L.lo; r--)
      if (V.canPlace('farm', c, r, V.occupied())) { V.place('farm', c, r); break outer; }
    for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
    V.panel = null; V.sel = null; V.moving = null; V.camFit(true); V.step(0.001);
    const found = [];
    const scan = () => {
      const orig = ctx.fillText.bind(ctx);
      const origStroke = ctx.strokeText.bind(ctx);
      /* Text drawn with its own outline carries its background with it. The
         delivery pops are stroked in near-black before they are filled, so the
         reader sees the glyph against that halo -- but a sample taken six pixels
         out clears the halo and lands on whatever roof is underneath, which
         reported 4.01 for a pop that is perfectly legible. Anything stroked at
         the same spot immediately before is exempt. */
      let lastStroke = null;
      ctx.strokeText = function (t, x, y, ...rest) {
        lastStroke = { t: String(t), x, y };
        return origStroke(t, x, y, ...rest);
      };
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform(), str = String(t).trim();
        const isWorld = Math.abs(m.a - 1) > 1e-6 || Math.abs(m.e) > 1e-6;
        const outlined = lastStroke && lastStroke.t === String(t)
          && lastStroke.x === x && lastStroke.y === y;
        /* Emoji ignore fillStyle and paint in their own colours, so measuring one
           against the fill in force compares a pill with itself. But "anything
           without a letter or digit" is too blunt a way to say emoji: it throws
           away the green ▲ over a building you can afford to improve, which is
           an ordinary glyph that does take the fill colour -- and with it thrown
           away the sweep stopped noticing when I dimmed that arrow on purpose.
           Judged by codepoint instead: a character above the basic plane, or in
           the Miscellaneous Symbols block, is emoji; U+25B2 is not. */
        const isEmojiChar = ch => { const c = ch.codePointAt(0);
          return c > 0xFFFF || (c >= 0x2600 && c <= 0x27BF) || (c >= 0xFE00 && c <= 0xFE0F); };
        const isText = [...str].some(ch => ch.trim() && !isEmojiChar(ch));
        if (isWorld && str.length && isText && !outlined) {
          const fg = parseColour(ctx.fillStyle);
          if (fg) {
            const w = ctx.measureText(t).width, a = ctx.textAlign;
            const lx = a === 'center' ? x : a === 'right' ? x - w / 2 : x + w / 2;
            for (const dy of [-6, 6]) {
              const px = Math.round(m.a * lx + m.c * (y + dy) + m.e);
              const py = Math.round(m.b * lx + m.d * (y + dy) + m.f);
              if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
              const d = ctx.getImageData(px, py, 1, 1).data;
              const l1 = luminance(fg[0], fg[1], fg[2]), l2 = luminance(d[0], d[1], d[2]);
              const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
              found.push({ text: str.slice(0, 12), colour: String(ctx.fillStyle),
                behind: 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')', ratio: +ratio.toFixed(2) });
            }
          }
        }
        return orig(t, x, y, ...rest);
      };
      try { V.draw(); } finally { ctx.fillText = orig; ctx.strokeText = origStroke; }
    };
    /* Across the day, and with the stores both empty and full -- full is what
       sends a post to rest, and empty is what leaves it wanting people. */
    for (const frac of [0.25, 0.6, 0.85]) {
      Date.now = () => frac * V.DAY_MS;
      for (const full of [false, true]) {
        V.res.wood = full ? V.caps.wood : 40;
        V.res.food = full ? V.caps.food : 30;
        V.step(0.001); scan();
      }
    }
    Date.now = realNow;
    const best = new Map();
    for (const f of found) { const k = f.text + '|' + f.colour;
      if (!best.has(k) || f.ratio < best.get(k).ratio) best.set(k, f); }
    const rows = [...best.values()].sort((a, b) => a.ratio - b.ratio);
    return { failing: rows.filter(r => r.ratio < 4.5).length, samples: found.length,
      worst: rows.slice(0, 6) };
  };

  window.fuzz = function (rounds = 5000, populated = true) {
    const realSave = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    // a throwaway village: never the player's own
    V.placed.length = 0; V.villagers.length = 0;
    V.res.wood = 120; V.res.food = 60; V.landTier = 0;
    V.goalIdx = 0; V.goalDone = null; V.orders = []; V.ordersDone = 0;
    V.panel = null; V.sel = null; V.moving = null; V.armed = null; V.sellArm = null;
    V.away = null; V.claimAsk = false;
    V.ensureHall();
    if (populated) seed();
    prev = { wood: V.res.wood, food: V.res.food };

    const fails = [];
    const counts = {};
    for (let i = 0; i < rounds; i++) {
      /* Random tapping alone builds almost nothing -- five thousand rounds of
         it left a village of five buildings and no villagers, so every
         invariant about workforces and stock was being checked against an empty
         island. These deliberately grow and wreck the place as well. */
      const act = pick(['tap', 'tap', 'tap', 'step', 'step', 'step', 'pickBuild', 'tab',
                        'grant', 'claim', 'panelOpen', 'camFit', 'build', 'build',
                        'sell', 'upgrade', 'upgrade', 'move', 'reload', 'away', 'resume']);
      counts[act] = (counts[act] || 0) + 1;
      try {
        if (act === 'tap') V.tap(R(W), R(H()));
        else if (act === 'step') {
          carriedBefore = new Set(V.villagers.filter(g => g.carry));
          V.step(Math.random() * 0.1);
        }
        else if (act === 'pickBuild') V.sel = pick(V.BUILDINGS).key;
        else if (act === 'tab') V.barMode = pick(['build', 'decor', 'orders']);
        else if (act === 'grant') V.grant(pick(['wood', 'food']), R(500), 0, 0);
        else if (act === 'claim') V.claimLand();
        else if (act === 'panelOpen') V.panel = V.placed.length ? pick(V.placed).id : null;
        else if (act === 'camFit') V.camFit(Math.random() < 0.5);
        /* Coming back after being away, which nothing here had ever done.

           Offline earnings are the one path that hands a player hours of
           progress without a villager taking a step, and every invariant in
           this file had only ever seen resources arrive by delivery. A stretch
           either side of the cap and either side of the ceiling on how long a
           village can bank, so the clamp at each end is exercised rather than
           assumed. The card it raises is dismissed straight away: this is about
           the grant, and the drawing sweeps cover the card. */
        /* Backgrounded and brought back, which is how an app on a phone spends
           most of its life. The tick is not stopped while hidden, only
           throttled, so the resume handler pays for the gap MINUS what the
           throttled tick already simulated -- and the rule worth guarding is
           that it never pays for the same minutes twice. */
        else if (act === 'resume') {
          const gone = 60 + R(3600);
          V.hiddenAt = Date.now() - gone * 1000; V.hiddenSim = 0;
          const ticks = Math.min(600, gone);
          for (let n = 0; n < ticks; n++) V.step(0.1);   // a 1 Hz tab, dt clamped
          const simmed = V.hiddenSim;
          /* Measured around the GRANT alone. What the throttled ticks earned is
             ordinary production and not this rule's business -- and the village
             grows during them, so a rate taken before they ran is already stale
             by the time the grant happens. Bounding the whole window against
             that stale rate reported 291 failures on a village doing nothing
             wrong, which is the checker being wrong rather than the game. */
          const rate = V.potentialRate();
          const before = { wood: V.res.wood, food: V.res.food };
          V.grantAway(gone - simmed);
          V.away = null; V.hiddenAt = 0; V.hiddenSim = 0;
          for (const k of ['wood', 'food']) {
            const got = V.res[k] - before[k];
            if (got < -1e-6) fails.push('coming back took resources away (' + k + ')');
            // the grant may only pay for the time the throttled tick did NOT
            const owed = rate[k] * Math.max(0, gone - simmed) + 2;
            if (got > owed) fails.push('coming back paid for time twice (' + k + ')');
          }
        }
        else if (act === 'away') {
          const before = { wood: V.res.wood, food: V.res.food };
          const room = { wood: V.caps.wood - V.res.wood, food: V.caps.food - V.res.food };
          V.grantAway(Math.random() * V.AWAY_MAX * 1.5);
          V.away = null;
          for (const k of ['wood', 'food']) {
            const got = V.res[k] - before[k];
            if (got < -1e-6) fails.push('being away took resources away (' + k + ')');
            if (got > room[k] + 1e-6) fails.push('being away paid past the ceiling (' + k + ')');
          }
        }
        else if (act === 'reload') { const bad = roundTrip(); if (bad) fails.push(bad + ' (after ' + act + ')'); }
        else if (act === 'build') {
          // afford it, then let place() decide whether it is legal
          const b2 = pick(V.BUILDINGS.filter(x => x.key !== 'hall'));
          V.grant('wood', 300, 0, 0); V.grant('food', 300, 0, 0);
          const L = V.landBounds();
          /* A decoration's label promises "+X/s delivered" before it is bought;
             what the village delivers afterwards must move by exactly that. */
          const charm = !!b2.charm, pc = L.lo + R(L.hi - L.lo + 1), pr = L.lo + R(L.hi - L.lo + 1);
          const pred = charm ? V.decorGainAt(b2.key, pc, pr) : 0;
          const was = charm ? V.deliveredAtMul(V.charmMul()) : 0;
          if (V.place(b2.key, pc, pr) && charm) {
            const got = V.deliveredAtMul(V.charmMul()) - was;
            if (Math.abs(got - pred) > 1e-6) fails.push('a ' + b2.key + ' promised +' + pred.toFixed(4) + '/s and delivered +' + got.toFixed(4));
          }
        }
        else if (act === 'sell') {
          const q = pick(V.placed.filter(x => V.canSell(x)));
          if (q) V.sellBuilding(q);
        }
        else if (act === 'upgrade') {
          const q = pick(V.placed);
          if (q) { V.grant('wood', 400, 0, 0); V.grant('food', 400, 0, 0);
            /* Starting an upgrade must never take anything away. Storehouses,
               houses, wells and markets each lost what they gave for the length
               of the work, one at a time, and each was found separately -- this
               asks the question once for everything the village is given. */
            const gives = () => {
              const workplaces = V.producers().filter(x => x.key !== 'hall');
              return { wood: V.caps.wood, food: V.caps.food, homes: V.placed.reduce((n, x) => n + V.livedIn(x), 0),
                trades: V.orderSlots(), stores: V.stores().length,
                boost: workplaces.reduce((m, x) => m + V.boostAt(x), 0),
                workplaces: V.villageStats().workplaces };
            };
            const was = gives();
            if (V.upgradeBuilding(q)) {
              const now = gives();
              for (const [k, v] of Object.entries(was))
                if (now[k] < v - 1e-9) { fails.push('upgrading a ' + q.key + ' took away ' + k + ' (' + v + ' -> ' + now[k] + ')'); break; }
            }
          }
        }
        else if (act === 'move') {
          /* A move takes two taps on the SAME tile -- arm, then commit. Tapping
             two random points only ever armed it, so the branch that actually
             relocates a building (and rebuilds the store cache) was never run. */
          const q = pick(V.placed.filter(x => V.canSell(x)));
          if (!q) continue;
          const L = V.landBounds();
          const w = V.tileToWorld(L.lo + R(L.hi - L.lo + 1), L.lo + R(L.hi - L.lo + 1));
          const t2 = V.camProject(w.x, w.y);
          V.moving = q.id; V.armed = null;
          V.tap(t2.x, t2.y); V.tap(t2.x, t2.y);
          V.moving = null; V.armed = null;
        }
      } catch (e) {
        fails.push('threw during ' + act + ': ' + e.message);
        if (fails.length > 8) break;
        continue;
      }
      const bad = check(act);
      if (bad) { fails.push(bad); if (fails.length > 8) break; }
      /* No yielding. A hidden tab throttles setTimeout to about once a second,
         so "let the page breathe" turned a five-thousand-round run into a
         five-thousand-second one. Run it in batches instead. */
    }
    try { if (realSave !== null) localStorage.setItem(V.KEY, realSave); } catch (e) {}
    return { rounds, populated, fails, counts, ended: { placed: V.placed.length,
      villagers: V.villagers.length, wood: Math.round(V.res.wood), food: Math.round(V.res.food),
      landTier: V.landTier, hall: V.hallLevel() } };
  };
  console.log('fuzz ready: await window.fuzz(15000)');
})();

/* ---------------------------------------------------------------------------
   Does any text run off the edge of the screen?

   The canvas is a fixed 1024 wide whatever the phone is, but the HUD scale
   grows with the screen's HEIGHT -- so on a tall handset every label gets
   bigger inside boxes that did not. That is why every overflow found so far
   (the storage hint, the village summary, the tray labels) was invisible on a
   desktop and would have been obvious on the device.

   Wraps fillText for one frame, measures what each call actually drew, and
   reports anything crossing an edge. Run it over the states below:

     await window.textSweep();
--------------------------------------------------------------------------- */
(function () {
  const V = window.__v;
  if (!V) return;
  const W = 1024;

  function scan(label) {
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const bad = [], boxes = [];
    /* The screen edge is not the only edge text can fall off.

       The storehouse blurb ran 168 logical pixels past the side of its own
       panel at every screen shape there is, and this checker passed it, because
       at the one shape the checker happened to run the panel was wide enough
       and centred enough that the spill still landed inside 1024. Text belongs
       inside the box it was drawn into, so that is what gets checked: while a
       panel is open, anything drawn at a height inside it must also be drawn
       within its sides. */
    const P = V.panel != null ? V.panelRects() : null;
    const orig = ctx.fillText.bind(ctx);
    ctx.fillText = function (t, x, y, ...rest) {
      const w = ctx.measureText(t).width;
      const a = ctx.textAlign;
      const x0 = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x;
      /* Only text laid out in HUD coordinates. Badges over buildings live in
         the world, are drawn under a translate, and are SUPPOSED to be able to
         run off the side of the screen -- checking those reported a thousand
         false failures before the transform was looked at properly. The HUD is
         the one that has boxes to overflow, and it is drawn with nothing but
         the letterbox offset: no scale, no x translation. */
      const m = ctx.getTransform();
      const isHud = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6
        && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6 && Math.abs(m.e) < 1e-6;
      if (isHud && String(t).trim()) {
        if (x0 < -1 || x0 + w > W + 1)
          bad.push({ state: label, text: String(t).slice(0, 48), left: Math.round(x0), width: Math.round(w) });
        /* Inset by the same margin the panel lays its own rows out at, so a row
           that exactly fills the usable width is not reported. */
        if (P) {
          const inset = 8 * P.u, lo = P.x - P.w / 2 + inset, hi = P.x + P.w / 2 - inset;
          const size0 = parseFloat(ctx.font) || 16;
          const insidePanel = y > P.y - P.h / 2 - size0 && y < P.y + P.h / 2 + size0;
          if (insidePanel && (x0 < lo - 1 || x0 + w > hi + 1))
            bad.push({ state: label + ' [out of panel]', text: String(t).slice(0, 48),
                       left: Math.round(x0), width: Math.round(w), panel: Math.round(hi - lo) });
        }
        /* Running off the SCREEN is only the loudest version of this. The tray
           label overflowed its button into the next one, and the wasting line
           ran out of its chip into the chip beside it -- neither goes near a
           screen edge. Two pieces of HUD text sitting on top of each other is
           the symptom either way, so that is what gets checked. */
        /* The ink, not a guess from the font size. Half a size either side is
           too short for an emoji (a price at 20 inks -12.5..+8.5), so a name
           printed through its own price measured as clear. */
        const mt = ctx.measureText(t);
        const size = parseFloat(ctx.font) || 16;
        const asc = mt.actualBoundingBoxAscent, desc = mt.actualBoundingBoxDescent;
        // both are measured from whatever textBaseline is set, so no case per baseline
        const ok = Number.isFinite(asc) && Number.isFinite(desc);
        const y0 = ok ? y - asc : y - size * 0.5, y1 = ok ? y + desc : y + size * 0.5;
        boxes.push({ t: String(t).slice(0, 40), x0, x1: x0 + w, y0, y1 });
      }
      return orig(t, x, y, ...rest);
    };
    /* Boxes, as well as the words in them. The placement pill sat 4 units down
       over the top of the tabs for as long as it existed -- no two strings
       touched, so the text check had nothing to say. Two HUD shapes may nest (a
       button in a panel) or stand apart; one lying PARTLY over another is a
       collision. Each shape is labelled with the first text drawn inside it. */
    const shapes = [], origRR = ctx.roundRect.bind(ctx);
    const hudNow = () => { const m = ctx.getTransform();
      return Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.b) < 1e-6
        && Math.abs(m.c) < 1e-6 && Math.abs(m.e) < 1e-6; };
    ctx.roundRect = function (x, y, w, h, ...rest) {
      if (hudNow() && w > 0 && h > 0) shapes.push({ x0: x, y0: y, x1: x + w, y1: y + h, alpha: ctx.globalAlpha, t: '' });
      return origRR(x, y, w, h, ...rest);
    };
    const origFT = ctx.fillText;
    ctx.fillText = function (t, x, y, ...rest) {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const q = shapes[i];
        if (!q.t && x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) { q.t = String(t).slice(0, 30); break; }
      }
      return origFT.call(this, t, x, y, ...rest);
    };
    try { V.draw(); } finally { ctx.fillText = orig; ctx.roundRect = origRR; }
    const tol = 1.5;
    for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i], b = shapes[j];
      if (a.alpha < 0.05 || b.alpha < 0.05) continue;       // faded out, not on screen
      const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ix <= tol || iy <= tol) continue;
      const inside = (p, q) => p.x0 >= q.x0 - tol && p.x1 <= q.x1 + tol && p.y0 >= q.y0 - tol && p.y1 <= q.y1 + tol;
      if (inside(a, b) || inside(b, a)) continue;
      bad.push({ state: label + ' [boxes]', collide: [a.t || '(box)', b.t || '(box)'],
                 overlapPx: Math.round(Math.min(ix, iy)) });
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      // a few pixels of kerning overlap is not a collision; a quarter of a line is
      if (ox > 4 && oy > 1)
        bad.push({ state: label, collide: [a.t, b.t], overlapPx: Math.round(ox) });
    }
    return bad;
  }

  /* ---------------------------------------------------------------------------
     Do any two controls want the same tap?

     The hit regions are deliberately larger than the shapes drawn, because on a
     375-wide phone the drawn ones came out half the size a thumb needs. Padding
     them is free right up to the moment two of them start arguing, and which
     one wins is then decided by the order of the ifs in tap() -- which is not a
     design, it is an accident. So: every control must claim its own middle, and
     must never claim a point that is drawn as part of another.
  --------------------------------------------------------------------------- */
  window.tapSweep = function () {
    const V2 = window.__v;
    const cv = document.querySelector('canvas');
    const us = () => Math.max(1, Math.min(1.34, cv.height / 1536));
    V2.placed.length = 0; V2.villagers.length = 0; V2.landTier = 2;
    V2.ensureHall(); V2.placed[0].lvl = 4; V2.step(1 / 30);
    for (const [k, c, r] of [['store', 4, 4], ['farm', 7, 4], ['house', 4, 7]]) {
      V2.grant('wood', 9999, 0, 0); V2.grant('food', 9999, 0, 0);
      if (V2.place(k, c, r)) V2.placed[V2.placed.length - 1].t = 1;
    }
    for (let i = 0; i < 120 * 30; i++) V2.step(1 / 30);
    V2.panel = V2.placed[1].id; V2.barMode = 'build';
    const R = V2.panelRects(), tabs = V2.tabRects(), bars = V2.barRects(), M = V2.muteRect();
    const drawn = [
      { n: 'close', x: R.close.x, y: R.close.y, w: R.close.r * 2, h: R.close.r * 2 },
      { n: 'move', x: R.move.x, y: R.move.y, w: R.move.w, h: R.move.h },
      { n: 'sell', x: R.sell.x, y: R.sell.y, w: R.sell.w, h: R.sell.h },
      { n: 'up', x: R.up.x, y: R.up.y, w: R.up.w, h: R.up.h },
      { n: 'mute', x: M.x, y: M.y, w: M.r * 2, h: M.r * 2 },
      ...tabs.map((t, i) => ({ n: 'tab' + i, x: t.x, y: t.y, w: t.w, h: t.h })),
      ...bars.map((b, i) => ({ n: 'tray' + i, x: b.x, y: b.y, w: b.w, h: b.h })),
    ];
    const claim = (sx, sy) => {
      if (Math.hypot(sx - M.x, sy - M.y) < Math.max(M.r * 1.15, V2.TOUCH_MIN / 2)) return 'mute';
      if (Math.hypot(sx - R.close.x, sy - R.close.y) < Math.max(R.close.r * 1.3, V2.TOUCH_MIN / 2)) return 'close';
      const h = r2 => r2 && Math.abs(sx - r2.x) < r2.w / 2 && Math.abs(sy - r2.y) < V2.padHit(r2.h / 2, 20 * R.u);
      if (h(R.move)) return 'move';
      if (h(R.sell)) return 'sell';
      if (h(R.up)) return 'up';
      if (Math.abs(sx - R.x) < R.w / 2 && Math.abs(sy - R.y) < R.h / 2) return 'panelbody';
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        if (Math.abs(sx - t.x) < t.w / 2 && Math.abs(sy - t.y) < V2.padHit(t.h / 2, 12 * us())) return 'tab' + i;
      }
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        if (Math.abs(sx - b.x) < b.w / 2 && Math.abs(sy - b.y) < b.h / 2) return 'tray' + i;
      }
      return 'world';
    };
    const bad = [];
    for (const d of drawn) {
      if (claim(d.x, d.y) !== d.n) bad.push({ control: d.n, its_middle_went_to: claim(d.x, d.y) });
      for (const o of drawn) {
        if (o === d) continue;
        for (const [fx, fy] of [[0, 0], [-0.4, 0], [0.4, 0], [0, -0.4], [0, 0.4]]) {
          const px = o.x + fx * o.w, py = o.y + fy * o.h;
          if (claim(px, py) === d.n) bad.push({ drawn_as: o.n, taken_by: d.n });
        }
      }
    }
    V2.panel = null;
    /* A building is what you see, not the ground under it. Taps used to be
       matched to plots only, so the roof and tower of the hall -- the top half
       of it on screen -- opened whatever stood behind, or the claim card. For
       every painting, points where it is the one on top and which lie ABOVE its
       own plot must still open it. */
    let paintingChecks = 0;
    for (const p of V2.placed) {
      const R = V2.artRect(p); if (!R) continue;
      const b = V2.B(p.key), dep = q => { const bq = V2.B(q.key); return V2.tileToWorld(q.c + bq.w - 1, q.r + bq.h - 1).y; };
      for (let fy = 0.08; fy < 0.6; fy += 0.07) for (let fx = 0.2; fx <= 0.8; fx += 0.1) {
        const wx = R.left + fx * R.wid, wy = R.top + fy * R.hgt;
        if (!V2.paintedAt(p, wx, wy)) continue;
        const t = V2.tileAt(wx, wy);
        if (t.c >= p.c && t.c < p.c + b.w && t.r >= p.r && t.r < p.r + b.h) continue;   // over its own plot
        const later = q => dep(q) > dep(p) || (dep(q) === dep(p) && V2.placed.indexOf(q) > V2.placed.indexOf(p));
        if (V2.placed.some(q => q !== p && !V2.B(q.key).flat && later(q) && V2.paintedAt(q, wx, wy))) continue;   // drawn over here
        const sc = V2.camProject(wx, wy), got = V2.buildingAt(sc.x, sc.y);
        paintingChecks++;
        if (got !== p) bad.push({ drawn_as: p.key + ' painting', taken_by: got ? got.key : 'the ground' });
      }
    }
    return { controls: drawn.length, paintingChecks, conflicts: bad.length, worst: bad.slice(0, 6) };
  };

  /* ---------------------------------------------------------------------------
     Can the text be read against what is actually behind it?

     Not against the colour the pill is painted, which is what reading the source
     tells you. The pills are 80 to 95 per cent opaque and sit over the world, so
     the background is part sea -- and a grey that looks fine on the dark ground
     of a screenshot can fall to 3.1 against bright water. Two did.

     This measures ONE frame, whatever the caller has set up. An earlier version
     drove its own sequence of states and reported sea-coloured pixels behind the
     build tray, which was a fault in the driving rather than in the sampling;
     the sampling is the same and checks out at both screen shapes. Keeping it
     dumb makes it verifiable.

       contrastFrame()   -> { failing, worst } for the current state
  --------------------------------------------------------------------------- */
  function luminance(r, g, b) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function parseColour(c) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c));
    if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    const r = /rgba?\(([^)]+)\)/.exec(String(c));
    if (!r) return null;
    const q = r[1].split(',').map(Number);
    return [q[0], q[1], q[2]];
  }
  window.contrastFrame = function () {
    const V2 = window.__v;
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const found = [], orig = ctx.fillText.bind(ctx);
    const toCss = cv.getBoundingClientRect().width / 1024 || 0.366;
    ctx.fillText = function (t, x, y, ...rest) {
      const m = ctx.getTransform();
      const isHud = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.e) < 1e-6;
      const str = String(t).trim();
      /* Emoji ignore fillStyle and paint in their own colours, so measuring one
         against the fill in force compares a pill with itself and reports 1.1.
         Anything without a letter or a digit in it is an icon, not text. */
      const isText = /[A-Za-z0-9]/.test(str);
      /* Text that is fading IN is not a contrast failure, it is a frame of an
         animation. The hint pill fades over a third of a second, and during it
         both the pill and the letters are part transparent -- so the sampler
         read sea through the pill and compared it against the fillStyle at full
         strength, which globalAlpha does not touch. It reported 2.84 on a
         string that is perfectly legible once it has arrived. */
      const fg = isHud && isText && str.length > 1 && ctx.globalAlpha > 0.95
        ? parseColour(ctx.fillStyle) : null;
      if (!fg) return orig(t, x, y, ...rest);
      const w = ctx.measureText(t).width, a = ctx.textAlign;
      const x0 = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x;
      /* Sampled just BESIDE the string, at its own baseline.

         Above and below was the obvious choice and it is wrong here: the tray
         stacks two cost rows 28 logical pixels apart, and half a line clear of
         one lands inside the other's emoji -- so the checker measured a label
         against its neighbour's icon and called white. Either side of the
         string is background by construction, because the same row's glyphs
         live between x0 and x0 + w, and the text is made to fit its pill.

         The lighter of the two is used: pale text on a dark pill fails on the
         light side first. */
      let lightest = -1, bg = null;
      for (const sxRaw of [x0 - 6, x0 + w + 6]) {
        const sx = Math.round(Math.max(0, Math.min(cv.width - 1, sxRaw)));
        const sy = Math.round(Math.max(0, Math.min(cv.height - 1, y + m.f)));
        const d = ctx.getImageData(sx, sy, 1, 1).data;
        const L = luminance(d[0], d[1], d[2]);
        if (L > lightest) { lightest = L; bg = [d[0], d[1], d[2]]; }
      }
      const sizeEarly = /([0-9.]+)px/.exec(ctx.font);
      const l1 = luminance(fg[0], fg[1], fg[2]);
      const ratio = (Math.max(l1, lightest) + 0.05) / (Math.min(l1, lightest) + 0.05);
      const sizeM = /([0-9.]+)px/.exec(ctx.font);
      const css = (sizeM ? parseFloat(sizeM[1]) : 16) * toCss;
      const large = css >= (/bold/.test(ctx.font) ? 18.66 : 24);
      const need = large ? 3 : 4.5;
      if (ratio < need) found.push({ text: str.slice(0, 32), colour: String(ctx.fillStyle),
        behind: 'rgb(' + bg.join(',') + ')', ratio: +ratio.toFixed(2), needs: need, cssPx: +css.toFixed(1) });
      return orig(t, x, y, ...rest);
    };
    try { V2.draw(); } finally { ctx.fillText = orig; }
    return { failing: found.length, worst: found.sort((a, b) => a.ratio - b.ratio).slice(0, 6) };
  };

  /* Pretend to be a screen of a given shape.

     Setting cv.height directly, which is what this used to do, does nothing at
     all: draw() begins with fitCanvas(), which recomputes the height from the
     real window and puts it straight back. So the loop that claimed to test
     "every shape of screen the HUD scale can take" tested exactly one -- the
     browser window the sweep happened to run in -- and a blurb that overflowed
     at every shape sailed through. The size a device reports is the honest
     input, so that is what gets faked. */
  function asScreen(w, h) {
    Object.defineProperty(window, 'innerWidth',  { value: w, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
    window.dispatchEvent(new Event('resize'));
  }

  /* One of everything, and then everything of everything.

     The mid-sized village is the one the player spends most of their time in,
     but it is not the one with the longest strings in it. Four-digit resources,
     a market's full clause list, "wasting 24/s", a hall that allows a dozen
     houses -- all of those only exist near the ceiling, and a sweep that never
     builds that far cannot see them. A chip label running past its own pill
     survived every run until a maxed village happened to be on screen for a
     different reason. */
  function sweepVillage(maxed) {
    V.placed.length = 0; V.villagers.length = 0;
    V.landTier = maxed ? V.LAND_MAX : 2;
    V.ensureHall(); V.placed[0].lvl = maxed ? 5 : 4;
    const L = V.landBounds();
    const put = k => {
      V.grant('wood', 999999, 0, 0); V.grant('food', 999999, 0, 0);
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.place(k, c, r)) return V.placed[V.placed.length - 1];
      return null;
    };
    if (maxed) {
      const allow = V.HALL[V.HALL.length - 1].allow;
      for (const [k, n] of Object.entries(allow))
        for (let i = 0; i < n; i++) { const q = put(k); if (q) q.lvl = 5; }
      for (let i = 0; i < 12; i++) put('statue');
      V.goalIdx = V.GOALS.length - 1; V.ordersDone = 137;
    } else {
      for (const k of ['store', 'farm', 'lumber', 'house', 'house', 'well', 'mill', 'market',
                       'path', 'flowers', 'statue']) put(k);
    }
    for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
    if (maxed) { V.res.wood = V.caps.wood; V.res.food = V.caps.food; }
    V.tutSeen.length = 0;
  }
  /* A hint's twenty seconds are twenty seconds ON SCREEN. The clock used to run
     behind the goal banner and the away card, so a hint could expire unseen. */
  window.hintSweep = function () {
    const V = window.__v, fails = [];
    for (const [name, cover, clear] of [
      ['away card', () => { V.away = { secs: 7200, got: { wood: 1, food: 1 } }; }, () => { V.away = null; }],
      ['goal banner', () => { V.goalDone = { g: V.GOALS[0], got: {}, age: -1e9 }; }, () => { V.goalDone = null; }],
      ['finished card', () => { V.finished = { villagers: 1, buildings: 1, trades: 0, charm: 0 }; }, () => { V.finished = null; }]]) {
      V.placed.length = 0; V.villagers.length = 0; V.ensureHall(); V.tutSeen.length = 0;
      V.away = null; V.goalDone = null; V.finished = null;
      cover();
      for (let i = 0; i < 40 * 30; i++) { if (V.goalDone) V.goalDone.age = -1e9; V.step(1 / 30); }
      if (V.tutSeen.includes('house')) fails.push('the first hint expired behind the ' + name);
      clear();
      for (let i = 0; i < 21 * 30; i++) V.step(1 / 30);
      if (!V.tutSeen.includes('house')) fails.push('the first hint never finished once the ' + name + ' closed');
    }
    return { cases: 3, fails };
  };
  /* Building badges never print over one another. A built-up island at phone
     zoom used to stack "−63%", "−65%" and rows of ▲ into an unreadable pile. */
  window.badgeOverlapSweep = function () {
    const V = window.__v, keepZ = V.CAM.z;
    sweepVillage(true);
    for (const p of V.placed) if (V.B(p.key).jobs && p.key !== 'hall') p.lvl = 3;   // leave room to upgrade
    V.grant('wood', 1e6, 0, 0); V.grant('food', 1e6, 0, 0);
    let frames = 0, drawn = 0; const bad = [];
    for (const z of [0.35, 0.5, 0.8, 1.2]) {
      V.CAM.z = z; V.step(0.001); V.draw(); frames++;
      const k = V.lastBadges; drawn += k.length;
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++)
        if (Math.abs(k[i].x - k[j].x) < k[i].hw + k[j].hw && Math.abs(k[i].y - k[j].y) < k[i].hh + k[j].hh)
          bad.push({ z, prio: [k[i].prio, k[j].prio] });
    }
    V.CAM.z = keepZ; V.step(0.001);
    return { frames, drawn, overlaps: bad.length, worst: bad.slice(0, 5) };
  };
  /* The village fit never crops a building, unless the zoom is already at its
     floor. It measured buildings as a tile either side of the centre and held
     the frame inside the claim, so paintings on the edge ran off the screen. */
  window.framingSweep = function () {
    const V = window.__v, keepW = window.innerWidth, keepH = window.innerHeight, bad = [];
    let checks = 0;
    for (const [sw, sh] of [[375, 812], [360, 640], [768, 1024]]) {
      asScreen(sw, sh); V.step(0.001);
      for (const tier of [1, 2, 3, V.LAND_MAX]) {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.ensureHall(); V.placed[0].lvl = 5;
        const L = V.landBounds();
        const put = k => { V.grant('wood', 1e6, 0, 0); V.grant('food', 1e6, 0, 0);
          for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) if (V.place(k, c, r)) return V.placed[V.placed.length - 1]; };
        const allow = V.HALL[V.HALL.length - 1].allow;
        for (let round = 0; round < 4; round++) for (const k of Object.keys(allow)) { const q = put(k); if (q) q.t = 1; }
        V.step(0.001); V.camFit(true);
        const atFloor = V.CAM.z <= 0.5501;
        for (const p of V.placed) {
          const R = V.artRect(p); if (!R) continue;
          checks++;
          const a = V.camProject(R.left, R.top), b = V.camProject(R.left + R.wid, R.top + R.hgt);
          if (!atFloor && (a.x < -1 || b.x > 1025)) bad.push({ screen: sw + 'x' + sh, tier, key: p.key, x: [Math.round(a.x), Math.round(b.x)] });
        }
      }
    }
    asScreen(keepW, keepH); V.step(0.001);
    return { checks, cropped: bad.length, worst: bad.slice(0, 5) };
  };
  /* The number a move quotes for where a building is NOW must be the number its
     panel shows. The label quoted one worker's share, half the panel's figure
     for a two-worker camp. Read off the canvas, as the player reads them. */
  window.moveLabelSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const grab = re => { const got = []; const o = ctx.fillText;
      ctx.fillText = function (t, ...r) { if (re.test(String(t))) got.push(String(t)); return o.call(this, t, ...r); };
      try { V.draw(); } finally { ctx.fillText = o; } return got; };
    const bad = []; let checks = 0;
    for (const maxed of [false, true]) {
    sweepVillage(maxed);
    for (const p of V.placed) {
      const b = V.B(p.key);
      if (!b.makes || !b.jobs || p.key === 'hall' || !V.workersAt(p.id)) continue;
      V.moving = null; V.ghost = null; V.panel = p.id; V.step(0.001);
      const panel = grab(/\/s delivered/)[0];
      V.panel = null; V.moving = p.id; V.ghost = { c: p.c, r: p.r, fits: true, ok: true, why: null };
      const label = grab(/\/s here/)[0];
      V.moving = null; V.ghost = null;
      const pv = panel && panel.match(/([0-9.]+)\/s delivered/), lv = label && label.match(/now ([0-9.]+)/);
      checks++;
      if (!pv || !lv || Math.abs(+pv[1] - +lv[1]) > 0.011) bad.push({ key: p.key, panel, label });
    }
    }
    return { checks, mismatched: bad.length, worst: bad.slice(0, 4) };
  };
  window.textSweep = function () {
    const cv = document.querySelector('canvas');
    const keepW = window.innerWidth, keepH = window.innerHeight;
    const found = [];
    for (const maxed of [false, true]) {
    sweepVillage(maxed);

    /* Every shape of screen the HUD scale can take, named by the device that
       makes it: a wide desktop and a tablet both sit at the bottom of the range
       (u = 1), a 16:9 phone lands mid-range, and anything taller than about
       19.5:9 is at the ceiling. The two middle shapes exist because the market
       blurb only overflowed at u = 1.1, between the two the old list had. */
    for (const [sw, sh] of [[1280, 720], [768, 1024], [400, 660], [360, 640],
                            [400, 750], [375, 812], [320, 960]]) {
      asScreen(sw, sh); const h = (V.step(0.001), cv.height); V.camFit(true);
      let keptVillage = null;
      const states = {
        /* The tray as a NEW player sees it: nothing built, nobody working, so
           every card shows its full price -- and the two-price cards printed
           the name straight through the first price. Neither sweep village
           ever showed a two-price card, so nothing had drawn it. */
        freshTray: () => { V.barMode = 'build'; V.panel = null; V.sel = null; V.away = null; V.claimAsk = false;
          keptVillage = { placed: V.placed.slice(), villagers: V.villagers.slice(),
                          wood: V.res.wood, food: V.res.food, tier: V.landTier };
          V.placed.length = 0; V.villagers.length = 0; V.landTier = 1; V.ensureHall(); V.rebuildStores();
          V.res.wood = 120; V.res.food = 60; V.invalidateJobs(); },
        // and short of both, which stacks two shortfalls instead
        brokeTray: () => { V.res.wood = 0; V.res.food = 0; },
        build: () => { V.barMode = 'build'; V.panel = null; V.sel = null; V.away = null; V.claimAsk = false;
          if (keptVillage) {
            V.placed.length = 0; V.placed.push(...keptVillage.placed);
            V.villagers.length = 0; V.villagers.push(...keptVillage.villagers);
            V.res.wood = keptVillage.wood; V.res.food = keptVillage.food; V.landTier = keptVillage.tier;
            V.rebuildStores(); V.invalidateJobs(); V.camFit(true); keptVillage = null;
          } },
        decorate: () => { V.barMode = 'decor'; },
        /* And the decorate tray once charm is at its ceiling, which swaps every
           decoration's label for a different one. The sweep's village never had
           enough charm to reach that branch, so those labels had never been
           drawn in a sweep at all -- and a replacement I tried for one of them
           ran 204 logical pixels wide in 148 of button without anything
           noticing. */
        decorateFull: () => { V.barMode = 'decor';
          const L2 = V.landBounds();
          for (let i = 0; i < 16 && V.charmRoom() > 0; i++) {
            V.grant('wood', 999999, 0, 0); V.grant('food', 999999, 0, 0);
            let done = false;
            for (let c = L2.lo; c <= L2.hi && !done; c++) for (let r2 = L2.lo; r2 <= L2.hi && !done; r2++)
              if (V.canPlace('statue', c, r2, V.occupied())) { V.place('statue', c, r2); done = true; }
            if (!done) break;
          }
          for (const q2 of V.placed) if (q2.t < 1) q2.t = 1;
        },
        orders: () => { V.barMode = 'orders'; V.orders = [V.makeOrder(0), V.makeOrder(1), V.makeOrder(2)]; },
        /* An empty board says something the full one never does, and nothing
           had ever drawn it in a sweep. */
        noOrders: () => { V.orders = []; },
        // a purchase goal part-way saved: the longest strip there is, two short resources and a reward
        buyGoal: () => { window.__keptGoal = V.goalIdx; V.goalIdx = V.GOALS.findIndex(q => q.text === 'Claim the whole island'); V.res.wood = 1234; V.res.food = 567; },
        buyGoalDone: () => { V.goalIdx = window.__keptGoal; },
        // one offer, the countdown at its longest (minutes) and an empty stall
        halfOrders: () => { V.orders = [V.makeOrder(2)]; V.orderT = 0; },
        placing: () => { V.barMode = 'build'; V.sel = 'mill'; V.orders = [V.makeOrder(1)]; },
        // the pill giving the reason a tap was refused, both reasons
        refusedLand: () => { V.ghost = { c: 0, r: 0, fits: false, why: 'land', ok: false }; },
        refusedTaken: () => { V.ghost = { c: 0, r: 0, fits: false, why: 'taken', ok: false }; },
        placingDone: () => { V.ghost = null; },
        claim: () => { V.sel = null; V.claimAsk = true; },
        away: () => { V.claimAsk = false; V.away = { secs: 7200, got: { wood: 1234, food: 5678 } }; },
        // the spilled line at its longest: hours of absence, full after a fractional hour
        awaySpilled: () => { V.away = { secs: 43200, capped: true, spilled: true, got: { wood: 300, food: 300 }, fullAfter: 5580 }; },
        /* A finished village back after twelve hours: the shared line, with
           numbers as large as that path can produce. */
        awayShared: () => { V.away = { secs: 43200, capped: true, spilled: true,
          got: { wood: 8380, food: 8380 }, shared: { wood: 1234567, food: 9876543 } }; },
        /* The same line at the largest total a save is allowed to hold. The
           formatter stopped at billions and printed "1000000.0B" off the hall
           panel, which a sweep only saw by accident, from a save left behind. */
        awaySharedHuge: () => { V.away = { secs: 43200, capped: true, spilled: true,
          got: { wood: 8380, food: 8380 }, shared: { wood: 1e15, food: 999999 } }; },
        hint: () => { V.away = null; V.tutSeen.length = 0; V.res.wood = V.caps.wood; V.res.food = V.caps.food; },
        goalBanner: () => { V.goalDone = { g: V.GOALS[V.GOALS.length - 1], got: { wood: 2500, food: 1600 }, age: 0 }; },
        /* Two warnings the player only ever sees when something has gone wrong,
           which is exactly when they must be readable, and neither had been
           drawn in a sweep before. */
        saveFailed: () => { V.goalDone = null; V.saveFailed = true; },
        fromBackup: () => { V.saveFailed = false; V.loadedFromBackup = true; },
        /* A panel on something still under scaffolding: a different set of rows
           from a finished building, and never swept. */
        building: () => { V.loadedFromBackup = false;
          const q = V.placed.find(x => x.key !== 'hall'); if (q) { q.t = 0.4; V.panel = q.id; } },
        /* Seen once, at the end of a two-hour game, which is exactly the kind of
           screen that never gets looked at again after it is written. */
        finished: () => { V.goalDone = null; V.away = null;
          V.finished = { villagers: 72, buildings: 38, trades: 137, charm: 630 }; },
      };
      const tag = maxed ? ' [maxed]' : ' [mid]';
      for (const [name, set] of Object.entries(states)) { set(); found.push(...scan(name + ' @' + h + tag)); }
      V.goalDone = null; V.finished = null;
      V.saveFailed = false; V.loadedFromBackup = false;
      for (const q of V.placed) if (q.t < 1) q.t = 1;
      // and every panel, armed and not -- the hall's with the village finished
      // and the shared total at its ceiling, its longest line
      const keepGoal = V.goalIdx, keepShared = V.sharedTotal;
      V.goalIdx = V.GOALS.length; V.sharedTotal = { wood: 1e15, food: 999999 };
      for (const p of V.placed) for (const arm of [false, true]) {
        V.panel = p.id; V.sellArm = arm ? { id: p.id, t: 4 } : null;
        found.push(...scan('panel:' + p.key + (arm ? ' armed' : '') + ' @' + h + tag));
      }
      V.panel = null; V.sellArm = null;
      V.goalIdx = keepGoal; V.sharedTotal = keepShared;
    }
    }
    asScreen(keepW, keepH); V.step(0.001);
    return { overflowing: found.length, worst: found.slice(0, 10) };
  };
  /* Contrast, over everything the HUD can be sitting on.

     contrastFrame measures ONE frame, and one frame is not the question. The
     pills are 80 to 95 per cent opaque, so what is behind the text is part
     world -- and the world moves. The same label reads 6.1 over the dark side
     of the island and 4.0 over sunlit water two seconds later, which is how a
     failing colour passed every check I ran: I always looked at the same frame.

     So the same states the text sweep walks, at four zooms and across the day,
     keeping the WORST ratio seen for each distinct string and colour. */
  window.contrastSweep = function () {
    const cv = document.querySelector('canvas');
    const keepW = window.innerWidth, keepH = window.innerHeight;
    const keepZ = V.CAM.z;
    const worst = new Map();
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2;
    V.ensureHall(); V.placed[0].lvl = 4;
    const L = V.landBounds();
    for (const k of ['store', 'farm', 'lumber', 'house', 'house', 'well', 'mill', 'market',
                     'path', 'flowers', 'statue']) {
      V.grant('wood', 9999, 0, 0); V.grant('food', 9999, 0, 0);
      let ok = false;
      for (let c = L.lo; c <= L.hi && !ok; c++) for (let r = L.lo; r <= L.hi && !ok; r++) if (V.place(k, c, r)) ok = true;
    }
    for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
    V.tutSeen.length = 0;
    const take = () => {
      for (const f of window.contrastFrame().worst.concat([])) {
        const key = f.colour + '|' + f.text;
        const had = worst.get(key);
        if (!had || f.ratio < had.ratio) worst.set(key, f);
      }
    };
    /* The time of day is read straight off the clock, so two runs of this sweep
       lit the village differently and found different failures -- one run said
       the HUD was clean and the next found a lilac at 4.09. A checker whose
       answer depends on when you ran it is not a checker. Date.now is stubbed
       so each phase is visited on purpose: noon is the brightest ground,
       sunset lays a warm wash over everything, and midnight is the darkest. */
    const realNow = Date.now;
    try {
      for (const [sw, sh] of [[1280, 720], [400, 750], [375, 812]]) {
        asScreen(sw, sh); V.step(0.001); V.camFit(true);
        /* Zoomed out puts open sea behind the top chips, zoomed in puts the
           island there, and the two are the extremes of what the pills sit on.
           Panning to a corner is the third: at the far end of the island the HUD
           is over water on one side and cliff on the other. */
        for (const z of [0.5, 1.7]) {
          V.CAM.z = z;
          for (const pan of [[0, 0], [560, 380]]) {
            V.CAM.x = pan[0]; V.CAM.y = pan[1];
            for (const phase of [0.25, 0.45, 0.5, 0.75]) {
              Date.now = () => phase * V.DAY_MS;
              V.step(0.001);
              for (const mode of ['build', 'decor', 'orders']) {
                V.barMode = mode; V.panel = null; V.sel = null; V.step(0.001); take();
              }
              /* Placement, which had never been measured here: the instruction
                 pill, and the same pill giving a refusal in its warmer colour. */
              V.barMode = 'build'; V.sel = 'house';
              for (const why of [null, 'land', 'taken']) {
                V.ghost = why ? { c: 0, r: 0, fits: false, why, ok: false } : null;
                V.step(0.001); take();
              }
              // and a card picked before it is affordable, which shows its shortfall in red
              V.ghost = null;
              const keepRes = { wood: V.res.wood, food: V.res.food };
              V.res.wood = 0; V.res.food = 0; V.step(0.001); take();
              V.res.wood = keepRes.wood; V.res.food = keepRes.food;
              V.ghost = null; V.sel = null;
              // a half-empty board: its countdown and empty stalls, never measured before
              { const keepO = V.orders; V.barMode = 'orders'; V.orders = [V.makeOrder(1)]; V.orderT = 0;
                V.step(0.001); take(); V.orders = keepO; }
              for (const q of [V.placed[0], V.placed[5], V.placed[7]]) {
                if (!q) continue; V.panel = q.id; V.step(0.001); take();
              }
              V.panel = null;
            }
          }
        }
      }
    } finally { Date.now = realNow; }
    V.CAM.z = keepZ; asScreen(keepW, keepH); V.camFit(true); V.step(0.001);
    const out = [...worst.values()].sort((a, b) => a.ratio - b.ratio);
    return { failing: out.length, worst: out.slice(0, 12) };
  };
  /* Is this text backed by the HUD, or by whatever the camera is pointing at?

     contrastSweep measures what happens to be behind a string in the states it
     visits, so a string with no pill of its own passes for as long as those
     states happen to put something dark behind it. The placement instruction did
     exactly that: pale green letters painted straight onto the world, fine over
     water, 1.33 against a sandy path, and it survived every contrast run until a
     village with paths in it happened to come up.

     This asks the structural question instead. Draw each frame twice, once with
     the camera over open sea and once zoomed into the village, and compare what
     was sampled behind every string. A pill is 80 to 95 per cent opaque, so its
     backing barely moves; text painted onto the world moves with the world.

       backingSweep()  -> { unprotected, worst }
  --------------------------------------------------------------------------- */
  /* How far a BACKED string's sample is allowed to move.

     A pill is 80 to 95 per cent opaque, so a little of the world does leak
     through it and the sample is never perfectly still. Measured on this game:
     a pill leaks 0.025 of luminance between open sea and the village, and a
     string painted straight onto the world moves 0.121 -- nearly five times as
     far. 0.06 sits between them with better than a two-fold margin either way,
     and the sweep reports the largest drift it saw so the gap closing is
     visible rather than silent. */
  const BACKED_MAX = 0.06;
  window.backingSweep = function () {
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    let worst = 0;
    const keepZ = V.CAM.z, keepX = V.CAM.x, keepY = V.CAM.y;
    const sample = () => {
      const out = new Map(), orig = ctx.fillText.bind(ctx);
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform();
        const isHud = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.e) < 1e-6;
        const str = String(t).trim();
        if (isHud && str.length > 1 && /[A-Za-z]/.test(str) && ctx.globalAlpha > 0.95) {
          const w = ctx.measureText(t).width, a = ctx.textAlign;
          const x0 = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x;
          let best = -1, bg = null;
          for (const sxRaw of [x0 - 6, x0 + w + 6]) {
            const sx = Math.round(Math.max(0, Math.min(cv.width - 1, sxRaw)));
            const sy = Math.round(Math.max(0, Math.min(cv.height - 1, y + m.f)));
            const d = ctx.getImageData(sx, sy, 1, 1).data;
            const l = luminance(d[0], d[1], d[2]);
            if (l > best) { best = l; bg = [d[0], d[1], d[2]]; }
          }
          out.set(str.slice(0, 40), { bg, L: best });
        }
        return orig(t, x, y, ...rest);
      };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return out;
    };
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2;
    V.ensureHall(); V.placed[0].lvl = 4;
    const L = V.landBounds();
    const free = k => { for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
      if (V.canPlace(k, c, r, V.occupied())) return [c, r]; return null; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store', 'well', 'market',
                     'path', 'path', 'statue']) {
      V.grant('wood', 99999, 0, 0); V.grant('food', 99999, 0, 0);
      const sp = free(k); if (sp) V.place(k, sp[0], sp[1]);
    }
    for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
    V.res.wood = 800; V.res.food = 600;
    const b = V.landWorldBounds();
    /* A full barn is its own state, not a variation on the others.

       The chips only grow their second line -- "wasting 28.3/s" -- when a store
       is at the ceiling, and that line turned out to be 143 logical pixels wide
       in the 138 its pill allows. This sweep is exactly the thing that catches
       it, because a string that runs past the end of its own pill has the world
       behind it just as surely as one with no pill at all. It simply never
       looked, because the village it builds is never full. */
    const modes = [
      ['build',    () => { V.barMode = 'build'; V.sel = null; V.moving = null; V.panel = null;
                           V.res.wood = 800; V.res.food = 600; }],
      ['full',     () => { V.barMode = 'build'; V.sel = null; V.moving = null; V.panel = null;
                           V.res.wood = V.caps.wood; V.res.food = V.caps.food; }],
      /* Once every goal is done the strip says one thing for the rest of the
         game, and that one thing had no pill for as long as it has existed. A
         state the player ends in is worth a state in the sweep. */
      ['allGoalsDone', () => { V.res.wood = 800; V.res.food = 600;
                               V.goalIdx = V.GOALS.length; V.goalDone = null; }],
      ['orders',   () => { V.barMode = 'orders';
                           V.orders = [V.makeOrder(0), V.makeOrder(1), V.makeOrder(2)]; }],
      /* An empty board draws a line where the cards would be, over the world.
         A state that only exists when nothing is there is easy to never draw. */
      ['noOrders', () => { V.barMode = 'orders'; V.orders = []; }],
      ['saveFailed', () => { V.barMode = 'build'; V.saveFailed = true; }],
      ['fromBackup', () => { V.saveFailed = false; V.loadedFromBackup = true; }],
      ['placing',  () => { V.barMode = 'build'; V.sel = 'mill'; }],
      ['moving',   () => { V.sel = null; V.moving = V.placed.find(p => p.key === 'farm').id; }],
      ['panel',    () => { V.moving = null; V.panel = V.placed.find(p => p.key === 'market').id; }],
      ['claim',    () => { V.panel = null; V.claimAsk = true; }],
      ['away',     () => { V.claimAsk = false;
                           V.away = { secs: 7200, got: { wood: 1200, food: 900 }, capped: false, spilled: true }; }],
      ['finished', () => { V.away = null;
                           V.finished = { villagers: 72, buildings: 38, trades: 137, charm: 630 }; }],
    ];
    const drift = [];
    for (const [name, set] of modes) {
      set(); V.step(0.001);
      V.CAM.z = 0.6; V.CAM.x = b.x0 - 900; V.CAM.y = b.y0 - 600; V.step(0.001);
      const sea = sample();
      V.CAM.z = 1.9; V.CAM.x = (b.x0 + b.x1) / 2; V.CAM.y = (b.y0 + b.y1) / 2; V.step(0.001);
      const land = sample();
      for (const [str, a] of sea) {
        const c = land.get(str); if (!c) continue;
        const d = Math.abs(a.L - c.L);
        if (d > BACKED_MAX) drift.push({ mode: name, text: str,
          overSea: a.bg.join(','), overVillage: c.bg.join(','), lumDrift: +d.toFixed(3) });
        if (d > worst) worst = d;
      }
    }
    V.finished = null; V.away = null; V.claimAsk = false;
    V.saveFailed = false; V.loadedFromBackup = false;
    V.panel = null; V.sel = null; V.moving = null;
    V.CAM.z = keepZ; V.CAM.x = keepX; V.CAM.y = keepY; V.step(0.001);
    drift.sort((x, y) => y.lumDrift - x.lumDrift);
    return { unprotected: drift.length, worstDrift: +worst.toFixed(3),
      allowed: BACKED_MAX, worst: drift.slice(0, 8) };
  };
  /* Does a reload give back everything the save wrote?

     The invariant inside the fuzzer compares a signature -- a hand-written list
     of the fields a save is supposed to carry. It was written the day a new
     field on trade orders was added to makeOrder and quietly dropped by load(),
     and it has the fault that bug had: a field nobody adds to the list is a
     field nobody checks. Same shape as the contrast sweep before backingSweep.

     This compares everything save() writes, so a field added tomorrow is covered
     without anyone remembering to add it. The trick is the poison. Wiping the
     state before loading is not enough -- the scalars (goal, land, ordersDone,
     mute) simply survive a partial wipe, so a save missing one of them looks
     identical to a save that has it. Loading a genuinely DIFFERENT village first
     is the generic poison: anything load() ignores keeps the other village's
     value, and the diff finds it.

     Only three fields are excluded, and all three are volatile by design: the
     timestamp, the measured rate, and order ids, which load() renumbers.

       saveSweep()  -> { diffs, worst, detects }
  --------------------------------------------------------------------------- */
  const SAVE_VOLATILE = new Set(['t', 'rate', 'id']);
  function stripVolatile(o) {
    const go = x => {
      if (Array.isArray(x)) return x.map(go);
      if (x && typeof x === 'object') {
        const out = {};
        for (const k of Object.keys(x)) if (!SAVE_VOLATILE.has(k)) out[k] = go(x[k]);
        return out;
      }
      return x;
    };
    return go(o);
  }
  function saveDiff(a, b) {
    const d = [];
    const walk = (x, y, p) => {
      if (typeof x !== typeof y) { d.push({ at: p, was: typeof x, now: typeof y }); return; }
      if (x && typeof x === 'object') {
        const kx = Object.keys(x), ky = Object.keys(y);
        for (const k of kx) if (!(k in y)) d.push({ at: p + '.' + k, dropped: true });
        for (const k of ky) if (!(k in x)) d.push({ at: p + '.' + k, added: true });
        for (const k of kx) if (k in y) walk(x[k], y[k], p + '.' + k);
      } else if (x !== y) d.push({ at: p, was: x, now: y });
    };
    walk(a, b, 'save');
    return d;
  }
  function buildVillage(spec) {
    V.placed.length = 0; V.villagers.length = 0; V.landTier = spec.land;
    V.ensureHall(); V.placed[0].lvl = spec.hall;
    const L = V.landBounds();
    const free = k => { for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
      if (V.canPlace(k, c, r, V.occupied())) return [c, r]; return null; };
    for (const k of spec.build) {
      V.grant('wood', 99999, 0, 0); V.grant('food', 99999, 0, 0);
      const sp = free(k); if (sp) V.place(k, sp[0], sp[1]);
    }
    for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
    V.res.wood = spec.w; V.res.food = spec.f; V.goalIdx = spec.goal;
    V.ordersDone = spec.done; V.muted = spec.mute;
    V.tutSeen.length = 0; spec.seen.forEach(x => V.tutSeen.push(x));
    V.orders = spec.tiers.map(t => V.makeOrder(t));
    V.sharedTotal = { ...spec.shared };
  }
  const RICH = { land: 2, hall: 4, build: ['house', 'farm', 'lumber', 'store', 'well', 'statue'],
                 w: 812, f: 655, goal: 9, done: 17, mute: false, seen: ['house', 'work'], tiers: [0, 1, 2],
                 shared: { wood: 123456.5, food: 7890.25 } };
  const POOR = { land: 0, hall: 1, build: ['house'],
                 w: 7, f: 3, goal: 1, done: 0, mute: true, seen: [], tiers: [2],
                 shared: { wood: 0, food: 0 } };
  window.saveSweep = function () {
    const real = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    const reload = () => { V.placed.length = 0; V.villagers.length = 0; V.orders = []; V.load(); };
    buildVillage(RICH); V.save();
    const written = localStorage.getItem(V.KEY);
    const want = stripVolatile(JSON.parse(written));
    buildVillage(POOR);                       // the poison
    localStorage.setItem(V.KEY, written); reload(); V.save();
    const got = stripVolatile(JSON.parse(localStorage.getItem(V.KEY)));
    const diffs = saveDiff(want, got);
    /* And prove the sweep can fail, every time it runs: drop each top-level
       field in turn and insist the diff notices. A checker that only ever
       reports zero has told you nothing. */
    const detects = {};
    for (const field of Object.keys(JSON.parse(written))) {
      if (SAVE_VOLATILE.has(field) || field === 'v') continue;
      const mangled = JSON.parse(written); delete mangled[field];
      buildVillage(POOR);
      localStorage.setItem(V.KEY, JSON.stringify(mangled)); reload(); V.save();
      const bad = stripVolatile(JSON.parse(localStorage.getItem(V.KEY)));
      detects[field] = saveDiff(want, bad).length > 0;
    }
    try { if (real !== null) localStorage.setItem(V.KEY, real); } catch (e) {}
    const blind = Object.entries(detects).filter(([, ok]) => !ok).map(([k]) => k);
    return { diffs: diffs.length, worst: diffs.slice(0, 8), fieldsChecked: Object.keys(detects).length, blindTo: blind };
  };
  console.log('textSweep ready: window.textSweep(), window.contrastSweep(), window.backingSweep(), window.saveSweep()');
})();
