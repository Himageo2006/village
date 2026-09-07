#!/usr/bin/env node
/* Measure the anchor of each building sprite.

   The game pins a building by its FRONT CORNER -- the near point of its base,
   where it meets the ground -- because that is the one landmark every sprite
   has, whatever shape its roof is. In a correctly drawn isometric sprite the
   front corner is also the lowest point of the image, so it can be read
   straight off the alpha channel instead of guessed.

   Prints the ax/ay values to paste into ART_FIT in game.js. The third value,
   w, is a judgement about overhang and has to be set by eye -- see
   art/ASSETS.md.

   Usage: node tools/measure-art.js [key...] */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'art');
let sharp;
try { sharp = require(path.join(ROOT, '..', 'gatestorm', 'node_modules', 'sharp')); }
catch (e) { console.error('Could not load sharp from the gatestorm project.'); process.exit(1); }

const KEYS = ['house', 'farm', 'lumber', 'store', 'hall', 'well', 'mill', 'market'];
// decorations are anchored bottom-centre and do not use ART_FIT at all
const ALPHA = 40;      // ignore the faint fringe left by anti-aliasing

(async () => {
  const keys = process.argv.length > 2 ? process.argv.slice(2) : KEYS;
  const rows = [];

  for (const key of keys) {
    const file = path.join(ART, key + '.webp');
    if (!fs.existsSync(file)) { console.error(key.padEnd(8), 'no ' + key + '.webp -- run prep-art.js first'); continue; }
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;

    let by = -1, xs = [];
    for (let y = h - 1; y >= 0 && by < 0; y--) {
      for (let x = 0; x < w; x++) if (data[(y * w + x) * ch + 3] > ALPHA) { by = y; xs.push(x); }
    }
    if (by < 0) { console.error(key.padEnd(8), 'fully transparent?'); continue; }

    const ax = (xs.reduce((s, x) => s + x, 0) / xs.length) / w;
    const ay = (by + 1) / h;
    // a wide bottom row means the sprite bottoms out on a flat edge rather than
    // a corner, which usually means it is not drawn at the right angle
    const flat = xs.length / w;
    rows.push({ key, ax, ay, w, h, flat });
  }

  console.log('\nPaste into ART_FIT in game.js (keep your own w values):\n');
  for (const r of rows) {
    console.log(`  ${(r.key + ':').padEnd(8)}{ w: ?.??, ax: ${r.ax.toFixed(3)}, ay: ${r.ay.toFixed(3)} },`
      + `   // ${r.w}x${r.h}`);
  }
  const odd = rows.filter(r => r.flat > 0.06);
  if (odd.length) {
    console.log('\nWarning: the bottom edge is flat rather than a corner on '
      + odd.map(r => r.key).join(', ') + '.');
    console.log('These numbers do not apply. The measurement assumes the lowest');
    console.log('pixel is the front corner of an isometric base, which is only');
    console.log('true of buildings. A standing figure bottoms out on one FOOT and');
    console.log('a boulder on the near edge of a broad base, so ax lands off to');
    console.log('one side. Anchor those bottom-centre instead -- which is what');
    console.log('drawVillager and drawScenery already do.');
    console.log('A building that trips this really is drawn at the wrong angle.');
  }
  console.log('');
})();
