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
  'house', 'farm', 'lumber', 'store', 'hall', 'well', 'mill', 'market',
  'villager_farmer', 'villager_basket', 'villager_woodcutter',
  'tree_pine', 'tree_oak', 'rock', 'bush',
  'path', 'fence', 'flowers', 'hedge', 'lamp', 'statue',
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
const WALK_OF = ['villager_farmer', 'villager_basket', 'villager_woodcutter'];
const WALK_FRAMES = 6;
const walkName = (key, i) => key + '_walk' + i;
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
  villager_farmer: 320, villager_basket: 320, villager_woodcutter: 320,
  tree_pine: 560, tree_oak: 560, rock: 360, bush: 360,
  well: 420, hall: 800, mill: 800, market: 800,
  path: 300, fence: 300, flowers: 300, hedge: 320, lamp: 380, statue: 400,
  ground: 1800,
  // the water is mirrored into a 2x2 tile at runtime, so its pixels cost four
  // times what they measure here; it is a soft background and can take it
  water: 900,
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
  const files = [];
  for (let i = 1; i <= WALK_FRAMES; i++) {
    const n = walkName(key, i);
    const dropped = path.join(ART, n + '.png'), master = path.join(ORIG, n + '.png');
    if (fs.existsSync(dropped)) fs.renameSync(dropped, master);
    if (fs.existsSync(master)) files.push(master);
  }
  if (!files.length) return null;
  if (files.length < WALK_FRAMES) {
    console.log(String(key + ' walk').padEnd(26),
      'only ' + files.length + ' of ' + WALK_FRAMES + ' frames — the set is ignored until it is complete');
    return null;
  }

  const frames = [];
  for (const file of files) frames.push(await keyOut(file, false));

  /* The union box. A pixel counts as part of the figure at the same
     threshold sharp's own trim uses, so a soft rim is not mistaken for air. */
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const fr of frames) {
    for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) {
      if (fr.data[(y * fr.w + x) * fr.ch + 3] < 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (!isFinite(x0)) { console.log(String(key + ' walk').padEnd(26), 'every frame keyed away to nothing'); return null; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  /* Frames of differing canvas size cannot share one box, and that is a
     recrop rather than drift -- worth saying out loud rather than papering
     over, because the cycle will be wrong and the reason will not be
     obvious. */
  const odd = frames.filter(fr => fr.w !== frames[0].w || fr.h !== frames[0].h).length;
  if (odd) console.log(String(key + ' walk').padEnd(26),
    'WARNING: ' + odd + ' frames are a different canvas size, so the set cannot register');

  const cap = CAP[key] || MAX_W;
  let wrote = 0, bytes = 0, dim = '';
  for (let i = 0; i < frames.length; i++) {
    const fr = frames[i];
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
  return wrote;
}

(async () => {
  fs.mkdirSync(ORIG, { recursive: true });
  const argv = process.argv.slice(2);
  const walkOnly = argv.includes('--walk');
  const only = argv.filter(a => a !== '--walk');
  const keys = only.length ? only : KEYS;

  /* Walk cycles first, and on every run rather than only with --walk: a set
     dropped in art/ and forgotten is a villager who goes on hopping, and the
     flag is there to do ONLY the cycles, not to be the only way to do them. */
  let cycles = 0;
  for (const k of WALK_OF) if (!only.length || only.includes(k)) cycles += (await walkSet(k)) ? 1 : 0;
  if (walkOnly) {
    if (!cycles) console.log('No walk frames found in art/. See groups 24-26 in art/PROMPTS.md.');
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
