/* Village — isometric base builder.
   Slice 1: the ground you build on. Iso grid, drag/pinch camera, tap-to-place,
   procedurally drawn buildings, two resources that actually tick, and a save.

   Engine conventions carried over from Gatestorm, because they were hard-won:
     - one definition drives BOTH drawing and hit-testing (camProject/camUnproject),
       so the picture and the touch regions cannot drift apart
     - taps fire on pointer UP with a dead zone, so a drag is not a tap; the drag
       flag lives on the POINTER, never globally, or one lost touch kills tapping
     - the world layer scales to COVER the canvas; the HUD is drawn separately at
       its own scale and anchored to the true canvas edges
*/
const cv = document.getElementById('c');
const g  = cv.getContext('2d');
const W = cv.width, H = cv.height;      // logical play area
let VH = H, OY = 0;                     // canvas height / letterbox offset

/* ---------- grid ---------- */
const GW = 14, GH = 14;                 // tiles
const TW = 128, TH = 64;                // iso tile width / height (2:1)
const ORIGIN = { x: W / 2, y: 300 };

const tileToWorld = (c, r) => ({
  x: ORIGIN.x + (c - r) * TW / 2,
  y: ORIGIN.y + (c + r) * TH / 2,
});
// inverse of the above: world point -> fractional tile
function worldToTile(x, y) {
  const dx = x - ORIGIN.x, dy = y - ORIGIN.y;
  return { c: (dy / TH + dx / TW), r: (dy / TH - dx / TW) };
}
/* Which tile a world point is IN.

   tileToWorld returns tile CENTRES -- tilePath draws its diamond centred on
   one -- so worldToTile gives coordinates centred on the tile too, and tile
   (5,7) spans 4.5..5.5. Rounding is therefore correct and flooring is off by
   half a tile: a point at 4.72 is inside tile 5, and floor called it 4.

   Everything that hit-tests the grid used floor, so every tap landed a tile
   up-left of where it looked whenever you touched the left half of a tile.
   This is the exact drift the project's own convention exists to prevent, so
   it now lives in one function that both sides call. */
const tileAt = (x, y) => { const t = worldToTile(x, y);
  return { c: Math.round(t.c), r: Math.round(t.r) }; };

/* ---------- sprites ---------- */
/* Villagers are three STANDING figures, not a walk cycle. Four frames that
   match each other will not come back from an image generator, and one good
   pose swayed and bobbed in code reads as walking at the size these are drawn.
   Each villager keeps its own index into this list. */
const VILLAGERS = ['villager_farmer', 'villager_basket', 'villager_woodcutter'];
const ready=im=>im&&im.complete&&im.naturalWidth>0;

/* Building artwork is OPTIONAL. If art/<key>.webp exists it is drawn; if it is
   missing or has not decoded yet the procedural version draws instead, so the
   game never shows a hole and art can arrive one file at a time.
   The .webp files are built from the PNG masters in art/original/ by
   tools/prep-art.js -- do not edit them by hand.
   Each sprite is anchored by the CENTRE OF ITS BASE, which is where the building
   meets the ground -- see art/ASSETS.md for the specs these must be drawn to. */
const ART = {};
function artFor(key) {
  // a missing key would request art/undefined.webp and 404 -- harmless but it
  // hides the real fault, which is whatever handed us nothing to draw
  if (!key) return null;
  if (!(key in ART)) {
    const im = new Image();
    im.onerror = () => { ART[key] = null; };      // no file: stay procedural, silently
    im.src = 'art/' + key + '.webp';
    ART[key] = im;
  }
  const im = ART[key];
  return ready(im) ? im : null;
}
/* How each sprite is fitted to its plot.

   Art is scaled to the FOOTPRINT rather than to a fixed height, or buildings of
   different sizes stop looking like they share a world. The one landmark every
   sprite has in common is its FRONT CORNER -- the near point of its base, where
   it touches the ground -- so that is the anchor, and everything else is
   measured against it:

     w   drawn width as a multiple of the plot's diamond width. Above 1 the
         building overhangs its plot, which is normal: painted eaves, log piles
         and stacked sacks all sit outside the foundation. The cottage and the
         barn are also RECTANGULAR in plan while their plots are square, so they
         need more room than the farm, whose fence really is a square.
     ax  where the front corner sits across the image, 0..1. Rarely 0.5 -- the
         buildings are drawn slightly off-centre.
     ay  where the front corner sits down the image, 0..1. Below 1 when
         something is drawn BELOW the foundation, as the barn's sacks are.

   ax and ay come from tools/measure-art.js; w is set by eye against the plot
   outline. Anything missing falls back to a plain bottom-centre fit. */
const ART_FIT = {
  house:  { w: 1.20, ax: 0.652, ay: 0.994 },
  farm:   { w: 0.85, ax: 0.531, ay: 1.000 },
  lumber: { w: 1.18, ax: 0.570, ay: 1.000 },
  store:  { w: 1.09, ax: 0.522, ay: 1.000 },
  hall:   { w: 1.15, ax: 0.500, ay: 0.999 },
  // ax measured 0.344, which is the water trough spilling off the well's
  // lower-left, not the well. Set to the centre of the stone ring by hand --
  // exactly the case measure-art.js warns about for broad-based objects.
  well:   { w: 1.15, ax: 0.500, ay: 0.995 },
  // the tower base matches its plot; the sails then overhang by a good margin,
  // which is what a windmill does
  mill:   { w: 1.05, ax: 0.551, ay: 0.998 },
  market: { w: 1.10, ax: 0.561, ay: 0.999 },
};
const FIT_DEF = { w: 1.2, ax: 0.5, ay: 1 };

/* ---------- scenery ----------
   Seeded from the tile index so the trees never move between frames or reloads,
   and never need storing in the save. */
/* A plain XOR of two multiples barely mixes for small c/r -- measured 0..0.25
   across the whole grid, so nothing ever cleared the scenery threshold. This is
   an integer avalanche hash, verified uniform over the grid. */
function hash(c,r){
  let h = (Math.imul(c, 374761393) + Math.imul(r, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const SCENERY=[];
for(let r=0;r<GH;r++) for(let c=0;c<GW;c++){
  const n=hash(c,r);
  const edge = c<1||r<1||c>=GW-1||r>=GH-1;
  if(n>0.86 || (edge && n>0.55)){
    // a second, independent hash picks the variety -- reusing n would tie the
    // kind to the threshold above and put every rock in the same places
    const v=hash(c*7+3, r*11+5);
    const kind = n>0.955 ? (v<0.55?'rock':'bush') : (v<0.62?'tree_pine':'tree_oak');
    SCENERY.push({c,r,kind,rock:kind==='rock',s:0.78+((n*97)%1)*0.5,f:(n*31)%1});
  }
}

/* ---------- villagers ----------
   One per house-pop, wandering between finished buildings. They are what makes a
   base read as ALIVE rather than as a diagram -- the reference footage is mostly
   little figures walking around. */
const villagers=[];
/* Walking pace, world px per second. A tile is 128 wide, so at the 26 this
   started at a villager took ten seconds to cross two tiles and spent most of
   the game in transit rather than working -- the first delivery landed a minute
   in. Fast enough to look purposeful, slow enough to watch. */
const VIL_SPD=58;
/* Paths are not decoration any more. A villager on one moves more than twice as
   fast, which makes laying a road from a farm to the storehouse a real economic
   act with a real cost -- and gives the cheapest decoration in the game a reason
   to exist beyond looking tidy. */
const PATH_SPEED = 2.2;
let pathSet = new Set();
const rebuildPaths = () => {
  pathSet = new Set();
  for (const p of placed) if (p.key === 'path') pathSet.add(p.c + ',' + p.r);
};
// what each workplace's round trip costs, worked out once per change
let travelCache = new Map();
function onPath(x, y) {
  if (!pathSet.size) return false;
  const t = tileAt(x, y);
  return pathSet.has(t.c + ',' + t.r);
}

/* ---------- how well a workplace is doing ----------
   Half the economy is decided by how far a villager has to carry a load, and
   until now that was invisible: a farm across the island produced half what an
   identical farm beside the storehouse did, and nothing said so. Surfacing it
   is what turns "drop buildings anywhere" into laying out a village.

   A villager's cycle is: fill up at the workplace, walk to a store, walk back.
   Efficiency is the share of that cycle actually spent producing. */
/* Is there a store to walk to at all? Returns null when there is none, which
   is what tells a building that cannot deliver anything apart from one that is
   merely inefficient. (This replaced a distance-in-grid-tiles helper: nothing
   should be priced in tiles, because the same tile count is a different walk
   depending on which way it runs.) */
function hasStore(p) {
  const c = centreOf(p);
  return nearestStore(c.x, c.y) ? true : null;
}
/* Seconds a villager spends walking a load from here to the nearest store and
   back, counting the paved tiles the route crosses.

   Measured in the pixels a villager ACTUALLY covers. It used to un-squash the
   distance back into grid tiles and then price every tile at a full tile-width
   of walking -- which double-counts movement up and down the screen, because
   un-squashing stretches the vertical axis and the villager does not walk the
   stretched version. A store two tiles away up the screen was charged 256px for
   a 128px walk, while one two tiles away across the screen was charged
   correctly, so the penalty was up to two-fold and depended on which way the
   store happened to lie. Every efficiency, upgrade quote, well figure and
   offline total came off that number.

   It used to cost the walk at the plain pace whatever the ground was, and call
   that a floor the player could trust. It was a floor 33% below the truth on a
   paved route -- and worse, it meant the cheapest thing in the game, a five-wood
   path that speeds a villager up more than twice over, changed no number the
   player could see. Nothing taught them roads did anything at all. Now laying
   one makes the delivery figure on the panel go up, which is the whole lesson. */
function routeOf(p) {
  const key = p.id;
  if (key !== undefined && key !== -1) {
    const hit = travelCache.get(key);
    if (hit !== undefined) return hit;
  }
  const c = centreOf(p), s = nearestStore(c.x, c.y);
  let out;
  if (!s) out = { secs: 0, paved: 0 };
  else {
    const d = centreOf(s);
    const dist = Math.hypot(d.x - c.x, d.y - c.y);
    let frac = 0;
    if (pathSet.size) {
      /* Villagers walk straight at their target, so the route is the straight
         line between the two. Sample it, and add the time up per stretch -- an
         average SPEED would be wrong, because the slow stretches take longer
         and so count for more of the journey. */
      const n = Math.max(4, Math.min(48, Math.round(dist / 24)));
      let hits = 0;
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        if (onPath(c.x + (d.x - c.x) * f, c.y + (d.y - c.y) * f)) hits++;
      }
      frac = hits / n;
    }
    out = { secs: 2 * dist * (frac / (VIL_SPD * PATH_SPEED) + (1 - frac) / VIL_SPD), paved: frac };
  }
  if (key !== undefined && key !== -1) travelCache.set(key, out);
  return out;
}
const travelSecondsOf = p => routeOf(p).secs;
/* What a workplace running at `rate` actually DELIVERS.

   The cycle is fill-then-carry, so throughput is the load divided by the fill
   time plus the walk. Everything the interface says about the worth of a level,
   a well or a decoration is measured with this, because a multiplier applies to
   the rate and the walk does not care. */
function deliveredWith(p, rate) {
  if (rate <= 0) return 0;
  return CARRY / (CARRY / rate + travelSecondsOf(p));
}
const ratedOf = (p, kind, mul) =>
  rateOf(p, kind) * boostAt(p) * (mul === undefined ? charmMul() : mul);

/* The share of its own rate a workplace actually delivers. This is the honest
   multiplier for what the village produces -- offline earnings are built on it
   -- but it is NOT shown to the player any more, because it is not comparable
   between levels and was being read as a placement score. reachOf is what the
   interface uses for that. */
function efficiencyOf(p) {
  const b = B(p.key);
  if (!b.makes || !b.jobs) return null;
  if (hasStore(p) === null) return 1;
  const rate = ratedOf(p, Object.keys(b.makes)[0]);
  if (rate <= 0) return 1;
  return Math.max(0.05, Math.min(1, deliveredWith(p, rate) / rate));
}
/* The round trip a workplace gets when it stands right beside a storehouse.
   Measured on the real grid rather than assumed: the tightest legal placements
   come out at 2.2 to 2.5 seconds, so one tile-step is a figure the player can
   actually achieve and not an aspiration. */
const SNUG_WALK = 2 * Math.hypot(TW / 2, TH / 2) / VIL_SPD;
/* What this workplace would deliver in that spot -- the yardstick a placement
   should be judged against.

   Efficiency on its own cannot be that yardstick, because it is not comparable
   between levels: a level five farm empties its stock four times faster than a
   level one, so the same walk costs it far more, and the best figure it can
   EVER show, standing next to a store, is 66% against the level one's 82%. The
   badge threshold of 45% therefore said almost nothing early on and hung a
   warning on seven buildings in ten in a maxed village, where it was both
   unavoidable and useless as advice. Measured against what the same building
   would do in a good spot, the number means the same thing at every level: how
   much of it the walk is taking. */
function bestDeliveredOf(p, lvl) {
  const b = B(p.key);
  if (!b.makes || !b.jobs) return 0;
  const q = lvl === undefined ? p : { ...p, lvl };
  const rate = ratedOf(q, Object.keys(b.makes)[0]);
  return rate <= 0 ? 0 : CARRY / (CARRY / rate + SNUG_WALK);
}
// 0..1: the share of its potential this building is actually delivering
function reachOf(p) {
  const best = bestDeliveredOf(p);
  return best <= 0 ? 1 : Math.max(0, Math.min(1, deliveredOf(p) / best));
}
/* What this workplace hands over per second -- for ONE pair of hands.

   Throughput scales exactly with the workforce: whatever the staff, a worker
   waits L/rate for a load to be ready and then walks it, so each of them runs
   the same cycle and the building delivers n times this. (That the wait does
   not shorten as the staff grows is not obvious, but it falls out of the
   steady state: the stock fills faster with more hands, and is drawn down
   faster in exactly the same proportion.) */
function deliveredOf(p, lvl) {
  const b = B(p.key);
  if (!b.makes || !b.jobs) return 0;
  const q = lvl === undefined ? p : { ...p, lvl };
  return deliveredWith(q, ratedOf(q, Object.keys(b.makes)[0]));
}
// how many pairs of hands a level would really get: the staff it has, plus
// whoever is loitering, and never more posts than the level opens
function handsFor(p, lvl) {
  const have = workersAt(p.id);
  const spare = villagers.reduce((n, v) => n + (v.job == null ? 1 : 0), 0);
  return Math.max(have, Math.min(jobsOf({ ...p, lvl }), have + spare));
}
/* Small loads on purpose. A big load means the resource counter sits still for
   half a minute and then jumps, which reads as a broken game; small ones keep
   something arriving every few seconds. */
const CARRY=8;
const STOCK_MAX=CARRY*2;    // a workplace stops filling once it has this much waiting

/* ---------- time of day ----------
   Driven off the wall clock rather than a counter, so the cycle carries on
   while the game is shut and you come back to a different hour instead of
   always to the moment you left. It also gives the lamp decoration a reason to
   exist: until now it was an ornament that glowed at noon.

   Night is capped well short of black. This is a village you are meant to keep
   playing in, not a stealth game, and a build bar you cannot read at 2am is a
   bug however pretty it looks. */
const DAY_MS = 8 * 60 * 1000;         // a full cycle
const NIGHT_MAX = 0.42;               // strongest wash, tuned to stay readable
const dayPhase = () => (Date.now() % DAY_MS) / DAY_MS;

/* sun: 1 at noon, 0 at dawn and dusk, -1 at midnight. */
function sky() {
  const sun = Math.cos((dayPhase() - 0.25) * Math.PI * 2);
  const night = Math.max(0, Math.min(1, (0.25 - sun) / 1.1));
  const warm = Math.max(0, 1 - Math.abs(sun) * 2.6);   // peaks at sunrise and sunset
  return { sun, night, warm };
}
function drawSky() {
  const { night, warm } = sky();
  if (night <= 0.001 && warm <= 0.001) return;
  g.save();
  if (warm > 0) {                      // low sun spills orange across everything
    g.fillStyle = 'rgba(255,146,58,' + (0.20 * warm).toFixed(3) + ')';
    g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  }
  if (night > 0) {
    g.fillStyle = 'rgba(16,30,74,' + (NIGHT_MAX * night).toFixed(3) + ')';
    g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  }
  g.restore();
}
/* Lamps are drawn AFTER the night wash so their light sits on top of it rather
   than being dimmed along with everything else. */
function drawLamps() {
  const { night } = sky();
  if (night < 0.04) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const p of placed) {
    if (p.key !== 'lamp') continue;
    const o = tileToWorld(p.c, p.r), y = o.y - 52;
    const r = 92, gr = g.createRadialGradient(o.x, y, 0, o.x, y, r);
    const a = 0.50 * night;
    gr.addColorStop(0, 'rgba(255,206,120,' + a.toFixed(3) + ')');
    gr.addColorStop(0.45, 'rgba(255,178,80,' + (a * 0.35).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(o.x, y, r, 0, 7); g.fill();
  }
  g.restore();
}

/* ---------- sound ----------
   Synthesised rather than sampled: a handful of oscillators and envelopes cost
   nothing to ship, need no art pass, and cannot be the wrong style. Everything
   here is a short shaped tone, which is enough to make an action feel like it
   landed.

   The context is created on the FIRST TOUCH and not before. Browsers refuse to
   start audio without a gesture, and a context made at load sits in 'suspended'
   for ever -- silently, so it looks like the code is broken rather than the
   policy. */
let actx = null, master = null, muted = false;
let lastDeliverAt = 0;

function audioOn() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.35;
    master.connect(actx.destination);
  } catch (e) { actx = null; }
}

/* One shaped tone. type/freq/dur describe it; slide bends the pitch, which is
   what separates a rising "that worked" from a falling "that did not". */
function tone({ f = 440, to = 0, type = 'sine', dur = 0.14, vol = 0.5, delay = 0 }) {
  if (!actx || muted) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  // a quick attack and a smooth tail; a square cut at the end clicks
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

const SFX = {
  tap:     () => tone({ f: 620, to: 520, type: 'triangle', dur: 0.06, vol: 0.22 }),
  place:   () => { tone({ f: 180, to: 90, type: 'sine', dur: 0.22, vol: 0.55 });
                   tone({ f: 300, to: 200, type: 'triangle', dur: 0.10, vol: 0.22, delay: 0.02 }); },
  deliver: () => { // throttled: a busy village delivers constantly and would chatter
                   const now = performance.now();
                   if (now - lastDeliverAt < 220) return;
                   lastDeliverAt = now;
                   tone({ f: 880, type: 'sine', dur: 0.08, vol: 0.16 });
                   tone({ f: 1320, type: 'sine', dur: 0.09, vol: 0.12, delay: 0.055 }); },
  upgrade: () => [0, 0.09, 0.18].forEach((d, i) =>
                   tone({ f: 523 * Math.pow(1.26, i), type: 'triangle', dur: 0.20, vol: 0.34, delay: d })),
  sell:    () => { tone({ f: 420, to: 240, type: 'triangle', dur: 0.16, vol: 0.30 }); },
  deny:    () => tone({ f: 170, to: 120, type: 'square', dur: 0.16, vol: 0.20 }),
  goal:    () => [0, 0.10, 0.20, 0.32].forEach((d, i) =>
                   tone({ f: [523, 659, 784, 1047][i], type: 'sine', dur: 0.30, vol: 0.30, delay: d })),
};

/* ---------- feedback ----------
   Deliveries used to change a number in the corner and nothing else, which
   makes a working village indistinguishable from a stalled one. Everything that
   arrives now says so where it arrived, and the HUD reports the rate the
   village is ACTUALLY achieving rather than the rate its buildings are rated
   for -- the gap between the two is walking time, and it is large. */
const pops = [];
const POP_MAX = 24, POP_LIFE = 1.5;
let rateNow = { wood: 0, food: 0 };          // smoothed, shown in the HUD
let rateAcc = { wood: 0, food: 0 }, rateT = 0;
const RATE_WINDOW = 5;                       // long enough that a sparse village does not flicker

/* Hand the player a resource and SHOW what actually arrived.

   Every grant in this game clamps to the storage cap, and three separate times
   I wrote the clamp in one place and the announcement in another, so the game
   congratulated the player on goods it had just thrown away. Everything that
   grants now goes through here. */
function grant(k, n, x, y) {
  const before = res[k];
  res[k] = Math.min(caps[k], res[k] + n);
  const got = res[k] - before;
  if (got > 0.01 && pops.length < POP_MAX) pops.push({ x, y, k, n: got, age: 0 });
  return got;
}
function deliver(k, n, x, y) {
  const got = grant(k, n, x, y);
  rateAcc[k] += got;                  // a sale is not production, so only here
  if (got > 0.01) SFX.deliver();
  return got;
}
function stepFeedback(dt) {
  for (const q of pops) q.age += dt;
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > POP_LIFE) pops.splice(i, 1);
  rateT += dt;
  if (rateT >= RATE_WINDOW) {
    for (const k of ['wood', 'food']) {
      // eased so the readout settles instead of flickering between windows
      rateNow[k] += (rateAcc[k] / rateT - rateNow[k]) * 0.40;
      rateAcc[k] = 0;
    }
    rateT = 0;
  }
}
function drawPops() {
  for (const q of pops) {
    const t = q.age / POP_LIFE;
    g.save();
    g.globalAlpha = Math.min(1, (1 - t) * 2.2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 21px Segoe UI, sans-serif';
    g.lineWidth = 4; g.strokeStyle = 'rgba(8,16,8,.75)';
    const txt = '+' + Math.round(q.n) + (q.k === 'wood' ? ' 🪵' : ' 🌾');
    const y = q.y - 26 - t * 34;
    g.strokeText(txt, q.x, y); 
    g.fillStyle = q.k === 'wood' ? '#f0d49a' : '#cdeb9a';
    g.fillText(txt, q.x, y);
    g.restore();
  }
}

const byId = id => placed.find(p=>p.id===id);
const centreOf = p => { const b=B(p.key); return tileToWorld(p.c+(b.w-1)/2, p.r+(b.h-1)/2); };
/* A building that has finished at least once. An UPGRADE puts the scaffolding
   back up, and a building under scaffolding for the second time is not the same
   as one being built for the first: the first has nobody working it yet, the
   second has people who should still have their jobs when it comes back. */
const established = p => p.t >= 1 || lvlOf(p) > 1;
const producers = () => placed.filter(p => established(p) && B(p.key).jobs);
// the hall always accepts a delivery, so a village can never deadlock for want
// of somewhere to put things
/* The stores, with their centres, kept ready.

   nearestStore() is asked for a distance by every building on every frame -- the
   placement badge needs one -- and by every villager that finishes a load, and
   it was rebuilding this list with a filter and an allocation every single time.
   On a full village that came to 4.5ms of a 10ms frame here, which is a third
   of the budget gone on a phone before anything is drawn.

   The set changes only when something is built, finishes building, is sold,
   moved or loaded, so it is rebuilt at those points and nowhere else. */
let storeAt = [];                     // [{ p, x, y }]
function rebuildStores() {
  rebuildCharm();                     // the same events change both
  rebuildPaths();                     // and a new road changes every travel time
  travelCache = new Map();
  invalidateJobs();                   // and they all move the delivery figures
  storeAt.length = 0;
  for (const p of placed)
    if (p.t >= 1 && (B(p.key).caps || p.key === 'hall')) {
      const c = centreOf(p);
      storeAt.push({ p, x: c.x, y: c.y });
    }
}
const stores = () => storeAt.map(s => s.p);
const workersAt = id => villagers.reduce((n,v)=>n+(v.job===id?1:0),0);

/* Output multiplier from wells in reach. Distance is measured centre to centre
   in TILES, not world pixels, so a well's reach is a circle on the grid rather
   than the squashed ellipse the iso projection would give. */
function boostAt(p, exceptWell){
  const bp=B(p.key); let m=1;
  for(const w of placed){
    if(w.key!=='well' || w.t<1) continue;
    if(exceptWell !== undefined && w.id === exceptWell) continue;   // "what if this well were not here"
    const bw=B('well');
    const dx=(w.c+(bw.w-1)/2)-(p.c+(bp.w-1)/2);
    const dy=(w.r+(bw.h-1)/2)-(p.r+(bp.h-1)/2);
    if(Math.hypot(dx,dy)<=bw.boostR) m+=bw.boost*outMul(lvlOf(w));
  }
  return m;
}
function nearestStore(x,y){
  let best=null,bd=Infinity;
  for(const s of storeAt){ const dx=s.x-x, dy=s.y-y, d=dx*dx+dy*dy; if(d<bd){bd=d;best=s.p;} }
  return best;                        // squared distances: the nearest is the same one
}
function wanderTarget(){
  const done=placed.filter(p=>p.t>=1);
  if(!done.length) return tileToWorld(GW/2,GH/2);
  const c=centreOf(done[(Math.random()*done.length)|0]);
  return { x:c.x+(Math.random()*2-1)*46, y:c.y+(Math.random()*2-1)*26 };
}
const postNear = p => { const c=centreOf(p);
  return { x:c.x+(Math.random()*2-1)*34, y:c.y+(Math.random()*2-1)*18 }; };

/* The most villagers a village will ever hold.

   This was 24, chosen as a performance guard, and it quietly broke the late
   game: a maxed village WANTS 72 villagers and has 67 jobs, so eight of the
   twelve houses the hall allows did nothing at all -- still costing wood, still
   gated behind hall levels, still asked for by a goal. The ceiling now sits
   above what a full village asks for, so a house is never wasted. */
const VILLAGER_MAX = 72;
function syncVillagers(){
  let want=0;
  for(const p of placed) want += livedIn(p);
  want=Math.min(want,VILLAGER_MAX);
  if(villagers.length!==want) invalidateJobs();
  while(villagers.length<want){
    const h=hallOf(), t=h?centreOf(h):tileToWorld(GW/2,GH/2);
    villagers.push({x:t.x,y:t.y,tx:t.x,ty:t.y,ph:Math.random()*7,wait:Math.random()*2,face:1,
      k:(Math.random()*VILLAGERS.length)|0, job:null, st:'idle', carry:null});
  }
  while(villagers.length>want) villagers.pop();
}

/* Hand out posts. A villager keeps its workplace until that workplace is gone,
   so the village does not reshuffle every time something new is built. */
/* Runs every tick for every villager, so it counts the workforce ONCE into a
   map instead of rescanning every villager for every villager. The old version
   called producers() and workersAt() inside the per-villager loop, which is
   quadratic in population and fine at a dozen villagers and not at seventy. */
/* Where the workforce SHOULD be.

   Villagers never reconsidered a job once they had one, so posts filled in
   whatever order they happened to be built. In a village with a mill worth 0.97
   a head and a stranded farm worth 0.45, the farm had three people and the mill
   had none -- a quarter of the village's labour going to waste, and every
   placement decision the player made counting for nothing.

   Every workplace gets one pair of hands before any gets a second, so a new
   building is never simply ignored and the player can see what it does. After
   that, hands go where they deliver most. The hall's woodpile sorts last
   throughout: it is where spare hands go when there is nothing better, not a
   career. */
/* Cached, like the store list and the charm total, and dirtied by the same
   events plus a change in the population. Working it out means a sort and a
   delivery figure for every workplace, and it ran on every tick: 0.24ms of a
   0.30ms tick on a full village, to answer a question whose answer only changes
   when a building or a villager appears. */
let jobPlan = null;
function invalidateJobs() { jobPlan = null; }
function desiredJobs(handsIn) {
  if (handsIn === undefined && jobPlan) return jobPlan;
  const plan = computeJobs(handsIn);
  if (handsIn === undefined) jobPlan = plan;
  return plan;
}
function computeJobs(handsIn) {
  const posts = producers().filter(p => jobsOf(p) > 0);
  posts.sort((a, b) => (a.key === 'hall') - (b.key === 'hall') || deliveredOf(b) - deliveredOf(a));
  const want = new Map(posts.map(p => [p.id, 0]));
  /* Callable with a population that does not exist yet: offline earnings are
     worked out before the first tick has spawned anybody. */
  let hands = handsIn === undefined ? villagers.length : handsIn;
  /* One each, but not the woodpile: it is the fallback, so it only earns hands
     once every real workplace is full. Guaranteeing it one put a villager on
     the least productive job in the village ahead of a second pair of hands at
     the best one. With no real workplace yet -- the first minute of a new
     village -- the second pass gives it everybody, which is the point of it. */
  for (const p of posts) {
    if (hands <= 0) break;
    if (p.key === 'hall') continue;
    want.set(p.id, 1); hands--;
  }
  for (const p of posts) {
    const cap = jobsOf(p);
    while (hands > 0 && want.get(p.id) < cap) { want.set(p.id, want.get(p.id) + 1); hands--; }
  }
  return { want, posts };
}
function assignJobs(){
  const count = new Map();
  for(const v of villagers){
    if(v.job==null) continue;
    const p=byId(v.job);
    if(p && established(p) && B(p.key).jobs){ count.set(v.job, (count.get(v.job)||0)+1); continue; }
    /* The post is gone. A load already in hand is NOT: it was on its way to a
       store and it still can be. Throwing it away destroyed eight goods every
       time a player upgraded a staffed building -- the upgrade began, every
       worker was unassigned on the next tick, and whatever they were carrying
       went with the job. */
    v.job = null;
    if (!v.carry) v.st = 'idle';
  }
  const { want, posts } = desiredJobs();
  const under = () => posts.filter(p => (count.get(p.id) || 0) < (want.get(p.id) || 0));

  // first, anyone with no job at all
  let open = under();
  let i = 0;
  for (const v of villagers) {
    /* Not while they are carrying something. A villager whose workplace was
       sold keeps the load and keeps walking to the store -- and then this loop
       saw someone with no job, handed them one, and pointed them at it, which
       threw the delivery away: the load rides along to the new post and is
       overwritten by the next one. They take a job on the pass after they have
       put it down. */
    if (v.job != null || v.carry) continue;
    while (i < open.length && (count.get(open[i].id) || 0) >= (want.get(open[i].id) || 0)) i++;
    if (i >= open.length) break;
    const free = open[i];
    count.set(free.id, (count.get(free.id) || 0) + 1);
    v.job = free.id; v.st = 'toWork';
    const t = postNear(free); v.tx = t.x; v.ty = t.y;
  }

  /* Then ONE person changes job per pass, from a post that has more hands than
     it deserves to one that has fewer. One at a time because this runs every
     tick: it converges in under a second either way, and it reads as people
     walking to a different job rather than the whole village teleporting.

     Anything they are carrying is left alone -- they finish the delivery and
     take the new post afterwards. */
  const shortOf = under()[0];
  if (!shortOf) return;
  const spare = posts.find(p => (count.get(p.id) || 0) > (want.get(p.id) || 0));
  if (!spare) return;
  const mover = villagers.find(v => v.job === spare.id && !v.carry);
  if (!mover) return;
  count.set(spare.id, (count.get(spare.id) || 1) - 1);
  count.set(shortOf.id, (count.get(shortOf.id) || 0) + 1);
  mover.job = shortOf.id;
  if (mover.st === 'work' || mover.st === 'idle') {
    mover.st = 'toWork';
    const t = postNear(shortOf); mover.tx = t.x; mover.ty = t.y;
  }
}

/* Villagers are the economy: a workplace fills only while someone is standing
   at it, and what it makes reaches the player only when that villager walks a
   load to a store. Nothing ticks on its own. */
function stepVillagers(dt){
  for(const v of villagers){
    const step1=()=>{ const dx=v.tx-v.x, dy=v.ty-v.y, d=Math.hypot(dx,dy);
      if(d<6) return true;
      const spd = VIL_SPD * (onPath(v.x, v.y) ? PATH_SPEED : 1);
      /* Never step PAST the target. A frame is up to 0.1s, and on a road that
         is a 12.8px stride against a 6px arrival window -- so a villager
         standing 6.4px away jumped over the target, landed 6.4px on the far
         side, and did that for ever. It never worked and never delivered
         again. Only slow frames are big enough to do it, which means it would
         have happened on a struggling phone and nowhere else. */
      const m = Math.min(spd * dt, d);
      v.x+=dx/d*m; v.y+=dy/d*m; v.face=dx<0?-1:1; v.ph+=dt*7; return false; };

    /* A workplace can move out from under somebody: the Move button picks the
       whole building up and sets it down across the island, and nothing told the
       people working there. They carried on standing in the empty field it used
       to occupy, filling its stock from there -- and then walked their load to
       the store from the OLD spot, so the first cycle after a move was timed for
       a building that was no longer there. Whoever is carrying something is left
       alone; they finish the delivery and take the new post on the way back,
       which is what already happened. */
    if((v.st==='toWork' || v.st==='work') && v.job != null){
      const p=byId(v.job);
      if(p){ const c=centreOf(p);
        const ref = v.st==='toWork' ? { x:v.tx, y:v.ty } : { x:v.x, y:v.y };
        if(Math.hypot(ref.x-c.x, ref.y-c.y) > 110){
          const t=postNear(p); v.tx=t.x; v.ty=t.y; v.st='toWork';
        } }
    }
    if(v.st==='toWork'){ if(step1()) v.st='work'; continue; }

    if(v.st==='work'){
      const p=byId(v.job); if(!p){ v.st='idle'; continue; }
      const b=B(p.key);
      // nothing comes out of a building with the scaffolding up; the people
      // posted there wait for it rather than losing the job
      if(b.makes && p.t>=1 && p.stock<STOCK_MAX){
        const kind=Object.keys(b.makes)[0];
        p.stock=Math.min(STOCK_MAX, p.stock+rateOf(p,kind)*boostAt(p)*charmMul()*dt);
      }
      v.ph+=dt*2.5;                          // a slow sway while working
      if(p.stock>=CARRY){
        const kind=Object.keys(b.makes)[0];
        p.stock-=CARRY; v.carry={k:kind,n:CARRY};
        const s=nearestStore(v.x,v.y);
        if(s){ const c=centreOf(s); v.tx=c.x; v.ty=c.y+10; v.st='toStore'; }
        else { deliver(kind, CARRY, v.x, v.y); v.carry=null; }
      }
      continue;
    }

    if(v.st==='toStore'){
      if(!step1()) continue;
      if(v.carry){ deliver(v.carry.k, v.carry.n, v.x, v.y); v.carry=null; }
      const p=byId(v.job);
      if(p){ const t=postNear(p); v.tx=t.x; v.ty=t.y; v.st='toWork'; } else v.st='idle';
      continue;
    }

    // idle: drift between finished buildings, as before
    if(v.wait>0){ v.wait-=dt; continue; }
    if(step1()){ const t=wanderTarget(); v.tx=t.x; v.ty=t.y; v.wait=0.6+Math.random()*2.2; }
  }
}
/* ---------- camera (pan + pinch) ---------- */
const CAM = { z: 1, base: 1, x: W / 2, y: 520 };
const ZMIN = 0.55, ZMAX = 2.2;
const camScale = () => CAM.base * CAM.z;
function camClamp() {
  const s = camScale();
  const hw = W / (2 * s), hh = VH / (2 * s);
  const b = worldBounds();
  CAM.x = Math.max(b.x0 + hw * 0.35, Math.min(b.x1 - hw * 0.35, CAM.x));
  CAM.y = Math.max(b.y0 + hh * 0.35, Math.min(b.y1 - hh * 0.35, CAM.y));
}
function worldBounds() {
  const a = tileToWorld(0, 0), b = tileToWorld(GW, 0), c2 = tileToWorld(0, GH), d = tileToWorld(GW, GH);
  return { x0: Math.min(a.x, b.x, c2.x, d.x), x1: Math.max(a.x, b.x, c2.x, d.x),
           y0: Math.min(a.y, b.y, c2.y, d.y), y1: Math.max(a.y, b.y, c2.y, d.y) };
}
/* Frame the land the player OWNS, not the whole sea.

   The camera opened at zoom 1 on the middle of a 14x14 grid whatever the
   village looked like, so a new player -- who owns a six-tile core and one
   building -- met a hall the size of a thumbnail with half the screen given
   over to open water. The land is the subject; the sea is the frame. */
function landWorldBounds() {
  const L = landBounds();
  const cs = [tileToWorld(L.lo - .5, L.lo - .5), tileToWorld(L.hi + .5, L.lo - .5),
              tileToWorld(L.lo - .5, L.hi + .5), tileToWorld(L.hi + .5, L.hi + .5)];
  const xs = cs.map(p => p.x), ys = cs.map(p => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
/* The zoom that just contains it. The vertical margin is the larger one because
   the resource bars sit over the top of the world and the build tray over the
   bottom -- fitting to the raw canvas would tuck the near corner of the island
   behind the tray. */
function landFitZoom() {
  const b = landWorldBounds();
  const padTop = 130 * US(), padBot = 300 * US();
  /* The land is a diamond twice as wide as it is tall, and the screen is taller
     than it is wide, so a strict fit is always limited by the width and leaves a
     third of the height as open water. The extreme east and west points of the
     diamond are its emptiest ground, so a little of them is allowed off the
     edges -- worth about fifteen percent more zoom on everything the player
     actually looks at, and they are one pan away. */
  const zx = W / ((b.x1 - b.x0) * 0.86);
  const zy = (VH - padTop - padBot) / (b.y1 - b.y0);
  return Math.max(ZMIN, Math.min(ZMAX, Math.min(zx, zy) / CAM.base));
}
/* Centred on the land, nudged down so the free space lands under the tray
   rather than being split evenly above and below. */
function camFitTarget() {
  const b = landWorldBounds(), z = landFitZoom();
  const s = CAM.base * z;
  return { z, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 + (300 * US() - 130 * US()) / (2 * s) };
}
function camFit(instant) {
  const t = camFitTarget();
  if (instant) { CAM.z = t.z; CAM.x = t.x; CAM.y = t.y; camGlide = null; camClamp(); }
  else camGlide = t;
}
/* An eased move rather than a jump. A cut makes the player re-find their own
   village; a glide of about half a second carries the eye with it. */
let camGlide = null;
function stepCam(dt) {
  if (!camGlide) return;
  const k = 1 - Math.pow(0.004, dt);            // ~half a second to settle
  CAM.z += (camGlide.z - CAM.z) * k;
  CAM.x += (camGlide.x - CAM.x) * k;
  CAM.y += (camGlide.y - CAM.y) * k;
  camClamp();
  if (Math.abs(camGlide.z - CAM.z) < 0.002
    && Math.hypot(camGlide.x - CAM.x, camGlide.y - CAM.y) < 2) camGlide = null;
}
function camApply() { const s = camScale(); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-CAM.x, -CAM.y); }
function camUnproject(sx, sy) { const s = camScale(); return { x: (sx - W / 2) / s + CAM.x, y: (sy - H / 2) / s + CAM.y }; }
function camProject(wx, wy) { const s = camScale(); return { x: (wx - CAM.x) * s + W / 2, y: (wy - CAM.y) * s + H / 2 }; }

/* ---------- HUD scale (same approach as Gatestorm) ---------- */
const US = () => Math.max(1, Math.min(1.34, VH / H));
/* The whole canvas, cutout and all. The night wash and the dimming behind a
   card use this: they should cover the screen, notch included, or the tint
   stops in a line across the top of the phone. */
const screenTop = () => -OY;
const screenBot = () => H + OY;
/* Where the interface may actually put things. A phone with a camera cutout
   eats the top of its own screen and the gesture bar eats the bottom, and the
   page asks for viewport-fit=cover -- which is what lets the sea reach the
   edges, and also what puts the resource chips under the camera unless somebody
   subtracts the insets again. Nothing did. */
let SAFE = { top: 0, bottom: 0 };
function readSafeArea() {
  const el = document.getElementById('safe');
  if (!el) return;
  const cs = getComputedStyle(el);
  const t = parseFloat(cs.paddingTop) || 0, b = parseFloat(cs.paddingBottom) || 0;
  // CSS pixels into the canvas's own units, which is what everything is drawn in
  const rect = cv.getBoundingClientRect();
  if (!(rect.height > 0)) return;                    // laid out yet? try again later
  const k = VH / rect.height;
  SAFE = { top: t * k, bottom: b * k };
}
const hudTop = () => -OY + SAFE.top;
const hudBot = () => H + OY - SAFE.bottom;
const mS = v => v * US();

/* ---------- buildings ----------
   jobs   how many villagers can work here. A building with jobs produces
          NOTHING on its own -- see stepVillagers.
   wallH  height of the procedural stand-in, used until art arrives.
   boost  a well lifts the output of producers near it. */
const BUILDINGS = [
  /* The hall keeps a woodpile, worked by whoever is spare. It is deliberately
     feeble -- its job is not to feed the village but to make a dead end
     impossible. Two houses and a farm at level 1 leave you 15 wood, no wood
     income, and a lumber camp costs 20: without this the game is over. */
  { key: 'hall',   name: 'Town Hall', w: 2, h: 2, cost: { wood: 0 }, unique: true, wallH: 88, icon: '🏛️',
    makes: { wood: 0.15 }, jobs: 1,
    blurb: 'The heart of the village. Spare villagers keep its woodpile.' },
  { key: 'house',  name: 'House',     w: 2, h: 1, cost: { wood: 30 },            pop: 2,   icon: '🏠',
    blurb: 'Two more villagers move in.' },
  { key: 'farm',   name: 'Farm',      w: 2, h: 2, cost: { wood: 45 },            makes: { food: 0.7 },  jobs: 2, wallH: 26, icon: '🌾',
    blurb: 'Grows food. Needs villagers to work it.' },
  { key: 'lumber', name: 'Lumber Camp', w: 2, h: 1, cost: { wood: 20, food: 15 }, makes: { wood: 0.6 },  jobs: 2, icon: '🪵',
    blurb: 'Cuts wood. Needs villagers to work it.' },
  { key: 'store',  name: 'Storehouse',w: 2, h: 2, cost: { wood: 60, food: 20 },  caps: { wood: 400, food: 400 }, wallH: 74, icon: '📦',
    blurb: 'Raises how much you can hold. Villagers deliver here.' },
  { key: 'well',   name: 'Well',      w: 1, h: 1, cost: { wood: 40 },            boost: 0.35, boostR: 2.6, wallH: 30, icon: '⛲',
    // no percentage here on purpose: it would be a rate figure, and the line
    // below the blurb reports what the well is really adding where it stands
    blurb: 'Speeds up the workplaces around it. Keep it close to them.' },
  { key: 'mill',   name: 'Mill',      w: 2, h: 2, cost: { wood: 120, food: 60 }, makes: { food: 1.8 },  jobs: 2, wallH: 96, icon: '🌬️',
    blurb: 'Grinds grain. Far more food than a farm, for two workers.' },
  { key: 'market', name: 'Market',    w: 2, h: 2, cost: { wood: 200, food: 120 }, caps: { wood: 800, food: 800 }, makes: { wood: 0.55 }, jobs: 1, wallH: 62, icon: '🏪',
    blurb: 'Each market adds a trading stall and brings the traders round sooner.' },

  /* ---------- decorations ----------
     Bought and placed like buildings, but they take no time to put up, have no
     level, and can be taken away again. `charm` is what they are for: a village
     people want to look at works a little harder. `flat` marks the ones painted
     ONTO the ground rather than standing on it. */
  { key: 'path',    name: 'Path',      w: 1, h: 1, cost: { wood: 5 },             decor: true, flat: true, charm: 1,  icon: '🟫',
    // said "half again" while the figure above it was 2.2; the number moved once
    // and the words did not
    blurb: 'Villagers walk twice as fast on a road. Lay them end to end.' },
  { key: 'fence',   name: 'Fence',     w: 1, h: 1, cost: { wood: 8 },             decor: true, charm: 2,  icon: '🚧',
    blurb: 'Split rails. Good for edging a farm.' },
  { key: 'flowers', name: 'Flowerbed', w: 1, h: 1, cost: { wood: 10, food: 10 },  decor: true, charm: 5,  icon: '🌷',
    blurb: 'A bed of wildflowers.' },
  { key: 'hedge',   name: 'Hedge',     w: 1, h: 1, cost: { wood: 16, food: 8 },   decor: true, charm: 7,  icon: '🌲',
    blurb: 'A clipped green hedge.' },
  { key: 'lamp',    name: 'Lamp',      w: 1, h: 1, cost: { wood: 30 },            decor: true, charm: 12, icon: '🏮',
    blurb: 'An iron lamp on a post, lit at dusk.' },
  { key: 'statue',  name: 'Statue',    w: 1, h: 1, cost: { wood: 150, food: 80 }, decor: true, charm: 45, icon: '🗿',
    blurb: 'A stone figure on a plinth. The pride of the village.' },
];
/* The hottest primitive in the file by a distance -- centreOf, isDecor, jobsOf,
   every draw and every hit-test starts by looking a building up by key. It was
   a linear scan of the table, which is nothing on its own and everything at the
   rate this is called. A Map returns the same object, and undefined for an
   unknown key exactly as find did. */
const BY_KEY = new Map(BUILDINGS.map(b => [b.key, b]));
const B = k => BY_KEY.get(k);

/* ---------- land ----------
   The island used to be handed over whole, and a 14x14 field with four
   buildings on it never feels like it is growing. Now you start on a 6x6 core
   around the hall and buy your way outwards a ring at a time.

   This gives the village a second axis: the hall says WHAT you may build, the
   land says WHERE, and space becomes something you weigh rather than something
   you have too much of. It is also the largest sink in the game. */
const LAND = [
  { lo: 4, hi: 9,  cost: null },                          // the founding claim
  { lo: 3, hi: 10, cost: { wood: 200,  food: 120 } },
  { lo: 2, hi: 11, cost: { wood: 700,  food: 450 } },
  { lo: 1, hi: 12, cost: { wood: 2000, food: 1300 } },
  { lo: 0, hi: 13, cost: { wood: 5000, food: 3200 } },
];
const LAND_MAX = LAND.length - 1;
let landTier = 0;
let claimAsk = false;                 // the claim prompt is open

const landBounds = () => LAND[Math.min(LAND_MAX, Math.max(0, landTier))];
function inLand(c, r) { const L = landBounds(); return c >= L.lo && c <= L.hi && r >= L.lo && r <= L.hi; }
const landNext = () => (landTier >= LAND_MAX ? null : LAND[landTier + 1].cost);
const canClaim = () => !!landNext() && canAfford(landNext());
function claimLand() {
  if (!canClaim()) return false;
  for (const [k, v] of Object.entries(landNext())) res[k] -= v;
  landTier++;
  camFit();                              // show what was just bought
  claimAsk = false;
  save();
  SFX.upgrade();
  return true;
}
/* A save made before land existed, or edited, can hold buildings outside the
   current claim. Rather than strand them somewhere unreachable, the claim is
   widened to include what is already there. */
function coverPlaced() {
  for (const p of placed) {
    const b = B(p.key);
    while (landTier < LAND_MAX &&
      (p.c < landBounds().lo || p.r < landBounds().lo ||
       p.c + b.w - 1 > landBounds().hi || p.r + b.h - 1 > landBounds().hi)) landTier++;
  }
}

/* ---------- town hall levels ----------
   The hall is the spine of the game: every level raises the cap on what you may
   build, and introduces the next kind. `allow` is the TOTAL permitted at that
   level, not an increment, so the table reads as the shape of the village at
   each stage. `up` is the cost of reaching the NEXT level; null means the top. */
const HALL = [
  null,
  { allow: { house: 2,  farm: 1, lumber: 1 },                                       up: { wood: 150,  food: 80 } },
  { allow: { house: 4,  farm: 2, lumber: 2, store: 1, well: 1 },                    up: { wood: 400,  food: 220 } },
  { allow: { house: 6,  farm: 3, lumber: 3, store: 2, well: 2, mill: 1 },           up: { wood: 900,  food: 500 } },
  { allow: { house: 9,  farm: 4, lumber: 4, store: 3, well: 3, mill: 2, market: 1 }, up: { wood: 2000, food: 1100 } },
  { allow: { house: 12, farm: 6, lumber: 6, store: 4, well: 4, mill: 3, market: 2 }, up: null },
];
const HALL_MAX = HALL.length - 1;
const HALL_TIME = 6;                  // seconds an upgrade takes

/* ---------- building levels ----------
   The hall caps HOW MANY of each building you may have, which on its own runs
   out: by hall level 4 the village is full and there is nothing left to want.
   Levels are the sink. Every building goes to 5, each step costing sharply more
   than the last, so a full storehouse always has somewhere to go.

   A building may never outrank its hall. That is what keeps the hall the centre
   of the game rather than a gate you walk through once. */
const LVL_MAX = 5;
const lvlOf = p => Math.min(LVL_MAX, Math.max(1, p.lvl | 0));
// what a level is worth: level 5 is 2.4x level 1
const outMul = l => 1 + 0.35 * (l - 1);
const popOf  = p => B(p.key).pop ? B(p.key).pop + (lvlOf(p) - 1) : 0;
/* How many people actually live here right now.

   A house being UPGRADED keeps the people it already had, for exactly the
   reason a storehouse keeps its capacity while it is being improved: counting
   only finished buildings threw the residents out for the duration, so the
   workplaces they staffed stopped, and improving a house punished you for
   improving it. A house that has never finished houses nobody. */
function livedIn(p) {
  if (!B(p.key).pop) return 0;
  const lvl = p.t >= 1 ? lvlOf(p) : lvlOf(p) - 1;
  return lvl >= 1 ? B(p.key).pop + (lvl - 1) : 0;
}
// and how many are on their way, once what is being built finishes
const peopleComing = () => placed.reduce((n, p) =>
  n + (p.t < 1 && B(p.key).pop ? popOf(p) - livedIn(p) : 0), 0);
/* A bigger workplace employs more people. Without this the village runs out of
   jobs long before it runs out of houses, and every house past the fourth is
   wood spent on villagers who stand about. */
const jobsOf = p => { const b = B(p.key); if (!b.jobs) return 0;
  const l = lvlOf(p); return b.jobs + (l >= 3 ? 1 : 0) + (l >= 5 ? 1 : 0); };
const capsOf = (p, k) => B(p.key).caps ? Math.round(B(p.key).caps[k] * outMul(lvlOf(p))) : 0;
const rateOf = (p, k) => (B(p.key).makes ? B(p.key).makes[k] || 0 : 0) * outMul(lvlOf(p));

/* Upgrade prices climb steeply on purpose -- a gentle curve is exhausted in an
   evening. A house runs 65, 140, 295, 620 wood across its four steps. */
const UP_STEP = 2.2, UP_GROWTH = 2.1;
function upCostOf(p) {
  const b = B(p.key), f = UP_STEP * Math.pow(UP_GROWTH, lvlOf(p) - 1);
  const c = {};
  for (const [k, v] of Object.entries(b.cost)) if (v) c[k] = Math.round(v * f / 5) * 5;
  // wood-only buildings start wanting food too, so late upgrades drain both
  // piles rather than leaving one of them pointless
  if (!c.food) c.food = Math.round(f * 9 / 5) * 5;
  return c;
}
const upTime = p => 4 + 2 * lvlOf(p);

/* Everything the upgrade button needs to know, for the hall and for the rest. */
function upInfo(p) {
  const l = lvlOf(p);
  if (p.key === 'hall') {
    const nx = HALL[l].up;
    return { max: !nx, cost: nx, gate: 0 };
  }
  if (l >= LVL_MAX) return { max: true, cost: null, gate: 0 };
  // gate: the hall level you would need first, or 0 if none
  return { max: false, cost: upCostOf(p), gate: l >= hallLevel() ? l + 1 : 0 };
}
function canUpgrade(p) {
  if (!p || p.t < 1) return false;
  const i = upInfo(p);
  return !i.max && !i.gate && canAfford(i.cost);
}
function upgradeBuilding(p) {
  if (!canUpgrade(p)) return false;
  const i = upInfo(p);
  for (const [k, v] of Object.entries(i.cost)) res[k] -= v;
  p.lvl = Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, lvlOf(p) + 1);
  p.t = 0;                            // back under scaffolding while it grows
  p.build = p.key === 'hall' ? HALL_TIME : upTime(p);
  recomputeCaps();
  save();
  SFX.upgrade();
  return true;
}

let res = { wood: 120, food: 60 };
let caps = { wood: 300, food: 300 };
let placed = [];                      // {id,key,c,r,t,lvl,stock} t = build progress 0..1
let nextId = 1;
let selBuild = null;                  // key being placed
let ghost = null;                     // {c,r,ok}
let panel = null;                     // id of the building whose panel is open
let moving = null;                    // id of the building being relocated
/* Placement takes two taps: the first puts the ghost down, the second commits.

   One tap was not enough. The ghost only updates while a pointer is DOWN, so on
   a phone a single tap placed the building instantly and the preview -- which is
   where the efficiency of the spot is shown -- was never on screen long enough
   to read. Choosing a spot you were shown beats discovering it afterwards, and
   a mis-tap now costs nothing. */
let armed = null;                     // {c,r} the ghost is waiting to confirm
/* Selling is the only move in the game that cannot be undone, and it was the
   one thing that happened on a single tap -- while PLACING a building, which
   costs nothing you cannot get back, asked for confirmation. A level five mill
   is two thousand wood and one mis-tap from gone. It now arms first, and
   disarms itself after a few seconds so the panel is never left sitting there
   with a live demolish button on it. */
let sellArm = null;                   // {id, t} the sell button awaiting its second tap
const SELL_ARM = 4;                   // seconds before it goes back to sleep

/* ---------- orders ----------
   Two problems, one system.

   Between decisions there was nothing to do but watch numbers rise. And one
   resource always ran ahead of the other -- food routinely sat at its cap doing
   nothing while wood was the bottleneck -- so half the village's output was
   being thrown away.

   Orders are a standing trade: hand over the resource you have too much of, take
   the one you need. They are deliberately SMALL and slow to arrive, because an
   order that beats a lumber camp would replace the game rather than season it.
   Sized against the storage cap so they stay meaningful as the village grows. */
const ORDER_SLOTS = 3;                // with no market
const ORDER_EVERY = 75;               // seconds between new offers, likewise
let orders = [], orderT = 0, orderSeq = 1, ordersDone = 0;

/* The market runs the market.

   As a producer it was dominated ten to twenty times over by every other
   workplace, and as storage it was half a storehouse per wood -- so a player
   who did the arithmetic would never build one. The problem was not its
   numbers: it was that the trade BUILDING had nothing to do with the trade
   SYSTEM. Now each one adds a stall and brings the traders round faster, which
   at a full village is where a third of all wood comes from. */
const marketCount = () => placed.reduce((n, p) => n + (p.key === 'market' && p.t >= 1 ? 1 : 0), 0);
const orderSlots = () => Math.min(5, ORDER_SLOTS + marketCount());
const orderEvery = () => ORDER_EVERY / (1 + 0.30 * marketCount());

/* Three sizes, and the big one trades better.

   Every offer used to be a random 10-14% of the cap paying back a random
   10-13%, and the direction is fixed by whichever resource the village is
   richer in -- so the three stalls showed three copies of the same trade at
   three barely different prices, and which one to take was luck rather than a
   decision. Now they are a quick one, a middling one and a big one, and the
   rate improves with the size, so holding out for the big stall is a real
   choice and saving up for it is rewarded.

   Every rate is still BELOW even, and that is deliberate. Direction follows the
   surplus, so an order that paid more than it cost could be looped -- give
   food, take wood, now wood is the rich one, give it back -- and it would print
   resources for ever. (My first numbers asked 14% and returned 8%, which is the
   same mistake pointing the other way: auto-filling every order stalled the run
   completely.) Trade is not meant to be profitable in units. Its value is that
   a full barn is throwing away everything the villagers carry into it, so
   converting that surplus at 94% into the thing you are short of is a bargain
   against the nothing it was worth. */
const ORDER_TIERS = [
  { size: 0.07, rate: 0.88 },
  { size: 0.14, rate: 0.94 },
  { size: 0.23, rate: 0.99 },
];
/* Which size an order of this many units is, for an order that predates the
   tiers or whose cap has since changed. */
function nearestTier(n, kind) {
  const share = n / Math.max(1, caps[kind]);
  let best = 0, bd = Infinity;
  ORDER_TIERS.forEach((T, i) => { const d = Math.abs(T.size - share); if (d < bd) { bd = d; best = i; } });
  return best;
}
function makeOrder(tier) {
  // ask for whichever resource the village is currently richer in
  const richWood = (res.wood / Math.max(1, caps.wood)) > (res.food / Math.max(1, caps.food));
  const giveK = richWood ? 'wood' : 'food', getK = richWood ? 'food' : 'wood';
  /* Prefer a size that is not already on the board, so the stalls stay
     distinct even though they are filled one at a time. */
  if (tier === undefined) {
    const taken = new Set(orders.map(o => o.tier));
    const free = ORDER_TIERS.map((_, i) => i).filter(i => !taken.has(i));
    const from = free.length ? free : ORDER_TIERS.map((_, i) => i);
    tier = from[(Math.random() * from.length) | 0];
  }
  const T = ORDER_TIERS[tier];
  /* Round to fives once the numbers are big enough to look untidy otherwise --
     at an early cap of 300 the small stall is asking for twenty, and rounding
     THAT to a five turns a 12% spread into a 25% one. */
  const snap = n => n >= 100 ? Math.max(5, Math.round(n / 5) * 5) : Math.max(1, Math.round(n));
  const giveN = snap(caps[giveK] * T.size);
  /* Both sides as a share of the SAME cap, so the rate means what it says even
     when the two ceilings differ. */
  let getN = snap(caps[getK] * T.size * T.rate);
  /* And rounding must never pull an order up to exactly even. It did: at a cap
     of 1000 the big stall asked 230 and paid 230, which is a free converter,
     and a free converter makes wood and food the same resource for anyone who
     opens the tab -- no reason to balance farms against lumber camps, and every
     smaller stall pointless. Compared as shares, because the two ceilings can
     differ. */
  const step = getN >= 100 ? 5 : 1;
  while (getN > step && getN / caps[getK] >= giveN / caps[giveK]) getN -= step;
  return { id: orderSeq++, tier, giveK, giveN, getK, getN };
}
function stepOrders(dt) {
  orderT += dt;
  if (orderT < orderEvery()) return;
  orderT = 0;
  if (orders.length < orderSlots()) { orders.push(makeOrder()); save(); return; }
  /* A full board never changed again until something on it was filled, and an
     order asks for whichever resource the village was richer in WHEN IT WAS
     WRITTEN. Spend that down, or simply tip the other way, and all three point
     the wrong way at once -- three offers the player cannot take, sitting there
     for ever. Half an hour of simulated time with the same three ids on the
     board, and no way to clear them.

     A trader gives up and a new one comes, but only when there is nothing on
     the board the player could have taken: an offer they can act on is never
     pulled out from under them, even one they are saving up for. Replaced in
     place so the cards do not jump around. */
  if (orders.some(canFill)) return;
  const oldest = 0;
  orders.splice(oldest, 1, makeOrder());
  save();
}
/* Room for the reward is part of the price. Without this an order filled while
   the paid resource is capped takes the goods and hands back nothing, silently
   -- I gave 40 food for 0 wood before this check existed. */
const hasRoom = o => caps[o.getK] - res[o.getK] >= o.getN;
const canFill = o => !!o && res[o.giveK] >= o.giveN && hasRoom(o);
function fillOrder(o) {
  if (!canFill(o)) return false;
  res[o.giveK] -= o.giveN;
  res[o.getK] = Math.min(caps[o.getK], res[o.getK] + o.getN);
  orders = orders.filter(q => q.id !== o.id);
  ordersDone++;
  SFX.goal();
  save();
  return true;
}

/* ---------- goals ----------
   Levels alone give a village somewhere to spend, but nothing to aim at. These
   run in a fixed order, one at a time, each naming the next thing worth doing
   and paying for it. Rewards are about a THIRD of what the next step costs: a
   nudge, not a bypass. Paying the full cost was tried and it let a player skip
   the entire early game -- the first hall upgrade fell from four minutes to
   nothing, because each goal handed over enough to complete the next one.

   done() is checked against the village itself rather than counted by events,
   so a goal cannot be missed by a reload, a sell, or anything done out of
   order. */
let goalIdx = 0, goalDone = null;     // goalDone: {g, age} while the banner shows
const GOAL_SHOW = 4.5;
/* A shorter hold when the goal behind this one is ALREADY done. A player coming
   back to a village that has quietly satisfied several at once should see each
   of them, but not sit through four and a half seconds nine times over. */
const GOAL_SHOW_QUEUED = 1.8;

const anyAtLevel = n => placed.some(p => p.key !== 'hall' && lvlOf(p) >= n && p.t >= 1);
const GOALS = [
  { text: 'Build your first house',        done: () => countOf('house') >= 1,  give: { wood: 15 } },
  { text: 'Build a lumber camp',           done: () => countOf('lumber') >= 1, give: { food: 15 } },
  /* The second house comes BEFORE the farm, and the order matters more than it
     looks. One house is two villagers and the lumber camp takes both, so a farm
     built at this point has nobody to work it -- the goal strip said "build a
     farm" while the button for it said "no one free", which is a straight
     contradiction inside the first two minutes. Housed first, the farm is
     staffed the moment it is finished. */
  { text: 'House four villagers',          done: () => villagers.length >= 4,  give: { wood: 25 } },
  { text: 'Build a farm',                  done: () => countOf('farm') >= 1,   give: { wood: 30, food: 20 } },
  { text: 'Raise the town hall to level 2', done: () => hallLevel() >= 2,      give: { wood: 60, food: 40 } },
  { text: 'Build a storehouse',            done: () => countOf('store') >= 1,  give: { wood: 70 } },
  // not "at the market": trading needs no market, and naming one sends the
  // player looking for a building the hall will not allow for another two levels
  { text: 'Fill three trade orders',        done: () => ordersDone >= 3,        give: { wood: 100, food: 60 } },
  { text: 'Claim land beyond your border', done: () => landTier >= 1,          give: { wood: 120, food: 70 } },
  { text: 'Upgrade any building to level 2', done: () => anyAtLevel(2),        give: { wood: 90, food: 50 } },
  { text: 'Dig a well',                    done: () => countOf('well') >= 1,   give: { wood: 110 } },
  { text: 'Raise the town hall to level 3', done: () => hallLevel() >= 3,      give: { wood: 180, food: 120 } },
  { text: 'Claim a third ring of land',    done: () => landTier >= 2,          give: { wood: 350, food: 220 } },
  { text: 'Place five decorations',        done: () => decorCount() >= 5,      give: { wood: 150, food: 90 } },
  { text: 'Upgrade any building to level 3', done: () => anyAtLevel(3),        give: { wood: 250, food: 160 } },
  { text: 'Build a mill',                  done: () => countOf('mill') >= 1,   give: { wood: 350, food: 220 } },
  { text: 'Raise the town hall to level 4', done: () => hallLevel() >= 4,      give: { wood: 550, food: 360 } },
  { text: 'Open a market',                 done: () => countOf('market') >= 1, give: { wood: 800, food: 500 } },
  { text: 'Raise the town hall to level 5', done: () => hallLevel() >= 5,      give: { wood: 1400, food: 900 } },
  { text: 'Claim the whole island',        done: () => landTier >= LAND_MAX,   give: { wood: 2500, food: 1600 } },
];
const currentGoal = () => GOALS[goalIdx] || null;

function stepGoals(dt) {
  /* One at a time. The goals are a queue, and finishing one often reveals
     another that is ALREADY done -- fill three orders, and the land you claimed
     an hour ago and the building you upgraded last week both come due at once.
     Each then overwrote the last one's banner on the next frame, so the player
     saw a single announcement and silently collected three rewards. Now the
     next one waits for the banner in front of it. */
  const next = currentGoal();
  if (goalDone) {
    goalDone.age += dt;
    const hold = (next && next.done()) ? GOAL_SHOW_QUEUED : GOAL_SHOW;
    if (goalDone.age <= hold) return;
    goalDone = null;
  }
  const g2 = next;
  if (!g2 || !g2.done()) return;
  /* Bank what will actually fit and report THAT. Announcing the offered amount
     when storage swallowed half of it is the same lie the order rewards used to
     tell, and it is worse here because the banner is the only record.

     Through grant(), like every other way the village receives anything, so
     the reward lands on the hall as visible numbers rather than appearing only
     in a counter. */
  const h = hallOf(), c = h ? centreOf(h) : { x: 0, y: 0 };
  const got = {};
  for (const [k, val] of Object.entries(g2.give)) {
    const gained = Math.round(grant(k, val, c.x, c.y));
    if (gained > 0) got[k] = gained;
  }
  goalDone = { g: g2, got, age: 0 };
  goalIdx++;
  SFX.goal();
  save();
}

/* ---------- first-time hints ----------
   The village opens with an island, a hall and a row of icons, and says nothing
   about villagers being the entire economy. One line at a time, driven by what
   the village actually looks like, each shown ONCE and then remembered -- a hint
   that keeps coming back is nagging, not teaching. */
let tutSeen = [];
let tutT = 0;
const TUT_SHOW = 11;                  // seconds a hint stays up before it counts as read
const TUT = [
  { id: 'house', text: 'Build a house first — villagers live there, and villagers do all the work',
    when: () => countOf('house') === 0 },
  { id: 'work',  text: 'Now a lumber camp. Villagers will work it and carry the wood to your hall',
    when: () => countOf('house') > 0 && placed.some(p => p.key === 'house' && p.t >= 1)
                && !placed.some(p => B(p.key).jobs && p.key !== 'hall') },
  { id: 'tap',   text: 'Tap any building to upgrade, move or sell it',
    when: () => placed.some(p => B(p.key).jobs && p.key !== 'hall' && p.t >= 1) },
  { id: 'hall',  text: 'Your town hall can grow — tap it to raise what you are allowed to build',
    when: () => canUpgrade(hallOf()) },
  /* The one state whose cost is completely invisible. Full stores do not slow
     the village down, they throw its work away: villagers keep walking loads to
     a barn that cannot take them. The bar says "storage full" but not what that
     means, and a player who leaves the game overnight comes back to a village
     that earned nothing and no explanation of why. */
  { id: 'full',  text: 'Your stores are full — what villagers bring in now is thrown away. Build a storehouse, or spend it',
    when: () => placed.some(p => p.key !== 'hall' && B(p.key).jobs && p.t >= 1)
                && (res.wood >= caps.wood || res.food >= caps.food) },
];
function currentHint() {
  for (const h of TUT) if (!tutSeen.includes(h.id) && h.when()) return h;
  return null;
}
function stepHints(dt) {
  const h = currentHint();
  if (!h) { tutT = 0; return; }
  tutT += dt;
  if (tutT >= TUT_SHOW) { tutSeen.push(h.id); tutT = 0; save(); }
}

const hallOf = () => placed.find(p => p.key === 'hall');
const hallLevel = () => { const h = hallOf(); return h ? Math.min(HALL_MAX, Math.max(1, h.lvl | 0)) : 1; };
const allowedOf = key => (HALL[hallLevel()].allow[key] || 0);
const countOf = key => placed.reduce((n, p) => n + (p.key === key ? 1 : 0), 0);
// a building type you cannot have yet is hidden entirely; one you have run out
// of room for stays visible but locked, so the limit is legible
// takes a KEY, not a placed record, and tolerates an unknown one
const isDecor = key => { const b = B(key); return !!(b && b.decor); };
/* Decorations are not rationed by hall level -- the whole point is to let people
   fiddle -- but there is a ceiling on the total, so a village cannot be carpeted
   into an unreadable mess or a performance problem. */
const DECOR_MAX = 60;
const decorCount = () => placed.reduce((n, p) => n + (isDecor(p.key) ? 1 : 0), 0);
const unlocked = key => key === 'hall' || isDecor(key) || allowedOf(key) > 0;
const atLimit = key => isDecor(key) ? decorCount() >= DECOR_MAX : countOf(key) >= allowedOf(key);
/* Villagers with no post. A workplace built with none of these standing about
   produces NOTHING -- nobody moves house to staff it -- and the village is short
   of people at every hall level: eleven posts go begging at hall five with
   everything at level one. The hall unlocks a second farm, the tray sells it,
   and the wood buys an empty shed. It comes right as houses are upgraded, so
   the building is not wasted for ever, just useless for now -- which the player
   has no way to know at the moment they are deciding. */
const sparePeople = () => villagers.reduce((n, v) => n + (v.job == null ? 1 : 0), 0);
const wouldStandEmpty = key => {
  const b = B(key);
  /* Counting the people still walking out of a house that is being built, or
     it warned about the lumber camp the goal had just asked for -- the first
     house was three seconds from finishing and its two villagers were already
     spoken for. */
  return !!(b && b.jobs && !b.caps && key !== 'hall')
    && sparePeople() + peopleComing() === 0;
};

/* Charm: what decorations are actually for. A pleasant village works a little
   harder, capped so it stays a bonus rather than the main economy. */
const CHARM_FULL = 600, CHARM_CAP = 0.20;
/* Cached for the same reason as the stores: every rate the interface quotes
   multiplies by charm, so this whole-village scan ran twice per producer per
   frame. Decorations only appear and disappear through the paths that already
   rebuild, so it is rebuilt alongside them. */
let charmSum = 0;
function rebuildCharm() {
  charmSum = 0;
  for (const p of placed) if (isDecor(p.key)) charmSum += B(p.key).charm;
}
const charmTotal = () => charmSum;
/* How much of a decoration's charm the village can still USE. The bonus stops
   climbing at CHARM_FULL, which is about fourteen statues -- and the tray went
   on advertising the next forty-six at forty-five charm each, nearly seven
   thousand wood of purchases that changed no number in the game. A decoration
   bought past the line is worth having for the look of it; it is not worth
   having for the reason the tray was giving. */
const charmRoom = () => Math.max(0, CHARM_FULL - charmSum);
const usefulCharm = key => Math.min(B(key).charm || 0, charmRoom());
const charmMul = () => 1 + Math.min(CHARM_CAP, charmSum / CHARM_FULL * CHARM_CAP);

const occupied = (exceptId) => {
  const set = new Set();
  for (const p of placed) {
    if (exceptId !== undefined && p.id === exceptId) continue;   // a building being moved
    const b = B(p.key);
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) set.add((p.c + dc) + ',' + (p.r + dr)); }
  return set;
};
function canPlace(key, c, r, occ) {
  const b = B(key);
  if (c < 0 || r < 0 || c + b.w > GW || r + b.h > GH) return false;
  // every tile of the footprint has to be on land you actually own
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++)
    if (!inLand(c + dc, r + dr)) return false;
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) if (occ.has((c + dc) + ',' + (r + dr))) return false;
  return true;
}
const canAfford = cost => Object.entries(cost).every(([k, v]) => res[k] >= v);
/* Exactly how far short you are. "Cannot afford" was signalled by a red tint
   and nothing else, which says the same thing whether you are two wood away or
   two thousand -- and says nothing at all to the one man in twelve who cannot
   separate the red from the green. */
function shortfall(cost) {
  const out = {};
  for (const [k, v] of Object.entries(cost)) if (res[k] < v) out[k] = Math.ceil(v - res[k]);
  return out;
}
const shortText = cost => Object.entries(shortfall(cost))
  .map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join('  ');
const affordable = key => canAfford(B(key).cost);
const buildable = key => unlocked(key) && !atLimit(key) && affordable(key);

function place(key, c, r) {
  const b = B(key);
  /* The UI already gates both of these, but place() is also the API a test or a
     future caller reaches for. Unguarded it will spend into the negative, and
     it will happily drop a building on unclaimed land or on top of another
     one -- the position check is not optional just because the ghost normally
     does it. */
  if (!canAfford(b.cost)) return false;
  if (!canPlace(key, c, r, occupied())) return false;
  /* And the hall's allowance, which was the one gate left to the interface.
     The tray does refuse it and the selection clears after each placement, so
     no sequence of taps got past it -- but place() promises to be safe on its
     own, and a soak test calling it directly built ten houses under a hall that
     permits two. A guard that only exists in the button is a guard that leaves
     with the next redesign of the button. */
  if (atLimit(key)) return false;
  for (const [k, v] of Object.entries(b.cost)) res[k] -= v;
  placed.push({ id: nextId++, key, c, r, t: b.decor ? 1 : 0, lvl: 1, stock: 0, build: BUILD_TIME });
  recomputeCaps();
  save();
  SFX.place();
  return true;
}
/* The ceilings the village would have if this building were gone -- what the
   sell button has to quote, because selling storage takes its own capacity
   with it. */
/* What the village could hold, optionally pretending one building is not
   there. Both callers want the same sum; only one of them wants to keep it. */
function capsSum(skip) {
  // the hall itself holds more as it grows, so an upgrade is worth something
  // even before you have spent the room it unlocks
  const base = 200 + 100 * hallLevel();
  const out = { wood: base, food: base };
  for (const p of placed) {
    if (p === skip || !B(p.key).caps) continue;
    /* A storehouse being UPGRADED keeps the capacity it already had. Counting
       only finished buildings meant starting an upgrade collapsed the ceiling,
       put the village instantly over it, and stopped every delivery until the
       work finished -- so improving your storage punished you for improving
       your storage. It earns the new capacity when it is done, not before. */
    const lvl = p.t >= 1 ? lvlOf(p) : lvlOf(p) - 1;
    if (lvl < 1) continue;                        // still being built the first time
    for (const k of ['wood', 'food']) out[k] += capsOf({ key: p.key, lvl }, k);
  }
  return out;
}
/* The ceilings the village would have if this building were gone -- what the
   sell button has to quote, because selling storage takes its own capacity with
   it.

   It used to get there by taking the building out of the world, calling
   recomputeCaps, and putting it back. That was merely ugly until the rebuilds
   hanging off recomputeCaps grew: the panel calls this every frame it is open,
   so an open panel rebuilt the store list four times a tick and threw away the
   workforce plan thirty times a second, which is the one thing the plan is
   cached to avoid. It just adds up the numbers now. */
function capsWithout(p) { return capsSum(p); }
function recomputeCaps() {
  rebuildStores();                    // the same events change both
  caps = capsSum();
}

/* Everything ever paid into a building, so selling can return a fair half
   rather than half of the original price -- a level 4 farm has had far more
   than a farm's worth put into it. Derived from the level, so nothing extra
   has to be stored or kept in step. */
function investedIn(p) {
  const t = { wood: 0, food: 0 };
  for (const [k, v] of Object.entries(B(p.key).cost)) t[k] += v;
  for (let l = 1; l < lvlOf(p); l++) {
    const c = p.key === 'hall' ? (HALL[l] && HALL[l].up) : upCostOf({ key: p.key, lvl: l });
    if (c) for (const [k, v] of Object.entries(c)) t[k] += v;
  }
  return t;
}
const sellValue = p => {
  const t = investedIn(p), o = {};
  for (const k of ['wood', 'food']) if (t[k]) o[k] = Math.floor(t[k] / 2);
  return o;
};
const canSell = p => !!p && p.key !== 'hall';      // the hall is the village
function sellBuilding(p) {
  if (!canSell(p)) return false;
  const c = centreOf(p);
  /* Take the building down BEFORE paying for it. Paid first, a storehouse
     refunded into the capacity it was about to take away with it, and the
     village was left holding more than it could store -- which then leaked
     back out on the next delivery. Selling storage cannot be a way to exceed
     storage. The panel quotes the refund against the same after-the-sale
     ceiling, so the figure on the button is still the figure received. */
  placed = placed.filter(q => q !== p);
  if (panel === p.id) panel = null;
  if (moving === p.id) moving = null;
  recomputeCaps();
  for (const [k, v] of Object.entries(sellValue(p))) grant(k, v, c.x, c.y);
  /* Anyone who worked here is out of a job this instant, not on the next tick.
     assignJobs does clear it, but until it ran the village held villagers
     posted to a building that no longer existed.

     Not anyone carrying, though. Sending them idle stopped them walking and
     they kept the load for ever -- a villager wandering the village holding
     eight food that would never be delivered, because the idle state has no way
     to put anything down. They finish the trip and go idle on arrival. */
  for (const g of villagers) if (g.job === p.id) { g.job = null; if (!g.carry) g.st = 'idle'; }
  save();
  SFX.sell();
  return true;
}

/* Decorations are taken away through sellBuilding like everything else -- half
   the price back, clamped to storage, the workers released, the caps and the
   charm total rebuilt. There used to be a second removeDecor() beside it doing
   the same job by hand, and doing it slightly wrong: it never recomputed, so
   with a cached charm total it would have left the village claiming a bonus for
   an ornament that was no longer there. Nothing called it. */

/* ---------- save ---------- */
const KEY = 'vil_save';
/* A second, older copy of the save.

   A village is hours of work held in one string. If that string is truncated by
   a browser killed mid-write, or the storage is cleared under us, load() finds
   nothing usable and the player is handed a brand new island with no
   explanation and no way back. The backup lags by roughly a minute and was
   itself a primary that loaded cleanly, so falling back to it costs a minute
   rather than everything. */
const KEY_BAK = 'vil_save_bak';
const BACKUP_EVERY = 12;              // saves between backups; saves are ~5s apart
let saveN = 0, saveFailed = false, loadedFromBackup = false;
const SAVE_V = 4;      // 2: house 2x1. 3: hall and jobs. 4: every building levels
/* The measured delivery rate is saved along with the time, so a village can
   carry on working while the game is shut. Saving the RATE rather than
   recomputing it on load matters: the rate the buildings are rated for is
   roughly double what they actually deliver, because villagers spend half
   their time walking, and paying out the rated figure would make being away
   better than playing. */
function save() {
  try {
    // promote the last known-good primary before overwriting it
    if (saveN++ % BACKUP_EVERY === 0) {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(KEY_BAK, prev);
    }
  } catch (e) {}
  try { localStorage.setItem(KEY, JSON.stringify({
    v: SAVE_V, res, placed, t: Date.now(), rate: rateNow, seen: tutSeen, mute: muted,
    goal: goalIdx, land: landTier, orders, ordersDone }));
    saveFailed = false;
  } catch (e) {
    /* Storage can be full, or blocked outright in a private window. Swallowing
       this means the player keeps playing a village that is not being written
       down, and finds out when they come back to nothing. */
    saveFailed = true;
  }
}
function load() {
  const parse = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const usable = x => x && typeof x === 'object' && x.v === SAVE_V && Array.isArray(x.placed);
  let s = parse(KEY);
  // same defensive shape as Gatestorm's loadProg: never trust what comes back
  if (!usable(s)) {
    const bak = parse(KEY_BAK);
    if (usable(bak)) { s = bak; loadedFromBackup = true; }
  }
  if (!usable(s)) return;
  if (s.rate && typeof s.rate === 'object') for (const k of ['wood', 'food'])
    if (typeof s.rate[k] === 'number' && isFinite(s.rate[k]) && s.rate[k] >= 0)
      rateNow[k] = Math.min(20, s.rate[k]);
  if (Number.isFinite(s.t)) savedAt = s.t;
  if (Array.isArray(s.seen)) tutSeen = s.seen.filter(x => typeof x === 'string');
  if (typeof s.mute === 'boolean') muted = s.mute;
  if (Number.isFinite(s.goal)) goalIdx = Math.max(0, Math.min(GOALS.length, s.goal | 0));
  if (Number.isFinite(s.land)) landTier = Math.max(0, Math.min(LAND_MAX, s.land | 0));
  if (Number.isFinite(s.ordersDone)) ordersDone = Math.max(0, s.ordersDone | 0);
  if (Array.isArray(s.orders)) {
    orders = s.orders.filter(o => o && ['wood', 'food'].includes(o.giveK) && ['wood', 'food'].includes(o.getK)
      && Number.isFinite(o.giveN) && Number.isFinite(o.getN))
      .slice(0, 5)
      /* The tier has to survive the trip. Without it every stall came back
         looking like the smallest one, so the board stopped marking its best
         rate and stopped keeping the three sizes distinct when it refilled --
         and both of those are invisible failures that only start after a
         reload. An order saved before tiers existed is placed by its size. */
      .map(o => ({ id: orderSeq++, giveK: o.giveK, getK: o.getK,
        tier: Number.isFinite(o.tier) ? Math.max(0, Math.min(ORDER_TIERS.length - 1, o.tier | 0))
          : nearestTier(o.giveN, o.giveK),
        giveN: Math.max(1, o.giveN | 0), getN: Math.max(1, o.getN | 0) }));
  }
  if (s.res && typeof s.res === 'object') for (const k of ['wood', 'food'])
    if (typeof s.res[k] === 'number' && isFinite(s.res[k])) res[k] = s.res[k];
  if (Array.isArray(s.placed)) placed = s.placed.filter(p =>
    p && B(p.key) && Number.isFinite(p.c) && Number.isFinite(p.r))
    .map(p => ({
      id: Number.isFinite(p.id) ? p.id | 0 : nextId++,
      key: p.key, c: p.c | 0, r: p.r | 0,
      t: typeof p.t === 'number' ? Math.min(1, Math.max(0, p.t)) : 1,
      lvl: Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, Math.max(1, p.lvl | 0)),
      stock: typeof p.stock === 'number' && isFinite(p.stock) ? Math.max(0, p.stock) : 0,
      build: BUILD_TIME,
    }));
  // ids must not collide with anything placed later in the session
  nextId = Math.max(nextId, ...placed.map(p => p.id + 1), 1);
  recomputeCaps();
  /* A stored amount was only checked for being a finite number, so a save
     holding -999 wood loaded as -999 wood: every cost then fails its
     affordability check for ever and the village can never build again.
     Clamped here, after recomputeCaps, because the ceiling depends on what was
     just loaded. */
  for (const k of ['wood', 'food']) res[k] = Math.max(0, Math.min(caps[k], res[k]));
}
/* What the village earned while the game was closed.

   The storage cap does the limiting rather than an arbitrary percentage: come
   back after an hour and you find full storehouses, which is the honest result
   and quietly makes upgrading storage worth more. Anything under a minute is
   ignored so a reload is not a reward. */
const AWAY_MIN = 60, AWAY_MAX = 12 * 3600;
let savedAt = 0;
let away = null;                      // {secs, got:{wood,food}} until dismissed

/* What the village is CAPABLE of producing per second, worked out from its
   buildings rather than from what was recently delivered.

   Offline earnings used the measured delivery rate, and that rate is zero
   whenever the storehouses are full -- because nothing can be delivered. So the
   player who filled their stores and went to bed, the one playing well, earned
   nothing while away, and the player who left with empty stores earned the lot.
   Exactly backwards.

   Villagers do not exist yet when this runs at boot, so the workforce is worked
   out the way assignJobs would fill it: the houses' population spread across
   the job slots, real workplaces before the hall's woodpile. Efficiency is
   folded in, so walking time is still paid for. */
function potentialRate() {
  /* The workforce assembled exactly the way assignJobs assembles it. It used to
     fill posts in the order they were built, which matched the game until hands
     started going where they deliver most -- and then the offline figure sat a
     quarter BELOW what the village was really producing, which is the same kind
     of lie as the ones it was written to avoid, just pointing the other way.

     Counted from the houses rather than from the villagers, because this runs
     at load, before the first tick has spawned any of them. */
  let pop = 0;
  for (const p of placed) pop += livedIn(p);
  const { want, posts } = desiredJobs(Math.min(pop, VILLAGER_MAX));
  const out = { wood: 0, food: 0 };
  for (const p of posts) {
    const hands = want.get(p.id) || 0;
    if (!hands) continue;
    out[Object.keys(B(p.key).makes)[0]] += hands * deliveredOf(p);
  }
  return out;
}

/* Credit a stretch of time the village worked through unwatched, and put up the
   card. Split out from collectAway because a cold start is not the only way to
   be away: on Android, closing the app usually leaves the page alive, so coming
   back an hour later resumes rather than reloads. */
function grantAway(secs) {
  const capped = secs > AWAY_MAX;              // away longer than the village can bank
  secs = Math.min(AWAY_MAX, secs);
  if (secs < AWAY_MIN) return;
  const got = {};
  let any = false, spilled = false;
  const rate = potentialRate();
  for (const k of ['wood', 'food']) {
    const room = caps[k] - res[k];
    const want = rate[k] * secs;
    const earned = Math.max(0, Math.min(room, want));
    /* Two different ceilings can eat this haul, and the card used to show the
       survivor of both with no account of either: twelve hours away could hand
       back three wood because the barn was already nearly full, and twelve
       hours was itself all you got for a week. Both are worth saying; neither
       was said. */
    if (want - earned > 1) spilled = true;
    if (earned >= 1) { res[k] += earned; got[k] = Math.floor(earned); any = true; }
  }
  if (any || spilled) away = { secs, got, capped, spilled };
}
// a cold start: measured from the save, which is where the last session ended
function collectAway() {
  if (!savedAt) return;
  grantAway((Date.now() - savedAt) / 1000);
}

/* A village with no hall has no rules and no centre, so one is founded for free
   at the middle of the map. Also repairs a save that predates the hall. */
/* Exactly one hall, always.

   load() is careful about every other kind of nonsense a save file can carry
   and did not check this one, because nothing in the game can build a second
   hall. A file that has somehow acquired two -- a merge, a half-written save,
   an edit -- loaded them both, and the village was then stuck with an
   unsellable duplicate woodpile that also counted as a storehouse and pulled
   every delivery distance towards itself. hallLevel() read whichever came
   first, so the allowances could come from the wrong one too.

   The best one wins: it is the one the player most likely paid for. */
function ensureHall() {
  const halls = placed.filter(p => p.key === 'hall');
  if (halls.length > 1) {
    halls.sort((a, b) => lvlOf(b) - lvlOf(a));
    placed = placed.filter(p => p.key !== 'hall' || p === halls[0]);
    recomputeCaps();
  }
  if (hallOf()) return;
  const b = B('hall'), c = Math.floor((GW - b.w) / 2), r = Math.floor((GH - b.h) / 2);
  placed.push({ id: nextId++, key: 'hall', c, r, t: 1, lvl: 1, stock: 0, build: BUILD_TIME });
  recomputeCaps();
}

/* ---------- simulation ---------- */
const BUILD_TIME = 3.0;
const SAVE_EVERY = 5;                 // seconds
let saveT = 0;
function step(dt) {
  if (hiddenAt) hiddenSim += dt;      // what the throttled tick managed while away
  stepCam(dt);
  if (backOpen()) armBack();          // so the back button can close it again
  if (sellArm) { sellArm.t -= dt; if (sellArm.t <= 0 || panel !== sellArm.id) sellArm = null; }
  /* Scaffolding comes down BEFORE the jobs are handed out. It used to be the
     last thing in the tick, so a building that finished had to wait a frame for
     anyone to walk to it -- and the recompute it triggers threw away the
     workforce plan that had just been acted on, leaving the village a tick out
     of step with itself. Nothing produces in here any more; see stepVillagers. */
  for (const p of placed) {
    if (p.t < 1) {
      p.t = Math.min(1, p.t + dt / (p.build || BUILD_TIME));
      // a finished building has to be written down, or reloading replays its
      // construction from wherever the last save caught it
      if (p.t >= 1) { recomputeCaps(); save(); }
    }
  }
  syncVillagers();
  assignJobs();
  stepVillagers(dt);
  stepFeedback(dt);
  stepHints(dt);
  stepGoals(dt);
  stepOrders(dt);
  /* Everything the villagers carry in changes res without going through place(),
     so without this a session's whole harvest is lost on reload. */
  saveT += dt;
  if (saveT >= SAVE_EVERY) { saveT = 0; save(); }
}

/* ---------- drawing ---------- */
function fitCanvas() {
  const sw = window.innerWidth || W, sh = window.innerHeight || H;
  const want = Math.max(H, Math.min(H * 2, Math.round(W * sh / sw)));
  /* The insets only move when the window does, and reading them means a
     getComputedStyle and a layout read -- cheap here, a forced synchronous
     layout in the middle of a frame on a phone. fitCanvas runs every frame, so
     it asks only when something actually changed. */
  if (cv.height !== want) { cv.height = want; VH = cv.height; readSafeArea(); }
  VH = cv.height; OY = Math.round((VH - H) / 2);
  CAM.base = VH / H;
}
function tilePath(c, r) {
  const p = tileToWorld(c, r);
  g.beginPath();
  g.moveTo(p.x, p.y - TH / 2); g.lineTo(p.x + TW / 2, p.y);
  g.lineTo(p.x, p.y + TH / 2); g.lineTo(p.x - TW / 2, p.y);
  g.closePath();
}
/* Fitting the painted island to the grid.

   The plate is not simply a diamond: below the grass there is a rim of earth
   and rock, so the bottom of the IMAGE is the bottom of the cliff, not the
   corner of the ground the village stands on. These three numbers, measured
   off the alpha channel, say where the top face actually is:

     faceW  width of the grass surface as a fraction of the image width
     ax,ay  where the near corner of that surface sits in the image

   The measured top face came out 1761 x 880 -- 2.001:1, so the plate really is
   drawn at the same projection as the tile grid and lines up exactly. */
const GROUND_FIT = { faceW: 0.9932, ax: 0.4994, ay: 0.9921 };

/* The sea is one painted image mirrored into a 2x2 tile, which makes it repeat
   with no seam whatever the artwork does at its edges: every tile boundary
   meets its own reflection. Built once, on the first frame after it loads. */
let waterPat = null;
function waterPattern() {
  if (waterPat) return waterPat;
  const im = artFor('water');
  if (!ready(im)) return null;
  const w = im.width, h = im.height;
  const cv = document.createElement('canvas');
  cv.width = w * 2; cv.height = h * 2;
  const q = cv.getContext('2d');
  q.drawImage(im, 0, 0);
  q.save(); q.translate(w * 2, 0); q.scale(-1, 1); q.drawImage(im, 0, 0); q.restore();
  q.save(); q.translate(0, h * 2); q.scale(1, -1); q.drawImage(im, 0, 0); q.restore();
  q.save(); q.translate(w * 2, h * 2); q.scale(-1, -1); q.drawImage(im, 0, 0); q.restore();
  waterPat = g.createPattern(cv, 'repeat');
  return waterPat;
}

function drawGround() {
  const b = worldBounds(), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;

  // sea, drawn far enough out that it still fills the screen at minimum zoom
  const pat = waterPattern();
  if (pat) {
    const pad = 2600;
    g.save(); g.fillStyle = pat;
    g.fillRect(b.x0 - pad, b.y0 - pad, (b.x1 - b.x0) + pad * 2, (b.y1 - b.y0) + pad * 2);
    g.restore();
  }

  // soft ground shadow so the plot sits ON something instead of floating
  g.save(); g.fillStyle = 'rgba(8,14,6,.5)'; g.filter = 'blur(26px)';
  g.beginPath(); g.ellipse(cx, cy + 26, (b.x1 - b.x0) / 2 + 30, (b.y1 - b.y0) / 2 + 24, 0, 0, 7); g.fill();
  g.filter = 'none'; g.restore();

  const land = artFor('ground');
  if (ready(land)) {
    const f = GROUND_FIT;
    const wid = (b.x1 - b.x0) / f.faceW;              // grass surface spans the grid
    const hgt = land.height * (wid / land.width);
    // the near corner of the grass meets the near corner of tile (GW-1, GH-1)
    const ny = tileToWorld(GW - 1, GH - 1).y + TH / 2;
    g.drawImage(land, cx - f.ax * wid, ny - f.ay * hgt, wid, hgt);
    return;
  }

  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const n = hash(c, r), n2 = hash(r * 3 + 1, c * 5 + 2);
    tilePath(c, r);
    // two greens mottled together, lighter toward the middle of the plot
    const mid = 1 - (Math.abs(c - GW / 2) + Math.abs(r - GH / 2)) / (GW / 2 + GH / 2);
    const hue = 92 + n * 14, sat = 30 + n2 * 14, lit = 27 + n * 9 + mid * 7;
    g.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
    g.fill();
    g.strokeStyle = 'rgba(24,44,20,.22)'; g.lineWidth = 1.2; g.stroke();
    // scattered grass tufts
    if (n2 > 0.74) { const p = tileToWorld(c, r);
      g.strokeStyle = `hsla(${hue - 6},${sat + 16}%,${lit + 14}%,.75)`; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = n * 6 + i * 2.1, ox = Math.cos(a) * 20, oy = Math.sin(a) * 9;
        g.beginPath(); g.moveTo(p.x + ox, p.y + oy); g.lineTo(p.x + ox + 2, p.y + oy - 7); g.stroke(); } }
  }
}
/* World height of each kind at scale 1, set against a cottage at ~207px so the
   trees read as trees rather than shrubs or redwoods. */
const SCENERY_H = { tree_pine: 115, tree_oak: 100, rock: 54, bush: 46 };

function drawScenery(o) {
  const p = tileToWorld(o.c, o.r), s2 = o.s;
  const art = artFor(o.kind);
  if (art) {
    const hgt = (SCENERY_H[o.kind] || 90) * s2, wid = art.width * (hgt / art.height);
    g.save();
    g.fillStyle = 'rgba(10,18,8,.30)';
    g.beginPath(); g.ellipse(p.x, p.y + 3, wid * 0.30, wid * 0.15, 0, 0, 7); g.fill();
    g.drawImage(art, p.x - wid / 2, p.y - hgt, wid, hgt);   // anchored bottom-centre
    g.restore();
    return;
  }
  g.save();
  g.fillStyle = 'rgba(10,18,8,.30)';
  g.beginPath(); g.ellipse(p.x, p.y + 4, 20 * s2, 9 * s2, 0, 0, 7); g.fill();
  if (o.rock) {
    g.fillStyle = '#7d7a72';
    g.beginPath(); g.moveTo(p.x - 20 * s2, p.y + 3); g.lineTo(p.x - 7 * s2, p.y - 18 * s2);
    g.lineTo(p.x + 12 * s2, p.y - 14 * s2); g.lineTo(p.x + 20 * s2, p.y + 3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)';
    g.beginPath(); g.moveTo(p.x - 7 * s2, p.y - 18 * s2); g.lineTo(p.x + 12 * s2, p.y - 14 * s2); g.lineTo(p.x + 2 * s2, p.y - 6 * s2); g.closePath(); g.fill();
  } else {
    g.strokeStyle = '#54341c'; g.lineWidth = 7 * s2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x, p.y - 26 * s2); g.stroke();
    const tiers = [[30, 20], [24, 34], [17, 46]];
    for (let i = 0; i < tiers.length; i++) {
      const [rw, ry] = tiers[i];
      g.fillStyle = `hsl(${104 + o.f * 12}, 38%, ${20 + i * 5}%)`;
      g.beginPath(); g.moveTo(p.x, p.y - (ry + 20) * s2);
      g.lineTo(p.x + rw * s2, p.y - ry * s2); g.lineTo(p.x - rw * s2, p.y - ry * s2); g.closePath(); g.fill();
    }
  }
  g.restore();
}
/* Villager height in world px. Set against the painted buildings rather than
   the tile: a villager should stand about as tall as a cottage doorway, which
   is roughly a third of the cottage itself. The procedural buildings this
   started with were much smaller, so 46 read fine then and looks like a mouse
   next to the art. */
const VILLAGER_H = 60;
function drawVillager(v) {
  const im = artFor(VILLAGERS[v.k % VILLAGERS.length]);
  const moving = Math.hypot(v.tx - v.x, v.ty - v.y) > 6 && v.wait <= 0;
  const HGT = VILLAGER_H;
  /* Standing art walks by leaning: rocked about the feet and lifted on each
     step, twice per stride so both feet read. Kept small -- at this size a
     hint of motion is convincing and anything more looks like staggering. */
  const bob = moving ? Math.abs(Math.sin(v.ph * 3)) * HGT * 0.05 : 0;
  const lean = moving ? Math.sin(v.ph * 1.5) * 0.055 : 0;
  g.save();
  g.fillStyle = 'rgba(10,18,8,.34)';
  g.beginPath(); g.ellipse(v.x, v.y + 2, HGT * 0.24, HGT * 0.11, 0, 0, 7); g.fill();
  if (ready(im)) {
    const w = im.width * (HGT / im.height);
    g.translate(v.x, v.y); g.rotate(lean); g.scale(v.face, 1);
    g.drawImage(im, -w / 2, -HGT - bob, w, HGT);
  } else {                                   // sprite not decoded yet
    g.fillStyle = '#c9b089'; g.beginPath(); g.arc(v.x, v.y - HGT * 0.75, 6, 0, 7); g.fill();
    g.fillStyle = '#5a6f8a'; g.fillRect(v.x - 5, v.y - HGT * 0.6, 10, HGT * 0.6);
  }
  g.restore();
  /* What they are carrying, drawn OUTSIDE the mirrored transform so the icon
     does not flip when a villager turns round. */
  if (v.carry) {
    const y = v.y - HGT - 13;
    g.save();
    g.fillStyle = 'rgba(14,22,12,.72)';
    g.beginPath(); g.roundRect(v.x - 15, y - 12, 30, 24, 12); g.fill();
    g.font = '17px Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(v.carry.k === 'wood' ? '🪵' : '🌾', v.x, y + 1);
    g.restore();
  }
}
/* Draws the painted sprite when it has loaded, and the procedural building when
   it has not -- so the village still works before the art arrives, and while it
   is still decoding on a cold start. */
function drawBuilding(p, alpha, tint) {
  const b = B(p.key);
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  const art = artFor(p.key);
  if (art && !tint) {                       // tint is only used by the ghost preview
    const grow = p.t < 1 ? 0.35 + 0.65 * p.t : 1;
    const f = ART_FIT[p.key] || FIT_DEF;
    const fw = (b.w + b.h) * TW / 2;        // width of the plot's diamond
    const wid = fw * f.w * grow;
    const hgt = art.height * (wid / art.width);
    // the plot's near vertex: where the front corner of the building lands
    const ny = cy + (b.w + b.h) * TH / 4;
    const left = cx - f.ax * wid, top = ny - f.ay * hgt;
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(10,18,8,.30)';
    g.beginPath(); g.ellipse(cx, cy, fw * 0.40, fw * 0.20, 0, 0, 7); g.fill();
    g.drawImage(art, left, top, wid, hgt);
    if (p.t < 1) {                          // scaffold while it goes up
      g.strokeStyle = 'rgba(230,200,140,.85)'; g.lineWidth = 3; g.setLineDash([8, 6]);
      g.beginPath(); g.moveTo(cx - fw * 0.4, ny); g.lineTo(cx, ny - hgt * 0.5); g.lineTo(cx + fw * 0.4, ny); g.stroke();
      g.setLineDash([]);
    }
    g.restore();
    return;
  }
  const halfW = (b.w + b.h) * TW / 4.6, halfH = (b.w + b.h) * TH / 4.6;
  const grow = p.t < 1 ? 0.35 + 0.65 * p.t : 1;      // rises as it is built
  const wallH = (b.wallH || 62) * grow;

  g.save(); g.globalAlpha = alpha;
  // footprint shadow
  g.fillStyle = 'rgba(10,18,8,.32)';
  g.beginPath(); g.ellipse(cx, cy + halfH * 0.32, halfW * 0.95, halfH * 0.62, 0, 0, 7); g.fill();

  if (b.key === 'farm') {                              // tilled rows, no walls
    g.fillStyle = tint || '#6b4a28';
    g.beginPath(); g.moveTo(cx, cy - halfH); g.lineTo(cx + halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx - halfW, cy); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,26,12,.55)'; g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      g.beginPath(); g.moveTo(cx - halfW * 0.8 + i * 9, cy + i * 5); g.lineTo(cx + halfW * 0.2 + i * 9, cy + halfH * 0.5 + i * 5); g.stroke();
    }
    if (p.t >= 1) { g.fillStyle = '#c9a83e';
      for (let i = 0; i < 7; i++) { const t = i / 6;
        g.beginPath(); g.arc(cx - halfW * 0.6 + t * halfW * 1.2, cy - halfH * 0.1 + Math.sin(t * 6) * 8, 5, 0, 7); g.fill(); } }
  } else {
    const top = cy - wallH;
    const lit = tint || '#8a6740', dark = tint || '#63482a';
    // left wall (lit) and right wall (shaded)
    g.fillStyle = lit;
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx - halfW, cy - wallH); g.closePath(); g.fill();
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(cx + halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx + halfW, cy - wallH); g.closePath(); g.fill();
    // timber framing: uprights following the iso rake of each wall
    if (p.t >= 1) {
      g.strokeStyle = 'rgba(48,32,16,.55)'; g.lineWidth = 3;
      for (let i = 1; i < 4; i++) {
        const t1 = i / 4;
        const lx = cx - halfW + halfW * t1, ly = cy + halfH * t1;
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - wallH); g.stroke();
        const rx = cx + halfW - halfW * t1, ry = cy + halfH * t1;
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx, ry - wallH); g.stroke();
      }
      // door on the left face, a shuttered window on the right
      const dh = wallH * 0.52, dw = halfW * 0.24;
      g.fillStyle = '#3b2716';
      g.beginPath(); g.moveTo(cx - halfW * 0.46, cy + halfH * 0.46);
      g.lineTo(cx - halfW * 0.46 + dw, cy + halfH * 0.46 + dw * halfH / halfW);
      g.lineTo(cx - halfW * 0.46 + dw, cy + halfH * 0.46 + dw * halfH / halfW - dh);
      g.lineTo(cx - halfW * 0.46, cy + halfH * 0.46 - dh); g.closePath(); g.fill();
      g.fillStyle = '#e8c477';
      const wy = cy + halfH * 0.30 - wallH * 0.62, ww = halfW * 0.20;
      g.beginPath(); g.moveTo(cx + halfW * 0.40, wy);
      g.lineTo(cx + halfW * 0.40 + ww, wy - ww * halfH / halfW);
      g.lineTo(cx + halfW * 0.40 + ww, wy - ww * halfH / halfW + wallH * 0.26);
      g.lineTo(cx + halfW * 0.40, wy + wallH * 0.26); g.closePath(); g.fill();
    }
    // pitched roof: two slopes off a ridge, so it is not a flat lozenge
    const ridge = top - halfH * 0.95, eave = top + halfH * 0.10;
    g.fillStyle = '#a4482e';
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx - halfW * 1.06, eave);
    g.lineTo(cx, eave + halfH * 0.92); g.closePath(); g.fill();
    g.fillStyle = '#7d3320';
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx + halfW * 1.06, eave);
    g.lineTo(cx, eave + halfH * 0.92); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(38,16,8,.55)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx - halfW * 1.06, eave); g.lineTo(cx, eave + halfH * 0.92);
    g.lineTo(cx + halfW * 1.06, eave); g.closePath(); g.stroke();
    g.strokeStyle = 'rgba(255,214,180,.30)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, ridge); g.lineTo(cx, eave + halfH * 0.92); g.stroke();
    // chimney + smoke once it is working
    if (p.t >= 1 && b.key !== 'lumber') {
      const chx = cx + halfW * 0.42, chy = ridge + halfH * 0.30;
      g.fillStyle = '#6e6157'; g.fillRect(chx - 6, chy - 26, 13, 28);
      g.fillStyle = 'rgba(226,226,226,.34)';
      for (let i = 0; i < 3; i++) { const t2 = ((Date.now() / 900 + i * 0.33) % 1);
        g.beginPath(); g.arc(chx + Math.sin(t2 * 5 + i) * 7, chy - 30 - t2 * 40, 5 + t2 * 9, 0, 7); g.fill(); }
    }
    // log pile marks the lumber camp
    if (p.t >= 1 && b.key === 'lumber') {
      g.fillStyle = '#6b4a28';
      for (let i = 0; i < 3; i++) { g.beginPath();
        g.ellipse(cx - halfW * 0.55 + i * 13, cy + halfH * 0.30 - i * 5, 11, 6, 0, 0, 7); g.fill(); }
    }
  }
  // scaffold while building
  if (p.t < 1) {
    g.strokeStyle = 'rgba(230,200,140,.85)'; g.lineWidth = 3; g.setLineDash([8, 6]);
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy - halfH); g.lineTo(cx + halfW, cy); g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

/* Roughly where the top of a building is in world space, so a badge can sit
   above it. The art path knows its real height; the procedural one is measured
   from its wall height. */
function topOf(p) {
  const b = B(p.key), art = artFor(p.key);
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  const ny = cy + (b.w + b.h) * TH / 4;
  if (art) {
    const f = ART_FIT[p.key] || FIT_DEF, fw = (b.w + b.h) * TW / 2;
    const wid = fw * f.w, hgt = art.height * (wid / art.width);
    return { x: cx, y: ny - f.ay * hgt };
  }
  return { x: cx, y: cy - (b.wallH || 62) - (b.w + b.h) * TH / 4 };
}
/* Badges are counter-scaled so they stay readable when the camera pulls back.
   Clamped, or at minimum zoom they swell over the buildings they label. */
const badgeScale = () => Math.max(0.55, Math.min(1.25, 1 / camScale()));

function drawStatus(p) {
  if (p.t < 1) return;
  const b = B(p.key);
  const hall = p.key === 'hall';
  const idle = b.jobs && !hall && workersAt(p.id) === 0;
  /* How much of this building the walk is taking, measured against the same
     building beside a store -- not its raw efficiency, which falls as a
     building improves and so flagged most of a finished village. */
  const reach = (!hall && b.makes && b.jobs && !idle) ? reachOf(p) : null;
  const far = reach !== null && reach < 0.5;
  const up = !idle && !far && canUpgrade(p);
  if (!hall && !idle && !far && !up) return;
  const t = topOf(p), s = badgeScale();
  g.save();
  g.translate(t.x, t.y - 14 * s); g.scale(s, s);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!hall && up) {
    /* You can afford to improve this. Shown only when it is actually
       affordable, so the village points at what to do next instead of wearing
       a permanent row of level numbers. */
    g.fillStyle = 'rgba(24,52,20,.9)'; g.strokeStyle = 'rgba(150,232,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-17, -16, 34, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 20px Segoe UI, sans-serif'; g.fillStyle = '#b6f58a';
    g.fillText('▲', 0, 1);
  } else if (far) {
    /* This building is losing more than half of itself to the walk. Amber
       rather than red: it is working, just badly, and the fix is a storehouse
       or a road. The figure is what it is LOSING, which is the thing worth
       acting on -- the old badge showed efficiency, so a well-placed level five
       farm and a stranded level one could wear the same number. */
    g.fillStyle = 'rgba(52,38,12,.9)'; g.strokeStyle = 'rgba(240,200,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-30, -16, 60, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 19px Segoe UI, sans-serif'; g.fillStyle = '#ffd98a';
    g.fillText('−' + Math.round((1 - reach) * 100) + '%', 0, 1);
  } else if (hall) {
    const label = 'Lv ' + hallLevel();
    g.font = 'bold 20px Segoe UI, sans-serif';
    const w = g.measureText(label).width + 22;
    g.fillStyle = 'rgba(20,32,16,.86)'; g.strokeStyle = 'rgba(226,200,120,.9)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-w / 2, -15, w, 30, 15); g.fill(); g.stroke();
    g.fillStyle = '#f0d894'; g.fillText(label, 0, 1);
    if (up) {                       // a hall that can grow gets a tick beside it
      g.fillStyle = 'rgba(24,52,20,.92)'; g.strokeStyle = 'rgba(150,232,110,.95)'; g.lineWidth = 2;
      g.beginPath(); g.arc(w / 2 + 15, 0, 13, 0, 7); g.fill(); g.stroke();
      g.font = 'bold 15px Segoe UI, sans-serif'; g.fillStyle = '#b6f58a';
      g.fillText('▲', w / 2 + 15, 1);
    }
  } else {
    /* A producer with nobody at it is the single most confusing state in the
       game, so it says so rather than quietly making nothing. Drawn as a plain
       glyph, not an emoji: at this size an emoji is a smudge, and it would be
       drawn in whatever colour happened to be current. */
    g.fillStyle = 'rgba(52,20,14,.9)'; g.strokeStyle = 'rgba(240,170,110,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(-17, -16, 34, 32, 16); g.fill(); g.stroke();
    g.font = 'bold 23px Segoe UI, sans-serif'; g.fillStyle = '#ffca7a';
    g.fillText('!', 0, 1);
  }
  g.restore();
}

/* Decorations, drawn in code rather than from art. They are simple enough that
   a few shapes read cleanly, and unlike the buildings there is no silhouette to
   get wrong. Seeded off the tile so a flowerbed does not shimmer between
   frames. */
/* World height of each decoration at scale 1, for when art arrives. A path is
   not here: it is fitted to the tile diamond instead of standing on it. */
const DECOR_H = { fence: 42, flowers: 34, hedge: 48, lamp: 80, statue: 88 };

function drawDecor(p, alpha) {
  const b = B(p.key), o = tileToWorld(p.c, p.r), n = hash(p.c * 13 + 7, p.r * 17 + 3);
  g.save();
  g.globalAlpha = alpha === undefined ? 1 : alpha;

  /* Painted art if it exists, the drawn version if not -- the same optional-art
     path the buildings use, so a decoration sprite can be dropped in later
     without touching this function again. */
  const art = artFor(p.key);
  if (art) {
    if (b.flat) {
      /* Forced to the tile's own diamond rather than to the art's aspect. The
         generated tile came back 1.83:1 instead of 2:1, and preserving that
         would leave every path tile 11% too tall and creeping over the row
         behind it. Squashing dirt by 9% is invisible; a misaligned grid is not. */
      const wid = TW * 1.02, hgt = TH * 1.02;
      g.drawImage(art, o.x - wid / 2, o.y - hgt / 2, wid, hgt);
    } else {
      g.fillStyle = 'rgba(10,18,8,.28)';
      g.beginPath(); g.ellipse(o.x, o.y + 3, 24, 11, 0, 0, 7); g.fill();
      const hgt = DECOR_H[p.key] || 48, wid = art.width * (hgt / art.height);
      g.drawImage(art, o.x - wid / 2, o.y - hgt, wid, hgt);
    }
    g.restore(); return;
  }

  if (p.key === 'path') {
    // painted onto the ground: a soft diamond, inset so neighbours run together
    tilePath(p.c, p.r);
    g.fillStyle = 'rgba(150,118,74,.85)'; g.fill();
    g.fillStyle = 'rgba(126,98,60,.55)';
    for (let i = 0; i < 4; i++) { const a = n * 7 + i * 1.7;
      g.beginPath(); g.ellipse(o.x + Math.cos(a) * 34, o.y + Math.sin(a) * 16, 7, 4, 0, 0, 7); g.fill(); }
    g.restore(); return;
  }
  const shade = () => { g.fillStyle = 'rgba(10,18,8,.28)';
    g.beginPath(); g.ellipse(o.x, o.y + 3, 26, 12, 0, 0, 7); g.fill(); };
  if (p.key === 'fence') {
    shade();
    g.strokeStyle = '#8a6438'; g.lineCap = 'round';
    // two posts on the tile's long axis, rails between, following the iso rake
    const dx = TW / 2 * 0.8, dy = TH / 2 * 0.8;
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(o.x - dx, o.y + dy); g.lineTo(o.x - dx, o.y + dy - 26); g.stroke();
    g.beginPath(); g.moveTo(o.x + dx, o.y - dy); g.lineTo(o.x + dx, o.y - dy - 26); g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#a37a48';
    for (const h2 of [10, 20]) { g.beginPath();
      g.moveTo(o.x - dx, o.y + dy - h2); g.lineTo(o.x + dx, o.y - dy - h2); g.stroke(); }
  } else if (p.key === 'flowers') {
    shade();
    g.fillStyle = '#4c7a35';
    g.beginPath(); g.ellipse(o.x, o.y, 30, 15, 0, 0, 7); g.fill();
    const cols = ['#e4574c', '#f0c04a', '#d97fc0', '#f2f0e4'];
    for (let i = 0; i < 9; i++) { const a = n * 11 + i * 0.9, r = 6 + (i % 3) * 7;
      g.fillStyle = cols[(i + Math.floor(n * 4)) % cols.length];
      g.beginPath(); g.arc(o.x + Math.cos(a) * r * 1.9, o.y + Math.sin(a) * r * 0.9 - 5, 4, 0, 7); g.fill(); }
  } else if (p.key === 'hedge') {
    shade();
    g.fillStyle = '#2f5a28';
    g.beginPath(); g.roundRect(o.x - 32, o.y - 30, 64, 34, 12); g.fill();
    g.fillStyle = '#3e7433';
    g.beginPath(); g.roundRect(o.x - 32, o.y - 34, 64, 24, 12); g.fill();
    g.fillStyle = 'rgba(150,200,120,.35)';
    g.beginPath(); g.ellipse(o.x - 10, o.y - 28, 16, 7, 0, 0, 7); g.fill();
  } else if (p.key === 'lamp') {
    shade();
    g.fillStyle = '#6a5a48';
    g.beginPath(); g.ellipse(o.x, o.y, 11, 5, 0, 0, 7); g.fill();
    g.strokeStyle = '#3f3830'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(o.x, o.y - 2); g.lineTo(o.x, o.y - 52); g.stroke();
    const glow = 0.7 + 0.3 * Math.sin(Date.now() / 700 + n * 6);
    g.fillStyle = 'rgba(255,206,120,' + (0.20 * glow) + ')';
    g.beginPath(); g.arc(o.x, o.y - 58, 20, 0, 7); g.fill();
    g.fillStyle = '#ffd98a';
    g.beginPath(); g.roundRect(o.x - 8, o.y - 68, 16, 18, 4); g.fill();
    g.strokeStyle = '#3f3830'; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(o.x - 8, o.y - 68, 16, 18, 4); g.stroke();
  } else if (p.key === 'statue') {
    shade();
    g.fillStyle = '#8d8a82';                     // plinth
    g.beginPath(); g.ellipse(o.x, o.y - 4, 26, 13, 0, 0, 7); g.fill();
    g.fillStyle = '#9a978e';
    g.beginPath(); g.roundRect(o.x - 20, o.y - 20, 40, 18, 4); g.fill();
    g.fillStyle = '#b3b0a6';                     // figure
    g.beginPath(); g.roundRect(o.x - 10, o.y - 60, 20, 42, 8); g.fill();
    g.beginPath(); g.arc(o.x, o.y - 66, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.30)';
    g.beginPath(); g.roundRect(o.x - 10, o.y - 60, 8, 42, 8); g.fill();
  }
  g.restore();
}
const drawPlaced = (p, alpha, tint) => isDecor(p.key) ? drawDecor(p, alpha) : drawBuilding(p, alpha, tint);

/* Land you do not own yet: one dark wash over every unclaimed tile, built as a
   single path so it is one fill rather than a hundred and sixty. A rope line
   marks the frontier, which reads as a boundary rather than as a rendering
   fault. */
function drawFrontier() {
  if (landTier >= LAND_MAX) return;
  const L = landBounds();
  g.save();
  g.beginPath();
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    if (c >= L.lo && c <= L.hi && r >= L.lo && r <= L.hi) continue;
    const p2 = tileToWorld(c, r);
    g.moveTo(p2.x, p2.y - TH / 2); g.lineTo(p2.x + TW / 2, p2.y);
    g.lineTo(p2.x, p2.y + TH / 2); g.lineTo(p2.x - TW / 2, p2.y);
    g.closePath();
  }
  g.fillStyle = 'rgba(9,16,26,.52)'; g.fill();
  // the owned edge, traced round the four corners of the claim
  const a = tileToWorld(L.lo, L.lo), b = tileToWorld(L.hi, L.lo);
  const c2 = tileToWorld(L.hi, L.hi), d = tileToWorld(L.lo, L.hi);
  g.beginPath();
  g.moveTo(a.x, a.y - TH / 2); g.lineTo(b.x + TW / 2, b.y);
  g.lineTo(c2.x, c2.y + TH / 2); g.lineTo(d.x - TW / 2, d.y); g.closePath();
  g.strokeStyle = 'rgba(240,214,140,.60)'; g.lineWidth = 3; g.setLineDash([16, 12]);
  g.stroke(); g.setLineDash([]);
  g.restore();
}

let pendingGhost = null;              // the placement label, drawn last
function drawWorld() {
  pendingGhost = null;
  const occSet = occupied();          // scenery hides under buildings
  drawGround();
  // paths are painted ON the ground, so they go down before anything stands up
  for (const p of placed) if (B(p.key).flat) drawDecor(p, 1);
  /* Tap a well and you can see how far it reaches. The panel already says how
     many workplaces it lifts; this says WHICH, which is the part that tells you
     where to move it. */
  if (panel != null) {
    const wp = byId(panel);
    if (wp && B(wp.key).boost && wp.t >= 1) drawWellReach(wp.c, wp.r, 0.8);
  }
  if (ghost && ghostKey()) {                            // placement preview
    const selKey = ghostKey(), b = B(selKey);
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) {
      tilePath(ghost.c + dc, ghost.r + dr);
      g.fillStyle = ghost.ok ? 'rgba(120,230,120,.40)' : 'rgba(235,90,70,.40)';
      g.fill();
    }
    if (ghost.ok) {
      // a well's reach, under the ghost, before it is paid for
      if (selKey === 'well') drawWellReach(ghost.c, ghost.r, 1);
      drawPlaced({ id: -1, key: selKey, c: ghost.c, r: ghost.r, t: 1, lvl: 1 }, 0.55);
      /* What this spot would actually be worth. Shown DURING placement, because
         telling the player afterwards is telling them too late. */
      const probe = { id: -1, key: selKey, c: ghost.c, r: ghost.r, t: 1, lvl: 1 };
      /* The two rates rather than a percentage. The player is comparing spots,
         and "0.31/s here, 0.58 beside a store" answers that directly, where a
         percentage has to be decoded first -- and decoded wrongly, since the
         same percentage means different things at different levels. */
      const isWell = !!B(selKey).boost;
      const eff = (B(selKey).caps || isWell) ? null : reachOf(probe);
      if (eff !== null || isWell) {
        const a = tileToWorld(ghost.c, ghost.r), d2 = tileToWorld(ghost.c + b.w - 1, ghost.r + b.h - 1);
        const cx = (a.x + d2.x) / 2, cy = (a.y + d2.y) / 2;
        const sc = badgeScale();
        /* Kept for AFTER the buildings are drawn. This label is the whole
           point of the placement preview, and it was being painted before the
           depth pass -- so choosing a spot behind the hall hid the one number
           the player was choosing by. */
        pendingGhost = () => {
        g.save();
        g.translate(cx, cy - 96 * sc); g.scale(sc, sc);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 22px Segoe UI, sans-serif';
        const empty = wouldStandEmpty(selKey);
        let txt;
        if (isWell) {
          const wg = wellGainAt(ghost.c, ghost.r, 1);
          /* In reach of three sheds that nobody is working is not the same as
             in reach of nothing, and "+0.00/s" beside "lifts 3 workplaces"
             reads as broken rather than as the truth it is. */
          txt = !wg.n ? 'reaches no workplace'
            : 'lifts ' + wg.n + (wg.n === 1 ? ' workplace' : ' workplaces') + '   ·   '
              + (wg.gain > 0.005 ? '+' + wg.gain.toFixed(2) + '/s' : 'none of them worked yet');
        } else txt = empty ? 'nobody free to work it — build a house'
          : deliveredOf(probe).toFixed(2) + '/s here'
            + (eff > 0.85 ? '' : '   ·   best ' + bestDeliveredOf(probe).toFixed(2));
        const w2 = g.measureText(txt).width + 26;
        g.fillStyle = 'rgba(14,22,12,.9)';
        const good = isWell ? wellGainAt(ghost.c, ghost.r, 1).n > 0 : !empty && eff > 0.66;
        g.strokeStyle = isWell ? (good ? '#9fe86b' : '#e59a86')
          : empty ? '#e59a86' : eff > 0.66 ? '#9fe86b' : eff > 0.42 ? '#e8c98a' : '#e59a86';
        g.lineWidth = 2.5;
        g.beginPath(); g.roundRect(-w2 / 2, -17, w2, 34, 17); g.fill(); g.stroke();
        g.fillStyle = isWell ? (good ? '#b6f58a' : '#f0a583')
          : empty ? '#f0a583' : eff > 0.66 ? '#b6f58a' : eff > 0.42 ? '#f0d89a' : '#f0a583';
        g.fillText(txt, 0, 1);
        g.restore();
        };
      }
    }
  }
  /* One depth-sorted pass over everything that stands on the ground, so a
     villager can walk behind a house and in front of the next one. */
  const ents = [];
  for (const p of placed) { const b = B(p.key);
    if (b.flat) continue;                      // already drawn with the ground
    ents.push({ y: tileToWorld(p.c + b.w - 1, p.r + b.h - 1).y,
      d: () => { drawPlaced(p, 1); if (!b.decor) drawStatus(p); } }); }
  for (const o of SCENERY) { if (occSet.has(o.c + ',' + o.r)) continue;
    ents.push({ y: tileToWorld(o.c, o.r).y, d: () => drawScenery(o) }); }
  for (const v of villagers) ents.push({ y: v.y, d: () => drawVillager(v) });
  ents.sort((a, b2) => a.y - b2.y);
  for (const e of ents) e.d();
  /* The well's reach again, outline only, so the far side of the circle is not
     lost behind whatever is standing in it. */
  const ringOf = p => p && B(p.key).boost ? p : null;
  const ring = ringOf(panel != null ? byId(panel) : null)
    || (ghost && ghost.ok && ghostKey() === 'well' ? { c: ghost.c, r: ghost.r } : null);
  if (ring) {
    const bw = B('well'), w = tileToWorld(ring.c + (bw.w - 1) / 2, ring.r + (bw.h - 1) / 2);
    const rx = bw.boostR * TW / Math.SQRT2, ry = bw.boostR * TH / Math.SQRT2;
    g.save();
    g.setLineDash([14, 10]);
    /* Dark underneath, light on top. Half of this circle crosses roofs and the
       other half crosses grass, and a single colour disappears into one of
       them whichever one you pick. */
    g.strokeStyle = 'rgba(10,24,34,.55)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(196,238,255,.95)'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.stroke();
    g.restore();
  }
  if (pendingGhost) pendingGhost();
  // after the entities, so the trees out in the wild are dimmed with the ground
  // they stand on rather than glowing against it
  drawFrontier();
  drawPops();
}

/* ---------- HUD ---------- */
/* The bar shows what the hall has unlocked, and nothing else. The town hall is
   never on it -- there is exactly one and it is founded for you. */
let barMode = 'build';                 // 'build' | 'decor' | 'orders'
const barList = () => barMode === 'decor'
  ? BUILDINGS.filter(b => b.decor)
  : barMode === 'orders' ? []
  : BUILDINGS.filter(b => b.key !== 'hall' && !b.decor && unlocked(b.key));

/* Order cards occupy the same strip as the build bar, laid out on the same
   geometry so the two cannot drift apart. */
function orderRects() {
  const u = US(), n = Math.max(1, orderSlots());
  const h = 118 * u, pad = 8 * u;
  const w = Math.min(250 * u, (W - pad * (n + 1)) / n);
  const y = hudBot() - h / 2 - 22 * u;
  const total = n * w + (n - 1) * pad;
  return orders.slice(0, n).map((o, i) => ({ o, x: (W - total) / 2 + w / 2 + i * (w + pad), y, w, h }));
}

/* The two tabs above the bar. One definition, used to draw and to hit-test. */
function tabRects() {
  const u = US(), bar = barRects()[0];
  const w = 152 * u, h = 46 * u, pad = 8 * u;
  const y0 = hudBot() - 118 * US() - 22 * US();
  const y = (bar ? bar.y - bar.h / 2 : y0) - h / 2 - 10 * u;
  const step = w + pad;
  return [
    { mode: 'build',    label: 'Build',    x: W / 2 - step, y, w, h },
    { mode: 'decor',    label: 'Decorate', x: W / 2,        y, w, h },
    { mode: 'orders',   label: 'Orders',   x: W / 2 + step, y, w, h },
  ];
}
function barRects() {
  const list = barList(), u = US(), n = list.length;
  const h = 118 * u, pad = 8 * u;
  const w = Math.min(190 * u, (W - pad * (n + 1)) / n);
  const y = hudBot() - h / 2 - 22 * u;
  const total = n * w + (n - 1) * pad;
  return list.map((b, i) => ({ b, x: (W - total) / 2 + w / 2 + i * (w + pad), y, w, h }));
}
function drawHUD() {
  const u = US();
  // resources
  const ry = hudTop() + 52 * u;
  g.save();
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.textBaseline = 'middle';
  /* Two lines inside the pill: the amount, and beneath it what the village is
     really achieving. The second number is measured from actual deliveries, not
     summed from the buildings' rated output -- the gap between the two is
     walking time, and it is easily half. */
  /* What the village WOULD deliver, for the chips to quote when a barn is full.
     The measured rate reads zero then -- every load is being thrown away, which
     is the one moment the player most needs a number and the only moment the
     interface stopped giving them one. Worked out once for both chips, off the
     cached workforce plan. */
  const wasting = (res.wood >= caps.wood - 0.5 || res.food >= caps.food - 0.5)
    ? potentialRate() : null;
  const chip = (x, icon, val, cap, col, rate, lost) => {
    const wch = 210 * u, h = 76 * u, full = val >= cap - 0.5;
    g.fillStyle = 'rgba(16,26,14,.80)';
    g.strokeStyle = full ? 'rgba(235,150,110,.75)' : 'rgba(255,255,255,.14)';
    g.lineWidth = full ? 3 : 2;
    g.beginPath(); g.roundRect(x, ry - h / 2, wch, h, h / 2); g.fill(); g.stroke();
    g.textAlign = 'left'; g.font = `${Math.round(28 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(icon, x + 16 * u, ry - 1 * u);
    g.font = `bold ${Math.round(27 * u)}px Segoe UI, sans-serif`; g.fillStyle = col;
    g.fillText(Math.floor(val) + ' / ' + cap, x + 58 * u, ry - 12 * u);
    /* Fitted to the pill, like everything else. The first version of the
       wasting line ran straight out of the chip and into the one beside it --
       and the screen-edge sweep could not see it, because a chip is not the
       edge of the screen. */
    const sub = (text, colour) => {
      const fit = fitLines(text, wch - 72 * u, 19 * u, 12 * u, 1);
      g.fillStyle = colour;
      g.fillText(fit.lines[0], x + 58 * u, ry + 18 * u);
    };
    if (full) sub(lost > 0.05 ? 'wasting ' + lost.toFixed(1) + '/s' : 'storage full', '#f0a583');
    else sub(rate > 0.02 ? '+' + rate.toFixed(1) + ' / s' : 'idle',
      rate > 0.02 ? '#8fd06a' : '#7d8a76');
  };
  chip(24 * u, '🪵', res.wood, caps.wood, '#e8c98a', rateNow.wood, wasting && wasting.wood);
  chip(24 * u + 226 * u, '🌾', res.food, caps.food, '#bfe08a', rateNow.food, wasting && wasting.food);
  const ch = charmTotal();
  if (ch > 0) {
    const x = 24 * u + 452 * u, wch = 190 * u, hh = 76 * u;
    g.fillStyle = 'rgba(16,26,14,.80)'; g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, ry - hh / 2, wch, hh, hh / 2); g.fill(); g.stroke();
    g.textAlign = 'left'; g.font = `${Math.round(28 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText('✨', x + 16 * u, ry - 1 * u);
    const cd = charmDelivered();
    g.font = `bold ${Math.round(27 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#cbb6f0';
    g.fillText(cd > 0.005 ? '+' + cd.toFixed(2) + '/s' : 'charm ' + ch, x + 58 * u, ry - 12 * u);
    g.font = `bold ${Math.round(19 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#8d84a8';
    /* "No workplaces yet" was shown for any gain too small to print, which
       covers a village full of working farms whose three charm is worth a
       thousandth of a load a second. Two different things, and only one of them
       is the player's to fix by building something. */
    const anyWork = placed.some(q => q.t >= 1 && B(q.key).makes && B(q.key).jobs && workersAt(q.id));
    g.fillText(cd > 0.005 ? 'charm ' + ch
      : anyWork ? 'too little to count yet' : 'no workplaces yet', x + 58 * u, ry + 18 * u);
  }
  g.restore();

  // build bar
  for (const r of barRects()) {
    const full = atLimit(r.b.key), can = !full && affordable(r.b.key), sel = selBuild === r.b.key;
    g.save();
    g.fillStyle = sel ? 'rgba(60,96,44,.95)' : can ? 'rgba(22,32,20,.92)' : 'rgba(40,22,20,.92)';
    g.strokeStyle = sel ? '#9fe86b' : can ? 'rgba(255,255,255,.22)' : 'rgba(200,110,90,.5)';
    g.lineWidth = sel ? 4 : 2.5;
    g.beginPath(); g.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = full ? 0.55 : 1;
    g.font = `${Math.round(38 * u)}px Segoe UI, sans-serif`;
    g.fillText(r.b.icon, r.x, r.y - r.h * 0.24);
    /* Shrunk like the price beneath it. The buttons divide a fixed 1024 across
       however many kinds there are, while the font grows with the HUD scale --
       so on a tall phone "Lumber Camp" came out 158 wide in a 134 button and ran
       into its neighbours. Another failure that only appears on the shape of
       screen the game is actually for. */
    const nameFit = fitLines(r.b.name, r.w - 12 * u, 18 * u, 11 * u, 1);
    g.fillStyle = '#fff'; g.fillText(nameFit.lines[0], r.x, r.y + r.h * 0.08);
    g.globalAlpha = 1;
    /* Shrunk to fit the button. Two costs and a charm value at the largest HUD
       scale is wider than the tile it sits in, and a price that runs into its
       neighbour is worse than a small one. */
    const trayRow = (text, colour) => {
      const fit = fitLines(text, r.w - 14 * u, 17 * u, 11 * u, 1, '');
      g.fillStyle = colour;
      g.fillText(fit.lines[0], r.x, r.y + r.h * 0.32);
    };
    const price = Object.entries(r.b.cost)
      .map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join('  ')
      /* What a decoration is FOR. The tray showed a statue at 150 wood beside a
         flowerbed at 10 and said nothing about the charm either one buys, which
         is the whole reason to want them -- the number only appeared on the
         panel of one you had already paid for. */
      + (r.b.charm ? (charmRoom() > 0 ? '  ✨' + usefulCharm(r.b.key) : '  ✨ full') : '');
    if (full) {
      // the cost is irrelevant when the hall will not allow another one
      trayRow(isDecor(r.b.key) ? decorCount() + '/' + DECOR_MAX + ' placed'
        : countOf(r.b.key) + '/' + allowedOf(r.b.key) + ' · upgrade hall', '#e5b28a');
    } else if (can && wouldStandEmpty(r.b.key)) {
      trayRow('no one free', '#e5b28a');   // allowed, affordable, nobody to work it
    } else if (can) {
      trayRow(price, '#e8c98a');
    } else {
      trayRow('need ' + shortText(r.b.cost), '#e59a86');
    }
    g.restore();
  }
  if (barMode === 'orders') {
    const rs = orderRects();
    if (!rs.length) {
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${Math.round(23 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#8d9a85';
      g.fillText('No orders just now — a trader will be along shortly',
        W / 2, hudBot() - 80 * u);
      g.restore();
    }
    /* Which stall on the board trades best. The rate rises with the size, and
       nothing on the card would otherwise say so -- comparing 105-for-99
       against 345-for-341 in your head is not a decision anyone should be asked
       to make while the numbers are already there to be compared for them. */
    const bestTier = rs.reduce((n, r) => Math.max(n, r.o.tier || 0), 0);
    for (const r of rs) {
      const ok = canFill(r.o);
      const best = ok && rs.length > 1 && (r.o.tier || 0) === bestTier
        && rs.some(q => (q.o.tier || 0) !== bestTier);
      g.save();
      g.fillStyle = ok ? 'rgba(22,32,20,.92)' : 'rgba(40,22,20,.92)';
      g.strokeStyle = best ? 'rgba(240,216,148,.9)'
        : ok ? 'rgba(159,232,107,.75)' : 'rgba(200,110,90,.5)';
      g.lineWidth = ok ? 3 : 2.5;
      g.beginPath(); g.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
      g.fillStyle = ok ? '#fff' : '#d8b3a6';
      g.fillText((r.o.giveK === 'wood' ? '🪵' : '🌾') + ' ' + r.o.giveN, r.x, r.y - r.h * 0.26);
      g.font = `${Math.round(20 * u)}px Segoe UI, sans-serif`;
      // say WHY a card cannot be taken, rather than just greying it
      const why = res[r.o.giveK] < r.o.giveN ? 'not enough' : !hasRoom(r.o) ? 'no room'
        : best ? 'best rate' : 'for';
      g.fillStyle = why === 'for' ? '#8d9a85' : best ? '#f0d894' : '#e59a86';
      g.fillText(why, r.x, r.y);
      g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
      g.fillStyle = ok ? '#9fe86b' : '#a2907f';
      g.fillText((r.o.getK === 'wood' ? '🪵' : '🌾') + ' ' + r.o.getN, r.x, r.y + r.h * 0.26);
      g.restore();
    }
  }
  for (const t of tabRects()) {
    const on = barMode === t.mode;
    g.save();
    g.fillStyle = on ? 'rgba(60,96,44,.95)' : 'rgba(18,26,16,.9)';
    g.strokeStyle = on ? '#9fe86b' : 'rgba(255,255,255,.18)'; g.lineWidth = on ? 3 : 2;
    g.beginPath(); g.roundRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, t.h / 2); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${Math.round(22 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = on ? '#eaffd6' : '#9fb094';
    g.fillText(t.label, t.x, t.y);
    /* Trading is where surplus food turns back into wood -- at a full village
       it is 30% of wood income -- but only if you go and look. A count on the
       tab means you never have to. */
    if (t.mode === 'orders') {
      const n = orders.filter(canFill).length;
      if (n) {
        const bx = t.x + t.w / 2 - 6 * u, by = t.y - t.h / 2 + 4 * u, r2 = 15 * u;
        g.fillStyle = '#e8b44a'; g.strokeStyle = 'rgba(20,30,16,.9)'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by, r2, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#2a1f08';
        g.font = `bold ${Math.round(19 * u)}px Segoe UI, sans-serif`;
        g.fillText(String(n), bx, by + 1 * u);
      }
    }
    g.restore();
  }
  if (selBuild || moving != null) {
    g.save(); g.textAlign = 'center'; g.fillStyle = '#cfe0a8';
    g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`;
    g.fillText(armed ? 'Tap the same spot again to confirm'
      : moving != null
        ? 'Tap where it should go  ·  tap a tab to cancel'
        : 'Tap a tile to try it  ·  tap the icon again to cancel',
      W / 2, tabRects()[0].y - tabRects()[0].h / 2 - 16 * u);
    g.restore();
  }
  drawMute();
  drawPanel();
  drawGoal();
  drawSaveState();
  drawHint();
  drawClaim();
  drawAway();
}

/* The standing goal, and the flash when one is finished. Both live in the same
   strip under the resource pills, and a first-time hint outranks them: a hint
   is only ever shown once, a goal is always there. */
/* Two things the player must be told, because neither is visible otherwise:
   that the village could not be written down, and that it was restored from the
   older copy so the last minute is missing. */
function drawSaveState() {
  if (!saveFailed && !loadedFromBackup) return;
  const u = US(), y = hudTop() + 190 * u;
  const txt = saveFailed
    ? 'The village cannot be saved — storage is full or blocked'
    : 'Restored from a backup — the last minute of play was lost';
  g.save();
  g.font = `bold ${Math.round(21 * u)}px Segoe UI, sans-serif`;
  const w = Math.min(W - 40 * u, g.measureText(txt).width + 52 * u), h = 50 * u;
  g.fillStyle = saveFailed ? 'rgba(58,20,16,.94)' : 'rgba(46,38,14,.94)';
  g.strokeStyle = saveFailed ? 'rgba(240,140,110,.9)' : 'rgba(230,200,110,.85)';
  g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = saveFailed ? '#ffb9a0' : '#f0d89a';
  g.fillText(txt, W / 2, y);
  g.restore();
}

function drawGoal() {
  if (away) return;
  const u = US(), y = hudTop() + 132 * u;
  if (goalDone) {
    const t = goalDone.age / GOAL_SHOW;
    const banked = goalDone.got || goalDone.g.give;
    const parts = Object.keys(banked).length
      ? Object.entries(banked).map(([k, v]) => (k === 'wood' ? '🪵 +' : '🌾 +') + v).join('   ')
      : 'stores already full';
    g.save();
    g.globalAlpha = Math.min(1, (1 - t) * 3);
    const txt = 'Goal complete!   ' + parts;
    const fit = fitLines(txt, W - 108 * u, 24 * u, 14 * u, 2);
    const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
    const w = Math.min(W - 40 * u, tw + 60 * u);
    const hh = Math.max(62 * u, fit.lines.length * fit.px * 1.22 + 30 * u);
    g.fillStyle = 'rgba(30,50,22,.95)'; g.strokeStyle = '#9fe86b'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 62 * u) / 2); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#eaffd6';
    pillLines(fit, W / 2, y);
    g.restore();
    return;
  }
  if (currentHint()) return;          // a one-off hint takes the strip first
  const gl = currentGoal();
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!gl) {
    g.font = `bold ${Math.round(21 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = 'rgba(210,230,190,.55)';
    g.fillText('Every goal done — the village is yours', W / 2, y);
    g.restore(); return;
  }
  const reward = Object.entries(gl.give).map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join(' ');
  const txt = gl.text + '   ·   ' + reward;
  const fit = fitLines(txt, W - 108 * u, 22 * u, 13 * u, 2);
  const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
  const w = Math.min(W - 40 * u, tw + 56 * u);
  const hh = Math.max(52 * u, fit.lines.length * fit.px * 1.22 + 28 * u);
  g.fillStyle = 'rgba(16,26,14,.80)'; g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 52 * u) / 2); g.fill(); g.stroke();
  g.fillStyle = '#c8d9b8';
  pillLines(fit, W / 2, y);
  g.restore();
}

/* Text that fits inside a pill: shrink, then wrap, then shrink again.

   The pills clamped their own WIDTH to the screen and then drew the text at
   full size regardless, so a long line ran off both edges -- the storage hint
   lost its first and last words. It is the failure a narrow phone shows and a
   wide desktop never does, which is the worst kind to leave in.

   Leaves the fitted font selected, so the caller can measure the lines it gets
   back without setting it again. */
function fitLines(text, maxW, px, minPx, maxLines, weight) {
  const w = weight === undefined ? 'bold ' : weight ? weight + ' ' : '';
  /* Almost every string already fits: one measurement to find that out, rather
     than splitting it into words and measuring them one at a time. The tray
     alone runs this fourteen times a frame. */
  g.font = `${w}${Math.round(px)}px Segoe UI, sans-serif`;
  if (g.measureText(text).width <= maxW) return { lines: [text], px };
  const words = text.split(' ');
  for (let size = px; ; size--) {
    g.font = `${w}${Math.round(size)}px Segoe UI, sans-serif`;
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && g.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    lines.push(cur);
    if (size <= minPx || (lines.length <= maxLines
      && lines.every(l => g.measureText(l).width <= maxW))) return { lines, px: size };
  }
}
function pillLines(fit, cx, cy) {
  const lh = fit.px * 1.22;
  const top = cy - (fit.lines.length - 1) * lh / 2;
  fit.lines.forEach((l, i) => g.fillText(l, cx, top + i * lh));
}
function drawHint() {
  if (away || goalDone) return;       // one thing at a time
  const h = currentHint(); if (!h) return;
  const u = US(), y = hudTop() + 132 * u;
  g.save();
  const fit = fitLines(h.text, W - 108 * u, 23 * u, 13 * u, 2);
  const tw = Math.max(...fit.lines.map(l => g.measureText(l).width));
  const w = Math.min(W - 40 * u, tw + 56 * u);
  const hh = Math.max(58 * u, fit.lines.length * fit.px * 1.22 + 30 * u);
  g.globalAlpha = Math.min(1, tutT * 3);           // fades in rather than snapping
  g.fillStyle = 'rgba(20,32,18,.92)'; g.strokeStyle = 'rgba(159,232,107,.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(W / 2 - w / 2, y - hh / 2, w, hh, Math.min(hh, 58 * u) / 2); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#dff0c8';
  pillLines(fit, W / 2, y);
  g.restore();
}

/* Tapping the dark ground offers it to you. Discovering the expansion by
   poking at the thing you want is better than a button in a menu, and it means
   the frontier itself is the affordance. */
function claimRects() {
  const u = US(), w = Math.min(W - 80 * u, 640 * u), h = 292 * u;
  const y = hudTop() + (hudBot() - hudTop()) / 2;
  return { u, x: W / 2, y, w, h,
    yes: { x: W / 2, y: y + h / 2 - 52 * u, w: w * 0.66, h: 66 * u },
    no:  { x: W / 2 + w / 2 - 34 * u, y: y - h / 2 + 34 * u, r: 27 * u } };
}
function drawClaim() {
  if (!claimAsk) return;
  const R = claimRects(), u = R.u, cost = landNext();
  g.save();
  g.fillStyle = 'rgba(6,10,6,.66)'; g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  g.fillStyle = 'rgba(16,26,15,.98)'; g.strokeStyle = 'rgba(240,214,140,.55)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 24 * u); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(32 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText(cost ? 'Claim more land' : 'The whole island is yours', R.x, R.y - R.h / 2 + 54 * u);
  const L = LAND[Math.min(LAND_MAX, landTier + 1)], side = L.hi - L.lo + 1;
  g.font = `${Math.round(22 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText(cost ? 'your village would grow to ' + side + ' x ' + side + ' tiles'
                  : 'there is nothing left to claim', R.x, R.y - R.h / 2 + 96 * u);
  if (cost) {
    const ok = canClaim();
    g.font = `bold ${Math.round(30 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = ok ? '#e8c98a' : '#e59a86';
    g.fillText(Object.entries(cost).map(([k, v]) => (k === 'wood' ? '🪵 ' : '🌾 ') + v).join('     '),
      R.x, R.y + 2 * u);
    g.fillStyle = ok ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
    g.strokeStyle = ok ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(R.yes.x - R.yes.w / 2, R.yes.y - R.yes.h / 2, R.yes.w, R.yes.h, 16 * u);
    g.fill(); g.stroke();
    g.fillStyle = ok ? '#eaffd6' : '#9aa693';
    g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
    /* A later ring can cost more than the village is able to HOLD, and then
       "need 140 more" is a lie -- you can never accumulate it. The way out is a
       bigger hall or another storehouse, so say that instead. */
    const overCap = Object.entries(cost).some(([k, val]) => val > caps[k]);
    g.font = `bold ${Math.round((overCap ? 22 : 26) * u)}px Segoe UI, sans-serif`;
    g.fillText(ok ? 'Claim it'
      : overCap ? 'Your stores cannot hold this much yet'
      : 'Need ' + shortText(cost) + ' more', R.yes.x, R.yes.y);
  }
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath(); g.arc(R.no.x, R.no.y, R.no.r, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`;
  g.fillText('×', R.no.x, R.no.y);
  g.restore();
}

/* Shown once on return, then dismissed by a tap anywhere. */
function awayRect() {
  const u = US(), w = Math.min(W - 80 * u, 620 * u), h = 300 * u;
  return { u, x: W / 2, y: hudTop() + (hudBot() - hudTop()) / 2, w, h };
}
function drawAway() {
  if (!away) return;
  const R = awayRect(), u = R.u;
  g.save();
  g.fillStyle = 'rgba(6,10,6,.66)'; g.fillRect(0, screenTop(), W, screenBot() - screenTop());
  g.fillStyle = 'rgba(16,26,15,.98)'; g.strokeStyle = 'rgba(159,232,107,.5)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 24 * u); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText('While you were away', R.x, R.y - R.h / 2 + 52 * u);
  const mins = away.secs / 60;
  const span = mins < 60 ? Math.round(mins) + ' minutes' : (mins / 60).toFixed(1) + ' hours';
  g.font = `${Math.round(22 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#a9bd9c';
  g.fillText('your villagers kept working for ' + span
    + (away.capped ? ', as long as a village can keep' : ''),
    R.x, R.y - R.h / 2 + 92 * u);
  const parts = Object.entries(away.got).map(([k, v]) => (k === 'wood' ? '🪵 +' : '🌾 +') + v);
  g.font = `bold ${Math.round(40 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#e8c98a';
  g.fillText(parts.length ? parts.join('     ') : 'nothing would fit', R.x, R.y + 6 * u);
  if (away.spilled) {
    g.font = `${Math.round(20 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#f0a583';
    g.fillText('the rest spilled — your stores were full', R.x, R.y + 46 * u);
  }
  g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#9fe86b';
  g.fillText('tap to continue', R.x, R.y + R.h / 2 - 40 * u);
  g.restore();
}

/* Sound you cannot switch off is worse than no sound, so the toggle sits in the
   HUD rather than in a settings screen this game does not have. */
function muteRect() {
  const u = US();
  return { x: W - 52 * u, y: hudTop() + 52 * u, r: 34 * u };
}
function drawMute() {
  const R = muteRect(), u = US();
  g.save();
  g.fillStyle = 'rgba(16,26,14,.78)'; g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2;
  g.beginPath(); g.arc(R.x, R.y, R.r, 0, 7); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(30 * u)}px Segoe UI, sans-serif`;
  g.fillStyle = muted ? '#8d9487' : '#fff';
  g.fillText(muted ? '🔇' : '🔊', R.x, R.y + 1 * u);
  g.restore();
}

/* ---------- building panel ----------
   One definition drives both the drawing and the hit-testing, the same
   discipline as the build bar, so what you can tap cannot drift from what you
   can see. */
function panelRects() {
  const u = US(), tabs = tabRects();
  const p = panel == null ? null : byId(panel);
  const btn = !!p;                             // every building has an upgrade button
  // 268 not 232: the efficiency line and the hall's village summary sit between
  // the blurb and the buttons, and at the old height they touched the buttons
  const w = Math.min(W - 48 * u, 720 * u), h = (btn ? 268 : 152) * u;
  const y = tabs[0].y - tabs[0].h / 2 - 14 * u - h / 2;
  const dec = !!(p && isDecor(p.key)), by = y + h / 2 - 44 * u, bh = 60 * u, gap = 10 * u;
  // a decoration has no upgrade, so its two buttons share the width differently
  const mw = dec ? w * 0.34 : w * 0.24, sw = dec ? w * 0.54 : w * 0.24;
  const uw = w - mw - sw - gap * 2 - 40 * u;
  let bx = W / 2 - (mw + sw + (dec ? 0 : uw + gap) + gap) / 2;
  const move = { x: bx + mw / 2, y: by, w: mw, h: bh }; bx += mw + gap;
  const sell = { x: bx + sw / 2, y: by, w: sw, h: bh }; bx += sw + gap;
  const up   = dec ? null : { x: bx + uw / 2, y: by, w: uw, h: bh };
  return { u, x: W / 2, y, w, h, btn, dec, move, sell, up,
    close: { x: W / 2 + w / 2 - 34 * u, y: y - h / 2 + 34 * u, r: 27 * u } };
}
/* What a well is really worth where it stands.

   It advertises "+35% faster", which is true of the RATE and not of what
   arrives: a villager still has to walk the same distance, so a well beside a
   good producer returned 20% and beside a distant one 9%. Same fault as the
   upgrade panel quoting rated output. This counts the delivered difference the
   well actually makes to everything in reach, which also says plainly when one
   has been put somewhere it helps nothing. */
function wellGain(w) {
  let n = 0, gain = 0;
  for (const p of placed) {
    if (p.t < 1 || !B(p.key).makes || !B(p.key).jobs) continue;
    const withIt = boostAt(p), without = boostAt(p, w.id);
    if (withIt === without) continue;
    n++;
    const hands = workersAt(p.id);
    if (!hands) continue;                  // boosting an unstaffed shed adds nothing
    const k = Object.keys(B(p.key).makes)[0], r = rateOf(p, k) * charmMul();
    gain += hands * (deliveredWith(p, r * withIt) - deliveredWith(p, r * without));
  }
  return { n, gain };
}

/* What a well put HERE would add. wellGain answers the same question for one
   that already exists, by taking it away again; this one has nothing to take
   away, so it adds the boost on instead.

   Placing a well was the last blind decision left in the game: forty wood on a
   building whose entire worth is which workplaces happen to fall inside a
   radius the player cannot see. */
function wellGainAt(c, r, lvl) {
  const bw = B('well');
  let n = 0, gain = 0;
  for (const p of placed) {
    const b = B(p.key);
    if (p.t < 1 || !b.makes || !b.jobs) continue;
    const dx = (c + (bw.w - 1) / 2) - (p.c + (b.w - 1) / 2);
    const dy = (r + (bw.h - 1) / 2) - (p.r + (b.h - 1) / 2);
    if (Math.hypot(dx, dy) > bw.boostR) continue;
    n++;
    const hands = workersAt(p.id);
    if (!hands) continue;              // in reach, but nobody there to speed up
    const without = boostAt(p), withIt = without + bw.boost * outMul(lvl);
    const base = rateOf(p, Object.keys(b.makes)[0]) * charmMul();
    gain += hands * (deliveredWith(p, base * withIt) - deliveredWith(p, base * without));
  }
  return { n, gain };
}
/* The reach, drawn on the ground. A circle in GRID space, which is an ellipse
   on screen -- the same two-to-one squash everything else lives in. */
function drawWellReach(c, r, alpha) {
  const bw = B('well'), w = tileToWorld(c + (bw.w - 1) / 2, r + (bw.h - 1) / 2);
  const rx = bw.boostR * TW / Math.SQRT2, ry = bw.boostR * TH / Math.SQRT2;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(120,190,240,.16)';
  g.strokeStyle = 'rgba(150,215,255,.85)'; g.lineWidth = 3;
  g.setLineDash([14, 10]);
  g.beginPath(); g.ellipse(w.x, w.y, rx, ry, 0, 0, 7); g.fill(); g.stroke();
  g.restore();
}

/* What charm is really adding, in goods per second rather than as a percentage
   of a rate nobody receives. Same treatment as the well: with minus without. */
function charmDelivered() {
  const m = charmMul();
  if (m <= 1) return 0;
  let gain = 0;
  for (const p of placed) {
    const b = B(p.key);
    if (p.t < 1 || !b.makes || !b.jobs) continue;
    const hands = workersAt(p.id);
    if (!hands) continue;
    const base = rateOf(p, Object.keys(b.makes)[0]) * boostAt(p);
    gain += hands * (deliveredWith(p, base * m) - deliveredWith(p, base));
  }
  return gain;
}

/* How the village is doing as a whole, shown on the hall.

   Everything the player needs to improve a village has been per-building until
   now, so nothing ever said "you have three villagers standing about" or "your
   workplaces average 48%" -- which are the two facts that actually tell you
   what to do next. Idle villagers mean build a workplace; a low average means
   move a storehouse or lay a road. */
function villageStats() {
  const prod = placed.filter(p => p.t >= 1 && B(p.key).jobs && B(p.key).makes && p.key !== 'hall');
  let working = 0;
  for (const p of placed) if (B(p.key).jobs) working += workersAt(p.id);
  const idle = Math.max(0, villagers.length - working);
  // measured against what each would give in a good spot -- see reachOf
  const effs = prod.map(p => reachOf(p)).filter(e => e !== null);
  const avg = effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : null;
  const slots = placed.reduce((n, p) => n + (p.t >= 1 ? jobsOf(p) : 0), 0);
  return { villagers: villagers.length, working, idle, avg, slots, workplaces: prod.length };
}

/* A single row of panel text, shrunk until it fits the card.

   The panel sets a size and draws, and the strings on it carry counts, costs,
   rates and advice whose length is not knowable when the layout is written --
   the same way the banners did before they started running off the screen. The
   village summary is the worst of them: "18 villagers - 8 posts with nobody in
   them - build or improve a house - workplaces at 74% of their best" is half
   again as wide as the card it sits on. */
function panelRow(text, x, y, maxW, px, colour, weight) {
  const fit = fitLines(text, maxW, px, px * 0.62, 1, weight);
  g.fillStyle = colour;
  g.fillText(fit.lines[0], x, y);
}
function drawPanel() {
  if (panel == null) return;
  const p = byId(panel); if (!p) { panel = null; return; }
  const b = B(p.key), R = panelRects(), u = R.u;
  g.save();
  g.fillStyle = 'rgba(14,22,13,.95)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(R.x - R.w / 2, R.y - R.h / 2, R.w, R.h, 20 * u); g.fill(); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const lx = R.x - R.w / 2 + 26 * u;
  g.font = `bold ${Math.round(30 * u)}px Segoe UI, sans-serif`; g.fillStyle = '#fff';
  g.fillText(b.icon + '  ' + b.name + (B(p.key).decor ? '' : '  ·  Level ' + lvlOf(p)),
    lx, R.y - R.h / 2 + 38 * u);
  panelRow(b.blurb, lx, R.y - R.h / 2 + 78 * u, R.w - 56 * u, 22 * u, '#bccfae', '');

  /* What this sale would destroy, worked out before any row is drawn.

     A storehouse gets a row of its own for this, because its whole purpose is
     capacity. A MARKET holds just as much and its row is taken by the trading
     stalls, and a hall or a farm can be over the line too. So once the sell
     button is armed -- the moment the player is actually about to do it -- the
     warning takes that row whatever the building is. It does not take it before
     then, or a market would permanently stop saying what a market is for. */
  const sellRoom = canSell(p) ? capsWithout(p) : null;
  const spoiling = sellRoom
    ? ['wood', 'food'].map(k => [k, Math.max(0, Math.floor(res[k] - sellRoom[k]))]).filter(([, v]) => v > 0)
    : [];
  const armedHere = sellArm && sellArm.id === p.id;
  const spoilRow = (armedHere && spoiling.length)
    ? 'Selling it drops storage to 🪵' + sellRoom.wood + '  🌾' + sellRoom.food
      + '   —   ' + spoiling.map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join(' ')
      + ' would spoil'
    : null;


  /* What this building does at its CURRENT level, and what the next one would
     make it -- the number is the whole reason to spend, so it is spelled out
     rather than left to the player to infer from a rising counter. */
  const nl = Math.min(p.key === 'hall' ? HALL_MAX : LVL_MAX, lvlOf(p) + 1);
  const at = (n, f) => f({ ...p, lvl: n });
  let line = '';
  if (b.jobs && b.makes) {
    const k = Object.keys(b.makes)[0], icon = k === 'wood' ? '🪵' : '🌾';
    const n = workersAt(p.id);
    /* What ARRIVES, not what the building is rated for.

       A villager fills a load and then walks it to a store, so the throughput
       is CARRY / (fill time + travel), and that flattens hard once the rate is
       high and the walk is long. A farm seven tiles out goes from 1.40 to 6.72
       rated across its upgrades -- and from 0.22 to 0.25 delivered. Advertising
       the rated figure sold the player a fivefold improvement for two thousand
       wood and handed them fourteen percent. */
    /* Times the staff, because the panel is about the building, not about one
       villager. It quoted a single pair of hands while a two-worker farm was
       delivering nearly three times the figure. The next level is quoted with
       the hands it would REALLY get -- the ones it has plus whoever is idle --
       so a new post is never priced in before anyone can fill it. */
    line = icon + ' ' + (n * deliveredOf(p)).toFixed(2) + '/s delivered';
    if (nl > lvlOf(p))
      line += '  →  ' + (handsFor(p, nl) * deliveredOf(p, nl)).toFixed(2) + '/s';
    /* And whether the next level opens another post, because that is where the
       jump comes from. Measured across a farm's whole ladder, the steps that add
       a pair of hands are worth three to eight times the steps that only raise
       the rate -- so "workers 3 / 3" alone makes the good upgrades and the dull
       ones look alike. */
    const nextPosts = nl > lvlOf(p) ? jobsOf({ ...p, lvl: nl }) : jobsOf(p);
    line += '   ·   workers ' + n + ' / ' + jobsOf(p)
      + (nextPosts > jobsOf(p) ? '  →  ' + nextPosts : '');
    const boost = boostAt(p);
    if (boost > 1) line += '   ·   +' + Math.round((boost - 1) * 100) + '% from wells';
    else if (!n) line += '   — no villagers';
    /* Skipped for a building that is its own store; otherwise the placement
       gets a line of its own, stated as the counterfactual rather than as a
       score. "Efficiency 39%" is a number the player has to interpret, and
       interpreting it wrongly is easy because it falls as a building improves.
       What it would deliver in a good spot, against what it delivers here,
       needs no interpretation at all -- and the round trip in seconds says
       where the difference goes.

       Distances used to be given in tiles, which read as a fair comparison and
       were not one: two stores both "2.0 tiles" away are a 128px walk and a
       256px walk depending on which way they lie. */
    /* A market delivers to itself, so its figure is always 100% and the row is
       better spent. So does the HALL, which counts as a store -- that is why a
       village works at all before the first storehouse is built -- and it was
       printing "0.0s round trip to the nearest store" straight through the
       village summary that shares this row. Two lines of text on top of each
       other, for as long as the panel has existed. */
    const reach = (b.caps || p.key === 'hall') ? null : reachOf(p);
    /* Not for a market: it makes something AND holds something, so it comes
       through here and through the market block below, and both wanted this
       row. It was drawing the same warning twice in the same place. */
    if (spoilRow && p.key !== 'market')
      panelRow(spoilRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    else if (reach !== null) {
      const walk = travelSecondsOf(p);
      const here = n * deliveredOf(p), snug = n * bestDeliveredOf(p);
      /* Roads are the other half of the answer and the cheapest one -- five
         wood a tile against a whole building moved -- so a badly served
         workplace on bare ground is told about them. */
      const bare = routeOf(p).paved < 0.5;
      panelRow(walk.toFixed(1) + 's round trip to the nearest store'
        + (reach > 0.85 || !n ? '   —   well placed'
          : '   —   beside one it would deliver ' + snug.toFixed(2) + '/s'
            + (bare ? ', or pave the route' : '')),
        lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u,
        reach > 0.7 ? '#8fd06a' : reach > 0.45 ? '#e8c98a' : '#e59a86', '');
    }
  } else if (b.caps) {
    line = 'Holds 🪵' + capsOf(p, 'wood') + '  🌾' + capsOf(p, 'food');
    if (nl > lvlOf(p)) line += '  →  🪵' + at(nl, q => capsOf(q, 'wood')) + '  🌾' + at(nl, q => capsOf(q, 'food'));
    /* Selling storage takes its capacity with it, and anything the village is
       holding above the new ceiling is gone. That used to happen in silence --
       the goods sat there looking fine until the next delivery clamped them
       away. A storehouse has no efficiency line, so the row it would have used
       says what the sale would actually cost. */
    if (sellRoom && spoiling.length) {
      panelRow('Selling it drops storage to 🪵' + sellRoom.wood + '  🌾' + sellRoom.food
        + '   —   ' + spoiling.map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join(' ')
        + ' would spoil', lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    }
  } else if (b.pop) {
    line = 'Houses ' + popOf(p) + ' villagers';
    if (nl > lvlOf(p)) line += '  →  ' + at(nl, popOf);
  } else if (b.boost) {
    const wg = wellGain(p);
    line = !wg.n ? 'Reaching no workplace — move it beside one'
      : 'Lifting ' + wg.n + (wg.n === 1 ? ' workplace' : ' workplaces') + '   ·   '
        + (wg.gain > 0.005 ? '+' + wg.gain.toFixed(2) + '/s delivered'
          : 'none of them worked yet');
  } else if (b.charm) {
    /* The percentage was a rate figure, and the walk does not speed up with it.
       This is the goods per second the village's decorations are really adding. */
    const cd = charmDelivered();
    line = '✨ ' + b.charm + ' charm   ·   village total ' + charmTotal()
      + (charmRoom() > 0 ? '' : ' (full)')
      + (cd > 0.005 ? '   ·   adding +' + cd.toFixed(2) + '/s delivered' : '');
  }
  if (p.key === 'hall') {
    const a = HALL[hallLevel()].allow;
    line = Object.keys(a).map(k => B(k).icon + a[k]).join('   ');
  }
  panelRow(line, lx, R.y - R.h / 2 + 116 * u, R.w - 56 * u, 22 * u, '#e8c98a', '');

  if (p.key === 'market') {
    // its real worth is the trade it unlocks, which no number on this panel
    // would otherwise show
    if (spoilRow) panelRow(spoilRow, lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#e59a86', '');
    else panelRow(orderSlots() + ' trading stalls   ·   a new offer every '
      + Math.round(orderEvery()) + 's', lx, R.y - R.h / 2 + 148 * u, R.w - 56 * u, 20 * u, '#cbb6f0', '');
  }
  if (p.key === 'hall') {
    const st = villageStats();
    const empty = Math.max(0, st.slots - st.working);
    /* Which way the village is short, and what to do about it. "All at work"
       was the message whenever nobody was idle, and it reads as good news while
       usually meaning the opposite: every villager is employed, posts are
       standing empty, and another farm would do nothing. Idle villagers and
       empty posts are the two bottlenecks and they want opposite answers. */
    let s2 = st.villagers + ' villagers';
    if (st.idle) s2 += '   ·   ' + st.idle + ' with nothing to do — build a workplace';
    else if (empty) s2 += '   ·   ' + empty + (empty === 1 ? ' post' : ' posts')
      + ' with nobody in them — build or improve a house';
    else s2 += '   ·   every post filled';
    if (st.avg !== null) s2 += '   ·   workplaces at ' + Math.round(st.avg * 100) + '% of their best';
    panelRow(s2, lx, R.y - R.h / 2 + 150 * u, R.w - 56 * u, 20 * u,
      (st.idle || empty) ? '#f0c88a' : (st.avg !== null && st.avg < 0.6 ? '#f0c88a' : '#a9bd9c'), '');
  }

  // close
  g.fillStyle = 'rgba(255,255,255,.12)';
  g.beginPath(); g.arc(R.close.x, R.close.y, R.close.r, 0, 7); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = `bold ${Math.round(26 * u)}px Segoe UI, sans-serif`; g.fillText('×', R.close.x, R.close.y);

  const dec = isDecor(p.key);
  const i = dec ? { max: true, cost: null, gate: 0 } : upInfo(p);
  const ok = dec ? true : canUpgrade(p);
  const busy = p.t < 1;

  const btnFace = (r2, on, text, small, warn) => {
    g.fillStyle = warn ? 'rgba(122,58,38,.98)' : on ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
    g.strokeStyle = warn ? '#f0a07a' : on ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(r2.x - r2.w / 2, r2.y - r2.h / 2, r2.w, r2.h, 16 * u); g.fill(); g.stroke();
    g.fillStyle = warn ? '#ffe4d6' : on ? '#eaffd6' : '#9aa693';
    g.textAlign = 'center';
    /* Shrink to fit rather than spill into the neighbouring button. These
       labels carry costs, shortfalls and warnings whose length is not knowable
       up front -- "Sell 77 60 (stores full)" ran clean across the Upgrade
       button next to it. */
    let px = (small ? 21 : 24) * u;
    const room = r2.w - 16 * u;
    do { g.font = `bold ${Math.round(px)}px Segoe UI, sans-serif`; px -= 1; }
    while (px > 11 * u && g.measureText(text).width > room);
    g.fillText(text, r2.x, r2.y);
  };
  btnFace(R.move, true, 'Move', true);
  const sv = canSell(p) ? sellValue(p) : null;
  /* Show what you would ACTUALLY receive, not the nominal refund. A refund is
     clamped to the storage cap like every other grant, and on full stores the
     honest figure is zero -- which says "you would get nothing for this" far
     more plainly than a warning tacked onto the end, and fits the button. */
  /* Against the capacity that will exist AFTER the sale, which for a storehouse
     is lower than the one on screen right now. Quoting the current ceiling
     promised a refund the village would have nowhere to put. */
  const room = capsWithout(p);
  const netSell = sv && Object.fromEntries(
    Object.entries(sv).map(([k, v]) => [k, Math.max(0, Math.min(v, Math.floor(room[k] - res[k])))]));
  const backTotal = netSell ? Object.values(netSell).reduce((a, b) => a + b, 0) : 0;
  btnFace(R.sell, !!sv, !sv ? 'Cannot sell'
    /* Armed, the button stops quoting the refund and states the consequence.
       The refund is what you decide on; the second tap is what you confirm. */
    : armedHere ? (dec ? 'Tap again to remove' : 'Tap again to sell')
    /* A refund is clamped to storage like every other grant, so on full stores
       the honest figure is nothing -- and saying so plainly beats a row of
       zeroes, which reads like the label failed to fill itself in. */
    : backTotal === 0 ? (dec ? 'Remove  · nothing back' : 'Sell  · nothing back')
    : (dec ? 'Remove  ' : 'Sell  ') + Object.entries(netSell)
        .filter(([, v]) => v > 0).map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join(' '),
    true, armedHere);
  if (!R.up) { g.restore(); return; }
  /* A late upgrade can cost more than the village can physically hold, and then
     the button would sit grey for ever with no hint why. Storage being a real
     constraint is the point -- it just has to say so. */
  const overCap = !!i.cost && !canAfford(i.cost)
    && Object.entries(i.cost).some(([k, v]) => v > caps[k]);
  const back = dec ? Object.entries(B(p.key).cost)
    .map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + Math.floor(v / 2)).join('  ') : '';
  const label = dec ? 'Remove   ' + back + ' back'
    : busy ? 'Building…'
    : i.max ? 'Highest level'
    : i.gate ? 'Needs town hall level ' + i.gate
    : overCap ? 'Needs a bigger storehouse'
    : !canAfford(i.cost) ? 'Need ' + shortText(i.cost) + ' more'
    : 'Upgrade to ' + (lvlOf(p) + 1) + '   ' + Object.entries(i.cost).map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join('  ');
  g.fillStyle = ok ? 'rgba(62,104,44,.98)' : 'rgba(40,44,36,.9)';
  g.strokeStyle = ok ? '#9fe86b' : 'rgba(255,255,255,.16)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(R.up.x - R.up.w / 2, R.up.y - R.up.h / 2, R.up.w, R.up.h, 16 * u); g.fill(); g.stroke();
  g.fillStyle = ok ? '#eaffd6' : '#9aa693';
  g.font = `bold ${Math.round(24 * u)}px Segoe UI, sans-serif`;
  g.fillText(label, R.up.x, R.up.y);
  g.restore();
}

function draw() {
  fitCanvas();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0e1410'; g.fillRect(0, 0, W, VH);
  g.save(); g.translate(0, OY);
  g.save(); camApply(); drawWorld(); g.restore();
  drawSky();                                   // dusk and night wash over the world
  g.save(); camApply(); drawLamps(); g.restore();   // but not over lamplight
  drawHUD();
  g.restore();
}

/* ---------- input ---------- */
const DRAG_SLOP = 16, PTR_STALE = 4000;
const PTRS = new Map();
let pinchD0 = 0, pinchZ0 = 1;
const evPos = ev => { const b = cv.getBoundingClientRect();
  return { x: (ev.clientX - b.left) / b.width * W, y: (ev.clientY - b.top) / b.height * VH - OY }; };
const ptrMid = () => { const a = [...PTRS.values()];
  return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; };
function ptrSweep() { const now = Date.now(); for (const [id, r] of PTRS) if (now - r.tLast > PTR_STALE) PTRS.delete(id); }

cv.addEventListener('pointerdown', ev => {
  audioOn();                          // must happen inside a gesture
  ptrSweep();
  const p = evPos(ev);
  camGlide = null;                       // the player's hand outranks the camera
  PTRS.set(ev.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, moved: 0, drag: false, pinch: false, tLast: Date.now() });
  try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
  if (PTRS.size === 2) { const m = ptrMid(); pinchD0 = m.d; pinchZ0 = CAM.z; }
});
cv.addEventListener('pointermove', ev => {
  const rec = PTRS.get(ev.pointerId); if (!rec) return;
  const p = evPos(ev), dx = p.x - rec.x, dy = p.y - rec.y;
  rec.x = p.x; rec.y = p.y; rec.tLast = Date.now();
  rec.moved = Math.max(rec.moved, Math.hypot(p.x - rec.x0, p.y - rec.y0));
  if (PTRS.size >= 2) { const m = ptrMid(); for (const r of PTRS.values()) r.pinch = true;
    if (pinchD0 > 4) { CAM.z = Math.max(ZMIN, Math.min(ZMAX, pinchZ0 * (m.d / pinchD0))); camClamp(); }
    return; }
  if (rec.moved > DRAG_SLOP) { rec.drag = true; CAM.x -= dx / camScale(); CAM.y -= dy / camScale(); camClamp(); }
  if (selBuild || moving != null) updateGhost(p.x, p.y);
});
function ptrEnd(ev) {
  const rec = PTRS.get(ev.pointerId); if (!rec) return;
  PTRS.delete(ev.pointerId);
  try { cv.releasePointerCapture(ev.pointerId); } catch (e) {}
  if (!rec.drag && !rec.pinch && rec.moved <= DRAG_SLOP) tap(rec.x0, rec.y0);
}
cv.addEventListener('pointerup', ptrEnd);
cv.addEventListener('pointercancel', ptrEnd);
cv.addEventListener('lostpointercapture', ev => PTRS.delete(ev.pointerId));
window.addEventListener('blur', () => PTRS.clear());
/* Coming back to a page that was never unloaded.

   This is the ordinary case on a phone: the player swipes the game away, does
   something else for an hour, and taps the icon again -- and the WebView is
   still there, so nothing reloads and collectAway never runs. The village
   produced nothing for that hour and was told nothing about it. An hour of a
   village's work, gone, on the most common way there is to play an idle game.

   The tick is not stopped while hidden, only throttled, and its dt is capped at
   a tenth of a second -- so a backgrounded hour still simulates a few minutes.
   Those are counted and taken off, or the same minutes would be paid twice. */
let hiddenAt = 0, hiddenSim = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // a backgrounded tab may never come back, so bank the progress now
    PTRS.clear(); save();
    hiddenAt = Date.now(); hiddenSim = 0;
  } else if (hiddenAt) {
    grantAway((Date.now() - hiddenAt) / 1000 - hiddenSim);
    hiddenAt = 0; hiddenSim = 0;
    save();
  }
});
window.addEventListener('pagehide', save);
window.addEventListener('resize', () => { fitCanvas(); readSafeArea(); });
// rotating a phone changes which edge the cutout is on, and may not resize
window.addEventListener('orientationchange', () => setTimeout(() => { fitCanvas(); readSafeArea(); }, 60));

/* ---------- the Android back button ----------

   With nothing listening, back leaves the app. On a phone that means a player
   who opens a building, reads it, and presses back the way they would in any
   other Android app is thrown out of the game instead of back to the village.

   Done without a plugin, because the back button reaches a WebView as ordinary
   history: an entry is pushed while something is open, and popping it closes
   that thing instead of the app. Nothing is pushed while the village is just
   sitting there, so back still leaves -- it takes the press that closed the
   last panel plus one, which is the Android convention anyway.

   Deliberately NOT a stack. Back closes the top-most thing and the next press
   closes the next one down, in the order they overlap on screen. */
let backArmed = false;
function backOpen() {
  return !!(away || claimAsk || panel != null || moving != null || selBuild || barMode !== 'build');
}
function backClose() {
  if (away) { away = null; return true; }
  if (claimAsk) { claimAsk = false; return true; }
  if (panel != null) { panel = null; sellArm = null; return true; }
  if (moving != null) { moving = null; ghost = null; armed = null; return true; }
  if (selBuild) { selBuild = null; ghost = null; armed = null; return true; }
  if (barMode !== 'build') { barMode = 'build'; return true; }
  return false;
}
function armBack() {
  if (backArmed) return;
  try { history.pushState({ v: 1 }, ''); backArmed = true; } catch (e) {}
}
window.addEventListener('popstate', () => {
  backArmed = false;
  if (backClose()) { SFX.tap(); armBack(); }
});

function ghostKey() {
  if (moving != null) { const p = byId(moving); return p ? p.key : null; }
  return selBuild;
}
function updateGhost(sx, sy) {
  const key = ghostKey();
  if (!key) { ghost = null; armed = null; return; }
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const c = t.c, r = t.r;
  // a building being moved must not be blocked by the ground it is standing on
  const occ = occupied(moving == null ? undefined : moving);
  ghost = { c, r, ok: canPlace(key, c, r, occ) && (moving != null || buildable(key)) };
}
/* Which placed building covers a screen point, if any. */
function buildingAt(sx, sy) {
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const c = t.c, r = t.r;
  return placed.find(p => { const b = B(p.key);
    return c >= p.c && c < p.c + b.w && r >= p.r && r < p.r + b.h; }) || null;
}
function tap(sx, sy) {
  if (away) { away = null; return; }
  if (claimAsk) {
    const R = claimRects();
    if (Math.hypot(sx - R.no.x, sy - R.no.y) < R.no.r * 1.3) { claimAsk = false; return; }
    if (landNext() && Math.abs(sx - R.yes.x) < R.yes.w / 2 && Math.abs(sy - R.yes.y) < R.yes.h / 2) {
      if (!claimLand()) SFX.deny();
      return;
    }
    if (Math.abs(sx - R.x) < R.w / 2 && Math.abs(sy - R.y) < R.h / 2) return;
    claimAsk = false; return;         // a tap outside the card closes it
  }
  {
    const M = muteRect();
    if (Math.hypot(sx - M.x, sy - M.y) < M.r * 1.15) {
      muted = !muted; save();
      if (!muted) SFX.tap();
      return;
    }
  }
  // HUD first, exactly as in Gatestorm: the bar must always win over the world
  if (panel != null) {
    const R = panelRects(), p = byId(panel);
    if (Math.hypot(sx - R.close.x, sy - R.close.y) < R.close.r * 1.3) { panel = null; sellArm = null; return; }
    const hit = r2 => r2 && Math.abs(sx - r2.x) < r2.w / 2 && Math.abs(sy - r2.y) < r2.h / 2;
    if (p && hit(R.move)) { moving = p.id; panel = null; selBuild = null; ghost = null; armed = null; sellArm = null; SFX.tap(); return; }
    if (p && hit(R.sell)) {
      if (!canSell(p)) { SFX.deny(); return; }
      if (!sellArm || sellArm.id !== p.id) { sellArm = { id: p.id, t: SELL_ARM }; SFX.tap(); return; }
      sellArm = null;
      if (!sellBuilding(p)) SFX.deny();
      return;
    }
    if (p && hit(R.up))   { sellArm = null; if (!upgradeBuilding(p)) SFX.deny(); return; }
    // anywhere else inside the panel is swallowed, so a stray tap on it does
    // not fall through and place a building underneath
    if (Math.abs(sx - R.x) < R.w / 2 && Math.abs(sy - R.y) < R.h / 2) return;
  }
  for (const t of tabRects()) {
    if (Math.abs(sx - t.x) < t.w / 2 && Math.abs(sy - t.y) < t.h / 2) {
      barMode = t.mode; selBuild = null; moving = null; ghost = null; armed = null; SFX.tap(); return;
    }
  }
  if (barMode === 'orders') {
    for (const r of orderRects()) {
      if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) {
        if (!fillOrder(r.o)) SFX.deny();
        return;
      }
    }
  }
  for (const r of barRects()) {
    if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) {
      moving = null; armed = null;         // picking something new abandons a move
      if (atLimit(r.b.key)) {
        SFX.deny();
        if (!isDecor(r.b.key)) panel = (hallOf() || {}).id ?? null;
        selBuild = null; ghost = null; return;
      }
      SFX.tap();
      selBuild = (selBuild === r.b.key) ? null : r.b.key;
      panel = null; ghost = null; armed = null;
      return;
    }
  }
  if (moving != null || selBuild) {
    updateGhost(sx, sy);
    if (!ghost || !ghost.ok) { SFX.deny(); return; }
    // first tap arms the spot, second tap on the SAME spot commits it
    if (!armed || armed.c !== ghost.c || armed.r !== ghost.r) {
      armed = { c: ghost.c, r: ghost.r }; SFX.tap(); return;
    }
    if (moving != null) {
      const p = byId(moving);
      if (p) { p.c = ghost.c; p.r = ghost.r; rebuildStores(); save(); SFX.place(); }
      moving = null;
    } else {
      place(selBuild, ghost.c, ghost.r);
      selBuild = null;
    }
    ghost = null; armed = null;
    return;
  }
  const hit = buildingAt(sx, sy);
  if (hit) { SFX.tap(); panel = hit.id; return; }
  panel = null;
  const w = camUnproject(sx, sy), t = tileAt(w.x, w.y);
  const tc = t.c, tr = t.r;
  if (tc >= 0 && tr >= 0 && tc < GW && tr < GH && !inLand(tc, tr)) { claimAsk = true; SFX.tap(); }
}

/* ---------- boot ---------- */
load();
ensureHall();
coverPlaced();
collectAway();
fitCanvas();
CAM.x = W / 2; CAM.y = tileToWorld(GW / 2, GH / 2).y; camFit(true); camClamp();
let last = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  try { step(dt); draw(); } catch (e) { console.error(e); }
}, 1000 / 30);

/* Ask for every sprite at once, rather than the first time each is drawn.

   artFor() starts the download on first use and draws the procedural stand-in
   until it arrives, which is the right behaviour for a missing file and the
   wrong one for a file that is simply not needed yet: on a cold start the
   village appeared as flat coloured boxes and swapped to painted art a moment
   later, and the same flash came back whenever a kind of building was drawn for
   the first time -- the first mill, the first statue, the first pan to a corner
   with a rock in it. They all ship inside the app; there is nothing to save by
   waiting. The stand-in stays for a file that genuinely will not load. */
for (const b of BUILDINGS) artFor(b.key);
for (const v of VILLAGERS) artFor(v);
for (const k of ['ground', 'water', 'tree_pine', 'tree_oak', 'rock', 'bush']) artFor(k);

/* test hooks */
window.__v = { res, get placed() { return placed; }, B, BUILDINGS, tileToWorld, worldToTile,
  camProject, camUnproject, canPlace, occupied, place, step, draw, barRects, barList, tileAt,
  get sel() { return selBuild; }, set sel(v) { selBuild = v; },
  tap, CAM, save, load, get caps() { return caps; },
  HALL, hallOf, hallLevel, allowedOf, countOf, atLimit, unlocked, buildable,
  canUpgrade, upgradeBuilding, upInfo, upCostOf, lvlOf, popOf, capsOf, rateOf, outMul, LVL_MAX,
  shortfall, shortText, villageStats, wellGain, wellGainAt, charmDelivered, deliveredOf, deliveredWith, travelSecondsOf, handsFor,
  bestDeliveredOf, reachOf, SNUG_WALK,
  panelRects, get panel() { return panel; }, set panel(v) { panel = v; },
  get villagers() { return villagers; }, workersAt, boostAt, producers, stores,
  assignJobs, desiredJobs, computeJobs, invalidateJobs, established, buildingAt, ensureHall, jobsOf, VILLAGER_MAX, rebuildStores, nearestStore,
  isDecor, decorCount, DECOR_MAX, charmTotal, charmMul, charmRoom, usefulCharm, CHARM_FULL,
  tabRects, drawDecor, grant,
  sparePeople, wouldStandEmpty, peopleComing, livedIn,
  sellBuilding, canSell, sellValue, investedIn, capsWithout, get moving() { return moving; }, set moving(v) { moving = v; },
  get armed() { return armed; }, set armed(v) { armed = v; },
  get sellArm() { return sellArm; }, set sellArm(v) { sellArm = v; }, SELL_ARM,
  collectAway, grantAway, potentialRate, currentHint, get away() { return away; }, set away(v) { away = v; },
  get hiddenAt() { return hiddenAt; }, set hiddenAt(v) { hiddenAt = v; },
  get hiddenSim() { return hiddenSim; }, set hiddenSim(v) { hiddenSim = v; }, AWAY_MIN, AWAY_MAX,
  GOALS, currentGoal, get goalIdx() { return goalIdx; }, set goalIdx(v) { goalIdx = v; },
  get orders() { return orders; }, set orders(v) { orders = v; },
  makeOrder, fillOrder, canFill, orderRects, ORDER_EVERY, ORDER_SLOTS, orderSlots, orderEvery, marketCount,
  get ordersDone() { return ordersDone; }, set ordersDone(v) { ordersDone = v; },
  get orderT() { return orderT; }, set orderT(v) { orderT = v; },
  get goalDone() { return goalDone; }, set goalDone(v) { goalDone = v; },
  SFX, muteRect, audioOn, get muted() { return muted; }, set muted(v) { muted = v; },
  KEY, KEY_BAK, BACKUP_EVERY,
  get saveFailed() { return saveFailed; }, set saveFailed(v) { saveFailed = v; },
  get loadedFromBackup() { return loadedFromBackup; }, set loadedFromBackup(v) { loadedFromBackup = v; },
  sky, dayPhase, DAY_MS, camFit, landFitZoom, landWorldBounds, artFor, ART,
  hudTop, hudBot, screenTop, screenBot, readSafeArea, get SAFE() { return SAFE; }, set SAFE(v) { SAFE = v; },
  fitLines, TUT, GOALS,
  efficiencyOf, hasStore, onPath, PATH_SPEED, rebuildPaths, routeOf, get pathSet() { return pathSet; },
  LAND, LAND_MAX, inLand, landNext, canClaim, claimLand, landBounds, coverPlaced,
  get landTier() { return landTier; }, set landTier(v) { landTier = v; },
  get claimAsk() { return claimAsk; }, set claimAsk(v) { claimAsk = v; }, claimRects,
  get tutSeen() { return tutSeen; }, set tutSeen(v) { tutSeen = v; },
  get savedAt() { return savedAt; }, set savedAt(v) { savedAt = v; },
  get pops() { return pops; }, get rateNow() { return rateNow; },
  get barMode() { return barMode; }, set barMode(v) { barMode = v; },
  backOpen, backClose, armBack, get backArmed() { return backArmed; } };
