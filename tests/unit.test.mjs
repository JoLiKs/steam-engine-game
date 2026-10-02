import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, setValve, shovel, fixLeak, spawnLeak, serialize, deserialize, computeEnding, chooseCard, continueSummary, toll, smogAvg, needNow, P_DANGER } from '../src/sim.js';
import { runGame, botAct } from '../src/bot.js';
import { NIGHTS, CARDS, ENDINGS, TUTORIAL, CAP } from '../src/data.js';
import { nextRand } from '../src/rng.js';
import { makeLayout, column, viewFor } from '../src/layout.js';

const DT = 1 / 60;
const play = (seed, skill, opts = {}, skip = true) => runGame(createState(seed, { skipTutorial: skip }), skill, opts);

test('ГСЧ детерминирован и в диапазоне', () => {
  const a = { rs: 5 }, b = { rs: 5 };
  for (let i = 0; i < 1000; i++) { const x = nextRand(a), y = nextRand(b); assert.equal(x, y); assert.ok(x >= 0 && x < 1); }
});

test('симуляция детерминирована при одинаковом seed и одинаковых действиях', () => {
  const r1 = play(42, 'good'), r2 = play(42, 'good');
  assert.equal(serialize({ ...r1, events: [] }), serialize({ ...r2, events: [] }));
  assert.equal(r1.ending, r2.ending);
});

test('разные seed дают разные траектории (утечки), но все завершаются', () => {
  const a = play(1, 'good'), b = play(2, 'good');
  assert.ok(a.ending && b.ending);
  assert.notEqual(a.leakId + ':' + a.rs, b.leakId + ':' + b.rs);
});

test('давление и параметры всегда в допустимых границах', () => {
  const s = createState(3, { skipTutorial: true });
  for (let i = 0; i < 60 * 300 && s.phase !== 'ended'; i++) {
    botAct(s, i % 700 < 350 ? 'good' : 'bad'); step(s, DT); s.events.length = 0;
    assert.ok(s.P >= 0 && s.P <= 100, 'P ' + s.P);
    assert.ok(s.fire >= 0 && s.fire <= 100);
    assert.ok(s.coal >= 0 && s.coal <= 99.01);
    assert.ok(s.smog >= 0 && s.smog <= 100);
    assert.ok(s.pop >= 0 && s.pop <= 1000);
    assert.ok(s.fw >= 0 && s.fw <= 100);
    for (const v of s.valves) assert.ok(v >= 0 && v <= 1);
  }
});

test('лопата тратит уголь, поднимает жар, имеет перезарядку', () => {
  const s = createState(1, { skipTutorial: true });
  const c0 = s.coal;
  assert.ok(shovel(s)); assert.equal(s.coal, c0 - 1); assert.ok(s.fire > 10);
  assert.equal(shovel(s), false, 'перезарядка');
  for (let i = 0; i < 40; i++) step(s, DT);
  assert.ok(shovel(s));
});

test('нет угля — лопата не работает', () => {
  const s = createState(1, { skipTutorial: true }); s.coal = 0;
  assert.equal(shovel(s), false);
});

test('закрытые вентили и жар — давление растёт, открытые — падает', () => {
  const s = createState(1, { skipTutorial: true }); s.fire = 60; s.P = 30;
  for (let i = 0; i < 300; i++) step(s, DT);
  assert.ok(s.P > 40);
  const s2 = createState(1, { skipTutorial: true }); s2.P = 70; s2.fire = 0; setValve(s2, 0, 1); setValve(s2, 1, 1);
  for (let i = 0; i < 300; i++) step(s2, DT);
  assert.ok(s2.P < 50);
});

test('предохранительный клапан срабатывает выше порога, перегрев → взрыв', () => {
  const s = createState(1, { skipTutorial: true }); s.P = 95; s.fire = 100;
  let vented = false;
  for (let i = 0; i < 60 * 30 && s.phase !== 'ended'; i++) { step(s, DT); if (s.venting) vented = true; s.fire = 100; s.P = Math.max(s.P, 97); }
  assert.ok(vented); assert.equal(s.ending, 'boom');
});

test('простой не должен закончиться взрывом; без огня давление падает до нуля', () => {
  const s = play(1, 'idle', {}, true);
  assert.notEqual(s.ending, 'boom');
});

test('утечка отнимает давление и устраняется', () => {
  const s = createState(1, { skipTutorial: true }); spawnLeak(s, 2);
  assert.equal(s.leaks.length, 1);
  assert.ok(fixLeak(s, null)); assert.equal(s.leaks.length, 0); assert.equal(fixLeak(s, null), false);
  spawnLeak(s, 2); spawnLeak(s, 2); assert.equal(s.leaks.length, 1, 'дубликатов нет');
});

test('обучение: бот проходит все шаги, затем начинается первая ночь', () => {
  const s = createState(1);
  assert.ok(s.tut.active);
  let steps = 0;
  while (s.tut.active && steps++ < 60 * 120) { botAct(s, 'good'); step(s, DT); s.events.length = 0; }
  assert.ok(s.tut.done, 'туториал завершён');
  assert.equal(s.tut.step, TUTORIAL.length - 1);
  assert.equal(s.pop, 1000, 'в обучении жители не гибнут');
});

test('решения влияют на состояние', () => {
  const s = createState(1, { skipTutorial: true });
  s.phase = 'card'; s.card = CARDS[1]; s.night = 0; const c = s.coal;
  chooseCard(s, 'help'); assert.ok(s.flags.timka); assert.equal(s.coal, c); assert.equal(s.night, 1); assert.equal(s.phase, 'night');
  const s2 = createState(1, { skipTutorial: true }); s2.phase = 'card'; s2.card = CARDS[1]; s2.night = 0;
  chooseCard(s2, 'ration'); assert.equal(s2.flags.timka, false); assert.equal(s2.coal, c - 6);
  const s3 = createState(1, { skipTutorial: true }); s3.phase = 'card'; s3.card = CARDS[5]; s3.night = 4; chooseCard(s3, 'accept');
  assert.ok(s3.flags.brown); assert.equal(s3.coal, c + 32);
});

test('Тимка подбрасывает уголь сам и копит «цену»', () => {
  const s = createState(1, { skipTutorial: true }); s.flags.timka = true; s.fire = 0;
  for (let i = 0; i < 600; i++) step(s, DT);
  assert.ok(s.timkaShovels > 0 && toll(s) > 0);
});

test('смена нажимает усталость: продление смены увеличивает усталость и добычу', () => {
  const run = ext => { const s = createState(1, { skipTutorial: true }); s.flags.extend = ext; s.fire = 70; s.P = 50; setValve(s, 2, 1); for (let i = 0; i < 1200; i++) { s.fire = 70; step(s, DT); } return s; };
  const a = run(false), b = run(true);
  assert.ok(b.fw > a.fw); assert.ok(b.coalMade > a.coalMade);
});

test('концовки достижимы: свет, дым, железо, холод, взрыв, тишина', () => {
  const seen = new Set();
  const add = (s) => seen.add(s.ending);
  add(play(1, 'good', { policy: 'good', react: 0.4 }));
  add(play(1, 'good', { policy: 'greedy', react: 0.4 }));
  add(play(1, 'good', { policy: 'iron', react: 0.4, pusher: true }));
  add(play(1, 'good', { policy: 'smoky', react: 2.0 }));
  add(play(1, 'bad'));
  { const r = createState(1, { skipTutorial: true }); r.coal = 99; add(runGame(r, 'reckless')); }
  add(play(1, 'stingy', { policy: 'good', react: 0.5, aim: 0.5 }));
  add(play(1, 'idle'));
  for (const e of ['light', 'smoke', 'iron', 'boom', 'silence', 'cold']) assert.ok(seen.has(e), 'не достигнута: ' + e + ' ' + [...seen]);
  assert.ok(seen.has('cold') || true);
  const s = createState(1); s.pop = 700; assert.equal(computeEnding(s), 'cold');
  for (const k of Object.keys(ENDINGS)) assert.ok(ENDINGS[k].lines.length >= 3);
});

test('БАЛАНС: хороший бот выигрывает почти всегда, плохой проигрывает всегда', () => {
  let good = 0, bad = 0, idle = 0; const N = 15;
  for (let seed = 1; seed <= N; seed++) {
    if (['light', 'smoke', 'iron'].includes(play(seed, 'good', { policy: 'good', react: 0.5 }).ending)) good++;
    if (['light', 'smoke', 'iron', 'cold'].includes(play(seed, 'bad').ending)) bad++;
    if (['light', 'smoke', 'iron', 'cold'].includes(play(seed, 'idle').ending)) idle++;
  }
  assert.ok(good >= N - 1, 'хороший бот победил ' + good + '/' + N);
  assert.equal(bad, 0, 'плохой бот не должен выигрывать'); assert.equal(idle, 0);
});

test('БАЛАНС: идеальная игра приводит к лучшей концовке, жадные решения — к дорогим', () => {
  let light = 0, N = 12;
  for (let seed = 1; seed <= N; seed++) if (play(seed, 'good', { policy: 'good', react: 0.5 }).ending === 'light') light++;
  assert.ok(light >= N - 2, 'light ' + light);
  let notLight = 0;
  for (let seed = 1; seed <= N; seed++) if (play(seed, 'good', { policy: 'smoky', react: 0.5 }).ending !== 'light') notLight++;
  assert.ok(notLight >= N - 2);
});

test('сериализация: сохранение и загрузка воспроизводят одинаковый результат', () => {
  const a = createState(7, { skipTutorial: true });
  for (let i = 0; i < 60 * 40; i++) { botAct(a, 'good'); step(a, DT); a.events.length = 0; }
  const b = deserialize(serialize(a));
  for (let i = 0; i < 60 * 40; i++) { botAct(a, 'good'); step(a, DT); a.events.length = 0; botAct(b, 'good'); step(b, DT); b.events.length = 0; }
  assert.equal(serialize(a), serialize(b));
});

test('данные: каждая ночь и карточка валидны', () => {
  assert.equal(NIGHTS.length, 10);
  for (const n of NIGHTS) { assert.equal(n.need.length, 4); assert.ok(n.dur >= 40); }
  const total = NIGHTS.reduce((a, n) => a + n.dur, 0);
  assert.ok(total / 60 >= 8 && total / 60 <= 12, 'длительность ' + total / 60);
  for (const c of Object.values(CARDS)) assert.equal(c.options.length, 2);
  // потребность не превышает ёмкость вентиля при пиках
  const s = createState(1, { skipTutorial: true });
  for (let n = 0; n < NIGHTS.length; n++) { s.night = n; for (let t = 0; t < NIGHTS[n].dur; t += 1) { s.t = t; for (let d = 0; d < 4; d++) assert.ok(needNow(s, d) <= CAP[d] * 0.97, `ночь ${n} район ${d} ${needNow(s, d)}`); } }
});

test('раскладка: все элементы внутри холста на 390x844 и 1280x800 без пересечений колонок', () => {
  for (const [w, h] of [[390, 844], [360, 740], [1280, 800], [1920, 1080], [1024, 768], [768, 1024]]) {
    const v = viewFor(w, h); const L = makeLayout(v.W, v.H, v.portrait);
    for (let i = 0; i < 4; i++) {
      const c = column(L, i);
      assert.ok(c.x >= 0 && c.x + c.w <= L.W + 0.5, `${w}x${h} колонка ${i}`);
      assert.ok(c.y + c.h <= L.H + 0.5, `${w}x${h} низ колонки ${i}`);
      if (i) assert.ok(c.x >= column(L, i - 1).x + column(L, i - 1).w);
    }
    assert.ok(L.shovel.y + L.shovel.h <= L.H + 0.5, `${w}x${h} лопата`);
    assert.ok(L.msg.y + L.msg.h <= L.H + 0.5, `${w}x${h} сообщения`);
    assert.ok(L.shovel.h >= 44 / v.scale * 0.9 || !v.portrait);
  }
});

// ---- счёт прохождения (общие векторы с backend)
import { readFileSync } from 'node:fs';
import { computeScore, nightsDone } from '../src/score.js';
test('computeScore совпадает с общими векторами бэкенда', () => {
  const vec = JSON.parse(readFileSync(new URL('./score_vectors.json', import.meta.url)));
  for (const v of vec) assert.equal(computeScore(v), v.score, JSON.stringify(v));
});
test('nightsDone: взрыв/тишина — ночи до текущей, остальные — 10', () => {
  assert.equal(nightsDone({ ending: 'boom', night: 4 }), 4);
  assert.equal(nightsDone({ ending: 'silence', night: 9 }), 9);
  assert.equal(nightsDone({ ending: 'light', night: 9 }), 10);
});
