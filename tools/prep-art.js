#!/usr/bin/env node
/* Prepare generated building art for the game.

   Image tools routinely ignore "transparent background". Two failure modes turn
   up in practice: a flat white background, and a *painted* transparency
   checkerboard — real pixels in two alternating greys that look transparent but
   are not. Both show as a rectangle on the grass. They also pad the subject with
   empty margin, which stops the base sitting on the ground.

   For each art/<key>.png this:
     1. samples the border to learn the background palette (1-3 colours)
     2. floods in from the edges keying anything matching it
     3. trims fully transparent margin
     4. reports what it found, so a file needing hand-editing is obvious

   Flooding from the edges is deliberate: a pale colour used INSIDE the building
   (white plaster, grey stone) is never punched out, because the flood cannot
   reach it through the building's own opaque pixels.

   Rewrites in place. Usage: node tools/prep-art.js [file...] */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'art');
// sharp lives in the Gatestorm project next door; this repo has no node_modules
let sharp;
try { sharp = require(path.join(ROOT, '..', 'gatestorm', 'node_modules', 'sharp')); }
catch (e) {
  console.error('Could not load sharp from the gatestorm project.');
  console.error('Run "npm i sharp" here, or keep gatestorm/node_modules in place.');
  process.exit(1);
}

const MAX_W = 800;     // widest the game ever draws a building, at full zoom-in;
                       // the generated art is ~1500px and 3 MB, which is a slow
                       // first load and a fat APK for pixels no one can see
const TOL = 26;        // how close to a palette colour still counts as background
const SEAM = 14;       // how far a near-neutral pixel may sit between two palette
                       // colours and still count — catches the soft seam lines
                       // where checkerboard squares meet
const KEYS = [
  'house', 'farm', 'lumber', 'store', 'hall', 'well', 'mill', 'market', 'quarry',
  'find_stones', 'find_orchard', 'find_ruin', 'find_wreck',
  'villager_farmer', 'villager_basket', 'villager_woodcutter', 'villager_stonecutter', 'villager_trader', 'villager_miller',
  'tree_pine', 'tree_oak', 'rock', 'bush', 'tree_birch', 'stump', 'flowers_wild', 'sheep', 'sheep_rest', 'boat_fishing', 'boat_row', 'tree_cherry', 'lamp_stone', 'flowers_tulip', 'house_fisher', 'lumber_cabin', 'well_thatch', 'store_barn', 'mill_smock', 'market_fish', 'quarry_slate',
  'path', 'fence', 'flowers', 'hedge', 'lamp', 'statue', 'bench', 'banner', 'statue_knight', 'statue_fisher', 'house_stone', 'house_thatch', 'farm_veg', 'farm_barley', 'lumber_pit', 'well_iron', 'store_granary', 'mill_post', 'market_hall', 'quarry_pit', 'lamp_bracket', 'flowers_planter', 'bench_stone', 'banner_pennant',
  'ground', 'water',
];

/* Art that is MEANT to be a solid rectangle. The background keyer works by
   agreeing on a border colour and flooding inwards, which on a full-bleed
   image of water agrees on blue and erases the lot. These are only resized
   and re-encoded. */
const OPAQUE = new Set(['water']);

/* Art that is laid down REPEATEDLY on the grid. A generator almost always
   shades a tile darker towards its edges -- it makes a single tile look better
   in isolation -- but laid side by side that shading meets itself and draws a
   dark lattice across the whole map. The measured path tile ran 163 at the
   centre and 76 at the corners.

   So the vignette is divided out: the average brightness is measured as a
   function of distance from the centre and each pixel is scaled to flatten
   that curve. It is a flat-field correction, the same idea as removing lens
   falloff from a photograph, and it keeps the texture while losing the shading. */
const TILES = new Set(['path']);

/* Villagers that can have a walk cycle, and how long one is.

   A cycle is all-or-nothing: six frames and the game walks that villager,
   fewer and it keeps the standing sprite. Half a cycle on the ground is a
   villager who limps, so the set is refused rather than half-loaded. */
const WALK_OF = ['villager_farmer', 'villager_basket', 'villager_woodcutter', 'villager_stonecutter', 'villager_trader', 'villager_miller'];
const WALK_FRAMES = 6;
/* The frame a villager holds when he is standing, counted from zero, and
   it has to agree with WALK_STAND in game.js. Nothing enforces that from
   here, so the number is spelled out at both ends. */
const STAND_AT = 5;
const walkName = (key, i) => key + '_walk' + i;
/* Buildings that are drawn as a SET of stages rather than one picture, and
   how many. Must agree with SET_ART and BEACON_STAGES in game.js. */
const STAGES_OF = ['beacon'];
const STAGE_COUNT = 5;
const stageName = (key, i) => key + '_stage' + i;
const FLAT_BINS = 24, FLAT_MAX_GAIN = 2.4;

function flatten(data, w, h, ch) {
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  // diamond distance, because the tile is a diamond and not a circle
  const dist = (x, y) => Math.min(1, Math.abs(x - cx) / cx + Math.abs(y - cy) / cy);
  const sum = new Float64Array(FLAT_BINS), cnt = new Float64Array(FLAT_BINS);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    if (data[i + 3] < 200) continue;                 // ignore the soft rim
    const b = Math.min(FLAT_BINS - 1, Math.floor(dist(x, y) * FLAT_BINS));
    sum[b] += (data[i] + data[i + 1] + data[i + 2]) / 3; cnt[b]++;
  }
  const prof = [];
  for (let b = 0; b < FLAT_BINS; b++) prof[b] = cnt[b] > 24 ? sum[b] / cnt[b] : null;
  // fill gaps and smooth, so the correction is a curve and not a set of steps
  for (let b = 0; b < FLAT_BINS; b++) if (prof[b] === null) prof[b] = prof[b - 1] ?? prof.find(v => v !== null);
  const sm = prof.map((_, b) => {
    let t = 0, n = 0;
    for (let k = Math.max(0, b - 2); k <= Math.min(FLAT_BINS - 1, b + 2); k++) { t += prof[k]; n++; }
    return t / n;
  });
  const target = sm[0];
  if (!target) return 0;
  let touched = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * ch;
    if (!data[i + 3]) continue;
    const b = Math.min(FLAT_BINS - 1, Math.floor(dist(x, y) * FLAT_BINS));
    const gain = Math.min(FLAT_MAX_GAIN, target / sm[b]);
    if (gain <= 1.01) continue;
    for (let k = 0; k < 3; k++) data[i + k] = Math.min(255, Math.round(data[i + k] * gain));
    touched++;
  }
  return Math.round((1 - sm[FLAT_BINS - 1] / target) * 100);   // how deep the vignette was
}

/* How big each kind is actually drawn on screen, longest side, at full zoom-in.
   A villager stands 60 world px tall and the camera tops out near 3x, so
   shipping one at 1536px is 8x more pixels than can ever be shown. Anything not
   listed gets MAX_W. */
const CAP = {
  villager_farmer: 320, villager_basket: 320, villager_woodcutter: 320, villager_stonecutter: 320, villager_trader: 320, villager_miller: 320,
  tree_pine: 560, tree_oak: 560, rock: 360, bush: 360, tree_birch: 560, stump: 360, flowers_wild: 360, sheep: 320, sheep_rest: 320, boat_fishing: 420, boat_row: 360, tree_cherry: 560, lamp_stone: 380, flowers_tulip: 300, house_fisher: 800, lumber_cabin: 800, well_thatch: 400, store_barn: 800, mill_smock: 800, market_fish: 800, quarry_slate: 800,
  well: 420, hall: 800, mill: 800, market: 800,
  /* The beacon is capped on its WIDTH, not its longest side -- see stageSet.
     Same plot as a hall, so the same width. */
  beacon: 800,
  path: 300, fence: 300, flowers: 300, hedge: 320, lamp: 380, statue: 400, bench: 320, banner: 400, statue_knight: 400, statue_fisher: 400, house_stone: 800, house_thatch: 800, farm_veg: 800, farm_barley: 800, lumber_pit: 800, well_iron: 400, store_granary: 800, mill_post: 800, market_hall: 800, quarry_pit: 800, lamp_bracket: 380, flowers_planter: 300, bench_stone: 320, banner_pennant: 400,
  ground: 1800,
  // the water is mirrored into a 2x2 tile at runtime, so its pixels cost four
  // times what they measure here; it is a soft background and can take it
  water: 1400,
};

const near = (p, c, tol) => Math.abs(p[0] - c[0]) < tol && Math.abs(p[1] - c[1]) < tol && Math.abs(p[2] - c[2]) < tol;

/* Learn the background colours from the border ring. Anything covering a decent
   share of the border is background; a checkerboard yields two entries. */
function palette(at, w, h) {
  const buckets = new Map();
  const add = (x, y) => {
    const p = at(x, y);
    if (p[3] < 8) return;                 // already transparent
    const k = [p[0] >> 4, p[1] >> 4, p[2] >> 4].join(',');
    const b = buckets.get(k) || { n: 0, s: [0, 0, 0] };
    b.n++; b.s[0] += p[0]; b.s[1] += p[1]; b.s[2] += p[2];
    buckets.set(k, b);
  };
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }

  const total = 2 * w + 2 * h;
  return [...buckets.values()]
    .filter(b => b.n / total > 0.06)       // ignore the subject clipping the edge
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map(b => b.s.map(v => Math.round(v / b.n)));
}

/* The PNG a generator hands back is the master: it is kept untouched in
   art/original/ so the cleanup can always be re-run or re-tuned, and the game
   loads the processed .webp instead. Drop a new PNG in art/ and it becomes the
   new master for that key. */
const ORIG = path.join(ART, 'original');

/* Key the background out of one image and hand back its raw pixels.

   Split out of the loop below so the walk frames can use it too. They cannot
   use the rest of that loop: it trims each image to its OWN bounding box,
   which is right for a building standing alone and ruinous for a cycle --
   six frames each cropped to themselves is six different registrations, and
   the villager pulses and slides as they cut. */
async function keyOut(file, opaque) {
  const { data, info } = await sharp(file).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;
    const at = (x, y) => { const i = (y * w + x) * ch; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

    const pal = opaque ? [] : palette(at, w, h);

    // brightness span of the palette, used to bridge checkerboard seams
    const lum = c => (c[0] + c[1] + c[2]) / 3;
    const lo = Math.min(...pal.map(lum)) - SEAM, hi = Math.max(...pal.map(lum)) + SEAM;
    const spans = pal.length > 1;

    const isBg = p => {
      if (pal.some(c => near(p, c, TOL))) return true;
      if (!spans) return false;
      const l = lum(p);
      // a neutral grey lying between two background greys is a seam, not art
      return Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) < 16 && l > lo && l < hi;
    };

    let keyed = 0, holes = 0;
    const seen = new Uint8Array(w * h);

    /* Flood a background region from `seeds`. Returns the pixels it covers and
       which palette colours it contains, without altering the image — the
       caller decides whether the region really is background. */
    const flood = seeds => {
      const px = [], hit = new Set(), stack = seeds.slice();
      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const idx = y * w + x;
        if (seen[idx]) continue;
        const p = at(x, y);
        if (p[3] >= 8 && !isBg(p)) continue;   // hit the subject, stop here
        seen[idx] = 1;
        px.push(idx);
        if (p[3] >= 8) pal.forEach((c, i) => { if (near(p, c, TOL)) hit.add(i); });
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      return { px, hit };
    };
    const clear = px => { for (const i of px) if (data[i * ch + 3]) { data[i * ch + 3] = 0; keyed++; } };

    if (pal.length) {
      const seeds = [];
      for (let x = 0; x < w; x++) { seeds.push([x, 0], [x, h - 1]); }
      for (let y = 0; y < h; y++) { seeds.push([0, y], [w - 1, y]); }
      clear(flood(seeds).px);

      /* Gaps the edge flood cannot reach — background seen THROUGH the model,
         such as the openings of an open-sided workshop. Only a painted
         checkerboard is safe to key here, and only where the region really
         does alternate between two palette greys: a flat pale surface inside
         the building matches one colour at most and is left alone. */
      if (spans) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (seen[y * w + x]) continue;
          const p = at(x, y);
          if (p[3] < 8 || !isBg(p)) continue;
          const r = flood([[x, y]]);
          if (r.hit.size >= 2) { clear(r.px); holes++; }
        }
      }
    }
  return { data, w, h, ch, pal, holes, keyed };
}
/* ---- fitting the frames of a cycle to one another --------------------

   The brief asks the generator for one figure height, one centre, and the
   feet on the bottom edge of the canvas. No generator yet obeys it.
   Measured on the first real set to arrive: the drawn height varied by a
   quarter between frames, and the ground under the boots moved a hundred
   and fifty pixels up and down the canvas.

   The shared box below fixes the CROP, and that is a different thing. Six
   frames cut to the same rectangle still hold six differently sized
   villagers standing in six different places inside it, and he pulses and
   slides across the ground exactly as if nothing had been done. So the
   frames are fitted to one another BEFORE anything is cut.

   Scale and sideways placement are read off the silhouette: the frame is
   tried at a range of sizes and offsets against a reference frame, and the
   one that covers it best wins. That survives the legs being in different
   places, because the legs are a quarter of the figure; the head, the body
   and the arms are the rest of it, and those keep their shape as he walks.

   The VERTICAL placement is NOT taken from that overlap. It is taken from
   the feet. The supporting foot is on the ground in every frame of every
   walk ever drawn, so the bottom of the figure is the one landmark that is
   physically pinned, and matching the bottoms is what stops him floating.
   The rise and fall of a walk then lands where it belongs -- between his
   feet and his head -- instead of being the whole drawing riding up and
   down the canvas. */

const REG_ROUGH = 72;        // mask height the coarse search runs at
const REG_FINE = 180;        //  ... and the refining one
const REG_SPAN = 0.35;       // how far either side of the area guess to look
const REG_FLOOR = 0.004;     // coverage at which a row is ground, not a stray pixel

/* Coverage mask of one keyed frame, boxed down to `hh` rows. Coverage rather
   than a hard yes/no: at seventy rows a whole arm is two pixels wide, and a
   mask that rounds it away is a mask that cannot see the arm move. */
function maskOf(fr, hh) {
  const k = hh / fr.h, ww = Math.max(1, Math.round(fr.w * k));
  const m = new Float32Array(ww * hh), n = new Float32Array(ww * hh);
  for (let y = 0; y < fr.h; y++) {
    const ty = Math.min(hh - 1, Math.floor(y * k));
    for (let x = 0; x < fr.w; x++) {
      const tx = Math.min(ww - 1, Math.floor(x * k));
      const i = ty * ww + tx;
      if (fr.data[(y * fr.w + x) * fr.ch + 3] >= 8) m[i]++;
      n[i]++;
    }
  }
  for (let i = 0; i < m.length; i++) if (n[i]) m[i] /= n[i];
  return { m, w: ww, h: hh };
}

const areaOf = k => { let a = 0; for (let i = 0; i < k.m.length; i++) a += k.m[i]; return a; };

/* The lowest row carrying actual figure. One stray pixel left behind by the
   keying would otherwise become the ground and drop the villager through the
   floor, so a row has to carry a little width before it counts. */
function groundOf(k) {
  for (let y = k.h - 1; y >= 0; y--) {
    let w = 0;
    for (let x = 0; x < k.w; x++) w += k.m[y * k.w + x];
    if (w >= REG_FLOOR * k.w) return y;
  }
  return k.h - 1;
}

/* How well `src` lies on `ref` once scaled by s and shifted by (dx, dy).

   Scored over a window half again as large as the frame in each direction,
   so that a scale which shoves part of the figure off the canvas is charged
   for the part it lost. Score only what lands inside and the search learns
   that the way to overlap perfectly is to be enormous. */
function overlap(ref, src, s, dx, dy) {
  const px = ref.w >> 1, py = ref.h >> 1;
  let inter = 0, union = 0;
  for (let y = -py; y < ref.h + py; y++) {
    const sy = Math.round((y - dy) / s);
    const row = sy >= 0 && sy < src.h ? sy * src.w : -1;
    const rrow = y >= 0 && y < ref.h ? y * ref.w : -1;
    if (row < 0 && rrow < 0) continue;
    for (let x = -px; x < ref.w + px; x++) {
      let a = 0, b = 0;
      if (rrow >= 0 && x >= 0 && x < ref.w) a = ref.m[rrow + x];
      if (row >= 0) { const sx = Math.round((x - dx) / s); if (sx >= 0 && sx < src.w) b = src.m[row + sx]; }
      if (a > b) { inter += b; union += a; } else { inter += a; union += b; }
    }
  }
  return union > 0 ? inter / union : 0;
}

/* Search scale and sideways offset for one frame, with the vertical offset
   pinned by the feet at every candidate rather than searched for. */
function fitOne(ref, src, s0, span, steps, dx0, sway) {
  const gRef = groundOf(ref), gSrc = groundOf(src);
  let best = { s: s0, dx: dx0, dy: gRef - s0 * gSrc, score: -1 };
  for (let i = 0; i < steps; i++) {
    const s = steps < 2 ? s0 : s0 * (1 - span + (2 * span * i) / (steps - 1));
    const dy = gRef - s * gSrc;
    for (let dx = dx0 - sway; dx <= dx0 + sway; dx++) {
      const score = overlap(ref, src, s, dx, dy);
      if (score > best.score) best = { s, dx, dy, score };
    }
  }
  return best;
}

/* Fit every frame of a set onto the one most nearly typical of it.

   The reference is the frame of median area -- not the first, which is only
   whichever one the generator happened to draw first, and may well be the
   outlier the other five would then be dragged towards. */
function registerCycle(raws) {
  const rough = raws.map(fr => maskOf(fr, REG_ROUGH));
  const fine = raws.map(fr => maskOf(fr, REG_FINE));
  const ri = raws.map((_, i) => i)
    .sort((a, b) => areaOf(rough[a]) - areaOf(rough[b]))[raws.length >> 1];

  const fits = [];
  for (let i = 0; i < raws.length; i++) {
    if (i === ri) { fits.push({ s: 1, dx: 0, dy: 0, score: 1 }); continue; }
    const guess = Math.sqrt(areaOf(rough[ri]) / Math.max(1, areaOf(rough[i])));
    const c = fitOne(rough[ri], rough[i], guess, REG_SPAN, 29, 0, Math.round(rough[ri].w * 0.3));
    const k = REG_FINE / REG_ROUGH;
    const r = fitOne(fine[ri], fine[i], c.s, 0.05, 11, Math.round(c.dx * k), 5);
    /* Carried back onto the full canvas. The search worked in mask rows, and
       a mask is REG_FINE rows to its own frame's height, so the scale picks
       up the ratio of the two frame heights and the offsets pick up the
       reference frame's. Both are 1:1 while the canvases match, which the
       warning above insists on, but the arithmetic should not quietly
       depend on that. */
    const up = raws[ri].h / REG_FINE;
    fits.push({ s: r.s * (raws[ri].h / raws[i].h), dx: r.dx * up, dy: r.dy * up, score: r.score });
  }
  return { fits, ref: ri };
}
/* ---- what every SET of drawings needs, whichever kind it is ----

   There are two kinds now and they want opposite things from the middle
   step. A walk cycle is six pictures of one figure that must all be the
   SAME SIZE, so it is fitted by silhouette. A stage set is five pictures of
   a building that is supposed to get BIGGER, so fitting it by silhouette is
   the one thing that would destroy it.

   What they share is everything either side of that: collecting the files,
   refusing half a set, laying the frames on one canvas, and cutting them all
   to a single box so the thing does not jump as they swap. */

/* The masters for a set, or null. Dropped PNGs are promoted on the way past,
   the same as a single image. */
function setFiles(key, count, nameOf, label) {
  const files = [];
  for (let i = 1; i <= count; i++) {
    const n = nameOf(key, i);
    const dropped = path.join(ART, n + '.png'), master = path.join(ORIG, n + '.png');
    if (fs.existsSync(dropped)) fs.renameSync(dropped, master);
    if (fs.existsSync(master)) files.push(master);
  }
  if (!files.length) return null;
  if (files.length < count) {
    console.log(String(key + ' ' + label).padEnd(26),
      'only ' + files.length + ' of ' + count
      + ' frames -- the set is ignored until it is complete');
    return null;
  }
  return files;
}

/* Every frame drawn onto one canvas at the size and place it was given, big
   enough to hold all of them wherever they landed. */
async function placeOnShared(raws, place) {
  const CL = Math.min(...place.map(p => p.left)), CT = Math.min(...place.map(p => p.top));
  const CW = Math.max(...place.map(p => p.left + p.w)) - CL;
  const CH = Math.max(...place.map(p => p.top + p.h)) - CT;
  const out = [];
  for (let i = 0; i < raws.length; i++) {
    const fr = raws[i], p = place[i];
    const body = await sharp(fr.data, { raw: { width: fr.w, height: fr.h, channels: fr.ch } })
      .resize({ width: p.w, height: p.h, fit: 'fill' }).png().toBuffer();
    const { data, info } = await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: body, left: p.left - CL, top: p.top - CT }])
      .raw().toBuffer({ resolveWithObject: true });
    out.push({ data, w: info.width, h: info.height, ch: info.channels });
  }
  return out;
}

/* The figure, as against whatever the keyer left lying around it.

   keyOut floods the background in from the edges and stops wherever it meets
   something it cannot prove is background. Mostly that is the building. It is
   also every speck the generator painted into the empty air -- a stray block,
   a scrap of rim light, a square of checkerboard that came out the wrong
   colour -- and those survive, fully opaque, a long way from the thing they
   belong to.

   Nobody ever saw them. Twenty pixels in a three million pixel frame, and
   fainter still once the set has been scaled down. The BOX saw them. The
   beacon stage five had specks at the far left and the far right of its
   canvas, so the box the whole set gets cut to came out 800 wide around a
   lighthouse 482 wide -- and artRect fits a building to its plot by WIDTH, so
   that is a lighthouse drawn at sixty per cent of its plot with the rest air.
   Stage one had one high above the foundation, and reported a figure 1030
   pixels tall where the stonework is 378.

   Size cannot tell a speck from art, and it is worth saying why, because size
   is the obvious rule: the largest speck in that first stage is 175 pixels and
   the lumber camp has a genuine detached piece of 1948. Any threshold between
   those two is a threshold picked to suit two particular drawings.

   POSITION tells them apart. A building is one big island, and a piece of it
   that happens to be drawn as a separate island -- a loose block at a corner,
   a shutter, a sign -- still sits within the building own bounds. Empty air
   does not. So: take the largest island, absorb every island that reaches into
   its box, and repeat until none do. What is still outside is not the
   building.

   A pixel joins an island at the same threshold sharp uses for its own trim,
   so a soft rim is not mistaken for air. */
function bodyBox(fr) {
  const { data, w, h, ch } = fr;
  const on = i => data[i * ch + 3] >= 8;
  const seen = new Uint8Array(w * h), isles = [];
  for (let seed = 0; seed < w * h; seed++) {
    if (seen[seed] || !on(seed)) continue;
    const stack = [seed]; seen[seed] = 1;
    let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    while (stack.length) {
      const i = stack.pop(); n++;
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && !seen[i - 1] && on(i - 1)) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < w - 1 && !seen[i + 1] && on(i + 1)) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && !seen[i - w] && on(i - w)) { seen[i - w] = 1; stack.push(i - w); }
      if (y < h - 1 && !seen[i + w] && on(i + w)) { seen[i + w] = 1; stack.push(i + w); }
    }
    isles.push({ n, x0, y0, x1, y1 });
  }
  if (!isles.length) return null;
  let big = isles[0];
  for (const c of isles) if (c.n > big.n) big = c;
  const box = { x0: big.x0, y0: big.y0, x1: big.x1, y1: big.y1 };
  const taken = new Set([big]);
  for (let grew = true; grew;) {
    grew = false;
    for (const c of isles) {
      if (taken.has(c)) continue;
      if (c.x1 < box.x0 || c.x0 > box.x1 || c.y1 < box.y0 || c.y0 > box.y1) continue;
      taken.add(c); grew = true;
      if (c.x0 < box.x0) box.x0 = c.x0; if (c.x1 > box.x1) box.x1 = c.x1;
      if (c.y0 < box.y0) box.y0 = c.y0; if (c.y1 > box.y1) box.y1 = c.y1;
    }
  }
  return box;
}

/* The box that holds every frame figure, and nothing else. */
function unionBox(frames) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const fr of frames) {
    const b = bodyBox(fr);
    if (!b) continue;
    if (b.x0 < x0) x0 = b.x0; if (b.x1 > x1) x1 = b.x1;
    if (b.y0 < y0) y0 = b.y0; if (b.y1 > y1) y1 = b.y1;
  }
  return isFinite(x0) ? { x0, y0, x1, y1, bw: x1 - x0 + 1, bh: y1 - y0 + 1 } : null;
}

/* A whole walk cycle, registered against itself.

   Every frame is keyed on its own, and then the SET is trimmed as one: the
   bounding box is the union of all six, every frame is cut to that same box,
   and they are all scaled by the same factor. That is the whole point of
   doing this separately. Trim each frame to its own box and the villager's
   height and centre change from frame to frame -- he pulses, and slides
   sideways, and the cycle reads as a fault rather than as a walk.

   It also means the frames correct each other. A generator that draws frame
   three a little small leaves a little air at the top of the shared box
   instead of being blown up to match, which is wrong by a pixel rather than
   wrong by a jump.

   All six or none. A cycle missing a frame is a limp, and the game is
   better off keeping the standing sprite until the set is complete. */
async function walkSet(key) {
  const files = setFiles(key, WALK_FRAMES, walkName, 'walk');
  if (!files) return null;

  const raws = [];
  for (const file of files) raws.push(await keyOut(file, false));

  /* Frames of differing canvas size cannot be fitted to one another by a
     scale and an offset alone, and that is a recrop rather than drift --
     worth saying out loud rather than papering over, because the cycle will
     be wrong and the reason will not be obvious. */
  const odd = raws.filter(fr => fr.w !== raws[0].w || fr.h !== raws[0].h).length;
  if (odd) console.log(String(key + ' walk').padEnd(26),
    'WARNING: ' + odd + ' frames are a different canvas size, so the set cannot register');

  const { fits, ref } = registerCycle(raws);

  /* Each frame redrawn at its fitted size and position, onto one canvas big
     enough to hold all six wherever the fit has put them. */
  const place = raws.map((fr, i) => ({
    w: Math.max(1, Math.round(fr.w * fits[i].s)),
    h: Math.max(1, Math.round(fr.h * fits[i].s)),
    left: Math.round(fits[i].dx), top: Math.round(fits[i].dy),
  }));
  const frames = await placeOnShared(raws, place);

  const apart = Math.max(...fits.map(ft => Math.abs(1 - ft.s)));
  const worst = Math.min(...fits.map(ft => ft.score));
  console.log(String(key + ' walk').padEnd(26),
    ('fitted to frame ' + (ref + 1) + ', which the others were ' + (apart * 100).toFixed(0) + '% off').padEnd(44),
    'worst overlap ' + (100 * worst).toFixed(0) + '%');

  const box = unionBox(frames);
  if (!box) { console.log(String(key + ' walk').padEnd(26), 'every frame keyed away to nothing'); return null; }
  const { x0, y0, bw, bh } = box, x1 = box.x1, y1 = box.y1;


  /* Which beat he should stand on, and a free way to make it the right one.

     A walk is a LOOP, so rotating which frame is called number one leaves
     the animation untouched -- the same six pictures follow the same six
     pictures for ever. That makes the starting point free, and it is worth
     spending on the one frame the game shows on its own: the one he holds
     while he is standing still.

     The stillest beat is the passing stride, where the feet are together
     under the body. Measured by the width of the footprint, and measured
     rather than assumed, because the brief asks for passing on beats three
     and six and the generator does not oblige: on the first real set the
     farmer passed on two and five, the woodcutter on six, and the woman in
     the dress -- whose feet nobody can see -- on three and six, which is
     the only place the brief was followed.

     So the loop is turned until the narrowest footprint is the frame the
     game stands on, and the cycle itself is none the wiser. */
  const band = Math.max(1, Math.round(bh * 0.12));
  const foot = frames.map(fr => {
    let lo = Infinity, hi = -Infinity;
    for (let y = Math.max(0, y1 - band + 1); y <= Math.min(y1, fr.h - 1); y++)
      for (let x = x0; x <= Math.min(x1, fr.w - 1); x++) {
        if (fr.data[(y * fr.w + x) * fr.ch + 3] < 8) continue;
        if (x < lo) lo = x; if (x > hi) hi = x;
      }
    return hi >= lo ? hi - lo + 1 : 0;
  });
  let still = 0;
  for (let i = 1; i < foot.length; i++) if (foot[i] < foot[still]) still = i;
  const turn = i => frames[(still - STAND_AT + i + 2 * WALK_FRAMES) % WALK_FRAMES];

  const cap = CAP[key] || MAX_W;
  let wrote = 0, bytes = 0, dim = '';
  for (let i = 0; i < frames.length; i++) {
    const fr = turn(i);
    let img = sharp(fr.data, { raw: { width: fr.w, height: fr.h, channels: fr.ch } })
      .extract({ left: Math.min(x0, fr.w - 1), top: Math.min(y0, fr.h - 1),
        width: Math.min(bw, fr.w - x0), height: Math.min(bh, fr.h - y0) });
    /* Capped by HEIGHT, not by the longest side as a single image is.

       The game draws a villager to a height, so height is what has to match
       the standing sprite. A cycle's shared box is wider than that sprite --
       the legs are apart in four frames of six -- so capping the longest
       side would scale the set down by its width and the villager would
       shrink the moment he set off. One cap for the whole set, so every
       frame also lands at the same scale as every other. */
    if (bh > cap) img = img.resize({ height: cap, withoutEnlargement: true });
    const out = await img.webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
    fs.writeFileSync(path.join(ART, walkName(key, i + 1) + '.webp'), out);
    const meta = await sharp(out).metadata();
    dim = meta.width + 'x' + meta.height; bytes += out.length; wrote++;
  }
  console.log(String(key + ' walk').padEnd(26), (wrote + ' frames, registered as one set').padEnd(34),
    '-> ' + dim + '  ' + (bytes / 1024).toFixed(0) + ' KB total');
  console.log(''.padEnd(26), ('footprints ' + foot.join(' ') + ' px').padEnd(34),
    'turned ' + ((still - STAND_AT + 2 * WALK_FRAMES) % WALK_FRAMES)
    + ', so he stands on the narrowest');
  return wrote;
}


/* A building drawn in stages, registered on its own foundations.

   The same shape of problem as a walk cycle and the opposite answer in the
   middle of it, which is why this is not that function with a flag.

   A cycle is six pictures of one figure that must all be the SAME SIZE, so
   registerCycle fits them by silhouette and scales them to match. A stage set
   is five pictures of a building that is SUPPOSED to get bigger -- the whole
   point of it is that the player watches a tower rise over an hour -- and
   fitting those by silhouette would shrink stage five back down to stage one
   and throw away the only thing the set exists to show. Nothing here scales
   anything.

   What has to line up is the FOUNDATION. Every stage stands on the same
   square of ground, so the frames are shifted until their bases coincide and
   then left alone. The base is two measurements: the lowest row carrying real
   figure, and the middle of the footing -- the horizontal centre of a band
   just above that row, rather than of the whole silhouette, because the
   silhouette of a tall stage is mostly tower and the tower is not what sits
   on the plot.

   Median rather than first, for the reason the cycle fit uses one: the first
   stage is only whichever one was drawn first and may be the odd one out.

   Capped on WIDTH, and that is the other thing this does differently. A
   villager is drawn to a HEIGHT, so a cycle caps on height. A building is
   not: artRect pins the sprite\'s width to the plot diamond and lets the
   height follow the image\'s own aspect. So width is the dimension that has
   to match the plot, and capping the longest side -- which on a lighthouse is
   the height -- would leave the building a quarter of the width of its own
   foundations. */
const STAGE_FLOOR = 0.004;            // coverage at which a row is ground, not a stray pixel
const STAGE_BAND = 0.05;              // how much of the canvas counts as the footing
const PLINTH_DRIFT = 1.5;             // a footing half the width of another is a different building

function footOf(fr) {
  const { data, w, h, ch } = fr;
  const on = (x, y) => data[(y * w + x) * ch + 3] >= 8;
  let bottom = -1;
  for (let y = h - 1; y >= 0 && bottom < 0; y--) {
    let n = 0;
    for (let x = 0; x < w; x++) if (on(x, y)) n++;
    if (n >= Math.max(2, w * STAGE_FLOOR)) bottom = y;
  }
  if (bottom < 0) return null;
  const band = Math.max(2, Math.round(h * STAGE_BAND));
  let lo = w, hi = -1;
  for (let y = Math.max(0, bottom - band + 1); y <= bottom; y++)
    for (let x = 0; x < w; x++) if (on(x, y)) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return { bottom, mid: hi >= lo ? Math.round((lo + hi) / 2) : (w >> 1), wide: hi >= lo ? hi - lo + 1 : 0 };
}

/* How much ground the building covers, in pixels across.

   Not simply the widest row of the silhouette. In isometric art a row low
   down can catch the far corner of one wall and the near corner of the other
   with nothing but air between them, and come back half again as wide as
   anything that is really standing there -- the finished beacon has exactly
   such a row, 534px across where the building is 422. So a row only counts
   towards the footing if it is mostly filled.

   Over the bottom two fifths of the FIGURE, not of the canvas. The canvas
   belongs to the whole set and is sized for the tallest stage, so the first
   stage sits in the bottom quarter of it and a band measured off the canvas
   would be reading the tower on one stage and the footing on another. */
const PLINTH_BAND = 0.4;              // how far up the figure a footing may reach
const PLINTH_SOLID = 0.5;             // a row of air with two corners in it is not a footing

function plinthOf(fr) {
  const { data, w, h, ch } = fr;
  const span = [], fill = [];
  for (let y = 0; y < h; y++) {
    let lo = w, hi = -1, n = 0;
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * ch + 3] >= 8) { if (x < lo) lo = x; if (x > hi) hi = x; n++; }
    span.push(hi >= lo ? hi - lo + 1 : 0); fill.push(n);
  }
  let y1 = h - 1; while (y1 >= 0 && !span[y1]) y1--;
  if (y1 < 0) return 0;
  let y0 = 0; while (y0 < y1 && !span[y0]) y0++;
  let wide = 0;
  for (let y = Math.max(y0, y1 - Math.round((y1 - y0 + 1) * PLINTH_BAND) + 1); y <= y1; y++)
    if (fill[y] >= span[y] * PLINTH_SOLID && span[y] > wide) wide = span[y];
  return wide;
}

async function stageSet(key) {
  const files = setFiles(key, STAGE_COUNT, stageName, 'stages');
  if (!files) return null;

  const raws = [];
  for (const file of files) raws.push(await keyOut(file, false));

  const feet = raws.map(footOf);
  if (feet.some(ft => !ft)) {
    console.log(String(key + ' stages').padEnd(26), 'a stage keyed away to nothing');
    return null;
  }
  const mid = arr => [...arr].sort((a, b) => a - b)[arr.length >> 1];
  const ty = mid(feet.map(ft => ft.bottom)), tx = mid(feet.map(ft => ft.mid));

  /* Shifted, never resized: w and h are the frame\'s own. */
  const place = raws.map((fr, i) => ({
    w: fr.w, h: fr.h,
    left: tx - feet[i].mid, top: ty - feet[i].bottom,
  }));
  const shift = Math.max(...place.map(p => Math.max(Math.abs(p.left), Math.abs(p.top))));
  const frames = await placeOnShared(raws, place);

  const box = unionBox(frames);
  if (!box) { console.log(String(key + ' stages').padEnd(26), 'every stage keyed away to nothing'); return null; }
  const { x0, y0, bw, bh } = box;

  /* How much taller the set gets, which is the thing it exists to do. Said
     out loud because a set whose stages are all the same height is a set that
     will look like nothing is happening, and nothing else would report it. */
  /* Off the figure, not off the topmost lit pixel. One speck left in the air
     above a short stage makes the whole set look as though it barely rose:
     the beacon reported 438px where its stonework climbs 806. */
  const tops = frames.map(fr => { const b = bodyBox(fr); return b ? b.y0 : fr.h; });
  /* Measured on the shared canvas and then put into the units of the files
     that actually get written, which are not the same thing. The set is cut
     to one box and that box is capped on its width, so everything in it is
     scaled by the same factor on the way out -- and the first real set was
     1493px across against a cap of 800. Reporting the raw figure said the
     beacon rose 549px when the five files it had just written rose 294. A
     number that describes a canvas nobody keeps is worse than no number: it
     is the one you would reach for to check the files. */
  const cap = CAP[key] || MAX_W;
  const shrink = bw > cap ? cap / bw : 1;
  const risen = Math.round((Math.max(...tops) - Math.min(...tops)) * shrink);
  if (risen < bh * shrink * 0.05)
    console.log(String(key + ' stages').padEnd(26),
      'WARNING: tallest stage is only ' + risen + 'px above the shortest, so it will not read as rising');

  /* And does it cover the same ground at every stage?

     It has to, and until this nothing would have noticed that it did not.
     artRect pins a sprite's WIDTH to the plot diamond, and every stage in a
     set comes out the same width, so a stage whose footing is drawn half as
     wide is a stage drawn half as wide ON THE PLOT. The player watches the
     tower go up and the ground underneath it shrink away.

     The fit cannot repair it, which is why this reports rather than corrects.
     Frames here are shifted and never scaled; scaling them to a common
     footing is precisely the thing that would flatten the rise, and on the
     first real set it did worse than that -- the lit lighthouse has a wider
     stone apron than the unlit one, so matching the footings scaled the
     finished building DOWN and the beacon got shorter at the moment it was
     done. There is no measurement of five independently drawn pictures that
     tells you whether a wider base is a different zoom or a different base.
     A person looking at them knows at once. So: hand it to the person.

     Half is the line. Stages of one building dress their base differently as
     it goes up -- the beacon's last three sit within 1.2x of each other and
     read as one tower -- but a footing half the width of another is a
     different building, and the first two stages came back at 2.5x. */
  const plinth = frames.map(plinthOf);
  const fat = plinth.indexOf(Math.max(...plinth)), thin = plinth.indexOf(Math.min(...plinth));
  const drift = plinth[thin] ? plinth[fat] / plinth[thin] : 0;
  if (drift >= PLINTH_DRIFT)
    console.log(String(key + ' stages').padEnd(26),
      'WARNING: stage ' + (fat + 1) + ' stands on a footing ' + drift.toFixed(1)
      + 'x the width of stage ' + (thin + 1) + ', so the building shrinks as it is built');

  let wrote = 0, bytes = 0, dim = '';
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
    let img = sharp(fr.data, { raw: { width: fr.w, height: fr.h, channels: fr.ch } })
      .extract({ left: x0, top: y0, width: bw, height: bh });
    if (bw > cap) img = img.resize({ width: cap, withoutEnlargement: true });
    const out = await img.webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
    fs.writeFileSync(path.join(ART, stageName(key, i + 1) + '.webp'), out);
    const meta = await sharp(out).metadata();
    dim = meta.width + 'x' + meta.height; bytes += out.length; wrote++;
  }
  console.log(String(key + ' stages').padEnd(26),
    (wrote + ' stages on one foundation, moved up to ' + Math.round(shift * shrink) + 'px').padEnd(44),
    '-> ' + dim + '  ' + (bytes / 1024).toFixed(0) + ' KB total, rises ' + risen + 'px');
  console.log(''.padEnd(26),
    ('footings ' + plinth.map(p => Math.round(p * shrink)).join(' ') + ' px').padEnd(44),
    'widest is ' + drift.toFixed(1) + 'x the narrowest');
  return wrote;
}
(async () => {
  fs.mkdirSync(ORIG, { recursive: true });
  const argv = process.argv.slice(2);
  const walkOnly = argv.includes('--walk');
  const only = argv.filter(a => a !== '--walk');
  const keys = only.length ? only : KEYS;

  /* Sets first, and on every run rather than only with the flag: a set dropped
     in art/ and forgotten is a villager who goes on hopping or a beacon that
     never appears, and the flag is there to do ONLY the sets, not to be the
     only way to do them. */
  let cycles = 0;
  for (const k of WALK_OF) if (!only.length || only.includes(k)) cycles += (await walkSet(k)) ? 1 : 0;
  for (const k of STAGES_OF) if (!only.length || only.includes(k)) cycles += (await stageSet(k)) ? 1 : 0;
  if (walkOnly) {
    if (!cycles) console.log('No set frames found in art/. See groups 24-26 and 27 in art/PROMPTS.md.');
    return;
  }

  const jobs = [];
  for (const k of keys) {
    const dropped = path.join(ART, k + '.png'), master = path.join(ORIG, k + '.png');
    if (fs.existsSync(dropped)) fs.renameSync(dropped, master);      // newly generated
    if (fs.existsSync(master)) jobs.push({ key: k, file: master });
  }

  if (!jobs.length) {
    console.log('No art found in art/. Generate the images first — see art/PROMPTS.md.');
    return;
  }

  for (const { key, file } of jobs) {
    const name = key + '.png';
    try {
      const { data, w, h, ch, pal, holes } = await keyOut(file, OPAQUE.has(key));
      let src = sharp(data, { raw: { width: w, height: h, channels: ch } }).png();
      if (!OPAQUE.has(key)) src = src.trim({ threshold: 1 });   // nothing to trim on a full-bleed plate
      const trimmed = await src.toBuffer();
      const tm = await sharp(trimmed).metadata();

      // repeating tiles get their edge shading divided out, once they are
      // trimmed and the centre of the image really is the centre of the tile
      let flatPc = 0;
      let src2 = trimmed;
      if (TILES.has(key)) {
        const r = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        flatPc = flatten(r.data, r.info.width, r.info.height, r.info.channels);
        src2 = await sharp(r.data, { raw: { width: r.info.width, height: r.info.height, channels: r.info.channels } })
          .png().toBuffer();
      }

      // WebP, not PNG: these are painted gradients, where a palette PNG bands
      // badly and a true-colour one stays in the megabytes
      // cap the LONGEST side: villagers and pines are tall, buildings are wide
      const cap = CAP[key] || MAX_W;
      let img = sharp(src2);
      if (Math.max(tm.width, tm.height) > cap)
        img = img.resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true });
      const out = await img.webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
      fs.writeFileSync(path.join(ART, key + '.webp'), out);
      const meta = await sharp(out).metadata();

      const desc = TILES.has(key) ? 'tile, ' + flatPc + '% edge shading removed'
        : OPAQUE.has(key) ? 'solid plate, kept as drawn'
        : !pal.length ? 'already transparent'
        : `${pal.length > 1 ? 'checkerboard' : 'flat'} bg keyed${holes ? ` +${holes} gaps` : ''}`;
      console.log(name.padEnd(12), desc.padEnd(28),
        `-> ${key}.webp  ${meta.width}x${meta.height}  ${(out.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.error(name.padEnd(12), 'FAILED:', e.message);
    }
  }
})();
