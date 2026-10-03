// Локальный стенд, повторяющий прод: Python-бэкенд (FastAPI+SQLite во временной папке) + «Pages»: статика + настоящий _worker.js.
// Используется e2e-тестами (Playwright): node tests/devstack.js  — поднять стенд вручную.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), net = require('net');
const { spawn } = require('child_process');
const repo = path.resolve(__dirname, '..');
const root = process.env.SEG_SITE ? path.resolve(process.env.SEG_SITE) : repo;   // SEG_SITE=dist → проверяем собранную (прод) версию
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const PY = process.env.SEG_PY || (fs.existsSync('/workspace/venv-test/bin/python') ? '/workspace/venv-test/bin/python' : 'python3');
const freePort = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseHeaders() {   // минимальный разбор _headers Cloudflare Pages
  const rules = []; let cur = null;
  for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pat: line.trim(), h: {} }; cur.re = new RegExp('^' + cur.pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'); rules.push(cur); } else { const i = line.indexOf(':'); cur.h[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return p => Object.assign({}, ...rules.filter(r => r.re.test(p)).map(r => r.h));
}

async function start(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seg-'));
  const bport = await freePort();
  const secrets = { SEG_SECRET_KEY: 'k'.repeat(48), SEG_PROXY_SECRET: 'p'.repeat(48) };
  const password = 'e2e-pass-' + Math.random().toString(36).slice(2, 10);
  const wport = await freePort();
  const origin = `http://127.0.0.1:${wport}`;
  const env = { ...process.env, ...secrets, SEG_ADMIN_PASSWORD: password, SEG_DB_PATH: path.join(dir, 'seg.db'), SEG_HOST: '127.0.0.1', SEG_PORT: String(bport),
    SEG_ALLOWED_ORIGINS: origin, SEG_ADMIN_ORIGINS: origin, SEG_COOKIE_SECURE: '0', SEG_MIN_TIME_FACTOR: String(opts.minTimeFactor ?? 0), SEG_RL_SCORE_PER_MIN: '60', SEG_AI_MOCK: '1', SEG_AI_MASTER_KEY: require('crypto').randomBytes(32).toString('base64url') + '=', ...(opts.env || {}) };
  const py = spawn(PY, ['-m', 'app'], { cwd: path.join(repo, 'backend'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; py.stdout.on('data', d => log += d); py.stderr.on('data', d => log += d);
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${bport}/api/health`); if (r.ok) break; } catch (e) { /* ждём */ } await sleep(150); if (i === 59) throw new Error('backend не поднялся: ' + log); }

  const worker = (await import(path.join(root, '_worker.js'))).default;
  const hdr0 = parseHeaders();
  const hdr = p => { const h = hdr0(p); if (h['Content-Security-Policy']) h['Content-Security-Policy'] = h['Content-Security-Policy'].replace("connect-src 'self'", `connect-src 'self' ws://127.0.0.1:${bport}`); return h; };   // стенд ходит на WebSocket бэкенда напрямую, как прод
  const wenv = { SEG_PROXY_SECRET: secrets.SEG_PROXY_SECRET, SEG_BACKEND: `http://127.0.0.1:${bport}`, SEG_HOSTS: '127.0.0.1,localhost', ASSETS: { fetch: async req => {
    let p = decodeURIComponent(new URL(req.url).pathname); if (p.endsWith('/')) p += 'index.html'; if (p === '/admin') p = '/admin/index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || /\/(backend|tests|node_modules|screenshots|scripts|\.git)\//.test(p) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('nf', { status: 404 });
    return new Response(fs.readFileSync(f), { status: 200, headers: { 'content-type': types[path.extname(f)] || 'application/octet-stream', ...hdr(new URL(req.url).pathname) } });
  } } };
  const srv = http.createServer(async (req, res) => {
    try {
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(',') : v);
      headers.set('cf-connecting-ip', req.headers['x-test-ip'] || req.socket.remoteAddress.replace('::ffff:', ''));
      const r = await worker.fetch(new Request(origin + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), wenv);
      const out = {}; for (const [k, v] of r.headers) if (k !== 'set-cookie') out[k] = v;
      const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : []; if (sc.length) out['set-cookie'] = sc;
      res.writeHead(r.status, out); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  }).listen(wport, '127.0.0.1');
  await new Promise(r => srv.on('listening', r));
  return { base: origin, ws: `ws://127.0.0.1:${bport}/ws`, password, dbPath: env.SEG_DB_PATH, log: () => log, async stop() { srv.close(); py.kill(); await sleep(100); fs.rmSync(dir, { recursive: true, force: true }); } };
}
module.exports = { start };
if (require.main === module) start().then(s => console.log(s.base, 'admin password:', s.password));
