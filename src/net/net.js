// Сеть: рейтинг и анонимная статистика. Все вызовы безопасны офлайн: ошибка/таймаут → null, игра продолжает работать.
// Запросы идут на тот же origin (/api/g/*): Cloudflare Pages Worker проксирует их на бэкенд.
// База API: на pages.dev — тот же origin (/api/g, проксирует Worker); на github.io Worker нет, поэтому при сборке (SEG_API_BASE) вшивается полный адрес бэкенда.
const BASE = (typeof __SEG_API_BASE__ === 'string' && __SEG_API_BASE__) ? __SEG_API_BASE__.replace(/\/+$/, '') : '/api/g';
export const TIMEOUT = 3000;   // жёсткий предел на любой запрос к бэкенду: игра не ждёт сеть дольше 3 с

// Всегда завершается за ≤ TIMEOUT мс: и по AbortController, и по «гонке» с таймером (на случай браузеров, где fetch не реагирует на abort).
export function call(path, body, opts = {}) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const limit = Math.min(opts.timeout || TIMEOUT, opts.cap || TIMEOUT);   // opts.cap — только для редких долгих запросов (разбор партии ИИ)
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = 0;
  const deadline = new Promise(res => { timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) { /* */ } res(null); }, limit); });
  const req = (async () => {
    try {
      const r = await fetch(BASE + path, {
        method: body === undefined ? 'GET' : 'POST', signal: ctl ? ctl.signal : undefined, cache: 'no-store', credentials: 'omit', keepalive: !!opts.keepalive,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
      });
      let j = null; try { j = await r.json(); } catch (e) { /* не JSON */ }
      return { ok: r.ok, status: r.status, data: j };
    } catch (e) { return null; }
  })();
  return Promise.race([req, deadline]).then(v => { clearTimeout(timer); return v; }, () => { clearTimeout(timer); return null; });
}

// краткие сведения об устройстве (без точных версий и идентификаторов)
export function deviceInfo(nav = (typeof navigator !== 'undefined' ? navigator : {}), scr = (typeof screen !== 'undefined' ? screen : {}), win = (typeof window !== 'undefined' ? window : {})) {
  const ua = nav.userAgent || '';
  const platform = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && nav.maxTouchPoints > 1) ? 'ios' : /Windows/i.test(ua) ? 'windows' : /Macintosh|Mac OS/i.test(ua) ? 'mac' : /Linux|X11|CrOS/i.test(ua) ? 'linux' : 'other';
  const m = ua.match(/(Edg|OPR|Firefox|FxiOS|CriOS|SamsungBrowser|Chrome|Version)\/(\d+)/);
  const names = { Edg: 'Edge', OPR: 'Opera', FxiOS: 'Firefox', CriOS: 'Chrome', Version: 'Safari' };
  const browser = m ? `${names[m[1]] || m[1]}/${m[2]}` : (/Safari/.test(ua) ? 'Safari' : 'other');
  const sw = Math.round(win.innerWidth || scr.width || 0), sh = Math.round(win.innerHeight || scr.height || 0);
  return { platform, sw, sh, touch: !!(nav.maxTouchPoints > 0), ua: `${browser} ${platform}` };
}

// Прохождение: билет с сервера + отправка событий. enabled() — переключатель «анонимная статистика».
export class Run {
  constructor(enabled) { this.enabled = enabled; this.token = null; this.sent = 0; this.pending = null; }
  async begin() {
    this.token = null;
    this.pending = call('/run', {}).then(r => { this.token = r && r.ok && r.data && r.data.token ? r.data.token : null; return this.token; });
    return this.pending;
  }
  get online() { return !!this.token; }
  async event(type, data) {
    if (!this.enabled() ) return false;
    if (this.pending) await this.pending;
    if (!this.token) return false;
    const r = await call('/event', { token: this.token, type, data }, { keepalive: true });
    if (r && r.ok) { this.sent++; return true; }
    return false;
  }
  async submitDaily(result, nick, pid, day) {
    if (this.pending) await this.pending;
    if (!this.token) return null;
    return call('/daily/score', { token: this.token, pid, nick, day, ...result });
  }
  async submit(result, nick, pid) {
    if (this.pending) await this.pending;
    if (!this.token) return null;
    return call('/score', { token: this.token, pid, nick, ...result });
  }
}

export async function fetchBoard(board) {
  const r = await call('/leaderboard?board=' + encodeURIComponent(board) + '&limit=20');
  return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data.entries : null;
}

export function randomId() {
  const a = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < a.length; i++) a[i] = Math.random() * 256;
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Испытание дня: { day, seed, quest:{id,title,goal_text,text,src} } или null. */
export async function fetchDaily() {
  const r = await call('/daily');
  return r && r.ok && r.data && typeof r.data.seed === 'number' && r.data.quest ? r.data : null;
}
export async function fetchDailyBoard(day, pid) {
  const r = await call('/daily/board?limit=20' + (day ? '&day=' + encodeURIComponent(day) : '') + (pid ? '&pid=' + encodeURIComponent(pid) : ''));
  return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data : null;
}
export async function fetchSeason(pid) {
  const r = await call('/leaderboard?board=season&limit=20' + (pid ? '&pid=' + encodeURIComponent(pid) : ''));
  return r && r.ok && r.data && Array.isArray(r.data.entries) ? r.data : null;
}
/** Разбор партии: 3–4 предложения. Ждёт до 12 с; любой сбой/выключенный ИИ → null (тогда экран просто без разбора). */
export async function fetchReview(agg) {
  const r = await call('/review', agg, { cap: 12000, timeout: 12000 });
  return r && r.ok && r.data && r.data.enabled && typeof r.data.text === 'string' ? { text: r.data.text, src: r.data.src } : null;
}
