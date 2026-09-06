#!/usr/bin/env node
/* Prepare generated building art for the game.

   Image tools routinely ignore "transparent background" and return a white or
   light-grey one, and they pad the subject with empty margin. Both break the
   sprite: the background shows as a rectangle on the grass, and the padding
   stops the base sitting on the ground.

   For each art/<key>.png this:
     1. keys out a flat background if the corners agree on one colour
     2. trims fully transparent margin
     3. reports what it found, so a file that needs hand-editing is obvious

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

const TOL = 26;            // how close to the corner colour still counts as background
const KEYS = ['house', 'farm', 'lumber', 'store'];

(async () => {
  const files = process.argv.length > 2
    ? process.argv.slice(2)
    : KEYS.map(k => path.join(ART, k + '.png')).filter(fs.existsSync);

  if (!files.length) {
    console.log('No art found in art/. Generate the images first — see art/ASSETS.md.');
    return;
  }

  for (const file of files) {
    const name = path.basename(file);
    try {
      const img = sharp(file).ensureAlpha();
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      const { width: w, height: h, channels: ch } = info;
      const at = (x, y) => { const i = (y * w + x) * ch; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

      // do the four corners agree? if so it is a flat background to key out
      const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
      const opaqueCorners = corners.filter(c => c[3] > 8);
      let keyed = 0, bg = null;
      if (opaqueCorners.length >= 3) {
        const avg = [0, 1, 2].map(i => Math.round(opaqueCorners.reduce((s, c) => s + c[i], 0) / opaqueCorners.length));
        const agree = opaqueCorners.every(c => [0, 1, 2].every(i => Math.abs(c[i] - avg[i]) < TOL));
        if (agree) {
          bg = avg;
          // flood from the edges so a background colour used INSIDE the building
          // (white plaster, pale stone) is not punched out by mistake
          const seen = new Uint8Array(w * h);
          const stack = [];
          for (let x = 0; x < w; x++) { stack.push([x, 0], [x, h - 1]); }
          for (let y = 0; y < h; y++) { stack.push([0, y], [w - 1, y]); }
          while (stack.length) {
            const [x, y] = stack.pop();
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            const idx = y * w + x;
            if (seen[idx]) continue;
            const p = at(x, y);
            if (p[3] < 8) { seen[idx] = 1; stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); continue; }
            if (![0, 1, 2].every(i => Math.abs(p[i] - bg[i]) < TOL)) continue;
            seen[idx] = 1;
            data[idx * ch + 3] = 0; keyed++;
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
        }
      }

      const out = await sharp(data, { raw: { width: w, height: h, channels: ch } })
        .png().trim({ threshold: 1 }).toBuffer();
      const meta = await sharp(out).metadata();
      fs.writeFileSync(file, out);

      console.log(
        name.padEnd(14),
        bg ? `background keyed rgb(${bg.join(',')}), ${keyed} px` : 'already transparent',
        `-> ${meta.width}x${meta.height}`
      );
      if (!bg && opaqueCorners.length >= 3)
        console.log('   ^ corners disagree, so nothing was keyed. Remove the background by hand.');
    } catch (e) {
      console.error(name.padEnd(14), 'FAILED:', e.message);
    }
  }
})();
