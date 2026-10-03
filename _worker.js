/* Последний котёл — Cloudflare Pages «advanced mode» worker.
 *
 * Проксирует на бэкенд (адрес ЗАШИТ в коде — это не открытый прокси) только:
 *   /api/g/*           — публичное API игры (рейтинг, билет, события): GET /leaderboard, POST /run|/event|/score
 *   /api/admin/*       — API админки (вход, выход, сессии, рейтинг, экспорт)
 *   /admin/panel[/...] — сама панель; бэкенд отдаёт её только при действующей сессии (иначе 401)
 * Всё остальное (игра, страница входа /admin/) — статические файлы: env.ASSETS.fetch(request).
 * Админка живёт только на ADMIN_HOSTS (steam-engine-game.pages.dev): на превью-деплоях и других хостах /admin* и /api/* = 404.
 *
 * Secret env var:  SEG_PROXY_SECRET — общий секрет с бэкендом. Без него прокси отвечает 503.
 * Реальный IP клиента (CF-Connecting-IP) уходит как X-SEG-Client-IP вместе с секретом; бэкенд верит ему ТОЛЬКО при верном секрете.
 * Любые X-SEG-* / CF-* / X-Forwarded-* от клиента отбрасываются (белый список заголовков).
 */
export const BACKEND = 'https://185-255-133-179.sslip.io/steam';
export const ADMIN_HOSTS = new Set(['steam-engine-game.pages.dev']);
const PUBLIC_ROUTES = { '/api/g/leaderboard': 'GET', '/api/g/run': 'POST', '/api/g/event': 'POST', '/api/g/score': 'POST', '/api/g/note': 'GET',
  '/api/g/daily': 'GET', '/api/g/daily/score': 'POST', '/api/g/daily/board': 'GET', '/api/g/review': 'POST' };   // 2.0: испытание дня и разбор партии
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'DELETE']);
const MAX_BODY = 8 * 1024;
const FORWARD_REQ = ['accept', 'content-type', 'cookie', 'origin', 'x-csrf-token'];
const DROP_RES = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'server', 'x-powered-by', 'alt-svc']);

export function isAdminProxied(pathname) {
  return pathname === '/admin/panel' || pathname.startsWith('/admin/panel/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}
export function isPublicApi(pathname) { return Object.prototype.hasOwnProperty.call(PUBLIC_ROUTES, pathname); }

function plain(status, text) {
  return new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}

export async function proxy(request, env, url) {
  if (!env || typeof env.SEG_PROXY_SECRET !== 'string' || env.SEG_PROXY_SECRET.length < 32) return plain(503, 'proxy not configured');
  if (!METHODS.has(request.method)) return plain(405, 'method not allowed');
  if (/%2f|%5c|%00|\\|[\u0000-\u001f]/i.test(url.pathname) || url.pathname.includes('..')) return plain(404, 'not found');
  if (isPublicApi(url.pathname)) {
    const want = PUBLIC_ROUTES[url.pathname];
    if (request.method !== want && !(want === 'GET' && request.method === 'HEAD')) return plain(405, 'method not allowed');
  } else if (!isAdminProxied(url.pathname)) return plain(404, 'not found');
  const cl = Number(request.headers.get('content-length') || 0);
  if (cl > MAX_BODY) return plain(413, 'too large');

  const h = new Headers();
  for (const k of FORWARD_REQ) { const v = request.headers.get(k); if (v) h.set(k, v); }
  h.set('x-seg-proxy-secret', env.SEG_PROXY_SECRET);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) h.set('x-seg-client-ip', ip);
  const base = typeof env.SEG_BACKEND === 'string' && env.SEG_BACKEND ? env.SEG_BACKEND : BACKEND;   // SEG_BACKEND — только для локальных тестов
  const init = { method: request.method, headers: h, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  if (init.body && init.body.byteLength > MAX_BODY) return plain(413, 'too large');

  // бэкенд не должен «вешать» игру: публичные вызовы — не дольше 2,5 с (клиент всё равно ждёт максимум 3 с; разбор партии ИИ — до 14 с), админка — до 15 с
  const ac = new AbortController(); init.signal = ac.signal;
  const limit = url.pathname === '/api/g/review' ? 14000 : url.pathname.startsWith('/api/g/') ? 2500 : url.pathname.startsWith('/api/admin/ai') ? 40000 : 15000;   // раздел «ИИ»: проверка ключа/пример могут идти до ~30 с
  const timer = setTimeout(() => ac.abort(), limit);
  let up;
  try { up = await fetch(base + url.pathname + url.search, init); } catch (e) { clearTimeout(timer); return plain(ac.signal.aborted ? 504 : 502, ac.signal.aborted ? 'backend timeout' : 'backend unavailable'); }
  clearTimeout(timer);

  const out = new Headers();
  for (const [k, v] of up.headers) if (!DROP_RES.has(k.toLowerCase()) && k.toLowerCase() !== 'set-cookie') out.append(k, v);
  const cookies = typeof up.headers.getSetCookie === 'function' ? up.headers.getSetCookie() : (up.headers.get('set-cookie') ? [up.headers.get('set-cookie')] : []);
  for (const c of cookies) out.append('set-cookie', c);
  out.set('cache-control', 'no-store, no-transform');
  out.set('x-robots-tag', 'noindex, nofollow');
  return new Response(request.method === 'HEAD' ? null : up.body, { status: up.status, headers: out });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hosts = typeof env.SEG_HOSTS === 'string' && env.SEG_HOSTS ? new Set(env.SEG_HOSTS.split(',')) : ADMIN_HOSTS;   // SEG_HOSTS — для локальных тестов
    if (isPublicApi(url.pathname) || isAdminProxied(url.pathname)) {
      if (!hosts.has(url.hostname)) return plain(404, 'not found');
      return proxy(request, env, url);
    }
    if (url.pathname.startsWith('/api/')) return plain(404, 'not found');
    return env.ASSETS.fetch(request);
  },
};
