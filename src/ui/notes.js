// «Заметка механика»: когда и в какой ситуации игра просит у сервера короткую заметку (её пишет ИИ на бэкенде или берётся запасной текст).
// Чистая логика без DOM/сети: время накапливается из dt, поэтому тестируется детерминированно. Ники и любой текст игрока наружу не уходят —
// серверу передаётся только код ситуации из белого списка и номер ночи.
import { P_GREEN } from '../core/sim.js';

export const NOTES = {
  FIRST: 45,              // не раньше чем через 45 с после начала ночи
  QUIET_HINT: 15,         // тишина после подсказки тренера
  QUIET_ALARM: 12,        // и после аварийных событий (утечка, падение, сброс)
  DEFAULT_GAP: 150, MIN_GAP: 60, MAX_GAP: 900,   // интервал между заметками (сервер может задать свой через next_s)
  PER_NIGHT: 3, MAX_PER_NIGHT: 6,
  RETRY: 60,              // после ошибки сети/лимита — не раньше чем через минуту
  SHOW: 14,               // сколько секунд заметка висит в панели
  FAILS_OFF: 4,           // после стольких сбоев подряд до конца ночи не спрашиваем
};
export const SITUATION_CODES = ['calm', 'pressure_high', 'pressure_low', 'coal_low', 'smog_high', 'leak', 'pop_loss', 'night_start', 'collapse'];

// кризис — не время для заметок
export function isCrisis(s) {
  return s.leaks.length > 0 || s.P >= 85 || (s.P < 12 && s.fire < 25) || s.danger > 0 || s.burnT > 0 || s.venting;
}

export class Notes {
  constructor(opts = {}) { this.o = { ...NOTES, ...opts }; this.reset(); }
  reset() {
    this.t = 0; this.night = -1; this.nightT = 0; this.count = 0; this.nextAt = 0; this.busy = false; this.enabled = true;
    this.gap = this.o.DEFAULT_GAP; this.perNight = this.o.PER_NIGHT; this.fails = 0;
    this.lastHint = -1e9; this.lastAlarm = -1e9; this.ev = {}; this.shown = 0; this.token = 0;
  }
  noteHint() { this.lastHint = this.t; }
  onEvent(e) {
    const t = this.t;
    if (e.type === 'leak' || e.type === 'spill' || e.type === 'collapse' || e.type === 'vent') this.lastAlarm = t;
    if (e.type === 'fix') this.ev.leak = t;
    if (e.type === 'collapse') this.ev.collapse = t;
    if (e.type === 'loss') this.ev.loss = t;
    if (e.type === 'vent') this.ev.vent = t;
  }
  // Какую ситуацию описать (null — сейчас не время).
  situation(s) {
    if (isCrisis(s)) return null;
    const t = this.t, recent = (k, w) => this.ev[k] != null && t - this.ev[k] <= w;
    if (recent('collapse', 60)) return 'collapse';
    if (recent('loss', 40)) return 'pop_loss';
    if (recent('vent', 40) || s.P > P_GREEN[1]) return 'pressure_high';
    if (recent('leak', 30)) return 'leak';
    if (s.coal < 18) return 'coal_low';
    if (s.smog > 60) return 'smog_high';
    if (this.nightT < 100) return 'night_start';
    return 'calm';
  }
  // Вызывать каждый шаг в фазе «ночь». Возвращает {s: ситуация, n: ночь} если пора запросить заметку, иначе null.
  update(s, dt) {
    if (s.phase !== 'night') return null;
    if (s.night !== this.night) { this.night = s.night; this.nightT = 0; this.count = 0; this.fails = 0; this.nextAt = Math.max(this.nextAt, this.t + this.o.FIRST); }
    this.t += dt; this.nightT += dt;
    if (!this.enabled || this.busy || this.count >= this.perNight || this.fails >= this.o.FAILS_OFF) return null;
    if (s.tut && s.tut.active) return null;
    if (this.nightT < this.o.FIRST || this.t < this.nextAt) return null;
    if (this.t - this.lastHint < this.o.QUIET_HINT || this.t - this.lastAlarm < this.o.QUIET_ALARM) return null;
    const sit = this.situation(s); if (!sit) return null;
    this.busy = true; this.token++;
    return { s: sit, n: Math.max(1, Math.min(10, (s.night | 0) + 1)), token: this.token };
  }
  // Ответ сервера (r — результат net.call). Возвращает текст для показа или null.
  accept(r, req, s) {
    if (!req || req.token !== this.token) return null;
    this.busy = false;
    const d = r && r.ok && r.data;
    if (!d || typeof d !== 'object') { this.fails++; this.nextAt = this.t + this.o.RETRY; return null; }
    if (d.enabled === false) { this.enabled = false; return null; }
    this.fails = 0;
    const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
    this.gap = num(d.next_s, this.o.MIN_GAP, this.o.MAX_GAP, this.o.DEFAULT_GAP);
    this.perNight = Math.round(num(d.per_night, 1, this.o.MAX_PER_NIGHT, this.o.PER_NIGHT));
    const text = typeof d.note === 'string' ? d.note.trim() : '';
    if (!text || text.length > 300) { this.nextAt = this.t + (num(d.retry_s, 10, 300, this.o.RETRY)); return null; }
    if (s && (s.phase !== 'night' || isCrisis(s) || this.t - this.lastHint < 5)) { this.nextAt = this.t + 20; return null; }   // пока ждали, началась беда — не показываем
    this.count++; this.shown++; this.nextAt = this.t + this.gap;
    return text;
  }
  fail() { this.busy = false; this.fails++; this.nextAt = this.t + this.o.RETRY; }
}
