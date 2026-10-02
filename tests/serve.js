// Минимальный статический сервер для тестов
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
exports.serve = (port = 0, dir = root) => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('nf'); return; }
    rsp.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
  }).listen(port, '127.0.0.1', () => res({ srv, port: srv.address().port }));
});
if (require.main === module) exports.serve(8099).then(({ port }) => console.log('http://127.0.0.1:' + port));
