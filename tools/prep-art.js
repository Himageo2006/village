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
  'ground', 'water',
];

/* Art that is MEANT to be a solid rectangle. The background keyer works by
   agreeing on a border colour and flooding inwards, which on a full-bleed
   image of water agrees on blue and erases the lot. These are only resized
   and re-encoded. */
const OPAQUE = new Set(['water']);

/* How big each kind is actually drawn on screen, longest side, at full zoom-in.
   A villager stands 60 world px tall and the camera tops out near 3x, so
   shipping one at 1536px is 8x more pixels than can ever be shown. Anything not
   listed gets MAX_W. */
const CAP = {
  villager_farmer: 320, villager_basket: 320, villager_woodcutter: 320,
  tree_pine: 560, tree_oak: 560, rock: 360, bush: 360,
  well: 420, hall: 800, mill: 800, market: 800,
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

(async () => {
  fs.mkdirSync(ORIG, { recursive: true });
  const only = process.argv.slice(2);
  const keys = only.length ? only : KEYS;

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
      const { data, info } = await sharp(file).ensureAlpha()
        .raw().toBuffer({ resolveWithObject: true });
      const { width: w, height: h, channels: ch } = info;
      const at = (x, y) => { const i = (y * w + x) * ch; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

      const pal = OPAQUE.has(key) ? [] : palette(at, w, h);

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

      let src = sharp(data, { raw: { width: w, height: h, channels: ch } }).png();
      if (!OPAQUE.has(key)) src = src.trim({ threshold: 1 });   // nothing to trim on a full-bleed plate
      const trimmed = await src.toBuffer();
      const tm = await sharp(trimmed).metadata();

      // WebP, not PNG: these are painted gradients, where a palette PNG bands
      // badly and a true-colour one stays in the megabytes
      // cap the LONGEST side: villagers and pines are tall, buildings are wide
      const cap = CAP[key] || MAX_W;
      let img = sharp(trimmed);
      if (Math.max(tm.width, tm.height) > cap)
        img = img.resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true });
      const out = await img.webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
      fs.writeFileSync(path.join(ART, key + '.webp'), out);
      const meta = await sharp(out).metadata();

      const desc = OPAQUE.has(key) ? 'solid plate, kept as drawn'
        : !pal.length ? 'already transparent'
        : `${pal.length > 1 ? 'checkerboard' : 'flat'} bg keyed${holes ? ` +${holes} gaps` : ''}`;
      console.log(name.padEnd(12), desc.padEnd(28),
        `-> ${key}.webp  ${meta.width}x${meta.height}  ${(out.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.error(name.padEnd(12), 'FAILED:', e.message);
    }
  }
})();
