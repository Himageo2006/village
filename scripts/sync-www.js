#!/usr/bin/env node
/* Copy the game into www/, which is what Capacitor packages.

   This exists because editing game.js and running a Gradle build is not enough:
   the APK is built from www/, so a forgotten copy ships yesterday's code and
   the bug you just fixed is still there on the phone. It cost two wasted build
   cycles on Gatestorm before it was made part of the build script. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const FILES = ['index.html', 'game.js'];
const DIRS = ['art'];
// art/original holds the multi-megabyte PNG masters; the game never loads them
const SKIP_DIRS = new Set(['original']);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      n += copyDir(path.join(from, e.name), path.join(to, e.name));
    } else if (!e.name.endsWith('.md')) {          // docs are not assets
      fs.copyFileSync(path.join(from, e.name), path.join(to, e.name));
      n++;
    }
  }
  return n;
}

fs.rmSync(WWW, { recursive: true, force: true });   // never ship a stale leftover
fs.mkdirSync(WWW, { recursive: true });

let count = 0;
for (const f of FILES) {
  fs.copyFileSync(path.join(ROOT, f), path.join(WWW, f));
  count++;
}
for (const d of DIRS) count += copyDir(path.join(ROOT, d), path.join(WWW, d));

const size = (function du(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((s, e) => s + du(path.join(p, e)), 0);
})(WWW);

console.log(`www/  ${count} files, ${(size / 1024 / 1024).toFixed(2)} MB`);
