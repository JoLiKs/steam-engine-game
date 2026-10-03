// Тесты по найденным в аудите (AUDIT.md) проблемам ядра и клиента: каждый тест сначала падал, затем появилось исправление.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, setValve, adjustValve, chooseCard, fixLeak, shovel, serialize, deserialize, continueSummary } from '../src/core/sim.js';
import { validateSave } from '../src/core/validate.js';
import { shouldIgnoreKey } from '../src/ui/keys.js';
import { botAct } from '../src/core/bot.js';
import { makeRng } from '../src/core/rng.js';

const finiteState = s => {
  for (const k of ['P', 'fire', 'coal', 'smog', 'pop', 'fw', 'danger', 't', 'clock']) assert.ok(Number.isFinite(s[k]), `${k} не число: ${s[k]}`);
  for (const a of [s.valves, s.sat, s.flow, s.needNow]) for (const v of a) assert.ok(Number.isFinite(v));
  assert.ok(s.P >= 0 && s.P <= 100 && s.pop >= 0 && s.pop <= 1000 && s.coal >= 0 && s.coal <= 99 && s.fire >= 0);
  for (const v of s.valves) assert.ok(v >= 0 && v <= 1);
};

test('AUD-01 setValve/adjustValve не принимают NaN/Infinity/не-числа', () => {
  const s = createState(7, { skipTutorial: true });
  setValve(s, 0, 0.5);
  for (const bad of [NaN, Infinity, -Infinity, 'x', '0.9', null, undefined, {}, [], true]) { setValve(s, 0, bad); assert.equal(s.valves[0], 0.5, 'значение ' + String(bad)); }
  adjustValve(s, 0, NaN); adjustValve(s, 0, 'x'); adjustValve(s, 0, undefined); assert.equal(s.valves[0], 0.5);
  setValve(s, 0, 9); assert.equal(s.valves[0], 1); setValve(s, 0, -3); assert.equal(s.valves[0], 0);
});
test('AUD-02 setValve принимает только целый индекс 0..3', () => {
  const s = createState(7, { skipTutorial: true });
  for (const bad of ['1', 1.5, -1, 4, NaN, null, undefined, '__proto__']) { setValve(s, bad, 0.7); }
  assert.deepEqual(s.valves, [0, 0, 0, 0]); assert.equal(Object.keys(s.valves).length, 4);
});
test('AUD-03 chooseCard игнорирует неизвестный вариант', () => {
  const s = createState(3, { skipTutorial: true }); s.phase = 'summary'; s.night = 0; s.summary = {}; continueSummary(s);
  assert.equal(s.phase, 'card'); const id = s.card.id;
  chooseCard(s, 'bogus'); chooseCard(s, undefined); chooseCard(s, { toString: () => 'ration' }); chooseCard(s, '__proto__');
  assert.equal(s.phase, 'card'); assert.equal(s.choices[id], undefined);
  chooseCard(s, s.card.options[0].key); assert.equal(s.phase, 'night');
});
test('AUD-04 fixLeak с мусорным id не ломает состояние', () => {
  const s = createState(3, { skipTutorial: true });
  assert.equal(fixLeak(s, NaN), false); assert.equal(fixLeak(s, {}), false); assert.equal(fixLeak(s, 'x'), false); assert.equal(fixLeak(s, null), false);
});
test('AUD-05 validateSave отвергает испорченные и подделанные сохранения', () => {
  const ok = JSON.parse(serialize(createState(9, { skipTutorial: true })));
  assert.ok(validateSave({ ...ok, events: [], msgs: [] }));
  const mut = f => { const o = JSON.parse(JSON.stringify(ok)); f(o); o.events = []; o.msgs = []; return o; };
  const bad = [null, 5, 'x', [], {}, { v: 2 },
    mut(o => { o.valves = [0, 0, 0]; }), mut(o => { o.valves[1] = 'a'; }), mut(o => { o.valves[1] = 7; }), mut(o => { o.P = null; }), mut(o => { o.P = 1e9; }), mut(o => { o.pop = -5; }),
    mut(o => { o.phase = 'card'; o.card = null; }), mut(o => { o.phase = 'weird'; }), mut(o => { o.night = 42; }), mut(o => { o.leaks = 'x'; }), mut(o => { o.leaks = [{ pipe: 9, age: 0, id: 1 }]; }),
    mut(o => { o.rs = 'a'; }), mut(o => { o.flags = null; }), mut(o => { o.coal = Infinity; }), mut(o => { o.phase = 'summary'; o.summary = null; })];
  for (const b of bad) assert.equal(validateSave(b), null, JSON.stringify(b).slice(0, 80));
});
test('AUD-06 deserialize + validateSave: мусорная строка → null, не исключение', async () => {
  const { loadSaved } = await import('../src/core/validate.js');
  for (const str of [null, '', '{', '[]', '{"v":1}', 'null', '"x"', '{"v":1,"valves":"x"}']) assert.equal(loadSaved(str), null);
  const s = createState(4, { skipTutorial: true }); for (let i = 0; i < 600; i++) step(s, 1 / 60);
  const back = loadSaved(serialize(s)); assert.ok(back); assert.equal(back.P, s.P);
});
test('AUD-07 поле ника не перехватывает горячие клавиши (m/ь/p/пробел)', () => {
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(shouldIgnoreKey({ tagName: tag }), true);
  assert.equal(shouldIgnoreKey({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(shouldIgnoreKey({ tagName: 'CANVAS' }), false); assert.equal(shouldIgnoreKey(null), false); assert.equal(shouldIgnoreKey({}), false);
});
test('AUD-08 фаззинг: случайные команды (в т.ч. мусор) не выводят симуляцию из допустимых границ', () => {
  const rnd = makeRng(2026);
  for (let seed = 1; seed <= 6; seed++) {
    const s = createState(seed, { skipTutorial: seed % 2 === 0 });
    const junk = [NaN, Infinity, -1, 2, 'a', null, undefined, 0.5, 1e308, -1e308];
    for (let i = 0; i < 60 * 60 * 6 && s.phase !== 'ended'; i++) {
      const r = rnd();
      if (r < 0.03) setValve(s, Math.floor(rnd() * 5) - 0, junk[Math.floor(rnd() * junk.length)]);
      else if (r < 0.06) setValve(s, Math.floor(rnd() * 4), rnd());
      else if (r < 0.08) shovel(s); else if (r < 0.09) fixLeak(s, junk[Math.floor(rnd() * junk.length)]);
      if (s.phase === 'summary' || s.phase === 'card') botAct(s, 'good');
      step(s, 1 / 60); s.events.length = 0;
      if (i % 120 === 0) finiteState(s);
    }
    finiteState(s);
  }
});
test('AUD-09 сохранение посреди ночи не меняет ход игры (детерминизм)', () => {
  const play = rt => { let a = createState(11, { skipTutorial: true }); a.coal = 30; for (let i = 0; i < 60 * 150; i++) { botAct(a, 'good'); step(a, 1 / 60); a.events.length = 0; if (rt && i % 333 === 0) a = deserialize(serialize(a)); } return serialize(a); };
  assert.equal(play(false), play(true));
});
test('AUD-10 все настоящие сохранения (каждая фаза, вся партия) проходят проверку', async () => {
  const { loadSaved } = await import('../src/core/validate.js');
  const s = createState(21, { skipTutorial: false }); const seen = new Set(); let n = 0;
  for (let i = 0; i < 60 * 60 * 40 && s.phase !== 'ended'; i++) { botAct(s, 'good'); step(s, 1 / 60); s.events.length = 0; if (i % 50 === 0 || !seen.has(s.phase + s.night)) { seen.add(s.phase + s.night); assert.ok(loadSaved(serialize(s)), `фаза ${s.phase} ночь ${s.night} t=${s.t}`); n++; } }
  assert.ok(n > 20); assert.ok(loadSaved(serialize(s)), 'финал');
});
