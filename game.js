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
function camApply() { const s = camScale(); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-CAM.x, -CAM.y); }
function camUnproject(sx, sy) { const s = camScale(); return { x: (sx - W / 2) / s + CAM.x, y: (sy - H / 2) / s + CAM.y }; }
function camProject(wx, wy) { const s = camScale(); return { x: (wx - CAM.x) * s + W / 2, y: (wy - CAM.y) * s + H / 2 }; }

/* ---------- HUD scale (same approach as Gatestorm) ---------- */
const US = () => Math.max(1, Math.min(1.34, VH / H));
const hudTop = () => -OY;
const hudBot = () => H + OY;
const mS = v => v * US();

/* ---------- buildings ---------- */
const BUILDINGS = [
  { key: 'house',  name: 'House',     w: 1, h: 1, cost: { wood: 30 },            pop: 4,   icon: '🏠' },
  { key: 'farm',   name: 'Farm',      w: 2, h: 2, cost: { wood: 45 },            makes: { food: 0.5 }, icon: '🌾' },
  { key: 'lumber', name: 'Lumber Camp', w: 2, h: 1, cost: { wood: 20, food: 15 }, makes: { wood: 0.45 }, icon: '🪵' },
  { key: 'store',  name: 'Storehouse',w: 2, h: 2, cost: { wood: 60, food: 20 },  caps: { wood: 400, food: 400 }, icon: '📦' },
];
const B = k => BUILDINGS.find(b => b.key === k);

let res = { wood: 120, food: 60 };
let caps = { wood: 300, food: 300 };
let placed = [];                      // {key,c,r,t} t = build progress 0..1
let selBuild = null;                  // key being placed
let ghost = null;                     // {c,r,ok}

const occupied = () => {
  const set = new Set();
  for (const p of placed) { const b = B(p.key);
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) set.add((p.c + dc) + ',' + (p.r + dr)); }
  return set;
};
function canPlace(key, c, r, occ) {
  const b = B(key);
  if (c < 0 || r < 0 || c + b.w > GW || r + b.h > GH) return false;
  for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) if (occ.has((c + dc) + ',' + (r + dr))) return false;
  return true;
}
const affordable = key => Object.entries(B(key).cost).every(([k, v]) => res[k] >= v);

function place(key, c, r) {
  const b = B(key);
  for (const [k, v] of Object.entries(b.cost)) res[k] -= v;
  placed.push({ key, c, r, t: 0 });
  recomputeCaps();
  save();
}
function recomputeCaps() {
  caps = { wood: 300, food: 300 };
  for (const p of placed) { const b = B(p.key); if (b.caps && p.t >= 1)
    for (const [k, v] of Object.entries(b.caps)) caps[k] += v; }
}

/* ---------- save ---------- */
const KEY = 'vil_save';
function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, res, placed })); } catch (e) {} }
function load() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  // same defensive shape as Gatestorm's loadProg: never trust what comes back
  if (!s || typeof s !== 'object' || s.v !== 1) return;
  if (s.res && typeof s.res === 'object') for (const k of ['wood', 'food'])
    if (typeof s.res[k] === 'number' && isFinite(s.res[k])) res[k] = s.res[k];
  if (Array.isArray(s.placed)) placed = s.placed.filter(p =>
    p && B(p.key) && Number.isFinite(p.c) && Number.isFinite(p.r))
    .map(p => ({ key: p.key, c: p.c | 0, r: p.r | 0, t: typeof p.t === 'number' ? Math.min(1, Math.max(0, p.t)) : 1 }));
  recomputeCaps();
}

/* ---------- simulation ---------- */
const BUILD_TIME = 3.0;
function step(dt) {
  for (const p of placed) {
    if (p.t < 1) { p.t = Math.min(1, p.t + dt / BUILD_TIME); if (p.t >= 1) recomputeCaps(); continue; }
    const b = B(p.key);
    if (b.makes) for (const [k, v] of Object.entries(b.makes)) res[k] = Math.min(caps[k], res[k] + v * dt);
  }
}

/* ---------- drawing ---------- */
function fitCanvas() {
  const sw = window.innerWidth || W, sh = window.innerHeight || H;
  const want = Math.max(H, Math.min(H * 2, Math.round(W * sh / sw)));
  if (cv.height !== want) cv.height = want;
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
function drawGround() {
  for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
    const n = ((c * 7 + r * 13) % 5) / 5;
    tilePath(c, r);
    g.fillStyle = `hsl(${96 + n * 10}, ${34 + n * 8}%, ${33 + n * 6}%)`;
    g.fill();
    g.strokeStyle = 'rgba(20,40,18,.30)'; g.lineWidth = 1.5; g.stroke();
  }
}
/* Buildings are drawn, not sprited: there is no house art in the project, and a
   consistent procedural style beats mismatched borrowed sprites. */
function drawBuilding(p, alpha, tint) {
  const b = B(p.key);
  const a = tileToWorld(p.c, p.r), d = tileToWorld(p.c + b.w - 1, p.r + b.h - 1);
  const cx = (a.x + d.x) / 2, cy = (a.y + d.y) / 2;
  const halfW = (b.w + b.h) * TW / 4.6, halfH = (b.w + b.h) * TH / 4.6;
  const grow = p.t < 1 ? 0.35 + 0.65 * p.t : 1;      // rises as it is built
  const wallH = (b.key === 'store' ? 74 : b.key === 'farm' ? 26 : 62) * grow;

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
    // timber walls: two visible faces
    const top = cy - wallH;
    g.fillStyle = tint || '#7a5a34';
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx - halfW, cy - wallH); g.closePath(); g.fill();
    g.fillStyle = tint || '#5e4527';
    g.beginPath(); g.moveTo(cx + halfW, cy); g.lineTo(cx, cy + halfH); g.lineTo(cx, cy + halfH - wallH); g.lineTo(cx + halfW, cy - wallH); g.closePath(); g.fill();
    // roof
    g.fillStyle = tint || '#8c3f2a';
    g.beginPath(); g.moveTo(cx, top - halfH * 0.75); g.lineTo(cx + halfW, top); g.lineTo(cx, top + halfH); g.lineTo(cx - halfW, top); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,18,10,.6)'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(255,225,190,.18)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, top - halfH * 0.75); g.lineTo(cx, top + halfH); g.stroke();
  }
  // scaffold while building
  if (p.t < 1) {
    g.strokeStyle = 'rgba(230,200,140,.85)'; g.lineWidth = 3; g.setLineDash([8, 6]);
    g.beginPath(); g.moveTo(cx - halfW, cy); g.lineTo(cx, cy - halfH); g.lineTo(cx + halfW, cy); g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

function drawWorld() {
  drawGround();
  if (ghost && selBuild) {                              // placement preview
    const b = B(selBuild), occ = occupied();
    for (let dc = 0; dc < b.w; dc++) for (let dr = 0; dr < b.h; dr++) {
      tilePath(ghost.c + dc, ghost.r + dr);
      g.fillStyle = ghost.ok ? 'rgba(120,230,120,.40)' : 'rgba(235,90,70,.40)';
      g.fill();
    }
    if (ghost.ok) drawBuilding({ key: selBuild, c: ghost.c, r: ghost.r, t: 1 }, 0.55);
  }
  // painter's order: back rows first
  for (const p of [...placed].sort((a, b2) => (a.c + a.r) - (b2.c + b2.r))) drawBuilding(p, 1);
}

/* ---------- HUD ---------- */
function barRects() {
  const u = US(), n = BUILDINGS.length;
  const h = 118 * u, pad = 10 * u;
  const w = Math.min(190 * u, (W - pad * (n + 1)) / n);
  const y = hudBot() - h / 2 - 22 * u;
  const total = n * w + (n - 1) * pad;
  return BUILDINGS.map((b, i) => ({ b, x: (W - total) / 2 + w / 2 + i * (w + pad), y, w, h }));
}
function drawHUD() {
  const u = US();
  // resources
  const ry = hudTop() + 52 * u;
  g.save();
  g.font = `bold ${Math.round(34 * u)}px Segoe UI, sans-serif`; g.textBaseline = 'middle';
  const chip = (x, icon, val, cap, col) => {
    const wch = 210 * u;
    g.fillStyle = 'rgba(16,26,14,.78)'; g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, ry - 30 * u, wch, 60 * u, 30 * u); g.fill(); g.stroke();
    g.textAlign = 'left'; g.font = `${Math.round(30 * u)}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(icon, x + 16 * u, ry);
    g.font = `bold ${Math.round(30 * u)}px Segoe UI, sans-serif`; g.fillStyle = col;
    g.fillText(Math.floor(val) + ' / ' + cap, x + 62 * u, ry);
  };
  chip(24 * u, '🪵', res.wood, caps.wood, '#e8c98a');
  chip(24 * u + 226 * u, '🌾', res.food, caps.food, '#bfe08a');
  g.restore();

  // build bar
  for (const r of barRects()) {
    const can = affordable(r.b.key), sel = selBuild === r.b.key;
    g.save();
    g.fillStyle = sel ? 'rgba(60,96,44,.95)' : can ? 'rgba(22,32,20,.92)' : 'rgba(40,22,20,.92)';
    g.strokeStyle = sel ? '#9fe86b' : can ? 'rgba(255,255,255,.22)' : 'rgba(200,110,90,.5)';
    g.lineWidth = sel ? 4 : 2.5;
    g.beginPath(); g.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, 16); g.fill(); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(40 * US())}px Segoe UI, sans-serif`;
    g.fillText(r.b.icon, r.x, r.y - r.h * 0.22);
    g.font = `bold ${Math.round(19 * US())}px Segoe UI, sans-serif`;
    g.fillStyle = '#fff'; g.fillText(r.b.name, r.x, r.y + r.h * 0.10);
    g.font = `${Math.round(18 * US())}px Segoe UI, sans-serif`;
    g.fillStyle = can ? '#e8c98a' : '#e59a86';
    g.fillText(Object.entries(r.b.cost).map(([k, v]) => (k === 'wood' ? '🪵' : '🌾') + v).join('  '), r.x, r.y + r.h * 0.34);
    g.restore();
  }
  if (selBuild) {
    g.save(); g.textAlign = 'center'; g.fillStyle = '#cfe0a8';
    g.font = `bold ${Math.round(26 * US())}px Segoe UI, sans-serif`;
    g.fillText('Tap a green tile to build  ·  tap here to cancel', W / 2, barRects()[0].y - barRects()[0].h / 2 - 22 * US());
    g.restore();
  }
}

function draw() {
  fitCanvas();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0e1410'; g.fillRect(0, 0, W, VH);
  g.save(); g.translate(0, OY);
  g.save(); camApply(); drawWorld(); g.restore();
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
  ptrSweep();
  const p = evPos(ev);
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
  if (selBuild) updateGhost(p.x, p.y);
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
document.addEventListener('visibilitychange', () => { if (document.hidden) PTRS.clear(); });
window.addEventListener('resize', fitCanvas);

function updateGhost(sx, sy) {
  const w = camUnproject(sx, sy), t = worldToTile(w.x, w.y);
  const c = Math.floor(t.c), r = Math.floor(t.r);
  ghost = { c, r, ok: canPlace(selBuild, c, r, occupied()) && affordable(selBuild) };
}
function tap(sx, sy) {
  // HUD first, exactly as in Gatestorm: the bar must always win over the world
  for (const r of barRects()) {
    if (Math.abs(sx - r.x) < r.w / 2 && Math.abs(sy - r.y) < r.h / 2) {
      selBuild = (selBuild === r.b.key) ? null : r.b.key;
      ghost = null;
      return;
    }
  }
  if (selBuild) {
    updateGhost(sx, sy);
    if (ghost && ghost.ok) { place(selBuild, ghost.c, ghost.r); selBuild = null; ghost = null; }
    return;
  }
}

/* ---------- boot ---------- */
load();
fitCanvas();
CAM.x = W / 2; CAM.y = tileToWorld(GW / 2, GH / 2).y; camClamp();
let last = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  try { step(dt); draw(); } catch (e) { console.error(e); }
}, 1000 / 30);

/* test hooks */
window.__v = { res, get placed() { return placed; }, B, BUILDINGS, tileToWorld, worldToTile,
  camProject, camUnproject, canPlace, occupied, place, step, draw, barRects,
  get sel() { return selBuild; }, set sel(v) { selBuild = v; },
  tap, CAM, save, load, get caps() { return caps; } };
