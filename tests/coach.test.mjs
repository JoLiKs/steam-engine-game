// Логика триггера подсказок: только серия нелогичных действий, кулдауны, лимиты, отсутствие спама.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Coach, COACH } from '../src/coach.js';
import { createState } from '../src/sim.js';
import { CAP } from '../src/data.js';

function mk(over = {}) {
  const s = createState(7, { skipTutorial: true });
  s.phase = 'night'; s.night = 3; s.clock = 100; s.P = 55; s.fire = 50; s.coal = 20;
  s.needNow = [3, 4, 3, 1.5]; s.sat = [1, 1, 1, 1]; s.valves = [0.5, 0.5, 0.5, 0.5];
  return Object.assign(s, over);
}
const mark = (s, i) => Math.min(1, s.needNow[i] / CAP[i]);
// «время идёт» dt-шагами; fn(s, tick) вызывается каждый шаг
function run(co, s, sec, fn, dt = 0.1) {
  const hints = [];
  for (let k = 0; k < Math.round(sec / dt); k++) { s.clock += dt; if (fn) fn(s, k); const h = co.update(s, dt); if (h) hints.push({ ...h, at: s.clock }); }
  return hints;
}
// игрок «закрывает» голодающий вентиль
function closeStarving(s, i, from = mark(s, i) - 0.2) { s.valves[i] = from; s.sat[i] = 0.5; }

test('без нелогичных действий подсказок нет вообще', () => {
  const co = new Coach(), s = mk();
  assert.equal(run(co, s, 300).length, 0);
});

test('один-два промаха подряд — подсказки нет', () => {
  const co = new Coach(), s = mk();
  co.update(s, 0.1);
  co.bad(s.clock, 'valve_close', 0); co.bad(s.clock + 1, 'shovel_waste');
  assert.equal(run(co, s, 30).length, 0);
});

test('три нелогичных действия за 20 с → одна подсказка, не спам', () => {
  const co = new Coach(), s = mk();
  co.update(s, 0.1);
  const hints = [];
  for (let k = 0; k < 6; k++) { s.clock += 2; co.bad(s.clock, 'valve_close', 1); const h = co.update(s, 0.1); if (h) hints.push(h); }
  assert.equal(hints.length, 1, 'ровно одна подсказка из шести промахов подряд');
  assert.equal(hints[0].cat, 'valve_close'); assert.equal(hints[0].ring, 'v1'); assert.match(hints[0].text, /Кварталов/);
});

test('промахи, разнесённые больше чем на окно 20 с, серию не дают', () => {
  const co = new Coach(), s = mk(); co.update(s, 0.1);
  let n = 0;
  for (let k = 0; k < 8; k++) { s.clock += 12; co.bad(s.clock, 'shovel_waste'); if (co.update(s, 0.1)) n++; }
  assert.equal(n, 0, 'два промаха за 20 с максимум → порога нет');
});

test('разумное действие обнуляет серию', () => {
  const co = new Coach(), s = mk(); co.update(s, 0.1);
  co.bad(s.clock, 'valve_close', 0); co.bad(s.clock, 'valve_close', 0);
  co.onEvent({ type: 'fix' }, s);                       // заделал утечку — молодец
  co.bad(s.clock, 'valve_close', 0);
  assert.equal(run(co, s, 5).length, 0);
});

test('кулдаун: после подсказки новая — не раньше COOLDOWN, и не больше PER_NIGHT за ночь', () => {
  const co = new Coach({ CAT_COOLDOWN: 0 }), s = mk(); co.update(s, 0.1);
  const times = [];
  for (let k = 0; k < 400; k++) { s.clock += 1; co.bad(s.clock, 'valve_close', 2); const h = co.update(s, 0.1); if (h) times.push(s.clock); }
  assert.ok(times.length <= COACH.PER_NIGHT, 'лимит на ночь: ' + times.length);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= COACH.COOLDOWN, 'интервал ' + (times[i] - times[i - 1]));
  // новая ночь — лимит обнуляется
  s.night = 4; s.clock += 100; for (let k = 0; k < 6; k++) { s.clock += 1; co.bad(s.clock, 'valve_close', 2); co.update(s, 0.1); }
  assert.ok(co.shown > times.length, 'на новой ночи подсказки снова возможны');
});

test('кулдаун категории: та же ошибка не повторяется 90 с, другая — можно', () => {
  const co = new Coach({ COOLDOWN: 10, PER_NIGHT: 9 }), s = mk(); co.update(s, 0.1);
  const burst = (cat, i) => { let r = null; for (let k = 0; k < 4; k++) { s.clock += 1; co.bad(s.clock, cat, i); r = co.update(s, 0.1) || r; } return r; };
  assert.ok(burst('valve_close', 0));
  s.clock += 20; assert.equal(burst('valve_close', 0), null, 'та же категория на кулдауне');
  s.clock += 20; assert.ok(burst('shovel_waste', 0), 'другая категория — подсказка есть');
});

test('вентиль голодающего района закрывают дальше → valve_close; открывают перебравший → valve_open', () => {
  const co = new Coach({ COOLDOWN: 0 }), s = mk(); co.update(s, 0.1);
  const m = mark(s, 0);
  let hints = [];
  // три раза подряд закрываем голодающий вентиль (каждый раз заметный сдвиг вниз)
  s.sat[0] = 0.4; let v = Math.max(0.06, m - 0.05);
  for (let k = 0; k < 4; k++) { s.valves[0] = v; s.clock += 0.4; co.update(s, 0.1); v = Math.max(0, v - 0.045); s.valves[0] = v; s.clock += 0.4; const h = co.update(s, 0.1); if (h) hints.push(h); }
  assert.ok(co.streak.length >= 1 || hints.length >= 1, 'шаги по закрытию голодного вентиля засчитаны');
  const co2 = new Coach(), s2 = mk(); co2.update(s2, 0.1);
  let w = mark(s2, 1) + 0.25; s2.valves[1] = w; co2.update(s2, 0.1);
  let got = null;
  for (let k = 0; k < 8 && !got; k++) { s2.clock += 0.35; w = Math.min(1, w + 0.05); s2.valves[1] = w; got = co2.update(s2, 0.1); }
  assert.ok(got && got.cat === 'valve_open', 'открывают уже перебравший вентиль → valve_open: ' + JSON.stringify(got));
});

test('движение вентиля к нужной отметке — «хорошее»: серию не копит', () => {
  const co = new Coach(), s = mk(); co.update(s, 0.1);
  s.valves[0] = 0.0; s.sat[0] = 0.4; const m = mark(s, 0);
  const hints = run(co, s, 12, (st, k) => { st.valves[0] = Math.min(m, st.valves[0] + 0.03); });
  assert.equal(hints.length, 0); assert.equal(co.streak.length, 0);
});

test('игнор критического давления: ≥ 90 держится → подсказка p_high примерно через 18 с (3 периода по 6 с)', () => {
  const co = new Coach(), s = mk({ P: 94 });
  const hints = run(co, s, 40);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].cat, 'p_high'); assert.ok(hints[0].at - 100 >= 17 && hints[0].at - 100 < 22, 'через ' + (hints[0].at - 100));
  assert.equal(hints[0].ring, 'gauge');
});

test('зелёное давление — тишина; игнор утечки ≈ 21 с → подсказка про утечку', () => {
  const co = new Coach(), s = mk();
  assert.equal(run(co, s, 120).length, 0);
  const co2 = new Coach(), s2 = mk({ leaks: [{ id: 1, pipe: 0, age: 0 }] });
  const h = run(co2, s2, 60);
  assert.equal(h.length, 1); assert.equal(h[0].cat, 'leak');
});

test('уголь высыпается: 3 «переполнения» подряд → подсказка про топку; хорошее подбрасывание сбрасывает серию', () => {
  const co = new Coach(), s = mk({ fire: 95 }); co.update(s, 0.1);
  let hint = null;
  for (let k = 0; k < 3; k++) { s.clock += 3; co.onEvent({ type: 'shovel', good: false }, s); hint = co.update(s, 0.1) || hint; }
  assert.ok(hint && hint.cat === 'shovel_waste');
  const co2 = new Coach(), s2 = mk({ fire: 30 }); co2.update(s2, 0.1);
  co2.onEvent({ type: 'spill' }, s2); co2.onEvent({ type: 'spill' }, s2); co2.onEvent({ type: 'shovel', good: true }, s2);
  assert.equal(co2.streak.length, 0);
});

test('обучение: подсказка шага только если игрок застрял ≥ 25 с; иначе молчим', () => {
  const co = new Coach(), s = createState(3, {}); s.phase = 'night'; s.night = 0; s.clock = 0; s.needNow = [3, 4, 3, 1.5];
  assert.equal(run(co, s, 20).length, 0, 'первые 20 с — тишина');
  const hs = run(co, s, 10);
  assert.equal(hs.length, 1); assert.equal(hs[0].cat, 'stall'); assert.equal(hs[0].ring, 'shovel'); assert.match(hs[0].text, /уголь/i);
  assert.equal(run(co, s, 30).length, 0, 'кулдаун: следующая — не раньше чем через 40 с');
  s.tut.step = 2; // игрок продвинулся → таймер шага сбрасывается
  assert.equal(run(co, s, 20).length, 0);
});

test('кольцо-подсветка живёт RING секунд и гаснет', () => {
  const co = new Coach(), s = mk({ P: 95 }); run(co, s, 25);
  assert.equal(co.ring(s.clock), 'gauge'); assert.equal(co.ring(s.clock + COACH.RING + 1), null);
});

import { step } from '../src/sim.js';
import { botAct } from '../src/bot.js';
function hintsFor(skill, seed) {
  const s = createState(seed, {}), co = new Coach(); let g = 0, n = 0;
  while (s.phase !== 'ended' && g++ < 60 * 60 * 30) {
    botAct(s, skill, { react: 0.5 }); step(s, 1 / 60);
    for (const e of s.events) co.onEvent(e, s); s.events.length = 0;
    if (s.phase === 'night' && co.update(s, 1 / 60)) n++;
  }
  return n;
}
test('на полной игре: аккуратный бот — 0 подсказок (нет ложных срабатываний), небрежный — получает, но ≤ 3 за ночь', () => {
  for (const seed of [1, 2, 3, 4, 5]) { assert.equal(hintsFor('good', seed), 0, 'good seed ' + seed); assert.equal(hintsFor('ok', seed), 0, 'ok seed ' + seed); }
  const bad = hintsFor('bad', 1); assert.ok(bad >= 1 && bad <= 3 * 10, 'bad: ' + bad);
});
