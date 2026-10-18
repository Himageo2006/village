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
  /* Strict, so that a mistake this file has already made once cannot be made
     again quietly.

     placed is exported with a getter and no setter. Outside strict mode,
     "V.placed = V.placed.filter(...)" is accepted, discarded, and leaves the
     sweep measuring a village it believes it has changed -- which is how a
     line in promiseSweep spent its whole life claiming to take a well out of
     the ground without ever doing it. In here the same line throws. */
  'use strict';
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
    ['no negative resources', () => V.RES.every(k => V.res[k] >= 0)],
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
      for (const k of V.RES) {
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
    /* Bounded by what the building can hold: a workplace's two loads, well
       under ten thousand -- and for the beacon, the stage it is filling, which
       is 48,000 at the fourth. Bounded at ten thousand for everything, this
       would have failed the first random village to raise a beacon that far,
       for doing exactly what it says. */
    ['stock never goes negative or runs away', () => V.placed.every(p =>
      p.stock === undefined || (p.stock >= -1e-6 && p.stock < (p.key === V.BEACON
        ? Math.max(...V.BEACON_NEED) : 1e4)))],
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
    /* A workplace never has a whole load standing about.

       This is not the rule the source states. Beside the constant: "a
       workplace stops filling once it has this much waiting", with the ceiling
       at two loads. Measured over a hundred and sixty thousand post-steps of a
       busy village -- five houses, thirty villagers, four hands to a post --
       the most any workplace ever held was 7.997 of a load of 8, and not once
       did anything reach a whole one. The stated ceiling is twice a number
       that cannot reach itself.

       The reason is in stepVillagers: a post only produces while somebody is
       STANDING at it, and that same somebody takes a load away the instant
       there is one. Nobody there, nothing made; somebody there, nothing
       waits. So STOCK_MAX never binds, which is why taking it from two loads
       to six changes nothing a sweep can see, and the battery was right to
       stay quiet about it.

       It is pinned here rather than left as an observation because the whole
       delivery model rests on it. deliveredOf says "a worker waits L/rate for
       a load to be ready and then walks it", and every rate the interface
       quotes is worked out from that one sentence. The day a post is allowed
       to make something while nobody is there -- which is an entirely
       reasonable thing to want -- the stock starts to pile up, the wait is no
       longer L/rate, and every quoted figure in the game quietly becomes
       wrong. This fires on the first step of that change. */
    ['a workplace never holds a whole load waiting', () => V.placed.every(q =>
      !(q.stock > V.CARRY + 1e-6))],
    /* And a store the cache still believes in must be where it says it is:
       moving one changes no membership at all, only a position. */
    ['a cached store is where it stands', () => V.stores().every(p => {
      const b = V.B(p.key), c = V.tileToWorld(p.c + (b.w - 1) / 2, p.r + (b.h - 1) / 2);
      return V.nearestStore(c.x, c.y) !== null;
    })],
  ];

  let prev = {};
  /* Filled just before every step, read by the idle rule just after it. */
  let carriedBefore = new Set();
  function check(what) {
    for (const [name, f] of INVARIANTS) {
      let ok;
      try { ok = f(what); } catch (e) { return name + ' threw: ' + e.message + ' (after ' + what + ')'; }
      if (!ok) return name + ' (after ' + what + ')';
    }
    prev = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
    return null;
  }

  const W = 1024, H = () => document.querySelector('canvas').height;

  /* Start from a village that is actually WORKING. Random tapping on its own
     never gets houses finished, so a run that begins from bare ground checks
     every invariant about workforces, stock and delivery against an empty
     island and reports a confident pass. */
  function seed() {
    V.landTier = 2; V.placed[0].lvl = 4;
    for (const kAll of V.RES) V.grant(kAll, 9000, 0, 0);
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
      res: Object.fromEntries(V.RES.map(k => [k, Math.round(Math.min(V.res[k], V.caps[k]))])),
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
    /* The quarry goes in front of the mill, because the mill is built of what
       it makes. A policy that does not know that never gets past hall three. */
    const ORDER = ['house', 'lumber', 'farm', 'house', 'store', 'well', 'farm',
                   'quarry', 'mill', 'house', 'store', 'market', 'farm', 'lumber',
                   'well', 'quarry', 'mill', 'house', 'store', 'market'];
    const budget = maxMinutes * 60 * 30;
    /* Every kind of goods in the price, not two of them. A mill is built of
       wood and stone now: read as wood and food alone it looked free, the
       policy tried to build one on an empty stone pile every tick for ninety
       simulated minutes, and the playthrough stopped at goal nineteen. */
    const afford = c => Object.entries(c).every(([k, v]) => (v || 0) <= V.res[k]);
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
      for (const k of V.RES) {
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
    /* Past the ladder counts as past it, not as a bigger numerator. A run
       that reaches the generated goals reports "23/23 +1" rather than
       "24/23", which read like the arc had found a goal nobody wrote. */
    const over = Math.max(0, V.goalIdx - V.GOALS.length);
    return { goals: Math.min(V.goalIdx, V.GOALS.length) + '/' + V.GOALS.length + (over ? ' +' + over : ''),
      hall: V.hallLevel(), land: V.landTier,
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
      for (const kAll of V.RES) V.grant(kAll, 9999, 0, 0);
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
      negativeRes: JSON.stringify({ ...o, res: { wood: -500, food: -9e9, stone: -3 } }),
      hugeRes: JSON.stringify({ ...o, res: { wood: 1e12, food: Number.MAX_VALUE, stone: 1e300 } }),
      nanRes: JSON.stringify({ ...o, res: { wood: 'lots', food: null, stone: 'some' } }),
      placedNotArray: JSON.stringify({ ...o, placed: 'nope' }),
      placedGarbage: JSON.stringify({ ...o, placed: [{ key: 'dragon', c: 99, r: -5, lvl: 99 }, null, 42] }),
      badLand: JSON.stringify({ ...o, land: 999 }),
      badGoal: JSON.stringify({ ...o, goal: -7 }),
      ordersGarbage: JSON.stringify({ ...o, orders: [{ giveK: 'gold', giveN: NaN }, 'x'] }),
      versionFromFuture: JSON.stringify({ ...o, v: 999 }),
      tilesOffTheMap: JSON.stringify({ ...o, placed: o.placed.map(p => ({ ...p, c: -40, r: 80 })) }),
      everythingOnOneTile: JSON.stringify({ ...o, placed: o.placed.map(p => ({ ...p, c: 7, r: 7 })) }),
      landShrunkUnderTheVillage: JSON.stringify({ ...o, land: 0 }),
      sharedGarbage: JSON.stringify({ ...o, shared: { wood: -5, food: 'lots', stone: -7 } }),
      sharedHuge: JSON.stringify({ ...o, shared: { wood: 1e300, food: NaN, stone: 'heaps' } }),
      /* The goods that were in villagers' hands. Read at boot and handed back,
         so a damaged figure here is a damaged figure added straight to the
         stores -- the one save field that pays out on load. */
      transitGarbage: JSON.stringify({ ...o, transit: { wood: -500, food: 'lots', stone: -9 } }),
      transitHuge: JSON.stringify({ ...o, transit: { wood: 1e12, food: Infinity, stone: 1e12 } }),
      transitNotAnObject: JSON.stringify({ ...o, transit: [1, 2, 3] }),
    };
    const bad = [], kept = {};
    for (const [name, raw] of Object.entries(cases)) {
      try {
        localStorage.setItem(V.KEY, raw); localStorage.removeItem(V.KEY_BAK);
        V.placed.length = 0; V.villagers.length = 0; V.orders = [];
        for (const k of V.RES) V.res[k] = 0; V.res.wood = 60; V.res.food = 40; V.landTier = 0; V.goalIdx = 0; V.ordersDone = 0;
        V.sharedTotal = Object.fromEntries(V.RES.map(k => [k, 0]));
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
        /* Every kind. Written as wood and food, a damaged stone figure was never
           put in front of load() at all, so nothing said whether it was refused. */
        for (const k of V.RES)
          if (!Number.isFinite(V.res[k]) || V.res[k] < 0 || V.res[k] > V.caps[k] + 1) why.push(k + ' out of range');
        if (V.villagers.length < 1) why.push('nobody alive');
        if (!V.placed.every(q => V.B(q.key))) why.push('unknown building key');
        for (const k of V.RES)
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
    const put = k => { for (const kAll of V.RES) V.grant(kAll, 99999, 0, 0);
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); };
    for (const k of ['house', 'house', 'store', 'farm', 'farm', 'lumber', 'lumber', 'mill']) put(k);
    /* One workplace in the far corner, so the "losing it to the walk" badge has
       something to appear on. */
    for (const kAll of V.RES) V.grant(kAll, 99999, 0, 0);
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

    /* ---- and how BIG they come out, which was being asked tautologically ----

       The badges were held to the readable floor like this:

         onScreen = BADGE_TEXT_PX * badgeScale() * camScale()

       and badgeScale() is itself `clamp * TEXT_MIN / BADGE_TEXT_PX`, so the
       constant divides out of its own test and the line reduces to
       `TEXT_MIN * clamp * camScale >= TEXT_MIN`. It was checking the clamp.
       Take BADGE_TEXT_PX from 19 to 48 and every badge in the village shrinks
       to two fifths while that line reports the same number.

       Worse, it assumed every badge string is drawn at BADGE_TEXT_PX units.
       None of them is. The four are 15, 19, 20 and 23, and the 15 -- the tick
       that says the hall can grow -- came out at 20.5 logical pixels where the
       floor is 26.

       So the sizes are READ rather than worked out: the font the game actually
       set, times the transform actually in force, at the two ends of the pinch
       range. Which strings have to clear the floor is answered structurally,
       the way backingSweep answers which strings have a pill. A label that is
       counter-scaled barely changes size when the camera moves -- it is drawn
       that way precisely so it stays legible -- while a thing belonging to the
       world grows with the world. Measured here: the badges move by a factor
       of 1.21 across the whole pinch range and the icon over a villager's head
       moves by 4.0, which is the zoom range itself. The one is a label and is
       held to the floor; the other is a basket a villager is carrying, and it
       is right that it shrinks along with the villager carrying it.

       POP_PX is the one of the pair that really is a free choice: a delivery
       pop is drawn at POP_PX units and then scaled by BADGE_TEXT_PX / POP_PX,
       so the unit cancels against itself and only the pop's rise and its
       outline are measured in it. Moving it changes nothing a reader could
       name, which is why nothing here holds it. */
    const sizes = new Map();
    const sizeScan = tag => {
      const o = ctx.fillText.bind(ctx);
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform(), str = String(t).trim();
        const hit = /([0-9.]+)px/.exec(ctx.font);
        const inWorld = Math.abs(m.a - 1) > 1e-6 || Math.abs(m.e) > 1e-6;
        if (hit && str.length && inWorld) {
          const key = str.slice(0, 10) + ' @' + hit[1] + 'u';
          const px = +(hit[1] * m.a).toFixed(2);
          const row = sizes.get(key) || { key, lo: Infinity, byZoom: {} };
          if (px < row.lo) row.lo = px;
          /* Kept per zoom, not as one high-water mark. A string that happens
             to be drawn at only some of the zooms -- the icon over a
             villager's head is there only while somebody is carrying -- would
             otherwise be judged on however much of the range it was seen
             across, and a world thing seen across half the range looks as
             still as a label. */
          const z = row.byZoom[tag];
          if (z === undefined || px < z) row.byZoom[tag] = px;
          sizes.set(key, row);
        }
        return o(t, x, y, ...rest);
      };
      try { V.draw(); } finally { ctx.fillText = o; }
    };
    const keepZ2 = V.CAM.z;
    /* The ends of the pinch range and a few points between, because a clamp
       inside badgeScale means the smallest text is not always at the smallest
       zoom. Empty and full stores both: full is what puts a post to rest and
       empty is what leaves it wanting people, and the two wear different
       badges. */
    const overZoom = () => {
      for (const z of [0.55, 0.8, 1, 1.5, 2.2]) {
        V.CAM.z = z;
        for (const full of [false, true]) {
          V.res.wood = full ? V.caps.wood : 20;
          V.res.food = full ? V.caps.food : 10;
          /* A delivery pop lives a second or so, so whether one is on screen
             at the instant of a draw is luck -- and the first run of this
             block inside the full battery reported the pop unmeasured for
             exactly that reason. Waited for instead: the stores are held low
             so the village keeps handing things over, and the frame is taken
             when something has just arrived. Not with full stores, where
             nothing arrives at all and that is the point of the pass. */
          if (!full) for (let i = 0; i < 30 * 30 && !V.pops.length; i++) {
            V.step(1 / 30);
            V.res.wood = Math.min(V.res.wood, 20);
            V.res.food = Math.min(V.res.food, 10);
          }
          V.step(0.001); sizeScan(z);
        }
      }
    };
    overZoom();
    /* The village above cannot produce the "losing it to the walk" badge, and
       that badge carries the smallest text of the family. reachOf compares a
       post against the same post beside a store, so the walk only dominates
       once the post is FAST: at level one the wait for a load to be ready is
       long enough that the longest walk a tier-two island allows still comes
       out at 0.62, well clear of the half the badge wants. A level five farm in
       the far corner of a full island measures 0.49, and the badge appears. */
    V.placed.length = 0; V.villagers.length = 0;
    V.landTier = V.LAND_MAX; V.coverPlaced(); V.ensureHall(); V.placed[0].lvl = 3;
    for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0); V.step(0.001);
    {
      const L2 = V.landBounds();
      const seat = (k, fromFar) => {
        const cs = []; for (let c = L2.lo; c <= L2.hi; c++) cs.push(c);
        if (fromFar) cs.reverse();
        for (const c of cs) for (const r of cs)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        return null;
      };
      seat('house'); seat('house'); seat('house');
      seat('farm', true);
      const corner = V.placed[V.placed.length - 1];
      if (corner && corner.key === 'farm') { corner.lvl = 5; corner.t = 1; }
      seat('lumber'); seat('lumber');          // more posts than hands: one stands idle
      for (let i = 0; i < 240 * 30; i++) V.step(1 / 30);
      overZoom();
    }
    V.CAM.z = keepZ2; V.step(0.001);
    /* Above this and the string is part of the world. Measured across the two
       ENDS of the pinch range, where the two populations sit at 1.21 and 4.0,
       so anywhere between separates them; 2 is the middle of that and keeps a
       two-fold margin on each side. A string that was not drawn at both ends
       is not classified at all -- there is nothing to tell from -- and the
       named families below are what makes sure that silence is not how a
       label escapes. */
    const WORLD_GROWTH = 2, ZLO = 0.55, ZHI = 2.2;
    const sizeRows = [...sizes.values()].map(r => {
      const lo = r.byZoom[ZLO], hi = r.byZoom[ZHI];
      return { ...r, grew: lo && hi ? +(hi / lo).toFixed(2) : null };
    });
    const fails = [];
    for (const r of sizeRows.sort((a, b) => a.lo - b.lo)) {
      if (r.grew === null || r.grew > WORLD_GROWTH) continue;   // the world, or not enough to tell
      if (r.lo < V.TEXT_MIN - 0.5)
        fails.push('the badge "' + r.key + '" is drawn at ' + r.lo
          + ' logical pixels, under the ' + V.TEXT_MIN + ' every label is held to');
    }
    /* And every family was actually drawn. A badge that stops appearing takes
       its own size check with it silently, so they are named rather than
       counted. */
    const labels = sizeRows.filter(r => r.grew !== null && r.grew <= WORLD_GROWTH);
    for (const [re, what] of [[/^Lv /, 'the hall level'], [/^▲/, 'the upgrade tick'],
      [/^!/, 'the nobody-at-this-post alarm'], [/^−/, 'the lost-to-the-walk figure'],
      [/^[+]/, 'a delivery']])
      if (!labels.some(r => re.test(r.key)))
        fails.push(what + ' never drew, so nothing measured how big it comes out');

    const best = new Map();
    for (const f of found) { const k = f.text + '|' + f.colour;
      if (!best.has(k) || f.ratio < best.get(k).ratio) best.set(k, f); }
    const rows = [...best.values()].sort((a, b) => a.ratio - b.ratio);
    return { failing: rows.filter(r => r.ratio < 4.5).length, samples: found.length,
      worst: rows.slice(0, 6), fails,
      sizes: sizeRows.map(r => r.key + ' -> ' + r.lo
        + (r.grew === null ? ' (seen at one end only)'
          : r.grew > WORLD_GROWTH ? ' (world, x' + r.grew + ')' : '')) };
  };

  window.fuzz = function (rounds = 5000, populated = true) {
    const realSave = (() => { try { return localStorage.getItem(V.KEY); } catch (e) { return null; } })();
    // a throwaway village: never the player's own
    V.placed.length = 0; V.villagers.length = 0;
    for (const k of V.RES) V.res[k] = 0; V.res.wood = 120; V.res.food = 60; V.landTier = 0;
    V.goalIdx = 0; V.goalDone = null; V.orders = []; V.ordersDone = 0;
    V.panel = null; V.sel = null; V.moving = null; V.armed = null; V.sellArm = null;
    V.away = null; V.claimAsk = false;
    V.ensureHall();
    if (populated) seed();
    prev = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));

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
        else if (act === 'grant') V.grant(pick(V.RES), R(500), 0, 0);
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
          const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
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
          const paid = Object.fromEntries(V.RES.map(k => [k, V.res[k] - before[k]]));
          for (const k of V.RES) V.res[k] = before[k];
          const after = V.potentialRate();
          for (const k of V.RES) V.res[k] = before[k] + paid[k];
          for (const k of V.RES) {
            const got = paid[k];
            if (got < -1e-6) fails.push('coming back took resources away (' + k + ')');
            // the grant may only pay for the time the throttled tick did NOT
            const owed = Math.max(rate[k], after[k]) * Math.max(0, gone - simmed) + 2;
            if (got > owed) fails.push('coming back paid for time twice (' + k + ')');
          }
        }
        else if (act === 'away') {
          const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
          /* Stated as where the village ENDS UP, not as how much room there was
             when it left. The ceiling is not fixed across a stretch away: a
             storehouse left half built finishes while nobody is watching and
             raises it, and the haul is rightly clamped to the new one. Against
             the old figure this reported 96 failures on a village doing exactly
             what it should. The rule worth guarding is unchanged -- being away
             may not leave the stores over their ceiling, nor further over than
             it found them, which a sold storehouse can. */
          const over = k => V.res[k] - V.caps[k];
          const wasOver = Object.fromEntries(V.RES.map(k => [k, over(k)]));
          /* And the other direction, which nothing asked: a kind the village is
             making, with room for it, comes back with SOME of it. The two rules
             above only forbid taking and overpaying, and a stretch away that
             paid no stone at all broke neither -- twelve thousand rounds, and
             every other checker, passed it. Asked only when nothing is under
             construction, because a building finishing while away can move
             hands and change what is made, and only of a stretch long enough to
             make several of it even at the beacon's half. */
          const settled = V.placed.every(p => p.t >= 1);
          const rate = V.potentialRate();
          const secs = Math.random() * V.AWAY_MAX * 1.5;
          V.grantAway(secs);
          V.away = null;
          for (const k of V.RES) {
            const got = V.res[k] - before[k];
            if (got < -1e-6) fails.push('being away took resources away (' + k + ')');
            if (over(k) > Math.max(0, wasOver[k]) + 1e-6) fails.push('being away paid past the ceiling (' + k + ')');
            const room = V.caps[k] - before[k];
            if (settled && secs >= V.AWAY_MIN && rate[k] > 0.01 && room >= 4
                && rate[k] * Math.min(secs, V.AWAY_MAX) * 0.5 >= 4 && !(got > 0))
              fails.push('being away paid no ' + k + ' with the village making ' + rate[k].toFixed(2)
                + '/s of it and room for ' + Math.round(room));
          }
        }
        else if (act === 'reload') { const bad = roundTrip(); if (bad) fails.push(bad + ' (after ' + act + ')'); }
        else if (act === 'build') {
          // afford it, then let place() decide whether it is legal
          const b2 = pick(V.BUILDINGS.filter(x => x.key !== 'hall'));
          for (const kAll of V.RES) V.grant(kAll, 300, 0, 0);
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
          /* And what it cost is what it says it costs, every kind of it.

             Nothing asked. The only rule about the purse was that it never goes
             below zero, which a building that forgets part of its price never
             breaks -- a game that charged a mill its wood and not its sixty
             stone passed twelve thousand rounds of this soak, and every other
             checker besides. */
          const purse = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
          const put = V.place(b2.key, pc, pr);
          if (put) for (const k of V.RES) {
            const paid = purse[k] - V.res[k], want = (b2.cost && b2.cost[k]) || 0;
            if (Math.abs(paid - want) > 1e-6)
              fails.push('building a ' + b2.key + ' took ' + paid + ' ' + k + ' and it costs ' + want);
          }
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
          const fullness = () => V.RES.map(k => V.caps[k] - V.res[k] < 8).join();
          const fullBefore = q ? fullness() : '';
          if (q && V.sellBuilding(q) && house && fullness() === fullBefore) {
            const now = V.potentialRate();
            for (const k of V.RES)
              if (Math.abs(now[k] - pred[k]) > 1e-6) fails.push('selling a house predicted ' + k + ' ' + pred[k].toFixed(3) + '/s and left ' + now[k].toFixed(3));
          }
        }
        else if (act === 'upgrade') {
          const q = pick(V.placed);
          if (q) { for (const kAll of V.RES) V.grant(kAll, 400, 0, 0);
            /* Starting an upgrade must never take anything away. Storehouses,
               houses, wells and markets each lost what they gave for the length
               of the work, one at a time, and each was found separately -- this
               asks the question once for everything the village is given. */
            const gives = () => {
              const workplaces = V.producers().filter(x => x.key !== 'hall');
              return { ...Object.fromEntries(V.RES.map(k => ['cap ' + k, V.caps[k]])), homes: V.placed.reduce((n, x) => n + V.livedIn(x), 0),
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
  'use strict';
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
      /* Sampled UNDER the string, at its own baseline, before it is painted.

         Above and below is the obvious choice and it is wrong here: the tray
         stacks two cost rows 28 logical pixels apart, and half a line clear of
         one lands inside the other's emoji -- so the checker measured a label
         against its neighbour's icon and called white.

         Beside it was the second guess and it is wrong too, which took a real
         failure to see. It assumed six pixels past the end of a string is
         still the pill, "because the text is made to fit its pill". Sometimes
         it is not: the build tray divides a fixed 1024 between however many
         kinds there are, and at eight kinds a four digit price comes out 109
         logical pixels wide in a 116 pixel card. Three pixels of margin. The
         sampler stepped over the border on BOTH sides, read the sea, and
         reported salmon-on-cyan at a ratio of 1.0 for text that is sitting
         legibly on a dark brown card. A checker that cries wolf is worse than
         one that is quiet: I came within an inch of rebuilding the tray.

         There is no need to guess. This runs INSIDE fillText, before the
         glyphs go down -- so whatever is on the canvas under them right now
         is exactly the background they are about to be drawn against, pill
         and world and all. Five points across the span rather than one,
         because a pill can carry a gradient or an icon behind the words.

         The lightest is used: pale text on a dark pill fails on the light
         side first. */
      let lightest = -1, bg = null;
      for (const at of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const sx = Math.round(Math.max(0, Math.min(cv.width - 1, x0 + w * at)));
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
      for (const kAll of V.RES) V.grant(kAll, 999999, 0, 0);
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
    if (maxed) { for (const k of V.RES) V.res[k] = V.caps[k]; }
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
      for (const k of V.RES) V.res[k] = 400;
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
      for (const k of V.RES) V.res[k] = 0;
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
        for (let i = 0; i < 30; i++) { for (const k of V.RES) V.res[k] = 1e5; V.step(1 / 30); }
        const now = V.currentHint() && V.currentHint().id;
        if (now !== 'hall') fails.push('the earlier hint did not take the strip (got ' + now + '; canUpgrade ' + V.canUpgrade(V.hallOf()) + ', res ' + Math.round(V.res.wood) + '/' + Math.round(V.res.food) + ', cost ' + JSON.stringify(V.upInfo(V.hallOf()).cost) + ', gate ' + V.upInfo(V.hallOf()).gate + ', seen ' + V.tutSeen.join('|') + ')');
        else if (V.tutSeen.includes('land'))
          fails.push('a hint pushed off the strip by an earlier one was written off as read');
        else {
          // the hall hint runs its course, with the upgrade still affordable
          for (let i = 0; i < 25 * 30; i++) { for (const k of V.RES) V.res[k] = 1e5; V.step(1 / 30); }
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
        for (const k of V.RES) V.res[k] = 1e6;
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
          if (full) { for (const k of V.RES) V.res[k] = V.caps[k]; }
          else { for (const k of V.RES) V.res[k] = 0; }
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
    for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0);
    let frames = 0, drawn = 0; const bad = [];
    for (const z of [0.35, 0.5, 0.55, 0.8, 1.2, 2.2]) {
      V.CAM.z = z; V.step(0.001); V.draw(); frames++;
      /* "Big enough to read" used to be asked here, as
           BADGE_TEXT_PX * badgeScale() * camScale() >= TEXT_MIN
         -- and badgeScale() is clamp * TEXT_MIN / BADGE_TEXT_PX, so the
         constant divided out and the line was checking the clamp. It also
         assumed every badge is drawn at BADGE_TEXT_PX units, and none of them
         is. badgeSweep now reads the sizes the game actually sets off the
         canvas instead. This sweep keeps the question it is for: that no two
         of them land on top of each other. */
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
        const put = k => { for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0);
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
      for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0);
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
    /* And every label the game can put over a spot, not the few a rich village
       shows.

       The block above measures five kinds in a village with hands to spare and
       room in the barns, and the two longest labels in the game never appear
       there: "no one spare — build a house first · 🪵45" ran from -59 to 1083
       on a 1024 screen at full zoom and every check passed. A first fix
       measured those two by hand. This measures them all: six villages that
       between them produce every branch of the label -- new and short of
       hands, new and broke, a hall-two village with no stone, a rich one, a
       crowded one, a finished one with small stores -- and every building and
       ornament a player could actually pick in each, at the middle zoom and
       the closest, centred and pushed to either edge. Each label must sit on
       the glass, and the run must have met enough different labels that it
       cannot quietly shrink to the easy ones. */
    {
      const ctx = document.querySelector('canvas').getContext('2d');
      const capture = () => {
        let box = null, texts = [];
        const oF = ctx.fillText, oR = ctx.roundRect;
        ctx.roundRect = function (x, y, w, h, r) {
          if (r === 17 && (h === 34 || h === 60)) { box = { x, y, w, h, m: this.getTransform() }; texts = []; }
          return oR.apply(this, arguments); };
        ctx.fillText = function (t) { if (box && texts.length < 2) texts.push(String(t)); return oF.apply(this, arguments); };
        try { V.draw(); } finally { ctx.fillText = oF; ctx.roundRect = oR; }
        if (!box) return null;
        const m = box.m, oy = -V.screenTop();
        return { t: texts[0] || '', L: m.a * box.x + m.e, R: m.a * (box.x + box.w) + m.e,
          T: m.d * box.y + m.f - oy, B: m.d * (box.y + box.h) + m.f - oy };
      };
      const base = (hall, tier, kinds) => {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.coverPlaced();
        V.goalIdx = 0; V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null; V.orders = [];
        V.ensureHall(); V.placed[0].lvl = hall; V.placed[0].t = 1;
        const L = V.landBounds();
        for (const k of kinds) { for (const kAll of V.RES) V.res[kAll] = 9e5;
          for (let r = L.lo, done = false; r <= L.hi && !done; r++) for (let c = L.lo; c <= L.hi && !done; c++)
            if (V.canPlace(k, c, r, V.occupied())) { V.place(k, c, r); done = true; } }
        for (const q of V.placed) q.t = 1;
        for (let i = 0; i < 240; i++) V.step(1 / 30);
      };
      const states = [
        ['new, nobody spare', () => base(1, 0, ['house', 'lumber']), { wood: 200, food: 100 }],
        ['new, broke', () => base(1, 0, []), {}],
        ['hall 2, no stone', () => base(2, 1, ['house', 'house', 'house', 'lumber']), { wood: 300, food: 200 }],
        ['hall 3, rich', () => base(3, 2, ['house', 'house', 'house', 'house', 'house', 'store']), { wood: 1e5, food: 1e5, stone: 1e5 }],
        ['hall 5, crowded', () => base(5, V.LAND_MAX, ['house', 'farm', 'farm', 'lumber', 'lumber', 'quarry', 'mill', 'store']), { wood: 1e5, food: 1e5, stone: 1e5 }],
        ['finished, small stores', () => { base(5, V.LAND_MAX, ['house', 'house', 'store']); V.goalIdx = V.GOALS.length; }, null],
      ];
      const purse = p => { for (const k of V.RES) V.res[k] = p ? (p[k] || 0) : Math.floor(V.caps[k] / 2); };
      const labels = new Set();
      for (const [sw, sh] of [[375, 812], [360, 640], [768, 1024]]) {
        asScreen(sw, sh); V.step(0.001);
        for (const [name, make, p] of states) {
          make();
          for (const b of V.BUILDINGS) {
            /* What a player could pick from the tray in this village: not
               the hall, not a find (the game places those), and nothing the
               hall does not allow or has no room left for. */
            if (b.key === 'hall' || b.found || !V.unlocked(b.key) || V.atLimit(b.key)) continue;
            purse(p); V.step(0.001); V.finished = null; V.goalDone = null;
            const L = V.landBounds(); let spot = null;
            for (let r = L.lo; r <= L.hi && !spot; r++) for (let c = L.lo; c <= L.hi && !spot; c++)
              if (V.canPlace(b.key, c, r, V.occupied())) spot = [c, r];
            if (!spot) continue;
            V.barMode = b.decor ? 'decor' : 'build';
            const wpt = V.tileToWorld(spot[0], spot[1]);
            for (const z of [1, 2.2]) for (const ox of [0, -420, 420]) {
              V.CAM.z = z; V.CAM.x = wpt.x + ox / (V.CAM.base * V.CAM.z); V.CAM.y = wpt.y;
              V.sel = b.key; V.ghost = { c: spot[0], r: spot[1], fits: true, ok: true, why: null };
              V.step(0.001); V.finished = null; V.goalDone = null; purse(p);
              const q = capture();
              V.sel = null; V.ghost = null;
              if (!q) continue;
              checks++; labels.add(q.t);
              if (q.L < -1 || q.R > 1025 || q.T < V.hudTop() - 1 || q.B > V.hudBot() + 1)
                bad.push({ screen: sw + 'x' + sh, state: name, z, key: b.key, label: q.t.slice(0, 32),
                  x: [Math.round(q.L), Math.round(q.R)], y: [Math.round(q.T), Math.round(q.B)] });
            }
          }
        }
      }
      if (labels.size < 30)
        bad.push({ note: 'only ' + labels.size + ' different placement labels were drawn, so the fit of the rest was never measured' });
    }
    asScreen(keepW, keepH); V.step(0.001);
    return { checks, cropped: bad.length, worst: bad.slice(0, 5) };
  };
  /* The number a move quotes for where a building is NOW must be the number its
     panel shows. The label quoted one worker's share, half the panel's figure
     for a two-worker camp. Read off the canvas, as the player reads them.

     And the two halves of that pill have to agree with EACH OTHER.

     This block already drags every building back onto the tile it is standing
     on, because that is the one place where the answer is known without
     measuring anything: a building put back where it already is delivers what
     it already delivers, so 'X/s here' and 'now X' must be the same number.
     They were not. The probe describing the spot was built at level one --
     right for a building being bought, which is what it was written for, and
     wrong for one being moved -- while 'now' beside it quoted the real level.
     The same building, on the same pill, at two levels, and the difference is
     the whole of what the player has spent improving it.

     A level five farm with four hands read '2.02/s here   ·   now 3.49' over
     the tile it was already on. Walk it up the levels and the left figure
     never moves off 2.02 while the right climbs 2.02, 2.48, 2.87, 3.20, 3.49.

     Nothing here has to know what a level is worth. Two numbers about one
     building in one spot either match or they do not, which is a shape no
     retuning of the ladder can age -- but it only bites above level one, so
     the levels reached are counted and a run that never left level one says
     so rather than passing. */
  window.moveLabelSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const grab = re => { const got = []; const o = ctx.fillText;
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx.fillText = function (t, ...r) { if (re.test(String(t))) got.push(String(t)); return o.call(this, t, ...r); };
      try { V.draw(); } finally { ctx.fillText = o; } return got; };
    const bad = [], split = [], fails = []; let checks = 0, levelled = 0;
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
      /* The near half of the same pill, read by splitting rather than by
         matching: a pattern written into this file loses its backslashes on
         the way in, and one that matches nothing would find every pill
         agreeable and pass. */
      const here = label ? parseFloat(label) : NaN;
      if (lv && isFinite(here)) {
        if (V.lvlOf(p) > 1) levelled++;
        if (Math.abs(here - +lv[1]) > 0.011)
          split.push({ key: p.key, lvl: V.lvlOf(p), here: +here.toFixed(2), now: +lv[1], label });
      }
    }
    }
    if (!levelled)
      fails.push('every building dragged was still at level one, so the two halves of the pill '
        + 'were never asked to agree about a level the player had paid for');
    for (const q of split.slice(0, 4))
      fails.push('a level ' + q.lvl + ' ' + q.key + ' put back on the tile it is already standing on '
        + 'is quoted ' + q.here.toFixed(2) + '/s for the spot and ' + q.now.toFixed(2)
        + '/s for where it is: "' + q.label + '"');
    return { checks, levelled, mismatched: bad.length, disagreed: split.length,
      worst: bad.slice(0, 4), fails };
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
          for (const k of V.RES) V.res[k] = 1e5; V.tutSeen.length = 0;
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
        brokeTray: () => { for (const k of V.RES) V.res[k] = 0; },
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
            for (const kAll of V.RES) V.grant(kAll, 999999, 0, 0);
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
        ordersShort: () => { V.barMode = 'orders'; V.orders = [V.makeOrder(0), V.makeOrder(1), V.makeOrder(2)]; window.__keptRes = { w: V.res.wood, f: V.res.food }; for (const k of V.RES) V.res[k] = 3; },
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
        /* And with the beacon's line under the shared one, in its longest
           wording and with all three goods shared above it -- the card gained
           a row, and a row nobody draws is a row nobody measures. */
        awayBeacon: () => { V.away = { secs: 43200, capped: true, spilled: true,
          got: { wood: 8380, food: 8380, stone: 8380 }, shared: { wood: 1234567, food: 9876543, stone: 7654321 },
          beacon: { took: {}, sum: 30000, from: 3, to: 3 } }; },
        awayBeaconDone: () => { V.away.beacon = { took: {}, sum: 30000, from: 4, to: V.BEACON_STAGES }; },
        hint: () => { V.away = null; V.tutSeen.length = 0; for (const k of V.RES) V.res[k] = V.caps[k]; },
        goalBanner: () => { V.goalDone = { g: V.GOALS[V.GOALS.length - 1], got: { wood: 2500, food: 1600 }, age: 0 }; },
        /* Two warnings the player only ever sees when something has gone wrong,
           which is exactly when they must be readable, and neither had been
           drawn in a sweep before. */
        /* A villager's card, in the two shapes it comes in: somebody with a
           post, whose longest line names a trade, a building and a walk, and
           somebody with none. Added with the card, because a card no sweep
           draws is a card nothing measures -- which is how the tray's own
           shortfall rows went unseen until a contrast check tripped over
           them. */
        villager: () => { V.saveFailed = false;
          const v = V.villagers.find(x => x.job != null) || V.villagers[0];
          if (v) V.who = v.seed; },
        villagerSpare: () => {
          const v = V.villagers.find(x => x.job == null) || V.villagers[0];
          if (v) { const k = v.job; v.job = null; V.who = v.seed; window.__keptJob = { v, k }; } },
        villagerDone: () => { if (window.__keptJob) { window.__keptJob.v.job = window.__keptJob.k; window.__keptJob = null; }
          V.who = null; },
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
      // every kind, at its longest: as wood and food, stone was whatever the last checker left
      V.goalIdx = V.GOALS.length; V.sharedTotal = { wood: 1e15, food: 999999, stone: 9876543 };
      for (const p of V.placed) for (const arm of [false, true]) {
        V.panel = p.id; V.sellArm = arm ? { id: p.id, t: 4 } : null;
        found.push(...scan('panel:' + p.key + (arm ? ' armed' : '') + ' @' + h + tag));
      }
      V.panel = null; V.sellArm = null;
      V.goalIdx = keepGoal; V.sharedTotal = keepShared;
    }
    }
    /* And every building's panel, in every state that changes what it says.

       The panels above are the panels of two sweep villages, each building at
       whatever level the village gave it, and always with the village
       finished -- because that is the hall's longest line. But a panel is a
       stack of rows that change with the level, the barns and the goals: an
       unfinished village's hall names its binding constraint ("🪵 🪨 stores
       full — build a storehouse"), a workplace at the ceiling of its barn says
       why nobody is working it, an upgrade the barns cannot pay for says it
       needs another storehouse. None of those had been drawn into a panel by
       this check. So: a village with one of every kind, at levels one, three
       and five, with the barns empty, half and full, before and after the
       village is finished, on the narrowest, a tall and a wide screen -- and
       every building's panel opened in each. */
    {
      const ALL = V.BUILDINGS.filter(b => b.key !== 'hall' && !b.found && b.key !== V.BEACON).map(b => b.key);
      for (const [sw, sh] of [[320, 960], [360, 640], [375, 812], [768, 1024]]) {
        asScreen(sw, sh); V.step(0.001);
        V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
        V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null; V.orders = [];
        V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
        V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
        const L = V.landBounds();
        for (const k of ALL) { for (const kAll of V.RES) V.res[kAll] = 9e5;
          for (let r = L.lo, done = false; r <= L.hi && !done; r++) for (let c = L.lo; c <= L.hi && !done; c++)
            if (V.canPlace(k, c, r, V.occupied())) { V.place(k, c, r); done = true; } }
        for (const lvl of [1, 3, 5]) {
          /* Levels set, then finished the game's own way so the barns, the
             houses and the posts all follow -- caps are only worked out when
             a building comes out of its scaffolding. */
          for (const q of V.placed) { if (q.key !== 'hall' && !V.isDecor(q.key)) q.lvl = Math.min(V.LVL_MAX, lvl); q.t = 0.999; q.build = 0.01; }
          for (let i = 0; i < 6; i++) V.step(1 / 30);
          for (let i = 0; i < 90; i++) V.step(1 / 30);
          for (const finished of [false, true]) for (const fill of [0, 0.5, 1]) {
            V.goalIdx = finished ? V.GOALS.length : 0;
            /* The hall of a finished village reports what it has shipped, in
               every kind -- set at its longest rather than inherited, or the
               verdict depends on what the checkers before this one shipped.
               It did: alone this passed, in the battery it found the hall's
               three-kind line out of its panel. */
            V.sharedTotal = finished ? { wood: 1e15, food: 999999, stone: 9876543 } : { wood: 0, food: 0, stone: 0 };
            V.goalDone = null; V.finished = null; V.away = null;
            for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
            V.step(0.001); V.goalDone = null; V.finished = null;
            for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
            for (const p of V.placed) {
              V.panel = p.id; V.sellArm = null;
              found.push(...scan('panel:' + p.key + ' L' + lvl + (finished ? ' finished' : '') + ' fill ' + fill + ' @' + sw + 'x' + sh));
            }
          }
        }
        V.panel = null; V.goalIdx = 0;
      }
      V.sharedTotal = { wood: 0, food: 0, stone: 0 };
    }
    /* And every goal on the strip, and every ring on the claim card.

       The strip above is whatever goal the sweep villages happen to be on, and
       one purchase goal set by hand; the claim card is drawn once. But the
       strip's line is built from the goal -- its wording, a count, a reward or
       what is still short -- and the claim card from the ring's price against
       the barns, short, affordable or more than they can hold. So each goal in
       the ladder and the first stretch past it, and each ring of land, with
       the barns empty, half and full. */
    {
      const PAST = 8;
      for (const [sw, sh] of [[320, 960], [360, 640], [375, 812], [768, 1024]]) {
        asScreen(sw, sh); V.step(0.001);
        V.placed.length = 0; V.villagers.length = 0; V.landTier = 1; V.coverPlaced();
        V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null; V.orders = [];
        V.claimAsk = false; V.barMode = 'build';
        V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
        V.ensureHall(); V.placed[0].lvl = 3; V.placed[0].t = 1;
        V.sharedTotal = { wood: 123456, food: 7654321, stone: 98765 };
        for (let gi = 0; gi < V.GOALS.length + PAST; gi++) for (const fill of [0, 0.5, 1]) {
          V.goalIdx = gi; V.goalDone = null; V.finished = null;
          for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
          V.step(0.001); V.goalDone = null; V.finished = null; V.away = null;
          V.goalIdx = gi;
          for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
          found.push(...scan('goal ' + gi + ' fill ' + fill + ' @' + sw + 'x' + sh));
        }
        V.goalIdx = 0;
        for (let tier = 0; tier < V.LAND_MAX; tier++) for (const fill of [0, 0.5, 1]) {
          V.landTier = tier; V.claimAsk = true;
          for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
          V.step(0.001); V.goalDone = null; V.finished = null; V.claimAsk = true;
          for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
          found.push(...scan('claim ring ' + (tier + 1) + ' fill ' + fill + ' @' + sw + 'x' + sh));
        }
        V.claimAsk = false; V.landTier = 1;
      }
      V.sharedTotal = { wood: 0, food: 0, stone: 0 }; V.goalIdx = 0;
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
      for (const kAll of V.RES) V.grant(kAll, 9999, 0, 0);
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
              for (const k of V.RES) V.res[k] = 0; V.step(0.001); take();
              V.res.wood = keepRes.wood; V.res.food = keepRes.food;
              V.ghost = null; V.sel = null;
              // a half-empty board: its countdown and empty stalls, never measured before
              { const keepO = V.orders; V.barMode = 'orders'; V.orders = [V.makeOrder(1)]; V.orderT = 0;
                V.step(0.001); take();
                // and the same stalls when nothing can be paid for: the red "need" line
                const kw = V.res.wood, kf = V.res.food; for (const k of V.RES) V.res[k] = 3; V.step(0.001); take();
                V.res.wood = kw; V.res.food = kf; V.orders = keepO; }
              for (const q of [V.placed[0], V.placed[5], V.placed[7]]) {
                if (!q) continue; V.panel = q.id; V.step(0.001); take();
              }
              V.panel = null;
              /* The villager card sits where the panel sits and is read over
                 the same moving world, so it needs the same treatment. */
              for (const pick of [x => x.job != null, x => x.job == null]) {
                const v = V.villagers.find(pick);
                if (!v) continue;
                V.who = v.seed; V.step(0.001); take();
              }
              V.who = null;
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
      for (const kAll of V.RES) V.grant(kAll, 99999, 0, 0);
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
                           for (const k of V.RES) V.res[k] = V.caps[k]; }],
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
      /* null is an object to typeof and not one to Object.keys, so a field
         that is an object on one side and null on the other walked straight
         past the type check and threw on the next line -- taking the whole
         sweep down with "Cannot convert undefined or null to object" and
         reporting nothing about the field that did it. Latent for as long
         as this has existed; the first nullable field in a save found it. */
      if (x === null || y === null) {
        if (x !== y) d.push({ at: p, was: x, now: y });
        return;
      }
      if (typeof x === 'object') {
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
      for (const kAll of V.RES) V.grant(kAll, 99999, 0, 0);
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

    /* A village written by another build of the game.

       usableSave wants the version to match exactly, which is right: this
       build does not know what a v3 placed array means. What it must not do
       is throw the file away. It used to: load gave up, the game started
       empty, the first autosave wrote the empty village over the file, and
       the backup went with it inside the minute -- promotion copies the
       primary whenever the primary is readable, and an empty village is
       perfectly readable. Seven buildings on disk, both copies gone in under
       a minute, and not a word on screen.

       The version has moved three times already, so a fourth is likely, and
       after this ships a fourth would do that to somebody who had played for
       hours. Now it is set aside and the player is told. */
    {
      const keepOther = (() => { try { return localStorage.getItem(V.KEY_OTHER); } catch (e) { return null; } })();
      const cv2 = document.querySelector("canvas"), ctx2 = cv2.getContext("2d");
      const notice = () => {
        V.step(0.001);
        const rows = [], o = ctx2.fillText;
        ctx2.fillText = function (t2, ...a) { rows.push(String(t2)); return o.call(this, t2, ...a); };
        try { V.draw(); } finally { ctx2.fillText = o; }
        return rows.join(" ");
      };
      const coldStart = () => {
        V.placed.length = 0; V.villagers.length = 0; V.orders.length = 0;
        V.away = null; V.goalDone = null; V.finished = null; V.otherBuild = 0;
        /* A cold start has not restored anything from a backup either. The block
           above this one leaves that flag set, and the notice shows one message
           at a time -- so without this the screen says "restored from a backup"
           and the check reads it as having said nothing about the version. */
        V.loadedFromBackup = false; V.saveFailed = false;
        V.load(); V.landTransit(); V.step(0.001);
      };
      try {
        buildVillage(RICH);
        V.save();
        const mine = JSON.parse(localStorage.getItem(V.KEY));
        const had = mine.placed.length;
        if (had < 3) bakFails.push("the other-build check had only " + had + " buildings to lose");
        else {
          /* One version back, which is what an update looks like from the
             file's side. */
          const older = JSON.stringify({ ...mine, v: V.SAVE_V - 1 });
          for (const k of [V.KEY, V.KEY_BAK]) localStorage.setItem(k, older);
          try { localStorage.removeItem(V.KEY_OTHER); } catch (e) {}
          coldStart();
          if (V.placed.length > 1)
            bakFails.push("a save from another build was loaded as if this build understood it");
          const said = notice();
          if (said.indexOf("another version") < 0)
            bakFails.push("a village from another build was found and the screen said nothing about it");
          /* A minute of play and a run of saves, which is what used to eat it. */
          for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
          for (let i = 0; i < V.BACKUP_EVERY * 3; i++) V.save();
          const kept = (() => { try { return JSON.parse(localStorage.getItem(V.KEY_OTHER)); } catch (e) { return null; } })();
          if (!kept || !Array.isArray(kept.placed) || kept.placed.length !== had)
            bakFails.push("a village from another build was not kept through a minute of play");
          else {
            /* And the next time the app opens, which is when the empty
               village would overwrite the one being kept safe. */
            const before = localStorage.getItem(V.KEY_OTHER);
            coldStart();
            for (let i = 0; i < V.BACKUP_EVERY * 3; i++) V.save();
            if (localStorage.getItem(V.KEY_OTHER) !== before)
              bakFails.push("the village being kept safe was overwritten the second time the game started");
          }
          /* And a save that is not a village is not worth keeping: there is
             nothing in it to bring back, and storage is not free. */
          try { localStorage.removeItem(V.KEY_OTHER); } catch (e) {}
          for (const k of [V.KEY, V.KEY_BAK]) localStorage.setItem(k, "{\"v\":3,\"placed\":\"none\"}");
          coldStart();
          if (localStorage.getItem(V.KEY_OTHER))
            bakFails.push("a save with no village in it was kept as if it were one");
          /* And an ordinary, current save says nothing and keeps nothing. */
          try { localStorage.removeItem(V.KEY_OTHER); } catch (e) {}
          for (const k of [V.KEY, V.KEY_BAK]) localStorage.setItem(k, JSON.stringify(mine));
          coldStart();
          if (V.otherBuild)
            bakFails.push("an ordinary save was taken for one from another build");
          if (localStorage.getItem(V.KEY_OTHER))
            bakFails.push("an ordinary save was set aside as if this build could not read it");
        }
      } finally {
        V.otherBuild = 0;
        try { if (keepOther !== null) localStorage.setItem(V.KEY_OTHER, keepOther);
          else localStorage.removeItem(V.KEY_OTHER); } catch (e) {}
      }
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
        for (const k of V.RES) V.res[k] = 1e5;
        const LB = V.landBounds();
        for (const [key, dc, dr] of [['house', 1, 1], ['farm', 4, 1], ['lumber', 7, 1], ['store', 1, 10]])
          V.place(key, LB.lo + dc, LB.lo + dr);
        for (const q of V.placed) { q.t = 1; q.build = 0; }
        V.placed.find(q => q.key === 'house').lvl = 3;             // hands enough to work both posts
        V.rebuildStores();
        for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
        /* One of each kind of unfinished work: a building going up for the
           first time, and a building being improved. */
        for (const k of V.RES) V.res[k] = 1e5;
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
        for (const k of V.RES) V.res[k] = 1e6;
        for (const k of ['house', 'house', 'house', 'farm', 'lumber', 'store', 'mill']) put(k);
        for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
        for (const k of V.RES) V.res[k] = 1e6;
        for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);     // and the levels land through a real finish
        for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * fill);
      };
      for (const [name, finished, fill, secs] of [
        ['an hour away with room to spare', false, 0.2, 3600],
        ['an hour away with the stores nearly full', false, 0.97, 3600],
        ['away longer than a village can bank', false, 0.2, 40 * 3600],
        ['back inside the minute', false, 0.5, 45],
        ['a finished village, an hour away', true, 0.9, 3600],
      ]) {
        scene(finished, fill);
        const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
        const sharedBefore = Object.fromEntries(V.RES.map(k => [k, V.sharedTotal[k] || 0]));
        V.away = null;
        V.grantAway(secs);
        const card = V.away;
        const got = Object.fromEntries(V.RES.map(k => [k, V.res[k] - before[k]]));
        const shared = Object.fromEntries(V.RES.map(k => [k, V.sharedTotal[k] - sharedBefore[k]]));
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
        for (const k of V.RES) {
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
          for (const k of V.RES) {
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
        const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
        V.away = null;
        V.grantAway(5);
        if (V.away) fails.push('shutting the game and opening it again put a welcome-back card up');
        if (V.RES.reduce((n, k) => n + V.res[k] - before[k], 0) > 0.01)
          fails.push('shutting the game and opening it again paid the village '
            + V.RES.reduce((n, k) => n + V.res[k] - before[k], 0).toFixed(1));
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
  window.soundSweep = async function () {
    const V = window.__v, fails = [];
    V.audioOn();
    const actx = V.actx;
    if (!actx) return { skipped: 'this browser gave no audio context', fails };
    const keepMute = V.muted; V.muted = false;
    const co = actx.createOscillator.bind(actx);
    let made = 0;
    actx.createOscillator = () => { made++; return co(); };
    const say = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
    /* Asked of the game rather than written down here. This used to ring five
       of them by name -- tap, place, deny, upgrade, done -- and the game has
       eight: deliver, sell and goal went unrung for as long as the sweep
       existed. They all go through tone(), which is where the guard lives, so
       the five were covering the other three by accident; the day somebody
       adds a sound that makes its own oscillator, the accident stops. Reading
       the list off SFX means a ninth is tested the moment it is written. */
    const names = Object.keys(V.SFX);
    const per = {};
    /* The village is emptied and left to go quiet first, and it is deliver that
       needs it. That one is throttled to a tone every 220 milliseconds, and the
       throttle belongs to the game rather than to this sweep: run inside the
       battery, with a busy village handing things over several times a second,
       every ring of ours landed inside a window the game itself had just
       opened, and the sweep reported the game's most frequent sound as silent.
       No buildings, no deliveries, and a moment for the last one to age out. */
    V.placed.length = 0; V.villagers.length = 0; V.step(0.001);
    await new Promise(r => setTimeout(r, 300));
    try {
      for (const n of names) {
        /* Even in a quiet village deliver swallows a second ring inside its own
           window, so it is given a few tries with a breath between them. The
           hidden side has to be silent on every one of them. */
        const tries = n === 'deliver' ? 3 : 1;
        let hidden = 0, heard = 0;
        for (let i = 0; i < tries; i++) {
          if (i) await new Promise(r => setTimeout(r, 260));
          say(true);  made = 0; V.SFX[n](); hidden += made;
          /* A breath between the two rings, not only between the tries. The
             throttle is stamped BEFORE the sound is suppressed -- deliver
             records the time and then tone() returns because the page is
             hidden -- so the hidden ring shuts the window on the visible one
             standing right behind it, and the sound looks dead every time. */
          if (tries > 1) await new Promise(r => setTimeout(r, 260));
          say(false); made = 0; V.SFX[n](); heard = Math.max(heard, made);
        }
        per[n] = { hidden, heard };
        if (hidden > 0)
          fails.push('a hidden page queued ' + hidden + (hidden === 1 ? ' tone of ' : ' tones of ')
            + n + ', which nobody can hear');
        if (heard < 1)
          fails.push(n + ' made no sound at all on a visible page');
      }
      if (names.length < 5)
        fails.push('only ' + names.length + ' sounds were found, so the check proves little');
    } finally {
      delete document.hidden;
      actx.createOscillator = co; V.muted = keepMute;
    }
    const sum = k => names.reduce((n2, x) => n2 + per[x][k], 0);
    return { sounds: names.length, hidden: sum('hidden'), visible: sum('heard'), per, fails };
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
      for (const k of V.RES) V.res[k] = 1e5;
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
      for (const k of V.RES) V.res[k] = 1e5;
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
      for (const k of V.RES) V.res[k] = 1e5;
      if (!V.canUpgrade(p)) continue;
      V.upgradeBuilding(p);
      p.build = 1e7;                     // the scaffolding stays up to be measured against
      V.goalIdx = V.GOALS.length;        // no reward may arrive and be counted as production
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half(); for (let i = 0; i < 20 * 30; i++) V.step(1 / 30); half();
      const secs = 120, got = { wood: 0, food: 0 }, rep = { wood: 0, food: 0 };
      for (let s2 = 0; s2 < secs; s2++) {
        const was = Object.fromEntries(V.RES.map(k => [k, V.res[k]])), e = V.expectedRate();
        for (const k of V.RES) rep[k] += e[k];
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        for (const k of V.RES) got[k] += V.res[k] - was[k];
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
      for (const k of V.RES) V.res[k] = 1e5;
      for (let i = 0; i < 8; i++) V.place('statue', LB2.lo + 3 + i, LB2.lo + 12);
      for (const q of V.placed) if (q.key === 'statue') { q.t = 1; q.build = 0; }
      V.rebuildStores();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
      const charm = V.charmTotal();
      let pinned = 0;
      for (const q of [...V.placed]) {
        if (!(V.B(q.key).makes && V.B(q.key).jobs)) continue;
        for (const k of V.RES) V.res[k] = 1e5;
        if (!V.canUpgrade(q)) continue;
        V.upgradeBuilding(q); q.build = 1e7; pinned++;
      }
      V.goalIdx = V.GOALS.length;
      const half = () => { for (const k of ['wood', 'food']) V.res[k] = V.caps[k] / 2; };
      half(); for (let i = 0; i < 10 * 30; i++) V.step(1 / 30); half();
      let arrived = 0;
      for (let s2 = 0; s2 < 60; s2++) {
        const was = V.RES.reduce((n, k) => n + V.res[k], 0);
        for (let i = 0; i < 30; i++) V.step(1 / 30);
        arrived += (V.RES.reduce((n, k) => n + V.res[k], 0)) - was; half();
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
      /* Spliced, not reassigned. placed is exported with a getter and no
         setter, so "V.placed = V.placed.filter(...)" is silently thrown away --
         this line has been claiming to take the well out since it was written
         and has never once done it. The check still bit, because wellGainAt
         counts the wells already standing and the measured gain counts them
         too; but a comment describing a village that was never built is the
         thing this file exists to stop. */
      if (well) { V.placed.splice(V.placed.indexOf(well), 1); V.rebuildStores(); }
      for (const k of V.RES) V.res[k] = 1e5;
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
          for (const k of V.RES) V.res[k] = 1e5;
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
          got += (V.RES.reduce((n, k) => n + V.res[k], 0)) - was; half2();
        }
        return got / secs2;
      };
      if (!p) fails.push('the workforce check found no staffed workplace to upgrade');
      else {
        const hands0 = V.workersAt(p.id), mine = hands0 * V.deliveringNow(p);
        held.before = +rate2().toFixed(3);
        for (const k of V.RES) V.res[k] = 1e5;
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
    const held = () => V.RES.reduce((n, k) => n + V.res[k], 0)
      + V.villagers.reduce((n, g) => n + (g.carry ? g.carry.n : 0), 0)
      + V.placed.reduce((n, p) => n + (p.stock || 0), 0);
    const scene = (houseLvl, extra) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.goalIdx = 0;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 5e4;
      const LB = V.landBounds();
      for (const [k, c, r] of [['house',0,0],['house',0,3],[extra,3,0],
        ['store',9,0],['store',9,3],['store',9,6],['store',3,9]]) V.place(k, LB.lo + c, LB.lo + r);
      for (const p of V.placed) { p.t = 1; if (p.key === 'house') p.lvl = houseLvl; if (p.key === 'store') p.lvl = 5; }
      V.rebuildStores();
      for (let i = 0; i < 120; i++) V.step(1 / 30);          // villagers appear and take posts
      for (const k of V.RES) V.res[k] = 200;                     // room to spare for refund and loads
      for (const g of V.villagers) g.carry = { k: 'wood', n: 8 };
    };
    const law = (name, act) => {
      const before = held(), refund = act.refund ? act.refund() : {};
      act.go();
      V.step(1 / 30);
      const paid = V.RES.reduce((n, k) => n + (refund[k] || 0), 0);
      const want = before + paid, got = held();
      if (Math.min(...V.RES.map(k => V.caps[k] - V.res[k])) < 0)
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
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
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
    for (const k of V.RES) V.res[k] = 5e4;
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
        for (const k of V.RES) V.res[k] = 5e3;
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
      for (const k of V.RES) V.res[k] = 1e6;
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
      for (const k of V.RES) V.res[k] = 1e6;
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
      /* The clause that carries the promise, wherever it sits in the row.

         This was 'under scaffolding' followed by the first number after it,
         which tied the checker to the order the clauses happened to be
         written in. When the promise moved in FRONT of the state -- so that
         a narrow screen sheds the state and keeps the promise -- the check
         went looking for a number after the last clause in the row, found
         none, and reported that a storehouse had stopped saying what it will
         hold at the moment it started saying it on every screen. */
      const promised = row => (String(row).split('·').find(c => c.indexOf('when it is done') >= 0) || '');
      const whenWood = new RegExp('([0-9]+)');
      /* Every clause that counts storage has to count every kind of it.

         The Holds line lists them through RES; the clauses beside it were
         written when there were two kinds and went on naming two, so a
         storehouse holding wood, food and stone said it would hold wood and
         food -- while the spoil warning in the same row counted all three.
         Read by icon off the drawn row, and only off the part of the row
         that clause owns, because the Holds line in front of it names them
         all and would answer for it.

         Silent when a clause is missing altogether: that is the row being
         too narrow to keep it, which is a different fault with its own
         checks, and counting it here would hide one behind the other. */
      const after = (str, mark) => { const i = String(str).indexOf(mark); return i < 0 ? '' : String(str).slice(i + mark.length); };
      const clause = (str, label) => {
        if (!String(str).trim()) return;
        const kinds = V.RES.filter(k => V.capsOf(store, k) > 0);
        const got = kinds.filter(k => String(str).indexOf(V.RES_ICON[k]) >= 0);
        if (got.length !== kinds.length)
          fails.push('a storehouse holds ' + kinds.join(', ') + ' and its "' + label + '" names '
            + (got.join(', ') || 'none of them') + ': "' + String(str).trim() + '"');
      };
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
        const finStore = rowLike(store, num);
        const m0 = num.exec(finStore);
        const h0 = heads.exec(rowLike(house, heads));
        clause(after(finStore, '→'), 'what the next level holds');
        clause(after(rowLike(store, new RegExp('drops storage to')), 'drops storage to').split('—')[0],
          'what selling it drops storage to');
        if (!m0) { fails.push('a finished level ' + lvl + ' storehouse says nothing about what it holds'); continue; }
        if (!h0) { fails.push('a finished level ' + lvl + ' house says nothing about who lives there'); continue; }
        if (+m0[1] !== ceiling)
          fails.push('a level ' + lvl + ' storehouse says it holds ' + m0[1]
            + ' and the village ceiling counts ' + ceiling + ' of it');
        if (+h0[1] !== V.villagers.length)
          fails.push('the only house in the village says it houses ' + h0[1]
            + ' villagers and ' + V.villagers.length + ' are walking about');
        for (const k of V.RES) V.res[k] = 1e6;
        if (!V.canUpgrade(store) || !V.canUpgrade(house)) continue;
        V.upgradeBuilding(store); V.upgradeBuilding(house);
        store.build = 1e7; house.build = 1e7;
        for (let i = 0; i < 10 * 30; i++) V.step(1 / 30);
        const ceilUp = V.capsWithout(null).wood - V.capsWithout(store).wood;
        const upStore = rowLike(store, num), upHouse = rowLike(house, heads);
        const m1 = num.exec(upStore), h1 = heads.exec(upHouse);
        const willHold = whenWood.exec(promised(upStore)), willHouse = when.exec(upHouse);
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
        clause(promised(upStore), 'when it is done');
      }
      if (rooms < 3) fails.push('only ' + rooms + ' storehouse upgrades were watched, so the block proved almost nothing');

      /* And the first time, which is the one a new player meets: a building
         going up has nothing in it and nobody in it yet, and both rows used to
         promise a level nobody had reached on a plot that was still a hole in
         the ground. */
      for (const k of V.RES) V.res[k] = 1e6;
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
      for (const k of V.RES) V.res[k] = 1e6;
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
        for (const k of V.RES) V.res[k] = 1e6;
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
        for (const k of V.RES) V.res[k] = 1e6;
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
        /* And MOVING that well says what the move is worth, sign and all.

           The badge over a ghost well answers for a well that is not there
           yet: its baseline is the village exactly as it stands and its
           level is the level a new well is built at. A well being moved is
           still standing at its old spot while the player drags it, so that
           baseline already contains the thing being quoted, and the figure
           became the marginal worth of a SECOND well at a level the well
           has long since passed -- with nothing anywhere subtracting what
           the old spot stops lifting.

           Measured on a level four well lifting two workplaces by 0.52/s:
           all four moves tried were wrong and three were wrong in their
           SIGN. Carrying it off its farms read 'reaches no workplace' and
           no figure at all, which sounds merely useless while throwing the
           whole lift away.

           Read off the canvas, not asked of the function. A block that
           called wellMoveGain would pass with the badge wired to anything
           at all -- which is the lesson this file has already written down
           beside the charm goal: the question is what the player can see.

           Held against hands x deliveringNow summed over the posts. That is
           the village's own delivery model but NOT the sum either badge
           uses, so a quote that forgot to move the well cannot drag the
           yardstick along with it. Nothing is stepped between the reading
           and the measuring: a tick lets assignJobs move somebody, and the
           figure would then describe a different village from the one that
           was quoted. */
        {
          const badge = () => {
            const rows = [];
            ctx.fillText = function (t, ...a) { rows.push(String(t)); return orig.call(this, t, ...a); };
            try { V.draw(); } finally { ctx.fillText = orig; }
            return rows.find(t => t.indexOf('lifts ') === 0 || t.indexOf('reaches no workplace') === 0) || '';
          };
          const model = () => V.placed.reduce((n, q) => {
            const qb = V.B(q.key);
            if (q.t < 1 || !qb.makes || !qb.jobs) return n;
            const h = V.villagers.filter(g => g.job === q.id).length;
            return h ? n + h * V.deliveringNow(q) : n;
          }, 0);
          /* The figure is read by splitting rather than by matching: a
             pattern written into this file loses its backslashes on the way
             in, and one that matches nothing would report every badge as
             silent and pass. */
          const figure = t => {
            const tail = t.split('·').pop().trim();
            if (tail === 'no change') return 0;
            if (tail.indexOf('/s') < 0) return null;
            const neg = tail.charAt(0) === '−';
            const v = parseFloat(tail.slice(1));
            return isFinite(v) ? (neg ? -v : v) : null;
          };
          const says = to => {
            V.moving = w.id; V.ghost = { c: to[0], r: to[1], ok: true, fits: true };
            const t = badge();
            V.moving = null; V.ghost = null;
            return t;
          };
          const real = to => {
            const was = model(), keep = [w.c, w.r];
            w.c = to[0]; w.r = to[1];
            const got = model() - was;
            w.c = keep[0]; w.r = keep[1];
            return got;
          };
          /* Somewhere it reaches nothing, so the move that costs the most is
             on the list: leaving its farms altogether. */
          let away = null;
          for (let c = LB.hi; c >= LB.lo && !away; c--) for (let r = LB.hi; r >= LB.lo && !away; r--)
            if (V.canPlace('well', c, r, V.occupied(w.id)) && V.wellReachAt(c, r).length === 0) away = [c, r];
          /* And another spot that still reaches something, for the move that
             barely changes anything. */
          let beside = null;
          for (let dc = -3; dc <= 3 && !beside; dc++) for (let dr = -3; dr <= 3 && !beside; dr++) {
            const c = w.c + dc, r = w.r + dr;
            if ((dc || dr) && V.canPlace('well', c, r, V.occupied(w.id)) && V.wellReachAt(c, r).length) beside = [c, r];
          }
          const home = [w.c, w.r];
          /* Each try names where the well is STANDING as well as where it is
             being dragged to, and it is stood there before the label is read.
             Moving it up front instead made the first try a move to the spot
             the well was already on -- which this block caught on itself, by
             the coverage line below: three moves tried and not one of them
             cost the village anything. */
          const tries = [];
          if (away) tries.push(['off its workplaces', home, away]);
          if (beside) tries.push(['a tile over', home, beside]);
          /* And the same move backwards, from nowhere to the good spot, so
             the gaining half is proved too and not only the losing one. */
          if (away) tries.push(['back to its workplaces', away, home]);
          let lost = 0, gained = 0;
          for (const [what, standAt, to] of tries) {
            w.c = standAt[0]; w.r = standAt[1];
            const said = says(to), got = real(to), fig = figure(said);
            if (!said) { fails.push('moving a well ' + what + ' drew no label at all'); continue; }
            if (fig === null) {
              fails.push('moving a well ' + what + ' costs the village ' + got.toFixed(3)
                + '/s and its label gives no figure: "' + said + '"');
              continue;
            }
            if (got < -0.005 && fig > 0.005)
              fails.push('moving a well ' + what + ' loses the village ' + (-got).toFixed(3)
                + '/s and the label promises a gain of +' + fig.toFixed(2) + '/s');
            else if (Math.abs(fig - got) > 0.011)
              fails.push('moving a well ' + what + ' is quoted ' + fig.toFixed(2)
                + '/s and the village moves by ' + got.toFixed(3) + '/s');
            if (got < -0.05) lost++;
            if (got > 0.05) gained++;
          }
          w.c = home[0]; w.r = home[1]; V.rebuildStores();
          if (!lost || !gained)
            fails.push('the well-move check tried ' + tries.length + ' moves, ' + lost + ' that cost and '
              + gained + ' that paid, so it proved only half of what it is for');
          wells += tries.length;
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
      for (const k of V.RES) V.res[k] = 1e6;
      const L = V.landBounds();
      const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
      /* Three, not four: the hall allows four storehouses and one of the
         five kinds bought and sold below is a storehouse, so the fourth slot
         has to be left open for it. */
      for (let i = 0; i < 3; i++) put('store');
      for (const q of V.placed) if (q.key !== 'hall') q.lvl = 5;
      for (const k of V.RES) V.res[k] = 1e6;
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);     // the levels land through a real finish
      parkGoals();
      const purse = () => { for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * 0.3); };
      /* Every kind. Summed as wood and food, a statue's eighty stone was never
         counted as paid, and the half-back rule for stone compared its refund
         with NaN -- which passes whatever the refund is. */
      const moved = fn => { const was = Object.fromEntries(V.RES.map(k => [k, V.res[k]])); const ok = fn();
        return { ok, ...Object.fromEntries(V.RES.map(k => [k, V.res[k] - was[k]])) }; };
      for (const key of ['farm', 'lumber', 'house', 'store', 'statue']) {
        purse();
        const paid = Object.fromEntries(V.RES.map(k => [k, 0]));
        const first = moved(() => put(key));
        if (!first.ok) { fails.push('the refund rule check could not put up a ' + key); continue; }
        for (const k of V.RES) paid[k] -= first[k];
        const p = V.placed[V.placed.length - 1];
        for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        for (let n = 0; n < 2; n++) {
          purse();
          if (!V.canUpgrade(p)) break;
          const u = moved(() => V.upgradeBuilding(p));
          for (const k of V.RES) paid[k] -= u[k];
          for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
        }
        p.stock = 0;
        /* Low enough that the refund cannot be clamped on the way in, and the
           storehouse taking its own capacity away with it is allowed for. */
        for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * 0.15);
        const back = moved(() => V.sellBuilding(p));
        if (!back.ok) { fails.push('the refund rule check could not sell a ' + key); continue; }
        halves++;
        for (const k of V.RES) {
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
      /* Built from the game's own icon table rather than from two characters
         written here. A kind of goods this did not know about read as nought
         -- so a market, which is now built of stone, was 'quoted 0 food back
         and the village gained 0', which is two true statements about the
         wrong resource. */
      const BY_ICON = new Map(Object.entries(V.RES_ICON).map(([k, i]) => [i, k]));
      const ICONS = new RegExp('(' + [...BY_ICON.keys()].join('|') + ')[^0-9]*([0-9]+)', 'g');
      const pick = text => { const o = {};
        for (const k of V.RES) o[k] = 0;
        for (const m of text.matchAll(ICONS)) o[BY_ICON.get(m[1])] += +m[2];
        return o; };
      const rowsArmed = (p, armed) => {
        V.panel = p.id; V.sellArm = armed ? { id: p.id, t: V.SELL_ARM } : null;
        V.step(0.001);
        const lines = [];
        /* Nothing dimming the screen at the moment of the draw: the panel
           yields to any card that washes the whole screen, and this scene's
           goals are all finished, so the card comes back on every tick. */
        V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
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
        for (const k of V.RES) V.res[k] = 1e6;
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
        for (const k of V.RES) V.res[k] = 1e6;
        for (let i = 0; i < 20 * 30; i++) V.step(1 / 30);
        const p = V.placed.find(q => q.key === key);
        if (!p) { fails.push('the refund check could not place a ' + key); continue; }
        /* The panel can only be read over two frames -- the button quotes the
           refund until it is armed, and the spoil warning appears only once it
           is -- and each read steps the village a millisecond so the panel can
           settle. A carrier already standing at a store hands in its eight on
           that millisecond. Measured at two cases in a hundred and twenty,
           which is about one battery in forty reporting that a level 3 market
           'was quoted 430 food back and the village gained 422' -- a figure
           eight out, in a block whose whole subject is a clamp that lands on a
           boundary, with the game blamed for the harness walking the stores
           out from under its own quote between reading it and testing it.

           Carriers are the only thing that moves the stores here; the goals
           are finished, so nothing else pays in. They are sent away before the
           stores are set, and that the stores really did hold still across
           both reads is checked rather than assumed -- the assumption is the
           part that was wrong last time. */
        V.villagers.length = 0;
        const cap = V.caps;
        const at = { empty: 0, half: Math.floor(cap.wood / 2), full: cap.wood, short: cap.wood - 40 }[where];
        V.res.wood = at; V.res.food = where === 'empty' ? 0 : Math.min(at, cap.food);
        p.stock = 0;
        const held = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
        const btn = rowsArmed(p, false).find(t => isBtn.test(t)) || '';
        const warn = rowsArmed(p, true).find(t => /Selling it spoils/.test(t)) || '';
        if (V.res.wood !== held.wood || V.res.food !== held.food)
          fails.push('the stores moved from ' + held.wood + ',' + held.food + ' to ' + V.res.wood
            + ',' + V.res.food + ' while the sell panel was being read, so its two figures do not describe one moment');
        if (!btn) { fails.push('a ' + key + ' panel has no sell button to read'); continue; }
        const said = /nothing|none/.test(btn) ? { wood: 0, food: 0 } : pick(btn);
        /* What spoils is the first clause now -- "Selling it spoils 🪵230 · storage
           drops to 1500 each" -- and the row may shed the second on a phone. */
        const spoiled = warn ? pick(warn.split('·')[0].replace(/^.*spoils/, '')) : { wood: 0, food: 0 };
        const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
        p.stock = 0;
        if (!V.sellBuilding(p)) { fails.push('the refund check could not sell a ' + key); continue; }
        quotes++;
        for (const k of V.RES) {
          const got = Math.round(V.res[k] - before[k]), want = said[k] - spoiled[k];
          if (Math.abs(got - want) > 1)
            fails.push('a level ' + lvl + ' ' + key + ' sold with the stores ' + where
              + ' was quoted ' + said[k] + ' ' + k + ' back and ' + spoiled[k] + ' spoiling, and the village '
              + (got < 0 ? 'lost ' + -got : 'gained ' + got));
        }
      }
      if (quotes < 30) fails.push('only ' + quotes + ' sales were quoted and checked, so the block proved little');
    }

    /* And none of it falls off the edge of a phone.

       panelRow sheds clauses from the right when a row will not fit, so the
       order they are written in decides what a narrow screen loses. Every
       scaffolding row named the state before the promise, and the promise is
       the thing the player has just paid for -- so at 360 wide a storehouse
       going up never said what it would hold and a well never said what it
       would lift, while both were perfectly correct at 1200. Everything above
       read the one shape the browser window happened to be, which for this
       battery had always been a desktop one; the game ships to a portrait
       phone and nothing else.

       Compared between shapes rather than against a written-down string:
       whatever a wide screen is willing to promise, a phone has to promise
       too. A row that promises nothing anywhere is left alone -- that is a
       different fault, and the checks above own it. */
    {
      const keepW = window.innerWidth, keepH = window.innerHeight;
      const SHAPES = [[1200, 800], [390, 844], [360, 780], [360, 640]];
      const seen = {};
      try {
        for (const [sw, sh] of SHAPES) {
          asScreen(sw, sh);
          V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
          V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
          V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; V.orders = [];
          V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
          for (const k of V.RES) V.res[k] = 3e4;
          const LB = V.landBounds();
          for (const [k, c, r] of [['house', 0, 0], ['farm', 3, 0], ['lumber', 3, 3],
            ['store', 6, 0], ['well', 6, 3]]) V.place(k, LB.lo + c, LB.lo + r);
          for (const x of V.placed) { x.t = 1; x.build = 0; }
          V.rebuildStores();
          for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
          for (const key of ['store', 'house', 'well', 'lumber']) {
            for (const k of V.RES) V.res[k] = 3e4;
            const p = V.placed.find(q => q.key === key);
            if (!p || !V.canUpgrade(p)) continue;
            V.upgradeBuilding(p); p.build = 1e7; V.step(1 / 30);
            const row = rowLike(p, new RegExp('Holds|Houses|Lifting|Reaching|/s delivered'));
            /* With the hands it has, because a workplace only promises a
               figure when somebody is working it -- so an unstaffed one is
               silent for a reason that has nothing to do with the width of
               the screen, and comparing it against a staffed one reports the
               villager who wandered off as a layout fault. The same rule the
               delivered block above keeps. */
            (seen[key] = seen[key] || []).push({ at: sw + 'x' + sh, hands: V.workersAt(p.id),
              has: new RegExp('when it is done').test(row), row });
            p.build = 1;
            for (let i = 0; i < 40 * 30; i++) V.step(1 / 30);
          }
        }
      } finally { asScreen(keepW, keepH); }
      let compared = 0;
      for (const key of Object.keys(seen)) {
        const rows = seen[key], wide = rows[0];
        if (!wide || !wide.has) continue;
        for (const r of rows.slice(1)) {
          if (r.hands !== wide.hands) continue;          // not evidence either way
          compared++;
          if (!r.has)
            fails.push('a ' + key + ' under scaffolding says what it will become at ' + wide.at
              + ' and not at ' + r.at + ', where the row is "' + r.row + '"');
        }
      }
      if (compared < 6) fails.push('only ' + compared + ' rows could be compared between a wide screen and'
        + ' a narrow one, so the narrow-screen block proved almost nothing');
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
     are four things it can name: the hall, a ring of land, a workplace, and
     charm.
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
      for (const k of V.RES) V.res[k] = 1e6;
      for (const [k, lvl] of kinds) { if (put(k)) { const q = V.placed[V.placed.length - 1]; q.lvl = lvl; q.t = 1; q.build = 0; } }
      put('path');
      for (const k of V.RES) V.res[k] = 0;
    };
    const ask = kind => V.buyProgress(kind);
    const want = (kind, got, re, what) => { cases++;
      if (!re.test(got)) fails.push('the strip for a ' + kind + ' ' + what + ' said "' + got + '"'); };
    const RICHLY = () => { for (const k of V.RES) V.res[k] = 1e6; };

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
    /* The last ring was 5000 wood, which four storehouses at their best do
       not reach: 700 and four times 960 is 4540. The markets were the rest of
       the ceiling, and without them this case read 'needs more storage' and
       was right to. The ring is 3750 now and 4540 clears it, so the markets
       are margin rather than the difference -- kept, because a case that
       passes by 790 is a case that fails the next time a price moves. */
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

    /* ---- and charm, which is the one a player can put out of their own reach.

       Roads are ornaments and share the sixty slots with them, so paving
       competes with charm for the same budget. A statue is the best a slot
       can hold, so a fixed number of slots must be kept for statues and
       everything past that makes the goal impossible -- and the strip said
       the same line either way until it was taught this.

       The edge is worked out here from the table rather than written down,
       so retuning a statue or the sixty moves the test with it. ---- */
    {
      /* Read off the CANVAS rather than out of buyProgress.

         The first version of this asked the function, and the mutation that
         takes the goal's buy field away -- which is exactly how the strip
         used to behave -- walked straight through it: the branch still
         answers when you call it, and the strip simply never calls it. What
         is being tested is whether the player is told, so the test has to
         be what the player can read. */
      const cv2 = document.querySelector('canvas'), ctx2 = cv2.getContext('2d');
      /* The whole strip, including the half of it on the second line.

         The strip wraps when it will not fit on one, and this took the first
         drawn row and called it the line. On a 360-wide phone that cut the
         sentence in half: the game says "no room left -- remove a path" and
         draws "...no room left -- remove" above "a path   ·   reward ...".
         So the checker read a truncation the player never sees, decided the
         strip was naming nothing that stands in the village, and complained.
         It had been right only at the width where the strip happens to fit.

         The continuation is found by where it is drawn rather than by what it
         says: fitLines lays its rows at one x, a line apart, so a row at the
         same x and within a line and a half below belongs to the same string.
         Joined with a space, which is the join fitLines split on. */
      const line = () => {
        V.goalIdx = V.GOALS.findIndex(g => /charm/i.test(g.text));
        V.goalDone = null; V.away = null; V.finished = null; V.claimAsk = false;
        V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
        V.step(0.001);
        const rows = [], o = ctx2.fillText;
        ctx2.fillText = function (t2, x2, y2, ...a) {
          /* The size out of the font string, not parseFloat of it: the strip is
             drawn bold, so the string starts 'bold 29px' and parseFloat reads
             NaN -- which fell back to 16, made the line gap look impossible and
             dropped the continuation this was written to pick up. */
          const fpx = /([0-9.]+)px/.exec(ctx2.font);
          rows.push({ t: String(t2), x: x2, y: y2, px: fpx ? +fpx[1] : 16 });
          return o.call(this, t2, x2, y2, ...a);
        };
        try { V.draw(); } finally { ctx2.fillText = o; }
        const i = rows.findIndex(r => /^Fill the village/.test(r.t));
        if (i < 0) return '';
        let out = rows[i].t;
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i], b = rows[j];
          if (Math.abs(b.x - a.x) > 1 || b.y - a.y <= 0 || b.y - a.y > a.px * 1.6 * (j - i)) break;
          out += ' ' + b.t;
        }
        return out;
      };
      /* Read off the game, not worked out again here.

         This line used to recompute BEST_CHARM from BUILDINGS, and a copy of
         a rule is a rule that can disagree with itself. It did, the moment
         four decorations were added that are found rather than bought: the
         game excludes those from BEST_CHARM -- the charm goal is about what
         you can go and BUY -- and this copy did not, so the sweep worked out
         its edge at 60 charm a slot while the strip it was checking worked
         its own out at 45. The strip was right and the checker called it
         broken. */
      const best = V.BEST_CHARM;
      /* The most roads that still leave room for the statues the goal needs. */
      const edge = (() => { let r = V.DECOR_MAX;
        while (r > 0 && r + best * (V.DECOR_MAX - r) < V.CHARM_FULL) r--;
        return r; })();
      const lay = n => {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
        V.goalIdx = 0; V.tutSeen.length = 0; V.away = null; V.goalDone = null;
        V.finished = null; V.panel = null; V.sel = null; V.moving = null;
        V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
        for (const k of V.RES) V.res[k] = 1e6;
        const L = V.landBounds();
        for (let i = 0; i < n; i++) { for (const k of V.RES) V.res[k] = 1e6;
          let put = false;
          for (let r = L.lo; r <= L.hi && !put; r++) for (let c = L.lo; c <= L.hi && !put; c++)
            if (V.canPlace('path', c, r, V.occupied())) put = !!V.place('path', c, r);
          if (!put) break; }
        for (const q of V.placed) if (q.t < 1) { q.t = 0.9; }
        for (let i = 0; i < 40; i++) V.step(1 / 30);
        for (const k of V.RES) V.res[k] = 1e6; V.step(0.001);
        return V.decorCount();
      };
      if (edge < 2 || edge >= V.DECOR_MAX)
        fails.push('the charm arithmetic puts its edge at ' + edge + ' roads, which is not an edge at all');
      else {
        lay(edge);
        want('charm', line(), /ready/, 'with the last road that still leaves room');
        lay(edge + 1);
        const over = line();
        cases++;
        if (!/no room left/.test(over))
          fails.push('the strip with ' + (edge + 1) + ' roads down, which cannot reach the charm the goal wants, says "' + over + '"');
        else {
          /* The remedy is one that can be taken, and taking it works. */
          /* Split on the divider rather than matched with a pattern.

             The strip carries the reward after this clause, so a pattern run
             to the end of the line captures "path   ·   reward" and finds
             nothing standing in the village by that name. The first attempt
             to stop it at the divider lost its backslash on the way into this
             file and quietly matched nothing at all -- which is the warning
             already written beside the launch-theme check, earned a fourth
             time. Splitting needs no escape, so there is nothing to lose. */
          const clause = over.split('   ·   ').find(c => c.indexOf('remove a') >= 0) || '';
          const name = (clause.split('remove a')[1] || '').replace(/^n /, '').trim() || null;
          const gone = V.placed.find(p => V.isDecor(p.key)
            && V.B(p.key).name.toLowerCase() === name);
          cases++;
          if (!name || !gone)
            fails.push('the strip says "' + over + '" and there is no such thing standing in the village');
          else {
            V.placed.splice(V.placed.indexOf(gone), 1); V.rebuildStores();
            for (let i = 0; i < 20; i++) V.step(1 / 30);
            for (const k of V.RES) V.res[k] = 1e6; V.step(0.001);
            want('charm', line(), /ready/, 'once the thing it named was removed');
          }
        }
        /* And it asks for what is missing when the purse is empty. */
        lay(0);
        for (const k of V.RES) V.res[k] = 0; V.step(0.001);
        want('charm', line(), /\d+\/\d+/, 'the village is saving for');
        /* And says nothing once there is nothing left to want. */
        lay(0);
        { const L = V.landBounds();
          for (let i = 0; i < 40 && V.charmTotal() < V.CHARM_FULL; i++) {
            for (const k of V.RES) V.res[k] = 1e6;
            let put = false;
            for (let r = L.lo; r <= L.hi && !put; r++) for (let c = L.lo; c <= L.hi && !put; c++)
              if (V.canPlace('statue', c, r, V.occupied())) put = !!V.place('statue', c, r);
            if (!put) break; }
          for (const q of V.placed) if (q.t < 1) q.t = 0.9;
          for (let i = 0; i < 40; i++) V.step(1 / 30);
        }
        cases++;
        if (V.charmTotal() < V.CHARM_FULL)
          fails.push('the charm check could not fill the village with charm, so the finished case proves nothing');
        else if (V.buyProgress('charm') !== '')
          fails.push('the strip spoke for a charm goal that is already met: "' + V.buyProgress('charm') + '"');
      }
    }

    /* And past the ladder, each goal says what it measures and nothing else.
       The shipping goals carry the shipping total; the trade-order goals carry
       their own count and used to carry the shipping total as well -- "Fill 10
       trade orders in all · 0/10 · shipped nothing yet", a figure about a
       different goal that reads as a second thing to do. */
    {
      const ctx = document.querySelector('canvas').getContext('2d'), oF = ctx.fillText;
      const strip = () => { const lines = [];
        ctx.fillText = function (t, ...a) { lines.push(String(t)); return oF.call(this, t, ...a); };
        try { V.draw(); } finally { ctx.fillText = oF; }
        return lines.find(t => /^(Ship|Fill) /.test(t)) || ''; };
      const keepIdx = V.goalIdx, keepShared = V.sharedTotal;
      V.panel = null; V.sel = null; V.away = null; V.claimAsk = false;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.sharedTotal = { wood: 1234, food: 0, stone: 0 };
      let ships = 0, trades = 0;
      for (let gi = V.GOALS.length; gi < V.GOALS.length + 6; gi++) {
        V.goalIdx = gi; V.goalDone = null; V.finished = null; V.step(0.001);
        V.goalDone = null; V.finished = null; V.goalIdx = gi;
        const gl = V.currentGoal(), line = strip();
        cases++;
        if (!line) { fails.push('goal ' + gi + ' past the ladder ("' + gl.text + '") was not on the strip'); continue; }
        const isTrade = /trade orders/.test(gl.text);
        if (isTrade) { trades++; if (/shipped/.test(line)) fails.push('a trade-order goal names the shipping total: "' + line + '"'); }
        else { ships++; if (!/shipped/.test(line)) fails.push('a shipping goal does not say what has been shipped: "' + line + '"'); }
      }
      if (!ships || !trades) fails.push('the goals past the ladder were not both kinds: ' + ships + ' shipping, ' + trades + ' trade');
      V.goalIdx = keepIdx; V.sharedTotal = keepShared; V.step(0.001);
    }
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
    for (const k of V.RES) V.res[k] = 1e6;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
    for (const k of V.RES) V.res[k] = 1e6;
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
      /* Every OTHER store half full, so the only thing near its ceiling is
         the one being walked. Written as wood and food, it left a third kind
         wherever the scene had put it -- at a million, which is full -- and
         the chip then said 'storage full' at every step of the walk because
         it was telling the truth about a different barn. */
      for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] / 2);
      V.res.food = V.caps.food - room;
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
    for (const k of V.RES) V.res[k] = 1e6;
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
      for (const k of V.RES) V.res[k] = 1e6;
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
    /* And taking a road up costs what laying it down was worth.

       Every other decoration is charm and nothing else, so the row that
       warns what a sale costs could work the whole question out by dropping
       the charm total and asking what the village would then deliver. A road
       is the one that is not: it is worth a single charm and better than
       twice the walking speed, and the walk is the entire reason to lay one.
       Dropping one charm out of a village of sixteen moves the delivered
       total by less than half a hundredth of a unit, so the row found no
       figure worth printing and said 'Selling it takes 1 charm' -- over a
       tile carrying two workplaces, one tap before it came up.

       The badge over the same tile, before it was laid, had the right answer
       all along: it tries the tile in the route and quotes the quicker walk.
       So the two are held against each other and both against the village,
       which is a shape that needs no number written down here.

       Measured in the SAME frame, with no step between the reading and the
       sale. A step lets assignJobs move somebody, and then the figure
       describes a different village from the one that was quoted -- which is
       the mistake this file has now made three times and does not intend to
       make a fourth. */
    {
      let worth = 0, silent = 0, worstGap = 0, worstAt = null, worstSays = null, worstReal = null;
      let worstBuy = 0, worstBuyAt = null;
      for (const at of V.placed.filter(q => q.key === 'path').map(q => ({ c: q.c, r: q.r }))) {
        const q = V.placed.find(z => z.key === 'path' && z.c === at.c && z.r === at.r);
        if (!q) continue;
        const said = V.saleCost(q) || '';
        /* Read by splitting, not by matching. A pattern written here loses
           its backslashes on the way into this file -- twice now -- and a
           pattern that matches nothing reports every figure as missing,
           which would have made this check pass by accident on the day it
           was written. Splitting needs no escape. */
        const quotes = said.indexOf('/s') >= 0;
        const says = quotes ? parseFloat(said.split('−').pop()) : 0;
        const was = V.deliveredAtMul(V.charmMul());
        if (!V.sellBuilding(q)) { fails.push('the road check could not take up the path at ' + at.c + ',' + at.r); continue; }
        const real = was - V.deliveredAtMul(V.charmMul());
        /* And what the game would quote for laying this very tile back, which
           is the same sum pointing the other way. */
        const buy = V.decorGainAt('path', at.c, at.r);
        if (!V.place('path', at.c, at.r)) { fails.push('the road check could not lay the path back at ' + at.c + ',' + at.r); continue; }
        if (real > 0.005) worth++;
        if (real > 0.005 && !quotes) { silent++; if (real > (worstReal || 0)) { worstAt = at; worstReal = real; } }
        else if (Math.abs(says - real) > 0.011 && Math.abs(says - real) > worstGap) {
          worstGap = Math.abs(says - real); worstAt = at; worstSays = says; worstReal = real;
        }
        if (Math.abs(buy - real) > worstBuy) { worstBuy = Math.abs(buy - real); worstBuyAt = at; }
      }
      if (!worth) fails.push('not one road tile was worth anything to the village, so the sale warning proves nothing');
      if (silent)
        fails.push(silent + ' road tiles cost the village something and their panels quoted no figure at all, the dearest at '
          + worstAt.c + ',' + worstAt.r + ' worth ' + worstReal.toFixed(3) + '/s');
      else if (worstGap > 0.011)
        fails.push('the panel for the road at ' + worstAt.c + ',' + worstAt.r + ' says taking it up costs '
          + worstSays.toFixed(2) + '/s and the village lost ' + worstReal.toFixed(3) + '/s');
      if (worstBuy > 0.011)
        fails.push('the road at ' + worstBuyAt.c + ',' + worstBuyAt.r + ' is quoted one figure to lay and another to take up, out by '
          + worstBuy.toFixed(3) + '/s');
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
    for (const k of V.RES) V.res[k] = 1e9;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'house', 'farm', 'lumber', 'store', 'mill']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 4;
    for (const k of V.RES) V.res[k] = 1e9;
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
      for (const k of V.RES) V.res[k] = 1e9;
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
    /* ---- and the sizes the HUD actually draws at, which is a different
       question from the one above.

       TEXT_MIN is the floor fitLines will not shrink past. It is not a floor on
       the HUD: a label drawn at a fixed size never goes near the fitter, and
       most of them are -- the build cards at 20 of these units, the chips at
       19, the tabs at 22. The line beside badgeScale calls TEXT_MIN "the floor
       every HUD label is held to", and that is shorthand for a thing nobody
       was checking.

       It is the same lesson the badges taught: read the size the game set,
       times the transform in force, rather than trusting the constant. Those
       came out at 20.5 against a floor of 26 and had been passing for as long
       as anyone had asked. Measured here across the seven screen shapes the
       tap checks use, the smallest writing in the HUD comes out at 8.09 CSS
       pixels on a 360 phone. Several labels share that size -- the charm chip,
       the line under the land prompt, the count on the orders tab -- and it is
       one per cent above the floor, with nothing watching any of them.

       The HUD is told apart from the world by its transform: the world is
       drawn through camApply, which translates, and the HUD only ever scales. */
    {
      const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
      const keepScreen = [window.innerWidth, window.innerHeight];
      const keepPanel = V.panel, keepSel = V.sel, keepBar = V.barMode, keepAsk = V.claimAsk;
      const seen = [];
      const scan = () => {
        const o = ctx.fillText.bind(ctx);
        ctx.fillText = function (t, x, y, ...rest) {
          const m = ctx.getTransform(), hit = /([0-9.]+)px/.exec(ctx.font);
          if (hit && Math.abs(m.e) < 1e-6 && Math.abs(m.b) < 1e-6 && String(t).trim())
            seen.push({ t: String(t).trim().slice(0, 16), px: hit[1] * m.a });
          return o(t, x, y, ...rest);
        };
        try { V.draw(); } finally { ctx.fillText = o; }
      };
      let worst = null;
      try {
        V.away = null; V.finished = null; V.goalDone = null;
        for (const [sw, sh] of [[1200, 800], [360, 640], [375, 667], [390, 844],
          [344, 882], [360, 1040], [400, 1200]]) {
          asScreen(sw, sh); V.draw();
          seen.length = 0;
          /* Every tray, the panel, a card picked, and the land prompt: between
             them they put most of the writing in the game on screen. */
          for (const set of [
            () => { V.panel = null; V.sel = null; V.barMode = 'build'; },
            () => { V.barMode = 'decor'; },
            () => { V.barMode = 'orders'; },
            () => { V.barMode = 'build'; V.panel = (V.placed[1] || V.placed[0]).id; },
            () => { V.panel = null; V.sel = 'house'; },
            () => { V.sel = null; V.claimAsk = true; },
          ]) { set(); V.step(0.001); scan(); }
          V.claimAsk = false;
          for (const r of seen) {
            const inCss = r.px * sw / across;
            if (!worst || inCss < worst.css) worst = { css: +inCss.toFixed(2), t: r.t, sw, sh, px: +r.px.toFixed(1) };
          }
          if (seen.length < 20)
            fails.push('only ' + seen.length + ' pieces of HUD writing were drawn on a '
              + sw + 'x' + sh + ' screen, so the size check proves little');
        }
      } finally {
        asScreen(keepScreen[0], keepScreen[1]);
        V.panel = keepPanel; V.sel = keepSel; V.barMode = keepBar; V.claimAsk = keepAsk;
        V.step(0.001);
      }
      if (worst && worst.css < TEXT_FLOOR)
        fails.push('the HUD draws "' + worst.t + '" at ' + worst.css + ' CSS pixels on a '
          + worst.sw + 'x' + worst.sh + ' screen, which is the size the source calls a smudge');
      return { across, text, touch, drawn: worst,
        floors: { text: TEXT_FLOOR, touch: TOUCH_FLOOR }, fails };
    }
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
    for (const k of V.RES) V.res[k] = 1e6;
    const L = V.landBounds();
    const put = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return false; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store']) put(k);
    for (const q of V.placed) if (q.key !== 'hall') q.lvl = 3;
    for (const k of V.RES) V.res[k] = 1e6;
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
      const now = V.RES.reduce((n, k) => n + V.res[k], 0);
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
  /* ---------------------------------------------------------------------------
     The day is a real day and the night is short of black.

     Two constants run the light, and the whole battery is blind to both. Set
     NIGHT_MAX to 0.95 -- the village all but black at two in the morning --
     and 32 sweeps pass. Set DAY_MS to eight hours, so the cycle never visibly
     moves in a session and the lamp decoration goes back to being an ornament,
     and 32 sweeps pass again.

     The contrast sweeps cannot see either, and it is worth saying why: they
     sample what is behind a string at the moment fillText is called, and the
     night wash is painted over the whole world AFTERWARDS. Every contrast
     figure in this file is a daylight figure. (The HUD escapes the wash for
     real -- drawHUD runs after it -- so the "build bar you cannot read at 2am"
     the source worries about is protected by the draw order rather than by
     NIGHT_MAX. What the wash actually dims is the world and the badges
     standing in it.)

     So this one looks at finished frames. Four questions, each in units the
     constant behind it cannot move:

       the night is short of black   the spread of light across the world at
                                     midnight, against the same spread at noon
       a day passes while you play   addressed in REAL SECONDS: a quarter of an
                                     hour of play must show the whole swing
       it does not strobe            the most the light moves in any ONE second
       the lamp has a reason to      "until now it was an ornament that glowed
       exist                         at noon" -- so its light must be clearly
                                     stronger at the darkest hour of that
                                     quarter hour than at the brightest

     Noon and midnight are addressed by PHASE, which is immune to DAY_MS, so
     the swing they measure is a fixed yardstick that the walk in real seconds
     is then held against.

       lightSweep()  -> { retain, walkFrac, jumpFrac, glow, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What the writing in the world measures AFTER the night has been painted
     over it.

     Every contrast figure in this file is a daylight figure. The checkers wrap
     fillText and sample what is behind the glyph at the moment it is drawn,
     and the night wash goes on afterwards -- it compresses the text and its
     backing towards the same dark blue, so the ratio a reader actually gets at
     two in the morning is lower than anything ever reported. The HUD is safe
     (drawHUD runs after the wash); the badges standing in the world were not.

     The trouble with measuring the finished frame is finding the ink: a glyph
     is a few solid pixels in a sea of antialiasing and you cannot ask the
     canvas which ones they are. So the frame is drawn TWICE, once with that
     one string suppressed and once with it, and the pixel that changed most is
     the most solid ink there is. Its colour in the second frame is what the
     reader sees, its colour in the first is what is behind it, and both have
     been through every wash, overlay and composite the game applies. No
     arithmetic about alpha, and nothing read off a constant.

     It caught its own first draft, too: the scene had a finished village in it
     and the completion card lays a 0.66 black scrim over everything, which put
     the hall's gold label on screen at a third of its stated colour and the
     ratio at 2.27. A measurement of the real pixels will tell you about
     anything that is really over them, including the thing you forgot to clear.

       inkSweep()  -> { rows, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     Reduce motion, which nothing had ever switched on.

     The game answers prefers-reduced-motion in seven places -- the villagers'
     bob and lean, the camera's glide, the fling, the chimney smoke, the lamp's
     pulse -- and the harness mentions the flag exactly once, to set it to
     false. A whole accessibility mode, declared and unexercised.

     Switching it on turns up something worth knowing before anything is
     measured: with the paintings loaded, NOTHING in this village is animated
     by the clock. Hold the village still, move only the wall clock, and two
     frames a whole day apart are identical to the pixel. Every clock-driven
     animation the game has lives in the procedural fallback -- the buildings
     and decorations it draws in code when the art has not arrived -- which is
     the first second of every cold start and which no sweep had ever drawn
     either. Two untested surfaces, and one of them is where the other one
     lives.

     So the art is taken away for the length of this sweep, by telling each
     image it has not finished loading, which is the honest version of the
     state rather than a flag invented for testing. Then four questions:

       it stops the motion     hold the village still, move only the clock by
                               exactly one day so the sky is unchanged, and
                               count the pixels that move. Reduced: none.
                               Ordinary: some hundreds, or this proves nothing

       it does not take        reduce motion MOVES things, it does not remove
       anything away           them -- so against the best-matching instant of
                               the real animation the picture should differ
                               symmetrically rather than be missing its smoke
                               or its lamplight

       the deliveries survive  "the one sign of where goods are actually
                               arriving, kept even when reduce-motion takes
                               the decoration away" -- a promise in the source
                               with nothing holding it

       the camera lands at     asking for a glide must arrive, not travel

       once

       stillSweep()  -> { moved, still, lean, pop, camera, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The notch, which no sweep had ever put on the phone.

     SAFE does not appear once in this file. Thirty-five sweeps, seven screen
     shapes between them, and every one of them runs on a handset with no
     camera cut-out and no gesture bar: SAFE is { top: 0, bottom: 0 } from the
     first line to the last. The page asks for viewport-fit=cover, which is
     what lets the sea reach the edges and also what puts the resource chips
     under the camera unless somebody subtracts the insets again.

     The insets are real values here rather than invented ones: the hidden
     #safe element is the only way to read env(safe-area-inset-*), and its
     padding is what readSafeArea measures, so setting that padding is the same
     thing a notched phone does. 47 CSS pixels at the top and 34 at the bottom
     are an iPhone's.

     Three questions:

       it is read at all     the insets reach SAFE, and keep reaching it --
                             readSafeArea gives up when the canvas has no box
                             yet and says "try again later"
       the HUD moves         every pill the HUD draws sits inside the band
                             between hudTop and hudBot, at both ends
       nothing is crowded    no two controls collide and none loses its hit
                             region, at every shape of screen, with the notch
                             on

       notchSweep()  -> { read, shapes, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     Every state that is coloured is also said.

     The source states the rule once, beside the placement outline: "dashed when
     the spot is refused, so it does not rest on colour". It keeps it
     everywhere -- a card you cannot afford prints its price with a minus in
     front of it, one at its limit prints "6/6" and a padlock, a trade you
     cannot fill says "need", an upgrade you cannot reach says what is missing
     -- and nothing holds any of it. A green pill turning red while the words
     stay the same is the easiest edit in the world to make, and about one man
     in twelve would stop being able to play.

     It has to be asked of the WORDS, not of the pixels. Two hues almost always
     differ in lightness as well -- the gold price and the red one are 0.60 and
     0.46 -- so a greyscale comparison passes a change that carries no
     information at all. What a reader who cannot tell the hues apart still has
     is the writing, and that is what this reads.

       hueSweep()  -> { pairs, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The number on the chip is what the village is really doing.

     "The HUD reports the rate the village is ACTUALLY achieving rather than the
     rate its buildings are rated for -- the gap between the two is walking
     time, and it is large." That is the one number a player watches while the
     village runs, and nothing had ever compared it with the goods that actually
     arrive.

     It is not a figure the game can look up; it is measured and then smoothed
     -- accumulated over a five second window, divided by the window, and eased
     forty per cent of the way each time so the readout settles instead of
     flickering. Everything in that sentence can go wrong quietly: counting
     something that is not a delivery, counting it twice, easing towards a
     number that is never recomputed, or keeping the best figure it ever saw.
     A village that says 2.2 while handing over 1.1 looks perfectly healthy.

     So it is compared against arrivals counted by hand, with the stores held
     open so nothing is refused, goals parked and the trade board cleared --
     because the chip counts the village's OWN work, deliveries only, and a
     goal paying out would be counted by the hand and not by the chip.

     Averaged rather than sampled. A single reading of a smoothed number
     against a ninety second average is 23 per cent out on an honest game,
     because the deliveries come in convoys; the time-average of the same
     readout over the same window comes out between 0.96 and 1.07 of the truth.

       rateSweep()  -> { arriving, quiet, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     A village can always get back on its feet.

     The hall makes wood, and the source says exactly why: "it is deliberately
     feeble -- its job is not to feed the village but to make a dead end
     impossible. Two houses and a farm at level 1 leave you 15 wood, no wood
     income, and a lumber camp costs 20: without this the game is over."

     That is a rule about the whole game being finishable, written down with the
     very position that forced it, and nothing in this file goes anywhere near
     it. Every sweep here builds a village that already works. A trickle of
     0.15 a second on a building nobody thinks of as a workplace is exactly the
     kind of thing that gets tidied away as a rounding error, and the player it
     would strand is one who has already spent everything -- which is to say,
     the one least able to start again.

     Three questions, two of them the source's own:

       the position it names    15 wood, no wood income, and a lumber camp to
                                buy. Measured: affordable in 47 seconds
       nothing at all           a hall on the smallest island with nothing in
                                the stores. Measured: a producer affordable and
                                standing at 324 seconds, food arriving at 344
       nothing is out of reach  no building the village must buy may cost more
                                than a village with no storehouses can hold,
                                or no amount of patience will do

       rescueSweep()  -> { fromCorner, fromNothing, ceiling, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     An hour away is worth an hour of play.

     hiddenSweep is thorough about the welcome-back card -- that it goes up, that
     it says the right span, that what it claims to have banked is what the
     village gained, that a reload is not a reward -- and every one of those
     questions is about the card agreeing with the grant. None of them asks
     whether the GRANT is right. The haul is potentialRate() times the seconds,
     and nobody had ever compared that with what the village does when somebody
     is watching it.

     The source knows this is the dangerous end. Beside potentialRate: "it used
     to fill posts in the order they were built, which matched the game until
     hands started going where they deliver most -- and then the offline figure
     sat a quarter BELOW what the village was really producing, which is the
     same kind of lie as the ones it was written to avoid, just pointing the
     other way." It was found by inspection once. Nothing holds it.

     Both directions matter and they are different complaints. Paying less than
     the village earns robs a player of the hours they were not there; paying
     more makes closing the game the best move in it.

     Measured by doing both: the same settled village is paid for a stretch of
     time, put back, and then actually played through the same stretch. Five
     minutes of it, because the goods arrive in loads of eight and a stretch
     short enough to hold only three of them cannot tell a fifth from a load.

       offlineSweep()  -> { secs, away, live, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     Every lesson the game has can still be taught.

     A whole playthrough was run and the hints it put up were counted: a bot
     that reaches 23 goals of 23 is shown five of the six. The one it never
     sees is "Now a lumber camp" -- it is offered between the moment the first
     house finishes and the moment any workplace exists, and a bot that can
     afford both buys the second before the first has finished going up. A
     person who pauses to watch their house get built is shown it; this one
     never pauses.

     That is not a fault, but it is the shape of one. The hints are a list and
     the strip offers the FIRST whose condition holds, each one once, so a hint
     can die in two ways that nothing would report: its condition can become
     unreachable, or an earlier hint can sit permanently in front of it. The
     source has already been bitten by the near miss -- the full-stores hint
     ended "or build a storehouse" in a village where the storehouse was not
     unlocked, and it is shown ONCE, so that was the whole of what the player
     was ever told.

     So each hint is put in the state it describes, with the ones before it
     already read, and asked for by name. Not "could it be eligible" -- what
     the strip actually hands back.

       taughtSweep()  -> { taught, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     A goal's banner says what arrived, not what was promised.

     "Every grant in this game clamps to the storage cap, and three separate
     times I wrote the clamp in one place and the announcement in another, so
     the game congratulated the player on goods it had just thrown away.
     Everything that grants now goes through here." That is the note beside
     grant(), and the away card is held to it by hiddenSweep. The goal banner is
     the other thing in the game that announces a payment, and nothing had ever
     looked at it.

     It is the easiest congratulation in the world to get wrong, because the
     goal knows what it means to give long before the stores say how much of it
     will fit: the late goals hand over fourteen hundred wood into a village
     whose barns hold seven.

     Every goal is walked, twice. A village is built that satisfies all of them
     at once -- hall five, the whole island, every workplace, enough statues for
     the charm, the trade tally run up -- and then the goals fall one a tick,
     which is the only way to see all of them without playing for an hour.

       with room    the banner must claim what the promise was, or what the room
                    was, whichever is less
       with none    it must claim nothing at all, and nothing must arrive
       either way   it must never claim more than the village actually gained

     Allowed one load of slack, because a villager can put eight down in the
     same tick the goal pays out and neither side can tell the two apart.

       rewardSweep()  -> { goals, withRoom, withNone, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The countdown on the empty stall is the wait.

     An empty stall on the trade board carries a number saying how long until
     somebody turns up. nextTraderIn does not appear once in this file: the
     offers are checked, what they ask for is checked, what filling one pays is
     checked, and the one figure a player sits and watches is not.

     It is a promise of the simplest possible kind -- a number of seconds, and
     then a thing happens -- which is exactly why it rots quietly. Nothing else
     in the game would look wrong if it were twice the truth.

     Three things, all of them by waiting rather than by reading:

       it is the wait        read it, wait that long, and a trader is there --
                             from a cold board and from halfway through
       it does not go up     a countdown that climbs while nothing has changed
                             is unreadable; the one place it may jump is the
                             moment somebody arrives and it starts again
       a full board says     with every stall taken there is nothing to wait
       nothing               for, and it says so rather than counting down to
                             a trader with nowhere to stand

       traderSweep()  -> { cold, midway, climbed, whenFull, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What a finished village gives away, and whether it is what it carried.

     "Once the goal list is complete, overflow is sent to the neighbouring
     villages instead, and the village keeps a tally of what it has given. It
     changes nothing that can be spent -- the goods were lost either way --
     which is the point: it is a record, not a new economy." That tally is the
     last number a finished village still moves. Every goal is done, every
     building is at its best, there is nothing left to buy, and the one thing
     the hall has left to say is how much has been given away since.

     Nothing had looked at it. The hour-away version is held to its card by
     hiddenSweep; the live one -- a villager walking a load into a barn that is
     already at the ceiling, which is what a finished village does all day --
     was not watched at all. It is the easiest number in the game to leave
     behind, because a tally that stopped rising looks exactly like a tally
     rising slowly, and nothing else on the screen would be wrong.

     Counted off the villagers rather than off any figure the game reports:
     every tick, the loads that were in somebody's hands and are not any more.
     A carry only ever leaves a villager by being delivered, so that sum is
     what the village really carried home, worked out without asking the
     village anything.

       what it carried  =  what it kept  +  what it gave away

     exactly, in each state it can be in: at the ceiling, where all of it is
     given; with room, where none of it is; and with room for less than a load,
     where every delivery splits. And two rules about what does not belong in
     it -- nothing at all before the last goal, and nothing nobody carried: a
     statue sold into full barns pours its whole refund away and the tally must
     not notice.

       shareSweep()  -> { cases, refund, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What the hall says the next level allows, and what it then allows.

     The hall is the spine of the game and the most expensive thing in it --
     two thousand wood for the last step -- and the whole of what that buys is
     one row on its panel: "level 4 adds 🏠+3 🌾+1 🪵+1 📦+1 ⛲+1 🌬️+1 🏪+1".
     The mill and the market are not even in the build tray until the hall
     unlocks them, so for two of the four steps the best part of the purchase is
     a part the player cannot see coming and has to take the row's word for.

     Nothing had ever taken the row at its word. The promise is held here by
     buying the level and counting what the village may build afterwards, not by
     reading the table back -- the row and the table come from the same five
     lines of source, so an arithmetic that read them both would agree with
     itself and prove nothing.

       every step    the row names the level that is coming, and each figure on
                     it is exactly what the village gains the right to build
       while it is   the allowance has not moved yet, the row says so, and the
       being built   level it names is the one being paid for -- not the one
                     after it
       at the top    there is nothing left to buy and nothing is promised

       allowSweep()  -> { steps, rows, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The upgrade button gives a reason, and the reason can be acted on.

     It is the most pressed control in the game and it has seven things it can
     say. Six of them are refusals, and a refusal is a diagnosis: "Needs town
     hall level 3", "Needs another storehouse", "Need 🪵150 more". The source
     has already been caught twice giving advice that could not be taken -- "a
     player with all four storehouses the hall allows was told to get a bigger
     one, with no way to build another" is the note beside this very line, and
     the hall summary had the same fault -- and nothing watched for a third.

     So each reason is taken at its word and then DONE, and the button has to
     move on:

       Highest level             and the game refuses to sell another
       Building…                 the same, while the scaffolding is up
       Needs town hall level N   N is a level the hall can reach; reach it and
                                 the button stops asking
       Needs another storehouse  one may still be built -- and said only then
       Needs a bigger storehouse every one the hall allows is already standing
                                 -- and said only then
       (either)                  build every storehouse the hall allows and
                                 raise them as far as it allows, and storage
                                 stops being the answer
       Need 🪵X 🌾Y more          X and Y are exactly what is missing; hand them
                                 over and the button offers the upgrade
       Upgrade to N 🪵X 🌾Y       tapping it spends exactly that and the
                                 building is at level N with its scaffolding up

     And the seven are swept for across a grid of halls, storehouses, levels and
     purses, so that a reason which has quietly become unreachable is named --
     the lesson the hint strip taught, applied to the control beside it.

       buttonSweep()  -> { states, kinds, acted, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     Nothing the game draws is malformed.

     The rows of this interface are clauses joined by "   ·   ", assembled by
     about thirty conditionals, and every one of them has to ask the same
     question before it adds a divider: is there anything on the other side of
     it? The goal strip asked a different question -- whether the goal HAS
     something to buy, rather than whether there was anything to say about it --
     and buyProgress returns nothing at all when there is nothing left to name.
     So the one line that is always on screen read

       Raise every workplace to level 5   ·      ·   reward 🪵3400 🌾2200

     a divider with a hole where a clause should be.

     Nothing had ever looked at the SHAPE of a drawn string. textSweep measures
     how wide they are and contrastSweep measures what they are drawn against;
     both are happy with a row that says nothing in the middle. So is a row
     carrying the word "undefined", or "NaN/5", which is the other way a string
     built by concatenation fails and the way that reads worst of all.

     Every string the game paints, in every state this sweep can put it in:

       no empty clause      a divider with nothing between it and the next one
       no dangling divider  nor one hanging off either end
       nothing broken       no "undefined", "NaN" or "Infinity" anywhere in it

     Walked over every goal in the list -- which is where the fault was, and it
     needed the goal AND a village with nothing for it to name -- every
     building's panel at every level and under scaffolding, and the cards and
     tray states the HUD can be in.

       shapeSweep()  -> { strings, states, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The second line on the resource chip, held to the village.

     The two chips at the top of the screen are the most looked at thing in the
     game, and under each number is a line saying what is happening to it. It
     has five things it can say and every one of them is a claim about the next
     minute of play:

       +1.4/s         this much is arriving
       idle           nobody is making it
       wasting 5.7/s  this much is being carried home and thrown away
       sharing 5.7/s  the same, once the village is finished and gives it away
       storage full   full, and nothing is being made to lose

     Only the first has ever been checked, and only as a number inside the game
     rather than as the string on the chip. "idle" has a fault written into the
     source beside it -- "that read idle for the first EIGHTEEN seconds of a new
     player's first lumber camp while the wood above it climbed" -- and nothing
     has watched it since. The wasting figure has never been compared to
     anything at all: it is potentialRate, the village's own guess at what it
     WOULD deliver, quoted at the one moment the measured rate reads zero
     because every load is being destroyed on arrival.

     So each line is read off the chip and then measured against the village for
     four minutes:

       +X/s and idle    what the stores really gain
       wasting/sharing  what the villagers really carry home and cannot keep,
                        counted off their hands the way shareSweep counts it
       the word         "sharing" exactly when the village is finished
       storage full     full, and nothing arriving to lose

     Allowed one load of slack plus a tenth, because a measurement made of
     eight-unit loads cannot be finer than eight units, and half a tenth more
     for the rounding the chip itself does.

       chipSweep()  -> { scenes, seen, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The number the placement decision is made on.

     Dragging a building around puts a pill under the finger saying what it
     would deliver on the tile it is over -- "0.45/s here   ·   best 1.04" --
     and that is the whole of the spot-choosing decision. It is the one promise
     in the game made BEFORE the money is spent, which makes it the most
     expensive one to get wrong, and the source records getting it wrong once
     already: "the label quoted one worker's share, so a lumber camp whose panel
     said 0.92/s delivered was now 0.46 here: the same camp, two numbers, a
     factor of two apart."

     moveLabelSweep holds the "now" half of that pill -- what the building
     delivers where it already stands -- against its own panel. The "here" half,
     the number about the spot being chosen, has never been checked against
     anything, and it is the half the player is actually reading.

     So it is bought. The pill is read, the building is placed on that exact
     tile, the village is left to settle, and its panel is asked what it
     delivers:

       the number is the    read "X/s here", build it there, and the panel says
       spot's               X/s delivered
       the spots differ     and by enough to be worth choosing between, or the
                            check above is satisfied by a label that ignores
                            the tile entirely
       best is the best     every legal tile on the island is tried and not one
                            of them beats what the pill calls best, and at least
                            one reaches it
       and the price        with an empty purse it says what is missing instead,
                            and hands the number over the moment it is paid

       spotSweep()  -> { tried, spread, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What the trade card says about itself.

     Each stall carries one line between the two numbers, and it is the only
     thing on the board telling the player what to do about that offer:

       need 🪵420    this much short of being able to take it
       no room       the payout would not fit
       best rate     nothing on the board trades better
       tap to trade  takeable, and not the best

     orderSweep holds the board's MECHANICS -- a stall keeps its place when its
     neighbour is filled, an offer the player is saving for is never handed to
     the next trader -- and nothing had ever read what the cards say.

     "best rate" is the one with something to get wrong, because it was asked of
     the size label rather than of the trade. The tier is a note about how big
     an offer was when it was written; the rate is what the player is being told
     about, and the two come apart on a board that outlived the ceiling it was
     written against.

       the shortfall    is what is missing, and handing it over makes the card
                        takeable
       no room          the game refuses it, and making room makes it takeable
       best rate        no other card on the board trades better, by the same
                        share-of-the-ceiling comparison makeOrder uses
       tap to trade     the tap works: exactly giveN leaves, exactly getN
                        arrives, and the stall is left empty
       and all four     appear, or a line nobody can reach is a line nobody
                        can check

       cardSweep()  -> { boards, seen, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What a badge over a building means.

     The badges are the only layer of this game a player reads without opening
     anything: a green tick to say this can be improved, an amber "−56%" to say
     the walk is eating it, an orange "!" to say nobody is working it, a calm
     pause to say it is resting because there is nowhere to put what it makes,
     and the hall's level. Everything else has to be tapped for.

     Two sweeps already watch them and neither reads them: badgeSweep measures
     how big they are drawn and badgeOverlapSweep checks that no two land on
     each other. What any of them MEANS has never been asked.

     It is asked here against the village rather than against the code that drew
     it -- restating drawStatus back at itself would prove only that it is
     consistent with itself:

       the tick     the panel's own button offers the upgrade. A tick that leads
                    to "Need 🪵140 more" is a wasted tap, and the tick is an
                    invitation to tap
       the amber    the building really is losing that much: moved beside a
       figure       store it delivers about 1/(1-n) times what it did
       the "!"      nobody is working it AND there is room for what it makes, so
                    people are the answer
       the pause    nobody is working it AND there is NO room, so storage is.
                    The source is explicit about why these two must not swap:
                    "a player whose stores were full saw three alarmed farms and
                    the obvious response -- build a house -- makes it worse"
       nothing      a producer wearing no badge is being worked
       and all five appear, or a badge nobody can see is a badge nobody checks

     Badges carry no name, so each is matched to its building by the x it was
     queued at, which is the building's own centre; the scenes put everything in
     its own column so that is unambiguous. The resting badge draws no text at
     all -- two bars rather than a glyph, because the pause character is not in
     every font -- so lastBadges is what gets read rather than the canvas.

       markSweep()  -> { scenes, seen, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The one line that tells the player what to do with the whole village.

     The hall's summary names the binding constraint and what to do about it:
     "12 villagers · 7 idle — build a workplace · workplaces at 41%". It is the
     only sentence in the game about the village as a whole rather than about
     one building, and the source records two separate faults in it -- "5 posts
     empty -- build a house" over a granary at the ceiling, where the villagers
     that house brings would make goods destroyed on arrival; and a village with
     every storehouse the hall allows being told to build another.

     Nothing had read it. The counts, the order the constraints are named in,
     and the advice at the end are three different things to get wrong, and the
     advice comes from remedy(), which has four answers in a cascade and is used
     by the placement pill as well.

       the count is the count    the idle figure is villagers with no job; the
                                 empty figure is posts with nobody in them
       doing it relieves it      build what it names and the number falls
       the binding one wins      a granary at the ceiling is named ahead of
                                 empty posts, because filling those posts makes
                                 it worse
       the advice can be taken   "build" only where something may be built,
                                 "improve" only where a next level adds a post
                                 or a resident, "raise the town hall" only where
                                 the hall can still grow, and "no more possible"
                                 only when none of the three is true
       and all four answers      appear, along with every clause the row has

       adviceSweep()  -> { rows, seen, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The card that asks for five thousand wood.

     Land is the second most expensive thing a player buys and the last ring is
     the single largest purchase in the game. The dialogue that sells it makes
     four claims, and not one of them had ever been read -- the whole card is
     absent from this file, text and all.

       14 x 14 tiles, from 12 x 12        what the island becomes, and was
       131 of your 144 tiles are still    how much room there already is, which
       empty                              is the only thing that says whether
                                          this is a claim you need or forty
                                          tiles of grass you already had
       🪵 3750  🌾 3200                    what it costs
       Claim it / Need 🪵140 more /        and whether you can, and if not why
       Your stores cannot hold this
       much yet

     All four are bought and checked against the island afterwards. The empty
     count is the one with arithmetic in it: it must count the roads and the
     statues as well as the buildings, which is the easy half to forget, and it
     is asked here against the game's own map of what stands where rather than
     against the sum the card makes.

     And the last ring is its own case -- no price, no button, "the whole island
     is yours" -- because a card that still asks for money when there is nothing
     to sell is the shape of fault this game has had three times over.

       landSweep()  -> { rings, seen, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     The three controls whose whole job is to NOT do something.

     Selling is the one move the game says cannot be undone, so it asks twice.
     Moving is the other two-tap control. And the speaker is the only thing in
     the interface that promises an absence: "sound you cannot switch off is
     worse than no sound".

     clockSweep holds the sell arm's clock -- that it goes to sleep, and that
     looking at another building puts it away -- and does it by setting sellArm
     by hand, because that sweep is about the clock. The TAP path has never been
     walked: nothing in this file has ever pressed the sell button and checked
     that the building is still standing afterwards. That is the half the player
     relies on.

       one tap never acts    the building is still there, and the button says it
                             is waiting
       two taps do           and the refund is exactly what the panel quoted
       the hall refuses      twice over
       the arm is one        armed on a farm, open a lumber camp, and its first
       building's            tap arms rather than sells
       and it expires        wait it out and the next tap arms again
       a move is the same    one tap on a tile puts the building nowhere; a
                             second on the SAME tile moves it
       and the speaker       while it is off, not one oscillator is made by any
       really is off         sound in the game

     Every tap goes through the real handler at the real hit region. Two things
     the scene has to get right, both learned the hard way: a card -- the goal
     banner, the welcome-back card, the finished card -- swallows a tap whole,
     so the goals are parked and the cards cleared before every press; and a
     building placed a moment ago is still scaffolding, which is not a thing
     that can be sold.

       confirmSweep()  -> { presses, muted, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     You cannot lose the island.

     framingSweep holds the camera's own framing move -- fit the village and
     nothing is cropped. Nobody has ever held the camera the PLAYER drives. A
     finger can push it anywhere the clamp allows, and the clamp is written
     against the whole grid rather than against the claim, on purpose: tapping
     the dark ground is how land is bought, so looking away from your own
     village is a thing the game has to let you do.

     Which makes the question a different one. Not "is the village on screen" --
     it is allowed not to be -- but "is there any ground at all", because a
     screen of open sea is a game with no way back. There is no recentre button
     to press; the only way home is to drag, and a player who cannot see which
     way the island lies cannot drag towards it.

       the island is never   drag to the limit in eight directions, at five
       wholly gone           zooms, on three sizes of claim, and some of the
                             grid is still on screen every time
       and it is ground      the tile under the middle of that view can be
       you can use           tapped, and it opens the claim dialogue or a
                             building -- the reason the clamp is drawn around
                             the grid rather than the claim
       the drags work        or a camera that ignored every finger would pass
                             the two rules above
       the zoom stays        inside its own bounds after any pinch
       and a flick settles   rather than drifting for ever

     Driven through real pointer events at the real canvas, like gestureSweep --
     setting CAM by hand is not a test of anything, because the clamp lives in
     the handlers and a written value simply stands.

       panSweep()  -> { cases, fewest, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     What a frame costs to draw.

     Nothing in this file has ever looked at the cost of a frame, and the game
     is about to be carried around on a phone. The obvious check -- time a draw
     -- is not available here and would not be worth much if it were: the pane
     this runs in is usually hidden, requestAnimationFrame does not fire in a
     hidden pane at all, and timing canvas work with no compositing measures the
     browser rather than the game. Measured anyway, for the record: draw() in a
     tight loop reads about sixty milliseconds, and an EMPTY village reads the
     same sixty, which is how you know the number is about the pane and not
     about the village. What a frame really costs on a phone is a thing to find
     out on a phone.

     What can be counted honestly is the WORK: how many times a frame reaches
     for the canvas. That is machine-independent, repeats exactly, and catches
     the failure that matters -- work that grows faster than the village does.

     The heaviest village the game allows: hall five, every building its
     allowance permits, the decoration budget full, seventy-two villagers, at
     night with the lamps lit and a panel open.

       one image per thing   every building, decoration and villager costs about
                             one drawImage, and the scenery that is left over
                             shrinks as the village builds over it -- 41 spare
                             images in a first village, 8 in a full one
       nothing vanishes      and not far fewer, or something has stopped being
                             drawn
       a ceiling on the      the whole frame, every call, under a stated number
       whole frame
       and it repeats        two draws of the same village cost the same

     The last one is belt-and-braces rather than a rule with teeth, and that
     was measured rather than assumed: the badge queue is emptied BOTH at the
     top of the depth pass and again inside flushBadges, so taking either clear
     away leaves the counts identical to the tenth -- ten draws of the same
     village, 636 calls every time, with the clear in flushBadges removed. No
     single faithful mutation makes a frame grow. Kept because it costs nothing
     and the day one of those two clears goes, this is what says so.

       costSweep()  -> { village, perFrame, spare, fails }
  --------------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------------
     Every picture the game asks for, and the copy that goes on the phone.

     artFor keeps a deliberately quiet fallback: a key with no file 404s once,
     is remembered as null, and the building is drawn procedurally for ever
     after. "No file: stay procedural, silently" is the comment beside it, and
     it is the right behaviour -- a missing sprite should not take the game
     down. It also means a missing sprite is invisible to every other checker
     in this file. The village still draws, the panels still read, the rates
     are still right, and nobody is told that the market is a coloured box.

     That matters more than usual right now, because the thing that ships is
     www/ and the thing this runs against is the repository root. A sprite
     added to one and not the other looks perfect here and is a box on the
     phone, and nothing in this file would have said a word.

       every key loads     asked of the game -- its own building list, its own
                           villagers, its own scenery -- rather than written
                           down here, so a ninth building is covered the day
                           it is added
       and ships           the same key fetched from www/, which is the tree
                           the APK carries
       and the question    a name that is not there really does come back
       is a real one       missing, or asking the server proves nothing

     A third rule was wanted and dropped: every building whose sprite is fitted
     by hand should have an entry in ART_FIT, since the default is a plain
     bottom-centre fit and on a measured sprite that is not a fallback, it is
     wrong. ART_FIT is not exported, and exporting a constant so that this file
     can read it is the wrong way round -- the game does not owe the harness a
     window. Left here as the next thing to measure if the fittings ever drift.

       artSweep()  -> { asked, loaded, shipped, fails }
  --------------------------------------------------------------------------- */
  window.artSweep = async function () {
    const V = window.__v, fails = [];
    /* The keys the GAME has asked for, read out of its own cache rather than
       listed here. Everything it can draw is requested once at boot -- every
       building, every villager, the ground, the water and the scenery -- so
       ART is the game saying what it needs, and a ninth building is covered
       the day somebody adds one. */
    const keys = Object.keys(V.ART || {}).sort();
    if (keys.length < 15)
      fails.push('the game has asked for only ' + keys.length + ' pictures, so this sweep found almost nothing to check');

    /* A walk cycle is an OPTIONAL SET, and the rule above does not fit it.

       The rule is right about a building: no sprite means a coloured box,
       and nothing else in this file would say so. A villager with no walk
       frames falls back to his standing sprite, which is a real painting --
       so an absent cycle is a supported state, not a silent hole, and the
       game asks for the frames at boot precisely so it can find out.

       What IS a fault is half a cycle. The game takes six frames or none,
       so one to five on disk are ignored in their entirety: the artist sees
       no change, nothing errors, and the frames they drew do nothing at
       all. That is the silent failure here, and it is the one worth
       checking -- so the exception is not a hole, it is a different rule.

       Named by the key rather than by a list kept here, so a fourth
       villager with a cycle is covered the day somebody draws one. Split
       rather than matched, for the reason this file has written down
       twice: a pattern loses its backslashes on the way in. */
    /* More than one kind of set now. A villager's walk is six drawings and
       the beacon is five, and the rule is the same for both: all of them or
       none, because the game takes a whole set or ignores it, and the silent
       failure is the HALF set -- frames on disk that are drawn nowhere, with
       the artist seeing no change and nothing reporting a thing.

       Named off the key rather than off a list kept here, so the next set
       somebody invents is covered the day they name its keys in this shape. */
    const SET_MARKS = ['_walk', '_stage'];
    const markIn = k => { for (const m of SET_MARKS) { const at = k.indexOf(m); if (at >= 0) return at; } return -1; };
    /* A building whose art IS the set has no single picture, and demanding one
       reports a hole that is not there -- measured, on the beacon: "the game
       asks for a picture of beacon and there is none", for a file that is not
       supposed to exist. The game says which keys those are rather than this
       file keeping a list of them. */
    const SET_ONLY = new Set(Object.keys(V.SET_ART || {}));
    /* And art the game is designed to manage WITHOUT.

       The things found on claimed land are placed only once their picture
       exists, so an absent file is a feature that has not arrived rather than
       a building drawn as a coloured box. Demanding it would report a hole
       that is not there -- the same mistake the beacon taught, so the same
       answer: the game says which keys those are.

       Optional about EXISTING, not about being right. A find whose art has
       turned up is checked like any other picture; and findSweep is what
       holds the game to the other half of the bargain, that an absent file
       really does mean an absent landmark rather than a box on the grass. */
    /* The kinds whose picture may not exist yet: the landmarks, which appear
       only once their art does, and anything marked standIn, which is drawn by
       the procedural building until somebody draws it. Both are checked as
       soon as the file appears -- this only says that its absence is not a
       failure. */
    const OPTIONAL = new Set([...(V.FIND_KEYS || []),
      ...V.BUILDINGS.filter(b => b.standIn).map(b => b.key)]);
    const cycles = new Map(), plain = [];
    for (const k of keys) {
      if (SET_ONLY.has(k)) continue;
      if (OPTIONAL.has(k) && !V.artFor(k)) continue;
      const at = markIn(k);
      if (at < 0) { plain.push(k); continue; }
      const who = k.slice(0, at);
      if (!cycles.has(who)) cycles.set(who, []);
      cycles.get(who).push(k);
    }

    /* Every one of them arrived. artFor returns the image only once it has
       loaded, and null for ever after a 404 -- so this is the one place the
       quiet fallback is made to speak. */
    for (const k of keys) V.artFor(k);
    for (let i = 0; i < 40; i++) {
      if (plain.every(k => V.artFor(k))) break;
      await new Promise(r => setTimeout(r, 50));
    }
    /* and a short grace for the cycles, which are allowed to be absent and
       so can never satisfy a wait that insists on them */
    for (let i = 0; i < 10 && !keys.every(k => V.artFor(k)); i++)
      await new Promise(r => setTimeout(r, 50));

    const loaded = keys.filter(k => !!V.artFor(k));
    for (const k of plain) if (!V.artFor(k))
      fails.push('the game asks for a picture of ' + k + ' and there is none, so it is drawn as a plain shape and nothing else in this file would notice');

    /* The cycles: all of a set or none of it. */
    const whole = [], ground = new Map(), regs = [];
    for (const [who, list] of cycles) {
      const here = list.filter(k => !!V.artFor(k));
      if (!here.length) continue;                 // none drawn yet, which is allowed
      if (here.length < list.length) {
        fails.push(who + ' has ' + here.length + ' of its ' + list.length
          + ' drawings, and the game takes a whole set or none -- so those are drawn nowhere'
          + ' and nothing says so');
        continue;
      }
      whole.push(...list);
      ground.set(who, list);
    }

    /* The frames of a cycle have to be REGISTERED on each other, and nothing
       anywhere else would say a word if they stopped being.

       The game draws every frame to the same height at the same place, so
       the registration lives entirely in the pictures: the figure has to be
       the same size in all six and standing on the same line in all six. Get
       that wrong and the villager swells and shrinks and bobs through the
       floor as the frames cut, which is a worse walk than no walk at all --
       and it is silent. No file is missing, no key is unloaded, every sweep
       passes, and the only report is a person watching the screen.

       It is not hypothetical. The first real set to arrive was drawn a
       quarter apart in size with the feet a hundred and fifty pixels adrift,
       because a generator cannot count pixels and the brief asking it to was
       never going to work. prep-art now fits the frames to each other before
       it cuts them, and this is the check on that fit -- the one thing that
       would catch the fit going wrong on art nobody has looked at yet.

       One per cent of the height, which is three pixels on a villager, and
       three pixels is rounding. The fit does not approximate the ground
       line, it pins it: the bottoms are made equal and all that is left is
       where the placement was rounded to a whole pixel. Measured both ways
       on the first real set -- one pixel with the fit, seven to ten without
       -- so the line sits between two things that are nowhere near each
       other, which is where a line should sit. */
    const LINE = 0.01;
    const bottomOf = im => {
      const w = im.naturalWidth, h = im.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      for (let y = h - 1; y >= 0; y--) {
        let on = 0;
        for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) on++;
        if (on > w * 0.004) return y;
      }
      return -1;
    };
    for (const [who, list] of ground) {
      const ims = list.map(k => V.artFor(k));
      const sizes = new Set(ims.map(im => im.naturalWidth + 'x' + im.naturalHeight));
      if (sizes.size > 1) {
        fails.push(who + ' has walk frames of ' + sizes.size + ' different sizes (' + [...sizes].join(', ')
          + '), and the game fits every frame to one height -- so the villager changes width mid-stride');
        continue;
      }
      const h = ims[0].naturalHeight;
      const lows = ims.map(bottomOf);
      if (lows.some(y => y < 0)) { fails.push(who + ' has a walk frame that is entirely transparent'); continue; }
      const spread = Math.max(...lows) - Math.min(...lows);
      regs.push(who.replace('villager_', '') + ' feet within ' + spread + 'px of ' + h);
      if (spread > h * LINE)
        fails.push(who + ' has its feet ' + spread + 'px apart across its walk cycle'
          + ' (lowest rows ' + lows.join(', ') + ' of ' + h + '), so the villager bobs through the floor'
          + ' as the frames cut');
    }

    /* And the copy that goes on the phone. The dev server serves the
       repository root, so the shipped tree and the working one are both
       reachable from here and can be told apart -- which is the whole point,
       because they are the two that drift. */
    let shipped = 0;
    for (const k of plain.concat(whole)) {
      let ok = false;
      try { ok = (await fetch('/www/art/' + k + '.webp')).status === 200; } catch (e) { ok = false; }
      if (ok) shipped++;
      else fails.push('art/' + k + '.webp is not in www/, which is the tree the phone gets');
    }
    /* And the check itself is worth something only if a missing file would
       really come back missing. */
    {
      let ghost = true;
      try { ghost = (await fetch('/www/art/__nothing_is_here__.webp')).status === 200; } catch (e) { ghost = false; }
      if (ghost)
        fails.push('the server answers for a picture that does not exist, so asking it proves nothing');
    }

    return { asked: keys.length, loaded: loaded.length, shipped, regs, keys, fails };
  };
  window.costSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [];
    const NAMES = ['drawImage', 'fillText', 'fill', 'stroke', 'save', 'roundRect'];
    const count = () => {
      const ops = {}, saved = {};
      for (const n of NAMES) { const o = ctx[n].bind(ctx); saved[n] = o;
        ctx[n] = function (...a) { ops[n] = (ops[n] || 0) + 1; return o(...a); }; }
      try { V.draw(); } finally { for (const n of NAMES) ctx[n] = saved[n]; }
      let total = 0; for (const n in ops) total += ops[n];
      return { ...ops, total };
    };
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const seat = k => { const L = V.landBounds(); for (const k of V.RES) V.res[k] = 9e5;
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) if (put(k, c, r)) return true;
      return false; };
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 60; i++) V.step(1 / 30);
    };

    /* How much a frame may spend over one image per standing thing.

       The spare is the scenery -- the trees and rocks on ground nobody has
       built on -- and the whole point of it is that it SHRINKS as the village
       covers the island: 41 measured on a first village, 39 an hour in, 8 on a
       full one. One allowance for all three would be a bar only the bare
       island ever approaches, and a full island drawing its scenery straight
       through the buildings standing on it would pass by eighteen. So the
       allowance follows the village. */
    const SPARE = 60;
    /* And the whole frame, which is about half as much again as the heaviest
       state measures: room for the game to grow, not for it to double. */
    const CEILING = 1200;

    const rows = [];
    let perFrame = null, spare = null;
    for (const [what, tier, hall, kinds, decor, spareHere] of [
      ['a first village', 0, 1, ['house'], 0, SPARE],
      ['an hour in', 2, 3, ['house', 'house', 'farm', 'lumber', 'store', 'well'], 6, SPARE],
      ['the heaviest village the game allows', V.LAND_MAX, 5, null, V.DECOR_MAX, 25],
    ]) {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders.length = 0;
      V.goalIdx = 0; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = hall; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; settle();
      if (kinds) for (const k of kinds) seat(k);
      else { const allow = V.HALL[V.HALL.length - 1].allow;
        for (const [k, n] of Object.entries(allow)) for (let i = 0; i < n; i++) seat(k); }
      for (let i = 0; i < decor; i++) seat(i % 2 ? 'statue' : 'path');
      if (!kinds) for (const q of V.placed) if (!V.isDecor(q.key)) q.lvl = V.LVL_MAX;
      settle();
      for (let i = 0; i < 180 * 30; i++) V.step(1 / 30);
      V.camFit(true); V.step(0.001);

      const things = V.placed.length + V.villagers.length;
      const ops = count();
      rows.push({ what, things, drawImage: ops.drawImage, total: ops.total });
      if (ops.drawImage > things + spareHere)
        fails.push(what + ' reaches for an image ' + ops.drawImage + ' times with '
          + things + ' things standing on it, which is more than one each and '
          + spareHere + ' for the scenery');
      if (ops.drawImage < things * 0.9)
        fails.push(what + ' has ' + things + ' things standing on it and draws only '
          + ops.drawImage + ' images, so something is not being drawn at all');
      if (ops.total > CEILING)
        fails.push(what + ' spends ' + ops.total + ' calls on one frame, past the '
          + CEILING + ' this game gives itself');
      if (!kinds) { perFrame = ops.total; spare = ops.drawImage - things; }
    }

    /* ---- the heaviest state there is, rather than the heaviest village ----

       Night, with the lamps lit and a panel open, which measured as the dearest
       of the six states the game can be in. */
    {
      const realNow = Date.now;
      try {
        const DAY = 8 * 60 * 1000;
        Date.now = () => realNow() - (realNow() % DAY) + DAY * 0.75;
        const mk = V.placed.find(p => p.key === 'market') || V.placed[0];
        V.panel = mk.id; V.step(0.001);
        const ops = count();
        rows.push({ what: 'the same village at night with a panel open',
          things: V.placed.length + V.villagers.length, drawImage: ops.drawImage, total: ops.total });
        if (ops.total > CEILING)
          fails.push('a frame at night with a panel open spends ' + ops.total
            + ' calls, past the ' + CEILING + ' this game gives itself');
        perFrame = Math.max(perFrame || 0, ops.total);
        /* And it repeats. */
        const again = count();
        for (const n of NAMES)
          if ((again[n] || 0) !== (ops[n] || 0))
            fails.push('two draws of the same village reached for ' + n + ' '
              + (ops[n] || 0) + ' times and then ' + (again[n] || 0));
      } finally { Date.now = realNow; V.panel = null; V.step(0.001); }
    }

    V.goalIdx = 0; V.step(0.001);
    return { village: rows, perFrame, spare, bars: { spare: SPARE, ceiling: CEILING }, fails };
  };

  window.panSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas');
    const b = cv.getBoundingClientRect();
    const fails = [];
    if (!(b.width > 0) || !(b.height > 0))
      return { cases: 0, fewest: null, fails: ['the canvas has no size on screen, so no drag could be measured'] };
    const ev = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id,
      clientX: x, clientY: y, pointerType: 'touch', isPrimary: id === 1, button: 0 }));
    const drag = (dx, dy) => {
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      ev('pointerdown', 9, cx, cy);
      for (let i = 1; i <= 20; i++) ev('pointermove', 9, cx + dx * i / 20, cy + dy * i / 20);
      ev('pointerup', 9, cx + dx, cy + dy);
      for (let i = 0; i < 120; i++) V.step(1 / 30);      // and let any flick run out
    };
    const onScreen = (c, r) => { const w = V.tileToWorld(c, r), p = V.camProject(w.x, w.y);
      return p.x >= 0 && p.x <= 1024 && p.y >= V.hudTop() && p.y <= V.hudBot(); };
    /* The whole grid, which is the island the clamp is drawn around -- read off
       the largest claim the game has rather than written down here. */
    const EDGE = V.LAND[V.LAND_MAX];
    const ground = () => { let n = 0;
      for (let c = EDGE.lo; c <= EDGE.hi; c++) for (let r = EDGE.lo; r <= EDGE.hi; r++)
        if (onScreen(c, r)) n++;
      return n; };

    V.placed.length = 0; V.villagers.length = 0; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
    V.sel = null; V.moving = null; V.claimAsk = false; V.orders.length = 0;
    V.goalIdx = 0; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 3; V.placed[0].t = 1;
    for (const k of V.RES) V.res[k] = 9e5;
    for (let i = 0; i < 10 * 30; i++) V.step(1 / 30);

    const WAYS = [[900, 0], [-900, 0], [0, 900], [0, -900],
      [800, 800], [-800, -800], [800, -800], [-800, 800]];
    const ZOOMS = [0.55, 0.8, 1.4, 1.8, 2.2];
    let cases = 0, fewest = Infinity, worstAt = null, moved = 0;

    for (const tier of [0, 2, V.LAND_MAX]) {
      V.landTier = tier; V.coverPlaced();
      for (const z of ZOOMS) for (const [dx, dy] of WAYS) {
        V.camFit(true); V.CAM.z = z; V.step(0.001);
        const from = { x: V.CAM.x, y: V.CAM.y };
        for (let k = 0; k < 8; k++) drag(dx, dy);        // as far as it will go
        cases++;
        if (Math.hypot(V.CAM.x - from.x, V.CAM.y - from.y) > 1) moved++;
        if (!Number.isFinite(V.CAM.x) || !Number.isFinite(V.CAM.y) || !Number.isFinite(V.CAM.z))
          fails.push('dragging ' + dx + ',' + dy + ' at zoom ' + z + ' left the camera at no number at all');
        if (V.CAM.z < 0.55 - 1e-9 || V.CAM.z > 2.2 + 1e-9)
          fails.push('dragging left the zoom at ' + V.CAM.z);
        const n = ground();
        if (n < fewest) { fewest = n; worstAt = { tier, z, dx, dy }; }
        if (n === 0)
          fails.push('dragging ' + dx + ',' + dy + ' at zoom ' + z + ' on a ' + (EDGE.hi - EDGE.lo + 1)
            + '-tile island left nothing but open sea on screen');
      }
    }
    /* A camera that ignored the finger would satisfy every line above. */
    if (moved < cases * 0.8)
      fails.push('only ' + moved + ' of ' + cases + ' drags moved the camera at all');

    /* ---- and the ground you are left looking at is ground you can use ----

       This is why the clamp is drawn around the grid and not around the claim:
       the dark land is what a player taps to buy more of it. */
    {
      V.landTier = 0; V.coverPlaced(); V.camFit(true); V.CAM.z = 2.2; V.step(0.001);
      for (let k = 0; k < 8; k++) drag(900, 0);
      V.claimAsk = false; V.panel = null; V.step(0.001);
      const mid = V.camUnproject(512, (V.hudTop() + V.hudBot()) / 2);
      V.tap(512, (V.hudTop() + V.hudBot()) / 2);
      V.step(0.001);
      if (!V.claimAsk && V.panel == null)
        fails.push('after dragging as far west as the camera goes, the middle of the screen is'
          + ' neither land to claim nor a building to open');
      V.claimAsk = false; V.panel = null;
    }

    /* ---- and a pinch cannot push the zoom past its own ends ----

       Dragging never touches the zoom, so a sweep made only of drags cannot
       see the clamp inside zoomHolding at all -- the mutation that removed it
       walked through the first version of this. Pinched wide open and shut
       again, hard, several times over, because the clamp is applied per
       gesture and one pinch that happens to land inside the range proves
       nothing. */
    {
      V.landTier = V.LAND_MAX; V.coverPlaced(); V.camFit(true); V.step(0.001);
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const pinch = out => {
        for (let round = 0; round < 6; round++) {
          const near = 40, far = 400;
          const a0 = out ? near : far, a1 = out ? far : near;
          ev('pointerdown', 11, cx - a0, cy); ev('pointerdown', 12, cx + a0, cy);
          for (let i = 1; i <= 12; i++) {
            const d = a0 + (a1 - a0) * i / 12;
            ev('pointermove', 11, cx - d, cy); ev('pointermove', 12, cx + d, cy);
          }
          ev('pointerup', 11, cx - a1, cy); ev('pointerup', 12, cx + a1, cy);
          for (let i = 0; i < 30; i++) V.step(1 / 30);
        }
      };
      for (const out of [true, false, true, false]) {
        pinch(out);
        cases++;
        if (!Number.isFinite(V.CAM.z))
          fails.push('a pinch left the zoom at no number at all');
        else if (V.CAM.z < 0.55 - 1e-9 || V.CAM.z > 2.2 + 1e-9)
          fails.push('pinching ' + (out ? 'open' : 'shut') + ' left the zoom at '
            + V.CAM.z.toFixed(3) + ', outside the 0.55 to 2.2 the game allows');
        if (ground() === 0)
          fails.push('pinching ' + (out ? 'open' : 'shut') + ' left nothing but open sea on screen');
      }
      /* And the two ends are actually reached, or the bounds are never asked
         about. */
      pinch(true);
      if (V.CAM.z < 2.2 - 1e-6) fails.push('pinching open never reached the far end of the zoom: '
        + V.CAM.z.toFixed(3));
      pinch(false);
      if (V.CAM.z > 0.55 + 1e-6) fails.push('pinching shut never reached the near end of the zoom: '
        + V.CAM.z.toFixed(3));
    }

    /* A flick coming to rest was going to be the fifth rule here and is not,
       because it cannot be made to fail.

       stepCam drops the flick when it has slowed below FLING_MIN OR when the
       clamp bites, and on an island this size the clamp always bites first:
       set the decay to 1, so the flick never loses any speed at all, and the
       camera carries 650.9 world units and stops -- which is exactly what the
       honest game does, to the tenth. The decay is real and it shapes how a
       flick FEELS, but from outside it is invisible, because the edge of the
       world arrives before the friction does. Written down rather than
       measured by a rule that would pass whatever the constant said.

       Resting is still covered: every drag above is followed by four seconds
       of ticks, and the camera has to be at a number afterwards. */

    /* Wherever the clamp lets go of the camera, the middle of the screen is a
       tile -- at every shape of screen, not just the one this is running in.

       Everything above drives real pointer events at real client coordinates,
       so it can only ever ask the browser window it is in, and the window it
       has always been in is a desktop one. The clamp is arithmetic, though, so
       it can be asked directly: shove the camera a million pixels at each of
       the eight compass points, let the clamp catch it, and look at what is in
       the middle. asScreen changes the canvas height and so the scale, which
       is the whole of what made this shape-dependent -- the margin the clamp
       keeps is a fraction of a HALF-VIEW, and a narrow screen has a narrow one.

       The corners are the cases that matter. The grid is a diamond in world
       space inside a box, and the clamp was drawn around the box, so the four
       corner regions of the box are water the camera could sit in the middle
       of. A straight push west or north never finds that; a push to a corner
       does, and so does a push west from a camera the player had left high or
       low, which is what the drags above happened to do. */
    {
      const keepW = window.innerWidth, keepH = window.innerHeight;
      const keepZ = V.CAM.z, keepX = V.CAM.x, keepY = V.CAM.y, keepTier = V.landTier;
      const WAY = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
      let asked = 0;
      try {
        for (const [sw, sh] of [[1200, 800], [390, 844], [360, 780], [360, 640]]) {
          asScreen(sw, sh);
          for (const tier of [0, 2, V.LAND_MAX]) {
            V.landTier = tier; V.coverPlaced();
            for (const z of [0.55, 1.4, 2.2]) for (const [dx, dy] of WAY) {
              V.CAM.z = z; V.CAM.x = dx * 1e6; V.CAM.y = dy * 1e6;
              V.camClamp();
              asked++;
              const t = V.worldToTile(V.CAM.x, V.CAM.y);
              const c = Math.round(t.c), r = Math.round(t.r);
              if (!(c >= 0 && r >= 0 && c < V.GW && r < V.GH))
                fails.push('pushed ' + dx + ',' + dy + ' at zoom ' + z + ' on a ' + tier
                  + '-ring claim at ' + sw + 'x' + sh + ', the clamp left the middle of the screen'
                  + ' at tile ' + t.c.toFixed(2) + ', ' + t.r.toFixed(2) + ', which is not on the grid');
            }
          }
        }
      } finally {
        asScreen(keepW, keepH);
        V.landTier = keepTier; V.coverPlaced();
        V.CAM.z = keepZ; V.CAM.x = keepX; V.CAM.y = keepY;
      }
      if (asked < 200) fails.push('only ' + asked + ' camera limits were asked for, so the corner block'
        + ' proved almost nothing');
    }

    V.camFit(true); V.step(0.001);
    return { cases, fewest: fewest === Infinity ? null : fewest, worstAt, moved, fails };
  };

  window.confirmSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const seat = k => { const L = V.landBounds(); for (const k of V.RES) V.res[k] = 9e5;
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (put(k, c, r)) return V.placed[V.placed.length - 1];
      return null; };
    /* Long enough for anything just placed to come out of its scaffolding. */
    const done = () => { for (let i = 0; i < 10 * 30; i++) V.step(1 / 30); };
    /* Nothing on screen that would eat the press. */
    const clear = () => { V.goalDone = null; V.away = null; V.finished = null;
      V.claimAsk = false; V.goalIdx = parkGoals(); };
    const fresh = () => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.panel = null; V.sel = null; V.moving = null; V.orders.length = 0;
      V.sellArm = null; V.armed = null;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; done(); clear();
    };
    const sellLabel = () => {
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      /* The face of the button, not the warning row above it: 'Selling it
         stops 🌾0.32/s arriving' also begins with Sell. */
      return lines.find(t => /^(Cannot sell$|Tap again to (sell|remove)$|Sell[ ·]|Remove[ ·])/.test(t)) || '';
    };
    const press = p => { V.panel = p.id; V.step(0.001); clear();
      const R = V.panelRects(); V.tap(R.sell.x, R.sell.y); V.step(0.001); clear(); };
    let presses = 0;

    /* ---- one tap waits, two taps sell ---- */
    fresh();
    { const farm = seat('farm'); seat('lumber'); done(); clear();
      for (const k of V.RES) V.res[k] = 100; V.step(0.001); clear();
      if (!farm || farm.t < 1) fails.push('the sell check had no finished building to sell');
      else {
        V.panel = farm.id; V.step(0.001); clear();
        const quoted = V.sellValue(farm) || {};
        const before = { ...Object.fromEntries(V.RES.map(k => [k, V.res[k]])), n: V.placed.length };
        const idle = sellLabel();
        press(farm); presses++;
        if (!V.placed.includes(farm))
          fails.push('one tap on the sell button took the building away');
        if (!(V.sellArm && V.sellArm.id === farm.id))
          fails.push('one tap on the sell button did not put it on notice');
        const armed = sellLabel();
        if (!/^Tap again/.test(armed))
          fails.push('the sell button was pressed once and still reads "' + armed + '"');
        if (armed === idle)
          fails.push('the sell button says the same thing before and after it is pressed');
        press(farm); presses++;
        if (V.placed.includes(farm)) fails.push('two taps on the sell button left the building standing');
        else {
          if (V.placed.length !== before.n - 1)
            fails.push('selling one building changed the village by ' + (V.placed.length - before.n) + ' buildings');
          /* One load of slack: a villager can put eight down in the same tick. */
          for (const k of V.RES) {
            const got = V.res[k] - before[k], want = quoted[k] || 0;
            if (got < want - 0.01 || got > want + V.CARRY + 0.01)
              fails.push('the panel quoted ' + want + ' ' + k + ' back and selling returned ' + got.toFixed(1));
          }
        }
      }
    }

    /* ---- the hall is the village ---- */
    fresh();
    { const hall = V.hallOf();
      V.panel = hall.id; V.step(0.001); clear();
      const says = sellLabel();
      if (!/^Cannot sell/.test(says)) fails.push('the hall\'s sell button reads "' + says + '"');
      press(hall); presses++; press(hall); presses++;
      if (!V.hallOf()) fails.push('the town hall was sold');
    }

    /* ---- the notice belongs to one building ----

       And asked WITHOUT a tick between the two presses. The tick is the game's
       other guard -- it drops the notice the moment the open panel is not the
       one that was armed -- so stepping in between hides whether the tap path
       checks at all. Two inputs inside one frame is the case where only this
       check stands between a tap and a demolished building. */
    fresh();
    { const a = seat('farm'), b = seat('lumber'); done(); clear();
      if (!a || !b) fails.push('the sell check could not stand two buildings up');
      else {
        V.panel = a.id; V.step(0.001); clear();
        const Ra = V.panelRects(); V.tap(Ra.sell.x, Ra.sell.y); presses++;
        if (!(V.sellArm && V.sellArm.id === a.id))
          fails.push('the first building was not put on notice');
        V.panel = b.id;                                  // no tick: the same frame
        const Rb = V.panelRects(); V.tap(Rb.sell.x, Rb.sell.y); presses++;
        V.step(0.001); clear();
        if (!V.placed.includes(b))
          fails.push('a building was sold by its FIRST tap, because another was already on notice');
        if (!V.placed.includes(a)) fails.push('opening another building sold the first');
      }
    }

    /* ---- and the notice runs out ---- */
    fresh();
    { const a = seat('farm'); done(); clear();
      if (!a) fails.push('the expiry check could not stand a building up');
      else {
        press(a); presses++;
        for (let i = 0; i < Math.ceil(V.SELL_ARM + 1) * 30; i++) V.step(1 / 30);
        clear();
        press(a); presses++;
        if (!V.placed.includes(a))
          fails.push('the sell button was left on notice for ' + (V.SELL_ARM + 1)
            + ' seconds and the next tap still sold the building');
      }
    }

    /* ---- a move asks twice as well ---- */
    fresh();
    { const a = seat('farm'); done(); clear();
      const L = V.landBounds();
      let to = null;
      for (let c = L.lo; c <= L.hi && !to; c++) for (let r = L.lo; r <= L.hi && !to; r++)
        if ((c !== a.c || r !== a.r) && V.canPlace('farm', c, r, V.occupied(a.id))) to = [c, r];
      if (!to) fails.push('the move check found nowhere to move a farm to');
      else {
        const w = V.tileToWorld(to[0], to[1]), pt = V.camProject(w.x, w.y);
        const from = [a.c, a.r];
        V.moving = a.id; V.armed = null; V.panel = null; V.step(0.001); clear();
        V.tap(pt.x, pt.y); V.step(0.001); clear(); presses++;
        if (a.c !== from[0] || a.r !== from[1])
          fails.push('one tap moved the building, with no chance to think better of it');
        if (!V.armed) fails.push('one tap on a tile did not put the move on notice');
        V.tap(pt.x, pt.y); V.step(0.001); clear(); presses++;
        if (a.c !== to[0] || a.r !== to[1])
          fails.push('two taps on the same tile left the building at ' + a.c + ',' + a.r);
      }
    }

    /* ---- and the speaker really is a speaker ---- */
    let muted = null;
    {
      /* Asked for, the way the game asks for it on the player's first touch.
         A reload leaves no context at all until something rings, and a sweep
         that simply reads it finds nothing and says the mute cannot be tested
         -- which is a failure about the browser rather than about the game. */
      V.audioOn();
      const actx = V.actx;
      if (!actx) fails.push('there is no audio at all, so the mute button proves nothing');
      else {
        const keep = V.muted;
        const co = actx.createOscillator.bind(actx);
        let made = 0;
        actx.createOscillator = function () { made++; return co(); };
        /* tone() also stands down for a page nobody is looking at, and the pane
           this runs in is often exactly that -- so unmuted and muted both come
           back silent and the check passes by accident. Said to be on screen,
           the way soundSweep says it. */
        const seen = v => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
        seen(false);
        try {
          V.muted = true; made = 0;
          for (const k of Object.keys(V.SFX)) { try { V.SFX[k](); } catch (e) {} }
          const off = made;
          V.muted = false; made = 0;
          for (const k of Object.keys(V.SFX)) { try { V.SFX[k](); } catch (e) {} }
          const on = made;
          muted = { off, on, sounds: Object.keys(V.SFX).length };
          if (off) fails.push('the game was muted and still made ' + off + ' sounds');
          if (!on) fails.push('the game was unmuted and made no sound at all, so the mute proves nothing');
        } finally { actx.createOscillator = co; V.muted = keep; delete document.hidden; }
      }
      /* The button itself, at its own hit region. */
      fresh();
      const was = V.muted, M = V.muteRect();
      V.tap(M.x, M.y); V.step(0.001); presses++;
      if (V.muted === was) fails.push('tapping the speaker did not change anything');
      V.tap(M.x, M.y); V.step(0.001); presses++;
      if (V.muted !== was) fails.push('tapping the speaker twice did not put it back');
      /* And it is remembered. */
      V.muted = true; V.save();
      V.muted = false; V.load(); V.landTransit(); V.step(0.001);
      if (!V.muted) fails.push('the game was muted, saved and loaded, and came back loud');
      V.muted = was; V.save();
    }

    V.panel = null; V.moving = null; V.sellArm = null; V.armed = null;
    V.goalIdx = 0; V.step(0.001);
    return { presses, muted, fails };
  };

  window.landSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const card = () => {
      const keep = V.claimAsk;
      V.claimAsk = true; V.step(0.001);
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.claimAsk = keep;
      return lines;
    };
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const seat = k => { const L = V.landBounds(); for (const k of V.RES) V.res[k] = 9e5;
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) if (put(k, c, r)) return true;
      return false; };
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 40; i++) V.step(1 / 30);
    };
    /* The island's own map of what stands where, counted inside the claim. */
    const emptyTiles = () => {
      const B = V.landBounds(), occ = V.occupied();
      let taken = 0;
      for (const key of occ) {
        const [c, r] = key.split(',').map(Number);
        if (c >= B.lo && c <= B.hi && r >= B.lo && r <= B.hi) taken++;
      }
      const side = B.hi - B.lo + 1;
      return { side, area: side * side, empty: side * side - taken };
    };
    const line = (lines, re) => lines.find(t => re.test(t)) || '';

    const seen = new Set();
    let rings = 0;
    for (let tier = 0; tier <= V.LAND_MAX; tier++) {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.orders.length = 0;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; settle();
      /* Roads and a statue among them, because the count has to include what
         is not a building. */
      for (const k of ['house', 'farm', 'statue', 'path', 'path']) seat(k);
      settle();
      V.goalIdx = parkGoals();

      const before = emptyTiles(), cost = V.landNext();
      for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
      const lines = card();
      rings++;

      if (!cost) {
        /* Nothing left to sell. */
        seen.add('whole island');
        if (!lines.some(t => /whole island is yours/.test(t)))
          fails.push('the last ring was claimed and the card still offers more land: ' + lines.join(' / '));
        if (lines.some(t => /^(Claim it|Need |Your stores cannot)/.test(t)))
          fails.push('the card for a finished island still has a button: ' + lines.join(' / '));
        if (V.claimLand()) fails.push('the island was claimed a second time');
        continue;
      }
      seen.add('more land');

      /* What it will be, and what it is. */
      const grow = /(\d+) x (\d+) tiles, from (\d+) x (\d+)/.exec(line(lines, /tiles, from/));
      if (!grow) fails.push('the card for ring ' + tier + ' says nothing about the size: ' + lines.join(' / '));
      else if (+grow[3] !== before.side)
        fails.push('the card says the island is ' + grow[3] + ' x ' + grow[3] + ' and it is '
          + before.side + ' x ' + before.side);

      /* How much room there already is. */
      const room = /(\d+) of your (\d+) tiles are still empty/.exec(line(lines, /still empty/));
      if (!room) fails.push('the card for ring ' + tier + ' says nothing about the room already there');
      else {
        if (+room[2] !== before.area)
          fails.push('the card says the island holds ' + room[2] + ' tiles and it holds ' + before.area);
        if (+room[1] !== before.empty)
          fails.push('the card says ' + room[1] + ' tiles are still empty and ' + before.empty
            + ' have nothing on them');
      }

      /* The price, and the button that offers it. */
      const priced = line(lines, /🪵 \d/);
      for (const [icon, k] of [['🪵', 'wood'], ['🌾', 'food']]) {
        const m = new RegExp(icon + ' (\\d+)').exec(priced);
        if (!m) fails.push('the card for ring ' + tier + ' never names a price in ' + k);
        else if (+m[1] !== cost[k]) fails.push('the card asks ' + m[1] + ' ' + k + ' and claiming takes ' + cost[k]);
      }
      if (!lines.some(t => t === 'Claim it'))
        fails.push('a village that can pay for ring ' + tier + ' is not offered it: ' + lines.join(' / '));
      seen.add('claim it');

      /* Short of it, and short of ever holding it. */
      for (const k of V.RES) V.res[k] = 0; V.step(0.001);
      const poor = card();
      const short = poor.find(t => /^Need /.test(t)) || '';
      const held = poor.find(t => /stores cannot hold/.test(t)) || '';
      const overCap = Object.entries(cost).some(([k, v]) => v > V.caps[k]);
      if (overCap) {
        seen.add('cannot hold');
        if (!held) fails.push('ring ' + tier + ' costs more than the village can hold and the card says "'
          + (short || poor.join(' / ')) + '"');
      } else {
        seen.add('need more');
        if (!short) fails.push('a village with nothing in its stores is not told what ring ' + tier
          + ' still needs: ' + poor.join(' / '));
        else for (const [icon, k] of [['🪵', 'wood'], ['🌾', 'food']]) {
          const m = new RegExp(icon + '(\\d+)').exec(short);
          const want = Math.max(0, Math.ceil(cost[k] - V.res[k]));
          if (!m) { if (want > 0) fails.push('the card says "' + short + '" and ring ' + tier + ' needs ' + want + ' more ' + k); }
          else if (+m[1] !== want)
            fails.push('the card says "' + short + '" and ring ' + tier + ' needs ' + want + ' more ' + k);
        }
        if (V.claimLand()) fails.push('ring ' + tier + ' was claimed with nothing in the stores');
      }

      /* And buying it does what the card said it would. */
      for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
      const purse = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
      if (!V.claimLand()) {
        fails.push('ring ' + tier + ' could not be claimed by a village holding everything');
        continue;
      }
      for (const k of V.RES)
        if (Math.abs((purse[k] - V.res[k]) - (cost[k] || 0)) > 0.01)
          fails.push('ring ' + tier + ' was priced at ' + cost[k] + ' ' + k + ' and took '
            + (purse[k] - V.res[k]).toFixed(0));
      const after = emptyTiles();
      if (grow && after.side !== +grow[1])
        fails.push('the card promised ' + grow[1] + ' x ' + grow[1] + ' and the island came out '
          + after.side + ' x ' + after.side);
      /* And the ground it sold is ground something can be put on, rather than
         a bigger number with nowhere new to build. */
      const B = V.landBounds();
      let fresh = 0;
      const occ = V.occupied();
      for (let c = B.lo; c <= B.hi; c++) for (let r = B.lo; r <= B.hi; r++)
        if (!occ.has(c + ',' + r) && V.canPlace('statue', c, r, occ)) fresh++;
      if (fresh < after.empty)
        fails.push('ring ' + tier + ' left ' + after.empty + ' tiles empty and only '
          + fresh + ' of them will take a building');
    }

    for (const k of ['more land', 'claim it', 'need more', 'cannot hold', 'whole island'])
      if (!seen.has(k)) fails.push('the claim card never once said "' + k + '"');

    V.claimAsk = false; V.goalIdx = 0; V.step(0.001);
    return { rings, seen: [...seen], fails };
  };

  window.adviceSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText, rows = [];
    const hallRow = () => {
      V.panel = V.hallOf().id; V.step(0.001);
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.panel = null;
      return lines.find(x => /villager/.test(x)) || '';
    };
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const seat = k => { const L = V.landBounds(); for (const k of V.RES) V.res[k] = 9e5;
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (put(k, c, r)) return V.placed[V.placed.length - 1];
      return null; };
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 60; i++) V.step(1 / 30);
    };
    const run = secs => { for (let i = 0; i < secs * 30; i++) V.step(1 / 30); };
    /* Comfortably off, so that nothing in the row is about money. */
    /* Every kind of them, not two by name: a store left at its ceiling is a
       "store full" hint, and a hint outranks the advice this sweep came to
       read. */
    const mid = () => { for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * 0.3);
      V.step(0.001); };
    const fresh = lvl => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders.length = 0;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = lvl; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; settle();
      V.goalIdx = parkGoals();
    };
    const seen = new Set();
    const note = (where, row) => {
      rows.push(where + ' — ' + row);
      if (/idle/.test(row)) seen.add('idle');
      if (/posts? empty/.test(row)) seen.add('empty');
      if (/store.? full/.test(row)) seen.add('full');
      if (/every post filled/.test(row)) seen.add('filled');
      for (const a of ['build a house', 'build a workplace', 'build a storehouse',
        'spend or trade', 'improve a house', 'improve a workplace',
        'raise the town hall', 'no more houses possible', 'no more workplaces possible'])
        if (row.indexOf(a) >= 0) seen.add(a);
      /* The percentage is the mean of what every workplace is reaching. */
      const m = /workplaces at (\d+)%/.exec(row);
      if (m) { seen.add('reach');
        const st = V.villageStats();
        if (st.avg !== null && Math.abs(+m[1] - Math.round(st.avg * 100)) > 0)
          fails.push(where + ' says workplaces are at ' + m[1] + '% and they average '
            + Math.round(st.avg * 100) + '%');
      }
      /* And the advice at the end has to be one somebody can take. */
      if (/build a house|build a workplace/.test(row)) {
        const want = /build a house/.test(row) ? 'pop' : 'jobs';
        const can = V.BUILDINGS.some(b => b.key !== 'hall' && !b.decor
          && (want === 'pop' ? b.pop : b.jobs && b.makes) && V.unlocked(b.key) && !V.atLimit(b.key));
        if (!can) fails.push(where + ' says "' + row.replace(/.*— /, '') + '" and the hall allows no more of them');
      }
      if (/build a storehouse/.test(row) && V.atLimit('store'))
        fails.push(where + ' says to build a storehouse and the hall allows no more');
      if (/improve a (house|workplace)/.test(row)) {
        const want = /improve a house/.test(row) ? 'pop' : 'jobs';
        const grows = V.placed.some(p => {
          const b = V.B(p.key);
          if (p.key === 'hall' || b.decor || p.t < 1) return false;
          if (want === 'pop' ? !b.pop : !(b.jobs && b.makes)) return false;
          const i = V.upInfo(p); if (i.max || i.gate) return false;
          const next = { ...p, lvl: p.lvl + 1 };
          return want === 'pop' ? V.popOf(next) > V.popOf(p) : V.jobsOf(next) > V.jobsOf(p);
        });
        if (!grows) fails.push(where + ' says to improve one and not one of them gains a post by growing');
      }
      if (/raise the town hall/.test(row) && V.upInfo(V.hallOf()).max)
        fails.push(where + ' says to raise the town hall and it is at its highest level');
      if (/no more (houses|workplaces) possible/.test(row)) {
        const want = /houses/.test(row) ? 'pop' : 'jobs';
        if (V.BUILDINGS.some(b => b.key !== 'hall' && !b.decor
          && (want === 'pop' ? b.pop : b.jobs && b.makes) && V.unlocked(b.key) && !V.atLimit(b.key)))
          fails.push(where + ' says no more are possible and the hall allows another');
        if (!V.upInfo(V.hallOf()).max)
          fails.push(where + ' says no more are possible and the town hall can still grow');
      }
      return row;
    };

    /* ---- idle villagers, and building what it says ---- */
    fresh(5);
    { for (let i = 0; i < 6; i++) seat('house'); seat('farm');
      settle(); run(120); mid();
      const row = note('a village with more people than posts', hallRow());
      const m = /(\d+) idle/.exec(row), st = V.villageStats();
      if (!m) fails.push('a village with ' + st.idle + ' villagers out of work said "' + row + '"');
      else {
        if (+m[1] !== st.idle) fails.push('the hall says ' + m[1] + ' idle and ' + st.idle + ' have no job');
        const was = st.idle;
        seat('lumber'); settle(); run(120); mid();
        const now = V.villageStats().idle;
        if (now >= was) fails.push('the hall said "' + row.replace(/.*— /, '')
          + '" with ' + was + ' idle, one was built, and ' + now + ' are still idle');
        note('the same village with a workplace added', hallRow());
      }
    }

    /* ---- empty posts, and building what it says ---- */
    fresh(5);
    { seat('house'); for (let i = 0; i < 4; i++) seat('farm');
      settle(); run(120); mid();
      const row = note('a village with more posts than people', hallRow());
      const st = V.villageStats(), empty = st.slots - st.working;
      const m = /(\d+) posts? empty/.exec(row);
      if (!m) fails.push('a village with ' + empty + ' posts standing empty said "' + row + '"');
      else {
        if (+m[1] !== empty) fails.push('the hall says ' + m[1] + ' posts empty and ' + empty + ' have nobody in them');
        seat('house'); settle(); run(120); mid();
        const st2 = V.villageStats(), now = st2.slots - st2.working;
        if (now >= empty) fails.push('the hall said "' + row.replace(/.*— /, '')
          + '" with ' + empty + ' posts empty, one was built, and ' + now + ' are still empty');
        note('the same village with a house added', hallRow());
      }
    }

    /* ---- a full granary outranks the empty posts it would make worse ---- */
    fresh(5);
    { seat('house'); for (let i = 0; i < 4; i++) seat('farm');
      settle(); run(120);
      for (const k of V.RES) V.res[k] = V.caps[k];
      V.step(0.001);
      const st = V.villageStats(), empty = st.slots - st.working;
      const row = note('a village whose stores are at the ceiling', hallRow());
      if (!/full/.test(row))
        fails.push('a village with both stores at the ceiling said "' + row + '"');
      else if (/posts? empty/.test(row))
        fails.push('a village with ' + empty + ' empty posts and both stores full was told about the posts');
    }

    /* ---- and at the storehouse limit, where the answer is different ---- */
    fresh(5);
    { for (let i = 0; i < 4; i++) seat('store');
      seat('house'); seat('farm');
      settle(); run(120);
      for (const k of V.RES) V.res[k] = V.caps[k];
      V.step(0.001);
      const row = note('a village at the storehouse limit with full stores', hallRow());
      if (!V.atLimit('store'))
        fails.push('the storehouse-limit check never reached the limit');
      else if (!/spend or trade/.test(row))
        fails.push('a village that may build no more storehouses was told "' + row + '"');
    }

    /* ---- every post filled ---- */
    fresh(5);
    { /* Exactly filled, which needs the two sides to meet: a house holds two,
         a farm opens two posts and a hall opens one more at three and again at
         five, so most mixes land one either side of balance. Two houses and a
         farm under a level-three hall is four and four. */
      V.placed[0].lvl = 3; settle();
      seat('house'); seat('house'); seat('farm');
      settle(); run(180); mid();
      const st = V.villageStats();
      if (st.idle === 0 && st.slots === st.working) note('a village in balance', hallRow());
      else fails.push('the balanced village came out ' + st.idle + ' idle and '
        + (st.slots - st.working) + ' posts empty, so "every post filled" was never said');
    }

    /* ---- nothing left to build, and nothing left to improve ---- */
    fresh(2);
    { const allow = V.HALL[2].allow;
      for (const [k, n] of Object.entries(allow)) for (let i = 0; i < n; i++) seat(k);
      for (const q of V.placed) if (!V.isDecor(q.key) && q.key !== 'hall') q.lvl = 2;
      settle(); run(120); mid();
      note('a village that has filled a level-two hall', hallRow());
    }
    fresh(5);
    { const allow = V.HALL[V.HALL.length - 1].allow;
      for (const [k, n] of Object.entries(allow)) for (let i = 0; i < n; i++) seat(k);
      /* Not the hall. Setting every building's level without excluding it put
         the hall back to two, so the village still had somewhere to go and the
         row said "raise the town hall" -- the scene meant to leave improving a
         workplace as the only thing left, and had quietly given the player a
         better answer. */
      for (const q of V.placed) if (!V.isDecor(q.key) && q.key !== 'hall') q.lvl = 2;
      settle(); run(180); mid();
      note('a village at the build limit with room to improve', hallRow());
      for (const q of V.placed) if (!V.isDecor(q.key) && q.key !== 'hall') q.lvl = V.LVL_MAX;
      settle(); run(300); mid();
      note('a village with nothing left to build or improve', hallRow());
    }

    for (const k of ['idle', 'empty', 'full', 'reach',
      'filled', 'build a house', 'build a workplace', 'build a storehouse', 'spend or trade',
      'improve a workplace', 'raise the town hall', 'no more workplaces possible'])
      if (!seen.has(k)) fails.push('the hall never once said "' + k + '"');

    V.panel = null; V.goalIdx = 0; V.step(0.001);
    return { rows, seen: [...seen], fails };
  };

  window.markSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const KIND = { 0: 'hall', 1: 'idle', 2: 'far', 3: 'rest', 4: 'up' };
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 40; i++) V.step(1 / 30);
    };
    /* Room for a whole load, which is what the game means by a store that
       is not full -- hasRoomFor is not exported, and saying it here in the
       sweep's own terms is better than borrowing it anyway: the rule under
       test is about the player's remedy, not about a shared helper. */
    const roomFor = k => V.caps[k] - V.res[k] >= V.CARRY;
    const centreX = p => { const b = V.B(p.key);
      return V.tileToWorld(p.c + (b.w - 1) / 2, p.r + (b.h - 1) / 2).x; };
    /* Draw, then hand each badge to the building standing under it. */
    const marks = () => {
      const texts = [];
      ctx.fillText = function (t, ...a) {
        const str = String(t);
        if (/^(▲|Lv \d+|−\d+%|!)$/.test(str)) texts.push({ t: str, x: this.getTransform().e });
        return orig.call(this, t, ...a);
      };
      try { V.draw(); } finally { ctx.fillText = orig; }
      const out = new Map();
      for (const bg of V.lastBadges) {
        let who = null, d = Infinity;
        for (const p of V.placed) { const dx = Math.abs(centreX(p) - bg.x); if (dx < d) { d = dx; who = p; } }
        if (!who || d > 20) { fails.push('a badge was drawn with no building under it'); continue; }
        if (out.has(who.id)) fails.push('the ' + who.key + ' wears two badges at once');
        out.set(who.id, KIND[bg.prio] || ('prio ' + bg.prio));
      }
      return { on: out, texts };
    };
    const rowsOf = p => {
      V.panel = p.id; V.step(0.001);
      const lines = [];
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.panel = null;
      return lines;
    };
    /* Placed by hand, on tiles whose ISO COLUMNS differ.

       A badge carries no name and is matched to the building under it by the x
       it was queued at -- and in this projection x is a function of c MINUS r,
       so two buildings on the same diagonal stand in the same column and the
       match is a coin toss. The hall sits at the middle of the island, which is
       c - r = 0, so nothing else may be. Scanning for the first free tile put
       three of them on that diagonal and the hall was handed somebody else's
       badge twice over. */
    const at = (k, c, r) => { for (const k of V.RES) V.res[k] = 9e5;
      return put(k, c, r) ? V.placed[V.placed.length - 1] : null; };
    /* And the scene says so itself, rather than trusting the layout to stay
       right through the next edit. */
    const columnsDiffer = where => {
      const seenX = new Map();
      for (const p of V.placed) {
        if (V.isDecor(p.key)) continue;
        const x = Math.round(centreX(p));
        if (seenX.has(x)) fails.push('the scene for ' + where + ' put a ' + p.key + ' and a '
          + seenX.get(x) + ' in the same column, so their badges cannot be told apart');
        seenX.set(x, p.key);
      }
    };
    const fresh = hallLvl => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders.length = 0;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = hallLvl; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; settle();
      V.goalIdx = parkGoals();
    };

    const seen = new Set();
    let scenes = 0;
    /* Hold every badge in the village to what the village is doing. */
    const judge = (where, extra) => {
      scenes++;
      const { on } = marks();
      for (const p of V.placed) {
        if (V.isDecor(p.key) || p.t < 1) continue;
        const b = V.B(p.key), kind = on.get(p.id) || null;
        if (kind) seen.add(kind);
        const who = 'the ' + p.key + ' in ' + where;
        if (p.key === 'hall') {
          if (kind !== 'hall') fails.push('the hall in ' + where + ' wears "' + kind + '" instead of its level');
          continue;
        }
        const hands = V.workersAt(p.id);
        const makes = b.makes && b.jobs ? Object.keys(b.makes)[0] : null;
        if (kind === 'up') {
          const row = rowsOf(p).find(t => /^(Upgrade to \d+|Needs |Need |Highest level|Building…)/.test(t)) || '';
          if (!/^Upgrade to /.test(row))
            fails.push(who + ' wears a tick inviting a tap and its own button says "' + row + '"');
        } else if (kind === 'idle') {
          if (hands) fails.push(who + ' is marked as having nobody at it and ' + hands + ' are working it');
          else if (makes && !roomFor(makes))
            fails.push(who + ' wears the alarm, and there is nowhere to put what it makes — so a house makes it worse');
        } else if (kind === 'rest') {
          if (hands) fails.push(who + ' is marked as resting and ' + hands + ' are working it');
          else if (makes && roomFor(makes))
            fails.push(who + ' is marked as resting and there is room for everything it makes');
        } else if (kind === 'far') {
          if (!hands) fails.push(who + ' is marked as badly placed and nobody is working it');
        } else if (!kind && makes) {
          /* The three things a badge exists to say, all false. The one worth
             naming is the first: a producer standing empty is the most
             confusing state in the game, and saying nothing about it is the
             fault the alarm was added for. */
          if (!hands) fails.push(who + ' has nobody working it and wears no badge at all');
        }
      }
      if (extra) extra(on);
    };

    /* ---- a worked village that can afford to grow: ticks ---- */
    fresh(5);
    { const farm = at('farm', 2, 8), lum = at('lumber', 8, 2);
      at('house', 0, 4); at('house', 4, 0); at('house', 10, 8);
      columnsDiffer('a village that can afford to grow');
      settle(); for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
      for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
      judge('a village that can afford to grow', on => {
        if (on.get(farm.id) !== 'up' || on.get(lum.id) !== 'up')
          fails.push('a village rich enough to improve everything showed no tick on a workplace');
      });
      /* ---- and the same village with an empty purse: no ticks ---- */
      for (const k of V.RES) V.res[k] = 0; V.step(0.001);
      judge('the same village with nothing in the stores', on => {
        for (const p of V.placed) if (on.get(p.id) === 'up')
          fails.push('a village with nothing in its stores showed a tick on the ' + p.key);
      });
    }

    /* ---- nobody to work it, and room for what it makes: the alarm ---- */
    fresh(5);
    { const lum = at('lumber', 8, 2), farm = at('farm', 2, 8);
      columnsDiffer('a village with one pair of hands');
      settle(); for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
      for (const k of V.RES) V.res[k] = 0; V.step(0.001);
      const empty = [lum, farm].filter(p => p && !V.workersAt(p.id));
      if (!empty.length) fails.push('the alarm check could not leave a workplace empty');
      judge('a village with one pair of hands and two workplaces', on => {
        for (const p of empty) if (on.get(p.id) !== 'idle')
          fails.push('a ' + p.key + ' with nobody at it and room to spare wears "' + on.get(p.id) + '"');
      });
    }

    /* ---- nobody to work it because there is nowhere to put it: the pause ---- */
    fresh(5);
    { const lum = at('lumber', 8, 2), farm = at('farm', 2, 8); at('house', 0, 4);
      columnsDiffer('a village whose granary is full');
      if (lum) lum.lvl = 5;
      settle();
      for (let i = 0; i < 120 * 30; i++) {
        V.res.food = V.caps.food; V.res.wood = Math.floor(V.caps.wood * 0.3);
        V.step(1 / 30);
      }
      if (!farm || V.workersAt(farm.id))
        fails.push('the resting check could not empty the farm');
      else judge('a village whose granary is full', on => {
        if (on.get(farm.id) !== 'rest')
          fails.push('a farm nobody works because the granary is full wears "' + on.get(farm.id) + '"');
      });
    }

    /* ---- losing half of itself to the walk, and what moving it is worth ---- */
    fresh(5);
    {
      const L = V.landBounds();
      /* No storehouse. The hall counts as one -- it is why a village works at
         all before the first shed is built -- and a SECOND store lifts the worst
         tile on a fourteen-tile island above half, so the badge this scene is
         about never appears. One store in the middle, and the far corners are
         genuinely far. */
      at('house', 0, 4); at('house', 4, 0); at('house', 11, 8);
      /* Everything standing BEFORE the island is ranked. A storehouse that has
         not finished is not a store, so a scan run before this rated the tile
         right beside it as the worst on the island and the farm was planted
         next door to the thing it was supposed to be far from. */
      settle();
      /* The worst tile left, rather than a corner guessed at: the badge only
         appears below half, and where half is depends on where the storehouse
         and the hall ended up. Taken from the columns nothing is standing in,
         so the badge can still be told from its neighbours'. */
      const used = new Set(V.placed.filter(p => !V.isDecor(p.key)).map(p => Math.round(centreX(p))));
      let worst = Infinity, spot = null;
      { const occ = V.occupied();
        for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) {
          if (!V.canPlace('farm', c, r, occ)) continue;
          const b = V.B('farm');
          const x = Math.round(V.tileToWorld(c + (b.w - 1) / 2, r + (b.h - 1) / 2).x);
          if (used.has(x)) continue;
          const v = V.deliveredOf({ id: -1, key: 'farm', c, r, t: 1, lvl: V.LVL_MAX });
          if (v < worst) { worst = v; spot = [c, r]; }
        } }
      const farm = spot ? at('farm', spot[0], spot[1]) : null;
      columnsDiffer('a village with its storehouse in one corner');
      if (farm) farm.lvl = V.LVL_MAX;
      settle(); for (let i = 0; i < 150 * 30; i++) V.step(1 / 30);
      for (const k of V.RES) V.res[k] = 0; V.step(0.001);
      if (!farm) fails.push('the walk check could not put a farm in the far corner');
      else {
        const { on, texts } = marks();
        if (on.get(farm.id)) seen.add(on.get(farm.id));
        if (on.get(farm.id) !== 'far')
          fails.push('a level five farm in the far corner wears "' + on.get(farm.id)
            + '" and reaches ' + V.reachOf(farm).toFixed(2) + ' of what it could');
        else {
          const m = texts.map(t => /^−(\d+)%$/.exec(t.t)).find(Boolean);
          if (!m) fails.push('the badly-placed farm drew no figure');
          else {
            const said = +m[1] / 100;
            const before = V.deliveredOf(farm);
            /* Moved as close to the storehouse as it will go, which is what the
               badge is measured against. */
            let at = null, best = -1;
            const occ = V.occupied(farm.id);
            for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) {
              if (!V.canPlace('farm', c, r, occ)) continue;
              /* id -1, which routeOf documents as the opt-out from its cache.
                 Spread the real building in and every candidate tile comes back
                 with the route it has where it actually stands, so the scan
                 scores the whole island identically and picks whichever tile it
                 happened to see first. */
              const v = V.deliveredOf({ id: -1, key: farm.key, c, r, t: 1, lvl: farm.lvl });
              if (v > best) { best = v; at = [c, r]; }
            }
            if (!at) fails.push('there was nowhere to move the badly-placed farm to');
            else {
              farm.c = at[0]; farm.r = at[1]; V.rebuildStores(); settle();
              const after = V.deliveredOf(farm);
              const want = 1 / Math.max(0.01, 1 - said);
              if (Math.abs(after / before - want) > 0.15 * want)
                fails.push('a farm badged as losing ' + m[1] + '% of itself delivered '
                  + (after / before).toFixed(2) + ' times as much beside a store, not '
                  + want.toFixed(2));
            }
          }
        }
        scenes++;
      }
    }

    for (const k of ['hall', 'idle', 'far', 'rest', 'up'])
      if (!seen.has(k)) fails.push('no building ever wore the "' + k + '" badge');

    V.panel = null; V.goalIdx = 0; V.step(0.001);
    return { scenes, seen: [...seen], fails };
  };

  window.cardSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    /* Every line a card can say. A label missing from here is not read at all,
       and the sweep then reports a board that "drew 0 lines" -- which is what
       happened the moment the ceiling board started saying something new. The
       list is the contract: add a label to the card, add it here. */
    const LINE = /^(need [^ ]*\d+|no room|best rate|tap to trade|to the neighbours)$/;
    /* Read in the order the cards are laid out, which is the order orderRects
       gives and so the order they are drawn. */
    const lines = () => {
      const got = [];
      ctx.fillText = function (t, ...a) { if (LINE.test(String(t))) got.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return got;
    };
    const worth = o => (o.getN / Math.max(1, V.caps[o.getK]))
      / Math.max(1e-9, o.giveN / Math.max(1, V.caps[o.giveK]));
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    const seat = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) if (put(k, c, r)) return true;
      return false; };
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 40; i++) V.step(1 / 30);
    };
    const village = hallLvl => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders.length = 0;
      V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = hallLvl; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; settle();
      V.barMode = 'orders';
    };
    const grow = n => {
      for (let i = 0; i < n; i++) { for (const k of V.RES) V.res[k] = 9e5; seat('store'); }
      for (const q of V.placed) if (q.key === 'store') q.lvl = 5;
      settle();
    };

    const seen = new Set();
    let boards = 0;
    /* Read a board and hold every card on it to its line. */
    const check = where => {
      boards++;
      V.step(0.001);
      const said = lines(), cards = V.orders.slice();
      if (said.length !== cards.length) {
        fails.push('the board in ' + where + ' holds ' + cards.length + ' offers and drew '
          + said.length + ' lines: ' + said.join(' / '));
        return;
      }
      const bestWorth = cards.reduce((n, o) => Math.max(n, worth(o)), 0);
      for (let i = 0; i < cards.length; i++) {
        const o = cards[i], t = said[i];
        seen.add(/^need /.test(t) ? 'need' : t);
        const card = '🪵/🌾 ' + o.giveN + ' for ' + o.getN + ' in ' + where;
        const short = Math.ceil(o.giveN - V.res[o.giveK]);
        if (/^need /.test(t)) {
          const m = /(\d+)/.exec(t);
          if (short <= 0) fails.push('the card ' + card + ' says "' + t + '" and the village can pay it');
          else if (+m[1] !== short)
            fails.push('the card ' + card + ' says "' + t + '" and the village is ' + short + ' short');
        } else if (t === 'no room') {
          if (short > 0) fails.push('the card ' + card + ' says "no room" and the village cannot pay for it either');
          else if (V.canFill(o)) fails.push('the card ' + card + ' says "no room" and the game would fill it');
        } else if (t === 'to the neighbours') {
          /* The card claims the payment leaves the island. It has to be true of
             THIS offer -- the barn really has no room for what it pays -- and
             the offer has to be takeable, which is the whole point of the
             change that put this label on the board. */
          if (!V.canFill(o)) fails.push('the card ' + card + ' says its payment goes to the neighbours and the game refuses it');
          if (!V.willShip(o)) fails.push('the card ' + card + ' says its payment goes to the neighbours and the barn has room for all of it');
        } else {
          if (!V.canFill(o)) fails.push('the card ' + card + ' says "' + t + '" and the game refuses it');
          if (t === 'best rate') {
            for (const q of cards)
              if (worth(q) > worth(o) + 1e-9)
                fails.push('the card ' + card + ' is called the best rate at ' + worth(o).toFixed(3)
                  + ' and ' + q.giveN + ' for ' + q.getN + ' on the same board is ' + worth(q).toFixed(3));
          }
        }
      }
    };

    /* ---- a fresh board, enough to pay for all of it ---- */
    village(5); grow(4);
    V.res.wood = V.caps.wood; V.res.food = Math.floor(V.caps.food * 0.2);
    V.orders.length = 0;
    for (let i = 0; i < 3; i++) V.orders.push({ ...V.makeOrder(i), slot: i });
    check('a fresh board the village can pay for');

    /* ---- and with an empty purse, so every card has to say what is missing ---- */
    for (const k of V.RES) V.res[k] = 0;
    check('a board with nothing in the stores');

    /* ---- and with the payout side at its ceiling, so there is nowhere to put it ---- */
    for (const k of V.RES) V.res[k] = V.caps[k];
    check('a board with both barns at the ceiling');

    /* ---- the same board on a village that has NOT finished ----

       These villages are built finished -- goalIdx is set to the end of the
       ladder by the helper above -- and a finished village now SENDS what its
       barns cannot hold to the neighbours instead of refusing it. So the state
       in which a full barn still means "no room" was no longer visited here at
       all, and the check below that insists some card says it went from a rule
       about the game to a rule about nothing.

       It is a state worth having either way: a village with a storehouse still
       left to build is the one the refusal is FOR, and this sweep had never
       looked at it. */
    const keepGoal = V.goalIdx;
    V.goalIdx = 0;
    for (const k of V.RES) V.res[k] = V.caps[k];
    check('a ceiling board on a village still building');
    V.goalIdx = keepGoal;

    /* ---- the board that outlived its ceiling ----

       An offer written when the barns held four hundred, still standing in a
       village holding four and a half thousand, and saved WITHOUT the tier --
       which is what a save made before tiers existed looks like, and load gives
       it one by its size against the ceiling it comes back to. The trade is
       unchanged and nearly even; the label it is handed is the smallest. */
    {
      village(2);
      V.res.wood = V.caps.wood; V.res.food = Math.floor(V.caps.food * 0.2);
      const old = { ...V.makeOrder(2), slot: 0 };
      grow(4);
      V.placed[0].lvl = 5; settle();
      V.res.wood = V.caps.wood; V.res.food = Math.floor(V.caps.food * 0.2);
      V.orders.length = 0;
      V.orders.push(old, { ...V.makeOrder(0), slot: 1 }, { ...V.makeOrder(1), slot: 2 });
      V.save();
      try {
        /* V.KEY, not the name of it. Spelled out, this wrote the legacy board
           straight into the PLAYER'S primary save -- past every guard this
           file has ever had, because a guard that moves the keys cannot move a
           string. Found by the guard that watches the real keys, on its first
           run against a real battery, which is the best argument for it there
           is. */
        const raw = JSON.parse(localStorage.getItem(V.KEY));
        for (const o of raw.orders || []) delete o.tier;
        localStorage.setItem(V.KEY, JSON.stringify(raw));
        V.load(); V.landTransit();
      } catch (e) { fails.push('the legacy-board check could not write a save: ' + (e && e.message)); }
      V.barMode = 'orders';
      V.res.wood = V.caps.wood; V.res.food = Math.floor(V.caps.food * 0.2);
      if (V.orders.length < 3) fails.push('the legacy board came back with only ' + V.orders.length + ' offers');
      else {
        const w = V.orders.map(worth);
        if (Math.max(...w) - Math.min(...w) < 0.02)
          fails.push('the legacy board\'s offers are all within ' + (Math.max(...w) - Math.min(...w)).toFixed(3)
            + ' of each other, so which is best proves nothing');
        check('a board that outlived its ceiling');
      }
    }

    /* ---- and the tap does what the card says ---- */
    {
      village(5); grow(4);
      V.res.wood = V.caps.wood; V.res.food = Math.floor(V.caps.food * 0.2);
      V.orders.length = 0;
      for (let i = 0; i < 3; i++) V.orders.push({ ...V.makeOrder(i), slot: i });
      V.step(0.001);
      const said = lines();
      const i = said.findIndex(t => t === 'best rate' || t === 'tap to trade');
      if (i < 0) fails.push('no card on a paid-up board offered itself to be tapped');
      else {
        const o = V.orders[i], slot = o.slot;
        const before = { ...Object.fromEntries(V.RES.map(k => [k, V.res[k]])), done: V.ordersDone };
        if (!V.fillOrder(o)) fails.push('a card reading "' + said[i] + '" refused the tap');
        else {
          if (Math.abs((before[o.giveK] - V.res[o.giveK]) - o.giveN) > 0.01)
            fails.push('a card asking ' + o.giveN + ' ' + o.giveK + ' took '
              + (before[o.giveK] - V.res[o.giveK]).toFixed(1));
          if (Math.abs((V.res[o.getK] - before[o.getK]) - o.getN) > 0.01)
            fails.push('a card paying ' + o.getN + ' ' + o.getK + ' handed over '
              + (V.res[o.getK] - before[o.getK]).toFixed(1));
          if (V.ordersDone !== before.done + 1)
            fails.push('a filled order did not count towards the tally of trades');
          if (V.orders.some(q => q.id === o.id)) fails.push('a filled order is still on the board');
          if (V.orders.some(q => q.slot === slot)) fails.push('a filled stall was taken over instead of left empty');
        }
      }
    }

    for (const k of ['need', 'no room', 'best rate', 'tap to trade', 'to the neighbours'])
      if (!seen.has(k)) fails.push('no trade card ever said "' + k + '"');

    V.orders.length = 0; V.barMode = 'build'; V.goalIdx = 0; V.step(0.001);
    return { boards, seen: [...seen], fails };
  };

  window.spotSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const grab = re => { const got = [];
      /* Nothing dimming the screen at the moment of the draw: the panel yields
         to any card that washes it, and this scene finishes its goals. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx.fillText = function (t, ...r) { if (re.test(String(t))) got.push(String(t)); return orig.call(this, t, ...r); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return got; };
    const put = (k, c, r) => V.canPlace(k, c, r, V.occupied()) ? V.place(k, c, r) : false;
    /* Finished the game's own way, never by writing t = 1.

       storeAt is a cache, rebuilt when something is placed, sold or FINISHES --
       and a storehouse set to t = 1 by hand finishes none of those, so it is
       standing on the island and is not a store. The pill then quotes a walk to
       the hall and is perfectly right about the village it was shown, while the
       building placed a moment later is measured against a village that has a
       storehouse in it. Read as a 13% lie by the game until the scene was
       fixed; it is the same trap caps sets, and this is the third sweep to
       fall into it. */
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 40; i++) V.step(1 / 30);
    };
    const RICH = () => { for (const k of V.RES) V.res[k] = 9e5; };
    const pill = (key, c, r) => {
      V.sel = key; V.ghost = { c, r, fits: true, ok: true, why: null };
      V.step(0.001);
      const got = grab(new RegExp('/s here|no one spare|need '))[0] || null;
      V.sel = null; V.ghost = null;
      return got;
    };
    const num = (t, re) => { const m = re.exec(t || ''); return m ? +m[1] : null; };

    /* A village with its storehouse in one corner, so that where a workplace
       stands is worth arguing about. */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
    V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
    V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    RICH(); V.step(0.001);
    const L = V.landBounds();
    /* Plenty of houses, because the pill quotes the hands a new building
       WOULD get and a village with everyone already employed has none to give
       -- the pill then rightly says so instead of a rate, and the spot is never
       tested at all. */
    for (let i = 0; i < 9; i++) { RICH();
      for (let r = L.lo; r <= L.hi; r++) { let done = false;
        for (let c = L.lo; c <= L.hi; c++) if (put('house', c, r)) { done = true; break; }
        if (done) break; } }
    RICH(); put('store', L.hi - 2, L.hi - 2);
    settle();
    for (let i = 0; i < 150 * 30; i++) V.step(1 / 30);
    V.goalIdx = parkGoals();

    let tried = 0, spread = 0;
    /* The market is in this list because it is the one building that both
       produces and stores, and that made it the one the pill got wrong.

       Every other workplace carries its goods to somebody else's storehouse,
       so the probe describing an empty tile prices a real walk. A market
       keeps what it makes: built, it is in the store list and nearestStore
       hands it back to itself at nought distance. Not built, it is not in
       that list, so the pill quoted a walk the market will never take -- and
       quoted a different one for every tile, on an island where the tile
       makes no difference to it at all. 0.30/s, 0.42/s and 0.23/s over three
       spots, against 0.53/s delivered wherever it was really put.

       It is the dearest thing in the tray at 200 wood and 120 food. */
    for (const key of ['farm', 'lumber', 'mill', 'market']) {
      const got = [];
      /* The tiles are chosen by what they are WORTH rather than by where they
         are: every free tile ranked, then the best, the worst and two between.
         Fixed coordinates kept landing under a house as the village grew, and a
         handful of tiles that happen to be alike proves nothing about a label
         that is supposed to tell them apart. */
      const occ0 = V.occupied();
      const ranked = [];
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(key, c, r, occ0))
          ranked.push([c, r, V.deliveredOf({ id: -1, key, c, r, t: 1, lvl: 1 })]);
      ranked.sort((a, b) => b[2] - a[2]);
      const pick = ranked.length < 4 ? ranked
        : [ranked[0], ranked[(ranked.length / 3) | 0], ranked[(ranked.length * 2 / 3) | 0], ranked[ranked.length - 1]];
      for (const [c, r] of pick) {
        RICH();
        if (!V.canPlace(key, c, r, V.occupied())) continue;
        const said = pill(key, c, r);
        const here = num(said, /([\d.]+)\/s here/);
        if (here === null) { fails.push('the pill over an empty tile for a ' + key + ' said "' + said + '"'); continue; }
        /* The hands the pill was quoted for. A spot that ends up staffed
           differently is not evidence either way -- the same rule the panel
           promise keeps. */
        const wanted = Math.max(1, V.handsFor({ id: -1, key, c, r, t: 1, lvl: 1 }, 1));
        RICH();
        if (!V.place(key, c, r)) { fails.push('a ' + key + ' could not be put on the tile its pill had just quoted'); continue; }
        const p = V.placed[V.placed.length - 1];
        settle();
        for (let i = 0; i < 150 * 30; i++) V.step(1 / 30);
        const hands = V.workersAt(p.id);
        V.panel = p.id; V.step(0.001);
        const row = grab(new RegExp('/s delivered'))[0] || '';
        V.panel = null;
        const real = num(row, /([\d.]+)\/s delivered/);
        V.placed.splice(V.placed.indexOf(p), 1); V.rebuildStores(); settle();
        if (hands !== wanted) continue;               // the workforce moved: not evidence
        tried++; got.push(here);
        if (real === null) { fails.push('a ' + key + ' built where its pill promised ' + here + '/s has no delivered row'); continue; }
        if (Math.abs(real - here) > 0.011)
          fails.push('the pill promised ' + here + '/s for a ' + key + ' on ' + c + ',' + r
            + ' and the one built there delivers ' + real + '/s');
      }
      if (got.length >= 2) spread = Math.max(spread, Math.max(...got) - Math.min(...got));
      /* And a building that keeps its own goods carries nothing anywhere, so
         every tile on the island is worth the same to it and the pill has to
         say so. Asked of the building table rather than of the game's own
         answer to the question, which is the thing under test. */
      if (V.B(key).caps && got.length >= 2 && Math.max(...got) - Math.min(...got) > 0.011)
        fails.push('a ' + key + ' stores its own goods and walks nowhere, and the pill quoted it '
          + Math.min(...got).toFixed(2) + '/s on one tile and ' + Math.max(...got).toFixed(2)
          + '/s on another');
    }
    if (tried < 6) fails.push('only ' + tried + ' spots were bought, so the pill was barely asked');
    /* And the spots have to be worth choosing between, or a pill that ignored
       the tile altogether would satisfy everything above. */
    if (spread < 0.2) fails.push('the best and worst spots tried differ by only ' + spread.toFixed(2)
      + '/s, so a pill that never looked at the tile would pass');

    /* ---- best is the best there is ----

       On its own island, with one storehouse and nothing else. bestDeliveredOf
       is the shortest round trip a building of that kind could ever have, to a
       store of ANY kind set directly against it, and whether a tile like that
       is free is a question about the village rather than about the claim. In a
       built-up village the nearest free tile falls short of it and rightly so;
       given room, the two meet exactly. Both halves are worth having: the bound
       must hold everywhere, and it must be a bound somebody can reach. */
    {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.panel = null; V.sel = null; V.moving = null; V.ghost = null;
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      RICH(); V.step(0.001);
      put('store', L.lo + 4, L.lo + 4);
      settle();
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
      RICH();
      const occ = V.occupied();
      let found = -1, at = null, spots = 0;
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++) {
        if (!V.canPlace('farm', c, r, occ)) continue;
        spots++;
        const v = V.deliveredOf({ id: -1, key: 'farm', c, r, t: 1, lvl: 1 });
        if (v > found) { found = v; at = [c, r]; }
      }
      if (!at) fails.push('there was nowhere on the island to try a farm');
      else {
        const hands = Math.max(1, V.handsFor({ id: -1, key: 'farm', c: at[0], r: at[1], t: 1, lvl: 1 }, 1));
        const claimed = hands * V.bestDeliveredOf({ id: -1, key: 'farm', c: at[0], r: at[1], t: 1, lvl: 1 });
        const real = hands * found;
        if (real > claimed + 0.011)
          fails.push('the pill calls ' + claimed.toFixed(2) + '/s the best a farm can do and '
            + at.join(',') + ' gives ' + real.toFixed(2) + '/s');
        if (real < claimed - 0.011)
          fails.push('the pill calls ' + claimed.toFixed(2) + '/s the best a farm can do and the best of '
            + spots + ' tiles on the island is ' + real.toFixed(2) + '/s');
      }
    }

    /* ---- and the price, where there is not enough to pay it ---- */
    {
      const c = L.lo + 1, r = L.lo + 6;
      if (!V.canPlace('mill', c, r, V.occupied())) fails.push('the price check had nowhere to stand a mill');
      else {
        for (const k of V.RES) V.res[k] = 0; V.step(0.001);
        const poor = pill('mill', c, r);
        const cost = V.B('mill').cost;
        if (!/^need /.test(poor || ''))
          fails.push('the pill over a mill the village cannot pay for said "' + poor + '"');
        else for (const [icon, k] of [['🪵', 'wood'], ['🌾', 'food']]) {
          const m = new RegExp(icon + '(\\d+)').exec(poor);
          const want = Math.max(0, Math.ceil((cost[k] || 0) - V.res[k]));
          if (!m) { if (want > 0) fails.push('the pill says "' + poor + '" and the village is ' + want + ' ' + k + ' short'); }
          else if (+m[1] !== want)
            fails.push('the pill says "' + poor + '" and the village is ' + want + ' ' + k + ' short');
        }
        /* Paid for, and it goes back to answering the question that was asked. */
        for (const [k, v] of Object.entries(cost)) V.res[k] = v;
        V.step(0.001);
        const paid = pill('mill', c, r);
        if (!/\/s here/.test(paid || ''))
          fails.push('the village was handed exactly a mill\'s price and the pill still said "' + paid + '"');
      }
    }

    V.sel = null; V.ghost = null; V.panel = null; V.goalIdx = 0; V.step(0.001);
    return { tried, spread: +spread.toFixed(2), fails };
  };

  window.chipSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    /* A chip draws its two lines in order: the amount, then this. So these
       come out in the order the chips are laid out, which is the order of the
       list of goods -- the first is the first kind, and so on. */
    const LINE = /^(\+[\d.]+\/s|idle|storage full|(?:wasting|sharing) [\d.]+\/s)$/;
    const chips = () => {
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return lines.filter(t => LINE.test(t));
    };
    const figure = t => { const m = /([\d.]+)\/s/.exec(t); return m ? +m[1] : 0; };

    const SECS = 240;
    /* What the stores gain, and what the villagers carry home. A carry only
       ever leaves a villager by being delivered, so the second is the village's
       work counted without asking the village.

       The stores are HELD where the scene put them, every tick, and what each
       tick added is counted before they are put back. Left to run, a granary
       at a tenth of 1380 taking 5.7 a second is full after 218 seconds of a
       240-second measurement -- so the figure was compared with a stretch
       that ended in a different state, with the chip saying "wasting", and it
       passed only because the tolerance is wide enough to swallow the last
       twenty seconds. Held, the room never changes, and neither does the
       question being asked. */
    const run = (secs, level) => {
      const carried = {}, gained = {};
      for (const k of V.RES) { carried[k] = 0; gained[k] = 0; }
      for (let i = 0; i < secs * 30; i++) {
        const held = V.villagers.map(v => [v, v.carry ? { k: v.carry.k, n: v.carry.n } : null]);
        V.orders = [];                                   // a trade is not production
        for (const k of V.RES) V.res[k] = level[k];
        V.step(1 / 30);
        for (const k of V.RES) gained[k] += V.res[k] - level[k];
        for (const [v, h] of held) if (h && !v.carry) carried[h.k] += h.n;
      }
      for (const k of V.RES) V.res[k] = level[k];
      return { carried, gained };
    };
    /* And the workforce is given time to answer the stores before anyone
       reads what it says about them.

       The scene ends with every store above its ceiling, and the first pass
       through it on a fresh page left three villagers on the hall's woodpile
       and one in the quarry -- the staffing of a village with nowhere to put
       anything. Dropping the stores to a tenth re-plans at once, but people
       change job one per tick and only empty-handed, so the chip read one
       tick later described the old staffing: "+3.1 / +3.5 / +0.5", true of
       that instant, and then compared with four minutes of the new one at
       1.8 / 5.2 / 1.5. It failed every time it ran first on a fresh page, and
       never in the battery, where thirty-seven checkers have already run and
       the village it inherits happens to settle faster. A check whose verdict
       depends on what ran before it is not measuring the chip. */
    const SETTLE = 30;
    const settle = level => {
      for (let i = 0; i < SETTLE * 30; i++) {
        V.orders = [];
        for (const k of V.RES) V.res[k] = level[k];
        V.step(1 / 30);
      }
      for (const k of V.RES) V.res[k] = level[k];
    };
    /* A measurement made of loads cannot be finer than a load. */
    const near = (said, real, secs) =>
      Math.abs(real - said) * secs <= V.CARRY + 0.10 * said * secs + 0.05 * secs;

    const seen = new Set();
    const scene = (kinds, hall, finished) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = hall; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
      for (const k of kinds) { for (const k of V.RES) V.res[k] = 9e5; put(k); }
      for (const q of V.placed) if (q.key !== 'hall' && !V.isDecor(q.key)) q.lvl = 3;
      for (let i = 0; i < 150 * 30; i++) V.step(1 / 30);   // the levels land through a real finish
      /* Parked, or a goal pays out in the middle of the measurement and the
         stores gain something nobody carried. */
      V.goalIdx = finished ? V.GOALS.length : parkGoals();
      V.goalDone = null; V.finished = null; V.away = null; V.orders = [];
    };
    /* One workplace for every kind the village keeps, because the thing being
       read is a chip PER KIND: a kind nobody makes reads "idle", which is one
       of the five lines, but it can never read any of the other four. */
    const WORKING = ['house', 'house', 'house', 'house', 'farm', 'farm',
      'lumber', 'lumber', 'quarry', 'store', 'mill', 'well'];

    let scenes = 0;
    for (const [what, kinds, hall, finished, fill] of [
      ['a working village with room to spare', WORKING, 5, false, 0.1],
      ['a working village at its ceiling', WORKING, 5, false, 1],
      ['a finished village at its ceiling', WORKING, 5, true, 1],
      ['a village with no farm, granary full', ['house', 'house', 'lumber', 'store'], 3, false, 1],
      ['a hall and one house', ['house'], 3, false, 0.1],
    ]) {
      scene(kinds, hall, finished);
      const level = {};
      for (const k of V.RES) level[k] = Math.floor(V.caps[k] * fill);
      settle(level);
      V.step(0.001);
      for (const k of V.RES) V.res[k] = level[k];
      const said = chips();
      scenes++;
      if (said.length !== V.RES.length) {
        fails.push('the chips said ' + said.length + ' things in ' + what + ' and the village keeps '
          + V.RES.length + ' kinds of goods: ' + said.join(' / '));
        continue;
      }
      const full = fill === 1;
      const r = run(SECS, level);
      /* In the order the chips are laid out, which is the order of the list. */
      for (const [i, k] of V.RES.map((k2, i2) => [i2, k2])) {
        const t = said[i];
        seen.add(/^\+/.test(t) ? 'rate' : /wasting/.test(t) ? 'wasting'
          : /sharing/.test(t) ? 'sharing' : t);
        const where = 'the ' + k + ' chip in ' + what + ' says "' + t + '"';
        /* The word belongs to the state, whatever the number is. */
        if (/wasting|sharing|storage full/.test(t) !== full)
          fails.push(where + (full ? ' with the store at its ceiling' : ' with room to spare'));
        if (/sharing/.test(t) && !finished)
          fails.push(where + ' and the village still has goals to finish');
        if (/wasting/.test(t) && finished)
          fails.push(where + ' and every goal is done, so it is given away rather than lost');

        if (t === 'idle') {
          const got = r.gained[k] + r.carried[k];
          if (got > 0.01)
            fails.push(where + ' and ' + got.toFixed(1) + ' ' + k + ' arrived over ' + SECS + ' seconds');
        } else if (/^\+/.test(t)) {
          const real = r.gained[k] / SECS;
          if (!near(figure(t), real, SECS))
            fails.push(where + ' and the stores gained ' + real.toFixed(2) + '/s');
        } else if (/wasting|sharing/.test(t)) {
          /* Held at the ceiling for the whole stretch, so every load carried
             home is a load lost. */
          const real = r.carried[k] / SECS;
          if (!near(figure(t), real, SECS))
            fails.push(where + ' and the villagers carried home ' + real.toFixed(2) + '/s that could not be kept');
        } else if (t === 'storage full') {
          const real = r.carried[k] / SECS;
          if (real > 0.06)
            fails.push(where + ' and the villagers carried home ' + real.toFixed(2) + '/s into it');
        }
      }
    }

    /* Every line it can show is a line it does show. */
    for (const k of ['rate', 'idle', 'wasting', 'sharing', 'storage full'])
      if (!seen.has(k)) fails.push('the chips never once said "' + k + '"');

    V.goalIdx = 0; V.orders = []; V.step(0.001);
    return { scenes, seen: [...seen], fails };
  };

  /* ---------------------------------------------------------------------------
     Nothing is bought at a price the screen never showed.

     The tray card swaps its price for "no spare" when nobody is free, because
     the button cannot hold both, and the placement pill said only "no one
     spare -- build a house first". So a new player one tap from their first
     farm had, on the whole screen, "Farm / no spare", that pill, and "Tap the
     same spot again to confirm" -- and the second tap spent 45 wood that no
     string had named. Nothing checked for it because every checker reads what
     IS drawn, and the fault was something missing.

     So this asks the question from the player's side: with a building chosen
     and a legal spot under the finger, one tap from paying, every part of its
     price has to be somewhere on the screen. Asked of every kind the village
     may build, in a village where nobody is spare and one where people are,
     and the first of them is a brand-new player's: a hall, one house, one
     lumber camp, which is exactly where the farm was found. A sweep that
     never meets "no spare" has not tested the case it exists for, so that is
     a failure too.

       priceSweep()  -> { cases, noSpare, fails }
  --------------------------------------------------------------------------- */
  window.priceSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const grab = () => {
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      return lines;
    };
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    const scene = (hall, kinds) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = hall > 1 ? V.LAND_MAX : 1; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.ghost = null; V.claimAsk = false; V.orders = []; V.barMode = 'build';
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = hall; V.placed[0].t = 1;
      for (const k of kinds) { for (const k2 of V.RES) V.res[k2] = V.caps[k2]; put(k); }
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);       // finished the game's own way
      parkGoals(); V.goalDone = null;
    };
    let cases = 0, noSpare = 0;
    for (const [what, hall, kinds] of [
      ['a new player\'s village', 1, ['house', 'lumber']],
      ['a village with nobody spare', 5, ['house', 'farm', 'lumber', 'quarry', 'mill']],
      ['a village with people to spare', 5, ['house', 'house', 'house', 'house', 'house', 'house']],
    ]) {
      scene(hall, kinds);
      for (const b of V.BUILDINGS) {
        if (b.key === 'hall') continue;
        /* Rich enough to buy it, and nothing else changed: what is being asked
           is what the player sees just before paying, not whether they can. */
        for (const k of V.RES) V.res[k] = V.caps[k];
        if (!V.buildable(b.key)) continue;
        const occ = V.occupied(), L = V.landBounds();
        let spot = null;
        for (let r = L.lo; r <= L.hi && !spot; r++) for (let c = L.lo; c <= L.hi && !spot; c++)
          if (V.canPlace(b.key, c, r, occ)) spot = [c, r];
        if (!spot) continue;
        /* From the tray it is chosen from, which for an ornament is not the
           build tray -- and the price on its card is the price the player saw. */
        V.barMode = V.isDecor(b.key) ? 'decor' : 'build';
        V.sel = b.key; V.ghost = { c: spot[0], r: spot[1], fits: true, ok: true, why: null };
        V.step(0.001);
        for (const k of V.RES) V.res[k] = V.caps[k];
        const lines = grab();
        cases++;
        const short = V.noSpareHands(b.key);
        if (short) noSpare++;
        const missing = Object.entries(b.cost || {})
          .filter(([k, v]) => !lines.some(t => t.includes(V.RES_ICON[k] + v)))
          .map(([k, v]) => V.RES_ICON[k] + v);
        if (missing.length)
          fails.push('in ' + what + ', one tap from building a ' + b.key + (short ? ' with nobody spare' : '')
            + ', nothing on the screen says ' + missing.join(' or ') + ': ' + lines.filter(t => /spare|tap|\/s|need/i.test(t)).join(' | '));
        V.sel = null; V.ghost = null;
      }
    }
    if (!noSpare) fails.push('no case had nobody spare, so the price the tray hides was never looked for');

    /* And every price is written in one order: wood, food, stone. A row of
       costs is read by position as much as by icon, and the upgrade price
       broke it -- the food every upgrade asks was added after the building's
       own costs, so a mill read "Upgrade to 2   🪵440  🪨265  🌾20" beside a
       sell button and a tray that both go wood, food, stone. Asked of every
       price list in the game rather than of one string, so a new building
       or a new kind of reward cannot reintroduce it. */
    const lists = [];
    for (const b of V.BUILDINGS) {
      lists.push([b.key + ' to build', b.cost]);
      if (b.key === 'hall' || V.isDecor(b.key) || b.key === 'beacon') continue;
      for (let l = 1; l < V.LVL_MAX; l++) lists.push([b.key + ' level ' + l + ' to ' + (l + 1), V.upCostOf({ key: b.key, lvl: l })]);
    }
    V.HALL.forEach((h, i) => h && lists.push(['hall level ' + i + ' to ' + (i + 1), h.up]));
    V.LAND.forEach((L, i) => lists.push(['land ring ' + i, L.cost]));
    V.GOALS.forEach(gl => lists.push(['the reward for "' + gl.text + '"', gl.give]));
    let priced = 0;
    for (const [what, cost] of lists) {
      if (!cost) continue;
      const ks = Object.keys(cost).filter(k => cost[k]);
      if (ks.length < 2) continue;
      priced++;
      const idx = ks.map(k => V.RES.indexOf(k));
      if (idx.some((x, i) => i && x < idx[i - 1]))
        fails.push(what + ' is written ' + ks.map(k => V.RES_ICON[k] + cost[k]).join(' ')
          + ', not in the order every other price uses (' + V.RES.map(k => V.RES_ICON[k]).join(' ') + ')');
    }
    if (priced < 20) fails.push('only ' + priced + ' prices of two kinds or more were found, so the order was barely asked about');
    V.goalIdx = 0; V.sel = null; V.ghost = null; V.step(0.001);
    return { cases, noSpare, fails };
  };

  window.shapeSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText, seen = new Set();
    const SEP = '   ·   ';
    let states = 0;
    const grab = where => {
      states++;
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      for (const t of lines) {
        if (seen.has(t)) continue;
        seen.add(t);
        if (/\b(undefined|NaN|Infinity)\b/.test(t))
          fails.push(where + ' drew "' + t + '"');
        if (t.indexOf(SEP) < 0) continue;
        if (t.startsWith(SEP) || t.endsWith(SEP))
          fails.push(where + ' drew a row hanging off a divider: "' + t + '"');
        for (const part of t.split(SEP))
          if (!part.trim()) { fails.push(where + ' drew a row with nothing between two dividers: "' + t + '"'); break; }
      }
    };
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    const clear = () => {
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.barMode = 'build';
      /* The hint strip and the goal strip share a slot, so a village with a
         hint still to read never shows the goal at all. */
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    };
    const build = kinds => {
      for (const k of kinds) { for (const k of V.RES) V.res[k] = 9e5; put(k); }
      for (const q of V.placed) q.t = 1;
      V.step(0.001);
    };

    /* ---- every goal, in a village that can name what it wants and in one
            that cannot. The second is the half that mattered: the fault needed
            a goal asking about buildings and a village with none of them. ---- */
    const FULL = ['house', 'house', 'farm', 'lumber', 'store', 'well', 'mill',
      'market', 'statue', 'path'];
    for (const [what, kinds, hall, land, purse] of [
      ['a village with one of everything', FULL, 5, V.LAND_MAX, 'rich'],
      ['a village with nothing but a hall and a house', ['house'], 5, V.LAND_MAX, 'rich'],
      ['a bare village with an empty purse', ['house'], 1, 0, 'poor'],
      ['a village at its ceiling', FULL, 5, V.LAND_MAX, 'full'],
    ]) {
      for (let i = 0; i < V.GOALS.length; i++) {
        V.placed.length = 0; V.villagers.length = 0; V.landTier = land; V.coverPlaced();
        clear();
        V.ensureHall(); V.placed[0].lvl = hall; V.placed[0].t = 1;
        for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
        build(kinds);
        V.goalIdx = i; V.goalDone = null; V.finished = null;
        V.res.wood = purse === 'poor' ? 0 : purse === 'full' ? V.caps.wood : 9e5;
        V.res.food = purse === 'poor' ? 0 : purse === 'full' ? V.caps.food : 9e5;
        V.step(0.001);
        grab('the goal "' + V.GOALS[i].text.slice(0, 32) + '" in ' + what);
      }
    }

    /* ---- every panel, at every level, standing and going up ---- */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    clear();
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
    build(FULL);
    for (let i = 0; i < 90 * 30; i++) V.step(1 / 30);     // villagers at work, stock moving
    for (const p of V.placed.slice()) {
      for (let L = 1; L <= V.LVL_MAX; L++) for (const t of [1, 0.5]) {
        if (V.isDecor(p.key) && L > 1) continue;
        p.lvl = L; p.t = V.isDecor(p.key) ? 1 : t;
        for (const purse of ['rich', 'poor', 'full']) {
          V.res.wood = purse === 'poor' ? 0 : purse === 'full' ? V.caps.wood : 9e5;
          V.res.food = purse === 'poor' ? 0 : purse === 'full' ? V.caps.food : 9e5;
          V.panel = p.id; V.step(0.001);
          grab('the ' + p.key + ' panel at level ' + L + (t < 1 ? ' under scaffolding' : ''));
        }
      }
      p.lvl = 1; p.t = 1;
    }
    V.panel = null;

    /* ---- and the cards and trays ---- */
    const mk = V.placed.find(p => p.key === 'market');
    for (const [what, set] of [
      ['the build tray', () => { clear(); V.barMode = 'build'; }],
      ['the decorate tray', () => { clear(); V.barMode = 'decorate'; }],
      ['the orders tray', () => { clear(); V.barMode = 'orders';
        V.orders = [{ ...V.makeOrder(0), slot: 0 }, { ...V.makeOrder(2), slot: 1 }]; }],
      ['an empty orders tray', () => { clear(); V.barMode = 'orders'; V.orders = []; }],
      ['a card placing a building', () => { clear(); V.sel = 'mill'; }],
      ['a card moving a building', () => { clear(); V.moving = mk && mk.id; }],
      ['the claim dialogue', () => { clear(); V.claimAsk = true; }],
      ['the welcome-back card', () => { clear();
        V.away = { secs: 7200, got: { wood: 120, food: 80 }, capped: false, spilled: false,
          shared: null, fullAfter: null }; }],
      ['a welcome-back card that shared', () => { clear(); V.goalIdx = V.GOALS.length;
        V.away = { secs: 7200, got: { wood: 120, food: 80 }, capped: true, spilled: true,
          shared: { wood: 900, food: 800 }, fullAfter: 60 }; }],
      ['the goal banner', () => { clear(); V.goalIdx = 3;
        V.goalDone = { g: V.GOALS[2], got: { wood: 60 }, age: 0.2 }; }],
      ['the finished card', () => { clear(); V.goalIdx = V.GOALS.length;
        V.finished = { villagers: 12, buildings: 9, trades: 14, charm: 60 }; }],
    ]) {
      V.goalIdx = 4; set(); V.step(0.001);
      grab(what);
    }

    clear(); V.goalIdx = 0; V.orders = []; V.step(0.001);
    return { strings: seen.size, states, fails };
  };

  window.buttonSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText;
    const rowsOf = p => {
      V.panel = p.id; V.step(0.001);
      const lines = [];
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.panel = null;
      return lines;
    };
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    /* The ceiling is a CACHE, recomputed only when something finishes going up,
       so a scene that sets levels by hand is read against a stale one -- and
       the whole of this sweep is about what the village can hold. Letting
       everything finish once is the game's own way of putting that right. */
    const settle = () => {
      for (const q of V.placed) if (q.t >= 1) q.t = 0.9;
      for (let i = 0; i < 40; i++) V.step(1 / 30);
    };
    const kindOf = t =>
      t === 'Building…' ? 'busy'
      : t === 'Highest level' ? 'max'
      : /^Needs town hall level \d+$/.test(t) ? 'gate'
      : t === 'Needs a bigger storehouse' ? 'bigger'
      : t === 'Needs another storehouse' ? 'another'
      : /^Need [^a-z]*more$/.test(t) ? 'short'
      : /^Upgrade to \d+/.test(t) ? 'ready'
      : null;
    const labelOn = p => {
      const hits = rowsOf(p).filter(t => kindOf(t));
      if (hits.length !== 1) return { text: null, n: hits.length, hits };
      return { text: hits[0], kind: kindOf(hits[0]), n: 1 };
    };
    const num = t => (t.match(/\d+/g) || []).map(Number);

    const kinds = {};
    let states = 0, acted = 0;
    const budget = { gate: 0, another: 0, bigger: 0, short: 0, ready: 0 };
    const CAP = 3;                      // how many of each reason are followed through

    const scene = (H, storeCount, storeLvl) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.tutSeen.length = 0;
      V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.goalIdx = 0;
      V.ensureHall();
      V.placed[0].lvl = H; V.placed[0].t = 1;
      for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
      for (let n = 0; n < storeCount; n++) {
        for (const k of V.RES) V.res[k] = 9e5;
        if (V.atLimit('store') || !put('store')) break;
      }
      for (const b of V.BUILDINGS) {
        if (b.key === 'hall' || b.decor || b.key === 'store') continue;
        for (const k of V.RES) V.res[k] = 9e5;
        if (!V.atLimit(b.key)) put(b.key);
      }
      for (const q of V.placed) if (q.key === 'store') q.lvl = storeLvl;
      settle();
    };

    for (let H = 1; H <= V.HALL.length - 1; H++)
      for (const storeCount of [0, 2, 9])
        for (const storeLvl of [1, V.LVL_MAX]) {
          scene(H, storeCount, storeLvl);
          const subjects = V.placed.filter(p => !V.isDecor(p.key));
          for (const p of subjects) for (let L = 1; L <= V.LVL_MAX; L++) {
            if (p.key === 'hall' && L > V.HALL.length - 1) continue;
            for (const purse of ['rich', 'poor', 'part', 'busy']) {
              /* Every measurement from the same village. The hall is the first
                 subject in the list, so without this its own pass left it at the
                 top level and every building measured after it was standing under
                 a hall that gated nothing -- the sweep ran three thousand states
                 and never once saw the reason the button gives most often early
                 on. The scaffolding has to come back down too: a tap taken in an
                 earlier state leaves the hall half built, and a half built hall
                 is HOLDING the level below, so the next building was judged
                 against a gate that had not really moved. */
              for (const q of V.placed)
                { q.lvl = q.key === 'hall' ? H : q.key === 'store' ? storeLvl : 1; q.t = 1; }
              p.lvl = L; p.t = purse === 'busy' ? 0.5 : 1;
              settle();
              if (purse === 'busy') p.t = 0.5;
              /* Full, empty, and HALF WAY -- and the third is the only one of
                 them where what is missing and what it costs are different
                 numbers. A button quoting the price where it means the
                 shortfall is right at an empty store and wrong everywhere
                 else, and an empty store is the easy case to think of: that
                 mutation walked through this sweep until the half-full purse
                 was added. */
              const price = V.upInfo(p).cost || {};
              for (const k of ['wood', 'food'])
                V.res[k] = purse === 'poor' ? 0
                  : purse === 'part' ? Math.min(V.caps[k], Math.floor((price[k] || 0) / 2))
                  : V.caps[k];
              V.step(0.001);
              const lab = labelOn(p);
              states++;
              if (!lab.text) {
                /* A decoration has no upgrade button at all, which is the one
                   honest way to say nothing. */
                if (lab.n > 1)
                  fails.push('the ' + p.key + ' button says ' + lab.n + ' things at once: '
                    + lab.hits.join(' / '));
                continue;
              }
              kinds[lab.kind] = (kinds[lab.kind] || 0) + 1;
              const who = 'a ' + p.key + ' at level ' + L + ' under a hall at ' + V.hallLevel();

              /* ---- the two that refuse outright ---- */
              if (lab.kind === 'max' || lab.kind === 'busy') {
                if (V.upgradeBuilding(p))
                  fails.push('the button for ' + who + ' says "' + lab.text + '" and the game sold an upgrade anyway');
                if (lab.kind === 'busy' && p.t >= 1)
                  fails.push('the button for ' + who + ' says "Building…" and nothing is being built');
                continue;
              }
              /* ---- the storehouse pair names the one that is open ---- */
              if (lab.kind === 'another' && V.atLimit('store'))
                fails.push('the button for ' + who + ' asks for another storehouse and the hall allows no more');
              if (lab.kind === 'bigger' && !V.atLimit('store'))
                fails.push('the button for ' + who + ' asks for a bigger storehouse and another could simply be built');

              if (budget[lab.kind] >= CAP) continue;
              budget[lab.kind]++; acted++;

              /* ---- and then each reason is acted on ---- */
              if (lab.kind === 'gate') {
                const want = num(lab.text)[0];
                if (!(want >= 1 && want <= V.HALL.length - 1)) {
                  fails.push('the button for ' + who + ' asks for town hall level ' + want
                    + ' and the hall stops at ' + (V.HALL.length - 1));
                  continue;
                }
                /* The level it names has to be the one that OPENS it. Reaching
                   it and finding the button satisfied is only half the rule --
                   a gate asking for more than it needs clears just as neatly,
                   and tells the player the thing is further away than it is.
                   So the level BELOW has to still be refused. Written after a
                   mutation that moved every gate one level up walked straight
                   through the half-rule. */
                const atHall = n => {
                  V.placed[0].lvl = n;
                  for (const q of V.placed) q.t = 1;
                  settle();
                  for (const k of V.RES) V.res[k] = V.caps[k]; V.step(0.001);
                  return labelOn(p);
                };
                if (want - 1 >= 1) {
                  const below = atHall(want - 1);
                  if (below.kind !== 'gate')
                    fails.push('the button for ' + who + ' asked for town hall level ' + want
                      + ' and at level ' + (want - 1) + ' it already says "' + below.text + '"');
                }
                const now = atHall(want);
                if (now.kind === 'gate')
                  fails.push('the button for ' + who + ' asked for town hall level ' + want
                    + ', the hall reached it, and it still says "' + now.text + '"');
              } else if (lab.kind === 'another' || lab.kind === 'bigger') {
                /* Taken as far as the hall allows. One more shed need not be
                   enough on its own; running out of shed must be. */
                for (let n = 0; n < 9 && !V.atLimit('store'); n++) {
                  for (const k of V.RES) V.res[k] = 9e5;
                  if (!put('store')) break;
                }
                for (const q of V.placed) if (q.key === 'store' && q !== p) {
                  let i = V.upInfo(q), guard = 0;
                  while (!i.max && !i.gate && guard++ < 9) { q.lvl++; i = V.upInfo(q); }
                }
                settle();
                for (const k of V.RES) V.res[k] = V.caps[k]; V.step(0.001);
                const now = labelOn(p);
                if (now.kind === 'another' || now.kind === 'bigger')
                  fails.push('the button for ' + who + ' said "' + lab.text
                    + '", every storehouse the hall allows is up and as big as it allows, and it says "'
                    + now.text + '"');
              } else if (lab.kind === 'short') {
                /* The figures are what is MISSING, not what it costs. */
                const want = V.upInfo(p).cost;
                for (const [icon, k] of [['🪵', 'wood'], ['🌾', 'food']]) {
                  const m = new RegExp(icon + '(\\d+)').exec(lab.text);
                  const real = Math.max(0, Math.ceil((want[k] || 0) - V.res[k]));
                  if (!m) {
                    if (real > 0) fails.push('the button for ' + who + ' says "' + lab.text
                      + '" and the village is ' + real + ' ' + k + ' short');
                  } else if (+m[1] !== real) {
                    fails.push('the button for ' + who + ' says "' + lab.text + '" and the village is '
                      + real + ' ' + k + ' short');
                  }
                }
                for (const [k, v] of Object.entries(want)) V.res[k] = v;
                V.step(0.001);
                const now = labelOn(p);
                if (now.kind !== 'ready')
                  fails.push('the button for ' + who + ' said "' + lab.text
                    + '", the village was handed exactly the price, and it says "' + now.text + '"');
              } else if (lab.kind === 'ready') {
                const want = V.upInfo(p).cost;
                const said = num(lab.text);
                if (said[0] !== L + 1)
                  fails.push('the button for ' + who + ' offers level ' + said[0]);
                const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
                if (!V.upgradeBuilding(p)) {
                  fails.push('the button for ' + who + ' says "' + lab.text + '" and the tap did nothing');
                  continue;
                }
                for (const k of V.RES) {
                  const spent = before[k] - V.res[k];
                  if (Math.abs(spent - (want[k] || 0)) > 0.01)
                    fails.push('the button for ' + who + ' said "' + lab.text + '" and the village paid '
                      + spent.toFixed(0) + ' ' + k);
                }
                if (p.lvl !== L + 1 || p.t >= 1)
                  fails.push('the button for ' + who + ' was tapped and the building is at level '
                    + p.lvl + (p.t >= 1 ? ' with no work to do' : ''));
              }
            }
          }
        }

    /* Every reason it can give is a reason it does give. One that has quietly
       become unreachable is a branch nobody can read and nobody can test. */
    for (const k of ['busy', 'max', 'gate', 'another', 'bigger', 'short', 'ready'])
      if (!kinds[k]) fails.push('the upgrade button never once said its "' + k + '" reason');

    V.panel = null;
    return { states, kinds, acted, fails };
  };

  window.allowSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [], orig = ctx.fillText, rows = [];
    const rowsOf = p => {
      V.panel = p.id; V.step(0.001);
      const lines = [];
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return orig.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = orig; }
      V.panel = null;
      return lines;
    };
    const byIcon = new Map(V.BUILDINGS.map(b => [b.icon, b.key]));
    const nameOf = new Map(V.BUILDINGS.map(b => [b.key, b.name.toLowerCase()]));
    /* What the village may build, asked of the game rather than of the table. */
    const allowNow = () => {
      const o = {};
      for (const b of V.BUILDINGS) o[b.key] = V.allowedOf(b.key) || 0;
      return o;
    };
    /* The row, read back as a promise. */
    const readAdds = lines => {
      const row = lines.find(x => /^level \d+ adds/.test(x));
      if (!row) return null;
      const m = /^level (\d+) adds\s+(.*)$/.exec(row);
      const pending = / when it is done$/.test(m[2]);
      const add = {};
      for (const bit of m[2].replace(/ when it is done$/, '').split(/\s+/).filter(Boolean)) {
        const mm = /^(.*)\+(\d+)$/.exec(bit);
        if (!mm) { fails.push('the hall says "' + row + '", and "' + bit + '" is not an icon and a number'); continue; }
        const key = byIcon.get(mm[1]);
        if (!key) { fails.push('the hall promises more ' + mm[1] + ' and nothing in the village wears that icon'); continue; }
        add[key] = +mm[2];
      }
      return { row, level: +m[1], pending, add };
    };
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };

    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.tutSeen.length = 0;
    V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
    V.goalIdx = 0;
    V.ensureHall();
    const hall = V.placed[0];

    let steps = 0;
    for (let L = 1; L < V.HALL.length - 1; L++) {
      hall.lvl = L; hall.t = 1;
      for (const k of V.RES) V.res[k] = 5e5; V.step(0.001);
      /* Storage up to what this level allows, or the village cannot HOLD the
         price of the last step and the game rightly refuses to sell it. */
      while (!V.atLimit('store')) { for (const k of V.RES) V.res[k] = 5e5; if (!put('store')) break; }
      for (const q of V.placed) if (q.key === 'store') { q.t = 1; q.lvl = 5; }
      for (const k of V.RES) V.res[k] = 5e5; V.step(0.001);

      const before = allowNow();
      const settledLines = rowsOf(hall);
      const settled = readAdds(settledLines);
      if (settledLines.some(x => /under scaffolding/.test(x)))
        fails.push('a hall settled at level ' + L + ' says it is under scaffolding');

      for (const k of V.RES) V.res[k] = 5e5;
      if (!V.upgradeBuilding(hall)) {
        fails.push('a hall at level ' + L + ' could not be sent to level ' + (L + 1)
          + ', so the promise was never tested');
        continue;
      }
      const midLines = rowsOf(hall);
      const mid = readAdds(midLines);
      if (!midLines.some(x => /under scaffolding/.test(x)))
        fails.push('a hall halfway to level ' + (L + 1) + ' says nothing about the work being done');
      /* And nothing is allowed yet, which is what makes the row a promise
         rather than a report. */
      const held = allowNow();
      for (const b of V.BUILDINGS)
        if (held[b.key] !== before[b.key])
          fails.push('a hall halfway to level ' + (L + 1) + ' already allows '
            + held[b.key] + ' ' + nameOf.get(b.key) + ', up from ' + before[b.key]);

      for (let i = 0; i < 30 * 30 && hall.t < 1; i++) V.step(1 / 30);
      if (hall.t < 1) { fails.push('level ' + (L + 1) + ' never finished going up'); continue; }
      const after = allowNow();
      steps++;

      for (const [what, said, wanted] of [
        ['settled at level ' + L, settled, false],
        ['halfway to level ' + (L + 1), mid, true]]) {
        if (!said) {
          fails.push('a hall ' + what + ' says nothing about what level ' + (L + 1) + ' allows');
          continue;
        }
        rows.push(what + ' — ' + said.row);
        if (said.level !== L + 1)
          fails.push('a hall ' + what + ' quotes level ' + said.level + ': "' + said.row + '"');
        if (said.pending !== wanted)
          fails.push('a hall ' + what + (said.pending ? ' says the row is a promise for later'
            : ' states it flatly') + ': "' + said.row + '"');
        for (const b of V.BUILDINGS) {
          const real = after[b.key] - before[b.key], promised = said.add[b.key] || 0;
          if (real !== promised)
            fails.push('a hall ' + what + ' promises ' + promised + ' more ' + nameOf.get(b.key)
              + ' and level ' + (L + 1) + ' allows ' + real + ' more: "' + said.row + '"');
        }
      }
    }

    /* And a hall with nothing left to sell sells nothing. */
    hall.lvl = V.HALL.length - 1; hall.t = 1; V.step(0.001);
    const top = readAdds(rowsOf(hall));
    if (top) fails.push('a hall at its top level still promises what the next one adds: "' + top.row + '"');
    if (steps < V.HALL.length - 2)
      fails.push('only ' + steps + ' of the hall\'s steps were walked');

    V.panel = null;
    return { steps, rows, fails };
  };

  window.shareSweep = function () {
    const V = window.__v, fails = [];
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    /* Big enough that two minutes carries a thousand goods home, and settled
       first, so the walking has found its rhythm before anything is counted. */
    const scene = finished => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null;
      V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      if (finished) V.goalIdx = V.GOALS.length; else parkGoals();
      V.ensureHall(); V.placed[0].lvl = 5;
      for (const k of ['house', 'house', 'house', 'house', 'farm', 'farm',
        'lumber', 'lumber', 'store', 'mill', 'well', 'statue']) {
        for (const k of V.RES) V.res[k] = 1e6; put(k);
      }
      for (const q of V.placed) if (q.key !== 'hall' && !V.isDecor(q.key)) q.lvl = 3;
      for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
      if (finished) V.goalIdx = V.GOALS.length; else parkGoals();
      V.goalDone = null; V.finished = null; V.away = null; V.orders = [];
      V.sharedTotal.wood = 0; V.sharedTotal.food = 0;
    };
    /* Every load that left a pair of hands. */
    const run = secs => {
      const carried = Object.fromEntries(V.RES.map(k => [k, 0]));
      const s0 = { wood: V.sharedTotal.wood, food: V.sharedTotal.food };
      const r0 = { wood: V.res.wood, food: V.res.food };
      for (let i = 0; i < secs * 30; i++) {
        const held = V.villagers.map(v => [v, v.carry ? { k: v.carry.k, n: v.carry.n } : null]);
        V.orders = [];                      // a trade is not the village's work
        V.step(1 / 30);
        for (const [v, h] of held) if (h && !v.carry) carried[h.k] += h.n;
      }
      return { carried,
        kept: { wood: V.res.wood - r0.wood, food: V.res.food - r0.food },
        given: { wood: V.sharedTotal.wood - s0.wood, food: V.sharedTotal.food - s0.food } };
    };

    const cases = [];
    for (const [name, finished, fill] of [
      ['with the barns at the ceiling', true, 1],
      ['with room to spare', true, 0.1],
      ['with room for less than a load', true, null],
      ['before the last goal, at the ceiling', false, 1],
    ]) {
      scene(finished);
      for (const k of ['wood', 'food'])
        V.res[k] = fill === null ? V.caps[k] - 3 : Math.floor(V.caps[k] * fill);
      const r = run(120);
      const hauled = r.carried.wood + r.carried.food;
      const gave = r.given.wood + r.given.food;
      cases.push({ name, carried: +hauled.toFixed(1), kept: +(r.kept.wood + r.kept.food).toFixed(1),
        given: +gave.toFixed(1) });
      /* A stretch that carried nothing proves nothing either way. */
      if (hauled < 200) {
        fails.push('the village carried only ' + hauled.toFixed(0) + ' goods home ' + name
          + ', so the tally was never asked anything');
        continue;
      }
      if (!finished) {
        if (gave > 0.001)
          fails.push('a village with goals still to do gave ' + gave.toFixed(1)
            + ' to its neighbours ' + name);
        continue;
      }
      for (const k of V.RES)
        if (Math.abs(r.carried[k] - (r.kept[k] + r.given[k])) > 0.01)
          fails.push('the villagers carried ' + r.carried[k].toFixed(1) + ' ' + k + ' home ' + name
            + ' and the village kept ' + r.kept[k].toFixed(1) + ' and gave away ' + r.given[k].toFixed(1));
      /* Said again in the player's terms at the two ends, because the sum above
         is also satisfied by a village that gives away nothing and keeps
         nothing. */
      if (fill === 1 && gave < hauled - 0.01)
        fails.push('the barns are at the ceiling and ' + hauled.toFixed(1)
          + ' was carried home, and the village counts ' + gave.toFixed(1) + ' given away');
      if (fill === 0.1 && gave > 0.001)
        fails.push('a village with room to spare was told it gave ' + gave.toFixed(1) + ' away');
    }

    /* And a refund is not the village's work. A statue sold into barns at the
       ceiling pours its whole price away -- nobody is housed by it and nobody
       works it, so not one villager is sent home and not one load is put down
       in the same breath. The tally must not notice. */
    scene(true);
    for (const k of V.RES) V.res[k] = V.caps[k];
    const statue = V.placed.find(p => p.key === 'statue');
    const refund = statue && V.canSell(statue) ? V.sellValue(statue) : null;
    let thrown = null;
    if (!refund || refund.wood + refund.food < 1) {
      fails.push('nothing could be sold into full barns, so what a refund does was never asked');
    } else {
      const s0 = V.sharedTotal.wood + V.sharedTotal.food, hands = V.villagers.length;
      V.sellBuilding(statue);
      thrown = V.sharedTotal.wood + V.sharedTotal.food - s0;
      if (V.villagers.length !== hands)
        fails.push('selling the statue changed the workforce, so the refund rule was not asked cleanly');
      else if (thrown > 0.001)
        fails.push('a statue was sold into full barns and the village counted ' + thrown.toFixed(1)
          + ' of the ' + (refund.wood + refund.food) + ' refunded as given to its neighbours');
    }

    V.sharedTotal.wood = 0; V.sharedTotal.food = 0;
    return { cases, refund, thrown, fails };
  };

  window.traderSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 3; V.step(0.001);
    {
      const L = V.landBounds();
      const seat = k => { for (const kAll of V.RES) V.grant(kAll, 9e5, 0, 0);
        for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        return null; };
      for (const k of ['house', 'lumber', 'farm', 'store']) seat(k);
      for (const p of V.placed) if (p.key !== 'hall') { p.t = 1; p.lvl = 2; }
      V.step(0.001);
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    }

    /* Wait out one countdown and report what it cost. A climb is only counted
       on a tick where the board did not change -- the moment a trader arrives
       the clock starts again, which is the number going up for the right
       reason. */
    let climbed = 0;
    const waitOne = () => {
      const said = V.nextTraderIn();
      if (said === null) return { said, waited: null };
      let prev = said, waited = null, n = V.orders.length;
      for (let i = 0; i < Math.ceil(said + 30) * 30; i++) {
        V.step(1 / 30);
        const now = V.nextTraderIn(), changed = V.orders.length !== n;
        if (!changed && now !== null && now > prev + 1e-6) climbed++;
        if (now !== null) prev = now;
        n = V.orders.length;
        if (V.orders.length) { waited = i / 30; break; }
      }
      return { said, waited };
    };

    /* From a cold board. */
    V.orders = []; V.orderT = 0; V.step(0.001);
    const cold = waitOne();
    /* And from halfway through one, because a countdown can be right only when
       it starts. */
    V.orders = []; V.orderT = 0; V.step(0.001);
    for (let i = 0; i < 30 * 30; i++) V.step(1 / 30);
    const midway = waitOne();

    /* A tick is a thirtieth, so the wait lands a tick under what was said. */
    for (const [name, r] of [['from a cold board', cold], ['halfway through', midway]]) {
      if (r.said === null) { fails.push('the board had no room ' + name + ', so the countdown could not be read'); continue; }
      if (r.waited === null) { fails.push('the stall said ' + r.said.toFixed(1)
        + ' seconds ' + name + ' and no trader ever came'); continue; }
      if (Math.abs(r.waited - r.said) > 0.2)
        fails.push('the stall said ' + r.said.toFixed(1) + ' seconds ' + name
          + ' and the trader took ' + r.waited.toFixed(1));
    }
    if (climbed)
      fails.push('the countdown went up ' + climbed + ' times while the board was unchanged');

    /* And a full board has nothing to say. */
    let guard = 0;
    while (V.orders.length < V.orderSlots() && guard++ < 20) V.orders.push(V.makeOrder(1));
    V.step(0.001);
    const whenFull = V.nextTraderIn();
    if (whenFull !== null)
      fails.push('every stall is taken and the board still counts down ' + whenFull
        + ' seconds to a trader with nowhere to stand');

    V.orders = []; V.orderT = 0; V.step(0.001);
    return { cold: { said: cold.said, waited: cold.waited },
      midway: { said: midway.said, waited: midway.waited }, climbed, whenFull, fails };
  };

  window.rewardSweep = function () {
    const V = window.__v, fails = [];
    const seat = k => { const L = V.landBounds();
      for (const kAll of V.RES) V.grant(kAll, 9e6, 0, 0);
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return null; };
    /* A village with every goal's condition already true. The goals then
       complete one after another with nothing left to do but pay out. */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.tutSeen.length = 0; V.finished = null; V.goalDone = null; V.away = null;
    V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.orders = []; V.ordersDone = 999;
    V.ensureHall(); V.placed[0].lvl = 5; V.step(0.001);
    for (const k of ['house', 'house', 'house', 'house', 'house', 'house', 'store', 'store',
      'farm', 'farm', 'lumber', 'lumber', 'well', 'mill', 'market']) seat(k);
    for (let i = 0; i < 14; i++) seat('statue');
    for (const p of V.placed) if (p.key !== 'hall') { p.t = 1; if (!V.isDecor(p.key)) p.lvl = 5; }
    V.step(0.001);
    for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);

    const load = V.CARRY;                       // what a villager can put down in one tick
    const walk = full => {
      const rows = [];
      V.goalIdx = 0; V.goalDone = null; V.finished = null;
      for (let guard = 0; V.goalIdx < V.GOALS.length && guard < 300; guard++) {
        const g = V.GOALS[V.goalIdx];
        for (const k of V.RES) V.res[k] = full ? V.caps[k] : V.caps[k] * 0.05;
        const before = {}, room = {};
        for (const k of V.RES) { before[k] = V.res[k]; room[k] = V.caps[k] - before[k]; }
        V.goalDone = null;
        V.step(1 / 30);
        const card = V.goalDone;
        if (!card) continue;                    // not this tick; the next one will do it
        const got = card.got || {};
        const gain = {};
        for (const k of V.RES) gain[k] = V.res[k] - before[k];
        const name = '"' + g.text.slice(0, 30) + '"';
        for (const k of V.RES) {
          const said = got[k] || 0, meant = Math.min(g.give[k] || 0, room[k]);
          if (said > (g.give[k] || 0) + 0.01)
            fails.push('the banner for ' + name + ' claims ' + said + ' ' + k
              + ' and the goal promises ' + (g.give[k] || 0));
          if (said > gain[k] + 0.01)
            fails.push('the banner for ' + name + ' claims ' + said.toFixed(1) + ' ' + k
              + ' and the village gained ' + gain[k].toFixed(1));
          if (said < meant - load)
            fails.push('the banner for ' + name + ' claims ' + said.toFixed(1) + ' ' + k
              + ' where there was room for ' + meant.toFixed(1));
        }
        rows.push({ goal: g.text.slice(0, 24), got, gain: { wood: +gain.wood.toFixed(1), food: +gain.food.toFixed(1) } });
      }
      return rows;
    };

    const withRoom = walk(false);
    if (withRoom.length < 15)
      fails.push('only ' + withRoom.length + ' goals paid out, so the walk proves little');
    const withNone = walk(true);
    for (const r of withNone) {
      const said = (r.got.wood || 0) + (r.got.food || 0);
      if (said > 0.01)
        fails.push('the banner for "' + r.goal + '" congratulated the village on ' + said.toFixed(1)
          + ' it could not take in');
    }

    /* And the case between the two, which is the one the card was wrong about.

       Both ends were already checked here and both were right: nothing fits
       and the card says 'stores already full', everything fits and it says
       what arrived. One barn at its ceiling and the other with room is the
       ordinary state of a village that has been spending one of the two, and
       the card printed the half that arrived with no word about the half it
       had just destroyed -- 'Goal complete!   food +20' over thirty wood
       that was gone.

       Read off the canvas rather than out of goalDone. The figures in that
       object were never the problem; what was missing was anything drawn
       about them, and a block that asked the object would have passed on the
       day the fault was written. It is the lesson beside the charm goal: the
       question is what the player can see. */
    let partial = 0;
    {
      const cv2 = document.querySelector('canvas'), ctx2 = cv2.getContext('2d');
      const banner = () => {
        const rows = [], o = ctx2.fillText;
        ctx2.fillText = function (t, ...a) { rows.push(String(t)); return o.call(this, t, ...a); };
        try { V.draw(); } finally { ctx2.fillText = o; }
        return rows.find(t => t.indexOf('Goal complete') === 0) || '';
      };
      V.goalIdx = 0; V.goalDone = null; V.finished = null;
      for (let guard = 0; V.goalIdx < V.GOALS.length && guard < 300; guard++) {
        const g = V.GOALS[V.goalIdx];
        /* Wood at the ceiling, food with room. Both rewards are then live and
           only one of them can land. */
        V.res.wood = V.caps.wood; V.res.food = 0;
        const before = { wood: V.res.wood, food: V.res.food };
        V.goalDone = null;
        V.step(1 / 30);
        if (!V.goalDone) continue;
        const said = banner();
        /* What the goal paid and what it destroyed, taken from the game's own
           tally rather than from the change in the purse.

           The purse is not a clean measurement here, and it took a village
           with something to do to show it. The village is still RUNNING
           during the step: a villager who finishes a delivery inside the same
           thirtieth of a second drops eight more food into the purse, and
           subtracting before from after then credits the goal with that
           delivery. Measured on a finished village, where the farms are busy:
           the goal paid 692 food of 800, the purse rose by 700, so this went
           looking for "food 100" in a banner that correctly said "food 108",
           and failed the game for being right. It passed for weeks because a
           half-built test village delivers almost nothing.

           So the two figures come from goalDone, which is the same object the
           banner is drawn from. That makes this check what it was always
           really for -- did the game TELL the player about the half it threw
           away -- rather than a re-derivation of the arithmetic. Both are
           already rounded there, and the card prints them unchanged, so the
           text being searched for is exact rather than approximate.

           The arithmetic is still watched, by the one comparison the purse
           can honestly make. Nothing in a step takes resources away: a
           delivery adds, a goal adds, and spending is a thing the player
           does. So whatever the game claims it handed over must at the very
           least have arrived, and a game that reports a gift it did not give
           fails that however busy the village is. */
        const paid = V.goalDone.got || {}, spilt = V.goalDone.lost || {};
        let gained = 0, missed = 0, missedAt = null;
        for (const k of ['wood', 'food']) {
          if (!(g.give[k] || 0)) continue;
          if ((paid[k] || 0) >= 0.5) gained++;
          if ((spilt[k] || 0) >= 0.5) { missed = spilt[k]; missedAt = k; }
          const arrived = V.res[k] - before[k];
          if (arrived + 0.5 < (paid[k] || 0))
            fails.push('the card for "' + g.text.slice(0, 30) + '" says it paid ' + paid[k] + ' ' + k
              + ' and the village is only ' + Math.round(arrived) + ' better off');
        }
        /* Only a goal where something arrived AND something did not is
           evidence: the all-or-nothing ends are the walks above. */
        if (!gained || !missedAt) continue;
        partial++;
        const mark = (missedAt === 'wood' ? '🪵' : '🌾') + missed;
        if (said.indexOf(mark) < 0)
          fails.push('the banner for "' + g.text.slice(0, 30) + '" took ' + missed + ' ' + missedAt
            + ' the village had no room for and said "' + said + '"');
      }
      if (partial < 5)
        fails.push('only ' + partial + ' goals paid half a reward, so the half-full card was barely asked');
    }

    /* The ladder ends and the strip has to carry on.

       That one line is always on screen, and for a finished village -- every
       building kind locked at its allowance, both resources at their ceiling,
       nothing left to ask for -- it used to say "Every goal done" for the rest
       of the game. The goals past it are GENERATED, which fails quietly in
       three separate ways, so all three are checked here.

       Two of them are asked of the canvas, because what is being tested is
       whether the player is told: a generator producing perfectly good goal
       objects that nothing draws is the failure, not the fix. The third is
       asked of a save, because that one cannot be seen at all. */
    let after = { shown: 0, differed: 0, kept: null, mark: null };
    {
      const cv3 = document.querySelector('canvas'), ctx3 = cv3.getContext('2d');
      const drawn = () => {
        const rows = [], o = ctx3.fillText;
        ctx3.fillText = function (t, ...a) { rows.push(String(t)); return o.call(this, t, ...a); };
        try { V.draw(); } finally { ctx3.fillText = o; }
        return rows;
      };
      /* Found by the target and the subject TOGETHER, on one row.

         The strip wraps to two lines, so looking for the whole sentence finds
         nothing -- the first attempt at this check failed for that reason and
         not because the game was wrong. The number alone is no good either:
         the HUD is full of numbers. Both on the same row is wrap-safe, since
         the line breaks at a space and these two sit either side of none. */
      const onStrip = gl => {
        const tok = String(gl.text).split(' ')[1];
        const word = String(gl.text).indexOf('neighbours') >= 0 ? 'neighbours' : 'trade orders';
        return drawn().find(t => t.indexOf(tok) >= 0 && t.indexOf(word) >= 0) || '';
      };

      V.goalIdx = V.GOALS.length; V.goalDone = null; V.afterMark = null;
      V.away = null; V.panel = null;
      /* A village that has been FINISHED for a while, not one that has just
         started. The first version of this began at a thousand shipped, and
         a thousand is under the fifty thousand the first generated goal asks
         for when it is measured from nothing -- so a mark that was never
         taken looked exactly like a mark that was. The real save had shipped
         five and a half million, the first goal completed in the frame it
         was created, and the player was congratulated for last week. Started
         from millions here, so a missing mark cannot hide. */
      V.sharedTotal = { wood: 3200000, food: 2300000 }; V.ordersDone = 34;
      /* The strip is third in line: a hint takes it before any goal, and the
         completion card covers the screen until it is dismissed. Both are
         correct and both hide the thing under test, so the village is put in
         the state a player reaches a minute after finishing -- hints read,
         card tapped away -- rather than the instant they finish. */
      for (let i = 0; i < 30 && V.currentHint(); i++) V.tutSeen.push(V.currentHint().id);
      if (!V.tutSeen.includes(V.FINISH_ID)) V.tutSeen.push(V.FINISH_ID);
      V.finished = null;
      const wasShip = V.shipped();
      V.step(0.001);                       // and the mark is taken from here

      after.mark = V.afterMark;
      /* Between the two, not equal to either.

         The village is RUNNING during the step that takes the mark, and on a
         finished village every delivery into a full barn is credited as
         shipped -- so the tally moves while the mark is being read. Measured:
         five and a half million set, 5,500,008 read, one load of eight from one
         villager arriving mid-tick, and an equality test called the game broken
         for it. The same mistake the reward card made, and caught the same way.

         So the bound is what it can honestly be: the mark was taken somewhere
         inside that tick, so it is at least what the village had going in and
         at most what it has coming out. */
      const nowShip = V.shipped();
      if (!after.mark || after.mark.orders !== 34
          || !(after.mark.ship >= wasShip && after.mark.ship <= nowShip))
        fails.push('the goals past the ladder did not take their mark from the village they started in: '
          + JSON.stringify(after.mark) + ' is not inside ' + wasShip + '..' + Math.round(nowShip));

      const seen = [];
      for (let i = 0; i < 4; i++) {
        /* The card for the one just finished, which covers the strip for four
           and a half seconds and is drawn INSTEAD of it. Cleared here rather
           than before the step that raises it, which is where it was: the
           step is what puts it up, so clearing it first cleared nothing and
           the check read a banner where it expected a goal. */
        V.goalDone = null;
        const gl = V.currentGoal();
        if (!gl) { fails.push('there was no goal at all ' + (i + 1) + ' past the end of the ladder,'
          + ' so a finished village is left with a blank where its goal should be'); break; }
        if (!onStrip(gl)) {
          fails.push('goal ' + (i + 1) + ' past the ladder was never drawn: the game is keeping'
            + ' "' + gl.text + '" to itself'); break;
        }
        if (gl.done()) { fails.push('goal ' + (i + 1) + ' past the ladder was already done when it was'
          + ' handed over: "' + gl.text + '"'); break; }
        seen.push(gl.text);
        /* Finished the way the village would finish it -- by sending more away
           or filling more orders, which are the only two things these ask for
           -- rather than by reaching inside the goal.

           One axis at a time, and gently. Driving both at once, hard, finished
           the goal under test AND the next three behind it, and the check then
           reported them as "already done the moment they were handed over" --
           a fault in the checker wearing the costume of a fault in the game. */
        const ships = String(gl.text).indexOf('neighbours') >= 0;
        for (let n = 0; n < 400 && !gl.done(); n++) {
          // every kind kept: rebuilt as wood and food, the stone tally fell out each time
          if (ships) V.sharedTotal = { ...V.sharedTotal, wood: V.sharedTotal.wood + 20000 };
          else V.ordersDone += 1;
        }
        if (!gl.done()) { fails.push('goal ' + (i + 1) + ' past the ladder could not be finished by'
          + ' shipping or trading, which are the only two things it asks for'); break; }
        const was = V.goalIdx;
        V.step(0.001);
        if (V.goalIdx !== was + 1) {
          fails.push('finishing goal ' + (i + 1) + ' past the ladder did not move the strip on'
            + ' (' + was + ' -> ' + V.goalIdx + ')'); break;
        }
      }
      after.shown = seen.length;
      /* Each has to be a DIFFERENT sentence from the one before. A generator
         handing back the same target for ever draws a perfectly good pill that
         never changes, which from the player\'s side is the flat line this
         whole thing replaced. */
      for (let i = 1; i < seen.length; i++) {
        if (seen[i] === seen[i - 1])
          fails.push('the strip asked for the same thing twice running past the ladder: "' + seen[i] + '"');
        else after.differed++;
      }
      if (seen.length < 4)
        fails.push('only ' + seen.length + ' of 4 goals past the ladder were read off the strip');

      /* And it has to survive being put down and picked up again.

         goalIdx was clamped to the length of the ladder on the way IN, which
         was right while the ladder was all there was. Left alone it hands back
         every goal earned past the ladder on every reload, for ever, and
         nothing else in this file would notice -- the game looks perfectly
         healthy each time it starts, it has simply forgotten. */
      const far = V.GOALS.length + 3;
      V.goalIdx = far; V.afterMark = { ship: 4242, orders: 17 };
      V.save(); V.load();
      after.kept = V.goalIdx;
      if (V.goalIdx !== far)
        fails.push('a village ' + (far - V.GOALS.length) + ' goals past the ladder came back from a save at '
          + V.goalIdx + ', so everything earned past the ladder is handed back on every reload');
      const m2 = V.afterMark;
      if (!m2 || m2.ship !== 4242 || m2.orders !== 17)
        fails.push('the mark the later goals are measured from did not survive a save: ' + JSON.stringify(m2));
    }

    V.goalIdx = 0; V.goalDone = null; V.finished = null; V.afterMark = null; V.step(0.001);
    return { goals: V.GOALS.length, withRoom: withRoom.length, withNone: withNone.length,
      partial, after, sample: withRoom.slice(0, 3), fails };
  };

  window.taughtSweep = function () {
    const V = window.__v, fails = [];
    const fresh = tier => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.coverPlaced();
      V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
      V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.ensureHall(); V.res.wood = 120; V.res.food = 60; V.step(0.001);
    };
    const seat = k => { const L = V.landBounds();
      for (const kAll of V.RES) V.grant(kAll, 9e5, 0, 0);
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return null; };
    const settle = secs => { for (let i = 0; i < secs * 30; i++) V.step(1 / 30); };
    /* The ones before it are marked read, because that is what the player did:
       the strip shows each once and then moves on. Without this every scene
       after the first would be answered by the first hint still standing there. */
    const after = id => { const i = V.TUT.findIndex(h => h.id === id);
      V.tutSeen.length = 0;
      for (let j = 0; j < i; j++) V.tutSeen.push(V.TUT[j].id); };

    const scene = {
      /* Nothing built yet. */
      house: () => { fresh(0); after('house'); },
      /* A house standing and nowhere to work. */
      work: () => { fresh(0); seat('house'); settle(5); after('work'); },
      /* Somewhere to work, so there is something worth tapping. */
      tap: () => { fresh(0); seat('house'); seat('lumber'); settle(8); after('tap'); },
      /* A hall that can grow. */
      hall: () => { fresh(0); seat('house'); seat('lumber'); settle(8);
        for (const kAll of V.RES) V.grant(kAll, 9e5, 0, 0); V.step(0.001); after('hall'); },
      /* A goal asking for land, and land to be had. */
      land: () => { fresh(0); seat('house'); seat('lumber'); settle(8);
        const g = V.GOALS.findIndex(q => /land|island/i.test(q.text));
        V.goalIdx = g < 0 ? 0 : g; V.goalDone = null; V.step(0.001); after('land'); },
      /* Barns at the ceiling with somebody still carrying into them. */
      full: () => { fresh(0); seat('house'); seat('lumber'); settle(8);
        for (const k of V.RES) V.res[k] = V.caps[k]; V.step(0.001); after('full'); },
    };

    const taught = {};
    for (const h of V.TUT) {
      const make = scene[h.id];
      if (!make) { fails.push('no scene was written for the hint "' + h.id + '", so nothing says it can still be taught'); continue; }
      make();
      const got = V.currentHint();
      taught[h.id] = got ? got.id : null;
      if (!got)
        fails.push('the hint "' + h.id + '" was put in the state it describes and the strip stayed empty');
      else if (got.id !== h.id)
        fails.push('the hint "' + h.id + '" was put in the state it describes and the strip offered "'
          + got.id + '" instead, so it can never be read');
      else {
        /* And it says something. A hint whose words come out empty teaches
           nothing however correctly it fires. */
        const words = V.hintText(got);
        if (!words || !String(words).trim())
          fails.push('the hint "' + h.id + '" has no words');
      }
    }
    V.tutSeen.length = 0; V.step(0.001);
    return { taught, fails };
  };

  window.offlineSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.tutSeen.length = 0; V.finished = null; V.goalDone = null; V.away = null;
    V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
    V.ensureHall(); V.placed[0].lvl = 5; V.step(0.001);
    {
      const L = V.landBounds();
      /* Paid for one at a time: a grant is clamped to the ceiling, so a village
         handed everything at once can only afford the first few buildings. */
      const seat = k => { for (const kAll of V.RES) V.grant(kAll, 9e6, 0, 0);
        for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        return null; };
      /* Four storehouses and a deliberately modest workforce. The ceiling is
         what limits this measurement -- a haul that hits it is not a
         measurement of anything -- so the village is built with every
         storehouse it may have and only two houses, which leaves it earning
         about one a second into a room of seven hundred. A maxed-out village
         earns seven, fills the stores in a minute and a half, and left no
         unclamped stretch to measure once a fault made the figure bigger. */
      /* A quarry, and a house to staff it: every kind the village keeps is
         made here, or the rules below that walk the list have nothing to say
         about the ones nobody makes. Without it, an away path that paid no
         stone at all passed this sweep with the rules already written for
         every kind -- there was simply no stone being made to miss. */
      for (const k of ['store', 'store', 'store', 'store', 'house', 'house', 'house', 'farm', 'lumber', 'quarry']) seat(k);
      for (const p of V.placed) if (p.key !== 'hall') { p.t = 1; p.lvl = p.key === 'store' ? 5 : 2; }
      V.step(0.001);
      for (let i = 0; i < 400 * 30; i++) V.step(1 / 30);
    }
    parkGoals();
    V.orders = []; V.orderT = 0;

    /* Short enough that nothing is clamped, because a haul that hits the
       ceiling is not a measurement of anything. Worked out from the room the
       village has and what it earns, with a fifth held back, and never under
       the floor the game ignores. */
    const rate = V.potentialRate();
    for (const k of V.RES) V.res[k] = 0; V.away = null; V.step(0.001);
    let secs = 300;
    for (const k of V.RES)
      if (rate[k] > 0) secs = Math.min(secs, 0.8 * V.caps[k] / rate[k]);
    secs = Math.floor(secs);
    if (secs < V.AWAY_MIN) {
      fails.push('this village fills its stores in ' + secs + ' seconds, under the '
        + V.AWAY_MIN + ' the game ignores, so an unclamped stretch could not be measured');
      return { secs, fails };
    }

    /* Every kind, as an object as well as a loop. With the loops walking the
       list and these two written as wood and food, stone came out as
       undefined minus a number -- NaN -- and every comparison against NaN is
       false, so "almost no stone", "stone reached the ceiling" and "stone pays
       a quarter too little" all quietly passed whatever stone did. */
    const before = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
    V.grantAway(secs);
    const away = Object.fromEntries(V.RES.map(k => [k, V.res[k] - before[k]]));
    /* And it really was unclamped, or the two sides are being asked different
       questions. */
    for (const k of V.RES)
      if (away[k] > V.caps[k] - before[k] - 1)
        fails.push('the ' + k + ' haul reached the ceiling, so the comparison means nothing');

    /* Then the same village actually plays it. grantAway moves nobody -- it
       credits the stores and puts a card up -- so the walk the villagers are
       in the middle of is the one they were in the middle of a moment ago. */
    V.away = null; for (const k of V.RES) V.res[k] = 0; V.step(0.001);
    const live = Object.fromEntries(V.RES.map(k => [k, 0]));
    for (let i = 0; i < secs * 30; i++) {
      const was = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
      V.step(1 / 30); V.orders = [];
      for (const k of V.RES) if (V.res[k] > was[k]) live[k] += V.res[k] - was[k];
    }

    /* A quarter either way. The quarter is not arbitrary: it is the size of the
       error the source records finding by hand in this very figure. Measured
       here at 1.001 and 1.019. */
    const SLACK = 0.25;
    for (const k of V.RES) {
      if (live[k] < 1) { fails.push('the village delivered almost no ' + k + ' while it was watched, so the comparison proves nothing'); continue; }
      const r = away[k] / live[k];
      if (r < 1 - SLACK)
        fails.push('an hour away pays ' + (r * 100).toFixed(0) + ' per cent of an hour of play in '
          + k + ', so the time a player was not there is worth less than it should be');
      if (r > 1 + SLACK)
        fails.push('an hour away pays ' + (r * 100).toFixed(0) + ' per cent of an hour of play in '
          + k + ', so shutting the game is the best move in it');
    }

    /* And the traders came too.

       The note on grantAway says everything carried on unwatched -- the
       harvest, the hour of the day, the traders. The first two did. orderT
       only moves inside step(), so the board was frozen: a village left for
       twelve hours came back to the stalls it was left with, down to the
       offer, and a countdown that had not moved a second. An empty board
       stayed empty after an hour, after eight, after twelve, against the
       forty-eight to five hundred and seventy-six traders that stretch is
       worth -- and five minutes of actually playing fills every stall.

       Held against PLAY rather than against a number written here, which is
       the shape the rest of this sweep already uses: the same stretch, once
       watched and once not, has to leave the same board. That survives
       retuning ORDER_EVERY, the stall count and the market's hurry-up, none
       of which this block has to know. */
    {
      const every = V.orderEvery(), slots = V.orderSlots();
      /* Long enough that every stall is taken either way, so the comparison
         is between two full boards rather than two half-filled ones. */
      const stretch = Math.max(V.AWAY_MIN, Math.ceil(every * (slots + 1)) + 5);
      const shape = () => ({ n: V.orders.length,
        sizes: new Set(V.orders.map(o => o.tier)).size,
        stalls: new Set(V.orders.map(o => o.slot)).size });
      V.away = null; V.panel = null;
      for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] / 2);
      V.orders = []; V.orderT = 0; V.step(0.001);
      for (let i = 0; i < stretch * 30; i++) V.step(1 / 30);
      const played = shape();
      for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] / 2);
      V.orders = []; V.orderT = 0; V.away = null; V.step(0.001);
      V.grantAway(stretch);
      const slept = shape();
      if (played.n < slots)
        fails.push('playing ' + stretch + ' seconds took only ' + played.n + ' of ' + slots
          + ' stalls, so there was nothing for the away board to be held to');
      else if (slept.n !== played.n || slept.sizes !== played.sizes)
        fails.push(stretch + ' seconds of play leaves ' + played.n + ' stalls taken in ' + played.sizes
          + ' sizes, and the same stretch away leaves ' + slept.n + ' in ' + slept.sizes);
      if (slept.stalls !== slept.n)
        fails.push('the board came back from an absence holding ' + slept.n + ' offers on only '
          + slept.stalls + ' stalls');
      /* And a stretch too short for even one trader leaves it alone, or the
         board would fill itself every time the app was glanced at. */
      if (V.AWAY_MIN < every) {
        V.orders = []; V.orderT = 0; V.away = null; V.step(0.001);
        V.grantAway(V.AWAY_MIN);
        if (V.orders.length)
          fails.push('an absence of ' + V.AWAY_MIN + ' seconds, under the ' + Math.round(every)
            + ' a trader takes, still seated ' + V.orders.length + ' offers');
      }
      /* And offers nobody could ever pay for go, one trader at a time being
         what the live board does and this stretch being worth many of them.
         An offer larger than the barn is a state load() keeps on purpose. */
      V.orders = []; V.orderT = 0; V.away = null; V.step(0.001);
      for (let i = 0; i < slots; i++) {
        const o = { ...V.makeOrder(i), slot: i };
        o.giveN = Math.floor(V.caps[o.giveK] * 1.5);
        V.orders.push(o);
      }
      const stuck = V.orders.map(o => o.id);
      V.grantAway(stretch);
      const left = V.orders.filter(o => stuck.indexOf(o.id) >= 0).length;
      if (left)
        fails.push(left + ' offers asking more than the whole barn holds were still on the board after '
          + stretch + ' seconds away, and no trader can ever take them');
      V.orders = []; V.orderT = 0; V.away = null; V.step(0.001);
    }

    V.away = null; V.step(0.001);
    const each = f => Object.fromEntries(V.RES.map(k => [k, f(k)]));
    return { secs, away: each(k => +away[k].toFixed(1)), live: each(k => +live[k].toFixed(1)),
      ratio: each(k => live[k] ? +(away[k] / live[k]).toFixed(3) : null), slack: SLACK, fails };
  };

  window.rescueSweep = function () {
    const V = window.__v, fails = [];
    const reset = tier => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = tier; V.coverPlaced();
      V.tutSeen.length = 0; V.finished = null; V.goalDone = null; V.away = null;
      V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.ensureHall();
    };
    const seat = k => { const L = V.landBounds();
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return null; };
    const afford = c => !!c && Object.keys(c).length > 0
      && Object.entries(c).every(([k, v]) => V.res[k] >= v);
    /* A minute of play at a time, with the trade board swept: a trade filling
       itself would hand the village goods it did not earn and the rescue would
       be the market's rather than the hall's. Goals are parked for the same
       reason -- left running, the first one paid out and the village went from
       15 wood to its ceiling in fifteen seconds. */
    const minutes = (n, stop) => {
      for (let sec = 0; sec < n * 60; sec++) {
        for (let i = 0; i < 30; i++) { V.step(1 / 30); V.orders = []; }
        if (stop()) return sec;
      }
      return null;
    };

    /* 1. The corner the source names. */
    reset(0);
    for (const k of V.RES) V.res[k] = 9e5; V.step(0.001);
    seat('house'); seat('house'); seat('farm');
    for (const p of V.placed) p.t = 1;
    for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    parkGoals();
    V.res.wood = 15; V.res.food = 0; V.step(0.001);
    const lumber = V.B('lumber').cost;
    const fromCorner = minutes(10, () => afford(lumber));
    if (fromCorner === null)
      fails.push('two houses and a farm with 15 wood and no wood income could not reach a lumber camp '
        + 'in ten minutes, so that village is over');

    /* 2. And from nothing whatever. */
    reset(0);
    for (const k of V.RES) V.res[k] = 0; V.step(0.001);
    parkGoals();
    const makers = V.BUILDINGS.filter(b => b.makes && b.jobs && b.cost
      && Object.keys(b.cost).length && Object.values(b.cost).some(v => v > 0));
    const canBuy = () => makers.find(b => V.unlocked(b.key) && !V.atLimit(b.key) && afford(b.cost));
    const tAfford = minutes(15, () => !!canBuy());
    let tStanding = null, tFood = null;
    if (tAfford === null)
      fails.push('a hall with empty stores could not afford a single workplace in fifteen minutes, '
        + 'so a village spent down to nothing is over');
    else {
      const b = canBuy();
      tStanding = seat(b.key) ? tAfford : null;
      if (tStanding === null)
        fails.push('the one workplace the village could afford had nowhere to stand on its own island');
      else {
        tFood = minutes(15, () => V.res.food > 0);
        if (tFood === null)
          fails.push('nothing to eat ever arrived after the village built its way back, '
            + 'so it is still stuck');
      }
    }

    /* 3. And nothing it must buy is beyond what it can hold. A village with no
       storehouses has the hall's ceiling and nothing more; a cost above that
       can never be saved up for, however long anyone waits. */
    reset(0); V.step(0.001);
    const ceiling = { ...V.caps };
    const tooDear = [];
    for (const b of V.BUILDINGS) {
      if (!V.unlocked(b.key) || !b.cost) continue;
      for (const [k, v] of Object.entries(b.cost))
        if (v > ceiling[k]) tooDear.push(b.key + ' wants ' + v + ' ' + k + ' and the village can hold ' + ceiling[k]);
    }
    for (const t of tooDear)
      fails.push('nothing can ever be saved up for it: ' + t);

    V.step(0.001);
    return { fromCorner, fromNothing: { afford: tAfford, standing: tStanding, food: tFood },
      ceiling, fails };
  };

  window.rateSweep = function () {
    const V = window.__v, fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 5;
    for (const kAll of V.RES) V.grant(kAll, 9e6, 0, 0); V.step(0.001);
    {
      const L = V.landBounds();
      /* Paid for one at a time. The grant above is clamped to the ceiling, so
         the purse ran dry part-way down the list: the second lumber camp was
         never built in this sweep's whole life, and the quarry added below
         would not have been either. */
      const seat = k => { for (const kAll of V.RES) V.grant(kAll, 9e6, 0, 0);
        for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        fails.push('the rate check could not build its ' + k); return null; };
      /* With a quarry, so every chip has something to be measured against --
         the stone chip had never been held to anything here. */
      for (const k of ['house', 'house', 'house', 'house', 'store', 'farm', 'farm', 'lumber', 'lumber', 'quarry']) seat(k);
      for (const p of V.placed) if (p.key !== 'hall') { p.lvl = 3; p.t = 1; }
      for (let i = 0; i < 200 * 30; i++) V.step(1 / 30);
    }
    parkGoals();
    V.orders = []; V.orderT = 0;

    /* And the readout is let settle before the window opens. The easing is a
       twelve second time constant, and this sweep inherits whatever the one
       before it left on the chip -- run after a sweep that ended with full
       barns it starts from nothing and spends the first half minute climbing,
       which pulled the ninety second average down to 0.84 of the truth and
       made the check depend on what ran before it. A minute of the same
       conditions the window itself uses, first. */
    for (let i = 0; i < 60 * 30; i++) {
      V.step(1 / 30); V.orders = []; V.goalDone = null;
      for (const k of V.RES) V.res[k] = Math.min(V.res[k], V.caps[k] / 2);
    }

    /* Ninety seconds of ordinary work. The stores are put back to half every
       tick so nothing is ever refused -- a refused load is not a delivery and
       neither side would count it -- and the trade board is swept, so the only
       thing that can raise the counters is somebody carrying something in. */
    const WINDOW = 90;
    const got = Object.fromEntries(V.RES.map(k => [k, 0])), sum = Object.fromEntries(V.RES.map(k => [k, 0]));
    let ticks = 0;
    for (let i = 0; i < WINDOW * 30; i++) {
      const was = Object.fromEntries(V.RES.map(k => [k, V.res[k]]));
      V.step(1 / 30);
      V.orders = []; V.goalDone = null;
      for (const k of V.RES) {
        if (V.res[k] > was[k]) got[k] += V.res[k] - was[k];
        V.res[k] = Math.min(V.res[k], V.caps[k] / 2);
        sum[k] += V.rateNow[k];
      }
      ticks++;
    }
    const arriving = {};
    /* A quarter either way. The honest game measures between 0.96 and 1.07, so
       this is a four-fold margin on a number that is deliberately smoothed --
       wide enough that a retune of the window or the easing has somewhere to
       go, and narrow enough that counting a delivery twice cannot hide. */
    const SLACK = 0.25;
    for (const k of V.RES) {
      const real = got[k] / WINDOW, shown = sum[k] / ticks;
      arriving[k] = { real: +real.toFixed(3), shown: +shown.toFixed(3),
        ratio: real > 0 ? +(shown / real).toFixed(3) : null };
      if (real < 0.2) { fails.push('only ' + real.toFixed(2) + ' ' + k + ' a second arrived, so the chip proves nothing'); continue; }
      if (Math.abs(shown / real - 1) > SLACK)
        fails.push('the ' + k + ' chip reads ' + shown.toFixed(2) + ' a second while '
          + real.toFixed(2) + ' is actually arriving');
    }

    /* And it comes back down. Fill the barns and nobody delivers anything; the
       chip must say so rather than holding the best figure it ever saw.
       Measured: 1.44 falls to 0.005 within a minute and to nothing by ninety
       seconds. */
    for (const k of V.RES) V.res[k] = V.caps[k];
    for (let i = 0; i < 90 * 30; i++) {
      V.step(1 / 30);
      for (const k of V.RES) V.res[k] = V.caps[k]; V.orders = [];
    }
    const quiet = Object.fromEntries(V.RES.map(k => [k, +V.rateNow[k].toFixed(4)]));
    for (const k of V.RES)
      if (quiet[k] > 0.05)
        fails.push('the ' + k + ' chip still reads ' + quiet[k]
          + ' a second after a minute and a half of nothing arriving');

    for (const k of V.RES) V.res[k] = V.caps[k] / 2; V.step(0.001);
    return { arriving, quiet, slack: SLACK, fails };
  };

  window.hueSweep = function () {
    const V = window.__v, fails = [];
    const ctx = document.querySelector('canvas').getContext('2d');
    /* The strings drawn inside one control, in the HUD's own space.

       The world is drawn through camApply, which translates and scales; the
       HUD is drawn at scale 1, and on a screen taller than the logical 1536
       it is translated down by the letterbox offset. So a draw call carries
       that offset in the transform and the rect from barRects does not, and
       adding m.f to one side of the comparison and not the other put them
       OY apart -- 342 pixels on a 360x780 phone, where the tray is drawn at
       canvas row 2111 and its rect says 1769.

       Nothing ever matched, so every pair came back empty and the sweep
       reported that it proves nothing -- which was true, and had been true at
       every shape except the one where the offset happens to be zero. That is
       a desktop window, and a desktop window is what this battery had always
       been run in. The game ships to a tall phone and nothing else.

       Both sides belong in the same space, and the untranslated one is the
       space the rect is already in: the translate is common to every HUD draw,
       so dropping it from the point is the same comparison without the bias. */
    const inside = rect => {
      const o = ctx.fillText.bind(ctx), rows = [];
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform();
        const isHud = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.e) < 1e-6;
        if (isHud && Math.abs(y - rect.y) < rect.h / 2 + 6
          && Math.abs(x - rect.x) < rect.w / 2 + 6) rows.push(String(t));
        return o(t, x, y, ...rest);
      };
      try { V.draw(); } finally { ctx.fillText = o; }
      return rows;
    };

    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 3;
    for (const kAll of V.RES) V.grant(kAll, 9e6, 0, 0); V.step(0.001);
    for (let i = 0; i < 30 * 30; i++) V.step(1 / 30);

    const pairs = [];
    const say = (what, rect, setA, setB) => {
      setA(); V.step(0.001); const a = inside(rect());
      setB(); V.step(0.001); const b = inside(rect());
      const same = a.length === b.length && a.every((x, i) => x === b[i]);
      pairs.push(what + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
      if (!a.length || !b.length)
        fails.push('nothing was written on ' + what + ' in one of its two states, so the check proves nothing');
      else if (same)
        fails.push(what + ' says exactly the same thing in both states, so only the colour tells them apart');
    };

    V.barMode = 'build'; V.panel = null; V.sel = null; V.step(0.001);
    say('a build card you can and cannot afford', () => V.barRects()[0],
      () => { for (const k of V.RES) V.res[k] = 9e6; },
      () => { for (const k of V.RES) V.res[k] = 0; });

    for (const k of V.RES) V.res[k] = 9e6; V.step(0.001);
    {
      /* A kind at its allowance. The hall's limit is what makes this state
         reachable, so the houses are built out until it refuses another. */
      const L = V.landBounds();
      const openCard = () => V.barRects()[0];
      const free = inside(openCard());
      for (let c = L.lo; c <= L.hi && !V.atLimit('house'); c++)
        for (let r = L.lo; r <= L.hi && !V.atLimit('house'); r++)
          if (V.canPlace('house', c, r, V.occupied())) V.place('house', c, r);
      V.step(0.001);
      const full = inside(openCard());
      pairs.push('a build card free and at its limit: ' + JSON.stringify(free) + ' vs ' + JSON.stringify(full));
      if (!V.atLimit('house'))
        fails.push('the houses never reached their allowance, so the at-limit card was never drawn');
      else if (free.length === full.length && free.every((x, i) => x === full[i]))
        fails.push('a build card at its limit says exactly the same thing as a free one, '
          + 'so only the colour tells them apart');
    }

    V.barMode = 'orders'; V.orders = [V.makeOrder(1)]; V.orderT = 0; V.step(0.001);
    if (V.orderRects()[0])
      say('a trade you can and cannot fill', () => V.orderRects()[0],
        () => { for (const k of V.RES) V.res[k] = 9e6; },
        () => { for (const k of V.RES) V.res[k] = 1; });
    else fails.push('no trade was on the board, so that pair went unasked');

    V.barMode = 'build'; V.panel = V.placed[0].id; V.step(0.001);
    say('an upgrade you can and cannot reach', () => V.panelRects().up,
      () => { for (const k of V.RES) V.res[k] = 9e6; },
      () => { for (const k of V.RES) V.res[k] = 0; });
    V.panel = null; for (const k of V.RES) V.res[k] = 9e6; V.step(0.001);

    /* And the one the source wrote the rule for. The refused outline is dashed
       and the allowed one is not, so this is asked of the dash pattern rather
       than of any words -- there are none. */
    {
      const dashes = ghost => {
        const o = ctx.setLineDash.bind(ctx), seen = new Set();
        ctx.setLineDash = function (a) { seen.add(JSON.stringify(a)); return o(a); };
        try { V.sel = 'house'; V.ghost = ghost; V.step(0.001); V.draw(); }
        finally { ctx.setLineDash = o; V.sel = null; V.ghost = null; }
        return seen;
      };
      const ok = dashes({ c: 5, r: 5, fits: true, ok: true, why: null });
      const no = dashes({ c: 0, r: 0, fits: false, ok: false, why: 'taken' });
      const extra = [...no].filter(d => !ok.has(d));
      pairs.push('a spot allowed and refused: ' + [...ok].join(' ') + ' vs ' + [...no].join(' '));
      if (!extra.length)
        fails.push('a refused spot is drawn with the same lines as an allowed one, '
          + 'so only the colour tells them apart');
    }

    V.step(0.001);
    return { pairs, fails };
  };

  window.notchSweep = function () {
    const V = window.__v, fails = [];
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const el = document.getElementById('safe');
    if (!el) return { fails: ['the page has no #safe element, so the insets cannot be read at all'] };
    const keepPad = { t: el.style.paddingTop, b: el.style.paddingBottom };
    const keepScreen = [window.innerWidth, window.innerHeight];
    const keepSafe = { ...V.SAFE };

    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2;
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 4; V.step(1 / 30);
    for (const [k, c, r] of [['store', 4, 4], ['farm', 7, 4], ['house', 4, 7]]) {
      for (const kAll of V.RES) V.grant(kAll, 9999, 0, 0);
      if (V.place(k, c, r)) V.placed[V.placed.length - 1].t = 1;
    }
    for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    V.panel = V.placed[1].id; V.barMode = 'build';

    const out = { read: null, shapes: 0 };
    try {
      el.style.paddingTop = '47px'; el.style.paddingBottom = '34px';

      /* Read at all, and read again when the first attempt had nothing to
         measure. The canvas is hidden for the length of one resize, which is
         the start-up this guards: the insets cannot be read, and the only
         other things that ever ask are resize and orientationchange, which a
         phone held still in portrait never fires. Ordinary frames have to pick
         it up. */
      V.SAFE = { top: 0, bottom: 0 }; V.safeKnown = false;
      const keepDisplay = cv.style.display;
      cv.style.display = 'none';
      window.dispatchEvent(new Event('resize'));
      const blind = { ...V.SAFE };
      cv.style.display = keepDisplay;
      for (let i = 0; i < 10; i++) V.draw();
      const recovered = { ...V.SAFE };
      out.read = { blind, recovered };
      if (blind.top > 0.01)
        fails.push('the inset was read off a canvas with no box, so the figure means nothing');
      if (!(recovered.top > 0.01 && recovered.bottom > 0.01))
        fails.push('the insets were never read: the first attempt had nothing to measure and nothing asked again, '
          + 'so the chips sit under the camera for the whole session');

      /* And the HUD keeps out of them. Every pill the HUD draws, at both ends
         of the screen shapes the tap checks use. */
      for (const [sw, sh] of [[360, 640], [375, 667], [390, 844], [344, 882], [400, 1200]]) {
        asScreen(sw, sh); V.draw();                  // the resize reads the insets again
        out.shapes++;
        if (!(V.SAFE.top > 0.01))
          { fails.push('the insets went back to nothing on a ' + sw + 'x' + sh + ' screen'); continue; }
        /* In the canvas's own pixels, which is what the capture below reads:
           the notch covers the first SAFE.top of them and the gesture bar the
           last SAFE.bottom. hudTop and hudBot say the same thing in the space
           the HUD is drawn in, which is offset by the letterboxing -- comparing
           one against the other is how this check first reported the whole
           tray as buried. */
        const top = V.SAFE.top, bot = cv.height - V.SAFE.bottom;
        const pills = [];
        const oR = ctx.roundRect.bind(ctx);
        ctx.roundRect = function (x, y, w, h, ...rest) {
          const m = ctx.getTransform();
          if (Math.abs(m.a - 1) < 1e-6 && Math.abs(m.b) < 1e-6) pills.push({ y: m.f + y, h });
          return oR(x, y, w, h, ...rest);
        };
        try { V.draw(); } finally { ctx.roundRect = oR; }
        const stuck = pills.filter(p => p.y < top - 1 || p.y + p.h > bot + 1);
        if (stuck.length)
          fails.push(stuck.length + ' of the HUD sits under the notch or the gesture bar on a '
            + sw + 'x' + sh + ' screen');

        /* Nothing is crowded by the smaller band. The same controls tapSweep
           walks, asked again with the insets in. */
        const R = V.panelRects(), tabs = V.tabRects(), bars = V.barRects(), M = V.muteRect();
        const items = [
          { n: 'close', x: R.close.x, y: R.close.y, w: R.close.r * 2, h: R.close.r * 2 },
          { n: 'move', x: R.move.x, y: R.move.y, w: R.move.w, h: R.move.h },
          { n: 'sell', x: R.sell.x, y: R.sell.y, w: R.sell.w, h: R.sell.h },
          { n: 'up', x: R.up.x, y: R.up.y, w: R.up.w, h: R.up.h },
          { n: 'mute', x: M.x, y: M.y, w: M.r * 2, h: M.r * 2 },
          ...tabs.map((t, i) => ({ n: 'tab' + i, x: t.x, y: t.y, w: t.w, h: t.h })),
          ...bars.map((b, i) => ({ n: 'tray' + i, x: b.x, y: b.y, w: b.w, h: b.h })),
        ];
        for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2)
            fails.push(a.n + ' and ' + b.n + ' land on top of each other with the notch in, on a '
              + sw + 'x' + sh + ' screen');
        }
      }
    } finally {
      el.style.paddingTop = keepPad.t; el.style.paddingBottom = keepPad.b;
      asScreen(keepScreen[0], keepScreen[1]);
      V.SAFE = keepSafe; V.step(0.001);
    }
    return { ...out, fails };
  };

  window.stillSweep = async function () {
    const V = window.__v, fails = [];
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const lum = (r, g, b) => { const f2 = v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f2(r) + 0.7152 * f2(g) + 0.0722 * f2(b); };
    const grab = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const o = new Float64Array(d.length / 4);
      for (let i = 0, j = 0; i < d.length; i += 4) o[j++] = lum(d[i], d[i + 1], d[i + 2]);
      return o; };

    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 3;
    for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0); V.step(0.001);
    {
      const L = V.landBounds();
      const seat = k => { for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return null; };
      /* A house and a farm for their chimneys -- the lumber camp is the one
         building the smoke is withheld from -- and a lamp for its pulse. */
      /* Four houses rather than two. The stride check below can only see a
         villager who is WALKING, and a village of four people has one or two
         on their feet at a time -- which puts the count it reports one step
         from the nought that fails it. */
      for (const k of ['house', 'house', 'house', 'house', 'farm', 'lumber', 'store', 'lamp']) seat(k);
      for (let i = 0; i < 150 * 30; i++) V.step(1 / 30);
    }
    parkGoals();
    V.goalIdx = 0; V.finished = null; V.goalDone = null; V.tutSeen.length = 0;
    V.camFit(true); V.step(0.001);

    /* Each image is told it has not finished loading, which is what the game
       asks before it uses one. Restored in the finally below. */
    const faked = [];
    const art = on => {
      for (const k of Object.keys(V.ART)) {
        const im = V.ART[k];
        if (!im || typeof im !== 'object') continue;
        try {
          if (on) {
            Object.defineProperty(im, 'complete', { configurable: true, get: () => false });
            Object.defineProperty(im, 'naturalWidth', { configurable: true, get: () => 0 });
            faked.push(im);
          } else { delete im.complete; delete im.naturalWidth; }
        } catch (e) { /* an image that will not be faked simply keeps its art */ }
      }
    };
    const realNow = Date.now, keepRM = V.reduceMotion;
    let out = {};
    try {
      art(true); V.step(0.001);
      /* Exactly one day apart, so the sky is the same and the only thing that
         can have changed is an animation. */
      const t0 = 1.7e12;
      const overADay = rm => {
        V.reduceMotion = rm;
        Date.now = () => t0; V.draw(); const a = grab();
        Date.now = () => t0 + V.DAY_MS; V.draw(); const b = grab();
        let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.004) n++;
        return n;
      };
      const moved = overADay(false), still = overADay(true);
      if (moved < 200)
        fails.push('only ' + moved + ' pixels moved with motion on, so the stillness check proves nothing');
      if (still > 0)
        fails.push(still + ' pixels still moved with reduce motion on, where the village itself did nothing');

      /* Reduce motion moves things, it does not remove them. Against the
         best-matching instant of the real animation the two pictures should
         disagree in both directions about equally; a frame with its smoke or
         its lamplight deleted is darker than every instant of the animated
         one. Measured here at 0.74, so three is a four-fold margin. */
      V.reduceMotion = true; Date.now = () => t0; V.draw();
      const rFrame = grab();
      let lean = Infinity, bright = 0, dim = 0;
      for (const dt of [0, 150, 300, 450, 600, 750]) {
        V.reduceMotion = false; Date.now = () => t0 + dt; V.draw();
        const m = grab();
        let hi = 0, lo = 0;
        for (let i = 0; i < m.length; i++) { const d = m[i] - rFrame[i];
          if (d > 0.004) hi++; else if (d < -0.004) lo++; }
        const ratio = hi / Math.max(1, lo);
        if (Math.abs(Math.log(Math.max(ratio, 1e-6))) < Math.abs(Math.log(Math.max(lean, 1e-6)))) {
          lean = ratio; bright = hi; dim = lo;
        }
      }
      if (lean > 3)
        fails.push('with reduce motion on the picture is missing something: ' + bright
          + ' pixels are lighter in the moving village against ' + dim + ' the other way');

      /* The paintings come back for what is left. A villager without his
         sprite is drawn as a circle on a box, and that placeholder does not
         bob or lean at all -- so a stride measured in the art-less village
         would measure nothing and say the mode was working. */
      art(false); V.step(0.001);

      /* The villagers' own motion, which is the one the clock does not
         drive: the bob and the lean come off a stride counter that only
         advances when the village steps.

         Read off the canvas rather than out of the pixels. A villager is
         twenty pixels tall on a fitted island and the rock is five per cent of
         that, so counting changed pixels gave sixty-seven at noon, two at
         midnight, and nothing at all whenever he happened to be small or
         behind something -- a measurement that reports the mode working every
         time it cannot see. What the game actually does is turn the canvas by
         the lean and lift the sprite by the bob, so those are what is watched:
         the angles it rotates by and the heights it draws at.

           rock.tilted   villagers leaning, with motion on
           rock.lifted   sprites drawn at a different height for the bob
      */
      let rock = { tilted: -1, lifted: -1 };
      {
        /* Somebody has to be on his feet for this to mean anything, and in a
           village whose barns are full everybody is resting, so the stores are
           held open until one of them walks.

           Who is walking is asked of the village rather than restated: a
           villager who MOVED over the last step is walking, whatever the rule
           in the drawing code says. Restating it here is how the old gate
           would have been copied into its own test -- and that gate was the
           thing that was wrong. */
        /* How many are STRIDING this frame -- not merely how many moved.

           A villager inside the arrival window is still drifting the last
           few pixels onto its target and the game rightly does not animate
           that as a walk, so counting movement found a walker who was not
           leaning about one run in six. The condition is written out here
           rather than borrowed from the game, which is the whole point: a
           copy does not move when the original is mutated, and the rule is
           that these two agree. ARRIVE is six. */
        const STRIDE_FROM = 6;
        const striding = () => V.villagers.filter(v =>
          Math.hypot(v.tx - v.x, v.ty - v.y) > STRIDE_FROM
          && !(v.st === 'idle' && v.wait > 0));
        const walkersNow = () => {
          V.step(1 / 30);
          V.res.wood = Math.min(V.res.wood, 20);
          V.res.food = Math.min(V.res.food, 10);
          return striding().length;
        };
        const onFoot = () => walkersNow() > 0;
        /* The sprites have to have loaded, or the villagers are drawn as
           circles on boxes -- a placeholder neither bobs nor leans, so the
           check would pass on a village of them. Waited for before anybody is
           set walking, because the game's own loop keeps running across an
           await and a walker chosen first has arrived by the time it returns. */
        const sprites = [...new Set(V.villagers.map(v => V.artFor(V.villagerArt(v))))].filter(Boolean);
        const loaded = () => sprites.length > 0 && sprites.every(im => im.complete && im.naturalWidth);
        for (let i = 0; i < 40 && !loaded(); i++) await new Promise(r => setTimeout(r, 50));
        if (!loaded())
          fails.push('the villager art had not loaded in two seconds, so the stride check could not be made');
        let walking = false;
        for (let i = 0; i < 30 * 30 && !walking; i++) walking = onFoot();
        if (!walking) fails.push('nobody was walking, so the stride check could not be made');
        else {
          const watch = rm => {
            V.reduceMotion = rm;
            const oR = ctx.rotate.bind(ctx), oD = ctx.drawImage.bind(ctx);
            const angles = [], highs = [], shown = [];
            ctx.rotate = function (a) { angles.push(a); return oR(a); };
            /* The picture as well as the height. A villager with a painted
               cycle does not lean and does not bob -- the drawing is doing
               both -- so the only mark he leaves on the canvas is WHICH of
               his six frames was asked for. */
            ctx.drawImage = function (im, ...rest) {
              if (rest.length >= 2) { highs.push(rest[1]); shown.push(im && im.src ? im.src.split('/').pop() : ''); }
              return oD(im, ...rest);
            };
            try { V.draw(); } finally { ctx.rotate = oR; ctx.drawImage = oD; }
            return { angles, highs, shown };
          };
          /* Over a whole stride, rather than at one instant.

             The lean is a sine of the walk phase, so it passes through zero
             twice a cycle, and the bob with it. This read a SINGLE frame:
             with one or two people on their feet -- which is what a village
             of this size has -- a frame can honestly catch all of them at the
             crossing, and the sweep would then report that the walk "never
             runs". Seen once in a battery and not reproducible by running the
             sweep again, which is the signature of a checker sampling
             something periodic at one point.

             A stride is about a second, so fifteen samples two frames apart
             take in every phase of it. The PAIR of draws in each sample still
             happen back to back with no tick between them, because the
             reduce-motion comparison only means anything on a village that
             has not moved between the two. */
          /* And only the frames where somebody really is on their feet.

             Sampling across a stride took the phase out of it; this takes
             out the other half, which is that the one person walking can
             ARRIVE part way through the sampling and stand still for the
             rest of it. A sample with nobody walking says nothing about the
             walk, so it is not counted -- and if too few of them have anyone
             walking at all, the sweep says that rather than reporting a
             village that never leans. */
          /* Everyone who is walking is leaning, counted against each other.

             "At least one villager leaned" was the rule, and it is far too
             weak: it passes a game where one of three walkers leans, and it
             sits one step from nought on a village with a single walker,
             which is what made this sweep fail a battery once and then
             refuse to fail again.

             The honest game leans exactly as many as are striding, and not
             approximately: measured over 399 consecutive frames, the count
             drawn leaning equalled the count striding every single time,
             with no frame short and none over. So the rule is equality, and
             a game that animates only some of its walkers fails it at the
             first frame. */
          /* There are now TWO ways for a villager to be walking, and the rule
             above knows about one of them.

             A villager with no painted cycle is faked: he leans and he bobs,
             and the equality held because the lean carries a constant term
             for which way he faces, so it never passes through zero while he
             is on his feet. A villager who HAS a cycle neither leans nor
             bobs -- the drawing does that -- and the equality cannot be
             patched to cover him, because once every six beats his cycle is
             legitimately on the very frame he would hold standing still, and
             at that instant there is nothing on the canvas to tell the two
             apart. That is a true property of a six-frame loop, not a fault,
             and a checker that calls it one is a checker that cries wolf.

             So the strong rule is kept exactly where it still holds -- on a
             village whose villagers are all faked -- and the painted ones are
             judged over a whole stride instead, where the question has a
             sharp answer: a running cycle shows all six of its drawings in a
             stride, and a frozen one shows a single drawing fifteen times.
             Sliding along the ground in a fixed pose is the failure worth
             catching here, and nothing else in the game would mention it. */
          const WALK_IN = '_walk';
          const frameOf = n => { const a = n.indexOf(WALK_IN); return a < 0 ? null : { who: n.slice(0, a), n: n.slice(a + WALK_IN.length).split('.')[0] }; };
          const seen = new Map();               // character -> set of frames it was drawn on
          const frozenUnder = new Set();        // characters still cycling with reduce motion on
          /* Whose cycle is entitled to be judged at all.

             A trade with nobody on his feet is drawn, correctly, on the one
             frame he stands on, for all fifteen samples -- which looks from
             the canvas exactly like a cycle that has seized. Seen for real:
             a run where no basket villager happened to be walking reported
             her stuck on one of six, and she was doing nothing wrong. So the
             village is asked who is striding rather than the canvas, by the
             same test the counting above uses, and a trade sitting the
             sample out is not marked down for it.

             Counted, not just noted. Being afoot is not all-or-nothing over
             three seconds: a villager can set off on the twelfth sample, and
             in the three that are left no cycle on earth gets round six
             frames. Seen for real too, in the run after the one above. So
             what is demanded of a trade is in proportion to how long it was
             actually walking. */

          let worstShort = 0, bestTilt = 0, bestLift = 0, stillTilted = 0, mismatched = 0, samples = 0;
          let painted = 0;
          const afoot = new Map();
          for (let shot = 0; shot < 90 && samples < 15; shot++) {
            const walkers = walkersNow();         // this steps a frame itself
            if (!walkers) continue;
            for (const v of striding()) { const w = V.villagerArt(v); afoot.set(w, (afoot.get(w) || 0) + 1); }
            const m = watch(false), r = watch(true);
            samples++;
            const tilted = m.angles.filter(a => Math.abs(a) > 1e-9).length;
            worstShort = Math.max(worstShort, walkers - tilted);
            bestTilt = Math.max(bestTilt, tilted);
            bestLift = Math.max(bestLift, m.highs.filter((h, i) =>
              r.highs[i] !== undefined && Math.abs(h - r.highs[i]) > 1e-9).length);
            stillTilted += r.angles.filter(a => Math.abs(a) > 1e-9).length;
            if (m.highs.length !== r.highs.length) mismatched++;

            for (const n of m.shown) {
              const fr = frameOf(n);
              if (!fr) continue;
              painted++;
              if (!seen.has(fr.who)) seen.set(fr.who, new Set());
              seen.get(fr.who).add(fr.n);
            }
            /* With reduce motion on, a painted villager has to be parked on
               the one frame he stands on. Anything else and the cycle is
               still running for somebody who asked it not to. */
            const parked = new Map();
            for (const n of r.shown) {
              const fr = frameOf(n);
              if (!fr) continue;
              if (!parked.has(fr.who)) parked.set(fr.who, new Set());
              parked.get(fr.who).add(fr.n);
            }
            for (const [who, set] of parked) if (set.size > 1) frozenUnder.add(who);
            V.step(1 / 30);
          }
          rock = { tilted: bestTilt, lifted: bestLift, samples, worstShort, painted,
            frames: [...seen].map(([who, set]) => who.replace('villager_', '') + ':' + set.size
              + '/6 in ' + (afoot.get(who) || 0) + ' samples afoot').sort() };
          if (samples < 5)
            fails.push('only ' + samples + ' frames in three seconds had anybody walking at all,'
              + ' so the stride could not be judged');
          else if (!painted) {
            /* Nobody is painted, so every walker is faked and the old rule
               applies in full. */
            if (worstShort > 0)
              fails.push(worstShort + ' of the villagers on their feet were not leaning on their stride,'
                + ' so the walk the source describes does not run for all of them');
            else if (!rock.lifted)
              fails.push('every walker leaned and not one of them was lifted, so the bob never runs');
          } else {
            /* Somebody is painted. Each character that was drawn from a cycle
               has to have got round most of it.

               Five of six rather than six, and less than that from a trade
               that spent less of the sampling walking. A stride is about
               fifteen of these samples and has six beats in it, so a frame
               every third sample is the slowest a turning cycle can go; five
               is the ceiling because the sampling is of the clock and the
               cycle is of the ground, and a villager who stops at a door can
               honestly miss the last beat.

               A seized cycle shows one frame however long it is watched, so
               it fails this at any length of sample worth judging. */
            for (const [who, set] of seen) {
              const shots = afoot.get(who) || 0;
              const want = Math.min(5, Math.floor(shots / 3));
              if (want > 1 && set.size < want)
                fails.push(who + ' was drawn on ' + set.size + ' of its 6 frames while walking through '
                  + shots + ' samples, so its walk cycle is not turning and it slides along in a fixed pose');
            }
          }
          for (const who of frozenUnder)
            fails.push(who + ' kept changing frame with reduce motion on, so its walk cycle'
              + ' does not stop when it is asked to');
          if (stillTilted)
            fails.push(stillTilted + ' villagers were still leaning on their stride with reduce motion on');
          if (mismatched)
            fails.push('reduce motion changed how many sprites are drawn in ' + mismatched
              + ' of ' + samples + ' frames, which is not what it is for');
        }
      }

      /* The deliveries. */
      V.reduceMotion = true;
      let popSeen = 0;
      {
        const o = ctx.fillText.bind(ctx);
        ctx.fillText = function (t, ...rest) { if (/^\+/.test(String(t).trim())) popSeen++; return o(t, ...rest); };
        try {
          V.pops.length = 0;
          for (let i = 0; i < 30 * 30 && !V.pops.length; i++) {
            V.step(1 / 30);
            V.res.wood = Math.min(V.res.wood, 20);
            V.res.food = Math.min(V.res.food, 10);
          }
          V.draw();
        } finally { ctx.fillText = o; }
      }
      if (!popSeen)
        fails.push('no delivery was drawn with reduce motion on, and the source keeps them on purpose');

      /* And the camera arrives rather than travels. */
      const landed = rm => {
        V.reduceMotion = rm;
        V.CAM.x = 0; V.CAM.y = 0; V.CAM.z = 2; V.step(0.001);
        V.camFit(false);
        const asked = { x: V.CAM.x, y: V.CAM.y, z: V.CAM.z };
        V.camFit(true);
        return Math.hypot(asked.x - V.CAM.x, asked.y - V.CAM.y) + Math.abs(asked.z - V.CAM.z) * 100;
      };
      const glides = landed(false), jumps = landed(true);
      if (jumps > 1)
        fails.push('with reduce motion on the camera was still ' + Math.round(jumps)
          + ' from where it was asked to be, so it is gliding');
      if (glides < 10)
        fails.push('the camera did not glide with motion on, so the landing check proves nothing');

      out = { moved, still, lean: +lean.toFixed(2), rock, pop: popSeen,
        camera: { glides: Math.round(glides), jumps: Math.round(jumps) } };
    } finally {
      Date.now = realNow; V.reduceMotion = keepRM; art(false); V.step(0.001);
    }
    return { ...out, fails };
  };

  window.inkSweep = function () {
    const V = window.__v, fails = [];
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const lum = (r, g, b) => { const f2 = v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f2(r) + 0.7152 * f2(g) + 0.0722 * f2(b); };
    /* Emoji ignore the fill colour and paint in their own, so the ink this
       finds for one is whatever the font felt like. The same rule the HUD
       checker uses: above the basic plane, or in the Miscellaneous Symbols
       block, is emoji. A string with one real letter in it is measured on
       that letter's account. */
    const isEmojiChar = ch => { const c = ch.codePointAt(0);
      return c > 0xFFFF || (c >= 0x2600 && c <= 0x27BF) || (c >= 0xFE00 && c <= 0xFE0F); };
    const hasText = str => [...str].some(ch => ch.trim() && !isEmojiChar(ch));

    /* Built here rather than borrowed, because the thing this measures is
       every layer of the frame and a scene left over from another sweep
       brings its layers with it. goalIdx as well as finished: the completion
       card raises itself again from the state otherwise. */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.goalIdx = 0; V.tutSeen.length = 0; V.finished = null; V.goalDone = null;
    V.away = null; V.panel = null; V.sel = null; V.moving = null; V.claimAsk = false;
    V.ensureHall(); V.placed[0].lvl = 3;
    for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0); V.step(0.001);
    {
      const L = V.landBounds();
      const seat = (k, far) => { const cs = [];
        for (let c = L.lo; c <= L.hi; c++) cs.push(c);
        if (far) cs.reverse();
        for (const c of cs) for (const r of cs)
          if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
        return null; };
      /* Two houses, not three: four pairs of hands against five posts, so one
         of them stands empty and wears the amber alarm. With three houses the
         village staffed everything and that badge -- the one a player most
         needs to read -- went unmeasured. */
      seat('house'); seat('house');
      seat('farm', true);
      const corner = V.placed[V.placed.length - 1];
      if (corner && corner.key === 'farm') { corner.lvl = 5; corner.t = 1; }   // far enough to lose half the walk
      /* And as many posts as the build limits at this hall allow. Some of
         these are refused -- the mill and a lumber are already at their cap
         -- which is fine: what matters is that the village ends up with more
         work than workers. */
      for (const k of ['lumber', 'lumber', 'farm', 'mill', 'farm']) seat(k);
      for (let i = 0; i < 240 * 30; i++) V.step(1 / 30);
    }
    parkGoals();
    V.goalIdx = 0; V.finished = null; V.goalDone = null; V.tutSeen.length = 0;
    V.camFit(true); V.step(0.001);

    const realNow = Date.now;
    const grab = () => ctx.getImageData(0, 0, cv.width, cv.height).data;
    /* Two draws with nothing between them: a step moves the villagers and the
       largest difference between the frames is then somebody's hat. The
       string is counted as it goes past, because a pop lives about a second
       and asking after one that has already gone measures the difference
       between two frames that are the same -- which comes out near 1 and
       reads as a catastrophe rather than as nothing. */
    const ink = target => {
      const o = ctx.fillText.bind(ctx);
      let drawn = 0;
      ctx.fillText = function (t, x, y, ...rest) {
        if (String(t).trim() === target) return;
        return o(t, x, y, ...rest);
      };
      let without;
      try { V.draw(); without = grab(); } finally { ctx.fillText = o; }
      ctx.fillText = function (t, x, y, ...rest) {
        if (String(t).trim() === target) drawn++;
        return o(t, x, y, ...rest);
      };
      let withIt;
      try { V.draw(); withIt = grab(); } finally { ctx.fillText = o; }
      if (!drawn) return null;
      let best = -1, bi = -1;
      for (let i = 0; i < without.length; i += 4) {
        const d = Math.abs(lum(withIt[i], withIt[i + 1], withIt[i + 2])
          - lum(without[i], without[i + 1], without[i + 2]));
        if (d > best) { best = d; bi = i; }
      }
      if (best < 0.02) return null;            // drawn, but nothing of it landed on screen
      const l1 = lum(withIt[bi], withIt[bi + 1], withIt[bi + 2]);
      const l2 = lum(without[bi], without[bi + 1], without[bi + 2]);
      return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2);
    };
    /* What is on screen right now, asked rather than assumed: the "-N%" badge
       prints whatever the walk happens to cost and hard-coding "-51%" meant
       the one badge with the smallest text quietly went unmeasured. */
    const strings = () => {
      const o = ctx.fillText.bind(ctx), seen = new Set();
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform(), q = String(t).trim();
        if ((Math.abs(m.a - 1) > 1e-6 || Math.abs(m.e) > 1e-6) && q && hasText(q)) seen.add(q);
        return o(t, x, y, ...rest);
      };
      try { V.draw(); } finally { ctx.fillText = o; }
      return [...seen];
    };

    /* The bar the rest of the file holds world text to, and the same 4.5 both
       platforms ask of ordinary text. The badges come out at 9.5 to 11.5 CSS
       pixels on a phone, which is ordinary. */
    const BAR = 4.5;
    const rows = [], seenAt = {};
    try {
      for (const [when, phase] of [['by day', 0.25], ['at midnight', 0.75]]) {
        Date.now = () => phase * V.DAY_MS;
        /* Empty stores and full ones, because they wear different badges: a
           full barn sends a post to rest and stops the deliveries, an empty
           one leaves posts wanting people and keeps the pops coming. */
        for (const full of [false, true]) {
          V.res.wood = full ? V.caps.wood : 20;
          V.res.food = full ? V.caps.food : 10;
          if (!full) {
            /* A FRESH delivery. The list is cleared first and then waited on,
               because a pop fades out over its last half second and one left
               lying about from building the scene measured 2.15 -- which is
               the honest contrast of a nearly invisible thing and tells you
               nothing about the one a player actually sees. */
            V.pops.length = 0;
            for (let i = 0; i < 30 * 30 && !V.pops.length; i++) {
              V.step(1 / 30);
              V.res.wood = Math.min(V.res.wood, 20);
              V.res.food = Math.min(V.res.food, 10);
            }
          }
          V.step(0.001);
          for (const str of strings()) {
            const got = ink(str);
            if (got === null) continue;
            /* The worst of the states this string was seen in, and the
               complaint is made once at the end from that -- two store states
               were otherwise reporting the same shortfall twice. */
            const row = seenAt[str] = seenAt[str] || {};
            if (row[when] === undefined || got < row[when]) row[when] = got;
          }
        }
      }
    } finally { Date.now = realNow; }
    for (const k of Object.keys(seenAt)) for (const when of Object.keys(seenAt[k]))
      if (seenAt[k][when] < BAR)
        fails.push('"' + k + '" measures ' + seenAt[k][when] + ' against what is behind it ' + when
          + ', under the ' + BAR + ' this game holds text to');
    for (const k of Object.keys(seenAt))
      rows.push('"' + k + '" ' + Object.entries(seenAt[k]).map(e => e[1] + ' ' + e[0]).join(', '));
    const night = Object.keys(seenAt).filter(k => seenAt[k]['at midnight'] !== undefined).length;
    if (night < 3)
      fails.push('only ' + night + ' pieces of world writing were measured after dark, so the block proved little');
    V.step(0.001);
    return { rows, bar: BAR, fails };
  };

  window.lightSweep = function () {
    const V = window.__v, fails = [];
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const lum = (r, g, b) => { const f2 = v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f2(r) + 0.7152 * f2(g) + 0.0722 * f2(b); };

    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.tutSeen.length = 0; V.away = null; V.goalDone = null; V.finished = null;
    V.panel = null; V.sel = null; V.moving = null; V.reduceMotion = false;
    V.ensureHall(); V.placed[0].lvl = 3;
    for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0); V.step(0.001);
    const L = V.landBounds();
    const put = k => { for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
      if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r); return null; };
    for (const k of ['house', 'house', 'farm', 'lumber', 'store', 'lamp']) put(k);
    for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
    parkGoals();
    V.camFit(true); V.step(0.001);
    const lamp = V.placed.find(p => p.key === 'lamp');
    if (!lamp) fails.push('no lamp could be placed, so nothing measured whether it lights up');

    /* Rows across the world band rather than the whole of it: a frame is a
       megapixel and this sweep draws some seventy of them. The band is where
       the wash goes -- the HUD above and below it is never washed. */
    /* screenTop and screenBot are -OY and H + OY: the whole visible area, said
       in the space the game draws in. getImageData wants canvas rows, which
       are that plus OY -- so the band is 0 to cv.height, and handing the raw
       pair over instead measured 0 to H + OY. On a desktop window OY is 0 and
       the two agree; on a 360x780 phone OY is 342 and the bottom 341 rows of
       a 2219-row canvas went unread, which is 15% of the screen and the 15%
       nearest the player.

       It changed the figures without changing the verdict: measured both ways
       on the same village, the light retained 0.415 of the picture against
       0.453, and swung 0.01299 against 0.01371. Nothing here is close enough
       to its floor for 9% to flip it today. The guard below is what stops that
       being luck -- a band that does not cover the canvas is reported rather
       than quietly measured. */
    const OY = Math.round((cv.height - 1536) / 2);
    const y0 = Math.max(0, Math.round(V.screenTop() + OY));
    const y1 = Math.min(cv.height, Math.round(V.screenBot() + OY));
    if (y1 - y0 < cv.height - 2) fails.push('the light is being read across ' + (y1 - y0)
      + ' rows of a ' + cv.height + '-row canvas, so part of the screen is not being measured at all');
    const ys = []; for (let i = 1; i <= 9; i++) ys.push(Math.round(y0 + (y1 - y0) * i / 10));
    const read = () => {
      const all = []; let sum = 0;
      for (const y of ys) { const d = ctx.getImageData(0, y, cv.width, 1).data;
        for (let i = 0; i < d.length; i += 4 * 3) { const v = lum(d[i], d[i + 1], d[i + 2]); all.push(v); sum += v; } }
      all.sort((a, b) => a - b);
      const q = p => all[Math.min(all.length - 1, Math.floor(p * all.length))];
      return { mean: sum / all.length, spread: q(0.95) - q(0.05) };
    };
    const whole = () => {                      // the full band, for the lamp only
      const d = ctx.getImageData(0, y0, cv.width, y1 - y0).data;
      const out = new Float64Array(Math.ceil(d.length / 28));
      let j = 0; for (let i = 0; i < d.length; i += 28) out[j++] = lum(d[i], d[i + 1], d[i + 2]);
      return out;
    };
    const realNow = Date.now;
    const at = ms => { Date.now = () => ms; V.step(0.001); V.draw(); };
    let out = {};
    try {
      at(0.25 * V.DAY_MS); const noon = read();
      at(0.75 * V.DAY_MS); const mid = read();
      const swing = Math.abs(noon.mean - mid.mean);

      /* "Capped well short of black. This is a village you are meant to keep
         playing in." How much of the picture survives the darkest wash --
         measured as the spread of light across the world, which is what tells
         one thing from another. 0.42 of it survives at the written value and
         0.05 at 0.95, so a quarter sits between with better than a three-fold
         margin on the side that matters. */
      const retain = noon.spread > 1e-6 ? mid.spread / noon.spread : 0;
      if (retain < 0.25)
        fails.push('at the darkest hour only ' + (retain * 100).toFixed(0)
          + ' per cent of the picture is left, and this is a village you are meant to keep playing in');
      if (swing < 1e-4) fails.push('the light does not change between noon and midnight at all');

      /* A quarter of an hour of play, in real seconds, must show the whole of
         that swing. Eight minutes shows it nearly twice over; eight hours
         shows a sliver of it. */
      const t0 = 1.7e12, walk = [];
      for (let sec = 0; sec <= 900; sec += 30) { at(t0 + sec * 1000); walk.push({ sec, m: read().mean }); }
      const hi = walk.reduce((a, b) => b.m > a.m ? b : a), lo = walk.reduce((a, b) => b.m < a.m ? b : a);
      const walkFrac = swing > 1e-6 ? (hi.m - lo.m) / swing : 0;
      if (walkFrac < 0.6)
        fails.push('a quarter of an hour of play showed ' + (walkFrac * 100).toFixed(0)
          + ' per cent of the day, so the cycle is not something a player sees');

      /* And it does not strobe. Sampled a second at a time through the
         steepest half minute the walk found, because the light sits still for
         long stretches around noon and midnight and a flicker is not going to
         be there. */
      let bi = 1;
      for (let i = 1; i < walk.length; i++)
        if (Math.abs(walk[i].m - walk[i - 1].m) > Math.abs(walk[bi].m - walk[bi - 1].m)) bi = i;
      let jump = 0, prev = null;
      for (let sec = walk[bi - 1].sec; sec <= walk[bi].sec; sec++) {
        at(t0 + sec * 1000); const m = read().mean;
        if (prev !== null) jump = Math.max(jump, Math.abs(m - prev));
        prev = m;
      }
      const jumpFrac = swing > 1e-6 ? jump / swing : 0;
      if (jumpFrac > 0.25)
        fails.push('the light moved ' + (jumpFrac * 100).toFixed(0)
          + ' per cent of a whole day in one second, which is a flicker and not a sunset');

      /* The lamp. Drawn after the wash so its light sits on top of the night
         rather than under it, and gated on there being a night to sit on.
         Measured by taking the lamp away and putting it back, and counting how
         much of the frame got brighter for it.

         HOW MUCH of the frame, not how much brighter: the brightest pixel is
         the lamp's own post, which is there in daylight too, and it put the
         two readings only three times apart with a mutant squeezing that to
         two. The light spreads over a radius of ninety world pixels and the
         post is one tile, so counting lit pixels separates them by a hundred
         and eighty times instead -- 3652 against 20. */
      let glow = { dark: 0, bright: 0 };
      if (lamp) {
        const keep = V.placed.slice();
        const lit = sec => {
          at(t0 + sec * 1000); const on = whole();
          V.placed.length = 0; for (const p of keep) if (p !== lamp) V.placed.push(p);
          at(t0 + sec * 1000); const off = whole();
          V.placed.length = 0; for (const p of keep) V.placed.push(p);
          let n = 0; for (let i = 0; i < on.length; i++) if (on[i] - off[i] > 0.004) n++;
          return n;
        };
        glow = { dark: lit(lo.sec), bright: lit(hi.sec) };
        if (!(glow.dark >= 100 && glow.dark >= glow.bright * 10))
          fails.push('the lamp lit ' + glow.dark + ' of the picture at the darkest hour of the session against '
            + glow.bright + ' at the brightest, so it is an ornament rather than a lamp');
      }
      out = { retain: +retain.toFixed(3), walkFrac: +walkFrac.toFixed(3),
        jumpFrac: +jumpFrac.toFixed(4), swing: +swing.toFixed(5),
        glow,
        bars: { retain: 0.25, walkFrac: 0.6, jumpFrac: 0.25, glow: '10x and at least 100' } };
    } finally { Date.now = realNow; }
    V.step(0.001);
    return { ...out, fails };
  };
  window.traySweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [];
    V.placed.length = 0; V.villagers.length = 0; V.landTier = 2; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    for (const k of V.RES) V.res[k] = 5e4;
    const LB = V.landBounds();
    V.place('house', LB.lo + 1, LB.lo + 1); V.place('house', LB.lo + 1, LB.lo + 3);
    for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    V.barMode = 'build';
    const rowsFor = () => {
      const seen = [], orig = ctx.fillText;
      ctx.fillText = function (t, x, y) { seen.push({ t: String(t), x, y }); return orig.apply(this, arguments); };
      try { V.step(0.001); V.draw(); } finally { ctx.fillText = orig; }
      const cards = V.barRects(), u = V.US ? V.US() : 1;
      /* Inside the card, not merely below it. A row was claimed by any card
         whose x it fell within and whose centre it sat below -- true of one
         card while the tray was one row, and true of the card ABOVE as well
         the moment it was two. It read the well's price off the house's card
         and reported nine wrong numbers on a tray that was drawing all of
         them correctly. */
      return cards.map(c => ({ key: c.b.key, cost: c.b.cost,
        rows: seen.filter(s2 => Math.abs(s2.x - c.x) < c.w / 2
                    && s2.y > c.y && s2.y < c.y + c.h / 2 && /[🪵🌾]/.test(s2.t))
                  .map(s2 => s2.t) }));
    };
    let checked = 0;
    for (const [tag, res] of [['a full purse', 5e4], ['an empty one', 3]]) {
      for (const k of V.RES) V.res[k] = res;
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
  /* Every building can be opened, by a thumb.

     TOUCH_MIN exists because a control that is drawn small is a control nobody
     can press, and padHit pads every control in the HUD up to it. The buildings
     got neither the padding nor the check -- and they are the thing this game
     is mostly about pressing. A village is a stack of overlapping sprites, the
     tallest drawn last, so a building standing behind the hall has only the
     sliver of itself that the hall does not cover; and the panel is the only
     way to upgrade it, move it or sell it.

     Measured on a real 53-building village at 360x780, with the camera centred
     on each building and tried at every zoom the game allows: one farm could
     not be opened AT ALL, 24 of 39 never reached the 128-logical-pixel floor,
     and the worst that could be opened was a lumber camp at twelve logical
     pixels -- four CSS pixels of screen. Zooming in does not rescue it, because
     the neighbour grows with it.

     Asked by tapping, not by reading a helper: the promise is about what the
     game does when a finger lands, so the check lands fingers. Three taps on
     one spot, because a spot may have several buildings under it and the tap
     may have to work down the stack. */
  window.openSweep = function () {
    const V = window.__v, fails = [];
    const keepW = window.innerWidth, keepH = window.innerHeight;
    const STEP = 16, R = 192, N = Math.floor(2 * R / STEP) + 1;
    /* Half a thumb, and the half is measured rather than chosen. TOUCH_MIN is
       what padHit gives a control, and a control can be padded into the space
       around it; a building is a shape on the ground and cannot. The biggest
       square that fits inside a two-tile plot is 96 pixels at the highest zoom
       this game allows -- measured, on the widest building that still failed --
       so holding a building to 128 would be holding it to something the grid
       cannot give at any zoom. The full thumb stays where it can be kept, on
       the HUD. What matters here is the difference between 96 and the four CSS
       pixels this found. */
    const BAR = V.TOUCH_MIN / 2;
    const grid = new Int32Array(N * N), dp = new Int32Array(N * N);

    const scene = () => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
      V.moving = null; V.claimAsk = false; V.orders = []; V.who = null;
      V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      const L = V.landBounds();
      const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
        for (const kk of V.RES) V.res[kk] = 9e5;
        if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
      for (const [k, n] of Object.entries(V.HALL[V.HALL.length - 1].allow))
        while (V.countOf(k) < n) if (!seat(k)) break;
      for (const p of V.placed) { p.t = 1; p.build = 0; }
      V.rebuildStores(); V.rebuildCharm();
    };

    /* Does tapping here reach p, within a few taps on the same spot? */
    const opens = (x, y, p) => {
      if (x < 0 || x > 1024 || y < V.hudTop() || y > V.hudBot()) return false;
      V.panel = null; V.who = null;
      for (let i = 0; i < 3; i++) {
        V.tap(x, y);
        if (V.panel === p.id) return true;
        if (V.panel == null) return false;           // nothing under this finger at all
      }
      return false;
    };

    /* The biggest square of screen from which this building can be opened. */
    const square = p => {
      const c = V.centreOf(p), pr = V.camProject(c.x, c.y);
      const ox = Math.round(pr.x - R), oy = Math.round(pr.y - R);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
        grid[j * N + i] = opens(ox + i * STEP, oy + j * STEP, p) ? 1 : 0;
      let best = 0;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = j * N + i;
        if (!grid[k]) { dp[k] = 0; continue; }
        dp[k] = (i && j && grid[k - 1] && grid[k - N] && grid[k - N - 1])
          ? 1 + Math.min(dp[k - 1], dp[k - N], dp[k - N - 1]) : 1;
        if (dp[k] > best) best = dp[k];
      }
      return best * STEP;
    };

    const keepCam = { z: V.CAM.z, x: V.CAM.x, y: V.CAM.y };
    let worst = null, checked = 0, shut = 0, thin = 0;
    try {
      asScreen(360, 780);
      scene();
      for (const p of V.placed) {
        if (V.isDecor(p.key)) continue;
        /* Centred and zoomed in, which is the best a player can do for a
           building they are trying to reach. If it fails here it fails. */
        const c = V.centreOf(p);
        let got = 0;
        for (const z of [1.1, V.ZMAX]) {
          V.CAM.z = z; V.CAM.x = c.x; V.CAM.y = c.y;
          if (V.camClamp) V.camClamp();
          V.step(0.001);
          got = Math.max(got, square(p));
        }
        checked++;
        if (got === 0) { shut++; fails.push('a ' + p.key + ' cannot be opened at all -- no spot on the screen,'
          + ' centred on it and zoomed in, puts its panel up'); }
        else if (got < BAR) { thin++;
          if (!worst || got < worst.got) worst = { key: p.key, got }; }
      }
      if (thin) fails.push(thin + ' of ' + checked + ' buildings can only be opened through a patch smaller than'
        + ' ' + BAR + ' pixels -- the worst a ' + worst.key + ' at ' + worst.got);
    } finally {
      V.panel = null; V.who = null;
      V.CAM.z = keepCam.z; V.CAM.x = keepCam.x; V.CAM.y = keepCam.y;
      asScreen(keepW, keepH);
      V.step(0.001);
    }
    if (checked < 20) fails.push('only ' + checked + ' buildings were asked, so the sweep proved almost nothing');
    return { checked, unopenable: shut, belowThumb: thin, worst, fails };
  };
  /* What a trade is allowed to be made of.

     The whole value of the board is the sentence written above makeOrder: the
     village hands over a surplus it was throwing on the floor and takes back
     the thing it is short of. That sentence carries a silent assumption --
     that "short of" and "wanted" are the same thing -- and a third resource
     broke it. Stone is zero from the first second of a new village and there
     is no way to make any until a quarry, which the hall does not allow until
     level three. Zero of a cap of three hundred is the emptiest any kind can
     be, so stone was the answer to "what is this village shortest of" for the
     whole early game, so every offer paid in it.

     Measured on the build that shipped it: of 2883 offers drawn across the
     whole early-game spread of stores, 93.7% paid in stone, and 100% of them
     once the village held any wood AND any food -- the normal case. Goal 6,
     "Fill three trade orders", arrives four goals before the quarry and asks
     the player to take three: 132 wood for 125 stone, with a house at 30 wood
     and nothing in the game that stone can buy for another ten goals. The
     three stalls showed three sizes of the same forced trade, which is the
     exact degeneracy ORDER_TIERS was introduced to end.

     So an offer may only name a kind the village has some way of obtaining.
     Driven through step() and the trader timer rather than by calling
     makeOrder, so this holds the BOARD to the promise and not one function. */
  window.tradeSweep = function () {
    const V = window.__v, fails = [];
    /* A kind nothing the hall allows can make. Not "nothing costs it" -- a
       statue costs stone and is on the decorate tray from the first minute,
       which is why the board being allowed to pay in stone looked
       defensible for as long as it did.

       Fixed by the hall level alone, deliberately. The first version of this
       also asked whether the stores held any, and judged the offers it had
       collected AFTERWARDS -- against whatever the stores happened to end on
       rather than against the village that made them. On its own that read
       clean; inside the battery, where an earlier sweep leaves stone in the
       stores and the last round of this one empties it again, it reported
       half the board bad. A checker whose answer depends on what ran before
       it is not a checker. */
    const noMaker = k => !V.BUILDINGS.some(b => b.makes && b.makes[k] && V.unlocked(b.key));

    const scene = (hallLvl, extra) => {
      V.placed.length = 0; V.villagers.length = 0;
      V.landTier = V.LAND_MAX; V.coverPlaced();
      V.goalIdx = V.GOALS.length; V.away = null; V.goalDone = null; V.finished = null;
      V.panel = null; V.sel = null; V.barMode = 'build'; V.tutSeen.length = 0;
      V.orders = []; V.ordersDone = 0;
      V.ensureHall(); V.placed[0].lvl = hallLvl; V.placed[0].t = 1;
      const L = V.landBounds();
      const plan = [['house', 1, 1], ['farm', 1, 5], ['lumber', 4, 5], ['store', 10, 10]].concat(extra || []);
      for (const [k, dc, dr] of plan) V.place(k, L.lo + dc, L.lo + dr);
      for (const p of V.placed) p.t = 1;
      for (let i = 0; i < 60 * 30; i++) V.step(1 / 30);
    };

    /* Turn the board over and over, across the spread of stores a village
       actually passes through, and keep every offer the traders seat. */
    const board = (hallLvl, extra, rounds) => {
      scene(hallLvl, extra);
      const dead = V.RES.filter(noMaker), live = V.RES.filter(k => !noMaker(k));
      const seen = [];
      for (let r = 0; r < rounds; r++) {
        /* Nothing can make these, so the village has none -- every round, not
           just the round the sweep is looked at in. */
        for (const k of dead) V.res[k] = 0;
        /* And every kind that CAN be made takes its turn at being the one the
           village is shortest of, so no kind is the answer by arithmetic. */
        live.forEach((k, i) => {
          const g = ((r + i) % live.length) / Math.max(1, live.length - 1);
          V.res[k] = Math.round(V.caps[k] * (0.05 + 0.85 * g));
        });
        V.orders = [];
        let guard = 0;
        while (V.orders.length < V.orderSlots() && guard++ < 60) { V.orderT = 1e6; V.step(1 / 30); }
        for (const o of V.orders) seen.push({ o, bad: noMaker(o.giveK) || noMaker(o.getK) });
      }
      return seen;
    };

    /* A village the hall has not yet let near a quarry: goal 6 is here. */
    {
      const seen = board(2, null, 24);
      if (seen.length < 30) fails.push('only ' + seen.length + ' offers reached the board at hall 2, so the sweep proved almost nothing');
      const bad = seen.filter(x => x.bad);
      if (bad.length) {
        const pct = (100 * bad.length / seen.length).toFixed(1);
        const one = bad[0].o;
        fails.push(pct + '% of offers at hall 2 (' + bad.length + ' of ' + seen.length + ') name a kind the village'
          + ' has no way to get -- e.g. ' + one.giveN + ' ' + one.giveK + ' for ' + one.getN + ' ' + one.getK
          + ', and nothing the hall allows makes ' + (noMaker(one.getK) ? one.getK : one.giveK));
      }
      /* And the board is a choice, not one forced trade in three sizes. */
      const shapes = new Set(seen.map(x => x.o.giveK + '->' + x.o.getK));
      if (shapes.size < 2) fails.push('every offer at hall 2 was the same trade (' + [...shapes] + '), so the board is not a choice');
    }

    /* The opposite mistake: a fix that simply never trades the third kind.
       With a quarry standing, stone is an ordinary resource and the board
       must be willing to name it. */
    {
      const seen = board(3, [['quarry', 7, 1]], 24);
      if (seen.length < 30) fails.push('only ' + seen.length + ' offers reached the board at hall 3, so the sweep proved almost nothing');
      else if (!seen.some(x => x.o.getK === 'stone' || x.o.giveK === 'stone'))
        fails.push('not one offer named stone at a village with a quarry, so the third kind has been dropped from trade rather than gated');
    }

    /* And specifically with the pile still empty, which is the state a player
       is in the second their first quarry finishes -- and the state that
       tells "can get it" apart from "has some". A rule written as "only what
       the village is holding" passes every check above, because a quarry left
       running for a minute has already made some; it fails here, where the
       mill is the next thing to build and stone is exactly what is wanted. */
    {
      scene(3, [['quarry', 7, 1]]);
      let named = 0, rounds = 12;
      for (let r = 0; r < rounds; r++) {
        V.res.wood = Math.round(V.caps.wood * 0.9);
        V.res.food = Math.round(V.caps.food * 0.6);
        V.res.stone = 0;
        V.orders = [];
        let guard = 0;
        while (V.orders.length < V.orderSlots() && guard++ < 60) { V.orderT = 1e6; V.step(1 / 30); }
        if (V.orders.some(o => o.getK === 'stone')) named++;
      }
      if (!named) fails.push('a village whose quarry is standing but whose stone pile is empty was offered'
        + ' nothing that pays in stone, in ' + rounds + ' boards -- so trade is gated on holding a kind'
        + ' rather than on being able to make it, and the mill cannot be traded towards');
    }

    /* And a board saved by the build that made those offers does not come
       back standing. They are fillable, so the replacement path -- which only
       acts when NOTHING on the board can be taken -- would leave them there
       until the player took them, which is the trade the rule prevents. */
    {
      scene(2, null);
      for (const k of V.RES) V.res[k] = Math.round(V.caps[k] * 0.5);
      V.res.stone = 0;
      V.orders = [{ id: 9001, tier: 1, giveK: 'wood', giveN: 42, getK: 'stone', getN: 39, slot: 0 }];
      V.save();
      V.load();
      const left = V.orders.filter(o => o.getK === 'stone' || o.giveK === 'stone');
      if (left.length) fails.push('a saved offer paying in stone came back after a reload at hall 2, so a village'
        + ' that met the old board is left holding it: '
        + left.map(o => o.giveN + ' ' + o.giveK + ' -> ' + o.getN + ' ' + o.getK).join(', '));
    }

    /* And stores that are equally full, which is where a finished village
       sits: every granary at its ceiling, or every pile drawn down by the
       same build. Fullness gives no answer then, and the tie used to break
       the same way every time -- the last kind given, the first taken -- so
       the board read "stone for wood" three times in three sizes, the same
       forced trade the tiers exist to end, on 180 boards of 180. Among tied
       kinds a stall must take a pairing the board does not already show. */
    {
      scene(3, [['quarry', 7, 1]]);
      let same = 0, boards = 0, example = '';
      for (const fill of [0.1, 0.5, 0.9]) for (let r = 0; r < 4; r++) {
        for (const k of V.RES) V.res[k] = Math.round(V.caps[k] * fill);
        V.orders = [];
        let guard = 0;
        while (V.orders.length < V.orderSlots() && guard++ < 60) {
          V.orderT = 1e6; V.step(1 / 30);
          for (const k of V.RES) V.res[k] = Math.round(V.caps[k] * fill);
        }
        if (V.orders.length < 2) continue;
        boards++;
        const shapes = V.orders.map(o => o.giveK + ' for ' + o.getK);
        if (new Set(shapes).size < shapes.length) { same++; example = example || shapes.join(', '); }
      }
      if (boards < 6) fails.push('only ' + boards + ' boards with equal stores filled two stalls, so the sweep proved almost nothing');
      else if (same) fails.push(same + ' of ' + boards + ' boards with equally full stores repeat a trade on two stalls'
        + ' -- e.g. ' + example + ' -- so a tie in fullness forces one pairing in several sizes');
    }
    return { fails };
  };
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
      for (const k of V.RES) V.res[k] = 1e6;
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
          for (const k of V.RES) V.res[k] = V.caps[k] / 2;
        }
        if (V.orders.map(o => o.id).join(',') !== ids)
          fails.push('a board with an offer the player could take was changed under them');
      }
    }
    /* ---- the board at the ceiling ----

       A full barn locked the board solid, and on a finished village there is
       no storehouse left to build that would unlock it: measured, four stores
       of four allowed, two markets of two, both resources at 8380 of 8380,
       and five offers of which NOT ONE could be taken. The board was not
       costing the player anything. It was doing nothing at all, for ever, and
       nothing in the game said so -- the cards sat there reading "no room"
       about a room that could never be made.

       Three things to get wrong, and the third is the one that would be easy
       to break by accident: relaxing the rule everywhere, so that a village
       with a storehouse still left to build stops being told to build it. */
    let ceiling = { fillable: 0, ships: 0, credited: 0, blockedEarly: 0, said: 0 };
    {
      const full = finished => {
        scene();
        V.goalIdx = finished ? V.GOALS.length : 0;
        V.goalDone = null; V.finished = null; V.away = null;
        for (const k of V.RES) V.res[k] = V.caps[k];
        V.step(0.001);
        for (const k of V.RES) V.res[k] = V.caps[k];
      };

      /* Finished: the board is alive again. */
      full(true);
      ceiling.fillable = V.orders.filter(o => V.canFill(o)).length;
      ceiling.ships = V.orders.filter(o => V.willShip(o)).length;
      if (!ceiling.fillable)
        fails.push('every offer on the board is unfillable on a finished village with full stores,'
          + ' and there is no storehouse left to build that would change it');

      /* And what the barns cannot take is sent on rather than refused. */
      const o = V.orders.find(x => V.canFill(x) && V.willShip(x));
      if (!o) fails.push('no offer on a full finished board would send its payment on');
      else {
        const was = V.sharedTotal[o.getK], room = V.caps[o.getK] - V.res[o.getK];
        const want = (o.getN - room) * V.shareMul();
        V.fillOrder(o);
        ceiling.credited = Math.round(V.sharedTotal[o.getK] - was);
        if (Math.abs(ceiling.credited - want) > 1)
          fails.push('a trade the barns could not hold credited ' + ceiling.credited
            + ' to the neighbours where it should have been ' + Math.round(want)
            + ', so the goods were destroyed rather than sent');
      }

      /* Unfinished: a full barn still means build a storehouse. */
      full(false);
      ceiling.blockedEarly = V.orders.filter(o2 => !V.canFill(o2)).length;
      if (V.orders.length && ceiling.blockedEarly !== V.orders.length)
        fails.push('an offer could be taken into a full barn on a village that has NOT finished,'
          + ' so the one thing that makes a storehouse worth building has been given away');

      /* And the player is told before they tap, not after. */
      full(true);
      V.barMode = 'orders'; V.step(0.001);
      for (const k of V.RES) V.res[k] = V.caps[k];
      const cv4 = document.querySelector('canvas'), ctx4 = cv4.getContext('2d');
      const rows = [], o4 = ctx4.fillText;
      ctx4.fillText = function (t, ...a) { rows.push(String(t)); return o4.call(this, t, ...a); };
      try { V.draw(); } finally { ctx4.fillText = o4; }
      /* The exact label, not any line that mentions the neighbours. Matched
         loosely it also caught the goal strip -- which on a finished village
         reads "Ship 10.7M to the neighbours" -- so a mutation that silenced
         the CARD still left one match and the check passed. Found by that
         mutation, which is what they are for. */
      const label = 'to the neighbours';
      ceiling.said = rows.filter(t => t === label).length;
      const willShip = V.orders.filter(x => V.willShip(x)).length;
      if (willShip && ceiling.said !== willShip)
        fails.push(ceiling.said + ' of ' + willShip + ' cards paying into the neighbours rather than the barn say so, so a card that sends its payment away reads the same as one that fills a storehouse');
    }

    return { cases: 4, ceiling, fails };
  };


  /* ---------- the beacon ----------

     The one thing in the game with no ceiling, and the only answer it has to
     a finished village. Four things about it fail silently.

     It can be offered too early, which would put a post-game landmark in the
     tray of a village still building its second house. It can fail to drink,
     which leaves a building that says it is working and never finishes --
     and nothing else would notice, because no resource is missing and no
     error is thrown, it simply never moves. It can rise without being worth
     anything, which makes every stage past the first decoration. And it can
     rise without LOOKING like it, which is the whole point of a landmark: a
     sink nobody can see is a number, not a building. */
  window.beaconSweep = async function () {
    const V = window.__v, fails = [];
    const fresh = finished => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.goalIdx = finished ? V.GOALS.length : 0;
      V.goalDone = null; V.finished = null; V.away = null; V.panel = null; V.sel = null;
      V.moving = null; V.claimAsk = false; V.orders = [];
      V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
      for (const kAll of V.RES) V.grant(kAll, 1e6, 0, 0);
      V.step(0.001);
      /* Straight into the purse, past grant, because grant clamps to the
         storage ceiling and a village of one hall has a ceiling of three
         hundred -- against a beacon costing two and a half thousand. Nothing
         here is testing whether a hall can hold a beacon; it is testing what
         the beacon does once it stands. */
      for (const k of V.RES) V.res[k] = 1e6;
    };
    const drop = () => {
      const L = V.landBounds();
      for (let c = L.lo; c <= L.hi; c++) for (let r = L.lo; r <= L.hi; r++)
        if (V.canPlace(V.BEACON, c, r, V.occupied()) && V.place(V.BEACON, c, r)) {
          const p = V.beaconOf(); p.t = 1; p.build = 0; return p;
        }
      return null;
    };

    /* Waited for, because artFor hands back null while a file is still
       decoding and that is indistinguishable from one that is not there. */
    for (let i = 0; i < 40 && !V.beaconSet(); i++) await new Promise(r => setTimeout(r, 50));
    const drawn = !!V.beaconSet();

    /* Not before the village is finished, drawings or no drawings. */
    fresh(false);
    if (V.allowedOf(V.BEACON) !== 0 || V.beaconOpen())
      fails.push('the beacon is offered to a village that has not finished its goals');

    if (!drawn) {
      /* And with no drawings it is not offered to a finished one either,
         which is the state this game ships in until somebody paints it. */
      fresh(true);
      if (V.allowedOf(V.BEACON) !== 0)
        fails.push('the beacon is offered with none of its ' + V.BEACON_STAGES
          + ' drawings on disk, so it would be built as a coloured box');
      return { drawn: false, note: 'no beacon art yet: the rest of this sweep needs it', fails };
    }

    fresh(true);
    if (!V.beaconOpen() || V.allowedOf(V.BEACON) !== 1)
      fails.push('a finished village with every beacon drawing on disk is still not offered one');

    const p = drop();
    if (!p) { fails.push('the beacon could not be placed on a finished island'); return { drawn, fails }; }

    /* It takes half of what the villagers carry home, and the barn gets the
       other half.

       Driven through deliver(), the one door a carried load comes in by, with
       the barns emptied before each so that nothing is refused for want of
       room and every good is either the beacon's or the barn's. It used to be
       driven at the ceiling and watched draining the stores; it does not
       touch the stores any more, and a check that asked it to would be
       asking for the fault that was taken out. */
    const stages = [];
    let drank = 0, kept = 0;
    for (let i = 0; i < 40000 && V.beaconStage() < V.BEACON_STAGES; i++) {
      for (const k of V.RES) V.res[k] = 0;
      const got = V.deliver(V.RES[i % V.RES.length], V.CARRY, 0, 0);
      kept += got; drank += V.CARRY - got;
      const lvl = V.beaconStage();
      if (!stages.length || stages[stages.length - 1] !== lvl) stages.push(lvl);
    }
    if (drank <= 0)
      fails.push('the beacon took nothing of what the villagers carried home, so it is not a sink for anything');
    if (Math.abs(drank - kept) > V.CARRY)
      fails.push('of every load the beacon took ' + Math.round(drank) + ' and the barns ' + Math.round(kept)
        + ', which is not the half each it promises');
    for (const k of V.RES) V.res[k] = 0;
    if (V.deliver('wood', V.CARRY, 0, 0) !== V.CARRY)
      fails.push('a finished beacon still takes a share of every load');
    if (V.beaconStage() < V.BEACON_STAGES)
      fails.push('the beacon stopped at stage ' + V.beaconStage() + ' of ' + V.BEACON_STAGES
        + ', so it never finishes however long the village runs');
    if (stages.length < V.BEACON_STAGES)
      fails.push('the beacon showed ' + stages.length + ' of its ' + V.BEACON_STAGES
        + ' stages, so it is skipping or not rising one at a time: ' + stages.join(', '));

    /* Every stage is drawn as itself. A landmark that never changes shape is
       a counter with a roof on it. */
    const seen = new Set();
    for (let lvl = 1; lvl <= V.BEACON_STAGES; lvl++) {
      p.lvl = lvl;
      const im = V.buildingArt(p);
      seen.add(im && im.src ? im.src.split('/').pop() : 'none');
    }
    if (seen.size !== V.BEACON_STAGES)
      fails.push('the beacon is drawn with ' + seen.size + ' pictures across its ' + V.BEACON_STAGES
        + ' stages, so it does not visibly rise: ' + [...seen].join(', '));

    /* And each stage is worth more. Measured through a delivery into a full
       barn -- the thing a maxed village does all day -- rather than by asking
       the multiplier what it thinks of itself. */
    const shipped = lvl => {
      p.lvl = lvl;
      for (const k of V.RES) V.res[k] = V.caps[k];
      V.sharedTotal = { wood: 0, food: 0 };
      V.deliver('wood', 100, 0, 0);
      return V.sharedTotal.wood;
    };
    const low = shipped(1), high = shipped(V.BEACON_STAGES);
    if (!(high > low))
      fails.push('a beacon at its top stage sends no more over the water than one at stage 1: ' + low + ' against ' + high + ', so every stage past the first is decoration');

    V.sharedTotal = { wood: 0, food: 0 };

    /* ---- and in a village that WORKS, which the scene above is not ----

       Everything above stands the beacon on an island with a hall and nothing
       else -- the one village where nothing is produced, nothing is spent and
       nothing is shipped, so none of what the beacon does to a real village
       can be seen there. In a real finished village it held every barn under
       full for the two hours it took to rise, and a barn under full sends
       nothing over the water: 3,936 shipped in ten minutes without a beacon,
       none with one, under a goal reading "Ship 50k to the neighbours".

       So, in a working finished village with the beacon at its first stage:
       the village still ships, the beacon still rises, it takes half of what
       is carried home and not more, and each chip moves its barn at the rate
       it says. */
    const put = k => { const L = V.landBounds();
      for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++)
        if (V.canPlace(k, c, r, V.occupied())) return V.place(k, c, r);
      return false; };
    const ctx = document.querySelector('canvas').getContext('2d'), oF = ctx.fillText;
    const chipLines = () => {
      const lines = [];
      ctx.fillText = function (t, ...a) { lines.push(String(t)); return oF.call(this, t, ...a); };
      try { V.draw(); } finally { ctx.fillText = oF; }
      return lines.filter(t => /^(\+[\d.]+\/s|idle|storage full|(?:wasting|sharing) [\d.]+\/s)$/.test(t));
    };
    fresh(true);
    for (const k of ['house', 'house', 'house', 'house', 'house', 'house', 'farm', 'farm', 'lumber',
                     'lumber', 'quarry', 'store', 'well']) { for (const k2 of V.RES) V.res[k2] = 1e6; put(k); }
    for (const q of V.placed) if (q.key !== 'hall' && !V.isDecor(q.key)) q.lvl = 3;
    for (let i = 0; i < 120 * 30; i++) V.step(1 / 30);
    V.goalIdx = V.GOALS.length; V.goalDone = null; V.finished = null; V.away = null;
    for (const k of V.RES) V.res[k] = 1e6;
    const b2 = drop();
    if (!b2) fails.push('the beacon could not be placed in a working village');
    else {
      b2.lvl = 1; b2.stock = 0;
      const quiet = () => { V.orders = []; V.goalDone = null; V.finished = null; };
      /* The chips first, from a barn with room, against a minute of what the
         barn really did. */
      for (const k of V.RES) V.res[k] = Math.floor(V.caps[k] * 0.3);
      for (let i = 0; i < 20 * 30; i++) { quiet(); V.step(1 / 30); }
      const said = chipLines();
      if (said.length !== V.RES.length)
        fails.push('the chips said ' + said.length + ' things beside a rising beacon: ' + said.join(' / '));
      else {
        const SECS = 60, r0 = {};
        for (const k of V.RES) r0[k] = V.res[k];
        for (let i = 0; i < SECS * 30; i++) { quiet(); V.step(1 / 30); }
        V.RES.forEach((k, i) => {
          const t = said[i], gain = (V.res[k] - r0[k]) / SECS;
          const m = /([\d.]+)\/s/.exec(t), fig = m ? +m[1] : 0;
          const slack = (V.CARRY + 0.15 * fig * SECS + 0.05 * SECS) / SECS;
          if (/^\+/.test(t) && Math.abs(gain - fig) > slack)
            fails.push('beside a rising beacon the ' + k + ' chip says "' + t + '" and the store moved '
              + gain.toFixed(2) + '/s');
        });
      }
      /* Then ten minutes from full: what was carried home, what the beacon
         took of it, and what went over the water. */
      for (const k of V.RES) V.res[k] = V.caps[k];
      V.sharedTotal.wood = 0; V.sharedTotal.food = 0; if ('stone' in V.sharedTotal) V.sharedTotal.stone = 0;
      const stock0 = b2.stock, lvl0 = b2.lvl;
      let carried = 0;
      for (let i = 0; i < 600 * 30; i++) {
        quiet();
        const held = V.villagers.map(v => [v, v.carry ? v.carry.n : 0]);
        V.step(1 / 30);
        for (const [v, n] of held) if (n && !v.carry) carried += n;
      }
      const shippedNow = Object.values(V.sharedTotal).reduce((a, b) => a + b, 0);
      const took = b2.lvl === lvl0 ? b2.stock - stock0 : null;
      /* Not "more than nothing": the barns start full, so a few loads go over
         the water in the first seconds whatever the beacon does, and a check
         for any shipping at all passed the very build that shipped nothing
         for the next two hours. Full barns that nobody spends from send on
         everything that reaches them -- the barn's share of every load, at
         this stage's multiplier -- so that is what is asked for. */
      /* Half, written here rather than read from the game: the card tells the
         player "half of every load", and a check that took the game's own
         figure would agree with any figure the game chose -- a beacon taking
         everything "owed" nothing to the water and passed. */
      const HALF = 0.5;
      const due = carried * (1 - HALF) * V.shareMul();
      if (!(shippedNow >= 0.8 * due))
        fails.push('in ten minutes beside a rising beacon, with every barn full, ' + Math.round(shippedNow)
          + ' went over the water against the ' + Math.round(due) + ' the barns\' share of '
          + Math.round(carried) + ' carried home should have sent');
      if (took !== null && Math.abs(took - carried * HALF) > V.CARRY)
        fails.push('the beacon took ' + Math.round(took) + ' of ' + Math.round(carried)
          + ' carried home in ten minutes, which is not the share it promises');
      if (!(b2.stock > stock0 || b2.lvl > lvl0))
        fails.push('in a working village the beacon did not rise at all');

      /* And the hours the app is closed follow the same rule as the minutes it
         is open -- which for a game you leave running are most of them. They
         did not: the beacon stood still while the village was away, and the
         overflow went over the water without the beacon's multiplier, so an
         hour away shipped less than the same hour watched. */
      {
        const rate = V.potentialRate(), made = V.RES.reduce((a, k) => a + rate[k], 0);
        const SECS = 600;
        b2.lvl = 1; b2.stock = 0;
        for (const k of V.RES) V.res[k] = V.caps[k];
        const shared0 = Object.values(V.sharedTotal).reduce((a, b) => a + b, 0);
        const mul = V.shareMul();
        V.grantAway(SECS); V.away = null;
        const tookAway = b2.stock + (b2.lvl > 1 ? 6000 : 0);
        const sentAway = Object.values(V.sharedTotal).reduce((a, b) => a + b, 0) - shared0;
        if (Math.abs(tookAway - made * SECS * HALF) > V.CARRY)
          fails.push('ten minutes away gave the beacon ' + Math.round(tookAway) + ' of the '
            + Math.round(made * SECS) + ' the village made, which is not the half it takes while you watch');
        const dueAway = made * SECS * (1 - HALF) * mul;
        if (Math.abs(sentAway - dueAway) > Math.max(V.CARRY, 0.02 * dueAway))
          fails.push('ten minutes away with full barns sent ' + Math.round(sentAway) + ' over the water against the '
            + Math.round(dueAway) + ' the same ten minutes watched would send');
      }
    }
    return { drawn, stages, drank: Math.round(drank), pictures: seen.size, low, high, fails };
  };

  /* ---------- who the villagers are ----------

     Villagers are not in the save. They are worked out from the houses on
     every load, which means the whole village is built again from an empty
     list every time the game opens -- and anything about a villager that is
     decided at random when they are spawned is decided AGAIN, differently.

     That is the fault this guards. It is completely silent: nothing errors,
     no file is missing, the village looks right in any single session, and
     the only way to see it is to close the game and open it again.

     Four ways for it to go wrong, and the fourth is the one that would only
     show up in a village that has been played for a long time. */
  window.nameSweep = function () {
    const V = window.__v, fails = [];
    const cv5 = document.querySelector('canvas'), ctx5 = cv5.getContext('2d');

    /* A village with enough people in it to collide if it is going to. */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.moving = null; V.claimAsk = false; V.orders = [];
    V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    for (const k of V.RES) V.res[k] = 9e5;
    {
      const L = V.landBounds();
      const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
        for (const k of V.RES) V.res[k] = 9e5;
        if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
      for (let i = 0; i < 8; i++) seat('house');
      for (let i = 0; i < 3; i++) seat('farm');
      for (let i = 0; i < 3; i++) seat('lumber');
      for (const p of V.placed) { p.t = 1; p.build = 0; p.lvl = 5; }
      V.rebuildStores();
      for (let i = 0; i < 120; i++) V.step(1 / 30);
    }
    const people = V.villagers.length;
    if (people < 8) { fails.push('the name check could only house ' + people + ' villagers'); return { people, fails }; }

    const snap = () => V.villagers.map(v => v.seed + ':' + V.villagerName(v) + ':' + V.villagerArt(v));
    const names = () => V.villagers.map(v => V.villagerName(v));

    /* Nobody shares a name. */
    const distinct = new Set(names()).size;
    if (distinct !== people)
      fails.push(people + ' villagers answer to ' + distinct + ' names, so some of them are the same person as far as the village is concerned');

    /* The village comes back with the same people in it. Emptying the list
       and stepping is exactly what a reload does -- they are rebuilt from the
       houses -- so anything rolled at spawn is rolled again here. */
    const before = snap();
    V.villagers.length = 0; V.step(0.001);
    const after = snap();
    if (before.join('|') !== after.join('|')) {
      const n = before.filter((x, i) => x !== after[i]).length;
      fails.push(n + ' of ' + people + ' villagers came back as somebody else after the village was rebuilt, which is what every reload does: ' + (before.find((x, i) => x !== after[i]) || '') + ' became ' + (after.find((x, i) => x !== before[i]) || ''));
    }

    /* Somebody leaving does not hand their number to somebody else. A villager
       is spliced out of the MIDDLE when a house goes, so a new arrival that
       took the length of the list as its number would take one that is still
       in use -- and two people in the village would answer to one name. It
       needs a village this size to show at all. */
    V.villagers.splice(3, 1);
    V.step(0.001);
    const after2 = names();
    if (new Set(after2).size !== after2.length)
      fails.push('after somebody left and somebody arrived, ' + (after2.length - new Set(after2).size) + ' villagers share a name with another');

    /* The panel says who works there, and says the right ones. */
    let named = 0;
    for (const p of V.placed) {
      const n = V.workersAt(p.id);
      if (p.key === 'hall' || n < 1) continue;
      V.panel = p.id;
      const rows = [], o5 = ctx5.fillText;
      /* Nothing dimming the screen at the moment of the draw.

         The game yields the building panel to any card that washes the whole
         screen -- the claim question, the welcome-back card, the one that says
         the village is finished -- because tap() has always answered the card
         and never what is under it. These checkers read the panel, and they
         build villages with every goal done and tutSeen emptied, which is a
         village that raises the finished card again on every tick. So the
         panel they were reading was not being drawn at all.

         Cleared immediately before the draw rather than once at the top, for
         that same reason: the card comes back every tick until it is put away. */
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      ctx5.fillText = function (t, ...a) { rows.push(String(t)); return o5.call(this, t, ...a); };
      try { V.draw(); } finally { ctx5.fillText = o5; }
      const row = rows.find(t => t.indexOf('workers ') >= 0) || '';
      const want = V.workersOf(p.id).map(v => V.villagerName(v));
      const missing = want.filter(w => row.indexOf(w) < 0);
      if (missing.length)
        fails.push('the panel for a ' + p.key + ' names ' + (want.length - missing.length)
          + ' of the ' + want.length + ' villagers working it, so the ones it leaves out are nobody: "' + row + '"');
      else named++;
      break;
    }
    V.panel = null;
    if (!named) fails.push('no staffed building put a name on its panel');

    return { people, distinct, named, fails };
  };

  /* ---------- tapping a person ----------

     Seventy-two figures walk about this island and until now not one of them
     could be touched. The checks are the four things that can go wrong with
     making them touchable, and the first is the one nobody would notice:

     - a villager you can SEE but cannot hit. The figure is drawn in world
       space and shrinks with the camera, so at the far zoom out it is eleven
       pixels tall; a hit box in world units would be untouchable there and
       the feature would simply not exist at the zoom most people play at.
     - the wrong person. Villagers are spliced out of the middle of the list,
       so anything that remembers an INDEX opens somebody else's card.
     - the building instead of the person. A villager stands ON the building
       they work at, and buildingAt is perfectly happy to answer first.
     - a card that outlives its subject. Sell the house and the villager goes;
       the card must go with them rather than reading a corpse. */
  window.whoSweep = function () {
    const V = window.__v, fails = [];

    /* The back button, stubbed, exactly as backSweep does it.

       This sweep drives tap() for real, dozens of times, and the game arms
       the hardware back button whenever something is open and disarms it
       when nothing is -- and disarming calls history.back(). Run inside the
       whole battery that NAVIGATED THE TAB mid-run: the next sweep along
       lost every one of its forty-six fetches and reported the entire art
       tree missing from www/. The sweep was right about its own subject and
       wrecked the one after it. */
    const realPush = history.pushState.bind(history), realBack = history.back.bind(history);
    history.pushState = () => {}; history.back = () => {};
    try {
      return whoBody(V, fails);
    } finally { history.pushState = realPush; history.back = realBack; }
  };

  function whoBody(V, fails) {

    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
    V.moving = null; V.claimAsk = false; V.orders = []; V.who = null;
    V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    {
      const L = V.landBounds();
      const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
        for (const k of V.RES) V.res[k] = 9e5;
        if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
      for (let i = 0; i < 6; i++) seat('house');
      for (let i = 0; i < 2; i++) seat('farm');
      for (let i = 0; i < 2; i++) seat('lumber');
      seat('store');
      for (const p of V.placed) { p.t = 1; p.build = 0; p.lvl = 5; }
      V.rebuildStores();
      for (let i = 0; i < 120; i++) V.step(1 / 30);
    }
    const people = V.villagers.length;
    if (people < 6) { fails.push('the villager-card check could only house ' + people + ' people'); return { people, fails }; }

    /* Where a tap reaches the world at all. The chips sit across the top and
       the tray across the bottom, and a villager drawn behind either of them
       is not reachable by tapping -- which is the HUD's business, not the hit
       test's. Checking those positions measured the tray and blamed the
       villager. */
    const tabs = V.tabRects()[0];
    const worldTop = () => V.hudTop() + 150, worldBot = () => tabs.y - tabs.h / 2 - 20;
    const inWorld = (x, y) => x > 8 && x < V.W - 8 && y > worldTop() && y < worldBot();

    /* 1. seen means touchable, at every zoom the camera allows -- and
       touchable by a THUMB, not by a cursor.

       Two earlier versions of this check were worth less than nothing. The
       first probed the middle of the figure, which is inside any box you care
       to draw, so it passed happily on a build where the box had been shrunk
       to world units and a villager at the far zoom out was an eleven pixel
       target. The second probed half a thumb out from the middle of the
       FIGURE -- and the box is not centred on the figure, it reaches a long
       way above the head and barely below the feet, so the downward probe
       landed outside a box that was the right size all along.

       So measure the thing itself. Walk outward from a point that does hit
       until it stops hitting, in each of the four directions, and that is the
       hit area. It has to be at least a fingertip across in both axes, which
       is what TOUCH_MIN means everywhere else in this game.

       Landing on a DIFFERENT villager still counts: in a crowd the boxes
       overlap and the player gets somebody either way. */
    let narrow = 0, onscreen = 0, worstZ = null, worstW = Infinity, worstH = Infinity;
    const STEP = 6, FAR = V.TOUCH_MIN * 1.5;
    /* Stopped at the edges of the GLASS, which on a tall phone are not 0 and H.

       The game is laid out 1536 tall and centred, so a 360x780 screen shows
       from -342 to 1878, and inWorld above hands this walk villagers from -192
       down. The walk stopped at 0. So a figure standing in the strip above
       zero -- one only a tall screen has -- had the top of its box cut off by
       the ruler: measured at 109 tall when the box is 217 wherever it stands,
       and reported as "121x109 against 128". Whether it failed depended on
       whether anybody happened to be walking through that strip at the
       furthest zoom, which was about one run in forty, and once in a full
       battery. */
    const reach = (x, y, dx, dy) => {
      let d = 0;
      while (d < FAR) {
        const nx = x + dx * (d + STEP), ny = y + dy * (d + STEP);
        if (nx < 0 || nx > V.W || ny < V.screenTop() || ny > V.screenBot()) break;
        if (!V.villagerAt(nx, ny, true)) break;
        d += STEP;
      }
      return d;
    };
    for (const z of [V.ZMIN, 1, V.ZMAX]) {
      V.CAM.z = z; V.step(0.001);
      const sc = V.camScale();
      for (const v of V.villagers) {
        const pt = V.camProject(v.x, v.y);
        const cy = pt.y - V.VILLAGER_H * sc * 0.4;
        /* Only figures with room all round them on screen: a villager at the
           edge has a box running off the glass and that is the glass's fault,
           not the hit test's. */
        if (!inWorld(pt.x - FAR, cy - FAR) || !inWorld(pt.x + FAR, cy + FAR)) continue;
        if (!V.villagerAt(pt.x, cy, true)) { narrow++; worstZ = z; worstW = 0; worstH = 0; continue; }
        onscreen++;
        const wide = reach(pt.x, cy, -1, 0) + reach(pt.x, cy, 1, 0) + 1;
        const tall = reach(pt.x, cy, 0, -1) + reach(pt.x, cy, 0, 1) + 1;
        /* Two steps of slack, not one: the walk stops at the last multiple of
           STEP that still hits, and BOTH directions round down, so a box that
           is exactly TOUCH_MIN across measures as little as TOUCH_MIN minus
           two steps plus one. One step of slack reported a 128-wide box as a
           121-wide failure. */
        if (wide + 2 * STEP < V.TOUCH_MIN || tall + 2 * STEP < V.TOUCH_MIN) {
          narrow++; worstZ = z;
          if (wide < worstW) worstW = wide;
          if (tall < worstH) worstH = tall;
        }
      }
    }
    if (narrow)
      fails.push(narrow + ' of ' + onscreen + ' on-screen villagers answer to an area smaller than a fingertip'
        + ' (down to ' + (worstW === Infinity ? '?' : worstW) + 'x' + (worstH === Infinity ? '?' : worstH)
        + ' against ' + V.TOUCH_MIN + ', worst at zoom ' + worstZ + '), so the camera decides whether people can be tapped');

    /* 2. the tap opens the card of the person tapped, and nobody else. */
    V.CAM.z = 1; V.step(0.001);
    let checked = 0, empty = 0, behind = 0, far = 0, why = '';
    for (const v of V.villagers) {
      const pt = V.camProject(v.x, v.y);
      const sy0 = pt.y - V.VILLAGER_H * V.camScale() * 0.4;
      if (!inWorld(pt.x, sy0)) continue;
      /* Every card a tap could be swallowed by, not just the villager one.

         Two of these cost real time to find. A tap on unclaimed ground raises
         the claim dialog, so the NEXT tap goes to the dialog instead of the
         world. And this village is built FINISHED -- goalIdx past the last
         goal -- so stepping it raises the "village complete" card, and the
         very first tap of the loop closed that card instead of opening
         anybody. Both are the game behaving correctly and the sweep handing
         it a screen it had not looked at. One in thirty-six, always villager
         nought, and only inside the full battery. */
      V.who = null; V.panel = null; V.claimAsk = false; V.sellArm = null;
      V.ghost = null; V.armed = null; V.sel = null; V.moving = null;
      V.away = null; V.finished = null; V.goalDone = null;
      const sy = sy0;
      V.tap(pt.x, sy);
      checked++;
      const got = V.whoIs();
      if (!got) {
        empty++;
        /* Say what happened instead. A count on its own sent me guessing at
           this three times; the state at the moment of the miss says it. */
        if (!why) why = 'tapped ' + Math.round(pt.x) + ',' + Math.round(sy)
          + ' where villager ' + v.seed + ' is drawn'
          + ' -- exact box ' + (V.villagerAt(pt.x, sy, false) ? 'hits' : 'MISSES')
          + ', padded ' + (V.villagerAt(pt.x, sy, true) ? 'hits' : 'MISSES')
          + ', building ' + (V.buildingAt(pt.x, sy) ? 'hits' : 'misses')
          + ', after the tap panel=' + V.panel + ' who=' + V.who
          + ' claimAsk=' + V.claimAsk + ' away=' + !!V.away + ' barMode=' + V.barMode
          + ' sel=' + V.sel + ' moving=' + V.moving;
        continue;
      }
      /* NOT 'is it the villager I aimed at'. That was the first version of
         this check and it failed six times out of thirty-six on a village
         where nothing was wrong: a thumb is a fixed size on the glass, so at
         any zoom below about two the box round a villager is wider than the
         villager, and in a crowd several boxes cover the same point. Picking
         one of them is not a bug; picking the wrong one is.

         So the two things that are actually promised. The one that opens must
         be drawn no further back than the one aimed at -- a hit test that
         reaches past the figure in front to the one behind it is the bug this
         is for -- and it must be under the thumb rather than across the
         island. */
      if (got.y < v.y - 1) behind++;
      const gp = V.camProject(got.x, got.y);
      if (Math.abs(gp.x - pt.x) > V.TOUCH_MIN || Math.abs(gp.y - sy) > V.TOUCH_MIN + V.VILLAGER_H * V.camScale()) far++;
    }
    if (empty)
      fails.push(empty + ' of ' + checked + ' taps where a villager is drawn opened nobody at all: ' + why);
    if (behind)
      fails.push(behind + ' of ' + checked + ' taps opened a villager standing BEHIND the one under the thumb, so a crowd answers back to front');
    if (far)
      fails.push(far + ' of ' + checked + ' taps opened a villager who is not under the thumb at all');

    /* 3. a person standing on a building wins the tap. */
    let shadowed = 0, standing = 0;
    for (const v of V.villagers) {
      const pt = V.camProject(v.x, v.y);
      const sy = pt.y - V.VILLAGER_H * V.camScale() * 0.4;
      if (!inWorld(pt.x, sy)) continue;
      if (!V.buildingAt(pt.x, sy)) continue;          // nothing behind them to lose to
      if (!V.villagerAt(pt.x, sy, false)) continue;   // not actually drawn there
      standing++;
      /* Every card a tap could be swallowed by, not just the villager one.

         Two of these cost real time to find. A tap on unclaimed ground raises
         the claim dialog, so the NEXT tap goes to the dialog instead of the
         world. And this village is built FINISHED -- goalIdx past the last
         goal -- so stepping it raises the "village complete" card, and the
         very first tap of the loop closed that card instead of opening
         anybody. Both are the game behaving correctly and the sweep handing
         it a screen it had not looked at. One in thirty-six, always villager
         nought, and only inside the full battery. */
      V.who = null; V.panel = null; V.claimAsk = false; V.sellArm = null;
      V.ghost = null; V.armed = null; V.sel = null; V.moving = null;
      V.away = null; V.finished = null; V.goalDone = null;
      V.tap(pt.x, sy);
      if (V.who == null) shadowed++;
    }
    if (shadowed)
      fails.push(shadowed + ' of ' + standing + ' villagers standing in front of a building opened the BUILDING instead of themselves');

    /* 4. and the other half of that bargain: a building with nobody drawn on
       it still opens.

       This is the check that forced the design. A fingertip is 128 logical
       pixels and a villager is 36 across, so when the padded box was the ONLY
       test, seventy-two people blanketed the island and a house could not be
       tapped at all -- the feature would have shipped having quietly removed
       the main interaction in the game. The figure is asked for first, the
       building second, the fingertip last, and this is what holds that in
       place. */
    V.who = null; V.panel = null;
    let roofs = 0, stolen = 0;
    for (const p of V.placed) {
      const c = V.centreOf(p), pt = V.camProject(c.x, c.y);
      if (!inWorld(pt.x, pt.y)) continue;
      if (!V.buildingAt(pt.x, pt.y)) continue;
      if (V.villagerAt(pt.x, pt.y, false)) continue;    // somebody really is standing there
      roofs++;
      /* Every card a tap could be swallowed by, not just the villager one.

         Two of these cost real time to find. A tap on unclaimed ground raises
         the claim dialog, so the NEXT tap goes to the dialog instead of the
         world. And this village is built FINISHED -- goalIdx past the last
         goal -- so stepping it raises the "village complete" card, and the
         very first tap of the loop closed that card instead of opening
         anybody. Both are the game behaving correctly and the sweep handing
         it a screen it had not looked at. One in thirty-six, always villager
         nought, and only inside the full battery. */
      V.who = null; V.panel = null; V.claimAsk = false; V.sellArm = null;
      V.ghost = null; V.armed = null; V.sel = null; V.moving = null;
      V.away = null; V.finished = null; V.goalDone = null;
      V.tap(pt.x, pt.y);
      if (V.panel == null) stolen++;
    }
    if (stolen)
      fails.push(stolen + ' of ' + roofs + ' buildings with nobody standing on them could not be opened,'
        + ' because a villager nearby took the tap');

    /* 5. the card does not outlive the person. */
    V.who = null; V.panel = null;
    const victim = V.villagers.find(v => v.job != null) || V.villagers[0];
    V.who = victim.seed;
    const seed = victim.seed;
    V.villagers.splice(V.villagers.indexOf(victim), 1);
    V.draw();
    if (V.who != null && !V.whoIs())
      fails.push('the card stayed open on villager ' + seed + ' after they left the village, so it is reading somebody who is not there');

    /* 6. and it closes with Back, like everything else that opens. */
    V.who = null; V.panel = null;
    const live = V.villagers[0];
    if (live) {
      V.who = live.seed;
      if (!V.backOpen()) fails.push('Back does not know the villager card is open, so the hardware button leaves the game instead of closing it');
      V.backClose();
      if (V.who != null) fails.push('Back did not close the villager card');
    }

    V.who = null; V.panel = null; V.CAM.z = 1;
    return { people, onscreen, checked, standing, roofs, fails };
  }

  /* ---------- what was already on the land ----------

     Claiming a ring used to reveal grass. Each ring now has something on it
     that was there before the village was, and the checks are the four ways
     that can go wrong -- three of which are silent.

     The loud one first: a find whose picture has not been drawn yet must not
     appear at all. The game places these on its own, so without that rule a
     missing file is a coloured box sitting on the best moment in the game.

     Then the quiet ones. A find is a decoration as far as CHARM is concerned
     and must not be one anywhere else: not against the sixty bought ones the
     village is allowed, not in the tray where it could be bought again, and
     not in BEST_CHARM, which decides whether the charm goal is still
     reachable and would otherwise be measuring an ornament nobody can buy. */
  window.findSweep = function () {
    const V = window.__v, fails = [];
    const keys = V.FIND_KEYS || [];
    if (keys.length < 2) { fails.push('the game names only ' + keys.length + ' things to find'); return { fails }; }

    /* The art is swapped out and back. artFor hands back whatever is in ART
       once it is loaded, so a picture that already exists can stand in for one
       that does not yet -- which is the only way to test both states today. */
    const keep = {};
    for (const k of keys) keep[k] = V.ART[k];
    const stand = V.artFor('statue') || V.artFor('house') || V.artFor('hall');
    if (!stand) { fails.push('no loaded picture to stand in for a find, so this sweep could not run'); return { fails }; }

    const fresh = () => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = 0; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.who = null;
      V.sel = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.ensureHall(); V.placed[0].t = 1;
      V.rebuildStores(); V.rebuildCharm();
    };
    const foundNow = () => V.placed.filter(p => V.isFound(p.key));

    try {
      /* 1. no picture, no landmark. */
      for (const k of keys) V.ART[k] = null;
      fresh();
      for (let i = 0; i < V.LAND_MAX; i++) { for (const k of V.RES) V.res[k] = 9e6; V.claimLand(); }
      V.placeFinds();
      if (V.landTier !== V.LAND_MAX)
        fails.push('the check could only claim ' + V.landTier + ' of ' + V.LAND_MAX + ' rings');
      if (foundNow().length)
        fails.push(foundNow().length + ' landmarks were put on the island with no picture to draw them with,'
          + ' so the best moment in the game is a coloured box');

      /* 2. with pictures: one per ring, and not before its ring is claimed. */
      for (const k of keys) V.ART[k] = stand;
      fresh();
      V.placeFinds();
      if (foundNow().length)
        fails.push('a landmark appeared on land nobody has claimed yet');
      for (let tier = 1; tier <= V.LAND_MAX; tier++) {
        for (const k of V.RES) V.res[k] = 9e6;
        if (!V.claimLand()) { fails.push('could not claim ring ' + tier); break; }
        const want = V.FINDS[tier];
        const got = V.placed.find(p => p.key === want);
        if (!got) { fails.push('ring ' + tier + ' was claimed and ' + want + ' is not on it'); continue; }
        /* On the NEW ground, not tucked inside the border the player already
           had. A find that lands on old land is not a discovery, it is a
           decoration that appeared in the middle of the village. */
        const inner = V.LAND[tier - 1];
        const outside = got.c < inner.lo || got.r < inner.lo || got.c + 1 > inner.hi || got.r + 1 > inner.hi;
        if (!outside)
          fails.push(want + ' was placed at ' + got.c + ',' + got.r + ', which is inside the border the player already had');
      }
      const all = foundNow();
      if (all.length !== keys.length)
        fails.push('a fully claimed island holds ' + all.length + ' of ' + keys.length + ' landmarks');

      /* 3. asking twice does not put two of anything down. */
      const before = V.placed.length;
      V.placeFinds(); V.placeFinds();
      if (V.placed.length !== before)
        fails.push('asking for the landmarks again added ' + (V.placed.length - before) + ' more of them');

      /* 4. they are not decorations anywhere it would cost the player. */
      if (V.decorCount() !== 0)
        fails.push('the ' + all.length + ' found landmarks eat ' + V.decorCount() + ' of the ' + V.DECOR_MAX
          + ' decoration slots the village is allowed, which the player never spent');
      V.barMode = 'decor';
      const tray = V.barList().map(b => b.key).filter(k => keys.includes(k));
      if (tray.length) fails.push('the tray offers ' + tray.join(', ') + ' for sale, and they are not for sale');
      V.barMode = 'build';
      const sellable = all.filter(p => V.canSell(p));
      if (sellable.length)
        fails.push(sellable.length + ' landmarks can be sold, and they cost nothing, so selling one returns nothing'
          + ' and destroys the only thing on that ring');

      /* 5. but they ARE worth charm, and they do not distort the charm goal. */
      const charmOfFinds = all.reduce((n, p) => n + V.B(p.key).charm, 0);
      if (!charmOfFinds) fails.push('the landmarks are worth no charm at all, so finding them changes nothing');
      if (V.charmTotal() !== charmOfFinds)
        fails.push('the village counts ' + V.charmTotal() + ' charm where its landmarks are worth ' + charmOfFinds);
      const bought = V.BUILDINGS.filter(b => b.decor && !b.found).reduce((n, b) => Math.max(n, b.charm || 0), 0);
      if (V.BEST_CHARM !== bought)
        fails.push('the best ornament available is reckoned at ' + V.BEST_CHARM + ' where the best BUYABLE one is '
          + bought + ', so the charm goal is measured against something nobody can buy');

      return { finds: all.length, charm: charmOfFinds, fails };
    } finally {
      for (const k of keys) V.ART[k] = keep[k];
      V.barMode = 'build'; V.rebuildCharm();
    }
  };

  /* ---------- the walk, drawn ----------

     The village has been quoting walking time for a long while: a badge on
     any workplace losing more than half of itself to the carry, a round trip
     in seconds on its panel, a delivered figure that counts what ARRIVES, and
     now the seconds on a named villager's card. All numbers, and the fix for
     every one of them is a PLACE. So the route is drawn.

     The checks are the ways a drawn route can lie, and a drawn line that lies
     is worse than no line: it is an instruction to lay a road in the wrong
     place.

     - it has to go where the arithmetic says. routeOf prices the journey by
       sampling the straight line; the picture samples the same line a second
       time with a different step. If those two disagree the player is being
       shown one route and charged for another.
     - it has to be drawn for the buildings that WALK and no others. A
       storehouse carries nothing anywhere.
     - it has to appear when the question is asked -- a road in hand -- and
       not the rest of the time.
     - and it has to be visible, which means a fixed width on the GLASS. This
       was drawn at a flat four pixels inside the world transform, which at
       the zoom that frames the whole island is under one pixel on a phone:
       drawn every frame, correct every frame, and invisible. */
  window.routeSweep = function () {
    const V = window.__v, fails = [];

    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.who = null;
    V.sel = null; V.moving = null; V.claimAsk = false; V.orders = []; V.barMode = 'build';
    V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    {
      const L = V.landBounds();
      const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
        for (const k of V.RES) V.res[k] = 9e5;
        if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
      for (let i = 0; i < 4; i++) seat('house');
      for (let i = 0; i < 3; i++) seat('farm');
      for (let i = 0; i < 3; i++) seat('lumber');
      seat('store');
      for (let i = 0; i < 14; i++) seat('path');
      for (const p of V.placed) { p.t = 1; p.build = 0; }
      V.rebuildStores(); V.rebuildPaths(); V.rebuildCharm();
      for (let i = 0; i < 90; i++) V.step(1 / 30);
    }
    const walkers = V.placed.filter(p => V.routeLine(p));
    if (walkers.length < 3) { fails.push('the route check only raised ' + walkers.length + ' workplaces that walk'); return { walkers: walkers.length, fails }; }

    /* 1. the line and the price sample the same journey. */
    let apart = 0, worst = 0;
    for (const p of walkers) {
      const l = V.routeLine(p);
      let hits = 0;
      for (let i = 0; i < V.ROUTE_STEPS; i++) {
        const fm = (i + 0.5) / V.ROUTE_STEPS;
        if (V.onPath(l.from.x + (l.to.x - l.from.x) * fm, l.from.y + (l.to.y - l.from.y) * fm)) hits++;
      }
      const drawn = hits / V.ROUTE_STEPS, priced = V.routeOf(p).paved;
      const gap = Math.abs(drawn - priced);
      if (gap > 0.12) { apart++; if (gap > worst) worst = gap; }
    }
    if (apart)
      fails.push(apart + ' of ' + walkers.length + ' routes are drawn along a different line from the one'
        + ' the delivery figure is worked out on (paved share out by up to ' + Math.round(worst * 100)
        + ' points), so the roads it tells you to lay are not the roads it would pay you for');

    /* 2. drawn for what walks, and for nothing else. */
    const wrong = V.placed.filter(p => {
      const b = V.B(p.key), should = V.established(p) && !V.storesItself(p.key) && !!b.makes && !!b.jobs;
      return should !== !!V.routeLine(p);
    });
    if (wrong.length)
      fails.push(wrong.length + ' buildings disagree about whether they walk anywhere: '
        + wrong.slice(0, 3).map(p => p.key).join(', '));

    /* 3. shown when a road is in hand, and when a panel is open, and not
       otherwise -- a village permanently criss-crossed with lines is a village
       nobody can look at. */
    V.sel = null; V.moving = null; V.panel = null; V.ghost = null;
    if (V.routesShown()) fails.push('the routes are drawn over the village when nothing has been asked');
    V.barMode = 'decor'; V.sel = 'path';
    const withRoad = V.routesShown();
    if (!withRoad || withRoad.list.length < walkers.length)
      fails.push('picking up a road shows ' + (withRoad ? withRoad.list.length : 0)
        + ' routes where ' + walkers.length + ' workplaces walk, so the one question a road asks is half answered');
    V.sel = 'statue';
    if (V.routesShown()) fails.push('a statue in hand draws the walking routes, which have nothing to do with it');
    V.sel = null; V.panel = walkers[0].id;
    const onPanel = V.routesShown();
    if (!onPanel || onPanel.list.length !== 1)
      fails.push('opening one workplace draws ' + (onPanel ? onPanel.list.length : 0) + ' routes rather than its own');
    V.panel = null;

    /* 4. and it can be seen at any zoom, which means a width on the GLASS. */
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    /* drawRoutes on its own, not a whole frame.

       Measuring the whole frame measures the widest stroke in it, which is
       whatever the well ring or a badge happens to be doing, and the route
       can then be narrowed to nothing without the figure moving. And the
       NARROWEST of the route's own strokes is the one that decides whether it
       reads: this draws a dark run under a coloured one, and either of them
       left in world units is a line that vanishes at the far zoom while the
       other covers for it. */
    const widthsAt = z => {
      V.CAM.z = z; V.barMode = 'decor'; V.sel = 'path'; V.step(0.001);
      const seen = [];
      const os = ctx.stroke.bind(ctx);
      ctx.stroke = function (...a) { seen.push(ctx.lineWidth * V.camScale()); return os(...a); };
      try { V.drawRoutes(); } finally { ctx.stroke = os; }
      return seen.length ? { lo: Math.min(...seen), hi: Math.max(...seen) } : { lo: 0, hi: 0 };
    };
    const out = widthsAt(V.ZMIN), near = widthsAt(V.ZMAX);
    V.CAM.z = 1; V.sel = null; V.barMode = 'build'; V.step(0.001);
    if (out.lo < 8)
      fails.push('zoomed out, the thinnest stroke a route is drawn with is ' + out.lo.toFixed(1)
        + ' screen pixels, so it cannot be seen at the zoom somebody plans a road at');
    if (near.lo > out.lo * 1.4 || out.lo > near.lo * 1.4)
      fails.push('a route stroke is ' + out.lo.toFixed(1) + ' screen pixels zoomed out and '
        + near.lo.toFixed(1) + ' zoomed in, so its width is in world units and the camera decides'
        + ' whether it can be read');

    return { walkers: walkers.length, out: +out.lo.toFixed(1), near: +near.lo.toFixed(1), fails };
  };



  /* ---------- every kind of goods the village keeps is really kept ----------

     There is now a LIST of them, and sixteen loops and twenty-two labels take
     their lead from it. That is the point of the list, and it is also a new
     way to be wrong: a kind named there and nowhere else.

     Demonstrated before this was written. Add a third kind to the list and
     nothing else, and the loops dutifully walk it -- res.stone and caps.stone
     come out as null, which is not a number, not an error, and not zero. Every
     sweep in this file passed. A null cap means nothing is ever full, a null
     store means every comparison against it is false, and a save writes null
     and reads it back unchanged. It would have been found weeks later by a
     barn that never filled.

     And the other direction, which is a typo rather than an omission: a cost
     written against a kind that does not exist. `cost: { stonee: 60 }` is not
     an error either -- it is a building that is free, with a price nobody can
     read, because every lookup of it returns undefined. The tables that name
     goods are the buildings, the hall's upgrades, the land rings and the
     goals' rewards, and all four are checked against the list. */
  window.goodsSweep = function () {
    const V = window.__v, fails = [];
    const RES = V.RES || [];
    const known = new Set(RES);

    /* 1. the list itself. */
    if (!RES.length) fails.push('the village keeps no kinds of goods at all');
    if (known.size !== RES.length) fails.push('a kind of goods is named twice in the list: ' + RES.join(', '));
    for (const k of RES) {
      if (typeof k !== 'string' || !k) { fails.push('a kind of goods has no name'); continue; }
      if (!V.RES_ICON || !V.RES_ICON[k]) fails.push(k + ' has no icon, so every label that names it prints undefined');
      if (!V.RES_TINT || !V.RES_TINT[k]) fails.push(k + ' has no colour, so the figures over a storehouse are drawn in it');
    }

    /* 2. and the stores really hold each of them. A number, not a null: the
       whole of this check is that 'typeof null' is not 'number' and that
       nothing else in the game would ever have said so. */
    V.step(0.001);
    for (const k of RES) {
      if (!Number.isFinite(V.res[k]))
        fails.push('the village holds ' + JSON.stringify(V.res[k]) + ' ' + k + ', which is not a number');
      if (!Number.isFinite(V.caps[k]) || V.caps[k] < 1)
        fails.push('the barns hold ' + JSON.stringify(V.caps[k]) + ' ' + k + ', so it can never be full');
    }

    /* 3. a save keeps every one of them. The loop that writes the stores and
       the loop that reads them back are two different loops over the same
       list, and a kind added to one and not the other loses everything the
       player had of it on the next reload. */
    {
      const before = {};
      for (const k of RES) before[k] = V.res[k] = Math.min(V.caps[k] || 1, 37 + RES.indexOf(k) * 11);
      V.save(); V.load();
      for (const k of RES) {
        if (!Number.isFinite(V.res[k]) || Math.abs(V.res[k] - before[k]) > 0.51)
          fails.push(k + ' went in at ' + before[k] + ' and came back as ' + JSON.stringify(V.res[k])
            + ', so a reload loses it');
      }
    }

    /* 4. and a load puts back no more than the barns can hold.

       There is a third loop over the same list, after the stores are read,
       that clamps each of them to its ceiling -- the one thing standing
       between a save written when the village had four storehouses and the
       same village after three of them were sold. A kind missing from THAT
       loop keeps whatever was in the file for ever, and the barn it belongs
       to never reads full again.

       Asked with the stores deliberately over the top, which is a state the
       game does reach -- selling a storehouse drops the ceiling under what is
       already in it -- and never a state it should come back from a load in. */
    {
      for (const k of RES) V.res[k] = (V.caps[k] || 1) * 2 + 500;
      V.save(); V.load();
      for (const k of RES) {
        if (Number.isFinite(V.res[k]) && Number.isFinite(V.caps[k]) && V.res[k] > V.caps[k] + 0.51)
          fails.push('a save holding twice the ' + k + ' the barns allow came back holding '
            + V.res[k].toFixed(0) + ' of it, against a ceiling of ' + V.caps[k]);
      }
    }

    /* 5. and nothing names goods the village does not keep. */
    let named = 0;
    const check = (where, obj) => {
      if (!obj) return;
      for (const k of Object.keys(obj)) {
        named++;
        if (!known.has(k)) fails.push(where + ' names "' + k + '", which is not a kind of goods this village keeps');
      }
    };
    for (const b of V.BUILDINGS) {
      check('the ' + b.key + "'s price", b.cost);
      check('what the ' + b.key + ' makes', b.makes);
      check('what the ' + b.key + ' holds', b.caps);
    }
    for (let i = 1; i < V.HALL.length; i++) check('hall level ' + i + "'s upgrade", V.HALL[i] && V.HALL[i].up);
    for (let i = 0; i < V.LAND.length; i++) check('land ring ' + i, V.LAND[i] && V.LAND[i].cost);
    for (const g of V.GOALS) check('the reward for "' + String(g.text).slice(0, 28) + '"', g.give);
    if (named < 20) fails.push('only ' + named + ' prices were read, so the check proves little');

    /* 4. and everything that READS them reads all of them.

       Sections 1-3 hold the writers to the list. The readers were not held to
       anything, and three of them had stopped at two: the shipping goal summed
       wood and food, the strip and the hall printed wood and food, so stone
       sent over the water -- a fifth of what a finished village ships -- was
       kept in the save and never counted or shown. And the hall's "stores
       full" chose between "stores" and one icon by asking for exactly two
       full, which with three kinds named one barn of three when all were full
       and all three when two were.

       So each kind is shipped ALONE, and must turn up in the strip and the
       hall and move the goal; and each set of full barns must be named as
       exactly that set. */
    {
      const ctx = document.querySelector('canvas').getContext('2d'), oF = ctx.fillText;
      const grab = () => { const lines = [];
        ctx.fillText = function (t, ...a) { lines.push(String(t)); return oF.call(this, t, ...a); };
        try { V.draw(); } finally { ctx.fillText = oF; }
        return lines; };
      const keep = { shared: { ...V.sharedTotal }, goal: V.goalIdx, panel: V.panel, res: { ...V.res },
        seen: V.tutSeen.slice() };
      const hall = V.hallOf();
      /* Every first-time hint read, or the hint takes the strip's place and
         the strip has nothing to be tested on. */
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      const quiet = () => { V.goalDone = null; V.finished = null; V.away = null; V.claimAsk = false; V.sel = null; };
      try {
        V.goalIdx = V.GOALS.length;                   // the first goal past the ladder ships
        quiet();
        for (const k of RES) {
          const only = {}; for (const k2 of RES) only[k2] = 0;
          only[k] = 1234; V.sharedTotal = only;
          V.panel = null; V.step(0.001); quiet();
          const icon = V.RES_ICON[k];
          if (!grab().some(t => /shipped/.test(t) && t.includes(icon)))
            fails.push('with only ' + k + ' sent over the water, the goal strip does not show it');
          V.panel = hall ? hall.id : null; V.step(0.001); quiet();
          if (!grab().some(t => /\bshared\b/.test(t) && t.includes(icon)))
            fails.push('with only ' + k + ' sent over the water, the hall does not show it');
          only[k] = 1e14; V.sharedTotal = only;
          if (!V.currentGoal().done())
            fails.push('a hundred trillion ' + k + ' sent over the water does not finish "' + V.currentGoal().text + '"');
        }
        /* The full barns, named as the set they are, in a village with goals
           left -- a finished one reports what it shared instead. */
        V.goalIdx = 0; V.sharedTotal = { ...keep.shared }; quiet();
        const sets = [];
        for (let m = 1; m < (1 << RES.length); m++) sets.push(RES.filter((k, i) => m & (1 << i)));
        for (const set of sets) {
          for (const k of RES) V.res[k] = set.includes(k) ? V.caps[k] : 0;
          V.panel = hall ? hall.id : null; V.step(0.001); quiet();
          for (const k of RES) V.res[k] = set.includes(k) ? V.caps[k] : 0;
          const line = grab().find(t => / full — /.test(t));
          if (!line) { fails.push('with ' + set.join(' and ') + ' full, the hall did not say so'); continue; }
          const named = RES.filter(k => line.includes(V.RES_ICON[k]));
          const ok = set.length === RES.length ? /\bstores full/.test(line) && !named.length
            : named.length === set.length && set.every(k => named.includes(k));
          if (!ok) fails.push('with ' + set.join(' and ') + ' full, the hall says "' + line + '"');
        }
      } finally {
        V.sharedTotal = keep.shared; V.goalIdx = keep.goal; V.panel = keep.panel;
        for (const k of RES) V.res[k] = keep.res[k];
        V.tutSeen.length = 0; V.tutSeen.push(...keep.seen);
        quiet(); V.step(0.001);
      }
    }

    /* 5. and the pills along the top show exactly the kinds that mean
       something: every kind the village holds or could make has one, and a
       kind it neither holds nor can make yet has none -- a new village's first
       screen spent a whole row on "0/300 idle" for stone it could not touch.
       The first half is the one that must never break: hiding a kind the
       player has is far worse than showing one they do not. */
    {
      const ctx = document.querySelector('canvas').getContext('2d'), oF = ctx.fillText;
      const icons = () => { const lines = [];
        ctx.fillText = function (t, ...a) { lines.push(String(t)); return oF.call(this, t, ...a); };
        try { V.draw(); } finally { ctx.fillText = oF; }
        /* A pill draws its icon and then its amount, "25/1380"; the same icon
           on a price in the tray is followed by something else. */
        return RES.filter(k => lines.some((t, i) => t === V.RES_ICON[k] && /^\d+\/\d+$/.test(lines[i + 1] || ''))); };
      const hall = V.hallOf();
      const keep = { lvl: hall && hall.lvl, res: { ...V.res }, seen: V.tutSeen.slice(), panel: V.panel };
      const makeable = k => V.BUILDINGS.some(b => b.makes && b.makes[k] && V.unlocked(b.key));
      try {
        V.panel = null; V.sel = null; V.away = null; V.goalDone = null; V.finished = null;
        for (const lvl of [1, 2, 3, 5]) for (const holding of [false, true]) {
          if (!hall) break;
          hall.lvl = lvl; hall.t = 1; V.step(0.001);
          for (const k of RES) V.res[k] = holding ? 25 : 0;
          V.step(0.001);
          for (const k of RES) V.res[k] = holding ? 25 : 0;
          const shown = icons();
          for (const k of RES) {
            const ought = holding || makeable(k);
            if (ought && !shown.includes(k))
              fails.push('at hall ' + lvl + (holding ? ' holding some ' : ' able to make ') + k + ', there is no ' + k + ' pill');
            if (!ought && shown.includes(k))
              fails.push('at hall ' + lvl + ' with no ' + k + ' and nothing to make it, there is a ' + k + ' pill anyway');
          }
        }
      } finally {
        if (hall) hall.lvl = keep.lvl;
        for (const k of RES) V.res[k] = keep.res[k];
        V.panel = keep.panel; V.step(0.001);
      }
    }

    /* 6. and no card asks for a kind the village cannot make yet as though it
       were a shortfall. A statue is on the decorate tray from the first
       minute and cost "−🪨80" there -- short of stone a village cannot make
       until its hall allows a quarry, with no pill and no building to explain
       it. Such a card names the hall level that unlocks the kind instead. */
    {
      const ctx = document.querySelector('canvas').getContext('2d'), oF = ctx.fillText;
      const grab = () => { const lines = [];
        ctx.fillText = function (t, ...a) { lines.push(String(t)); return oF.call(this, t, ...a); };
        try { V.draw(); } finally { ctx.fillText = oF; }
        return lines; };
      const hall = V.hallOf();
      const keep = { lvl: hall && hall.lvl, res: { ...V.res }, mode: V.barMode, panel: V.panel };
      const makeable = k => V.BUILDINGS.some(b => b.makes && b.makes[k] && V.unlocked(b.key));
      let looked = 0;
      try {
        V.panel = null; V.sel = null; V.ghost = null; V.away = null; V.goalDone = null; V.finished = null;
        for (let lvl = 1; lvl <= 5 && hall; lvl++) for (const mode of ['build', 'decor']) {
          hall.lvl = lvl; hall.t = 1; V.barMode = mode; V.step(0.001);
          for (const k of RES) V.res[k] = 0;
          const lines = grab(); looked++;
          for (const k of RES) {
            if (makeable(k)) continue;
            const bad = lines.filter(t => t.startsWith('−' + V.RES_ICON[k]));
            if (bad.length)
              fails.push('at hall ' + lvl + ' the ' + mode + ' tray shows "' + bad[0] + '", a shortfall in '
                + k + ' that nothing the village can build yet will make');
          }
        }
      } finally {
        if (hall) hall.lvl = keep.lvl;
        for (const k of RES) V.res[k] = keep.res[k];
        V.barMode = keep.mode; V.panel = keep.panel; V.step(0.001);
      }
      if (!looked) fails.push('the unmakeable-shortfall check looked at no trays');
    }

    return { kinds: RES.slice(), named, fails };
  };
  /* ---------- a card has room for its own words, and for a finger ----------

     The build tray divides a fixed 1024 between however many kinds the hall
     has unlocked. Every figure written down about it -- a 118.4 pixel budget,
     'no spare' at 103.1, a shortfall at 99.2 -- was measured when SEVEN kinds
     could be unlocked. The beacon made eight and nobody measured again.

     Nothing else in this file can see it. textSweep checks the screen edge, and
     a tray card is nowhere near one; it checks text against text, and a price
     that runs out of its button lands on the GAP between buttons, not on its
     neighbour's words. traySweep checks the arithmetic of the same rows and
     never asks how wide they came out. So the one question that matters here
     -- does the writing stay inside the card it was drawn into -- was asked by
     hand, once, against a tray that has since grown.

     Two measurements, both of them about the card rather than the screen:
     every HUD string drawn into a card lies within that card's own sides, and
     every card is still big enough for a finger. The second is the quieter of
     the two -- a button can shrink a long way before it looks wrong and still
     be under what either platform asks of a touch target. */
  window.roomSweep = function () {
    const V = window.__v, cv = document.querySelector('canvas'), ctx = cv.getContext('2d');
    const fails = [];
    /* One complaint per fault. Eight cards on one tray that is too small is
       one fault, and eight copies of that sentence pushed the OTHER fault --
       a different measurement of the same tray -- off the end of the list. */
    const said = new Set();
    const note = (sig, msg) => { if (said.has(sig)) return; said.add(sig); fails.push(msg); };
    const keep = { w: window.innerWidth, h: window.innerHeight, bar: V.barMode,
                   panel: V.panel, sel: V.sel, ask: V.claimAsk, goal: V.goalIdx };

    /* Everything the hall allows, at level five, with the goals finished -- so
       the beacon is on the tray too. The longest prices in the game are on the
       last kinds to appear, and a tray that is never filled cannot overflow. */
    const scene = (lvl, done, fill) => {
      V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
      V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.sel = null;
      V.who = null; V.moving = null; V.claimAsk = false; V.orders = [];
      V.goalIdx = done ? V.GOALS.length : 1;
      V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
      V.ensureHall(); V.placed[0].lvl = lvl; V.placed[0].t = 1;
      /* Two markets, because the board is three stalls plus one per market and
         the narrowest stall is the one to measure -- five of them.

         And, when asked for, every kind up to its allowance: that is the state
         the card prints a LOCK row in, '12/12 (lock)' rather than a price, and
         it is the one most of a long game is played in. An empty village never
         prints it, and an empty village is all this had been looking at. */
      const want = fill ? Object.entries(V.HALL[lvl].allow) : (lvl >= 5 ? [['market', 2]] : []);
      if (want.length) {
        const L = V.landBounds();
        const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
          for (const k of V.RES) V.res[k] = 9e5;
          if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
        for (const [k, n] of want) while (V.countOf(k) < n) if (!seat(k)) break;
        for (const p of V.placed) { p.t = 1; p.build = 0; }
      }
      V.rebuildStores(); V.rebuildCharm();
    };

    /* One frame, and what the tray put on it. */
    const read = () => {
      const seen = [], orig = ctx.fillText.bind(ctx);
      ctx.fillText = function (t, x, y, ...rest) {
        const m = ctx.getTransform();
        const isHud = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6
          && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6 && Math.abs(m.e) < 1e-6;
        if (isHud && String(t).trim()) {
          const wid = ctx.measureText(t).width, a = ctx.textAlign;
          const x0 = a === 'center' ? x - wid / 2 : a === 'right' ? x - wid : x;
          seen.push({ t: String(t).slice(0, 24), x0, x1: x0 + wid, y, px: parseFloat(ctx.font) || 16 });
        }
        return orig(t, x, y, ...rest);
      };
      V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
      try { V.step(0.001); V.draw(); } finally { ctx.fillText = orig; }
      return seen;
    };

    const cards0 = () => V.buildList().length + ',' + V.decorList().length;
    let cardsSeen = 0, rowsSeen = 0;
    let widest = null, smallest = null;
    /* Where the tabs are. They are the control the player presses to change
       trays, so they may not MOVE when the tray changes -- a tab that slides
       out from under the finger pressing it gets pressed twice. Between
       VILLAGES they are free to move: the band grows as the hall unlocks more
       kinds, which happens while nobody is touching it. */
    let tabAt = null, lastTabs = null;
    const SHAPES = [[360, 780], [360, 640], [390, 844], [1200, 800]];
    try {
      for (const [sw, sh] of SHAPES) {
        asScreen(sw, sh);
          /* Three villages, because the strip's shape is not a function of the
             hall alone. A full hall with the goals UNFINISHED is the one state
             where the board can reach five stalls while the build tray is
             still seven kinds -- the beacon arrives with the last goal -- and
             it is the only state in which the stalls, rather than the
             buildings, decide how tall the band has to be. */
        for (const [lvl, done, fill] of [[3, true], [5, true], [5, false], [5, true, true]]) {
          scene(lvl, done, fill);
          tabAt = null;
          /* The orders tray too. It is on the same strip, laid out by the same
             code, and it carries the longest line in the game: a finished
             village reads 'to the neighbours' on every card on the board, and
             no drawing check had ever opened that tray in a finished village. */
          for (const mode of ['build', 'decor', 'orders']) {
            V.barMode = mode;
            if (mode === 'orders') {
              V.orders.length = 0;
              let guard = 0;
              /* Some filled and some not, so the empty stall's own words -- it
                 has three of them and a clock -- are measured as well. */
              while (V.orders.length < Math.max(1, V.orderSlots()) - 1 && guard++ < 40) {
                V.orderT = 1e6; V.step(1 / 30);
              }
            }
            /* A full purse shows prices, an empty one shows shortfalls, and the
               shortfall is the WIDER of the two -- it carries a minus sign the
               price does not. Both, because only one of them is on screen at a
               time and either can overflow. */
            for (const [tag, purse] of [['a full purse', 9e5], ['an empty one', 0]]) {
              for (const k of Object.keys(V.res)) V.res[k] = purse;
              const seen = read();
              {
                const t = V.tabRects()[0];
                lastTabs = +t.y.toFixed(1);
                /* How much of the screen the strip has taken.

                   A tray that wraps can wrap too far, and nothing here could
                   see that: every card is bigger, every string fits, every
                   card clears the touch floor -- the layout passes its own
                   tests by overshooting them. It happened immediately. One
                   term in the fit test was about the card's HEIGHT, which no
                   number of rows can change, so it answered no for every row
                   count and the strip fell through to its maximum: three rows
                   on a desktop window where two were plenty, 27.7 per cent of
                   the canvas given to a tray.

                   So: the tabs, the band and the gap under it together, as a
                   share of the canvas. Two rows is 19 to 21 per cent at every
                   scale; three is 28. A quarter is the line. */
                const took = (V.stripBot() - (t.y - t.h / 2)) / cv.height;
                if (took > 0.25)
                  note('band|' + sw + 'x' + sh + '|' + cards0(),
                    'the tabs and the strip take ' + (took * 100).toFixed(1)
                    + ' per cent of the screen on a ' + sw + 'x' + sh + ' screen with '
                    + V.stripRows() + ' rows of cards, which is more of it than a tray may have');
                if (!tabAt) tabAt = { y: t.y, mode };
                else if (Math.abs(t.y - tabAt.y) > 0.5)
                  note('tabs|' + sw + 'x' + sh + '|' + lvl + '|' + done + '|' + !!fill,
                    'the tabs sit ' + Math.abs(t.y - tabAt.y).toFixed(0) + ' logical pixels apart'
                    + ' between the ' + tabAt.mode + ' tray and the ' + mode + ' tray on a '
                    + sw + 'x' + sh + ' screen, so pressing one moves it out from under the finger');
              }
              const cards = mode === 'orders'
                ? V.orderSlotRects().map((r, i) => ({ b: { key: 'stall ' + (i + 1) }, ...r }))
                : V.barRects();
              if (!cards.length) continue;
              for (const c of cards) {
                cardsSeen++;
                /* The HUD scale, asked of the card rather than written down: a
                   build card is 118 of these units tall. */
                const u = c.h / 118;
                /* Not the border -- the margin inside it. A card lays its rows
                   out with six units of clearance each side (the name asks the
                   fitter for w-12u, the cost rows for w-14u), and a row that
                   fills the button edge to edge has not overflowed so much as
                   run out of card: it touches the rounded border, and the next
                   digit would be outside. The border is the louder version of
                   the same fault and is reported as such. */
                const margin = 6 * u;
                const lo = c.x - c.w / 2 + margin, hi = c.x + c.w / 2 - margin;
                /* In CSS pixels on the screen being pretended at, which is the
                   unit both platforms' touch rules are written in.

                   The canvas keeps its own tall shape and is letterboxed into
                   whatever window it is given, so 'logical times screen width
                   over 1024' is only true while the canvas FILLS the width.
                   It does on a portrait phone, which is what that conversion
                   was written for and the only shape this app ships in --
                   portrait-locked. In a wide desktop window the canvas is
                   height-limited and a good deal narrower than the window, and
                   the same arithmetic reported a comfortable 160 CSS pixel
                   button as too small to hit. */
                const k = Math.min(sw / 1024, sh / cv.height);
                /* A per cent of slack, because the canvas height is ROUNDED to
                   whole pixels: a portrait phone the canvas is cut exactly to
                   came out a fifty-thousandth height-limited, and the one shape
                   these figures are quoted on excused itself from the check. */
                const fillsWidth = sw / 1024 <= (sh / cv.height) * 1.01;
                const cssW = c.w * k, cssH = c.h * k, floorCss = V.TOUCH_MIN * k;
                if (fillsWidth && (!smallest || cssW < smallest.css))
                  smallest = { css: +cssW.toFixed(1), key: c.b.key, n: cards.length, sw, sh };
                if (fillsWidth && Math.min(cssW, cssH) < floorCss - 0.01)
                  note('touch|' + mode + '|' + cards.length + '|' + sw + 'x' + sh,
                    'a ' + mode + ' card is ' + cssW.toFixed(1) + 'x' + cssH.toFixed(1)
                    + ' CSS pixels with ' + cards.length + ' kinds on the tray on a ' + sw + 'x' + sh
                    + ' screen, under the ' + floorCss.toFixed(0) + ' this game holds itself to');
                for (const r of seen) {
                  if (Math.abs(r.y - c.y) > c.h / 2 + r.px) continue;
                  /* Each tray row is centred on its own card, so the nearest
                     centre is the card it belongs to -- no guessing from the
                     bounds, which is what overflowing text has already left.

                     Nearest among the cards at that HEIGHT, which matters the
                     moment the tray has more than one row: two cards one above
                     the other share an x, so picking by x alone handed every
                     string on the top row to the card below it, which then
                     rejected it for being at the wrong height. Two hundred
                     rows quietly stopped being measured -- a checker losing
                     its subject at exactly the moment the thing it checks got
                     more complicated. */
                  const mid = (r.x0 + r.x1) / 2;
                  let own = null;
                  for (const q of cards) {
                    if (Math.abs(r.y - q.y) > q.h / 2 + r.px) continue;
                    if (!own || Math.abs(mid - q.x) < Math.abs(mid - own.x)) own = q;
                  }
                  if (own !== c) continue;
                  rowsSeen++;
                  const over = Math.max(lo - r.x0, r.x1 - hi);
                  const past = Math.max(c.x - c.w / 2 - r.x0, r.x1 - (c.x + c.w / 2));
                  if (!widest || over > widest.over)
                    widest = { over: +over.toFixed(1), past: +past.toFixed(1), t: r.t,
                               key: c.b.key, n: cards.length, sw, sh, tag };
                  if (past > 1)
                    note('past|' + c.b.key + '|' + cards.length + '|' + sw + 'x' + sh,
                      'with ' + cards.length + ' kinds on the tray and ' + tag + ', the '
                      + c.b.key + " card draws '" + r.t + "' " + past.toFixed(1)
                      + ' logical pixels past its own border on a ' + sw + 'x' + sh + ' screen');
                  else if (over > 1)
                    note('margin|' + c.b.key + '|' + cards.length + '|' + sw + 'x' + sh,
                      'with ' + cards.length + ' kinds on the tray and ' + tag + ', the '
                      + c.b.key + " card fills itself edge to edge with '" + r.t + "' -- "
                      + over.toFixed(1) + ' logical pixels into the margin it lays its own rows out with,'
                      + ' on a ' + sw + 'x' + sh + ' screen');
                }
              }
            }
          }
        }
      }
    } finally {
      asScreen(keep.w, keep.h);
      V.barMode = keep.bar; V.panel = keep.panel; V.sel = keep.sel;
      V.claimAsk = keep.ask; V.goalIdx = keep.goal;
      V.step(0.001);
    }

    /* A checker that read nothing passes for the wrong reason. */
    if (cardsSeen < 240) fails.push('only ' + cardsSeen + ' cards were laid out, so almost nothing was measured');
    if (rowsSeen < 600) fails.push('only ' + rowsSeen + ' pieces of card writing were read, so almost nothing was measured');

    return { cards: cardsSeen, rows: rowsSeen, widestOverflow: widest, smallestCard: smallest,
             tabs: lastTabs, fails };
  };
  /* ---------- the time of year ----------

     Four palettes on a date. The whole value of it is that somebody opening
     the game in October can SEE that it is October, so the check that matters
     is the one nothing else in this file does: look at the pixels and make
     sure the four seasons are actually different on screen.

     That check earned its place immediately. The first version of this tinted
     the ground and the trees, which is the obvious half and reads beautifully
     on a bare island. Measured over a FINISHED village -- fifty-two buildings,
     which is what this looks like after a few hours and the state most people
     will be in when a season turns -- high summer and deep winter were two per
     cent apart. There is no grass left to tint. It would have shipped as a
     feature that did nothing, and every other kind of test would have passed:
     the dates were right, the tints were right, the cache worked.

     And the opposite failure, which is just as quiet: a season must not reach
     the ECONOMY. It is a wash over some sprites. If a village delivers a
     different number of logs a second in February, something has leaked. */
  window.seasonSweep = function () {
    const V = window.__v, fails = [];
    const cv = document.querySelector('canvas'), ctx = cv.getContext('2d');

    /* 1. every month belongs to a season, and the table is the right shape. */
    if (V.SEASONS.length !== 4) fails.push('there are ' + V.SEASONS.length + ' seasons');
    if (V.SEASON_OF.length !== 12) fails.push('the month table has ' + V.SEASON_OF.length + ' entries');
    const seen = new Set();
    for (let m = 0; m < 12; m++) {
      const i = V.SEASON_OF[m];
      if (!(i >= 0 && i < V.SEASONS.length)) { fails.push('month ' + m + ' maps to season ' + i); continue; }
      seen.add(i);
    }
    if (seen.size !== V.SEASONS.length)
      fails.push('the year only ever reaches ' + seen.size + ' of the ' + V.SEASONS.length
        + ' seasons, so one of them is written and never shown');
    for (const sea of V.SEASONS)
      if (!sea.ground || !sea.leaf || !sea.build)
        fails.push(sea.name + ' is missing one of its three tints, so part of the village will not turn');

    /* 2. a built village looks different in each of them. */
    V.placed.length = 0; V.villagers.length = 0; V.landTier = V.LAND_MAX; V.coverPlaced();
    V.away = null; V.goalDone = null; V.finished = null; V.panel = null; V.who = null;
    V.sel = null; V.moving = null; V.claimAsk = false; V.orders = []; V.barMode = 'build';
    V.goalIdx = V.GOALS.length; V.tutSeen.length = 0; for (const h of V.TUT) V.tutSeen.push(h.id);
    V.ensureHall(); V.placed[0].lvl = 5; V.placed[0].t = 1;
    {
      const L = V.landBounds();
      const seat = k => { for (let r = L.lo; r <= L.hi; r++) for (let c = L.lo; c <= L.hi; c++) {
        for (const k of V.RES) V.res[k] = 9e5;
        if (V.canPlace(k, c, r, V.occupied()) && V.place(k, c, r)) return true; } return false; };
      for (let i = 0; i < 10; i++) seat('house');
      for (let i = 0; i < 5; i++) seat('farm');
      for (let i = 0; i < 5; i++) seat('lumber');
      for (let i = 0; i < 3; i++) seat('store');
      for (const p of V.placed) { p.t = 1; p.build = 0; }
      V.rebuildStores(); V.rebuildCharm();
      for (let i = 0; i < 60; i++) V.step(1 / 30);
    }

    const realNow = Date.now;
    const keepZ = V.CAM.z, keepX = V.CAM.x, keepY = V.CAM.y, keepForced = V.seasonForced;
    let shades = [];
    try {
      /* Noon, so the day's own light is not what is being compared. */
      Date.now = () => 0.25 * V.DAY_MS;
      V.camFit(true);
      for (let i = 0; i < 40; i++) V.step(1 / 30);
      /* The island only. Over the whole canvas the sea -- which no season
         touches -- drowns the difference, and a check that measures mostly sea
         cannot tell a working season from a broken one. */
      /* camProject answers in the space the game draws in; getImageData reads
         CANVAS ROWS, and on a screen taller than the logical 1536 the two are
         a letterbox offset apart. Taking one for the other read a patch 342
         rows above the island on a 360x780 phone, where 28% of what came back
         was sea -- which no season tints, so it dragged every average towards
         the same blue and the closest pair came out 3.4 shades apart against a
         floor of 4. The seasons were drawn exactly as strongly as on a desktop:
         measured with the offset put back, the same village on the same phone
         reads 0.4% sea and 10.7 shades, which is the desktop figure to within
         a hundredth. A checker reading the wrong part of the screen, not a
         season nobody can see.

         x needs no such correction: the canvas is 1024 across and the HUD is
         not translated sideways, so the two spaces already agree there. */
      const OY = Math.round((cv.height - 1536) / 2);
      const pts = [V.tileToWorld(0, 0), V.tileToWorld(V.GW - 1, 0),
                   V.tileToWorld(V.GW - 1, V.GH - 1), V.tileToWorld(0, V.GH - 1)]
        .map(p => V.camProject(p.x, p.y));
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y + OY);
      const x = Math.max(0, Math.round(Math.min(...xs))), y = Math.max(0, Math.round(Math.min(...ys)));
      let w = Math.min(cv.width - x, Math.round(Math.max(...xs) - Math.min(...xs)));
      let h = Math.min(cv.height - y, Math.round(Math.max(...ys) - Math.min(...ys)));
      if (w < 50 || h < 50) { fails.push('the island came out ' + w + 'x' + h + ' on screen, too small to measure'); return { fails }; }
      /* A patch of the island rather than all of it. Reading back a thousand
         by seven hundred pixels four times is a GPU round trip the size of the
         frame, and in the throttled hidden tab the battery actually runs in it
         took long enough to look like a hang. A quarter of the island through
         the middle answers the same question for a fortieth of the cost. */
      const cxm = x + w / 2, cym = y + h / 2;
      const pw = Math.min(w, 320), ph = Math.min(h, 240);
      const px = Math.max(0, Math.round(cxm - pw / 2)), py = Math.max(0, Math.round(cym - ph / 2));
      const shade = () => {
        const d = ctx.getImageData(px, py, pw, ph).data;
        let r = 0, g2 = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 7) { r += d[i]; g2 += d[i + 1]; b += d[i + 2]; n++; }
        return [r / n, g2 / n, b / n];
      };
      for (let i = 0; i < V.SEASONS.length; i++) {
        V.seasonForced = i;
        V.away = null; V.finished = null; V.goalDone = null; V.claimAsk = false;
        V.draw();
        shades.push(shade());
      }
    } finally {
      Date.now = realNow; V.seasonForced = keepForced;
      V.CAM.z = keepZ; V.CAM.x = keepX; V.CAM.y = keepY;
    }

    const apart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    const MIN_APART = 4;          // out of 255, averaged over the whole island
    let closest = Infinity, pair = '';
    for (let i = 0; i < shades.length; i++) for (let j = i + 1; j < shades.length; j++) {
      const d = apart(shades[i], shades[j]);
      if (d < closest) { closest = d; pair = V.SEASONS[i].name + ' and ' + V.SEASONS[j].name; }
    }
    if (closest < MIN_APART)
      fails.push(pair + ' are ' + closest.toFixed(1) + ' shades apart across the whole island'
        + ' (out of 255), which nobody will see -- the season is written down and not drawn');

    /* 3. and it is a wash, not a mechanic. */
    const rate = () => { let t = 0; for (const p of V.placed) { const b = V.B(p.key);
      if (b.makes && b.jobs) t += V.deliveredOf(p) * V.workersAt(p.id); } return t; };
    const keep2 = V.seasonForced;
    let base = null, drift = 0;
    try {
      for (let i = 0; i < V.SEASONS.length; i++) {
        V.seasonForced = i;
        const r = rate();
        if (base === null) base = r;
        else drift = Math.max(drift, Math.abs(r - base));
      }
    } finally { V.seasonForced = keep2; }
    if (drift > 1e-9)
      fails.push('the village delivers ' + drift.toFixed(4) + '/s more in one season than another,'
        + ' so the time of year has reached the economy');

    V.seasonForced = null;
    return { closest: +closest.toFixed(1), pair, shades: shades.map(c => c.map(v => Math.round(v)).join(',')), fails };
  };
  /* The battery runs with the browser's history neutralised, from the first
     sweep to the last.

     The game arms the hardware back button whenever anything is open and
     disarms it when nothing is, and disarming calls history.back(). A sweep
     opens and closes panels, trays, cards and dialogs hundreds of times, so a
     full battery is hundreds of pushState/back pairs -- and Chrome eventually
     says so out loud: 'Throttling navigation to prevent the browser from
     hanging'. Before it gets there the tab starts actually navigating, which
     wipes the page mid-run.

     That cost most of an afternoon, blamed on everything else first: a sweep
     reported the entire art tree missing from www/ because its forty-six
     fetches were cancelled by a navigation; two batteries died with their
     results on a page that no longer existed; and the pane went into what
     looked like an outside reload loop.

     whoSweep already stubbed these for itself, which fixed whoSweep and left
     every other sweep doing it. It belongs here, around all of them, because
     the thing being protected is the RUN, not the sweep. */
  /* Except for the one sweep whose SUBJECT is the back button.

     backSweep stubs these itself, to count how deep the history gets, and
     then drives real navigations through them. Handed a pair of no-ops it
     counts no-ops: it binds whatever it finds, so the stub below became the
     thing it was measuring, and it reported four failures about a back button
     that works perfectly. The real functions go back for the length of that
     sweep and the stub returns afterwards. */
  let realPush = null, realBack = null;
  const holdHistory = () => {
    if (realPush) return;
    realPush = history.pushState.bind(history); realBack = history.back.bind(history);
    history.pushState = () => {}; history.back = () => {};
  };
  const freeHistory = () => {
    if (!realPush) return;
    history.pushState = realPush; history.back = realBack;
    realPush = null; realBack = null;
  };
  window.allSweeps = async function (opts) {
    holdHistory();
    try { return await allSweepsBody(opts); }
    finally { freeHistory(); }
  };
  async function allSweepsBody(opts) {
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
      ['light', () => window.lightSweep()],
      ['ink', () => window.inkSweep()],
      ['still', () => window.stillSweep()],
      ['notch', () => window.notchSweep()],
      ['hue', () => window.hueSweep()],
      ['rate', () => window.rateSweep()],
      ['rescue', () => window.rescueSweep()],
      ['offline', () => window.offlineSweep()],
      ['taught', () => window.taughtSweep()],
      ['reward', () => window.rewardSweep()],
      ['trader', () => window.traderSweep()],
      ['share', () => window.shareSweep()],
      ['allow', () => window.allowSweep()],
      ['button', () => window.buttonSweep()],
      ['shape', () => window.shapeSweep()],
      ['chip', () => window.chipSweep()],
      ['price', () => window.priceSweep()],
      ['spot', () => window.spotSweep()],
      ['card', () => window.cardSweep()],
      ['mark', () => window.markSweep()],
      ['advice', () => window.adviceSweep()],
      ['land', () => window.landSweep()],
      ['confirm', () => window.confirmSweep()],
      ['pan', () => window.panSweep()],
      ['cost', () => window.costSweep()],
      ['art', () => window.artSweep()],
      ['beacon', () => window.beaconSweep()],
      ['name', () => window.nameSweep()],
      ['who', () => window.whoSweep()],
      ['find', () => window.findSweep()],
      ['route', () => window.routeSweep()],
      ['season', () => window.seasonSweep()],
      ['goods', () => window.goodsSweep()],
      ['room', () => window.roomSweep()],
      ['order', () => window.orderSweep()],
      ['trade', () => window.tradeSweep()],
      ['tap', () => window.tapSweep()],
      ['open', () => window.openSweep()],
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
    /* No guard here any more, and that is the fix rather than a removal.

       This used to hold the three save keys across the run and put them back
       in a finally. It worked, and it was the wrong shape: restoring after
       the fact is a race against an autosave that fires every five seconds,
       and it only ever covered the BATTERY. Running one sweep on its own --
       which is what mutation testing is -- had no guard at all, and destroyed
       a finished village twice.

       Every checker in this file is now wrapped at the bottom of it, and the
       wrapper moves the game's save keys somewhere else for the duration
       instead of copying files about. See there. */
    const detail = {}, failed = [];
    {
      const seenJob = new Set(), twice = [];
      for (const [name] of jobs) { if (seenJob.has(name)) twice.push(name); seenJob.add(name); }
      if (twice.length) failed.push('the job list names ' + twice.join(', ')
        + ' more than once, so one checker runs twice and its result stands in for another');
    }
    for (const [name, fn] of jobs) {
      const ownsHistory = name === 'back';
      if (ownsHistory) freeHistory();
      try { detail[name] = await fn(); } catch (e) { detail[name] = 'THREW ' + (e && e.message); }
      finally { if (ownsHistory) holdHistory(); }
      const bad = complaints(detail[name]);
      if (bad) failed.push(name + ': ' + (typeof bad === 'string' ? bad : bad));
      await new Promise(r => setTimeout(r, 20));
    }    /* Every checker in the harness is in the list above. The game itself has a
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

/* ---------- the player's village is not the harness's to spend ----------

   Every sweep that disturbs the save already copies it aside and writes it
   back. That was never enough, and it took two destroyed villages to see why.

   The GAME is still running underneath all of this. It autosaves every five
   seconds off whatever is in memory, and what is in memory during a sweep is
   a scratch village with fifty buildings dropped on it and its stores clamped
   to twenty. So a sweep restores the file, and three seconds later the game
   writes its scratch village straight back over it. Worse, the first autosave
   after a page load promotes the primary to the backup, so the one copy that
   could have rescued the village goes the same way inside five seconds.

   The battery grew a guard for this: hold the three keys, put them back in a
   finally. It worked and it was still the wrong shape, for two reasons. It is
   a RACE -- the guard restores at the end and the autosave fires throughout,
   so a page killed mid-run still loses everything. And it covered the battery
   only: calling one sweep from the console, which is exactly what mutation
   testing is, had no guard at all. A finished village was destroyed that way
   the day after the first guard shipped.

   So the game is pointed somewhere else instead. While a checker runs, KEY,
   KEY_BAK and KEY_OTHER name throwaway keys, and every save in the game --
   the autosave, the one after a goal, the ones the save sweep makes on
   purpose -- lands on a file nobody reads. The player's village is not
   protected from the writes, it is out of their reach. A page killed halfway
   through now loses nothing at all, because nothing was ever going to be
   written over in the first place.

   All three keys together. Moving the primary and leaving the backup behind
   would promote the scratch village into the player's backup on the very
   first autosave, which is the same hole in a smaller frame.

   Wrapped here, at the end of the file, rather than inside each checker:
   every one of them is covered including the ones nobody has written yet,
   which is the same reason the walk-cycle rule is named off the key rather
   than off a list kept by hand. */
/* The latch that used to be here was a flag on window, set the first time this
   file was evaluated and checked on the way in. It read like belt and braces
   and it was the hole.

   This file is not loaded once. Every sweep in it was written by fetching it
   into a page that was already running and evaluating it again -- that is the
   whole development loop, dozens of times an afternoon. The second evaluation
   redefines every checker on window and then, finding the flag already set,
   returns without wrapping any of them. So the guard covered exactly the
   sweeps that existed when the page last loaded, and never the one being
   worked on, which is the only one anybody runs on its own.

   It cost the test village: fifty-two buildings, every goal finished, four
   rings of land, built up across weeks of sessions, flattened by the first run
   of a brand-new checker that builds its own scene over the top. The guard's
   own comment promises it covers 'the ones nobody has written yet'. It covered
   them only if the page happened to be reloaded between writing one and
   running it, and nothing anywhere said so.

   The mark goes on the FUNCTION instead. A wrapper carries it and a fresh
   definition does not, so a re-evaluated file gets its checkers wrapped again
   and an already wrapped one is left alone -- and wrapping is no longer
   something that can only happen once in the life of a page. */
(function () {
  const V = window.__v;
  if (!V || !V.setSaveKeys) return;

  const SCRATCH = { key: 'vil_test', bak: 'vil_test_bak', other: 'vil_test_other' };
  const real = () => [V.SAVE_KEYS.key, V.SAVE_KEYS.bak, V.SAVE_KEYS.other];
  const readAll = () => real().map(k => { try { return localStorage.getItem(k); } catch (e) { return null; } });
  let depth = 0, heldBytes = null;

  function hold() {
    if (depth++) return;
    /* Written down first. What is in memory is the player's village and it
       may be ahead of the file by up to five seconds -- and for a player who
       has never saved, there is no file at all, so the restore at the end
       would have nothing to put back and would leave the scratch village in
       place. Their own village, through their own save path, at a moment when
       it is still theirs. */
    try { V.save(); } catch (e) {}
    /* All three, not just the primary. The comment above promises that moving
       the primary alone would let the first autosave promote the scratch
       village into the player's BACKUP -- and a check that watches only the
       primary cannot see that happen, which would have made this the second
       guard in a row to be weaker than its own description. */
    heldBytes = readAll();
    V.setSaveKeys(SCRATCH.key, SCRATCH.bak, SCRATCH.other);
  }

  /* Hands back a complaint, or null. */
  function release() {
    if (depth > 0) depth--;
    if (depth) return null;
    V.setSaveKeys(V.SAVE_KEYS.key, V.SAVE_KEYS.bak, V.SAVE_KEYS.other);
    /* Asked BEFORE the village is loaded back, so that what is proved is that
       nothing reached the real keys while the harness held them -- and not
       that the game afterwards happened to write something over them that
       matches. */
    const now = readAll();
    const touched = real().filter((k, i) => now[i] !== heldBytes[i]);
    const strayed = touched.length
      ? 'something wrote to ' + touched.join(', ') + ' while the harness was running,'
        + ' so the keys are not being held and the player\'s village is whatever the'
        + ' sweeps left behind'
      : null;
    try { V.load(); } catch (e) {}
    for (const k of [SCRATCH.key, SCRATCH.bak, SCRATCH.other]) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
    return strayed;
  }

  const finish = r => {
    const msg = release();
    if (r && typeof r === 'object') {
      r.saveGuard = msg ? 'FAILED' : 'held';
      /* Reported where it will be counted. allSweeps reads r.failed of its own
         result and r.fails of every checker's, and a guard that fails quietly
         is the one thing this must never be. */
      if (msg) {
        if (Array.isArray(r.failed)) r.failed.push(msg);
        else if (Array.isArray(r.fails)) r.fails.push(msg);
      }
    }
    return r;
  };

  /* ptrSweep is the game's own -- stale pointer records, nothing to do with
     testing -- and script-level declarations land on window, so it is named
     here rather than silently matched away. */
  const NOT_OURS = new Set(['ptrSweep']);
  const mine = k => typeof window[k] === 'function' && !window[k].__guarded
    && (k === 'fuzz' || k === 'allSweeps' || (k.slice(-5) === 'Sweep' && !NOT_OURS.has(k)));

  let wrapped = 0;
  for (const name of Object.keys(window)) {
    if (!mine(name)) continue;
    const inner = window[name];
    window[name] = function (...a) {
      hold();
      let out;
      try { out = inner.apply(this, a); } catch (e) { release(); throw e; }
      if (out && typeof out.then === 'function')
        return out.then(finish, e => { release(); throw e; });
      return finish(out);
    };
    window[name].__guarded = true;
    wrapped++;
  }
  /* And the same protection for a hand-written probe.

     Working out what a checker should measure means poking at the live game
     from the console -- clear the village, build a hall, set a level, draw a
     frame, read the pixels back. Every one of those is the same kind of write
     a sweep makes, and none of them is a sweep, so none of them was covered.
     That is the other half of how the test village was lost. A probe can now
     say so:

       __holdSave(); ...poke at the game...; __freeSave();

     or, for the common case, wrap the whole thing: __probe(() => { ... }). */
  window.__holdSave = hold;
  window.__freeSave = () => { release(); };
  window.__probe = fn => { hold(); try { return fn(); } finally { release(); } };
  console.log('save guard: ' + wrapped + ' checkers run on throwaway keys; the village is out of reach');
})();
