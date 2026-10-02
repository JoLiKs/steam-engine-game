// Сеть: рейтинг и анонимная статистика. Все вызовы безопасны офлайн: ошибка/таймаут → null, игра продолжает работать.
// Запросы идут на тот же origin (/api/g/*): Cloudflare Pages Worker проксирует их на бэкенд.
const BASE = '/api/g';
const TIMEOUT = 5000;

export async function call(path, body, opts = {}) {
  if (typeof fetch !== 'function') return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeout || TIMEOUT) : 0;
  try {
    const r = await fetch(BASE + path, {
      method: body === undefined ? 'GET' : 'POST', signal: ctl ? ctl.signal : undefined, cache: 'no-store', credentials: 'omit', keepalive: !!opts.keepalive,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    let j = null; try { j = await r.json(); } catch (e) { /* не JSON */ }
    return { ok: r.ok, status: r.status, data: j };
  } catch (e) { return null; } finally { if (timer) clearTimeout(timer); }
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
