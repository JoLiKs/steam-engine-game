// Проверка структуры сохранения (localStorage можно править руками, версии бывают разные): испорченное сохранение не должно ронять игру.
import { NIGHTS } from './data.js';

const num = (v, lo = -Infinity, hi = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const arr4 = (a, lo, hi) => Array.isArray(a) && a.length === 4 && a.every(v => num(v, lo, hi));
const PHASES = ['night', 'summary', 'card', 'ended'];

/** Возвращает объект состояния, если он выглядит целым и безопасным, иначе null. */
export function validateSave(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== 1) return null;
  if (!PHASES.includes(o.phase)) return null;
  if (!Number.isInteger(o.night) || o.night < 0 || o.night >= NIGHTS.length) return null;
  if (!Number.isInteger(o.rs) || o.rs < 0 || o.rs > 4294967295) return null;
  for (const [k, lo, hi] of [['t', 0, 1e5], ['clock', 0, 1e7], ['P', 0, 100], ['fire', 0, 200], ['coal', 0, 99], ['smog', 0, 100], ['pop', 0, 1000], ['fw', 0, 100], ['danger', 0, 100], ['shovelCd', 0, 100], ['burnT', 0, 100], ['burnouts', 0, 1000]]) if (!num(o[k], lo, hi)) return null;
  if (!arr4(o.valves, 0, 1) || !arr4(o.sat, 0, 1.0001) || !arr4(o.flow, 0, 1e4) || !arr4(o.needNow, 0, 1e4)) return null;
  if (!Array.isArray(o.leaks) || o.leaks.length > 3 || !o.leaks.every(l => l && Number.isInteger(l.pipe) && l.pipe >= 0 && l.pipe < 4 && num(l.age, 0, 1e5) && Number.isInteger(l.id))) return null;
  if (!o.flags || typeof o.flags !== 'object' || Array.isArray(o.flags)) return null;
  if (!o.choices || typeof o.choices !== 'object' || Array.isArray(o.choices)) return null;
  if (o.phase === 'card' && !(o.card && typeof o.card === 'object' && Array.isArray(o.card.options) && o.card.options.length > 0 && typeof o.card.id === 'string')) return null;
  if (o.phase === 'summary' && !(o.summary && typeof o.summary === 'object')) return null;
  if (o.phase === 'ended' && typeof o.ending !== 'string') return null;
  if (o.events === undefined) o.events = [];
  if (o.msgs === undefined) o.msgs = [];
  return o;
}

/** Строка из localStorage → состояние или null (никогда не бросает исключений). */
export function loadSaved(str) {
  if (typeof str !== 'string' || str.length > 200000) return null;
  try { const o = JSON.parse(str); if (o && typeof o === 'object') { o.events = []; o.msgs = []; } return validateSave(o); } catch (e) { return null; }
}
