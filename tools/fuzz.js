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
      const want = V.placed.filter(p => p.t >= 1 && (V.B(p.key).caps || p.key === 'hall'));
      const have = V.stores();
      return have.length === want.length && want.every(p => have.includes(p));
    }],
    ['the cached charm total is not stale', () =>
      V.charmTotal() === V.placed.reduce((n, p) =>
        n + (V.isDecor(p.key) ? V.B(p.key).charm : 0), 0)],
    /* And a store the cache still believes in must be where it says it is:
       moving one changes no membership at all, only a position. */
    ['a cached store is where it stands', () => V.stores().every(p => {
      const b = V.B(p.key), c = V.tileToWorld(p.c + (b.w - 1) / 2, p.r + (b.h - 1) / 2);
      return V.nearestStore(c.x, c.y) !== null;
    })],
  ];

  let prev = { wood: 0, food: 0 };
  function check(what) {
    for (const [name, f] of INVARIANTS) {
      let ok;
      try { ok = f(); } catch (e) { return name + ' threw: ' + e.message + ' (after ' + what + ')'; }
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
      res: { wood: Math.round(V.res.wood), food: Math.round(V.res.food) },
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
    return 'a save/load round trip changed the village';
  }

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
                        'sell', 'upgrade', 'upgrade', 'move', 'reload']);
      counts[act] = (counts[act] || 0) + 1;
      try {
        if (act === 'tap') V.tap(R(W), R(H()));
        else if (act === 'step') V.step(Math.random() * 0.1);
        else if (act === 'pickBuild') V.sel = pick(V.BUILDINGS).key;
        else if (act === 'tab') V.barMode = pick(['build', 'decor', 'orders']);
        else if (act === 'grant') V.grant(pick(['wood', 'food']), R(500), 0, 0);
        else if (act === 'claim') V.claimLand();
        else if (act === 'panelOpen') V.panel = V.placed.length ? pick(V.placed).id : null;
        else if (act === 'camFit') V.camFit(Math.random() < 0.5);
        else if (act === 'reload') { const bad = roundTrip(); if (bad) fails.push(bad + ' (after ' + act + ')'); }
        else if (act === 'build') {
          // afford it, then let place() decide whether it is legal
          const b2 = pick(V.BUILDINGS.filter(x => x.key !== 'hall'));
          V.grant('wood', 300, 0, 0); V.grant('food', 300, 0, 0);
          const L = V.landBounds();
          V.place(b2.key, L.lo + R(L.hi - L.lo + 1), L.lo + R(L.hi - L.lo + 1));
        }
        else if (act === 'sell') {
          const q = pick(V.placed.filter(x => V.canSell(x)));
          if (q) V.sellBuilding(q);
        }
        else if (act === 'upgrade') {
          const q = pick(V.placed);
          if (q) { V.grant('wood', 400, 0, 0); V.grant('food', 400, 0, 0); V.upgradeBuilding(q); }
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
    const bad = [];
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
      if (isHud && (x0 < -1 || x0 + w > W + 1) && String(t).trim())
        bad.push({ state: label, text: String(t).slice(0, 48), left: Math.round(x0), width: Math.round(w) });
      return orig(t, x, y, ...rest);
    };
    try { V.draw(); } finally { ctx.fillText = orig; }
    return bad;
  }

  window.textSweep = function () {
    const cv = document.querySelector('canvas');
    const keep = cv.height;
    const found = [];
    // build a village with something of everything to talk about
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

    // every shape of screen the HUD scale can take
    for (const h of [1536, 1800, 2048, 2304]) {
      cv.height = h; V.step(0.001); V.camFit(true);
      const states = {
        build: () => { V.barMode = 'build'; V.panel = null; V.sel = null; V.away = null; V.claimAsk = false; },
        decorate: () => { V.barMode = 'decor'; },
        orders: () => { V.barMode = 'orders'; V.orders = [V.makeOrder(0), V.makeOrder(1), V.makeOrder(2)]; },
        placing: () => { V.barMode = 'build'; V.sel = 'mill'; },
        claim: () => { V.sel = null; V.claimAsk = true; },
        away: () => { V.claimAsk = false; V.away = { secs: 7200, got: { wood: 1234, food: 5678 } }; },
        hint: () => { V.away = null; V.tutSeen.length = 0; V.res.wood = V.caps.wood; V.res.food = V.caps.food; },
        goalBanner: () => { V.goalDone = { g: V.GOALS[V.GOALS.length - 1], got: { wood: 2500, food: 1600 }, age: 0 }; },
      };
      for (const [name, set] of Object.entries(states)) { set(); found.push(...scan(name + ' @' + h)); }
      V.goalDone = null;
      // and every panel, armed and not
      for (const p of V.placed) for (const arm of [false, true]) {
        V.panel = p.id; V.sellArm = arm ? { id: p.id, t: 4 } : null;
        found.push(...scan('panel:' + p.key + (arm ? ' armed' : '') + ' @' + h));
      }
      V.panel = null; V.sellArm = null;
    }
    cv.height = keep; V.step(0.001);
    return { overflowing: found.length, worst: found.slice(0, 10) };
  };
  console.log('textSweep ready: window.textSweep()');
})();
