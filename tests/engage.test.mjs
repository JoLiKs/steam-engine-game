// 2.0 м2: достижения, значки, шаринг/ссылки-вызовы, помощники соревнования, события ведущего, сетевые вызовы испытания дня.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, cleanMeta, applyRun, applyShare, questDone, prevDay, emptyStats } from '../src/core/achievements.js';
import { badge, GLYPHS } from '../src/ui/icons.js';
import { challengeFromSearch, challengeLink, dailyLink, shareText, SEED_RE } from '../src/ui/share.js';
import { boardView, placeLabel, MODE_NAMES } from '../src/net/mp.js';
import { hostEvents, HOST_EVENTS } from '../src/core/data.js';
import { createState, beginNight, step } from '../src/core/sim.js';
import { botAct } from '../src/core/bot.js';
import { computeScore } from '../src/core/score.js';

const ctx = (o = {}) => ({ mode: 'solo', ending: 'light', nights: 10, pop: 950, burnouts: 0, smog: 10, score: computeScore({ nights: 10, pop: 950, ending: 'light', smog: 10 }), leaksFixed: 3, shovels: 100, spills: 0, ...o });

test('достижений не меньше 20, id уникальны, у всех есть значок из набора', () => {
  assert.ok(ACHIEVEMENTS.length >= 20);
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) { assert.ok(GLYPHS.includes(a.icon), a.id + ' значок'); assert.ok([1, 2, 3].includes(a.tier)); assert.ok(a.name && a.desc); }
});
test('значки — валидный SVG без пользовательских данных, locked отличается', () => {
  for (const g of GLYPHS) { const s = badge(g, 2); assert.match(s, /^<svg[\s\S]*<\/svg>$/); assert.ok(!/<script|on\w+=/i.test(s)); }
  assert.notEqual(badge('star', 3, true), badge('star', 3, false));
  assert.match(badge('нет-такого', 9), /<svg/);   // неизвестный глиф/ярус — безопасная подстановка
});
test('светлая чистая партия даёт набор достижений, повторно не выдаётся', () => {
  const m = cleanMeta(null); const got = applyRun(m, ctx(), { now: 5 }).map(a => a.id);
  for (const id of ['first_dawn', 'half_way', 'convoy', 'light', 'clean_shift', 'clean_sky', 'hospital_hero', 'every_one', 'no_spill']) assert.ok(got.includes(id), id);
  assert.equal(applyRun(m, ctx(), { now: 6 }).length, 0);
  assert.equal(m.ach.light, 5);
});
test('взрыв/тишина/дым: свои концовки, а «convoy» только за 10 ночей', () => {
  const m = cleanMeta(null);
  const g = applyRun(m, ctx({ ending: 'boom', nights: 3, pop: 700, score: 400 })).map(a => a.id);
  assert.ok(g.includes('boom') && g.includes('first_dawn') && !g.includes('convoy') && !g.includes('light'));
});
test('все концовки: считается по meta.endings + текущая', () => {
  const m = cleanMeta({ endings: ['light', 'smoke', 'iron', 'cold', 'boom'] });
  assert.ok(applyRun(m, ctx({ ending: 'silence', nights: 4 })).some(a => a.id === 'all_endings'));
});
test('сетевые режимы: кооператив, соревнование, место', () => {
  const m = cleanMeta(null);
  const a = applyRun(m, ctx({ mode: 'coop', players: 2, spills: undefined, shovels: undefined })).map(x => x.id);
  assert.ok(a.includes('team') && a.includes('coop_light') && !a.includes('no_spill') && !a.includes('coal_baron'));
  const v = applyRun(m, ctx({ mode: 'versus', place: 1, players: 4 })).map(x => x.id);
  assert.ok(v.includes('rival') && v.includes('champion') && v.includes('quartet'));
  assert.equal(m.st.wins, 1);
  const m2 = cleanMeta(null);
  const w = applyRun(m2, ctx({ mode: 'versus', place: 1, players: 2, dnf: true })).map(x => x.id);
  assert.ok(w.includes('rival') && !w.includes('champion'));
  assert.ok(!applyRun(cleanMeta(null), ctx({ mode: 'versus', place: 1, players: 1 })).some(x => x.id === 'champion'), 'в одиночку чемпионом не стать');
});
test('серия дней: подряд — растёт, пропуск — сбрасывается; задание дня', () => {
  const m = cleanMeta(null), d = ['2026-10-01', '2026-10-02', '2026-10-03'];
  applyRun(m, ctx({ mode: 'daily', questDone: true }), { day: d[0] }); assert.equal(m.st.streak, 1); assert.ok(m.ach.daily_first);
  applyRun(m, ctx({ mode: 'daily' }), { day: d[0] }); assert.equal(m.st.streak, 1, 'тот же день не считается дважды');
  applyRun(m, ctx({ mode: 'daily' }), { day: d[1] }); applyRun(m, ctx({ mode: 'daily' }), { day: d[2] });
  assert.equal(m.st.streak, 3); assert.ok(m.ach.streak3 && !m.ach.streak7);
  applyRun(m, ctx({ mode: 'daily' }), { day: '2026-10-09' }); assert.equal(m.st.streak, 1);
  assert.equal(prevDay('2026-03-01'), '2026-02-28'); assert.equal(prevDay('2027-01-01'), '2026-12-31');
});
test('шаринг даёт достижение один раз, challenge — по режиму', () => {
  const m = cleanMeta(null);
  assert.equal(applyShare(m).length, 1); assert.equal(applyShare(m).length, 0); assert.equal(m.st.shares, 2);
  assert.ok(applyRun(m, ctx({ mode: 'challenge' })).some(a => a.id === 'challenger'));
});
test('cleanMeta выдерживает мусор и старый формат', () => {
  assert.deepEqual(cleanMeta({ endings: ['light'], plays: 3 }).endings, ['light']);
  const bad = cleanMeta({ endings: [1, 'x', null], plays: 'a', ach: { light: 'z', nope: 5, first_dawn: 9 }, st: { streak: -5, wins: 1e12, lastDay: '<script>', coop: NaN } });
  assert.equal(bad.plays, 0); assert.deepEqual(bad.endings, ['x']); assert.deepEqual(Object.keys(bad.ach), ['first_dawn']);
  assert.equal(bad.st.streak, 0); assert.equal(bad.st.wins, 1e6); assert.equal(bad.st.lastDay, ''); assert.equal(bad.st.coop, 0);
  assert.deepEqual(cleanMeta('строка').st, emptyStats()); assert.doesNotThrow(() => cleanMeta(undefined));
});
test('questDone совпадает с серверной логикой по целям', () => {
  const r = { pop: 800, burnouts: 0, smog: 20, nights: 10, ending: 'light', score: 1200 };
  assert.ok(questDone({ pop_min: 700 }, r) && !questDone({ pop_min: 900 }, r));
  assert.ok(questDone({ burn_max: 0 }, r) && !questDone({ burn_max: 0 }, { ...r, burnouts: 1 }));
  assert.ok(questDone({ smog_max: 25 }, r) && !questDone({ smog_max: 10 }, r));
  assert.ok(questDone({ nights_min: 10 }, r) && questDone({ ending: 'light' }, r) && !questDone({ ending: 'smoke' }, r));
  assert.ok(questDone({ score_min: 1000 }, r) && !questDone({ score_min: 1300 }, r) && !questDone(null, r));
});

test('ссылки-вызовы: разбор и построение', () => {
  assert.deepEqual(challengeFromSearch('?seed=12345&c=900'), { kind: 'seed', seed: 12345, score: 900 });
  assert.deepEqual(challengeFromSearch('?seed=7'), { kind: 'seed', seed: 7, score: 0 });
  assert.deepEqual(challengeFromSearch('?daily'), { kind: 'daily' });
  for (const bad of ['', '?seed=0', '?seed=-5', '?seed=abc', '?seed=99999999999', '?seed=4294967296', '?seed=1.5', '?seed=<script>']) assert.equal(challengeFromSearch(bad), null, bad);
  assert.equal(challengeFromSearch('?seed=5&c=zzz').score, 0);
  assert.equal(challengeFromSearch('?seed=5&c=99999').score, 0);
  const loc = { origin: 'https://x.dev', pathname: '/game/' };
  assert.equal(challengeLink(loc, 77, 1234.6), 'https://x.dev/game/?seed=77&c=1235');
  assert.equal(challengeLink(loc, 77, 0), 'https://x.dev/game/?seed=77');
  assert.equal(dailyLink(loc), 'https://x.dev/game/?daily');
  assert.ok(SEED_RE.test('4294967295'));
  const back = challengeFromSearch(challengeLink(loc, 4294967295 + 5, 50).split('/game/')[1]); assert.ok(back === null || back.seed < 2 ** 32);
  assert.match(shareText({ mode: 'daily', score: 5 }), /Испытание дня/); assert.match(shareText({ mode: 'solo', score: 5, nights: 3, pop: 9 }), /5 очков/);
});

test('таблица гонки для HUD: типы, обрезка, метка «вы»', () => {
  assert.deepEqual(boardView(null, 'a'), []);
  const rows = [{ pid: 'a', nick: 'Анна', score: 120.7, night: 3, pop: 900, state: 'playing' }, { pid: 'b', nick: 'x'.repeat(40), score: -5, night: 99, pop: -1, state: 'weird' }, { pid: 'c', nick: 'C', score: 1, night: 1, pop: 5, state: 'dnf' }, { pid: 'd' }, { pid: 'e' }];
  const v = boardView(rows, 'a');
  assert.equal(v.length, 4); assert.equal(v[0].me, true); assert.equal(v[0].score, 120); assert.equal(v[1].nick.length, 16); assert.equal(v[1].score, 0);
  assert.equal(v[1].night, 10); assert.equal(v[1].state, 'playing'); assert.equal(v[2].state, 'dnf');
  assert.equal(placeLabel({ place: 2 }), '2-е'); assert.equal(placeLabel({ dnf: true, place: 3 }), 'вышел');
  assert.equal(MODE_NAMES.versus, 'Соревнование');
});

test('события ведущего: детерминированы по сиду, в безопасных пределах', () => {
  for (const seed of [1, 42, 99999, 2 ** 32 - 1]) for (let n = 1; n <= 9; n++) {
    const a = hostEvents(seed, n), b = hostEvents(seed, n);
    assert.deepEqual(a, b);
    assert.ok(a.length <= 2);
    for (const e of a) { assert.ok(e.m >= 1.2 && e.m <= 1.45, 'множитель ' + e.m); assert.ok(e.t1 > e.t0 && e.t1 - e.t0 <= 17); assert.ok(HOST_EVENTS.some(h => h.id === e.id)); assert.ok(e.d >= 0 && e.d <= 3); }
    if (a.length === 2) assert.notEqual(a[0].id, a[1].id);
  }
  assert.deepEqual(hostEvents(5, 0), []);
  assert.notDeepEqual(hostEvents(1, 3), hostEvents(2, 3));
});
test('ведущий в симуляции: host выключен по умолчанию и не меняет обычную игру', () => {
  const plain = createState(77), host = createState(77, { host: true });
  assert.ok(!plain.hostOn); assert.ok(host.hostOn);
  beginNight(host, 1); assert.ok(Array.isArray(host.xev));
  let seen = 0; for (let i = 0; i < 60 * 240; i++) { botAct(host, 'good', {}); step(host, 1 / 60); for (const e of host.events) if (e.type === 'hostev') seen++; host.events.length = 0; if (host.phase !== 'night') break; }
  assert.ok(seen >= 1, 'событие ведущего показано');
  const p2 = createState(77); beginNight(p2, 1); assert.ok(!p2.xev || p2.xev.length === 0);
});

// ---- сетевые вызовы 2.0 с поддельным fetch
import { fetchDaily, fetchDailyBoard, fetchSeason, fetchReview, Run } from '../src/net/net.js';
const withFetch = async (impl, fn) => { const old = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = old; } };
const J = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });
test('fetchDaily: разбор ответа и отказоустойчивость', async () => {
  const good = { day: '2026-10-03', seed: 123, quest: { id: 'warm', title: 'T', goal: { pop_min: 700 }, goal_text: 'g', text: 'x', src: 'fallback' } };
  assert.deepEqual(await withFetch(J(200, good), fetchDaily), good);
  assert.equal(await withFetch(J(200, { nope: 1 }), fetchDaily), null);
  assert.equal(await withFetch(J(500, {}), fetchDaily), null);
  assert.equal(await withFetch(async () => { throw new Error('offline'); }, fetchDaily), null);
});
test('fetchDailyBoard / fetchSeason: параметры и null при сбое', async () => {
  let url = ''; const spy = async u => { url = u; return { ok: true, status: 200, json: async () => ({ entries: [{ nick: 'a' }] }) }; };
  assert.equal((await withFetch(spy, () => fetchDailyBoard('2026-10-03', 'abc12345'))).entries.length, 1);
  assert.match(url, /daily\/board\?limit=20&day=2026-10-03&pid=abc12345/);
  await withFetch(spy, () => fetchSeason('pid12345')); assert.match(url, /board=season/);
  assert.equal(await withFetch(J(429, {}), () => fetchSeason('x')), null);
});
test('fetchReview: только включённый ответ с текстом; выключено/ошибка → null', async () => {
  assert.deepEqual(await withFetch(J(200, { enabled: true, text: 'Хорошая смена.', src: 'ai' }), () => fetchReview({ nights: 3 })), { text: 'Хорошая смена.', src: 'ai' });
  assert.equal(await withFetch(J(200, { enabled: false }), () => fetchReview({})), null);
  assert.equal(await withFetch(J(422, {}), () => fetchReview({})), null);
});
test('Run.submitDaily шлёт билет, день и результат; без билета — null', async () => {
  let sent = null;
  const run = new Run(() => true); run.token = 'TK';
  await withFetch(async (u, o) => { sent = { u, b: JSON.parse(o.body) }; return { ok: true, status: 200, json: async () => ({ ok: true }) }; }, () => run.submitDaily({ score: 5, nights: 1 }, 'Ник', 'pid', '2026-10-03'));
  assert.match(sent.u, /daily\/score$/); assert.deepEqual(sent.b, { token: 'TK', pid: 'pid', nick: 'Ник', day: '2026-10-03', score: 5, nights: 1 });
  const run2 = new Run(() => true); assert.equal(await run2.submitDaily({}, '', 'p', 'd'), null);
});

import { isPublicApi } from '../_worker.js';
test('воркер Pages пропускает новые публичные маршруты 2.0 и не больше', () => {
  for (const p of ['/api/g/daily', '/api/g/daily/score', '/api/g/daily/board', '/api/g/review', '/api/g/leaderboard']) assert.ok(isPublicApi(p), p);
  for (const p of ['/api/g/admin', '/api/g/daily/../x', '/api/g/', '/api/g/review/x', '/api/g/constructor', '/api/g/__proto__']) assert.ok(!isPublicApi(p), p);
});
