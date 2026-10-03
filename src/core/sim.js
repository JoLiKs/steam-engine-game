// @ts-check
// Чистая логика игры «Последний котёл». Никаких обращений к DOM/Canvas/Audio — всё детерминировано
// и тестируется в node. Один шаг = фиксированный dt (1/60 с).
import { NIGHTS, CARDS, CAP, TUTORIAL, TICKER, POP_START, COAL_MAX } from './data.js';
import { nextRand, randRange } from './rng.js';

export const P_GREEN = [40, 78];
export const P_VENT = 88;
export const P_DANGER = 96;
export const FIRE_COEF = 0.16;     // пара в секунду на единицу огня
export const FIRE_DECAY = 0.05;   // доля огня, сгорающая в секунду
export const SHOVEL_FIRE = 15;
export const SHOVEL_CD = 0.42;
export const BOILER_CAP = 3;       // инерция давления
export const IRON_TOLL = 40;
export const SMOKE_AVG = 30;
export const COLD_POP = 0.74;
export const SILENCE_POP = 0.50;

/** @typedef {ReturnType<typeof createState>} State  Состояние партии: единый изменяемый объект, целиком сериализуется в JSON. */

export function createState(seed = 1, opts = {}) {
  const s = {
    v: 1, rs: (seed >>> 0) || 1, seed: seed >>> 0,
    phase: 'night', night: 0, t: 0, clock: 0,
    P: 22, fire: 0, coal: 24, smog: 8, smogSum: 0, smogTime: 0,
    valves: [0, 0, 0, 0], sat: [1, 1, 1, 1], flow: [0, 0, 0, 0], needNow: [0, 0, 0, 0],
    pop: POP_START, lostHosp: 0, lostCold: 0, lostSmog: 0, nightLost: 0,
    fw: 10, burnouts: 0, burnT: 0, exhaustSec: 0, timkaShovels: 0, timkaCd: 0,
    leaks: [], leakTimer: 12, leakId: 1, leaksFixed: 0, leaksIgnored: 0,
    shovelCd: 0, danger: 0, venting: false, spills: 0, shovels: 0,
    flags: { timka: false, extend: false, brown: false, aid: false },
    choices: {}, card: null, ending: null, summary: null,
    tut: opts.skipTutorial ? null : { step: 0, active: true, done: false, shovels: 0 },
    tickerIdx: 0, evShown: {}, events: [], msgs: [], shake: 0,
    coalMade: 0, coalBurned: 0, nightStartCoal: 24, nightStartPop: POP_START, nightCoalMade: 0,
  };
  return s;
}

export function emit(s, type, data) { if (s.events.length < 200) s.events.push({ type, ...data }); }

export function nightCfg(s) { return NIGHTS[s.night]; }

function eventMult(s, d) {
  const N = NIGHTS[s.night]; let m = 1;
  for (const e of N.events) {
    if (e.d !== d) continue;
    if (s.t >= e.t0 && s.t <= e.t1) {
      const ramp = Math.min(1, (s.t - e.t0) / 2, (e.t1 - s.t) / 2);
      m = Math.max(m, 1 + (e.m - 1) * Math.max(0, ramp));
    }
  }
  return m;
}
export function needNow(s, d) {
  const N = NIGHTS[s.night];
  let n = N.need[d] * eventMult(s, d);
  if (d === 0) n *= 1 + s.smog / 300;
  return n;
}
export function activeEvent(s) {
  const N = NIGHTS[s.night];
  for (const e of N.events) if (s.t >= e.t0 && s.t <= e.t1) return e;
  return null;
}

// ---------------------------------------------------------------- команды игрока
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isValveIdx = i => Number.isInteger(i) && i >= 0 && i < 4;
/** Вентиль i (0..3) → v (0..1). Нечисловые/нефинитные значения и чужие индексы игнорируются (иначе NaN отравит всю симуляцию; важно для сетевого ввода). */
export function setValve(s, i, v) { if (isValveIdx(i) && isNum(v)) s.valves[i] = Math.max(0, Math.min(1, v)); }
/** @param {State} s */
export function adjustValve(s, i, dv) { if (isValveIdx(i) && isNum(dv)) setValve(s, i, Math.round((s.valves[i] + dv) * 100) / 100); }

/** @param {State} s */
export function shovel(s) {
  if (s.phase !== 'night') return false;
  if (s.shovelCd > 0) return false;
  if (s.coal < 1) { emit(s, 'nocoal', {}); s.shovelCd = 0.3; return false; }
  s.coal -= 1; s.coalBurned += 1; s.shovelCd = SHOVEL_CD; s.shovels++;
  if (s.tut && s.tut.active) s.tut.shovels++;
  if (s.fire > 85) {
    s.fire = Math.min(100, s.fire + 4); s.spills++;
    s.smog = Math.min(100, s.smog + 1.5);
    emit(s, 'spill', {});
  } else {
    s.fire = Math.min(100, s.fire + SHOVEL_FIRE);
    emit(s, 'shovel', { good: s.fire < 88 });
  }
  return true;
}

/** @param {State} s */
export function fixLeak(s, id) {
  if (id != null && !Number.isInteger(id)) return false;
  const idx = id == null ? (s.leaks.length ? 0 : -1) : s.leaks.findIndex(l => l.id === id);
  if (idx < 0) return false;
  const l = s.leaks.splice(idx, 1)[0];
  s.leaksFixed++;
  emit(s, 'fix', { pipe: l.pipe, id: l.id });
  return true;
}

export function spawnLeak(s, pipe) {
  if (s.leaks.length >= 3) return;
  if (pipe == null) pipe = Math.floor(nextRand(s) * 4);
  if (s.leaks.some(l => l.pipe === pipe)) return;
  const l = { id: s.leakId++, pipe, age: 0 };
  s.leaks.push(l);
  emit(s, 'leak', { pipe, id: l.id });
}

/** @param {State} s */
export function chooseCard(s, key) {
  if (s.phase !== 'card' || !s.card) return;
  const c = s.card;
  if (typeof key !== 'string' || !c.options.some(o => o.key === key)) return;   // неизвестный вариант (опечатка/сетевой ввод) не меняет состояние
  s.choices[c.id] = key;
  if (c.id === 'timka') {
    if (key === 'help') s.flags.timka = true; else s.coal = Math.max(0, s.coal - 6);
  } else if (c.id === 'shift') {
    if (key === 'extend') s.flags.extend = true;
  } else if (c.id === 'brown') {
    if (key === 'accept') { s.flags.brown = true; s.coal = Math.min(COAL_MAX, s.coal + 32); }
  } else if (c.id === 'sloboda') {
    if (key === 'aid') { s.flags.aid = true; s.coal = Math.max(0, s.coal - 18); }
  }
  emit(s, 'choice', { id: c.id, key });
  s.card = null;
  beginNight(s, s.night + 1);
}

export function beginNight(s, n) {
  s.night = n; s.t = 0; s.phase = 'night';
  s.nightLost = 0; s.tickerIdx = 0; s.evShown = {};
  s.smog *= 0.8; s.fw *= 0.55; s.burnT = 0;
  s.leaks = []; s.leakTimer = NIGHTS[n].leakEvery ? NIGHTS[n].leakEvery * 0.6 : 99;
  s.danger = 0; s.nightStartPop = s.pop; s.nightStartCoal = s.coal;
  s.nightCoalMade = s.coalMade;
  emit(s, 'night', { n });
}

/** @param {State} s */
export function continueSummary(s) {
  if (s.phase !== 'summary') return;
  const c = CARDS[s.night + 1];
  if (s.night + 1 >= NIGHTS.length) { finish(s, computeEnding(s)); return; }
  if (c) { s.card = c; s.phase = 'card'; }
  else beginNight(s, s.night + 1);
}

// ---------------------------------------------------------------- итоги
export function toll(s) {
  return s.exhaustSec * 0.5 + s.burnouts * 15 + s.timkaShovels * 0.6 + (s.flags.extend ? 8 : 0);
}
export function smogAvg(s) { return s.smogTime > 0 ? s.smogSum / s.smogTime : 0; }

/** @param {State} s */
export function computeEnding(s) {
  const pop = s.pop / POP_START;
  if (pop < COLD_POP) return 'cold';
  const tollR = toll(s) / IRON_TOLL, smogR = smogAvg(s) / SMOKE_AVG;
  if (tollR >= 1 || smogR >= 1) return tollR >= smogR ? 'iron' : 'smoke';
  return 'light';
}

function finish(s, id) {
  s.ending = id; s.phase = 'ended';
  emit(s, 'ending', { id });
}

// ---------------------------------------------------------------- основной шаг
/** @param {State} s */
export function step(s, dt) {
  s.clock += dt;
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.2);
  if (s.phase !== 'night') return;
  const N = NIGHTS[s.night];
  const tutorial = !!(s.tut && s.tut.active);
  const timerRuns = !tutorial;
  s.shovelCd = Math.max(0, s.shovelCd - dt);

  if (timerRuns) s.t += dt;
  // потребности
  for (let i = 0; i < 4; i++) s.needNow[i] = needNow(s, i);
  // события-баннеры
  for (let k = 0; k < N.events.length; k++) {
    const e = N.events[k];
    if (!s.evShown[k] && s.t >= e.t0) { s.evShown[k] = true; emit(s, 'event', { label: e.label, d: e.d }); }
  }
  const tk = TICKER[s.night];
  if (tk && s.tickerIdx < tk.length && s.t >= tk[s.tickerIdx].t) { emit(s, 'talk', tk[s.tickerIdx]); s.tickerIdx++; }

  // помощник
  if (s.flags.timka && s.fire < 22 && s.timkaCd <= 0 && s.coal >= 1) {
    s.coal -= 1; s.coalBurned += 1; s.fire += 13; s.timkaShovels++; s.timkaCd = 2.0;
    emit(s, 'timka', {});
  }
  s.timkaCd = Math.max(0, s.timkaCd - dt);

  // утечки
  for (const l of s.leaks) l.age += dt;
  let leakLoss = 0;
  for (const l of s.leaks) leakLoss += 1.6 + Math.min(l.age, 12) * 0.1;
  if (N.leakEvery && !tutorial) {
    s.leakTimer -= dt;
    if (s.leakTimer <= 0) { spawnLeak(s); s.leakTimer = N.leakEvery * randRange(s, 0.75, 1.25); }
  }

  // огонь и пар
  s.fire = Math.max(0, s.fire - s.fire * FIRE_DECAY * dt);
  if (s.fire < 0.05) s.fire = 0;
  const gen = FIRE_COEF * s.fire;
  const pf = Math.max(0, Math.min(1, s.P / 30));
  s.burnT = Math.max(0, s.burnT - dt);
  let totalFlow = 0;
  for (let i = 0; i < 4; i++) {
    let open = s.valves[i];
    if (i === 2 && s.burnT > 0) open = 0;
    s.flow[i] = open * CAP[i] * pf;
    totalFlow += s.flow[i];
  }
  s.venting = s.P > P_VENT;
  const vent = s.venting ? 2 + (s.P - P_VENT) * 0.8 : 0;
  if (s.venting && Math.floor(s.clock * 6) !== Math.floor((s.clock - dt) * 6)) emit(s, 'vent', {});
  s.P += (gen - totalFlow - leakLoss - vent - 0.012 * s.P) / BOILER_CAP * dt;
  s.P = Math.max(0, Math.min(100, s.P));
  if (s.P >= P_DANGER) s.danger += dt; else s.danger = Math.max(0, s.danger - dt * 0.8);
  if (s.danger >= 2.5) { s.shake = 1; finish(s, 'boom'); return; }

  // удовлетворение районов
  for (let i = 0; i < 4; i++) {
    const tgt = Math.min(1, s.flow[i] / s.needNow[i]);
    s.sat[i] += (tgt - s.sat[i]) * Math.min(1, dt * 1.2);
  }

  // дым
  const smogMul = s.flags.brown ? 1.6 : 1;
  s.smog += (s.fire * 0.016 * smogMul - s.flow[3] * 0.55 - 0.012 * s.smog) * dt;
  s.smog = Math.max(0, Math.min(100, s.smog));
  if (timerRuns) { s.smogSum += s.smog * dt; s.smogTime += dt; }

  // усталость рабочих
  const shiftM = s.flags.extend ? 1.4 : 1;
  const ratio = s.flow[2] / s.needNow[2];
  if (s.burnT > 0) s.fw = Math.max(0, s.fw - 1.2 * dt);
  else if (ratio < 0.15) s.fw = Math.max(0, s.fw - 2.2 * dt);
  else s.fw = Math.min(100, s.fw + (ratio * 1.4 * shiftM - 0.5) * dt);
  if (s.fw >= 100) { s.burnouts++; s.burnT = 8; s.fw = 65; s.shake = Math.max(s.shake, 0.5); emit(s, 'collapse', {}); }
  if (s.fw >= 75 && timerRuns) s.exhaustSec += dt;
  // уголь с завода
  const eff = 1 - 0.6 * Math.max(0, (s.fw - 50) / 50);
  const made = s.flow[2] * 0.08 * eff * (s.flags.extend ? 1.35 : 1) * dt;
  s.coal = Math.min(COAL_MAX, s.coal + made); s.coalMade += made;

  // потери населения (не в обучении)
  if (!tutorial) {
    let r0 = Math.max(0, 0.75 - s.sat[0]) * 2.2;
    let r1 = Math.max(0, 0.6 - s.sat[1]) * 2.0 * (s.flags.aid ? 0.5 : 1);
    let r2 = Math.max(0, s.smog - 65) * 0.03;
    s.lostHosp += r0 * dt; s.lostCold += r1 * dt; s.lostSmog += r2 * dt;
    const lost = (r0 + r1 + r2) * dt;
    const before = Math.floor(s.pop);
    s.pop = Math.max(0, s.pop - lost); s.nightLost += lost;
    if (Math.floor(s.pop) < before) emit(s, 'loss', { d: r0 >= r1 ? 0 : 1 });
    if (s.pop / POP_START < SILENCE_POP) { finish(s, 'silence'); return; }
  }

  // обучение
  if (tutorial) tutorialStep(s);

  // конец ночи
  if (!tutorial && s.t >= N.dur) endNight(s);
}

function tutorialStep(s) {
  const T = s.tut, id = TUTORIAL[T.step].id;
  const mark = d => Math.min(1, s.needNow[d] / CAP[d]);
  let ok = false;
  if (id === 'shovel') ok = T.shovels >= 1;
  else if (id === 'pressure') ok = s.P >= 42;
  else if (id === 'hosp') ok = s.valves[0] >= mark(0) - 0.04 && s.valves[0] <= mark(0) + 0.3;
  else if (id === 'home') ok = s.valves[1] >= mark(1) - 0.04 && s.valves[1] <= mark(1) + 0.3;
  else if (id === 'fact') ok = s.valves[2] >= mark(2) - 0.04 && s.valves[2] <= mark(2) + 0.3;
  else if (id === 'scrub') ok = s.valves[3] >= mark(3) - 0.04 && s.valves[3] <= mark(3) + 0.3;
  else if (id === 'leak') {
    if (!T.leakSpawned) { spawnLeak(s, 1); T.leakSpawned = true; }
    ok = T.leakSpawned && s.leaks.length === 0;
  }
  if (ok) {
    T.step++; T.at = s.clock; emit(s, 'tutstep', { step: T.step });
    if (T.step >= TUTORIAL.length - 1) { T.active = false; T.done = true; s.coal = Math.max(s.coal, 22); }
  }
}

function endNight(s) {
  const N = NIGHTS[s.night];
  s.summary = {
    night: s.night, name: N.name,
    lost: Math.round(s.nightLost), pop: Math.floor(s.pop),
    coalDelta: Math.round(s.coal - s.nightStartCoal),
    smog: Math.round(s.smog), fw: Math.round(s.fw), burnouts: s.burnouts,
    leaks: s.leaksFixed,
  };
  s.phase = 'summary';
  emit(s, 'nightend', {});
}

// ---------------------------------------------------------------- сохранение
/** @param {State} s */
export function serialize(s) {
  const { events, msgs, ...rest } = s;
  return JSON.stringify(rest);
}
export function deserialize(str) {
  const o = JSON.parse(str);
  o.events = []; o.msgs = [];
  return o;
}
