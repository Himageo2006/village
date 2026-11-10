// The full soak battery (allSweeps from tools/fuzz.js) in a headless Chrome, where frames keep coming with nobody
// watching. Needs node server.js on 8952. Usage: timeout 420 node scripts/battery.js [host] -- a fresh host each run
// is fresh storage. Prints the result and leaves it in cap/battery-result.json. Run one at a time.
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const WebSocket = require('ws');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const host = process.argv[2] || '127.0.0.11';
const port = 9344, prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-bat-'));
const result = path.join(__dirname, '..', 'cap', 'battery-result.json');
try { fs.unlinkSync(result); } catch (e) {}   // a stale result would be read back as this run's
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
  '--window-size=800,740', '--no-first-run', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required',
  'http://' + host + ':8952/'], { stdio: 'ignore' });
const get = u => new Promise((ok, no) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => ok(JSON.parse(d))); }).on('error', no));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const starter = `(async () => {
await new Promise(r => setTimeout(r, 1500));
await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'tools/fuzz.js?' + Date.now(); s.onload = ok; s.onerror = no; document.head.appendChild(s); });
window.__t0 = Date.now(); window.__x = null;
window.__poster = setInterval(() => { if (window.__x) { clearInterval(window.__poster); const r = window.__x; const d = r.detail || {}; const bad = {}; for (const k of (r.failed || [])) { const n = k.split(':')[0]; bad[n] = d[n] && (d[n].fails || d[n].worst); } fetch('/save/battery-result.json', { method: 'POST', body: JSON.stringify({ min: ((Date.now() - window.__t0) / 60000).toFixed(1), ran: r.ran, failed: r.failed, arc: r.arc, err: r.err, bad }, null, 1) }); } }, 2000);
setTimeout(() => window.allSweeps({ rounds: 12000 }).then(r => window.__x = r, e => window.__x = { err: String(e) }), 50);
return 'started'; })()`;
(async () => {
  let pages;
  for (let i = 0; i < 40; i++) { try { pages = await get(`http://127.0.0.1:${port}/json`); if (pages.some(p => p.type === 'page' && p.url.includes(host))) break; } catch (e) {} await sleep(500); }
  const page = pages.find(p => p.type === 'page' && p.url.includes(host));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let id = 0; const call = (method, params) => new Promise(ok => { const my = ++id; const h = m => { const j = JSON.parse(m); if (j.id === my) { ws.off('message', h); ok(j); } }; ws.on('message', h); ws.send(JSON.stringify({ id: my, method, params })); });
  let last='';ws.on('message',m=>{const j=JSON.parse(m);if(j.method==='Runtime.consoleAPICalled'){const t=(j.params.args[0]||{}).value;if(typeof t==='string'&&t.startsWith('[sweep]'))last=t;}});await call('Runtime.enable');
  await sleep(2500);
  const r = await call('Runtime.evaluate', { expression: starter, awaitPromise: true });
  console.log('starter:', JSON.stringify(r.result && r.result.result));
  // a starter that did not say 'started' (fuzz.js failed to load) would wait here for ever
  if (!(r.result && r.result.result && r.result.result.value === 'started')) { console.log('starter failed'); chrome.kill(); process.exit(2); }
  const t0 = Date.now();
  while (!fs.existsSync(result) || !fs.statSync(result).size) {
    await sleep(15000);
    if (Date.now() - t0 > 6 * 60000) { console.log('HUNG during', last); break; }
  }
  if (fs.existsSync(result)) console.log(fs.readFileSync(result, 'utf8').replace(/\s+/g, '').slice(0,300), 'last', last);
  ws.close(); chrome.kill();
  process.exit(0);
})().catch(e => { console.log('error', e); chrome.kill(); process.exit(1); });
