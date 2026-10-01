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
    /* Every offer the village is holding is one the player can see.

       A market adds a trading stall, so selling one takes a stall away, and
       the offer standing at it had nowhere to go: it kept its place in the
       list with a slot past the end of the board, never drawn and never
       cleared. That is not just an offer lost. orders.length is what decides
       whether a new trader is due, so a board holding five and showing three
       reported itself full for ever -- and the replacement path stands down
       the moment ANY offer can be filled, including one nobody can see.

       Asked through orderRects, which is the draw path's own view of the
       board and the thing that seats it. Anything the village holds that
       that does not return is a card the player has no way to reach. */
    ['no trade offer is hidden from the board', () => V.orders.length === V.orderRects().length],
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
    /* Nobody is posted to scaffolding while a post that can actually deliver
       has room for them. Spare hands ARE welcome in the scaffolding -- the pass
       that places them ignores what a post is worth, on purpose, so that a
       villager with nowhere better to be stands somewhere rather than loitering
       -- so this only asks the question when somewhere better has an empty slot.

       "Can actually deliver" has to mean what computeJobs means by it, which is
       finished AND with room in the barn it produces into: a shed filling a full
       granary is worth exactly as little as a shed in scaffolding, and the game
       ranks the two together deliberately. Counting the full one as somewhere
       better reported 9 failures in 12,000 rounds on a village doing nothing
       wrong -- the checker being wrong rather than the game, and a reminder that
       a rule restated in the harness is a second definition that can drift. */
    ['no hand is held on a post that delivers nothing', () => {
      const room = k => V.caps[k] - V.res[k] >= V.CARRY;
      const canDeliver = q => {
        const b = V.B(q.key);
        return !!(b.jobs && b.makes) && q.t >= 1 && room(Object.keys(b.makes)[0]);
      };
      const want = V.desiredJobs().want;
      const short = V.placed.some(q => canDeliver(q) && (want.get(q.id) || 0) < V.jobsOf(q));
      if (!short) return true;
      return V.placed.every(q => !(V.B(q.key).jobs && q.t < 1 && (want.get(q.id) || 0) > 0));
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
    /* An arc is a playthrough with somebody AT the screen, so it says so rather
       than reading its surroundings -- the harness usually runs in a hidden
       pane, where a goal banner correctly never ages, stepGoals waits behind it
       forever and not one goal can complete. Inheriting a banner from the sweep
       before was enough to do it: this run built a maxed village, hall five,
       seventy-two villagers, fifty-seven trades, and recorded 0 of 23 goals
       while reporting no failures at all. */
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    V.goalDone = null; V.away = null; V.finished = null;
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
    delete document.hidden;                       // back to what the browser says
    /* A pacing run that got stuck measured nothing, and said so by reporting no
       failures at all. A good run reaches all twenty-three inside ninety
       simulated minutes, so a long run that reached a handful was BLOCKED, not
       slow -- an un-ageing goal banner stops the strip dead, and the first
       version of this checker sat behind one and called it a pass. Well clear
       of any honest pacing, which is what the goalTimes list is for. */
    const floor = maxMinutes >= 30 ? 5 : 1;
    if (goalTimes.length < floor) fails.push('the run reached only ' + goalTimes.length
      + ' goal(s) in ' + maxMinutes + ' simulated minutes, so it was blocked rather than slow');
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
      /* The goods that were in villagers' hands. Read at boot and handed back,
         so a damaged figure here is a damaged figure added straight to the
         stores -- the one save field that pays out on load. */
      transitGarbage: JSON.stringify({ ...o, transit: { wood: -500, food: 'lots' } }),
      transitHuge: JSON.stringify({ ...o, transit: { wood: 1e12, food: Infinity } }),
      transitNotAnObject: JSON.stringify({ ...o, transit: [1, 2, 3] }),
    };
    const bad = [], kept = {};
    for (const [name, raw] of Object.entries(cases)) {
      try {
        localStorage.setItem(V.KEY, raw); localStorage.removeItem(V.KEY_BAK);
        V.placed.length = 0; V.villagers.length = 0; V.orders = [];
        V.res.wood = 60; V.res.food = 40; V.landTier = 0; V.goalIdx = 0; V.ordersDone = 0;
        V.sharedTotal = { wood: 0, food: 0 };
        // the order boot uses, so every field a damaged save carries is applied
        V.load(); V.ensureHall(); V.landTransit(); V.collectAway();
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
          /* The rate the grant actually used, reconstructed rather than
             guessed at. Two things move it and both are the grant's own doing:
             anything left half built finishes across the gap, which raises it,
             and the goods that arrive can fill a store, which sends the
             workforce elsewhere and lowers it. Taking whichever of the before
             and after figures was larger covered the first and not the second,
             and the soak found it -- once in six thousand rounds, which is
             exactly the kind of flake that gets written off as noise.

             So: the village as it now stands, with the stores put back to what
             they were, which is the state grantAway asked the question in. The
             cached plan keys off whether each store has room, so restoring the
             stores restores the plan with them. */
          const paid = { wood: V.res.wood - before.wood, food: V.res.food - before.food };
          V.res.wood = before.wood; V.res.food = before.food;
          const after = V.potentialRate();
          V.res.wood = before.wood + paid.wood; V.res.food = before.food + paid.food;
          for (const k of ['wood', 'food']) {
            const got = paid[k];
            if (got < -1e-6) fails.push('coming back took resources away (' + k + ')');
            // the grant may only pay for the time the throttled tick did NOT
            const owed = Math.max(rate[k], after[k]) * Math.max(0, gone - simmed) + 2;
            if (got > owed) fails.push('coming back paid for time twice (' + k + ')');
          }
        }
        else if (act === 'away') {
          const before = { wood: V.res.wood, food: V.res.food };
          /* Stated as where the village ENDS UP, not as how much room there was
             when it left. The ceiling is not fixed across a stretch away: a
             storehouse left half built finishes while nobody is watching and
             raises it, and the haul is rightly clamped to the new one. Against
             the old figure this reported 96 failures on a village doing exactly
             what it should. The rule worth guarding is unchanged -- being away
             may not leave the stores over their ceiling, nor further over than
             it found them, which a sold storehouse can. */
          const over = k => V.res[k] - V.caps[k];
          const wasOver = { wood: over('wood'), food: over('food') };
          V.grantAway(Math.random() * V.AWAY_MAX * 1.5);
          V.away = null;
          for (const k of ['wood', 'food']) {
            const got = V.res[k] - before[k];
            if (got < -1e-6) fails.push('being away took resources away (' + k + ')');
            if (over(k) > Math.max(0, wasOver[k]) + 1e-6) fails.push('being away paid past the ceiling (' + k + ')');
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
          /* A WELL's label promises the same kind of figure, and for the same
             reason: its whole worth is which workplaces happen to fall inside a
             radius the player cannot see, so the number over the ghost is the
             entire basis of a forty wood decision. Nothing had ever held it to
             that, and it was counting workplaces standing in scaffolding, which
             produce nothing to speed up -- measured at +0.158/s promised
             against 0.100 delivered.

             A well is not instant the way a decoration is, so it is finished
             for the length of the comparison and put back under its scaffolding
             afterwards: the promise is about a built well, and the soak keeps
             the state it would have had. */
          const well = !!b2.boost;
          const wPred = well ? V.wellGainAt(pc, pr, 1).gain : 0;
          const was = (charm || well) ? V.deliveredAtMul(V.charmMul()) : 0;
          const put = V.place(b2.key, pc, pr);
          if (put && charm) {
            const got = V.deliveredAtMul(V.charmMul()) - was;
            if (Math.abs(got - pred) > 1e-6) fails.push('a ' + b2.key + ' promised +' + pred.toFixed(4) + '/s and delivered +' + got.toFixed(4));
          }
          if (put && well) {
            const w2 = V.placed[V.placed.length - 1];
            const keepT = w2.t, keepB = w2.build;
            w2.t = 1; w2.build = 0; V.rebuildStores();
            const got = V.deliveredAtMul(V.charmMul()) - was;
            /* And the well's OWN panel, once it exists, must say the same thing
               its label said -- they are two answers to one question. */
            const mine = V.wellGain(w2).gain;
            w2.t = keepT; w2.build = keepB; V.rebuildStores();
            if (Math.abs(got - wPred) > 1e-6)
              fails.push('a well promised +' + wPred.toFixed(4) + '/s and added +' + got.toFixed(4));
            if (Math.abs(mine - wPred) > 1e-6)
              fails.push('a well was sold at +' + wPred.toFixed(4) + '/s and then says it gives +' + mine.toFixed(4));
          }
        }
        else if (act === 'sell') {
          const q = pick(V.placed.filter(x => V.canSell(x)));
          /* Selling a house warns what the village would lose; afterwards its
             expected output must be exactly what the warning predicted. */
          const house = q && V.B(q.key).pop, pred = house ? V.potentialRate(q.id) : null;
          /* Unless the refund itself fills a store: a full store sends workers to
             other posts, which changes the plan for a reason that is not the house. */
          const fullness = () => ['wood', 'food'].map(k => V.caps[k] - V.res[k] < 8).join();
          const fullBefore = q ? fullness() : '';
          if (q && V.sellBuilding(q) && house && fullness() === fullBefore) {
            const now = V.potentialRate();
            for (const k of ['wood', 'food'])
              if (Math.abs(now[k] - pred[k]) > 1e-6) fails.push('selling a house predicted ' + k + ' ' + pred[k].toFixed(3) + '/s and left ' + now[k].toFixed(3));
          }
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
    /* At every shape of screen, not at whichever one the harness is running in.

       This is the same lesson asScreen was written for -- "the loop that
       claimed to test every shape of screen the HUD scale can take tested
       exactly one" -- and it had been applied to the text and never to the
       taps, which is the more expensive half: a string that overflows is ugly,
       a control that cannot be pressed is a game you cannot play. Every
       position and every hit region on the HUD is US() times something, and
       US() is clamped between 1 and 1.34 by the canvas height alone, so a
       conflict that only appears at the top of that range is invisible in a
       pane laid out at the bottom of it. Measured across these seven: US runs
       1.000 to 1.340 and the canvas 1536 to 3072, and the pane the harness
       usually sits in is at one end of both.

       The painting hit-masks below are left at one shape. They depend on the
       camera rather than on the HUD scale, and they already sweep seven zooms,
       which is the axis that matters for them. */
    const shapes = [[1200, 800], [360, 640], [375, 667], [390, 844], [344, 882], [360, 1040], [400, 1200]];
    const keepScreen = [window.innerWidth, window.innerHeight];
    const bad = [];
    let shapesSeen = 0, scales = new Set();
    let controls = 0;
    for (const [sw, sh] of shapes) {
    asScreen(sw, sh);
    V2.draw();                       // fitCanvas reads the faked size and resizes
    shapesSeen++; scales.add(us().toFixed(3));
    const R = V2.panelRects(), tabs = V2.tabRects(), bars = V2.barRects(), M = V2.muteRect();
    const where = ' (on a ' + sw + 'x' + sh + ' screen)';
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
    for (const d of drawn) {
      if (claim(d.x, d.y) !== d.n) bad.push({ control: d.n + where, its_middle_went_to: claim(d.x, d.y) });
      for (const o of drawn) {
        if (o === d) continue;
        for (const [fx, fy] of [[0, 0], [-0.4, 0], [0.4, 0], [0, -0.4], [0, 0.4]]) {
          const px = o.x + fx * o.w, py = o.y + fy * o.h;
          if (claim(px, py) === d.n) bad.push({ drawn_as: o.n + where, taken_by: d.n });
        }
      }
      /* And drawn where a thumb can reach it. A control laid out past the
         bottom of the canvas answers taps nobody can make. */
      controls++;
      if (d.x - d.w / 2 < -0.5 || d.x + d.w / 2 > 1024.5
        || d.y - d.h / 2 < V2.screenTop() - 0.5 || d.y + d.h / 2 > V2.screenBot() + 0.5)
        bad.push({ control: d.n + where, off_screen: [Math.round(d.x - d.w / 2), Math.round(d.y - d.h / 2),
          Math.round(d.x + d.w / 2), Math.round(d.y + d.h / 2)] });
    }
    }
    asScreen(keepScreen[0], keepScreen[1]);
    V2.draw();
    /* Both ends of the clamp, or the sweep is back to testing one shape under a
       longer list. */
    if (shapesSeen !== shapes.length) bad.push({ shapes: 'only ' + shapesSeen + ' of ' + shapes.length + ' were laid out' });
    if (scales.size < 2) bad.push({ scales: 'every shape came out at the same HUD scale, so the list proves nothing' });
    V2.panel = null;
    /* A building is what you see, not the ground under it. Taps used to be
       matched to plots only, so the roof and tower of the hall -- the top half
       of it on screen -- opened whatever stood behind, or the claim card. For
       every painting, points where it is the one on top and which lie ABOVE its
       own plot must still open it. */
    let paintingChecks = 0;
    /* Its own camera, and a range of them. Which pixels a painting covers on
       screen depends entirely on the zoom, and this used whatever camera the
       sweep before it had left -- so a disagreement that only shows at the
       zoom floor sat unfound until a battery happened to run it from the right
       place. Seven zooms from floor to ceiling now, every time. */
    const keepZ = V2.CAM.z, keepX = V2.CAM.x, keepY = V2.CAM.y;
    for (const z of [0.35, 0.5, 0.7, 1, 1.5, 2.2, 3]) {
    V2.CAM.z = z; V2.CAM.x = 512; V2.CAM.y = 746; V2.step(0.001);
    for (const p of V2.placed) {
      const R = V2.artRect(p); if (!R) continue;
      const b = V2.B(p.key), dep = q => { const bq = V2.B(q.key); return V2.tileToWorld(q.c + bq.w - 1, q.r + bq.h - 1).y; };
      for (let fy = 0.08; fy < 0.6; fy += 0.07) for (let fx = 0.2; fx <= 0.8; fx += 0.1) {
        /* Asked at the point the GAME will see, not the ideal one. buildingAt
           unprojects the screen point it is given, and that round trip is not
           bit exact -- about two thousandths of a world pixel. Normally
           harmless; here it is not, because these sample fractions land
           squarely on the boundaries of the hit mask's cells (0.15 of an
           800-pixel sprite at four pixels a cell is cell 30.0000 exactly), so
           the drift decides the cell and the checker reported the game wrong
           for disagreeing with a point it was never given. Project first,
           unproject back, and ask both sides about the same point. */
        const ideal = V2.camProject(R.left + fx * R.wid, R.top + fy * R.hgt);
        const seen = V2.camUnproject(ideal.x, ideal.y);
        const wx = seen.x, wy = seen.y;
        if (!V2.paintedAt(p, wx, wy)) continue;
        const t = V2.tileAt(wx, wy);
        if (t.c >= p.c && t.c < p.c + b.w && t.r >= p.r && t.r < p.r + b.h) continue;   // over its own plot
        const later = q => dep(q) > dep(p) || (dep(q) === dep(p) && V2.placed.indexOf(q) > V2.placed.indexOf(p));
        if (V2.placed.some(q => q !== p && !V2.B(q.key).flat && later(q) && V2.paintedAt(q, wx, wy))) continue;   // drawn over here
        const got = V2.buildingAt(ideal.x, ideal.y);
        paintingChecks++;
        if (got !== p) bad.push({ drawn_as: p.key + ' painting', taken_by: got ? got.key : 'the ground', zoom: z });
      }
    }
    }
    V2.CAM.z = keepZ; V2.CAM.x = keepX; V2.CAM.y = keepY; V2.step(0.001);
    return { controls, shapes: shapesSeen, scales: [...scales], paintingChecks, conflicts: bad.length, worst: bad.slice(0, 6) };
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
    /* Pinned, not read: the harness itself often runs in a hidden pane, and a
       checker that agrees with its surroundings checks nothing. Put back at
       the end. */
    const hide = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    hide(false);
    for (const [name, cover, clear] of [
      ['away card', () => { V.away = { secs: 7200, got: { wood: 1, food: 1 } }; }, () => { V.away = null; }],
      ['goal banner', () => { V.goalDone = { g: V.GOALS[0], got: {}, age: -1e9 }; }, () => { V.goalDone = null; }],
      ['finished card', () => { V.finished = { villagers: 1, buildings: 1, trades: 0, charm: 0 }; }, () => { V.finished = null; }],
      /* The plainest way of not being on screen: the phone is showing something
         else. The tick runs on in the background and used to run the hints out
         with it. */
      ['home screen', () => hide(true), () => { hide(false); V.hiddenAt = 0; V.hiddenSim = 0; }]]) {
      V.placed.length = 0; V.villagers.length = 0; V.ensureHall(); V.tutSeen.length = 0;
      V.away = null; V.goalDone = null; V.finished = null;
      /* And an UNFINISHED village. The completion card is raised from the
         state of the village and cleared from tutSeen -- so a sweep that
         wipes tutSeen while a previous one left goalIdx past the last goal
         raises the card on the next tick, and a card on screen stops the hint
         clock. That is the game behaving correctly; it is this scene that was
         half built. All four cases reported the first hint never finishing. */
      V.goalIdx = 0;
      cover();
      for (let i = 0; i < 40 * 30; i++) { if (V.goalDone) V.goalDone.age = -1e9; V.step(1 / 30); }
      if (V.tutSeen.includes('house')) fails.push('the first hint expired behind the ' + name);
      clear();
      for (let i = 0; i < 21 * 30; i++) V.step(1 / 30);
      if (!V.tutSeen.includes('house')) fails.push('the first hint never finished once the ' + name + ' closed');
    }
    /* The goal banner's four and a half seconds are the same seconds. It is the
       only record of which goal finished and what it paid. */
    V.goalDone = { g: V.GOALS[0], got: {}, age: 0 };
    const banner = V.goalDone;
    hide(true);
    for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
    if (V.goalDone !== banner) fails.push('the goal banner expired while the page was hidden');
    hide(false); V.hiddenAt = 0; V.hiddenSim = 0;
    for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
    if (V.goalDone === banner) fails.push('the goal banner never expired once the page came back');
    V.goalDone = null;

    /* A hint pushed off the strip by an earlier one has not been read.

       currentHint returns the earliest unseen hint whose condition holds, so a
       hint EARLIER in the list becoming true takes the strip from a later one.
       That used to count as the player having done the thing, and the later
       hint went into tutSeen unread, never to be shown again.

       Built as it happens in play. The goal asks for a third ring of land and
       the land hint is up -- the only thing in the game that says the way to
       claim it is to tap the dark ground. The village then affords a hall
       upgrade, which turns the hall hint true, and the hall hint is earlier.
       The land hint must survive that and come back when the hall hint is
       done, with the goal still asking for land the whole way through. */
    {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = 1; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null; V.barMode = 'build';
      V.ensureHall(); V.placed[0].lvl = 3; V.placed[0].t = 1;
      V.res.wood = 400; V.res.food = 400;
      const L2 = V.landBounds();
      /* Two storehouses, because the hall's next level costs more than a bare
         village can physically hold: res is clamped to the ceiling by the first
         delivery, so without them the upgrade never becomes affordable and the
         earlier hint never turns true. */
      const put = [V.place('house', L2.lo + 1, L2.lo + 1), V.place('lumber', L2.lo + 3, L2.lo + 1),
                   V.place('farm', L2.lo + 1, L2.lo + 3), V.place('store', L2.lo + 5, L2.lo + 1),
                   V.place('store', L2.lo + 5, L2.lo + 4)];
      for (const q of V.placed) { q.t = 1; q.build = 0; }
      V.rebuildStores();
      V.goalIdx = V.GOALS.findIndex(x => x.text === 'Claim a third ring of land');
      V.res.wood = 0; V.res.food = 0;
      /* One step to let whatever the case before left on the strip settle out,
         and only then the seeding. The hint on the strip is not reset by
         building a new village, and its condition will have gone false under
         it -- which now correctly marks it read, and it was marking 'hall'
         read, so the hall hint could never take the strip and the check tested
         nothing. A sweep builds its own scene, and the strip is part of it. */
      V.step(1 / 30);
      /* The three before it are already read, or one of them holds the strip
         and there is nothing to displace. */
      V.tutSeen.length = 0; V.tutSeen.push('house', 'work', 'tap');
      for (let i = 0; i < 6 * 30; i++) V.step(1 / 30);
      const first = V.currentHint() && V.currentHint().id;
      if (!put.every(Boolean) || first !== 'land') {
        fails.push('the displacement check could not get the land hint on the strip (got ' + first + ')');
      } else {
        // a hall upgrade is now affordable; held there, since a delivery clamps
        // whatever is over the ceiling back down to it
        for (let i = 0; i < 30; i++) { V.res.wood = 1e5; V.res.food = 1e5; V.step(1 / 30); }
        const now = V.currentHint() && V.currentHint().id;
        if (now !== 'hall') fails.push('the earlier hint did not take the strip (got ' + now + '; canUpgrade ' + V.canUpgrade(V.hallOf()) + ', res ' + Math.round(V.res.wood) + '/' + Math.round(V.res.food) + ', cost ' + JSON.stringify(V.upInfo(V.hallOf()).cost) + ', gate ' + V.upInfo(V.hallOf()).gate + ', seen ' + V.tutSeen.join('|') + ')');
        else if (V.tutSeen.includes('land'))
          fails.push('a hint pushed off the strip by an earlier one was written off as read');
        else {
          // the hall hint runs its course, with the upgrade still affordable
          for (let i = 0; i < 25 * 30; i++) { V.res.wood = 1e5; V.res.food = 1e5; V.step(1 / 30); }
          const back = V.currentHint() && V.currentHint().id;
          if (back !== 'land') fails.push('the displaced hint never came back (got ' + back + ')');
        }
      }
    }

    /* And no hint names a building the player cannot build.

       "Advice the tray refuses is worse than none" is a rule the hall panel and
       remedy() both keep, and the hints did not, because their words are
       written into a table rather than worked out from the village. The
       full-stores hint ended "or build a storehouse" whatever the hall allowed:
       at level one, measured, the storehouse is not merely unaffordable but not
       unlocked and not on the tray at all -- and this hint is shown ONCE, so
       that was the whole of what the player was ever told about the state.

       Stated over every building rather than over that one clause, because the
       fault is in how the words were written and the next hint will be written
       the same way. Names are stripped longest first, or "storehouse" would be
       read as asking for a house. */
    {
      const named = V.BUILDINGS.filter(b => b.key !== 'hall')
        .map(b => ({ key: b.key, word: b.name.toLowerCase() }))
        .sort((a, b) => b.word.length - a.word.length);
      const namesIn = text => {
        let rest = ' ' + text.toLowerCase() + ' ', out = [];
        for (const n of named) {
          let hit = false;
          while (rest.includes(n.word)) { hit = true; rest = rest.replace(n.word, ' '); }
          while (rest.includes(' ' + n.key + ' ')) { hit = true; rest = rest.replace(' ' + n.key + ' ', '  '); }
          if (hit) out.push(n.key);
        }
        return out;
      };
      /* A matrix of villages, because which hints can fire and which buildings
         are permitted both turn on the hall. Every hint that CAN take the strip
         in a village is walked past by marking it read and asking again.

         stage is how far the village has got: the first two hints only speak to
         a village that has not built the thing they are asking for, and the
         land hint only to one with a border left to push out and a goal asking
         for it. Every hint in the table has to be seen by the end, or the check
         is only looking at the ones that happen to be easy to reach. */
      const LAND_GOAL = V.GOALS.findIndex(g => /land|island/i.test(g.text));
      let looked = 0, hintsSeen = new Set();
      for (const hallLvl of [1, 2, 3, 4, 5]) for (const stores of [0, 1, 2, 4])
      for (const stage of [0, 1, 2]) {
        V.placed.length = 0; V.villagers.length = 0;
        V.landTier = stage === 2 ? V.LAND_MAX : 0; V.coverPlaced();
        V.goalIdx = stage === 2 ? 0 : LAND_GOAL;
        V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
        V.tutSeen.length = 0;
        V.ensureHall(); V.placed[0].lvl = hallLvl;
        V.res.wood = 1e6; V.res.food = 1e6;
        const LB = V.landBounds();
        const put = k => { for (let r2 = LB.lo; r2 <= LB.hi; r2++) for (let c2 = LB.lo; c2 <= LB.hi; c2++)
          if (V.canPlace(k, c2, r2, V.occupied())) return V.place(k, c2, r2); return false; };
        if (stage >= 1) put('house');
        if (stage >= 2) { put('farm'); put('lumber'); }
        for (let i = 0; i < stores; i++) put('store');
        for (let i = 0; i < 40 * 30; i++) V.step(1 / 30);
        /* Both halves of the matrix: stores at the ceiling, which is what the
           last hint is about, and stores with room, which is every other one. */
        for (const full of [true, false]) {
          V.tutSeen.length = 0;
          if (full) { V.res.wood = V.caps.wood; V.res.food = V.caps.food; }
          else { V.res.wood = 0; V.res.food = 0; }
          for (let guard = 0; guard < V.TUT.length + 1; guard++) {
            const h = V.currentHint();
            if (!h) break;
            hintsSeen.add(h.id); looked++;
            for (const key of namesIn(V.hintText(h)))
              if (!V.permitted(key))
                fails.push('the "' + h.id + '" hint names the ' + key
                  + ', which the hall does not allow: "' + V.hintText(h) + '"');
            V.tutSeen.push(h.id);
          }
        }
      }
      if (!looked) fails.push('the hint-advice check got no hint onto the strip, so it proves nothing');
      for (const id of V.TUT.map(h => h.id))
        if (!hintsSeen.has(id)) fails.push('the hint-advice check never saw the "' + id + '" hint');
    }

    delete document.hidden;                     // back to what the browser says
    V.goalIdx = 0;                              // left as it was found, unfinished
    return { cases: 7, fails };
  };
  /* Building badges never print over one another. A built-up island at phone
     zoom used to stack "−63%", "−65%" and rows of ▲ into an unreadable pile. */
  window.badgeOverlapSweep = function () {
    const V = window.__v, keepZ = V.CAM.z;
    sweepVillage(true);
    for (const p of V.placed) if (V.B(p.key).jobs && p.key !== 'hall') p.lvl = 3;   // leave room to upgrade
    V.grant('wood', 1e6, 0, 0); V.grant('food', 1e6, 0, 0);
    let frames = 0, drawn = 0; const bad = [];
    for (const z of [0.35, 0.5, 0.55, 0.8, 1.2, 2.2]) {
      V.CAM.z = z; V.step(0.001); V.draw(); frames++;
      // and big enough to read: the smallest badge text reaches the HUD floor on screen
      const onScreen = V.BADGE_TEXT_PX * V.badgeScale() * V.camScale();
      if (z >= 0.55 && onScreen < V.TEXT_MIN - 0.5) bad.push({ z, tooSmall: +onScreen.toFixed(1), floor: V.TEXT_MIN });
      // delivery pops share the scale: POP_PX units drawn at badgeScale x BADGE_TEXT_PX / POP_PX
      const pop = V.POP_PX * (V.badgeScale() * V.BADGE_TEXT_PX / V.POP_PX) * V.camScale();
      if (z >= 0.55 && pop < V.TEXT_MIN - 0.5) bad.push({ z, popTooSmall: +pop.toFixed(1), floor: V.TEXT_MIN });
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

    /* And the label under the player's finger.

       Everything else drawn in the world may wander off the screen: a badge
       belongs to a building, and a building the camera is not looking at has
       no business painting over one it is. The text sweep exempts world-drawn
       text for exactly that reason, and the exemption is right -- but it also
       covered the one piece of world text that is anchored to the FINGER,
       which is by definition on the screen, and which carries the only number
       a placement decision is made on.

       Measured at full zoom before it was held: a statue's label spanning -213
       to 406, and, with the tile near the top of the view, a well's sitting
       entirely at -274 -- not clipped, gone.

       Driven the way a finger drives it: the ghost on a tile, the camera moved
       so that tile sits near each edge in turn, at both ends of the zoom. */
    for (const [sw, sh] of [[375, 812], [768, 1024]]) {
      asScreen(sw, sh); V.step(0.001);
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.claimAsk = false;
      V.goalIdx = V.GOALS.length;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.grant('wood', 1e6, 0, 0); V.grant('food', 1e6, 0, 0);
      const L = V.landBounds();
      for (const [k, dc, dr] of [['house', 1, 1], ['house', 1, 3], ['farm', 4, 1], ['lumber', 4, 4],
                                 ['mill', 7, 1], ['store', 7, 5], ['market', 10, 1]])
        V.place(k, L.lo + dc, L.lo + dr);
      for (const q of V.placed) { q.t = 1; q.build = 0; }
      V.rebuildStores();
      for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
      const cv2 = document.querySelector('canvas'), ctx2 = cv2.getContext('2d');
      /* The pill, not the words: the words are centred in it and the pill is
         what has to fit. Taken with the transform in force, since it is drawn
         in the world under a scale. */
      const pill = (key, c, r) => {
        V.sel = key; V.ghost = { c, r, fits: true, why: null, ok: true };
        let hit = null, last = null;
        const oF = ctx2.fillText, oR = ctx2.roundRect;
        ctx2.roundRect = function (x, y, w, h) { last = { x, y, w, h, m: this.getTransform() }; return oR.apply(this, arguments); };
        ctx2.fillText = function (t) {
          if (last && !hit && new RegExp('lifts|reaches|charm|/s here|no one spare|need ').test(String(t)))
            hit = { t: String(t), r: last };
          return oF.apply(this, arguments); };
        try { V.draw(); } finally { ctx2.fillText = oF; ctx2.roundRect = oR; }
        V.sel = null; V.ghost = null;
        if (!hit) return null;
        const m = hit.r.m;
        /* Out of canvas pixels and into the coordinates the HUD is laid out
           in. The canvas is VH tall and the letterbox puts logical zero OY
           pixels down it, so a transform read straight off the context is OY
           lower than hudTop and hudBot are counted from -- 341 pixels of it on
           a 375x812 phone. Compared raw, this reported twelve labels off the
           bottom that were sitting exactly on the bound they had been held to,
           and very nearly had me 'fix' a clamp that was already right. */
        const oy = -V.screenTop();
        return { t: hit.t, L: m.a * hit.r.x + m.e, R: m.a * (hit.r.x + hit.r.w) + m.e,
          T: m.d * hit.r.y + m.f - oy, B: m.d * (hit.r.y + hit.r.h) + m.f - oy };
      };
      for (const z of [0.55, 2.2]) for (const key of ['well', 'statue', 'mill', 'path', 'store']) {
        for (const [dc, dr] of [[4, 3], [2, 2], [11, 11]]) {
          const c = L.lo + dc, r = L.lo + dr, wpt = V.tileToWorld(c, r);
          for (const [ox, oy] of [[0, 0], [-420, 0], [420, 0], [0, -600], [0, 600]]) {
            V.CAM.z = z;
            V.CAM.x = wpt.x + ox / (V.CAM.base * V.CAM.z); V.CAM.y = wpt.y + oy;
            V.step(0.001);
            const q = pill(key, c, r);
            if (!q) continue;
            checks++;
            if (q.L < -1 || q.R > 1025 || q.T < V.hudTop() - 1 || q.B > V.hudBot() + 1)
              bad.push({ screen: sw + 'x' + sh, z, key, label: q.t.slice(0, 28),
                x: [Math.round(q.L), Math.round(q.R)], y: [Math.round(q.T), Math.round(q.B)] });
          }
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
  /* Back never needs a dead press. Every history entry pushed for something open
     must be gone once nothing is, however it was closed -- or the next press of
     Android's back closes nothing and looks broken. Async: popstate is. */
  window.backSweep = async function () {
    const V = window.__v, wait = ms => new Promise(r => setTimeout(r, ms));
    let depth = 0; const op = history.pushState.bind(history), ob = history.back.bind(history);
    history.pushState = (...a) => { depth++; return op(...a); };
    history.back = () => { depth--; return ob(); };
    const fails = [];
    const settle = async () => { V.step(0.001); await wait(250); V.step(0.001); await wait(50); };
    try {
      /* Its own scene, like gestureSweep's. It inherited the previous sweep's
         village, and a finished one raises its card again the moment the card
         is cleared -- so back was already armed before the first case and
         nothing was pushed to close anything, five times over. Everything the
         back button can close is cleared, and the goals are wound back so the
         village cannot be finished and cannot complete one mid-run. */
      V.placed.length = 0; V.villagers.length = 0; V.ensureHall();
      V.goalIdx = 0; V.tutSeen.length = 0;
      V.panel = null; V.barMode = 'build'; V.sel = null; V.moving = null; V.away = null; V.claimAsk = false;
      V.finished = null; V.goalDone = null;
      await settle(); depth = 0;
      /* And say so if any of that did not take: five "nothing was pushed"
         failures are a puzzle, "something was already open" is an answer. */
      if (V.backOpen()) fails.push('the sweep began with something already open, so nothing could be armed');
      const cases = [
        ['a panel closed with its x', () => { V.panel = V.placed[0].id; }, async () => { V.panel = null; }],
        ['a panel closed with back', () => { V.panel = V.placed[0].id; }, async () => { history.back(); }],
        ['the claim card tapped away', () => { V.claimAsk = true; }, async () => { V.claimAsk = false; }],
        ['a placement cancelled from the tray', () => { V.sel = 'house'; }, async () => { V.sel = null; }],
        ['two things closed with two backs', () => { V.barMode = 'orders'; V.panel = V.placed[0].id; },
          async () => { history.back(); await settle(); history.back(); }],
      ];
      for (const [name, open, close] of cases) {
        open(); await settle();
        if (depth < 1) fails.push(name + ': nothing was pushed to close it');
        await close(); await settle();
        if (depth !== 0) fails.push(name + ': ' + depth + ' dead back press(es) left');
        depth = 0;
      }

      /* The card for finishing the village: raised when it can be seen, shown
         once, and never lost.

         It is transient -- not in the save -- so what has to carry across a
         cold start is the fact that it has not been seen YET. Two separate
         faults lost it. tutSeen was written the moment the card was raised,
         so shutting the app during the goal banner left a finished village
         with 'complete' already recorded and no card ever again. And a tap or
         a back press acted on the card being SET rather than being up, so it
         could be thrown away while another card covered it.

         Driven the way it happens: claim the last ring, which raises the
         banner announcing that goal, and follow it through.
      */
      {
        const cv2 = document.querySelector('canvas'), ctx2 = cv2.getContext('2d');
        const hide = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
        const drawn = () => { let saw = false; const o = ctx2.fillText;
          ctx2.fillText = function (t) { if (String(t) === 'Your village is finished') saw = true; return o.apply(this, arguments); };
          try { V.draw(); } finally { ctx2.fillText = o; } return saw; };
        /* A cold start, as a fresh page makes one: the transient cards gone
           and the file read back. */
        const restart = () => { V.finished = null; V.goalDone = null; V.away = null; V.claimAsk = false;
          V.placed.length = 0; V.villagers.length = 0; V.orders = [];
          V.load(); V.landTransit(); for (let i = 0; i < 2 * 30; i++) V.step(1 / 30); };
        const realSave = localStorage.getItem(V.KEY);
        hide(false);
        try {
          V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX - 1; V.coverPlaced();
          V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
          V.claimAsk = false; V.barMode = 'build'; V.moving = null;
          V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
          V.res.wood = 1e5; V.res.food = 1e5; V.tutSeen.length = 0;
          V.goalIdx = V.GOALS.length - 1;
          V.step(1 / 30);
          V.landTier = V.LAND_MAX; V.coverPlaced();          // the last goal is done
          V.step(1 / 30);
          if (!V.goalDone) fails.push('the last goal completed without its banner');
          else if (drawn()) fails.push('the completion card drew over the goal banner');
          else if (V.tutSeen.includes('complete'))
            fails.push('the completion card was recorded as seen before it had been shown');
          else {
            /* Shut the game while the banner is still up, which is the case
               that used to lose it outright. */
            V.save(); restart();
            if (!drawn()) fails.push('the completion card was lost by shutting the game during the goal banner');
            else {
              /* Covered by another card, it is neither drawn nor dismissable. */
              V.away = { secs: 7200, got: { wood: 1, food: 1 } };
              if (drawn()) fails.push('the completion card drew over the welcome-back card');
              V.tap(512, 900);                                // dismisses the away card
              if (V.away) fails.push('the tap did not reach the welcome-back card');
              if (!V.finished) fails.push('a tap threw away the completion card while another card covered it');
              V.claimAsk = true;
              if (drawn()) fails.push('the completion card drew over the claim dialogue');
              V.backClose();
              if (V.claimAsk) fails.push('the back press did not reach the claim dialogue');
              if (!V.finished) fails.push('a back press closed the completion card while another card covered it');
              else if (V.backOpen() && !V.claimAsk && !V.away && !V.goalDone && !drawn())
                fails.push('the back gesture counted a card nobody can see as something to close');
            }
            /* And once it is dismissed it stays dismissed, over a cold start. */
            if (V.finished) {
              if (!drawn()) fails.push('the completion card was not on screen when it should have been');
              V.tap(512, 900);
              if (V.finished) fails.push('the completion card could not be tapped away once it was up');
              else if (!V.tutSeen.includes('complete'))
                fails.push('dismissing the completion card did not record it as seen');
              else { V.save(); restart();
                if (drawn()) fails.push('the completion card came back after it had been dismissed'); }
            }
          }
        } finally {
          delete document.hidden;
          V.hiddenAt = 0; V.hiddenSim = 0;
          V.finished = null; V.goalDone = null; V.away = null; V.claimAsk = false;
          V.goalIdx = 0; V.tutSeen.length = 0;
          try { if (realSave !== null) localStorage.setItem(V.KEY, realSave); } catch (e) {}
        }
      }
    } finally { history.pushState = op; history.back = ob; }
    return { cases: 6, fails };
  };
  /* Touches that are not taps must not tap. Two fingers down and up in place
     fired a tap under each, and a cancelled touch (notification shade, back
     swipe, a call) fired one where it began. Real pointer events on the canvas,
     aimed at the hall's painting, where a tap opens its panel. */
  window.gestureSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), b = cv.getBoundingClientRect();
    /* This is the one sweep that needs the page to be on screen. It dispatches
       real pointer events, and the game reads them against the canvas's real
       size -- so in a window laid out at nothing every gesture lands on the same
       point and none of them mean anything. It says that, rather than reporting
       the game broken: run headless it claimed a plain tap did not open the
       hall, and before the camera learned to refuse a sizeless canvas it threw a
       PointerEvent error instead, which reads as neither a pass nor a finding. */
    if (!(b.width > 0) || !(b.height > 0))
      return { cases: 0, fails: ['the canvas has no size on screen, so not one gesture could be measured'] };
    /* Its own scene, its own camera. It aimed at placed[0] through whatever
       camera the sweep before it happened to leave behind, so its answer
       depended on the running order: after badgeOverlapSweep, which ends on a
       built-up island at z 0.66, the plain tap landed on open ground and the
       checker reported a broken tap. A checker that agrees with its
       neighbours is not measuring the game. */
    V.placed.length = 0; V.villagers.length = 0; V.ensureHall();
    V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.away = null; V.goalDone = null; V.finished = null;
    /* And an UNFINISHED village, or clearing the completion card achieves
       nothing: it is raised from the STATE of the village, every tick until it
       is dismissed, so a sweep that leaves goalIdx past the last goal has the
       card back on the first step and the plain tap lands on it. Reproduced
       deterministically -- set goalIdx to the end and this sweep reports a
       broken tap twice running. It passes in the battery only because the hint
       sweep before it puts goalIdx back, which is the running order deciding
       the answer, and the note above is about exactly that. hintSweep needed
       the same line for the same reason. */
    V.goalIdx = 0; V.tutSeen.length = 0;
    /* camFit sets the zoom, not the centre -- boot pans first and fits after --
       so the camera had to be pointed at the hall as well, or the tap was
       dispatched at a point off the edge of the canvas. */
    V.camFit(true);
    { const R = V.artRect(V.placed[0]); V.CAM.x = R.left + R.wid / 2; V.CAM.y = R.top + R.hgt / 2; }
    V.step(0.001);
    const ev = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id,
      clientX: x, clientY: y, pointerType: 'touch', isPrimary: id === 1, button: 0 }));
    const aim = () => { const R = V.artRect(V.placed[0]); const s = V.camProject(R.left + R.wid / 2, R.top + R.hgt * 0.6);
      return [b.left + s.x / 1024 * b.width, b.top + (s.y + (cv.height - 1536) / 2) / cv.height * b.height]; };
    const fails = [];
    const opens = gesture => { V.panel = null; V.sel = null; V.moving = null; gesture(); const o = V.panel != null; V.panel = null; return o; };
    let [x, y] = aim();
    if (!opens(() => { ev('pointerdown', 1, x, y); ev('pointerup', 1, x, y); })) fails.push('a plain tap did not open the hall');
    if (opens(() => { ev('pointerdown', 1, x, y); ev('pointerdown', 2, x + 60, y + 40); ev('pointerup', 2, x + 60, y + 40); ev('pointerup', 1, x, y); }))
      fails.push('two fingers down and up in place tapped');
    if (opens(() => { ev('pointerdown', 1, x, y); ev('pointercancel', 1, x, y); })) fails.push('a cancelled touch tapped');
    const z0 = V.CAM.z;
    ev('pointerdown', 1, x - 40, y); ev('pointerdown', 2, x + 40, y);
    for (let i = 1; i <= 10; i++) { ev('pointermove', 1, x - 40 - i * 8, y); ev('pointermove', 2, x + 40 + i * 8, y); }
    ev('pointerup', 1, x - 120, y); ev('pointerup', 2, x + 120, y);
    if (!(V.CAM.z > z0 + 0.01)) fails.push('a pinch did not zoom');
    [x, y] = aim();
    if (!opens(() => { ev('pointerdown', 3, x, y); ev('pointerup', 3, x, y); })) fails.push('a tap after a pinch did not open the hall');
    /* And a canvas with no size cannot destroy the camera.

       The page is laid out at nothing more often than it looks: a WebView still
       being measured at launch, a container not displayed yet, a split-screen
       divider mid-drag. A touch arriving then used to divide by a zero width,
       and the wreckage did not stay in the event -- the pinch midpoint came out
       NaN and its distance Infinity, which passes the pinch's own sanity check,
       so CAM.z went to NaN and stayed there. Every clamp preserves a NaN, so the
       camera scaled by NaN and the game drew an empty screen for the rest of the
       session. Squeezed to nothing here, pinched, and put back. */
    {
      const keepW = cv.style.width, keepH = cv.style.height;
      const z1 = V.CAM.z, cx = V.CAM.x, cy = V.CAM.y;
      cv.style.width = '0px'; cv.style.height = '0px'; void cv.offsetWidth;
      /* Straddling where the canvas now is, because that is where a pinch
         lands: with no width its left edge IS its centre. It has to straddle.
         Two fingers on the SAME side both come out at minus infinity, their
         separation is NaN, and the pinch's own check throws that away -- it is
         the pair either side, infinity apart, that gets through. */
      const e = cv.getBoundingClientRect(), mx = e.left, my = e.top;
      ev('pointerdown', 7, mx - 40, my); ev('pointerdown', 8, mx + 40, my);
      for (let i = 1; i <= 10; i++) { ev('pointermove', 7, mx - 40 - i * 8, my); ev('pointermove', 8, mx + 40 + i * 8, my); }
      ev('pointerup', 7, mx - 120, my); ev('pointerup', 8, mx + 120, my);
      cv.style.width = keepW; cv.style.height = keepH; void cv.offsetWidth;
      if (!Number.isFinite(V.CAM.z) || !Number.isFinite(V.CAM.x) || !Number.isFinite(V.CAM.y))
        fails.push('a pinch on a canvas with no size left the camera at z ' + V.CAM.z
          + ', centred on ' + V.CAM.x + ',' + V.CAM.y);
      V.CAM.z = z1; V.CAM.x = cx; V.CAM.y = cy;
    }
    V.CAM.z = z0; V.step(0.001);
    return { cases: 6, fails };
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
        // offers the village cannot pay for, each saying how much is missing
        ordersShort: () => { V.barMode = 'orders'; V.orders = [V.makeOrder(0), V.makeOrder(1), V.makeOrder(2)]; window.__keptRes = { w: V.res.wood, f: V.res.food }; V.res.wood = 3; V.res.food = 3; },
        ordersShortDone: () => { V.res.wood = window.__keptRes.w; V.res.food = window.__keptRes.f; },
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
        /* A staffed WORKPLACE for choice: its row is the long one -- what it
           delivers, why that is nothing, what it will be when the work is done,
           and its posts -- and taking whatever came first in the list drew a
           house's two-clause row instead. */
        building: () => { V.loadedFromBackup = false;
          const q = V.placed.find(x => x.key !== 'hall' && V.B(x.key).makes && V.B(x.key).jobs && V.workersAt(x.id))
            || V.placed.find(x => x.key !== 'hall');
          if (q) { q.t = 0.4; V.panel = q.id; } },
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
                V.step(0.001); take();
                // and the same stalls when nothing can be paid for: the red "need" line
                const kw = V.res.wood, kf = V.res.food; V.res.wood = 3; V.res.food = 3; V.step(0.001); take();
                V.res.wood = kw; V.res.food = kf; V.orders = keepO; }
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
  const SAVE_VOLATILE = new Set(['t', 'rate', 'id', 'transit']);
  /* What the village HOLDS, which is its stores plus whatever is in villagers'
     hands. A round trip through the save moves goods from the second to the
     first -- the villagers are rebuilt empty and what they were carrying is
     put back into the stores -- so comparing the raw res field would report a
     village that lost nothing as a village that changed. */
  function foldTransit(o) {
    const out = JSON.parse(JSON.stringify(o));
    if (out && out.res && out.transit) for (const k of ['wood', 'food'])
      out.res[k] = (out.res[k] || 0) + (out.transit[k] || 0);
    return out;
  }
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
    /* The same order boot uses, all of it. It said so and ran two of the four
       lines: ensureHall and coverPlaced were missing, so the harness reloaded a
       village the game would never produce -- and coverPlaced is the line that
       REPAIRS a save whose land field is gone, by widening the claim until it
       covers what is built. Without it landTier simply kept whatever the module
       already held, which is why the field check reported itself blind to land
       and could not say whether that was the game or itself. */
    const reload = () => { V.placed.length = 0; V.villagers.length = 0; V.orders = [];
      V.landTier = 0; V.load(); V.ensureHall(); V.coverPlaced(); V.landTransit(); };
    buildVillage(RICH);
    // with goods genuinely in hand, so the transit field is exercised rather than zero
    for (const g of V.villagers) g.carry = { k: 'wood', n: 8 };
    V.save();
    const written = localStorage.getItem(V.KEY);
    const want = stripVolatile(foldTransit(JSON.parse(written)));
    buildVillage(POOR);                       // the poison
    localStorage.setItem(V.KEY, written); reload(); V.save();
    const got = stripVolatile(foldTransit(JSON.parse(localStorage.getItem(V.KEY))));
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
      const bad = stripVolatile(foldTransit(JSON.parse(localStorage.getItem(V.KEY))));
      detects[field] = saveDiff(want, bad).length > 0;
    }
    /* And the backup is never replaced by something that will not load.

       The backup is the whole answer to a browser killed mid-write, and save()
       promoted whatever byte string happened to be in the primary without
       reading it -- so the one string it must never take was exactly the one
       the mechanism exists for. Worse after a restart than during one: saveN
       begins at nought, so the FIRST autosave after the crash promotes the
       truncated primary over the backup that had just rescued the village.

       Five ways of being unloadable, because "unloadable" is not only
       truncation: a save stamped with a later version and one with no
       buildings in it both parse perfectly and neither is a village. Run
       across more than two promotion cycles, because a promotion happens once
       in BACKUP_EVERY saves and a check that never reaches one proves nothing
       -- which is why a good primary is run through the same loop and has to
       be promoted at least twice. */
    const bakFails = [];
    {
      const realBak = (() => { try { return localStorage.getItem(V.KEY_BAK); } catch (e) { return null; } })();
      buildVillage(RICH);
      V.save();
      const good = localStorage.getItem(V.KEY);
      var spoilNames = {};
      const spoil = {
        'cut off mid-write': good.slice(0, Math.floor(good.length * 0.6)),
        'empty': '',
        'not json at all': 'village',
        'stamped with a later version': JSON.stringify({ ...JSON.parse(good), v: 99 }),
        'carrying no buildings': JSON.stringify({ ...JSON.parse(good), placed: 'none' }),
      };
      spoilNames = spoil;
      const rounds = V.BACKUP_EVERY * 2 + 2;
      for (const [how, bad] of Object.entries(spoil)) {
        localStorage.setItem(V.KEY, good);
        localStorage.setItem(V.KEY_BAK, good);
        for (let i = 0; i < rounds; i++) {
          localStorage.setItem(V.KEY, bad);          // the primary is mid-write garbage
          V.save();                                  // one ordinary autosave tick
          const bak = localStorage.getItem(V.KEY_BAK);
          if (bak === bad || !V.usableSave(V.readSave(bak))) {
            bakFails.push('a primary ' + how + ' was promoted over the backup');
            break;
          }
        }
      }
      localStorage.setItem(V.KEY, good);
      localStorage.setItem(V.KEY_BAK, 'nothing');
      let promoted = 0, last = 'nothing';
      for (let i = 0; i < rounds; i++) {
        V.res.wood += 1; V.save();
        const bak = localStorage.getItem(V.KEY_BAK);
        if (bak !== last) { last = bak; promoted++; }
      }
      if (promoted < 2) bakFails.push('a good primary was promoted only ' + promoted
        + ' time(s) in ' + rounds + ' saves, so no backup is being kept at all');
      else if (!V.usableSave(V.readSave(localStorage.getItem(V.KEY_BAK))))
        bakFails.push('the backup left after a run of good saves will not load');
      /* And the lag is the minute the note beside it promises -- "falling back
         to it costs a minute rather than everything". Timed in simulated
         seconds against the clock rather than counted in saves, because the
         loop above counts in BACKUP_EVERY and so cannot see BACKUP_EVERY move:
         set it to a thousand and the backup would lag an hour and a half while
         every line above still passed. */
      {
        localStorage.setItem(V.KEY, good);
        localStorage.setItem(V.KEY_BAK, 'nothing');
        let t = 0, lag = null;
        for (let i = 0; i < 400 * 30 && lag === null; i++) {
          V.step(1 / 30); t += 1 / 30;
          if (localStorage.getItem(V.KEY_BAK) !== 'nothing') lag = t;
        }
        if (lag === null) bakFails.push('the backup was not written once in ' + Math.round(t) + ' seconds of play');
        else if (lag > 180) bakFails.push('the backup lags ' + Math.round(lag)
          + ' seconds of play, where the note beside it promises about a minute');
      }
      try { if (realBak !== null) localStorage.setItem(V.KEY_BAK, realBak); else localStorage.removeItem(V.KEY_BAK); } catch (e) {}
    }

    try { if (real !== null) localStorage.setItem(V.KEY, real); } catch (e) {}
    const blind = Object.entries(detects).filter(([, ok]) => !ok).map(([k]) => k);
    /* Reported where allSweeps can see it. It counts r.fails, and nothing
       else this sweep returns -- so a round where the field check had gone
       blind, or the backup was being eaten, came back as a clean battery. */
    const fails = bakFails.slice();
    /* Except land, and that is the repair working rather than the check going
       blind: coverPlaced widens the claim until it covers what is built, so a
       village built out to its border comes back on the same ring with the
       field gone. Measured both ways -- built out, tier 4 saved and tier 4
       after; a village that had claimed the island and built one house, tier 4
       saved and tier 0 after. So the field is invisible to the diff exactly
       when losing it costs nothing, and naming it here rather than in the
       failures is the difference between a known answer and an unasked
       question. */
    const REPAIRED = new Set(['land']);
    const reallyBlind = blind.filter(k => !REPAIRED.has(k));
    if (reallyBlind.length) fails.push('the field check no longer notices a missing ' + reallyBlind.join(', '));
    for (const k of REPAIRED) if (!blind.includes(k))
      fails.push('a missing ' + k + ' is no longer repaired on load, and nothing else puts it back');
    return { diffs: diffs.length, worst: diffs.slice(0, 8), fieldsChecked: Object.keys(detects).length,
      blindTo: blind, backupCases: Object.keys(spoilNames).length + 1, fails };
  };
  /* A save's timestamp is where the SIMULATION got to, not when the file was
     written. The two part company the moment the page is hidden, because the
     tick is throttled and the village then simulates a fraction of the time
     that passes -- and on Android the hidden page is usually the one that gets
     killed, so that stale stamp is what the next start reads.

     Checked as the player feels it: how much time a cold start right now would
     credit, against how much the village genuinely did not work. */
  window.hiddenSweep = function () {
    const V = window.__v, fails = [];
    const real = localStorage.getItem(V.KEY);
    const keepAt = V.hiddenAt, keepSim = V.hiddenSim;
    // read outside the try, because the summary is returned after the finally
    let cards = 0, banked = 0, spilt = 0, gave = 0;
    const cases = [
      ['watched all along',            0,        0,    0],
      ['a minute backgrounded',        60,       30,   30],
      ['an hour at a tenth speed',     3600,     360,  3240],
      ['a night on the home screen',   8 * 3600, 2880, 8 * 3600 - 2880],
      ['a clock that stepped back',    100,      500,  0],   // never mint time
    ];
    try {
      for (const [name, hid, sim, owed] of cases) {
        const now = Date.now();
        V.hiddenAt = hid ? now - hid * 1000 : 0;
        V.hiddenSim = sim;
        V.save();
        const t = JSON.parse(localStorage.getItem(V.KEY)).t;
        const credit = (Date.now() - t) / 1000;
        if (!(credit >= -0.5)) fails.push(name + ': the save is stamped ' + (-credit).toFixed(1) + 's in the future');
        else if (Math.abs(credit - owed) > 1)
          fails.push(name + ': a cold start would credit ' + credit.toFixed(1) + 's, owed ' + owed + 's');
      }
      /* And a hidden page always has an away clock running, whether it was
         hidden by the handler, by starting that way, or by anything that
         cleared the clock while nobody was watching. */
      V.hiddenAt = 0; V.hiddenSim = 0; V.step(0.001);
      if (document.hidden && !V.hiddenAt) fails.push('the page is hidden and nothing is counting the time away');

      /* And the village LIVES through the time it is credited for. Knowing how
         many seconds are owed is only half of it: the builders are part of the
         village too, and they were the one trade that stopped. A three second
         house went into twelve hours of absence at a third built and came out
         at a third built, on a village paid 800 food for the same stretch.

         The ceiling is checked with it, because the order matters: a storehouse
         that finished while nobody was watching has to raise the ceiling BEFORE
         the haul is clamped to it, or the village comes back to a night's work
         cut off at the old limit. Started at the ceiling exactly, so anything
         above it can only have come from the storehouse finishing first. */
      {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
        V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null;
        V.ensureHall(); V.placed[0].lvl = 4; V.placed[0].t = 1;
        V.res.wood = 1e5; V.res.food = 1e5;
        const LB = V.landBounds();
        for (const [key, dc, dr] of [['house', 1, 1], ['farm', 4, 1], ['lumber', 7, 1], ['store', 1, 10]])
          V.place(key, LB.lo + dc, LB.lo + dr);
        for (const q of V.placed) { q.t = 1; q.build = 0; }
        V.placed.find(q => q.key === 'house').lvl = 3;             // hands enough to work both posts
        V.rebuildStores();
        for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
        /* One of each kind of unfinished work: a building going up for the
           first time, and a building being improved. */
        V.res.wood = 1e5; V.res.food = 1e5;
        V.place('house', LB.lo + 4, LB.lo + 10);
        const fresh = V.placed[V.placed.length - 1];
        V.place('store', LB.lo + 10, LB.lo + 10);
        const shed = V.placed[V.placed.length - 1];
        const farm = V.placed.find(q => q.key === 'farm');
        V.upgradeBuilding(farm);
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        const ceiling = { wood: V.caps.wood, food: V.caps.food };
        V.res.wood = ceiling.wood; V.res.food = ceiling.food;      // nothing more fits as things stand
        const gone = 12 * 3600;
        const started = V.placed.filter(q => q.t < 1).map(q => q.key + ' (' + (q.build || 3) + 's)');
        if (started.length < 3) fails.push('the away check set up only ' + started.length + ' unfinished buildings, so it proves nothing');
        V.grantAway(gone); V.away = null;
        const stuck = V.placed.filter(q => q.t < 1);
        for (const q of stuck)
          fails.push('a ' + q.key + ' needing ' + (q.build || 3) + 's was still unbuilt after ' + (gone / 3600) + ' hours away');
        if (!stuck.length && !(V.res.wood > ceiling.wood || V.res.food > ceiling.food))
          fails.push('a storehouse finished while away but the haul was still clamped to the old ceiling of '
            + ceiling.wood + '/' + ceiling.food);
        void shed; void fresh;
      }
    /* And the card a returning player reads says what actually happened.

       It is the first screen of a session and it carries five separate claims
       -- how long the village worked, what it banked, whether the stores
       overflowed, when they filled, and what a finished village gave away --
       and only the first of them was ever held to anything. The sweep above
       bounds the resources; nothing compared the CARD against the grant that
       raised it. Three of the faults already written into the comments around
       grantAway were card faults.

       Everything is measured against the village itself rather than against
       the card's own arithmetic: what res really gained, what sharedTotal
       really gained, and whether the span asked for was over the ceiling. */
    {
      const put = k => { const L = V.landBounds();
        for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        return false; };
      const scene = (finished, fill) => {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
        V.goalIdx = finished ? V.GOALS.length : 0; V.tutSeen.length = 0;
        V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
        V.sharedTotal.wood = 0; V.sharedTotal.food = 0;
        V.ensureHall(); V.placed[0].lvl = 5;
        V.res.wood = 1e6; V.res.food = 1e6;
        for (const k of ['house', 'house', 'house', 'farm', 'lumber', 'store', 'mill']) put(k);
        for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
        V.res.wood = 1e6; V.res.food = 1e6;
        for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);     // and the levels land through a real finish
        for (const k of ['wood', 'food']) V.res[k] = Math.floor(V.caps[k] * fill);
      };
      for (const [name, finished, fill, secs] of [
        ['an hour away with room to spare', false, 0.2, 3600],
        ['an hour away with the stores nearly full', false, 0.97, 3600],
        ['away longer than a village can bank', false, 0.2, 40 * 3600],
        ['back inside the minute', false, 0.5, 45],
        ['a finished village, an hour away', true, 0.9, 3600],
      ]) {
        scene(finished, fill);
        const before = { wood: V.res.wood, food: V.res.food };
        const sharedBefore = { wood: V.sharedTotal.wood, food: V.sharedTotal.food };
        V.away = null;
        V.grantAway(secs);
        const card = V.away;
        const got = { wood: V.res.wood - before.wood, food: V.res.food - before.food };
        const shared = { wood: V.sharedTotal.wood - sharedBefore.wood, food: V.sharedTotal.food - sharedBefore.food };
        const anyGot = got.wood + got.food > 0.01;
        if (secs < V.AWAY_MIN) {
          /* Under the floor a reload is not a reward, and there is no card to
             read either. */
          if (card) fails.push('a card went up for ' + name);
          if (anyGot) fails.push('the village was paid for ' + name);
          continue;
        }
        if (!card) { fails.push('no card went up after ' + name); continue; }
        cards++;
        if (anyGot) banked++;
        if (card.spilled) spilt++;
        /* The span. Over the ceiling it is clamped and SAYS it was clamped;
           under it, it is what was asked for. */
        const want = Math.min(V.AWAY_MAX, secs);
        if (card.secs !== want)
          fails.push('the card for ' + name + ' says the village worked ' + card.secs + 's and it was credited ' + want + 's');
        if (card.capped !== (secs > V.AWAY_MAX))
          fails.push('the card for ' + name + (card.capped ? ' says' : ' does not say') + ' the village worked as long as it can');
        /* What it banked. The card floors each figure, so it may understate by
           less than one and never by more, and never overstate at all. */
        for (const k of ['wood', 'food']) {
          const said = (card.got || {})[k] || 0;
          if (said > got[k] + 0.001 || said < got[k] - 1)
            fails.push('the card for ' + name + ' says it banked ' + said + ' ' + k + ' and the village gained ' + got[k].toFixed(2));
        }
        /* What it gave away, and only a finished village gives anything. */
        if (!finished && card.shared)
          fails.push('an unfinished village was told it shared goods with its neighbours');
        /* And the tally behind the card does not move either. The card hides
           it for an unfinished village -- shared is written as null there -- so
           watching only the card let the overflow reach sharedTotal all the
           same, which is the half the rule is actually about: it does not reach
           back into the game before the village is finished. */
        if (!finished && shared.wood + shared.food > 0.001)
          fails.push('an unfinished village added ' + (shared.wood + shared.food).toFixed(1)
            + ' to the tally of what it has given away');
        if (finished) {
          for (const k of ['wood', 'food']) {
            const said = (card.shared || {})[k] || 0;
            if (said > shared[k] + 0.001 || said < shared[k] - 1)
              fails.push('the card for ' + name + ' says it shared ' + said + ' ' + k + ' and the tally rose by ' + shared[k].toFixed(2));
          }
          if (shared.wood + shared.food > 1) gave++;
        }
        /* And it only claims an overflow when there was one. */
        if (!card.spilled && fill > 0.9 && secs >= 3600)
          fails.push('an hour into nearly full stores spilled nothing, by the card');
        if (card.fullAfter != null && (card.fullAfter < 0 || card.fullAfter > card.secs))
          fails.push('the card for ' + name + ' says the stores filled after ' + card.fullAfter.toFixed(1)
            + 's of a ' + card.secs + 's stretch');
      }
      /* "Anything under a minute is ignored so a reload is not a reward."
         Said here in seconds rather than through AWAY_MIN, because the branch
         above reads AWAY_MIN and so cannot see it move: drop the floor to ten
         and a forty-five second case simply becomes a paying one, which that
         branch is perfectly happy with. A reload is a few seconds. */
      {
        scene(false, 0.2);
        const before = { wood: V.res.wood, food: V.res.food };
        V.away = null;
        V.grantAway(5);
        if (V.away) fails.push('shutting the game and opening it again put a welcome-back card up');
        if (V.res.wood - before.wood + (V.res.food - before.food) > 0.01)
          fails.push('shutting the game and opening it again paid the village '
            + ((V.res.wood - before.wood) + (V.res.food - before.food)).toFixed(1));
      }
      if (cards < 4) fails.push('only ' + cards + ' welcome-back cards were read, so the block proved little');
      if (!banked) fails.push('not one card banked anything, so the figures prove nothing');
      if (!spilt) fails.push('not one card overflowed, so the overflow half proves nothing');
      if (!gave) fails.push('no finished village gave anything away, so the sharing half proves nothing');
      V.away = null; V.goalIdx = 0;
    }
    } finally {
      V.hiddenAt = keepAt; V.hiddenSim = keepSim;
      try { if (real !== null) localStorage.setItem(V.KEY, real); } catch (e) {}
    }
    return { cases: cases.length, cards, hiddenNow: document.hidden, fails };
  };
  /* Nothing is painted while nobody is watching, and painting resumes the
     moment somebody is. Counted on the canvas context itself, so it measures
     what the tick really asks the GPU for rather than what the code looks
     like it does. */
  window.paintSweep = function () {
    const V = window.__v, ctx = document.querySelector('canvas').getContext('2d');
    const names = ['fillRect', 'drawImage', 'fillText', 'stroke', 'fill', 'clearRect', 'strokeText'];
    const orig = {}; let ops = 0;
    for (const k of names) { orig[k] = ctx[k]; ctx[k] = function (...a) { ops++; return orig[k].apply(this, a); }; }
    const say = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    const keepAt = V.hiddenAt, keepSim = V.hiddenSim;
    const fails = []; let blind = -1, seen = -1;
    try {
      say(true);  ops = 0; V.tick(); blind = ops;
      say(false); ops = 0; V.tick(); seen = ops;
      if (blind > 0) fails.push('a hidden page painted ' + blind + ' times in one tick');
      if (seen < 10) fails.push('a visible page painted only ' + seen + ' times in one tick');
    } finally {
      delete document.hidden;                       // back to the real accessor
      for (const k of names) ctx[k] = orig[k];
      V.hiddenAt = keepAt; V.hiddenSim = keepSim;   // the fake hiding started an away clock
    }
    return { hidden: blind, visible: seen, fails };
  };
  /* And nothing is SOUNDED while nobody is listening. Worse than wasted: the
     context is suspended while the page is hidden, a suspended context stops
     its clock, and so every tone the working village makes is scheduled for
     the same frozen instant and fires in one clipped bang on the first touch
     after coming back. */
  window.soundSweep = function () {
    const V = window.__v, fails = [];
    V.audioOn();
    const actx = V.actx;
    if (!actx) return { skipped: 'this browser gave no audio context', fails };
    const keepMute = V.muted; V.muted = false;
    const co = actx.createOscillator.bind(actx);
    let made = 0, quiet = -1, loud = -1;
    actx.createOscillator = () => { made++; return co(); };
    const say = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    const ring = () => { V.SFX.tap(); V.SFX.place(); V.SFX.deny(); V.SFX.upgrade(); V.SFX.done(); };
    try {
      say(true);  made = 0; ring(); quiet = made;
      say(false); made = 0; ring(); loud = made;
      if (quiet > 0) fails.push('a hidden page queued ' + quiet + ' sounds nobody can hear');
      if (loud < 5) fails.push('a visible page made only ' + loud + ' sounds of the nine it should');
    } finally {
      delete document.hidden;
      actx.createOscillator = co; V.muted = keepMute;
    }
    return { hidden: quiet, visible: loud, fails };
  };
  /* Every figure the game prints carries a unit, and the unit has to belong to
     the figure as ROUNDED, not as calculated. Checked as rules rather than as
     a table of expected strings, over every second a welcome-back card can
     name and twelve decades of resource: a table only ever knows the cases
     somebody thought of. */
  window.unitSweep = function () {
    const V = window.__v, bad = new Map();
    const note = (why, eg) => { if (!bad.has(why)) bad.set(why, eg); };
    for (let s = 0; s <= V.AWAY_MAX; s++) {
      const t = V.duration(s);
      if (t === 'moments') { if (s >= 60) note('moments, past a minute', s + 's -> ' + t); continue; }
      const m = /^(\d+(?:\.\d+)?) (minute|minutes|hour|hours)$/.exec(t);
      if (!m) { note('not a figure and a unit', s + 's -> "' + t + '"'); continue; }
      const n = +m[1], unit = m[2], isMin = unit.indexOf('minute') === 0;
      if (isMin && n >= 60) note('sixty minutes is an hour', s + 's -> "' + t + '"');
      if (!isMin && n < 1) note('under an hour, said in hours', s + 's -> "' + t + '"');
      // minutes round to the minute, hours to a tenth of one: half a step either way
      const err = Math.abs((isMin ? n * 60 : n * 3600) - s);
      if (err > (isMin ? 30 : 180) + 0.01) note('the figure is wrong', s + 's -> "' + t + '" (' + err.toFixed(0) + 's out)');
      if (/s$/.test(unit) !== (n !== 1)) note('plural disagrees with the figure', s + 's -> "' + t + '"');
    }
    const MUL = { '': 1, k: 1e3, M: 1e6, B: 1e9, T: 1e12, Q: 1e15 };
    /* Twelve decades geometrically, PLUS a dense band either side of every
       boundary between units. The rounding mistakes all live within a tenth of
       a per cent of a boundary -- "999999" printed as "1000k" -- and a
       geometric walk steps straight over them. */
    const amounts = [];
    for (let i = 0; i <= 4000; i++) amounts.push(Math.round(Math.pow(10, i / 4000 * 12)));
    for (const mul of [1e3, 1e6, 1e9, 1e12]) for (let k = -1000; k <= 1000; k++)
      amounts.push(Math.max(0, Math.round(mul * (1 + k / 1e6))));
    for (const v of amounts) {
      const t = V.compact(v), m = /^(\d+(?:\.\d+)?)([kMBTQ]?)$/.exec(t);
      if (!m) { note('not a figure and a unit', v + ' -> "' + t + '"'); continue; }
      const mant = +m[1];
      if (mant >= 1000) note('the figure outgrew its unit', v + ' -> "' + t + '"');
      const rel = Math.abs(mant * MUL[m[2]] - v) / Math.max(1, v);
      if (rel > 0.06) note('the figure is wrong', v + ' -> "' + t + '" (' + (rel * 100).toFixed(1) + '% out)');
    }

    /* The numbers the source says out loud about its own economy.

       They are written into the comments as the reason a constant is what it
       is, and two of them had quietly stopped being true -- the house ladder
       said 295 and 620 after UP_STEP and UP_GROWTH had moved it to 290 and
       610, and the maxed job count said 67 after the hall's woodpile and the
       market began growing with their level. A comment that is wrong about
       the code is worse than no comment: it is the record of why, and it gets
       believed. So the claims are asserted here, where they fail loudly.

       Only the ones that are cheap and exact. The market being a third of all
       wood at a full village is true -- 35.7% measured, production plus the
       trade its stalls enable -- but it costs a thirty minute simulation and
       a player who fills every offer, so it stays a note rather than a check. */
    {
      const houseLadder = [1, 2, 3, 4].map(l => V.upCostOf({ key: 'house', lvl: l }).wood);
      const want = [65, 140, 290, 610];
      if (houseLadder.join(',') !== want.join(','))
        note('the house upgrade ladder is not what the source says',
          houseLadder.join('/') + ' against ' + want.join('/'));
      /* And what a level is WORTH, which is a figure in a comment with
         nothing holding it: "level 5 is 2.4x level 1". outMul is named
         nowhere else in this file, so moving the 0.35 beside it changes every
         rate in the game and no sweep says a word -- they all quote figures
         worked out through it. */
      const worth = +(V.outMul(V.LVL_MAX) / V.outMul(1)).toFixed(4);
      if (Math.abs(worth - 2.4) > 0.0005)
        note('a level is not worth what the source says',
          'level ' + V.LVL_MAX + ' is ' + worth + 'x level 1, against 2.4x');

      const allow = V.HALL[V.HALL.length - 1].allow;
      let jobs = V.jobsOf({ key: 'hall', lvl: V.HALL.length - 1, t: 1 }), pop = 0, tiles = 4;
      for (const [k, n] of Object.entries(allow)) {
        const b2 = V.B(k); if (!b2) continue;
        if (b2.jobs) jobs += n * V.jobsOf({ key: k, lvl: V.LVL_MAX, t: 1 });
        if (b2.pop) pop += n * V.popOf({ key: k, lvl: V.LVL_MAX, t: 1 });
        tiles += n * b2.w * b2.h;
      }
      if (pop !== 72 || jobs !== 69)
        note('a maxed village is not the size the source says', pop + ' villagers and ' + jobs + ' jobs, against 72 and 69');
      /* And the point those two numbers exist to make: the ceiling sits above
         what a full village asks for, so no house is ever wasted. */
      if (pop > V.VILLAGER_MAX) note('a maxed village wants more villagers than the game allows', pop + ' > ' + V.VILLAGER_MAX);
      if (jobs > pop) note('a maxed village has more posts than people, so a house can never fill them', jobs + ' > ' + pop);
      /* 38 buildings in 104 tiles -- the allowance plus the hall, which is what
         makes them fit the fourth ring. Both counts have to include the hall or
         neither: the source said 37 in 104, counting the hall's four tiles but
         not the hall, and this check is what caught it. */
      const count = 1 + Object.values(allow).reduce((x, y) => x + y, 0);
      if (count !== 38 || tiles !== 104)
        note('the hall-five allowance is not the footprint the source says', count + ' buildings in ' + tiles + ' tiles, against 38 in 104');
    }

    return { seconds: V.AWAY_MAX + 1, amounts: amounts.length, fails: [...bad].map(([w, eg]) => w + ': ' + eg) };
  };
  /* The yardstick a placement is judged against has to be a placement that can
     exist. reachOf divides what a workplace delivers by what it would deliver
     "beside a store", the panel offers that figure as the reward for moving it,
     and both are worthless if no spot on the island reaches it.

     Found here by brute force -- every legal offset of a storehouse around the
     workplace, using only travelSecondsOf and reachOf -- so the checker never
     asks the game to confirm its own arithmetic. */
  window.reachSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.ensureHall();
    V.landTier = V.LAND_MAX; V.coverPlaced();
    const LB = V.landBounds(), LO = LB.lo, HI = LB.hi;
    V.placed[0].c = HI - 1; V.placed[0].r = HI - 1;          // the hall counts as a store: park it away
    const sb = V.B('store');
    const store = { id: 91001, key: 'store', c: LO, r: LO, t: 1, lvl: 1, stock: 0, build: 3 };
    V.placed.push(store);
    const checked = [];
    for (const bk of V.BUILDINGS) {
      if (!bk.makes || !bk.jobs || bk.key === 'hall' || bk.caps) continue;
      for (const lvl of [1, V.LVL_MAX]) {
        const work = { id: 91002, key: bk.key, c: LO + 4, r: LO + 4, t: 1, lvl, stock: 0, build: 3 };
        V.placed.push(work);
        let best = 0, at = null, walk = 0;
        for (let dc = -sb.w - 1; dc <= bk.w + 1; dc++) for (let dr = -sb.h - 1; dr <= bk.h + 1; dr++) {
          if (dc < bk.w && dc + sb.w > 0 && dr < bk.h && dr + sb.h > 0) continue;   // overlapping
          store.c = work.c + dc; store.r = work.r + dr;
          V.rebuildStores();
          /* The RAW ratio, not reachOf: reachOf clamps to 1, so a yardstick
             that is too easy to hit reads as a perfect score and the checker
             sees nothing. reachOf is checked against it separately. */
          const ideal = V.bestDeliveredOf(work);
          const rr = ideal > 0 ? V.deliveredOf(work) / ideal : 0;
          if (Math.abs(Math.max(0, Math.min(1, rr)) - V.reachOf(work)) > 1e-9)
            fails.push(bk.key + ': reachOf disagrees with delivered over best');
          if (rr > best) { best = rr; at = [dc, dr]; walk = V.travelSecondsOf(work); }
        }
        V.placed.pop();
        checked.push({ key: bk.key, lvl, best: +best.toFixed(4), at, walk: +walk.toFixed(3) });
        if (best < 0.999) fails.push(bk.key + ' lvl ' + lvl + ': the best spot on the island reaches only '
          + (best * 100).toFixed(1) + '% of what the panel offers for moving there');
        if (best > 1.001) fails.push(bk.key + ' lvl ' + lvl + ': a real spot beats the yardstick by '
          + ((best - 1) * 100).toFixed(1) + '%');
      }
    }
    V.placed.length = 0; V.ensureHall(); V.rebuildStores();
    return { checked, fails };
  };
  /* An upgrade gives the village nothing until the scaffolding comes down.
     The complement of the older invariant that an upgrade never TAKES anything
     away: between them, nothing about what the village is given may change
     between paying for an upgrade and the work finishing.

     "Given" is read back through the game's own answers -- capacities, what the
     hall allows, what the tray offers, who lives in the houses, what the wells
     boost -- so the check does not depend on knowing which of them an upgrade
     was meant to touch.

     deliveredOf is deliberately NOT in that list. It is what a workplace would
     hand over per pair of hands, a capability rather than a gift, and a
     building under scaffolding hands over nothing at all whatever its level
     says. That is checked directly instead, on the stock it accrues. */
  window.scaffoldSweep = function () {
    const V = window.__v, fails = [];
    const count = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    const held = {};                     // what holding a hand in the scaffolding costs
    const give = () => ({
      caps: V.caps.wood + '/' + V.caps.food,
      allow: V.BUILDINGS.map(b => b.key + ':' + V.allowedOf(b.key)).join(' '),
      tray: V.barList().map(b => b.key).join(','),
      lives: V.placed.map(p => V.livedIn(p)).join(','),
      boost: V.placed.map(p => +V.boostAt(p).toFixed(6)).join(','),
    });
    const diff = (x, y) => Object.keys(x).filter(k => x[k] !== y[k]);
    /* houseLvl is the whole workforce: the first block wants the village as it
       comes, the second wants more hands than one post can take, so that a
       scaffolded building can be seen pulling them over.

       workLvl grows the workplaces with it, for the block that needs an upgrade
       to be worth something: at level one a shed's whole output is under a load
       a minute, which no rate measured over two minutes can separate from
       nothing, and the step it is on opens no extra post. The hall goes to five
       with them, or every upgrade is refused by the gate that keeps a building
       from passing the hall.

       houses is the surplus. One house at its best is six villagers against ten
       posts, so every hand has a working post to go to and nothing stands in
       the scaffolding at all -- which is the right behaviour, and leaves the
       reported-rate block and the well block below with nothing to look at. The
       workforce block wants the opposite and asks for one house. Three overfill
       the village,
       and the hands with nowhere better to be are the ones the game puts in the
       scaffolding on purpose. */
    const scene = (houseLvl, workLvl, houses = 1) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.goalIdx = 0; V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null;
      V.ensureHall(); V.placed[0].lvl = workLvl ? 5 : 4; V.placed[0].t = 1;
      V.res.wood = 1e5; V.res.food = 1e5;
      const LB = V.landBounds();
      let c = LB.lo + 1, r = LB.lo + 1;
      const order = ['house', 'farm', 'lumber', 'store', 'well', 'mill', 'market'];
      for (let h = 1; h < houses; h++) order.push('house');
      for (const key of order) {
        if (!V.place(key, c, r)) { c += 3; if (c > LB.hi - 3) { c = LB.lo + 1; r += 3; } V.place(key, c, r); }
        c += 3; if (c > LB.hi - 3) { c = LB.lo + 1; r += 3; }
      }
      for (const q of V.placed) if (q.key === 'house') q.lvl = houseLvl;
      if (workLvl) for (const q of V.placed) if (q.key !== 'hall' && q.key !== 'house') {
        q.lvl = workLvl; q.t = 1; q.build = 0;
      }
      V.rebuildStores();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);     // everything finishes and settles
    };
    scene(1);
    let upgrades = 0, changed = 0, produced = 0;
    for (const p of [...V.placed]) {
      if (V.isDecor(p.key)) continue;
      V.res.wood = 1e5; V.res.food = 1e5;
      for (let i = 0; i < 30; i++) V.step(1 / 30);
      const before = give();
      if (!V.canUpgrade(p)) continue;
      V.upgradeBuilding(p);
      upgrades++;
      let d = diff(before, give());
      if (d.length) fails.push(p.key + ' handed the village ' + d.join(' and ') + ' the instant its upgrade was paid for');
      /* And a workplace under scaffolding makes nothing. Its stock is emptied
         first, so anything that appears was made while the work was going on. */
      const makes = !!(V.B(p.key).makes && V.B(p.key).jobs);
      if (makes) p.stock = 0;
      /* One frame at a time, and only asked while the scaffolding is genuinely
         still up: the frame that finishes the work also applies everything the
         upgrade gives, so a coarser loop compares the finished building against
         the state before it started and reports every upgrade as broken. */
      let grew = 0, guard = 0;
      while (p.t < 1 && guard++ < 60 * 30) {
        V.step(1 / 30);
        if (p.t >= 1) break;
        if (makes && p.stock > grew) grew = p.stock;
        d = diff(before, give());
        if (d.length) { fails.push(p.key + ' handed the village ' + d.join(' and ') + ' while it was still scaffolded'); break; }
      }
      if (grew > 0.0001) fails.push(p.key + ' made ' + grew.toFixed(2) + ' while the scaffolding was up');
      if (makes) produced++;
      for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
      if (diff(before, give()).length) changed++;
    }
    /* And it must give something in the end, or "nothing changed" would be a
       pass for a game whose upgrades did nothing at all. */
    if (upgrades && !changed) fails.push('not one of the ' + upgrades + ' upgrades changed anything once finished');

    /* And the rate the game REPORTS while the scaffolding is up is the rate the
       village is really delivering.

       The chips quote expectedRate whenever the measured window is too sparse to
       trust, which is exactly the small village where one upgrade is most of the
       economy. A ten second scaffold is far too short to measure a rate against
       -- wood arrives eight at a time -- so the work is held up instead, and the
       comparison is the plain one the pacing sweep uses: stock gained over two
       minutes with the stores kept half empty so nothing is refused.

       Taken to level three, because that is the step that opens another post:
       the interesting failure is not just a higher rate quoted early, it is the
       workforce walking onto a building that makes nothing and every arriving
       hand being counted. */
    let measured = 0, staffed = 0;
    for (const key of ['farm', 'lumber', 'mill', 'market']) {
      scene(5, undefined, 3);
      const p = V.placed.find(q => q.key === key);
      if (!p) continue;
      p.lvl = 2; V.rebuildStores();
      for (let i = 0; i < 30 * 30; i++) V.step(1 / 30);
      V.res.wood = 1e5; V.res.food = 1e5;
      if (!V.canUpgrade(p)) continue;
      V.upgradeBuilding(p);
      p.build = 1e7;                     // the scaffolding stays up to be measured against
      V.goalIdx = V.GOALS.length;        // no reward may arrive and be counted as production
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half(); for (let i = 0; i < 20 * 30; i++) V.step(1 / 30); half();
      const secs = 120, got = { wood: 0, food: 0 }, rep = { wood: 0, food: 0 };
      for (let s2 = 0; s2 < secs; s2++) {
        const was = { wood: V.res.wood, food: V.res.food }, e = V.expectedRate();
        for (const k of ['wood', 'food']) rep[k] += e[k];
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        for (const k of ['wood', 'food']) got[k] += V.res[k] - was[k];
        half();
      }
      if (p.t >= 1) { fails.push('the ' + key + ' finished building while it was meant to be held under scaffolding'); continue; }
      measured++;
      if (V.workersAt(p.id)) staffed++;
      /* And the sell button quotes this same figure, from the same place, to a
         player one tap from losing the building. Armed on a scaffolded workplace
         it read "Selling it stops 0.70/s arriving" with 0.00/s arriving -- and
         at a level the building had not reached yet. Asked here rather than in
         the workforce block below because the row needs somebody at the post to
         say anything at all, and the whole point of that block is that nobody
         is. */
      if (V.workersAt(p.id)) {
        const row = V.saleCost(p);
        const quoted = row && row.match(new RegExp('([0-9.]+)/s arriving'));
        if (quoted && +quoted[1] > 0.005)
          fails.push('the sell button says a scaffolded ' + key + ' stops ' + quoted[1]
            + '/s arriving, and nothing is arriving from it');
      }
      for (const k of ['wood', 'food']) {
        const real = got[k] / secs, want = rep[k] / secs;
        /* Goods arrive a whole load at a time, so a window this long cannot
           resolve a rate finer than one load across it -- 8/120 is 0.067/s,
           which at the slow wood rates here is a fifth of the figure. A share
           alone therefore reported a market at 0.40 against 0.33, one load's
           difference, about once in five runs while four runs in a row were
           clean. A checker whose answer depends on when you ran it is not a
           checker, and the original fault was ten times this wide, so nothing
           is given up by saying what the measurement can actually see. */
        if (Math.abs(real - want) > Math.max(0.15 * Math.max(real, want), V.CARRY / secs))
          fails.push('with the ' + key + ' under scaffolding the reported ' + k + ' rate is not what arrives: '
            + want.toFixed(2) + '/s reported, ' + real.toFixed(2) + '/s delivered');
      }
    }
    /* Nothing was proved by a run where the scaffolded building had nobody on
       it: an empty post contributes nothing either way. */
    if (!staffed) fails.push('not one of the ' + measured + ' scaffolded workplaces had anybody working it');

    /* And charm adds nothing to a village that is delivering nothing.

       The charm figure is a difference of two sums over the workplaces, and
       the sums counted anything ESTABLISHED -- which a building being upgraded
       is, though it makes nothing until the scaffolding comes down. So charm
       was credited with a share of goods that never arrived. Measured over 900
       simulated seconds with one of two workplaces held scaffolded: +0.0798/s
       claimed against a real 0.0533/s, charm on minus charm off.

       Put as a hard zero rather than as a tolerance, because it can be: with
       EVERY workplace under scaffolding -- the hall's woodpile too, which is
       the one that catches a village with nothing else left -- the village
       delivers nothing at all, so charm's share of it is exactly nothing. The
       delivering-nothing half is measured rather than assumed, or the zero
       would be a pass for a checker that set nothing up. */
    {
      scene(3);
      const LB2 = V.landBounds();
      V.res.wood = 1e5; V.res.food = 1e5;
      for (let i = 0; i < 8; i++) V.place('statue', LB2.lo + 3 + i, LB2.lo + 12);
      for (const q of V.placed) if (q.key === 'statue') { q.t = 1; q.build = 0; }
      V.rebuildStores();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
      const charm = V.charmTotal();
      let pinned = 0;
      for (const q of [...V.placed]) {
        if (!(V.B(q.key).makes && V.B(q.key).jobs)) continue;
        V.res.wood = 1e5; V.res.food = 1e5;
        if (!V.canUpgrade(q)) continue;
        V.upgradeBuilding(q); q.build = 1e7; pinned++;
      }
      V.goalIdx = V.GOALS.length;
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half(); for (let i = 0; i < 10 * 30; i++) V.step(1 / 30); half();
      let arrived = 0;
      for (let s2 = 0; s2 < 60; s2++) {
        const was = V.res.wood + V.res.food;
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        arrived += (V.res.wood + V.res.food) - was; half();
      }
      const said = V.charmDelivered();
      if (!charm) fails.push('the charm check placed no decorations, so it proves nothing');
      else if (!pinned) fails.push('the charm check scaffolded no workplaces, so it proves nothing');
      else if (arrived > 0.01) fails.push('the charm check meant to stop the village and ' + arrived.toFixed(2)
        + ' still arrived over a minute, so its zero proves nothing');
      else if (said > 1e-9) fails.push('every workplace was under scaffolding and nothing arrived, yet charm claimed +'
        + said.toFixed(4) + '/s');
    }

    /* And a well is sold on the same arithmetic, from a spot the player is
       choosing blind: the number over the ghost is the whole basis of the
       decision, and the well's own panel repeats it ever after. It counted a
       workplace standing in scaffolding, which has nothing to speed up.

       Set up so a well certainly lands in reach of one: the farm is put under
       scaffolding and pinned there, the well goes on the tile beside it, and
       the promise is measured against what the village really gains. The
       promise is about a BUILT well, so it is finished for the comparison.
       The count of workplaces it lifts is deliberately not touched -- reach is
       a property of the spot, and a scaffolded shed will be lifted once it is
       done, exactly as an unstaffed one will be once somebody works it. */
    {
      scene(5, undefined, 3);
      const farm = V.placed.find(q => q.key === 'farm');
      const well = V.placed.find(q => q.key === 'well');
      if (well) { V.placed = V.placed.filter(q => q !== well); V.rebuildStores(); }
      V.res.wood = 1e5; V.res.food = 1e5;
      if (!farm || !V.canUpgrade(farm)) fails.push('the well check could not put a farm under scaffolding');
      else {
        V.upgradeBuilding(farm); farm.build = 1e7;
        for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
        const hands = V.workersAt(farm.id);
        let spot = null;
        for (let dc = -1; dc <= 2 && !spot; dc++) for (let dr = -1; dr <= 2 && !spot; dr++) {
          const c = farm.c + dc, r = farm.r + dr;
          if (V.canPlace('well', c, r, V.occupied()) && V.wellGainAt(c, r, 1).n > 0) spot = [c, r];
        }
        if (!hands) fails.push('the well check left nobody on the scaffolded farm, so it proves nothing');
        else if (!spot) fails.push('the well check found nowhere beside the farm to put a well');
        else {
          V.res.wood = 1e5; V.res.food = 1e5;
          const said = V.wellGainAt(spot[0], spot[1], 1);
          const was = V.deliveredAtMul(V.charmMul());
          V.place('well', spot[0], spot[1]);
          const w2 = V.placed[V.placed.length - 1];
          w2.t = 1; w2.build = 0; V.rebuildStores();
          const got = V.deliveredAtMul(V.charmMul()) - was;
          const mine = V.wellGain(w2).gain;
          if (!said.n) fails.push('the well check put a well in reach of nothing');
          else if (Math.abs(got - said.gain) > 1e-6)
            fails.push('a well beside a scaffolded workplace promised +' + said.gain.toFixed(4)
              + '/s and added +' + got.toFixed(4));
          else if (Math.abs(mine - said.gain) > 1e-6)
            fails.push('a well was sold at +' + said.gain.toFixed(4) + '/s and then says it gives +' + mine.toFixed(4));
        }
      }
    }

    /* And the WORKFORCE does not stand in the scaffolding while a working post
       goes short.

       This is the expensive half of the same fault, and the note in
       expectedRate named it a round before it was fixed: "the new level opens
       another post, so the workforce walks onto the dead building". computeJobs
       ranks posts by what they deliver and fills them in that order, and it
       asked that figure of a LEVEL rather than of what is arriving -- so paying
       for an upgrade made the village's best-paying post the one that pays
       nothing, and kept its hands there for the whole build.

       Few hands on purpose, because that is what makes a held post a lost one:
       with spare villagers about, whoever stands in the scaffolding was going
       to stand somewhere, and the game puts them there deliberately. The post
       picked is the one the village leans on MOST, because that is the one the
       ranking held on to -- the weakest post loses its hand to the queue anyway
       and proves nothing either way.

       Asked of the plan and of the settled village both. The plan is the thing
       that was wrong, and it answers exactly -- "how many does it want there"
       -- where a rate summed over two minutes cannot: the difference between a
       hand held and a hand moved is one hand's output, and the bound that would
       catch it is a threshold picked to catch it. The cost is measured all the
       same and reported, because a rule nobody can price is a rule nobody will
       keep: on this village 2.93/s before the tap, 1.87/s with a hand held, and
       2.47 to 2.53 with it released, which is the spread of where the hand ends
       up rather than noise. */
    {
      scene(2, 4);
      V.goalIdx = V.GOALS.length;           // no reward may arrive and be counted as production
      const staffed = V.placed.filter(q => q.key !== 'hall' && V.B(q.key).makes && V.B(q.key).jobs
        && V.workersAt(q.id) > 0);
      staffed.sort((a, b) => V.deliveringNow(b) - V.deliveringNow(a));
      const p = staffed[0];
      const half2 = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      const secs2 = 120;
      const rate2 = () => {
        half2(); for (let i = 0; i < 10 * 30; i++) V.step(1 / 30); half2();
        let got = 0;
        for (let s2 = 0; s2 < secs2; s2++) {
          const was = V.res.wood + V.res.food;
          for (let i = 0; i < 30; i++) V.step(1 / 30);
          got += (V.res.wood + V.res.food) - was; half2();
        }
        return got / secs2;
      };
      if (!p) fails.push('the workforce check found no staffed workplace to upgrade');
      else {
        const hands0 = V.workersAt(p.id), mine = hands0 * V.deliveringNow(p);
        held.before = +rate2().toFixed(3);
        V.res.wood = 1e5; V.res.food = 1e5;
        const up = V.canUpgrade(p) && V.upgradeBuilding(p);
        p.build = 1e7;                      // the scaffolding stays up to be measured against
        for (let i = 0; i < 30 * 30; i++) V.step(1 / 30);
        const want = V.desiredJobs().want;
        const short = V.placed.filter(q => q !== p && q.t >= 1 && V.deliveringNow(q) > 0
          && (want.get(q.id) || 0) < V.jobsOf(q));
        short.sort((x, y) => (x.key === 'hall') - (y.key === 'hall'));   // name a real workplace, as the plan ranks them
        held.during = +rate2().toFixed(3);
        held.key = p.key; held.hands = hands0; held.wasWorth = +mine.toFixed(3);
        if (!up) fails.push('the workforce check could not upgrade the ' + p.key);
        else if (p.t >= 1) fails.push('the ' + p.key + ' finished building while the workforce was being watched');
        else if (!short.length)
          fails.push('the workforce check left no working post short of a hand, so it proves nothing');
        else if (!(mine > 0))
          fails.push('the workforce check upgraded a ' + p.key + ' that was delivering nothing anyway');
        else if ((want.get(p.id) || 0) > 0)
          fails.push('the workforce plan puts ' + (want.get(p.id) || 0) + ' on a ' + p.key
            + ' under scaffolding while the ' + short[0].key + ' has an empty post');
        else if (V.workersAt(p.id) > 0)
          fails.push(count(V.workersAt(p.id), 'villager') + ' still standing in the '
            + p.key + "'s scaffolding while the " + short[0].key + ' has an empty post');
      }
    }

    return { upgrades, workplaces: produced, changedOnceFinished: changed, ratesMeasured: measured, held, fails };
  };
  /* Nothing the village has already made disappears without being handed in.

     Its goods are not only what is in the stores: they are also the loads in
     villagers' hands and the stock a workplace has finished and is holding for
     a carrier. Both of those are destroyed by ordinary actions unless somebody
     hands them in -- selling a house sends its residents away mid-journey, and
     selling a workplace takes its shelf with it.

     Checked as a conservation law over every destructive action: what the
     village holds afterwards is what it held before, plus the refund, with
     room in the stores for all of it. The sweep refuses to conclude anything
     if its own stores filled up, because then losing goods would be correct. */
  window.handoverSweep = function () {
    const V = window.__v, fails = [];
    const held = () => V.res.wood + V.res.food
      + V.villagers.reduce((n, g) => n + (g.carry ? g.carry.n : 0), 0)
      + V.placed.reduce((n, p) => n + (p.stock || 0), 0);
    const scene = (houseLvl, extra) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.goalIdx = 0;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.res.wood = 5e4; V.res.food = 5e4;
      const LB = V.landBounds();
      for (const [k, c, r] of [['house',0,0],['house',0,3],[extra,3,0],
        ['store',9,0],['store',9,3],['store',9,6],['store',3,9]]) V.place(k, LB.lo + c, LB.lo + r);
      for (const p of V.placed) { p.t = 1; if (p.key === 'house') p.lvl = houseLvl; if (p.key === 'store') p.lvl = 5; }
      V.rebuildStores();
      for (let i = 0; i < 120; i++) V.step(1 / 30);          // villagers appear and take posts
      V.res.wood = 200; V.res.food = 200;                     // room to spare for refund and loads
      for (const g of V.villagers) g.carry = { k: 'wood', n: 8 };
    };
    const law = (name, act) => {
      const before = held(), refund = act.refund ? act.refund() : { wood: 0, food: 0 };
      act.go();
      V.step(1 / 30);
      const want = before + (refund.wood || 0) + (refund.food || 0), got = held();
      if (Math.min(V.caps.wood - V.res.wood, V.caps.food - V.res.food) < 0)
        { fails.push(name + ': the sweep filled its own stores, so it proved nothing'); return; }
      // one frame of the village's own work is allowed in the other direction
      if (want - got > 0.01) fails.push(name + ' lost ' + (want - got).toFixed(1) + ' goods the village had already made');
    };
    // the residents of a house, mid-journey, at every size of house
    for (const lvl of [1, 2, 3, 4, 5]) {
      scene(lvl, 'farm');
      const house = V.placed.filter(p => p.key === 'house').pop();
      law('selling a level ' + lvl + ' house', { refund: () => V.sellValue(house), go: () => V.sellBuilding(house) });
    }
    // and the shelf a workplace is holding for its carriers
    let kinds = 0;
    for (const key of V.BUILDINGS.filter(b => b.makes && b.jobs && b.key !== 'hall').map(b => b.key)) {
      scene(3, key);
      const p = V.placed.find(q => q.key === key);
      if (!p) continue;
      kinds++;
      p.stock = 16;                                           // STOCK_MAX: two loads waiting
      law('selling a ' + key + ' holding two loads', { refund: () => V.sellValue(p), go: () => V.sellBuilding(p) });
    }
    /* And a restart hands back what the villagers were holding. A workplace's
       shelf is written into the save; the loads in hands are not, because
       villagers are rebuilt from the houses rather than restored, so without
       somebody putting them back they are the one part of the village's goods
       that a restart quietly costs. */
    const realSave = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    scene(3, 'farm');
    const inHand = V.villagers.reduce((n, g) => n + (g.carry ? g.carry.n : 0), 0);
    const beforeRestart = held();
    V.save();
    V.placed.length = 0; V.villagers.length = 0; V.orders = [];
    V.load(); V.landTransit();                       // the order boot uses
    const afterRestart = held();
    if (inHand <= 0) fails.push('the restart case had nothing in hand, so it proved nothing');
    else if (beforeRestart - afterRestart > 0.01)
      fails.push('a restart lost ' + (beforeRestart - afterRestart).toFixed(1)
        + ' of the ' + inHand + ' goods the villagers were carrying');
    try { if (realSave !== null) localStorage.setItem(V.KEY, realSave); } catch (e) {}
    return { houseLevels: 5, workplaceKinds: kinds, carriedAcrossRestart: inHand, fails };
  };
  /* The arrow on a workplace panel is a promise: "0.39/s delivered -> 0.44/s"
     is what this building will hand over once the work is done. Checked
     end to end, by reading the row the player reads and then buying the
     upgrade -- not by recomputing it, which would only prove the panel agrees
     with itself.

     It is a promise about THIS building with the hands it has. An upgrade can
     also open a job slot, and a villager arriving to fill it lifts the figure
     further; the workforce moving is a separate thing the same row reports as
     "workers 1 / 2". So cases where the hand count changed across the upgrade
     are not evidence either way and are skipped -- with a floor on how many
     must survive, or a run in which the workforce churned throughout would
     pass while checking nothing. */
  window.promiseSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const rowsOf = p => {
      V.panel = p.id; V.step(0.001);
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.panel = null;
      return lines;
    };
    const rowLike = (p, re) => rowsOf(p).find(x => re.test(x)) || '';
    const rateRow = p => rowLike(p, new RegExp('/s delivered'));
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.tutSeen.length = 0;
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    V.res.wood = 5e4; V.res.food = 5e4;
    const LB = V.landBounds();
    for (const [k, c, r] of [['house',0,0],['house',0,3],['house',0,6],['farm',3,0],['lumber',3,3],
      ['mill',3,6],['store',9,0],['store',9,3],['store',9,6],['store',6,9]]) V.place(k, LB.lo + c, LB.lo + r);
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);
    parkGoals();                   // no payout may land mid-measurement
    let checked = 0, skipped = 0;
    for (const key of ['farm', 'lumber', 'mill']) {
      const p = V.placed.find(q => q.key === key);
      if (!p) continue;
      for (let lvl = 1; lvl <= 4; lvl++) {
        for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        V.res.wood = 5e3; V.res.food = 5e3;
        const m = /([\d.]+)\/s delivered\s+→\s+([\d.]+)\/s/.exec(rateRow(p));
        if (!m) { skipped++; continue; }
        /* The hands the PROMISE was quoted for, not the hands there now.
           The panel quotes the next level with the staff it would really get --
           the ones it has plus whoever is idle -- so holding the result against
           an unchanged staff count passes a case where the idle villager never
           came and the figure was always going to be missed by half. Seen once,
           on a level one lumber camp quoted 0.93/s that delivered 0.47/s, and a
           checker whose answer depends on when you ran it is not a checker. */
        const promised = +m[2], hands = V.handsFor(p, Math.min(V.LVL_MAX, V.lvlOf(p) + 1));
        if (!V.upgradeBuilding(p)) { skipped++; continue; }
        /* The same row WHILE the scaffolding is up. A level is paid for before
           the work is done, so the row quoted the new one as though it were
           already arriving: '1.42/s delivered' on the card whose own button
           read 'Building...', with nothing reaching the stores for the next ten
           seconds. Two claims to check -- that it is delivering nothing, and
           that the figure it gives for when the work is done is the figure the
           finished building actually delivers. Written without backslashes on
           purpose; these patterns have been eaten twice on the way into this
           file. */
        const upRow = rateRow(p), upHands = V.workersAt(p.id);
        const mUp = new RegExp('([0-9.]+)/s delivered').exec(upRow);
        if (!mUp) fails.push('a ' + key + ' under scaffolding says nothing about what it delivers');
        else if (+mUp[1] !== 0)
          fails.push('a ' + key + ' under scaffolding says it is delivering ' + mUp[1] + '/s');
        const mWhen = upHands ? new RegExp('([0-9.]+)/s when it is done').exec(upRow) : null;
        if (upHands && !mWhen) fails.push('a worked ' + key + ' under scaffolding does not say what it will deliver');
        for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        if (V.workersAt(p.id) !== hands) { skipped++; continue; }   // the workforce moved: not evidence
        const m2 = /([\d.]+)\/s delivered/.exec(rateRow(p));
        if (!m2) { skipped++; continue; }
        checked++;
        if (Math.abs(+m2[1] - promised) > 0.011)
          fails.push('a level ' + lvl + ' ' + key + ' promised ' + promised + '/s and delivers ' + m2[1] + '/s');
        if (mWhen && upHands === V.workersAt(p.id) && Math.abs(+mWhen[1] - +m2[1]) > 0.011)
          fails.push('a ' + key + ' under scaffolding said ' + mWhen[1] + '/s when it is done and delivers ' + m2[1] + '/s');
      }
    }
    if (checked < 4) fails.push('only ' + checked + ' upgrades kept their hands, so the sweep proved almost nothing');

    /* And the figure a panel gives for a building RIGHT NOW is what that
       building really delivers.

       The block above holds an upgrade to its promise, which is a comparison
       between two of the panel's own figures and the village's behaviour
       across the step between them. This asks the simpler question that was
       never asked: stand one workplace on its own and count what comes off its
       shelf.

       It found the market out by a tenth. routeOf measured centre to centre,
       and a market is its own store, so its walk came out as nothing at all
       while its worker really does step out to a post and carry a load back.

       Counted off the building's OWN shelf, not out of the stores: the hall
       keeps a woodpile, so wood arriving in a village is not evidence about
       any particular building -- measured against the stores, a market at
       level one appeared to deliver three times its figure. A pickup takes
       exactly CARRY off the shelf, so a drop of more than one unit is one
       load and nothing else can cause it. */
    let counted = 0;
    for (const [key, lvl] of [['farm', 5], ['lumber', 5], ['mill', 5], ['market', 1], ['market', 5]]) {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
      V.goalIdx = V.GOALS.length; V.tutSeen.length = 0;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.res.wood = 1e6; V.res.food = 1e6;
      const LB = V.landBounds();
      V.place('house', LB.lo + 1, LB.lo + 1);
      V.place('store', LB.lo + 10, LB.lo + 10);
      V.place(key, LB.lo + 2, LB.lo + 5);
      const q = V.placed.find(x => x.key === key);
      if (!q) { fails.push('the delivery check could not place a ' + key); continue; }
      for (const x of V.placed) { x.t = 1; x.build = 0; }
      q.lvl = lvl; V.placed.find(x => x.key === 'house').lvl = 3;
      V.rebuildStores();
      for (let i = 0; i < 240 * 30; i++) V.step(1 / 30);
      const hands = V.workersAt(q.id), said = hands * V.deliveredOf(q);
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half();
      const secs = 600;
      let loads = 0, prev = q.stock;
      for (let i = 0; i < secs * 30; i++) {
        V.step(1 / 30);
        if (q.stock < prev - 1) loads++;
        prev = q.stock;
        if (i % 30 === 0) half();
      }
      const real = loads * V.CARRY / secs;
      /* A handful of loads is not a rate. Anything under twenty and one load
         either way is worth more than the tolerance, so the case is thrown
         away rather than believed. */
      if (!hands || loads < 20) { fails.push('the delivery check got only ' + loads + ' loads out of a level '
        + lvl + ' ' + key + ' with ' + hands + ' hands, so it proves nothing'); continue; }
      counted++;
      /* Never tighter than one load across the window, for the same reason the
         scaffold sweep cannot be: that is the finest difference this way of
         measuring can see. */
      if (Math.abs(said - real) > Math.max(0.05 * Math.max(said, real), V.CARRY / secs))
        fails.push('a level ' + lvl + ' ' + key + ' is quoted at ' + said.toFixed(4)
          + '/s and delivers ' + real.toFixed(4) + '/s');
    }
    /* And the rows that are about ROOM and PEOPLE say what the village really
       has, not what the player has paid for.

       Every figure on this card is quoted off the building's level, and an
       upgrade is bought before the work is done -- so the level lands the
       instant the player taps and these two rows moved with it. A level three
       storehouse sent to four read "Holds 820" while 680 of it counted towards
       the ceiling; a level three house sent to four read "Houses 5 villagers"
       with four living in it. capsSum and livedIn have always answered both
       questions with the level a building is HOLDING, which is why the fault
       showed as the panel disagreeing with the village rather than as anything
       going wrong in the economy.

       Both claims are checked against something other than the function that
       draws them, or the check would only prove the panel agrees with itself.
       The storehouse is held to the village's own ceiling, measured as what the
       ceiling loses when the building is taken out of the sum. The house is held
       to a head count: one house in the village, so whoever is walking about
       lives in it. */
    let rooms = 0, people = 0;
    {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
      V.goalIdx = V.GOALS.length; V.tutSeen.length = 0;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.res.wood = 1e6; V.res.food = 1e6;
      const LB = V.landBounds();
      V.place('house', LB.lo + 1, LB.lo + 1);
      V.place('store', LB.lo + 5, LB.lo + 1);
      for (const x of V.placed) { x.t = 1; x.build = 0; }
      V.rebuildStores();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
      const house = V.placed.find(q => q.key === 'house');
      const store = V.placed.find(q => q.key === 'store');
      const num = new RegExp('Holds [^0-9]*([0-9]+)');
      const heads = new RegExp('Houses ([0-9]+) villager');
      const when = new RegExp('([0-9]+) when it is done');
      const whenWood = new RegExp('under scaffolding[^0-9]*([0-9]+)');
      if (!house || !store) fails.push('the holding check could not place a house and a storehouse');
      else for (let lvl = 1; lvl <= 4; lvl++) {
        house.lvl = lvl; store.lvl = lvl;
        for (const x of V.placed) { x.t = 1; x.build = 0; }
        V.rebuildStores();
        for (let i = 0; i < 40 * 30; i++) V.step(1 / 30);
        /* Finished first: the row and the village must agree before an upgrade
           is anywhere near it, or a failure below says nothing about the
           scaffolding. */
        /* Both figures from the same fresh sum, never from the cached caps:
           this block pokes levels and build states directly, and the cache is
           rebuilt by the game only when something is built, sold or finished.
           Asking the stale one reported a level one storehouse holding 400
           against a ceiling of 0 -- the checker being wrong rather than the
           game. capsWithout(null) skips nothing, so it IS the whole sum. */
        const ceiling = V.capsWithout(null).wood - V.capsWithout(store).wood;
        const m0 = num.exec(rowLike(store, num));
        const h0 = heads.exec(rowLike(house, heads));
        if (!m0) { fails.push('a finished level ' + lvl + ' storehouse says nothing about what it holds'); continue; }
        if (!h0) { fails.push('a finished level ' + lvl + ' house says nothing about who lives there'); continue; }
        if (+m0[1] !== ceiling)
          fails.push('a level ' + lvl + ' storehouse says it holds ' + m0[1]
            + ' and the village ceiling counts ' + ceiling + ' of it');
        if (+h0[1] !== V.villagers.length)
          fails.push('the only house in the village says it houses ' + h0[1]
            + ' villagers and ' + V.villagers.length + ' are walking about');
        V.res.wood = 1e6; V.res.food = 1e6;
        if (!V.canUpgrade(store) || !V.canUpgrade(house)) continue;
        V.upgradeBuilding(store); V.upgradeBuilding(house);
        store.build = 1e7; house.build = 1e7;
        for (let i = 0; i < 10 * 30; i++) V.step(1 / 30);
        const ceilUp = V.capsWithout(null).wood - V.capsWithout(store).wood;
        const upStore = rowLike(store, num), upHouse = rowLike(house, heads);
        const m1 = num.exec(upStore), h1 = heads.exec(upHouse);
        const willHold = whenWood.exec(upStore), willHouse = when.exec(upHouse);
        if (!m1 || +m1[1] !== ceilUp)
          fails.push('a storehouse under scaffolding says it holds ' + (m1 ? m1[1] : 'nothing')
            + ' and the village ceiling counts ' + ceilUp + ' of it');
        if (!h1 || +h1[1] !== V.villagers.length)
          fails.push('a house under scaffolding says it houses ' + (h1 ? h1[1] : 'nobody')
            + ' and ' + V.villagers.length + ' are walking about');
        rooms++; people++;
        /* And what each says the work will make it is what the finished
           building really is. */
        store.build = 1; house.build = 1;
        for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        if (store.t < 1 || house.t < 1) { fails.push('the holding check could not finish its upgrades'); continue; }
        const ceilDone = V.capsWithout(null).wood - V.capsWithout(store).wood;
        if (!willHold) fails.push('a storehouse under scaffolding did not say what it will hold');
        else if (+willHold[1] !== ceilDone)
          fails.push('a storehouse under scaffolding said it would hold ' + willHold[1]
            + ' and the finished one adds ' + ceilDone);
        if (!willHouse) fails.push('a house under scaffolding did not say who it will house');
        else if (+willHouse[1] !== V.villagers.length)
          fails.push('a house under scaffolding said it would house ' + willHouse[1]
            + ' and ' + V.villagers.length + ' live there now');
      }
      if (rooms < 3) fails.push('only ' + rooms + ' storehouse upgrades were watched, so the block proved almost nothing');

      /* And the first time, which is the one a new player meets: a building
         going up has nothing in it and nobody in it yet, and both rows used to
         promise a level nobody had reached on a plot that was still a hole in
         the ground. */
      V.res.wood = 1e6; V.res.food = 1e6;
      const fresh = [];
      for (const [key, c, r2] of [['store', 9, 1], ['house', 1, 4]])
        if (V.place(key, LB.lo + c, LB.lo + r2)) fresh.push(V.placed[V.placed.length - 1]);
      if (fresh.length !== 2) fails.push('the first-build check could not put up a store and a house');
      else {
        const [st, ho] = fresh;
        st.build = 1e7; ho.build = 1e7;      // the scaffolding stays up to be read
        for (let i = 0; i < 10 * 30; i++) V.step(1 / 30);
        if (st.t >= 1 || ho.t >= 1) fails.push('the first-build check let its buildings finish');
        else {
          const m = num.exec(rowLike(st, num)), h = heads.exec(rowLike(ho, heads));
          const gives = V.capsWithout(null).wood - V.capsWithout(st).wood;
          if (!m || +m[1] !== gives)
            fails.push('a storehouse going up for the first time says it holds ' + (m ? m[1] : 'nothing')
              + ' and the village ceiling counts ' + gives + ' of it');
          if (!h || +h[1] !== 0)
            fails.push('a house going up for the first time says it houses ' + (h ? h[1] : 'nobody')
              + ', and nobody has moved in');
        }
      }
    }

    /* And a well's panel keeps the promise its ghost made.

       The badge over a ghost well says what the spot is worth -- "lifts 1
       workplace · +0.36/s" -- and that figure is the entire reason to put it
       there. Put it there and, while the hole was still being dug, its own
       panel said "Reaching no workplace — move it beside one". boostAt skips a
       well that has never finished, so the row could only tell the difference
       between reaching nothing and not reaching it YET by being told, and it
       was not. Measured on the first well of a village, placed exactly where
       the badge pointed: advice that is not merely useless but backwards, on
       the one building whose whole value is where it stands.

       Three claims, because the row makes three: the reach it names is the
       reach the ghost promised, the figure it gives for when the work is done
       is what the finished well really lifts, and an upgrade in progress does
       not quote the level after the one it is building -- the rule the
       delivered row, the storage row and the house row all keep, and the only
       row that did not. */
    let wells = 0;
    {
      const num = new RegExp('([0-9.]+)/s when it is done');
      const liftN = new RegExp('Lifting ([0-9]+) workplace');
      const nowN = new RegExp('([0-9.]+)/s delivered');
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.goalIdx = V.GOALS.length; V.tutSeen.length = 0;
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.res.wood = 1e6; V.res.food = 1e6;
      const LB = V.landBounds();
      const put = k => { for (let r = LB.lo; r <= LB.hi; r++) for (let c = LB.lo; c <= LB.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
      put('house'); put('house'); put('farm'); put('lumber'); put('store');
      for (const q of V.placed) { q.t = 1; q.build = 0; if (q.key !== 'hall') q.lvl = 3; }
      V.rebuildStores();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
      const farm = V.placed.find(q => q.key === 'farm');
      let spot = null;
      for (let dc = -2; dc <= 3 && !spot; dc++) for (let dr = -2; dr <= 3 && !spot; dr++) {
        const c = farm.c + dc, r = farm.r + dr;
        if (V.canPlace('well', c, r, V.occupied()) && V.wellGainAt(c, r, 1).gain > 0.005) spot = [c, r];
      }
      if (!spot) fails.push('the well check found nowhere worth putting a well');
      else {
        const said = V.wellGainAt(spot[0], spot[1], 1);
        V.res.wood = 1e6; V.res.food = 1e6;
        V.place('well', spot[0], spot[1]);
        const w = V.placed.find(q => q.key === 'well');
        w.build = 1e7;                     // the hole stays open to be read
        V.step(1 / 30);
        const going = rowLike(w, new RegExp('Lifting|Reaching'));
        wells++;
        const mN = liftN.exec(going), mWhen = num.exec(going);
        if (/Reaching no workplace/.test(going))
          fails.push('a well going up where its ghost promised +' + said.gain.toFixed(2)
            + '/s says it reaches no workplace and should be moved');
        else if (!mN || +mN[1] !== said.n)
          fails.push('a well going up names ' + (mN ? mN[1] : 'no') + ' workplaces where its ghost promised ' + said.n);
        else if (!mWhen)
          fails.push('a well going up does not say what it will lift: "' + going + '"');
        else if (Math.abs(+mWhen[1] - said.gain) > 0.011)
          fails.push('a well going up says it will lift +' + mWhen[1]
            + '/s where its ghost promised +' + said.gain.toFixed(2));
        /* Finished, the figure it gave has to be the figure it gives. */
        w.build = 1; for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        const done = rowLike(w, new RegExp('Lifting|Reaching'));
        const mNow = nowN.exec(done);
        if (!mNow) fails.push('a finished well says nothing about what it lifts: "' + done + '"');
        else if (mWhen && Math.abs(+mNow[1] - +mWhen[1]) > 0.011)
          fails.push('a well promised +' + mWhen[1] + '/s when it was done and lifts +' + mNow[1]);
        /* And an upgrade in progress keeps its lift, says why there is no more
           yet, and does not point past the step it is on. */
        V.res.wood = 1e6; V.res.food = 1e6;
        if (!V.canUpgrade(w)) fails.push('the well check could not improve its well');
        else {
          const before = mNow ? +mNow[1] : 0;
          V.upgradeBuilding(w); w.build = 1e7; V.step(1 / 30);
          wells++;
          const mid = rowLike(w, new RegExp('Lifting|Reaching'));
          const mMid = nowN.exec(mid), mNext = num.exec(mid);
          if (!mMid || Math.abs(+mMid[1] - before) > 0.011)
            fails.push('a well being improved stopped saying what it still lifts: "' + mid + '"');
          if (mid.includes('→'))
            fails.push('a well being improved quotes the level after the one it is building: "' + mid + '"');
          if (!mNext) fails.push('a well being improved does not say what the work will make it: "' + mid + '"');
          else {
            w.build = 1; for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
            const after = nowN.exec(rowLike(w, new RegExp('Lifting|Reaching')));
            if (!after) fails.push('an improved well says nothing about what it lifts');
            else if (Math.abs(+after[1] - +mNext[1]) > 0.011)
              fails.push('a well being improved promised +' + mNext[1] + '/s and lifts +' + after[1]);
          }
        }
      }
      if (wells < 2) fails.push('only ' + wells + ' well states were read, so the block proved little');
    }

    /* And what comes back is HALF of what went in -- held against the purse,
       not against the arithmetic that works the refund out.

       The block below holds the button's quote against the receipt, and both
       of those come off sellValue, so they move together: make sellValue
       return everything ever paid instead of half and the quote and the
       receipt agree all the way down. Twenty-four sweeps and four thousand
       soak rounds pass while every building in the game is free to put up and
       take down again, which is the one move the source says cannot be undone.

       So this one does not ask the game what the building cost. It watches the
       purse through the real transactions -- the placement and each upgrade,
       each measured across a single call with no tick in between, so nothing
       but the price can move it -- adds them up itself, and holds the refund
       to half of that. It therefore also catches investedIn forgetting a step
       of the ladder, which is the other half of "a level four farm has had far
       more than a farm's worth put into it".

       Levels are kept low and the stores wide and half empty: a refund is
       clamped to the room the village will have, and this block is about the
       figure before the clamp. */
    let halves = 0;
    {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.ensureHall(); V.placed[0].lvl = 5;
      V.res.wood = 1e6; V.res.food = 1e6;
      const L = V.landBounds();
      const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
      /* Three, not four: the hall allows four storehouses and one of the
         five kinds bought and sold below is a storehouse, so the fourth slot
         has to be left open for it. */
      for (let i = 0; i < 3; i++) put('store');
      for (const q of V.placed) if (q.key !== 'hall') q.lvl = 5;
      V.res.wood = 1e6; V.res.food = 1e6;
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);     // the levels land through a real finish
      parkGoals();
      const purse = () => { V.res.wood = Math.floor(V.caps.wood * 0.3); V.res.food = Math.floor(V.caps.food * 0.3); };
      const moved = fn => { const w = V.res.wood, f = V.res.food; const ok = fn();
        return { ok, wood: V.res.wood - w, food: V.res.food - f }; };
      for (const key of ['farm', 'lumber', 'house', 'store', 'statue']) {
        purse();
        const paid = { wood: 0, food: 0 };
        const first = moved(() => put(key));
        if (!first.ok) { fails.push('the refund rule check could not put up a ' + key); continue; }
        paid.wood -= first.wood; paid.food -= first.food;
        const p = V.placed[V.placed.length - 1];
        for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        for (let n = 0; n < 2; n++) {
          purse();
          if (!V.canUpgrade(p)) break;
          const u = moved(() => V.upgradeBuilding(p));
          paid.wood -= u.wood; paid.food -= u.food;
          for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        }
        p.stock = 0;
        /* Low enough that the refund cannot be clamped on the way in, and the
           storehouse taking its own capacity away with it is allowed for. */
        V.res.wood = Math.floor(V.caps.wood * 0.15); V.res.food = Math.floor(V.caps.food * 0.15);
        const back = moved(() => V.sellBuilding(p));
        if (!back.ok) { fails.push('the refund rule check could not sell a ' + key); continue; }
        halves++;
        for (const k of ['wood', 'food']) {
          const want = Math.floor(paid[k] / 2), got = Math.round(back[k]);
          if (Math.abs(got - want) > 1)
            fails.push('a level ' + V.lvlOf(p) + ' ' + key + ' cost ' + paid[k] + ' ' + k
              + ' all told and gave back ' + got + ', where half is ' + want);
        }
        if (paid.wood <= 0) fails.push('the refund rule check spent nothing on a ' + key + ', so it proves nothing');
      }
      if (halves < 4) fails.push('only ' + halves + ' buildings were bought and sold, so the refund rule proved little');
    }

    /* And what the sell button quotes is what the village receives.

       The panel makes two promises about taking a building down and they are
       written in two places: the button says what comes back, clamped to the
       room the village will have AFTER the sale, and the warning that appears
       once the button is armed says what will not fit. Nothing held the pair of
       them against what actually happens, and the file has form here -- there
       was a second removeDecor once, and until this round a dead branch of the
       upgrade button still carried "Remove 75 back", half the price with no
       clamp on it, disagreeing with the button beside it.

       Both figures are read the way a player meets them: the refund before
       arming, because arming replaces it with "Tap again to sell", and the
       warning after. Stock is emptied first -- a workplace hands in what it had
       made as well, which is a bonus the button never promised and would swamp
       the arithmetic. */
    let quotes = 0;
    {
      const isBtn = new RegExp('^(Sell|Remove)($|[  \u00b7])');
      const pick = text => { const o = { wood: 0, food: 0 };
        for (const m of text.matchAll(new RegExp('(🪵|🌾)[^0-9]*([0-9]+)', 'g')))
          o[m[1] === '🪵' ? 'wood' : 'food'] += +m[2];
        return o; };
      const rowsArmed = (p, armed) => {
        V.panel = p.id; V.sellArm = armed ? { id: p.id, t: V.SELL_ARM } : null;
        V.step(0.001);
        const lines = [];
        ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
        try { V.draw(); } finally { ctx.fillText = orig; }
        V.panel = null; V.sellArm = null;
        return lines;
      };
      for (const key of ['store', 'statue', 'farm', 'market', 'house'])
      for (const where of ['empty', 'half', 'full', 'short'])
      for (const lvl of [1, 3]) {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
        V.goalIdx = V.GOALS.length; V.tutSeen.length = 0;
        V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
        V.ensureHall(); V.placed[0].lvl = 5;
        V.res.wood = 1e6; V.res.food = 1e6;
        const LB = V.landBounds();
        for (const k of ['store', 'statue', 'farm', 'house', 'market'])
          for (let r2 = LB.lo; r2 <= LB.hi; r2++) { let done = false;
            for (let c2 = LB.lo; c2 <= LB.hi && !done; c2++)
              if (V.canPlace(k, c2, r2, V.occupied())) done = V.place(k, c2, r2);
            if (done) break; }
        for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
        for (const q of V.placed) if (q.key !== 'hall' && !V.isDecor(q.key)) q.lvl = lvl;
        /* Let the levels land through a real finish, which is what rebuilds the
           ceiling: caps is a cache and this block sets levels by hand. */
        V.res.wood = 1e6; V.res.food = 1e6;
        for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
        const p = V.placed.find(q => q.key === key);
        if (!p) { fails.push('the refund check could not place a ' + key); continue; }
        const cap = V.caps;
        const at = { empty: 0, half: Math.floor(cap.wood / 2), full: cap.wood, short: cap.wood - 40 }[where];
        V.res.wood = at; V.res.food = where === 'empty' ? 0 : Math.min(at, cap.food);
        p.stock = 0;
        const btn = rowsArmed(p, false).find(t => isBtn.test(t)) || '';
        const warn = rowsArmed(p, true).find(t => /would spoil/.test(t)) || '';
        if (!btn) { fails.push('a ' + key + ' panel has no sell button to read'); continue; }
        const said = /nothing|none/.test(btn) ? { wood: 0, food: 0 } : pick(btn);
        const spoiled = warn ? pick(warn.split('—')[1] || '') : { wood: 0, food: 0 };
        const before = { wood: V.res.wood, food: V.res.food };
        p.stock = 0;
        if (!V.sellBuilding(p)) { fails.push('the refund check could not sell a ' + key); continue; }
        quotes++;
        for (const k of ['wood', 'food']) {
          const got = Math.round(V.res[k] - before[k]), want = said[k] - spoiled[k];
          if (Math.abs(got - want) > 1)
            fails.push('a level ' + lvl + ' ' + key + ' sold with the stores ' + where
              + ' was quoted ' + said[k] + ' ' + k + ' back and ' + spoiled[k] + ' spoiling, and the village '
              + (got < 0 ? 'lost ' + -got : 'gained ' + got));
        }
      }
      if (quotes < 30) fails.push('only ' + quotes + ' sales were quoted and checked, so the block proved little');
    }

    return { checked, skipped, delivering: counted, holding: rooms, housing: people, wells,
      halves, quoted: quotes, fails };
  };
  /* A figure on a build card is the price -- unless it is marked, and then it
     is what is still missing. The two sit in the same place in the same shape,
     and used to be told apart only by being gold or salmon: unreadable to
     anyone who cannot separate those hues, and actively misleading, because a
     shortfall is always smaller than the price and so made a building the
     player could not afford look cheaper than it is.

     Read off the canvas by position -- each drawn row assigned to the card
     whose centre it sits under -- so it checks what a player sees rather than
     what the drawing code meant. */
  /* ---------------------------------------------------------------------------
     The goal strip answers the same questions whichever thing it is pointing at.

     A goal that tells you to buy something carries a progress line, and there
     are three things it can name: the hall, a ring of land, and a workplace.
     They are three branches of one function and they had drifted apart -- the
     hall said "building..." while its own scaffolding was up and the workplace
     said nothing at all; the hall and the land said "needs more storage" for a
     price past the ceiling and the workplace counted out a figure that can
     never be reached. Both gaps are at the end of the longest goal in the game.

     So the question is asked of all three rather than of the branch that was
     wrong, because the next branch will be written the same way.

       stripSweep()  -> { cases, fails }
  --------------------------------------------------------------------------- */
  window.stripSweep = function () {
    const V = window.__v, fails = [];
    let cases = 0;
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    /* Levels are set by hand here, and caps is a cache the game rebuilds only
       when something is built, sold or finished -- so every scene lays one path
       at the end to make it recompute. The same trap the holding check fell
       into. */
    const scene = (hallLvl, land, kinds) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = land; V.coverPlaced();
      V.goalIdx = 0; V.tutSeen.length = 0; V.away = null; V.goalDone = null;
      V.finished = null; V.panel = null;
      V.ensureHall(); V.placed[0].lvl = hallLvl; V.placed[0].t = 1;
      V.res.wood = 1e6; V.res.food = 1e6;
      for (const [k, lvl] of kinds) { if (put(k)) { const q = V.placed[V.placed.length - 1]; q.lvl = lvl; q.t = 1; q.build = 0; } }
      put('path');
      V.res.wood = 0; V.res.food = 0;
    };
    const ask = kind => V.buyProgress(kind);
    const want = (kind, got, re, what) => { cases++;
      if (!re.test(got)) fails.push('the strip for a ' + kind + ' ' + what + ' said "' + got + '"'); };
    const RICHLY = () => { V.res.wood = 1e6; V.res.food = 1e6; };

    // --- a price the village cannot hold -------------------------------------
    scene(4, 0, []);                                    // hall 4, no storehouses
    want('hall', ask('hall'), /needs more storage/, 'whose next level costs more than the ceiling');
    scene(1, 3, []);                                    // the last ring, a hall-one ceiling
    want('land', ask('land'), /needs more storage/, 'whose next ring costs more than the ceiling');
    scene(5, V.LAND_MAX, [['market', 4]]);
    want('workplace', ask('workplace'), /needs more storage/, 'whose next step costs more than the ceiling');

    // --- the thing is already going up ---------------------------------------
    scene(4, 0, [['store', 5], ['store', 5], ['store', 5], ['store', 5]]);
    RICHLY();
    if (!V.upgradeBuilding(V.hallOf())) fails.push('the strip check could not start a hall upgrade');
    else { V.hallOf().build = 1e7; V.step(1 / 30);
      want('hall', ask('hall'), /building/, 'already going up'); }
    scene(5, V.LAND_MAX, [['store', 5], ['store', 5], ['store', 5], ['store', 5], ['market', 4]]);
    RICHLY();
    {
      const mk = V.placed.find(p => p.key === 'market');
      if (!mk || !V.upgradeBuilding(mk)) fails.push('the strip check could not start a workplace upgrade');
      else { mk.build = 1e7; V.step(1 / 30);
        want('workplace', ask('workplace'), /building/, 'already going up'); }
    }

    // --- ready, and short ----------------------------------------------------
    scene(4, 0, [['store', 5], ['store', 5], ['store', 5], ['store', 5]]);
    RICHLY();
    want('hall', ask('hall'), /ready/, 'the village can pay for');
    /* The last ring is 5000 wood, which four storehouses at their best do not
       reach: 700 and four times 960 is 4540. The markets are the rest of the
       ceiling, and without them this case was reading 'needs more storage' and
       being right. */
    scene(5, V.LAND_MAX - 1, [['store', 5], ['store', 5], ['store', 5], ['store', 5], ['market', 5], ['market', 5]]);
    RICHLY();
    want('land', ask('land'), /ready/, 'the village can pay for');
    scene(5, V.LAND_MAX, [['store', 5], ['store', 5], ['store', 5], ['store', 5], ['farm', 1]]);
    RICHLY();
    want('workplace', ask('workplace'), /ready/, 'the village can pay for');
    for (const [kind, s2] of [['hall', () => scene(4, 0, [['store', 5], ['store', 5], ['store', 5], ['store', 5]])],
                              ['land', () => scene(5, V.LAND_MAX - 1, [['store', 5], ['store', 5], ['store', 5], ['store', 5], ['market', 5], ['market', 5]])],
                              ['workplace', () => scene(5, V.LAND_MAX, [['store', 5], ['store', 5], ['store', 5], ['store', 5], ['farm', 1]])]]) {
      s2();                                              // scene leaves the purse empty
      want(kind, ask(kind), /[0-9]/, 'the village is saving for');
    }
    /* And nothing at all only when there is nothing to buy, which for a
       workplace means every one of them is finished at the top level. */
    scene(5, V.LAND_MAX, [['farm', 5], ['lumber', 5]]);
    RICHLY();
    cases++;
    if (ask('workplace') !== '') fails.push('the strip spoke for a workplace goal with every workplace finished: "' + ask('workplace') + '"');
    return { cases, fails };
  };
  /* A goal parked where it cannot be finished, for the sweeps that measure a
     rate or a plan over a long run.

     A goal completing pays out, and a payout lands in the middle of whatever
     was being measured: it moves res, which moves fullMask, which rebuilds the
     workforce plan under a checker that is halfway through comparing two
     readings of it. Both the full-store sweep and the panel-promise sweep
     failed about one run in ten this way, each on a different line, and
     neither in isolation -- which is the signature of something arriving from
     outside rather than a rule being broken.

     The charm goal with no decorations down is the natural place to park: it
     can never complete, so stepGoals never pays, and the village is still
     unfinished, which is what the resource chip's wording depends on. */
  const parkGoals = () => {
    const V = window.__v;
    const i = V.GOALS.findIndex(g => /charm/i.test(g.text));
    V.goalIdx = i < 0 ? 0 : i;
    V.goalDone = null;
    return V.goalIdx;
  };
  /* ---------------------------------------------------------------------------
     What the village means by a full store, and that everything means the same.

     hasRoomFor is called THE definition of a full store in the source, and the
     note beside it records what it cost to get there: the workforce, the
     resting badge, the building panel and the hall said "full" with room for
     less than one load, while the resource bar and its wasting figure waited
     for the very ceiling -- so for a moment on the way up the hall read "store
     full, build a storehouse" over a bar reading "+0.3 / s". One rule, two
     places, twice.

     It was then written once and nothing was ever asked to keep it. Loosening
     it to "any room at all" -- which is the fault it was written to fix --
     passes twenty-four sweeps and four thousand soak rounds untouched, and it
     is not a harmless change: with room for four of a load of eight, the
     workforce goes on staffing the farm and every load it brings is destroyed
     on arrival.

     So the line is measured rather than trusted, through two surfaces that
     have no code in common -- the plan the workforce is built from, and the
     words on the resource chip -- and it has to fall in exactly one place,
     at a load. The scan runs past it on both sides so that a rule which never
     flips, or flips twice, is as loud as one that flips in the wrong place.

       fullSweep()  -> { cases, flipAt, fails }
  --------------------------------------------------------------------------- */
  window.fullSweep = function () {
    const V = window.__v, fails = [];
    const ctx = document.querySelector('canvas').getContext('2d');
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    /* An UNFINISHED village: a finished one shares its overflow and the chip
       says so in calmer words, which is a different sentence to look for. */
    V.tutSeen.length = 0;
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.ensureHall(); V.placed[0].lvl = 5;
    V.res.wood = 1e6; V.res.food = 1e6;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
    V.res.wood = 1e6; V.res.food = 1e6;
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);        // and the levels land through a real finish
    parkGoals();
    const farm = V.placed.find(q => q.key === 'farm');
    if (!farm) return { cases: 0, flipAt: null, fails: ['the full-store check could not place a farm'] };
    const says = new RegExp('storage full|wasting');
    const read = room => {
      /* Stepped first and the stores set after, so that nothing the tick does
         -- a delivery, a trade, a goal -- can move the figure between setting
         it and reading it. The plan is worked out fresh from res on every
         call, so there is no need to step again. */
      V.step(1 / 30);
      V.res.food = V.caps.food - room;
      V.res.wood = Math.floor(V.caps.wood / 2);   // the other store always has room to go to
      const want = V.desiredJobs().want;
      const lines = []; const orig = ctx.fillText;
      ctx.fillText = function (x, ...a) { lines.push(String(x)); return orig.call(this, x, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return { hands: want.get(farm.id) || 0, full: lines.some(x => says.test(x)) };
    };
    V.goalIdx = parkGoals();
    const span = V.CARRY + 3;
    const scan = [];
    for (let room = 0; room <= span; room++) scan.push({ room, ...read(room) });
    const flips = (key, from) => {
      const out = [];
      for (let i = 1; i < scan.length; i++) if (scan[i][key] !== scan[i - 1][key]) out.push(scan[i].room);
      return out;
    };
    const planFlips = flips('hands'), chipFlips = flips('full');
    const show = key => scan.map(x => x.room + ':' + x[key]).join(' ');
    /* The plan must want MORE hands on the farm once a load fits, and the chip
       must stop calling the store full, and both at the same room. */
    if (planFlips.length !== 1)
      fails.push('the workforce changed its mind ' + planFlips.length + ' times across the ceiling, not once — ' + show('hands'));
    else if (planFlips[0] !== V.CARRY)
      fails.push('the workforce treats the store as full until there is room for ' + planFlips[0]
        + ', and a load is ' + V.CARRY + ' — ' + show('hands'));
    if (chipFlips.length !== 1)
      fails.push('the chip changed its mind ' + chipFlips.length + ' times across the ceiling, not once — ' + show('full'));
    else if (chipFlips[0] !== V.CARRY)
      fails.push('the chip calls the store full until there is room for ' + chipFlips[0]
        + ', and a load is ' + V.CARRY + ' — ' + show('full'));
    if (planFlips.length === 1 && chipFlips.length === 1 && planFlips[0] !== chipFlips[0])
      fails.push('the workforce and the chip disagree about what full means: ' + planFlips[0] + ' against ' + chipFlips[0]);
    /* And the load that does not fit really does not fit, which is the whole
       reason for the line. */
    V.res.food = V.caps.food - (V.CARRY - 1);
    const before = V.res.food;
    const got = V.grant('food', V.CARRY, 0, 0);
    if (got >= V.CARRY - 0.001)
      fails.push('a whole load fitted into a store with room for ' + (V.CARRY - 1));
    if (V.res.food - before >= V.CARRY - 0.001)
      fails.push('the store took a whole load it had no room for');
    V.goalIdx = 0;
    return { cases: scan.length, flipAt: planFlips.length === 1 ? planFlips[0] : planFlips, fails };
  };
  /* ---------------------------------------------------------------------------
     A road is worth laying, and worth what the card says it is.

     Paving is one of the two answers the game gives for a workplace losing
     half of itself to the walk -- the cheap one, five wood a tile against a
     whole building moved -- and the panel offers it in those words. Nothing
     checked that it does anything. Set PATH_SPEED to 1 and the entire road
     mechanic is dead: twenty-five sweeps pass, because every figure the
     interface quotes is worked out from the same constant and they all go to
     zero together. The badge over a path promises nothing, the panel's advice
     achieves nothing, and the sweeps agree with each other all the way down.

     So the road is measured against a villager rather than against the
     formula, in both states, and against the words on its own card. The words
     have drifted from the number here before -- the blurb said "half again"
     while the constant was 2.2 -- so the blurb is read rather than trusted.

       roadSweep()  -> { bare, paved, laid, fails }
  --------------------------------------------------------------------------- */
  window.roadSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.goalIdx = V.GOALS.length; V.tutSeen.length = 0;
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    V.res.wood = 1e6; V.res.food = 1e6;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    /* Placed by hand, not packed. A greedy fill puts the farm and its store
       shoulder to shoulder and the whole route lies under their own
       footprints, so there is nothing to pave -- the first version of this
       laid nought tiles and said so. The farm goes in a corner and its store
       five tiles away up the same column, which also keeps the hall from
       being the nearer of the two: the hall sits in the middle and is a store
       as well. */
    V.place('house', L.lo + 9, L.lo + 9); V.place('house', L.lo + 9, L.lo + 11);
    V.place('farm', L.lo + 1, L.lo + 1); V.place('store', L.lo + 1, L.lo + 6);
    void put;
    for (const q of V.placed) { q.t = 1; q.build = 0; if (q.key !== 'hall') q.lvl = 3; }
    V.rebuildStores();
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);
    const p = V.placed.find(q => q.key === 'farm');
    if (!p) return { bare: null, paved: null, laid: 0, fails: ['the road check could not place a farm'] };
    /* A real round trip, timed: out with a load and back to the post. The one
       measurement here that does not go through routeOf. */
    const trip = () => {
      const v = V.villagers.find(g => g.job === p.id);
      if (!v) return null;
      const got = []; let mark = null, last = v.st, t = 0;
      /* Averaged over several trips: a villager starts from a random spot
         inside the post, so one trip runs about an eighth either side. */
      for (let i = 0; i < 1200 * 30 && got.length < 10; i++) {
        V.step(1 / 30); t += 1 / 30;
        for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2;
        if (v.st !== last) {
          if (last === 'work' && v.st === 'toStore') mark = t;
          if (last === 'toWork' && v.st === 'work' && mark != null) { got.push(t - mark); mark = null; }
          last = v.st;
        }
      }
      return got.length ? got.reduce((a, b) => a + b, 0) / got.length : null;
    };
    const bareSaid = V.travelSecondsOf(p), bareReal = trip();
    /* Pave the route the villager actually walks: centre to centre of the
       store nearest the farm, which is not always the one a reader would
       pick -- the hall is a store too and it sits in the middle. */
    const b = V.B(p.key), c0 = V.tileToWorld(p.c + (b.w - 1) / 2, p.r + (b.h - 1) / 2);
    const st = V.nearestStore(c0.x, c0.y);
    let laid = 0;
    if (!st) fails.push('the road check found no store to walk to');
    else {
      const sb = V.B(st.key), d = V.tileToWorld(st.c + (sb.w - 1) / 2, st.r + (sb.h - 1) / 2);
      const steps = Math.max(8, Math.round(Math.hypot(d.x - c0.x, d.y - c0.y) / 12));
      const want = new Set();
      for (let i = 0; i < steps; i++) { const fr = (i + 0.5) / steps;
        const t2 = V.tileAt(c0.x + (d.x - c0.x) * fr, c0.y + (d.y - c0.y) * fr);
        want.add(t2.c + ',' + t2.r); }
      V.res.wood = 1e6; V.res.food = 1e6;
      for (const key of want) { const [cc, rr] = key.split(',').map(Number);
        if (V.canPlace('path', cc, rr, V.occupied()) && V.place('path', cc, rr)) laid++; }
      for (const q of V.placed) { q.t = 1; q.build = 0; }
      V.rebuildStores();
      for (let i = 0; i < 30 * 30; i++) V.step(1 / 30);
    }
    const pavedSaid = V.travelSecondsOf(p), pavedReal = trip();
    const frac = V.routeOf(p).paved;
    if (!laid) fails.push('the road check could lay no path on the route, so it proves nothing');
    else if (frac < 0.3) fails.push('only ' + (frac * 100).toFixed(0) + '% of the route took a path, so it proves little');
    /* The model and the villager agree, bare and paved. */
    for (const [what, said, realT] of [['bare', bareSaid, bareReal], ['paved', pavedSaid, pavedReal]]) {
      if (realT == null) { fails.push('no round trip could be timed with the route ' + what); continue; }
      if (Math.abs(realT - said) > Math.max(0.15 * said, 0.5))
        fails.push('with the route ' + what + ' the panel says ' + said.toFixed(2)
          + 's round trip and the villager takes ' + realT.toFixed(2) + 's');
    }
    /* And the road is worth laying, by the factor the walk is paved at. */
    if (laid && bareReal != null && pavedReal != null) {
      const want = frac / V.PATH_SPEED + (1 - frac);
      const had = pavedReal / bareReal;
      if (had > want + 0.1)
        fails.push('paving ' + (frac * 100).toFixed(0) + '% of the route should cut the walk to '
          + (want * 100).toFixed(0) + '% and it took ' + (had * 100).toFixed(0) + '%');
      if (pavedSaid >= bareSaid - 0.01)
        fails.push('paving the route did not shorten the walk at all: ' + bareSaid.toFixed(2)
          + 's before, ' + pavedSaid.toFixed(2) + 's after');
    }
    /* And the card still says what the constant does. The words have drifted
       from the number here before. */
    const blurb = (V.B('path').blurb || '').toLowerCase();
    if (!/twice as fast/.test(blurb))
      fails.push('the path card no longer says how much faster a road is: "' + blurb + '"');
    else if (V.PATH_SPEED < 2)
      fails.push('the path card says twice as fast and the road is worth ' + V.PATH_SPEED);
    return { bare: +bareSaid.toFixed(2), paved: +pavedSaid.toFixed(2), laid, pavedFrac: +frac.toFixed(2),
      bareReal: bareReal == null ? null : +bareReal.toFixed(2),
      pavedReal: pavedReal == null ? null : +pavedReal.toFixed(2), fails };
  };
  /* ---------------------------------------------------------------------------
     Charm stays a bonus, and the number over a decoration is the number it adds.

     "A pleasant village works a little harder, capped so it stays a bonus
     rather than the main economy" -- and the cap is one Math.min in one line.
     Take it out and nothing in the battery notices: twenty-three sweeps and
     four thousand soak rounds pass while a village of sixty statues runs at
     1.9 times its rate instead of 1.2, because every figure the interface
     quotes about charm is worked out from the same multiplier and they all
     grow together.

     The ceiling is where the two halves of charm come apart, so that is where
     this looks. Past it the tray is supposed to say "charm is full -- this one
     is for the look", and it says so by way of usefulCharm, which is clamped
     to the room left. With the cap gone the words stay the same and the
     decoration quietly starts helping again: measured, the badge promised
     nothing and the village gained 0.05/s from each of the next six statues.

     So: walk a village from no charm to half again past the ceiling, and at
     every step hold the badge's promise against what the village actually
     gains, and the multiplier against itself. A cap is a thing that stops
     moving, which is a shape a checker can hold without being told the number.

       charmSweep()  -> { placed, atFull, mul, fails }
  --------------------------------------------------------------------------- */
  window.charmSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
    V.ensureHall(); V.placed[0].lvl = 5;
    V.res.wood = 1e9; V.res.food = 1e9;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'house', 'farm', 'lumber', 'store', 'mill']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 4;
    V.res.wood = 1e9; V.res.food = 1e9;
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);     // the levels land through a real finish
    parkGoals();
    /* Statues, because they are the biggest step and so reach the ceiling
       inside the decoration limit: fourteen of them pass six hundred. */
    const need = Math.ceil(V.CHARM_FULL / V.B('statue').charm) + 6;
    let n = 0, mulAtFull = null, mulBefore = V.charmMul(), rose = false;
    let worst = 0, worstAt = null;
    for (; n < need; n++) {
      let spot = null;
      for (let c = L.lo; c <= L.hi && !spot; c++) for (let r = L.lo; r <= L.hi && !spot; r++)
        if (V.canPlace('statue', c, r, V.occupied())) spot = [c, r];
      if (!spot) break;
      V.res.wood = 1e9; V.res.food = 1e9;
      const charmWas = V.charmTotal(), roomWas = V.charmRoom(), usefulWas = V.usefulCharm('statue');
      const said = V.decorGainAt('statue', spot[0], spot[1]);
      const was = V.deliveredAtMul(V.charmMul());
      if (!V.place('statue', spot[0], spot[1])) break;
      V.rebuildStores();
      const got = V.deliveredAtMul(V.charmMul()) - was;
      /* The badge against the village, at every step and not only below the
         line: past it the promise is nothing, and nothing is what the village
         must gain. */
      if (Math.abs(said - got) > 1e-6 && Math.abs(said - got) > worst) { worst = Math.abs(said - got); worstAt = charmWas; }
      /* And the tray's words and its arithmetic agree about what is left. */
      if ((roomWas <= 0) !== (usefulWas <= 0))
        fails.push('at ' + charmWas + ' charm the tray says ' + (roomWas <= 0 ? 'the village is full' : 'there is room')
          + ' and offers ' + usefulWas + ' of charm');
      const mulNow = V.charmMul();
      if (mulNow > mulBefore + 1e-9) rose = true;
      if (charmWas < V.CHARM_FULL && V.charmTotal() >= V.CHARM_FULL && mulAtFull === null) mulAtFull = mulNow;
      /* Past the ceiling the multiplier is a cap, which is a thing that stops
         moving. Stated that way, the number itself never has to be named. */
      if (charmWas >= V.CHARM_FULL && mulNow > mulBefore + 1e-9)
        fails.push('past the ceiling at ' + charmWas + ' charm another statue still raised the bonus from '
          + mulBefore.toFixed(4) + ' to ' + mulNow.toFixed(4));
      mulBefore = mulNow;
    }
    if (worst > 1e-6)
      fails.push('a statue at ' + worstAt + ' charm promised a figure the village did not gain, out by ' + worst.toFixed(5) + '/s');
    if (V.charmTotal() < V.CHARM_FULL)
      fails.push('only ' + V.charmTotal() + ' charm was reached of ' + V.CHARM_FULL + ', so the ceiling was never tested');
    if (!rose) fails.push('charm never raised the bonus at all, so the cap proves nothing');
    if (mulAtFull !== null && !(mulAtFull > 1))
      fails.push('a village at full charm gets no bonus at all');
    return { placed: n, atFull: mulAtFull === null ? null : +mulAtFull.toFixed(4),
      mul: +V.charmMul().toFixed(4), charm: V.charmTotal(), fails };
  };
  /* ---------------------------------------------------------------------------
     The two floors are real sizes on a real phone.

     TEXT_MIN and TOUCH_MIN are the game's answers to "how small is too small to
     read" and "how small is too small to hit", and both are written down in
     the source in CSS pixels on a handset -- 26 logical is "about 9.5 CSS on
     that phone", 128 logical is "47 CSS px on a 375 screen, 45 on a 360 ...
     against the 44 to 48 both platforms ask for".

     Every sweep that keeps those floors measures against the constants
     themselves, so the constants are the one thing none of them can see move.
     Cut TEXT_MIN from 26 to 10 and twelve drawing sweeps pass while labels are
     free to shrink to three and a half CSS pixels -- below the five and six the
     source measured and called a smudge rather than a label. Halve TOUCH_MIN
     and eight more pass, tapSweep and the gesture sweep among them, because
     they ask whether controls collide and smaller ones collide less.

     So this one does not ask the game. The canvas is a fixed number of logical
     pixels across whatever the handset is, which is the whole reason a logical
     pixel has a size in the first place, so the conversion is arithmetic on
     the width of the narrowest phone the game is written for. The floors are
     then held to the figures the source cites from outside itself: the 44 CSS
     pixels both platforms ask of a touch target, and a text size clear of the
     five and six that were found unreadable.

       floorSweep()  -> { across, text, touch, fails }
  --------------------------------------------------------------------------- */
  window.floorSweep = function () {
    const V = window.__v, fails = [];
    /* How many logical pixels the canvas is across, asked of the game rather
       than written down here: the middle tab sits at the middle of it. */
    const tabs = V.tabRects();
    const across = tabs.length >= 2 ? Math.round(tabs[1].x * 2) : 0;
    if (across < 2) fails.push('the sweep could not work out how wide the canvas is in logical pixels');
    /* The handsets the source names. The narrowest is what the floors have to
       clear, and 375 is the one its figures are quoted on. */
    const PHONES = [360, 375, 390, 412];
    const narrow = Math.min(...PHONES);
    const css = (logical, phone) => logical * phone / across;
    /* Both platforms ask 44 to 48 of a touch target and the source says so. */
    const TOUCH_FLOOR = 44;
    /* Clear of the five and six CSS pixels the source measured and rejected.
       Not the current value, so an honest retune has somewhere to go. */
    const TEXT_FLOOR = 8;
    const text = {}, touch = {};
    for (const p of PHONES) {
      text[p] = +css(V.TEXT_MIN, p).toFixed(2);
      touch[p] = +css(V.TOUCH_MIN, p).toFixed(2);
    }
    if (across >= 2) {
      if (css(V.TOUCH_MIN, narrow) < TOUCH_FLOOR)
        fails.push('a control floor of ' + V.TOUCH_MIN + ' logical is ' + css(V.TOUCH_MIN, narrow).toFixed(1)
          + ' CSS pixels on a ' + narrow + ' phone, against the ' + TOUCH_FLOOR + ' both platforms ask for');
      if (css(V.TEXT_MIN, narrow) < TEXT_FLOOR)
        fails.push('a text floor of ' + V.TEXT_MIN + ' logical is ' + css(V.TEXT_MIN, narrow).toFixed(1)
          + ' CSS pixels on a ' + narrow + ' phone, which is the size the source calls a smudge');
      /* And the floors are floors: what the game actually draws and actually
         answers taps with must not go under them. padHit is the one that
         grows a hit region, so it may never hand back less than it was given
         or less than half the floor. */
      for (const half of [4, 10, 30, 64, 200]) {
        const got = V.padHit(half, 20);
        if (got < half) fails.push('padHit shrank a control from ' + half + ' to ' + got);
        if (got > Math.max(half, V.TOUCH_MIN / 2) + 0.001)
          fails.push('padHit grew a control past the floor, ' + half + ' to ' + got);
      }
    }
    return { across, text, touch, floors: { text: TEXT_FLOOR, touch: TOUCH_FLOOR }, fails };
  };
  /* ---------------------------------------------------------------------------
     The clocks are real times.

     floorSweep holds the two size constants to sizes a person can see and hit.
     These are the same idea for the ones measured in seconds: constants whose
     whole purpose is written down as something that happens quickly enough, or
     stops happening soon enough, and which no sweep was asking after.

     CARRY is not a number about carrying, it is a number about watching: "a
     big load means the resource counter sits still for half a minute and then
     jumps, which reads as a broken game; small ones keep something arriving
     every few seconds". Every sweep that touches CARRY quotes it back, so the
     one thing none of them can see is the counter going quiet.

     SELL_ARM is the other. Selling is the one move the game says cannot be
     undone, so it asks twice -- and then "disarms itself after a few seconds
     so the panel is never left sitting there with a live demolish button on
     it". Nothing in the harness ever asked whether it disarms; the one place
     it appears, it is being set.

     Both are held in seconds, so the constants cannot move the bar with them.

       clockSweep()  -> { quiet, arrivals, armedFor, fails }
  --------------------------------------------------------------------------- */
  window.clockSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null;
    V.panel = null; V.sel = null; V.sellArm = null;
    V.ensureHall(); V.placed[0].lvl = 5;
    V.res.wood = 1e6; V.res.food = 1e6;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
    V.res.wood = 1e6; V.res.food = 1e6;
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);     // the levels land through a real finish
    parkGoals();

    /* How long the counter is ever allowed to sit still. The stores are put
       back to half every second so that nothing is refused and the only reason
       for a quiet spell is that nobody has arrived. Measured on this village
       at the real CARRY the longest spell is about five seconds; the bar is
       fifteen, which is three times that and still half of the half-minute
       the source calls broken. */
    const QUIET = 15;
    let t = 0, last = 0, quiet = 0, arrivals = 0, prev = V.res.wood + V.res.food;
    for (let i = 0; i < 300 * 30; i++) {
      if (i % 30 === 0) { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; prev = V.res.wood + V.res.food; }
      V.step(1 / 30); t += 1 / 30;
      const now = V.res.wood + V.res.food;
      if (now > prev + 0.001) { arrivals++; quiet = Math.max(quiet, t - last); last = t; }
      prev = now;
    }
    quiet = Math.max(quiet, t - last);        // and the spell still running at the end
    if (!arrivals) fails.push('nothing arrived at all in five minutes, so the cadence proves nothing');
    else if (quiet > QUIET)
      fails.push('the resource counter sat still for ' + quiet.toFixed(1)
        + ' seconds, where a load is ' + V.CARRY + ' and the source wants something every few');

    /* And the live demolish button does not sit there. Armed by hand rather
       than by tapping, because this is about the clock and not about the hit
       region -- tapSweep has that. */
    const p = V.placed.find(q => q.key === 'farm');
    let armedFor = null;
    if (!p) fails.push('the clock check could not find a building to arm');
    else {
      V.panel = p.id; V.sellArm = { id: p.id, t: V.SELL_ARM };
      V.step(1 / 30);
      if (!(V.sellArm && V.sellArm.id === p.id))
        fails.push('the sell button disarmed itself before the player could tap it again');
      let s2 = 0;
      for (; s2 < 30 && V.sellArm; s2++) for (let i = 0; i < 30; i++) V.step(1 / 30);
      armedFor = V.sellArm ? null : s2;
      if (V.sellArm) fails.push('the sell button was still live after 30 seconds on an open panel');
      /* And looking at something else puts it away. */
      const other = V.placed.find(q => q.key === 'lumber' || (q.key !== 'farm' && q.key !== 'hall'));
      if (other) {
        V.sellArm = { id: p.id, t: V.SELL_ARM };
        V.panel = other.id; V.step(1 / 30);
        if (V.sellArm) fails.push('the sell button stayed live while another building was opened');
      }
      V.panel = null; V.sellArm = null;
    }
    return { quiet: +quiet.toFixed(1), arrivals, armedFor, bars: { quiet: QUIET, disarm: 30 }, fails };
  };
  window.traySweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    V.res.wood = 5e4; V.res.food = 5e4;
    const LB = V.landBounds();
    V.place('house', LB.lo + 1, LB.lo + 1); V.place('house', LB.lo + 1, LB.lo + 3);
    for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    V.barMode = 'build';
    const rowsFor = () => {
      const seen = [], orig = ctx.fillText;
      ctx.fillText = function (t, x, y) { seen.push({ t: String(t), x, y }); return orig.apply(this, arguments); };
      try { V.step(0.001); V.draw(); } finally { ctx.fillText = orig; }
      const cards = V.barRects(), u = V.US ? V.US() : 1;
      return cards.map(c => ({ key: c.b.key, cost: c.b.cost,
        rows: seen.filter(s2 => Math.abs(s2.x - c.x) < c.w / 2 && s2.y > c.y && /[🪵🌾]/.test(s2.t))
                  .map(s2 => s2.t) }));
    };
    let checked = 0;
    for (const [tag, res] of [['a full purse', 5e4], ['an empty one', 3]]) {
      V.res.wood = res; V.res.food = res;
      for (const card of rowsFor()) {
        if (!card.rows.length) continue;                 // locked, or nobody spare
        const afford = Object.entries(card.cost).every(([k, v]) => V.res[k] >= v);
        for (const row of card.rows) {
          checked++;
          const marked = row.indexOf('−') === 0;
          const n = +(row.match(/([\d.]+)/) || [])[1];
          const kind = row.indexOf('🪵') >= 0 ? 'wood' : 'food';
          if (afford && marked) fails.push(card.key + ' with ' + tag + ' marks its price as a shortfall: ' + row);
          if (!afford && !marked) fails.push(card.key + ' with ' + tag + ' shows "' + row
            + '", which is what it still needs, in the shape of a price');
          const want = afford ? card.cost[kind] : Math.ceil(card.cost[kind] - V.res[kind]);
          if (Number.isFinite(want) && Math.abs(n - want) > 0.51)
            fails.push(card.key + ' with ' + tag + ' shows ' + n + ' where ' + want + ' is true');
        }
      }
    }
    if (checked < 6) fails.push('only ' + checked + ' rows were read, so the sweep proved almost nothing');
    return { rowsRead: checked, fails };
  };
  /* The whole battery, in one call, in an order that puts the quick answers
     first and the two long simulations last.

     It existed only as a job list typed out by hand each time, which is a
     checker you can forget to run: a sweep added and not added to the list is
     a sweep that silently never runs again. So the list is here, beside the
     sweeps, and it checks ITSELF -- anything on window matching *Sweep that is
     not in the list is reported as unrun rather than quietly skipped.

     await it: three of these are async. */
  /* The trade board.

     It has produced two defects now -- offers stranded on stalls that no
     longer existed after a market was sold, and the offer a player was saving
     for being handed to the next trader -- and it is the one part of the game
     where the village changes under the player's hand while they are looking
     at it. Its rules are promises written above the code, and this holds it to
     them.

     Its own scene, its own board, its own stores. */
  window.orderSweep = function () {
    const V = window.__v, fails = [];
    const scene = () => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.goalIdx = V.GOALS.length; V.away = null; V.goalDone = null; V.finished = null;
      V.panel = null; V.sel = null; V.barMode = 'build'; V.tutSeen.length = 0;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      V.res.wood = 1e6; V.res.food = 1e6;
      const L = V.landBounds();
      for (const [k, dc, dr] of [['house', 1, 1], ['store', 10, 10], ['farm', 1, 5],
                                 ['lumber', 4, 5], ['market', 7, 1]]) V.place(k, L.lo + dc, L.lo + dr);
      for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
      for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2;
      V.orders = [];
      let guard = 0;
      while (V.orders.length < V.orderSlots() && guard++ < 50) { V.orderT = 1e6; V.step(1 / 30); }
      for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2;
      return V.orders.length;
    };

    /* Filling one leaves every other card exactly where it was, and leaves the
       stall empty. They used to slide left, so a quick second tap where the
       first card had been traded on a different offer. */
    {
      const n = scene();
      if (n < 3) fails.push('the sweep could only get ' + n + ' offers onto the board');
      else {
        const before = V.orders.map(o => ({ id: o.id, slot: o.slot }));
        const victim = V.orders.find(o => V.canFill(o));
        if (!victim) fails.push('no offer on a half-full village could be filled, so nothing was proved');
        else {
          const slot = victim.slot;
          V.fillOrder(victim);
          V.orderRects();                       // the draw path, which reseats
          for (const b of before) {
            if (b.id === victim.id) continue;
            const now = V.orders.find(o => o.id === b.id);
            if (!now) fails.push('filling one offer removed another from the board');
            else if (now.slot !== b.slot) fails.push('filling one offer moved another from stall ' + b.slot + ' to ' + now.slot);
          }
          if (V.orders.some(o => o.slot === slot)) fails.push('a filled stall was taken over instead of being left empty');
        }
      }
    }

    /* An offer the player can act on is never pulled out from under them --
       and nor is the one they are saving up for, which is the half that was
       not kept.

       Saving up means one unit short, and it has to mean that for the WHOLE
       run. The first version of this started the player at ten and added one a
       second, so for the first several hundred seconds they were nowhere near
       the offer being protected -- and the replacement picks the offer the
       player is furthest from, by share of what it asks. Whenever the biggest
       tier happened to land in slot 0 the trader took it, correctly, and the
       checker called it a failure: measured at 57s with 67 food against the
       435 the offer wanted, 85 per cent short and the worst on a board of
       four. One run in five, decided by which tier the board dealt first.

       So: the SMALLEST offer on the board is the one saved for, because that
       is the one a player is realistically closest to, and the purse is put
       one short of it at the start and held there. Nothing else is affordable,
       so the board cannot stand down and the replacement really runs; and the
       offer is moved to the front of the list as well, because the front is
       what the old code always took and the case has to be able to catch
       that. */
    {
      const n = scene();
      if (n < 3) fails.push('the saving-up check could only get ' + n + ' offers onto the board');
      else {
        let savingFor = V.orders[0];
        for (const o of V.orders) if (o.giveN < savingFor.giveN) savingFor = o;
        V.orders = [savingFor, ...V.orders.filter(o => o !== savingFor)];
        const giveK = savingFor.giveK, getK = savingFor.getK;
        const purse = () => { V.res[giveK] = savingFor.giveN - 1; V.res[getK] = V.caps[getK] / 2; };
        purse();
        const startIds = V.orders.map(o => o.id);
        if (V.orders.some(o => V.canFill(o)))
          fails.push('the saving-up check left an offer fillable, so the board stands down and nothing is proved');
        let gone = null;
        for (let s2 = 0; s2 < 600 && gone === null; s2++) {
          for (let i = 0; i < 30; i++) V.step(1 / 30);
          purse();                       // one short, and held there: saving up
          if (!V.orders.includes(savingFor)) gone = s2;
        }
        if (gone !== null) fails.push('the offer the player was saving for was taken by a trader after ' + gone + 's');
        /* And the board did not seize up instead: something else must have
           turned over, or the fix would just be a dead board. */
        const churn = V.orders.filter(o => !startIds.includes(o.id)).length;
        if (!churn) fails.push('nothing on the board changed in ten minutes, so it is stuck rather than protected');
      }
    }

    /* And a board with something fillable on it is never disturbed at all. */
    {
      const n = scene();
      if (n < 3) fails.push('the settled-board check could only get ' + n + ' offers onto the board');
      else if (!V.orders.some(o => V.canFill(o))) fails.push('the settled-board check had nothing fillable to protect');
      else {
        const ids = V.orders.map(o => o.id).join(',');
        for (let s2 = 0; s2 < 600; s2++) {
          for (let i = 0; i < 30; i++) V.step(1 / 30);
          for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2;
        }
        if (V.orders.map(o => o.id).join(',') !== ids)
          fails.push('a board with an offer the player could take was changed under them');
      }
    }
    return { cases: 3, fails };
  };

  window.allSweeps = async function (opts) {
    const o = opts || {}, rounds = o.rounds === undefined ? 12000 : o.rounds;
    const arcMinutes = o.arcMinutes === undefined ? 90 : o.arcMinutes;
    const jobs = [
      ['unit', () => window.unitSweep()],
      ['hidden', () => window.hiddenSweep()],
      ['paint', () => window.paintSweep()],
      ['sound', () => window.soundSweep()],
      ['hint', () => window.hintSweep()],
      ['gesture', () => window.gestureSweep()],
      ['back', () => window.backSweep()],
      ['reach', () => window.reachSweep()],
      ['scaffold', () => window.scaffoldSweep()],
      ['handover', () => window.handoverSweep()],
      ['promise', () => window.promiseSweep()],
      ['moveLabel', () => window.moveLabelSweep()],
      ['framing', () => window.framingSweep()],
      ['badgeOverlap', () => window.badgeOverlapSweep()],
      ['badge', () => window.badgeSweep()],
      ['tray', () => window.traySweep()],
      ['strip', () => window.stripSweep()],
      ['full', () => window.fullSweep()],
      ['road', () => window.roadSweep()],
      ['charm', () => window.charmSweep()],
      ['floor', () => window.floorSweep()],
      ['clock', () => window.clockSweep()],
      ['order', () => window.orderSweep()],
      ['tap', () => window.tapSweep()],
      ['text', () => window.textSweep()],
      ['contrast', () => window.contrastSweep()],
      ['backing', () => window.backingSweep()],
      ['corrupt', () => window.corruptSweep()],
      ['save', () => window.saveSweep()],
      ['fuzz', () => window.fuzz(rounds, false)],
      ['fuzzPop', () => window.fuzz(rounds, true)],
      ['arc', () => window.arcSweep(arcMinutes)],
    ];
    /* Anything that counts as a complaint, whatever the sweep calls it. A new
       sweep reporting failures under a name nobody listed here would be read
       as clean, so the shape is checked too. */
    const complaints = r => {
      if (typeof r === 'string') return r;
      const n = (r.fails && r.fails.length) || r.overflowing || r.failing || r.overlaps
        || r.cropped || r.mismatched || r.conflicts || r.unplayable || r.diffs || 0;
      return n || 0;
    };
    const detail = {}, failed = [];
    for (const [name, fn] of jobs) {
      try { detail[name] = await fn(); } catch (e) { detail[name] = 'THREW ' + (e && e.message); }
      const bad = complaints(detail[name]);
      if (bad) failed.push(name + ': ' + (typeof bad === 'string' ? bad : bad));
      await new Promise(r => setTimeout(r, 20));
    }
    /* Every checker in the harness is in the list above. The game itself has a
       top-level ptrSweep() -- stale pointer records, nothing to do with
       testing -- and script-level function declarations land on window, so it
       is named here rather than silently matched away. Anything else ending in
       Sweep is a checker somebody added and forgot to list, which is the whole
       point of asking. */
    const NOT_CHECKERS = new Set(['ptr', 'all']);
    const listed = new Set(jobs.map(j => j[0]));
    const unrun = Object.keys(window)
      .filter(k => /Sweep$/.test(k) && typeof window[k] === 'function')
      .map(k => k.replace(/Sweep$/, ''))
      .filter(k => !listed.has(k) && !NOT_CHECKERS.has(k));
    if (unrun.length) failed.push('never run by allSweeps: ' + unrun.join(', '));
    // and the reverse: a name in the list that no longer exists
    const missing = jobs.map(j => j[0]).filter(k => k !== 'fuzz' && k !== 'fuzzPop'
      && typeof window[k + 'Sweep'] !== 'function');
    if (missing.length) failed.push('listed but gone: ' + missing.join(', '));
    return { ran: jobs.length, failed, arc: detail.arc && detail.arc.goals,
      fuzzRounds: rounds * 2, detail };
  };
  console.log('textSweep ready: window.textSweep(), window.contrastSweep(), window.backingSweep(), window.saveSweep(), window.allSweeps(), window.paintSweep(), window.soundSweep(), window.unitSweep(), window.reachSweep(), window.scaffoldSweep(), window.handoverSweep(), window.promiseSweep()');
})();
