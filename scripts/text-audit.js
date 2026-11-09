// One pass over the panels, trays and popups of a rich late-game village, run in the page: reports text that overlaps other text or leaves the canvas.
// Needs node server.js on 8952. Usage: node scripts/text-audit.js [host]. World labels (Lv, !) sliding under the HUD can be listed; that is the camera, not a layout fault.
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const WebSocket = require('ws');
const host = process.argv[2] || '127.0.0.1';
const port = 9375, prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-ta-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--window-size=800,740', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const get = u => new Promise((ok, no) => http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => ok(JSON.parse(d))); }).on('error', no));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inPage = fs.readFileSync(path.join(__dirname, 'text-audit-page.js'), 'utf8');
(async () => {
  let pages;
  for (let i = 0; i < 40; i++) { try { pages = await get(`http://127.0.0.1:${port}/json`); if (pages.some(p => p.type === 'page')) break; } catch (e) {} await sleep(500); }
  const page = pages.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.on('open', r));
  let id = 0; const call = (method, params) => new Promise(ok => { const my = ++id; const h = m => { const j = JSON.parse(m); if (j.id === my) { ws.off('message', h); ok(j); } }; ws.on('message', h); ws.send(JSON.stringify({ id: my, method, params })); });
  await call('Page.enable');
  await call('Page.navigate', { url: 'http://' + host + ':8952/' });
  await sleep(6000);
  const r = await call('Runtime.evaluate', { awaitPromise: true, expression: inPage, timeout: 120000 });
  console.log(r.result.result.value || JSON.stringify(r.result));
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.log('error', e); chrome.kill(); process.exit(1); });
