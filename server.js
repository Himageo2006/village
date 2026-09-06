/* Static file server for the game + a POST endpoint to save captured frames.
   GET  /*            -> serve files from this folder
   POST /save/<name>  -> write request body (binary) into OUT dir  */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = process.env.CAP_OUT || path.join(ROOT, 'cap');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json'
};

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/save/')) {
    const name = path.basename(req.url.slice('/save/'.length));
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(OUT, name), Buffer.concat(chunks));
      res.writeHead(200, {'Access-Control-Allow-Origin':'*'});
      res.end('ok');
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(8952, () => console.log('village server on http://localhost:8952  (frames -> ' + OUT + ')'));
