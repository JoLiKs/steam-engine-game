// Клиент мультиплеера: WebSocket-соединение с авто-переподключением и вспомогательные чистые функции.
// Протокол и серверная часть описаны в MULTIPLAYER.md (backend/app/mp.py). Без DOM — тестируется в node с поддельным WebSocket.

export const DEFAULT_WS = 'wss://185-255-133-179.sslip.io/steam/ws';
/** Адрес сервера: вшивается при сборке (__SEG_WS_BASE__); в режиме ?debug можно подменить параметром ?ws= (локальные тесты). */
export function wsUrl(search = '', debug = false) {
  if (debug) { const o = new URLSearchParams(search).get('ws'); if (o && /^wss?:\/\/[\w.:-]+(\/[\w./-]*)?$/.test(o)) return o; }
  return (typeof __SEG_WS_BASE__ === 'string' && __SEG_WS_BASE__) ? __SEG_WS_BASE__ : DEFAULT_WS;
}

export const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
/** Код комнаты из ввода пользователя: регистр, пробелы и дефисы не важны (в алфавите кодов нет O/0/I/L/1 — их не перепутать). */
export function normalizeCode(raw) { return String(raw || '').toUpperCase().replace(/[\s-]/g, '').slice(0, 8); }
export function roomFromSearch(search) {
  const c = new URLSearchParams(search).get('room');
  return c && CODE_RE.test(c.toUpperCase()) ? c.toUpperCase() : '';
}
export function inviteLink(loc, code) { return `${loc.origin}${loc.pathname}?room=${encodeURIComponent(code)}`; }

export const EMOJI = { thumbs: '👍', fire: '🔥', scream: '😱', heart: '❤️', clap: '👏', cold: '🥶', steam: '💨', sos: '🆘' };
export const EMOJI_NAMES = { thumbs: 'Класс', fire: 'Жарко', scream: 'Ужас', heart: 'Сердце', clap: 'Аплодисменты', cold: 'Холодно', steam: 'Пар', sos: 'Помогите' };
export const ERR_TEXT = {
  no_such_room: 'Такой комнаты нет (или игра уже закончилась).', room_full: 'Комната заполнена.', already_started: 'Игра в этой комнате уже началась.',
  create_limit: 'Слишком много новых комнат подряд. Подождите несколько минут.', server_full: 'Сервер сейчас переполнен. Попробуйте позже.',
  need_players: 'Нужно минимум двое игроков в сети.', not_ready: 'Не все игроки готовы.', not_host: 'Начать игру может только хозяин комнаты.',
  rate_limit: 'Слишком часто. Помедленнее.', chat_rate: 'Не так быстро — чат раз в секунду.', bad_chat: 'Сообщение не отправлено (пустое или со ссылкой).',
  forbidden: 'Этим управляете не вы.', bad_value: 'Некорректное значение.', bad_json: 'Ошибка связи.', bad_message: 'Ошибка связи.', unknown: 'Неизвестная команда.',
  no_room: 'Вы не в комнате.', not_playing: 'Игра ещё не идёт.', bad_state: 'Сейчас так нельзя.',
};
export const errText = code => ERR_TEXT[code] || 'Что-то пошло не так (' + String(code).slice(0, 24) + ').';

/** Кому принадлежит клапан/лопата/утечки: из roles и списка игроков → подписи для интерфейса. */
export function ownership(roles, players) {
  const nick = pid => (players.find(p => p.pid === pid) || {}).nick || '?';
  const valve = [null, null, null, null]; let shovel = null, leaks = null;
  for (const [pid, r] of Object.entries(roles || {})) {
    for (const i of r.valves) valve[i] = pid;
    if (r.shovel) shovel = pid; if (r.leaks) leaks = pid;
  }
  return { valve: valve.map(p => p && { pid: p, nick: nick(p) }), shovel: shovel && { pid: shovel, nick: nick(shovel) }, leaks: leaks && { pid: leaks, nick: nick(leaks) } };
}
const DIST = ['Госпиталь', 'Кварталы', 'Завод', 'Фильтры'];
export function roleSummary(r) {
  if (!r) return '';
  const parts = r.valves.map(i => DIST[i]);
  if (r.shovel) parts.push('лопата'); if (r.leaks) parts.push('утечки');
  return parts.join(', ');
}

const BACKOFF = [0.5, 1, 2, 3, 5, 5, 8, 8, 10];
export class MpClient {
  /**
   * @param {{url: string, onMsg: (m: any) => void, onStatus?: (st: string, info?: any) => void, WS?: any, maxOfflineS?: number, setTimer?: Function, clearTimer?: Function}} o
   */
  constructor(o) {
    this.url = o.url; this.onMsg = o.onMsg; this.onStatus = o.onStatus || (() => {});
    this.WS = o.WS || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    this.maxOfflineS = o.maxOfflineS ?? 90;
    this.setTimer = o.setTimer || ((f, ms) => setTimeout(f, ms)); this.clearTimer = o.clearTimer || (t => clearTimeout(t));
    this.ws = null; this.status = 'idle'; this.session = null; this.wanted = false; this.attempt = 0; this.offlineSince = 0;
    this.retryT = null; this.pingT = null; this.openWaiters = [];
  }
  _set(st, info) { this.status = st; try { this.onStatus(st, info); } catch (e) { /* ignore */ } }
  /** Открыть соединение. Резолвится при открытии, отклоняется при первой же ошибке (дальше — автоповтор только при наличии сессии). */
  connect() {
    this.wanted = true;
    if (this.ws && (this.status === 'open' || this.status === 'connecting')) return this.status === 'open' ? Promise.resolve() : new Promise((res, rej) => this.openWaiters.push([res, rej]));
    return new Promise((res, rej) => { this.openWaiters.push([res, rej]); this._open(); });
  }
  _open() {
    if (!this.WS) { this._fail(new Error('WebSocket недоступен')); return; }
    this._set(this.attempt ? 'reconnecting' : 'connecting');
    let ws;
    try { ws = new this.WS(this.url); } catch (e) { this._fail(e); return; }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempt = 0; this.offlineSince = 0; this._set('open');
      this._startPing();
      if (this.session) this.send({ t: 'rejoin', code: this.session.code, pid: this.session.pid, secret: this.session.secret });
      const w = this.openWaiters; this.openWaiters = []; w.forEach(([res]) => res());
    };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m && typeof m.t === 'string') this.onMsg(m); };
    ws.onerror = () => { /* подробности браузер не даёт; закрытие придёт в onclose */ };
    ws.onclose = ev => { if (this.ws === ws) this._closed(ev); };
  }
  _startPing() { this.clearTimer(this.pingT); this.pingT = this.setTimer(() => { this.send({ t: 'ping' }); this._startPing(); }, 20000); }
  _closed(ev) {
    this.ws = null; this.clearTimer(this.pingT);
    const w = this.openWaiters; this.openWaiters = [];
    if (w.length && !this.session) { this._set('closed', { code: ev && ev.code }); w.forEach(([, rej]) => rej(new Error('connect failed'))); this.wanted = false; return; }
    if (!this.wanted) { this._set('closed', { code: ev && ev.code }); return; }
    const code = ev && ev.code;
    if (code === 1008 || code === 1009 || code === 4000) { this._set('closed', { code }); this.wanted = false; w.forEach(([, rej]) => rej(new Error('rejected'))); return; }
    if (!this.session) { this._set('closed', { code }); this.wanted = false; return; }
    this._retry();
  }
  _fail(e) { const w = this.openWaiters; this.openWaiters = []; this.wanted = false; this._set('closed', { error: String(e && e.message || e) }); w.forEach(([, rej]) => rej(e)); }
  _retry() {
    if (!this.offlineSince) this.offlineSince = Date.now();
    if (Date.now() - this.offlineSince > this.maxOfflineS * 1000) { this.wanted = false; this._set('lost'); return; }
    const d = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)] * 1000 * (0.8 + Math.random() * 0.4);
    this.attempt++; this._set('reconnecting', { in: d });
    this.retryT = this.setTimer(() => { if (this.wanted) this._open(); }, d);
  }
  send(obj) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return true; } return false; }
  setSession(s) { this.session = s; }
  close() { this.wanted = false; this.session = null; this.clearTimer(this.retryT); this.clearTimer(this.pingT); if (this.ws) { try { this.ws.close(1000); } catch (e) { /* ignore */ } } this.ws = null; this._set('closed', {}); }
}
