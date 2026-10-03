import test from 'node:test';
import assert from 'node:assert/strict';
import { Notes, NOTES, isCrisis } from '../src/ui/notes.js';

const mk = (o = {}) => ({ phase: 'night', night: 2, leaks: [], P: 50, fire: 60, coal: 60, smog: 20, danger: 0, burnT: 0, venting: false, tut: null, ...o });
const run = (n, s, secs, step = 0.5) => { let req = null; for (let t = 0; t < secs && !req; t += step) req = n.update(s, step); return req; };
const okResp = (o = {}) => ({ ok: true, data: { enabled: true, note: 'Манометр не любит спешки, кочегар тоже.', next_s: 150, per_night: 3, ...o } });

test('не раньше 45 с с начала ночи и не в обучении', () => {
  const n = new Notes(); const s = mk();
  assert.equal(run(n, s, 40), null);
  const req = run(n, s, 20); assert.ok(req); assert.equal(req.n, 3); assert.equal(req.s, 'night_start');
  const n2 = new Notes(); assert.equal(run(n2, mk({ tut: { active: true } }), 300), null);
});
test('в кризис (утечка/давление/авария) не просит; ситуация только из белого списка', () => {
  for (const o of [{ leaks: [{}] }, { P: 90 }, { P: 5, fire: 5 }, { danger: 1 }, { burnT: 3 }, { venting: true }]) {
    assert.ok(isCrisis(mk(o)), JSON.stringify(o));
    assert.equal(run(new Notes(), mk(o), 300), null);
  }
  const codes = new Set(['calm', 'pressure_high', 'pressure_low', 'coal_low', 'smog_high', 'leak', 'pop_loss', 'night_start', 'collapse']);
  const n = new Notes(); const s = mk({ coal: 10 }); const r = run(n, s, 100); assert.equal(r.s, 'coal_low'); assert.ok(codes.has(r.s));
  assert.equal(run(new Notes(), mk({ smog: 80 }), 100).s, 'smog_high');
});
test('после подсказки тренера или аварии тишина', () => {
  const n = new Notes(); const s = mk(); run(n, s, 50); n.busy = false; n.count = 0; n.nextAt = 0;
  n.noteHint(); let r = null; for (let t = 0; t < 14; t += 0.5) r = r || n.update(s, 0.5); assert.equal(r, null);
  for (let t = 0; t < 3; t += 0.5) r = r || n.update(s, 0.5); assert.ok(r);
  const m = new Notes(); run(m, s, 50); m.busy = false; m.count = 0; m.nextAt = 0; m.onEvent({ type: 'leak' });
  r = null; for (let t = 0; t < 11; t += 0.5) r = r || m.update(s, 0.5); assert.equal(r, null);
});
test('интервал и лимит за ночь берутся с сервера; новая ночь сбрасывает счётчик', () => {
  const n = new Notes(); const s = mk();
  let shown = 0;
  for (let t = 0; t < 1500; t += 0.5) { const req = n.update(s, 0.5); if (req && n.accept(okResp({ next_s: 100, per_night: 2 }), req, s)) shown++; }
  assert.equal(shown, 2, 'не больше per_night');
  s.night = 3; let more = 0;
  for (let t = 0; t < 1500; t += 0.5) { const req = n.update(s, 0.5); if (req && n.accept(okResp({ next_s: 100, per_night: 2 }), req, s)) more++; }
  assert.equal(more, 2);
});
test('интервал между заметками ≥ next_s (не меньше MIN_GAP)', () => {
  const n = new Notes(); const s = mk(); const times = [];
  for (let t = 0; t < 900; t += 0.5) { const req = n.update(s, 0.5); if (req && n.accept(okResp({ next_s: 1, per_night: 6 }), req, s)) times.push(n.t); }
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= NOTES.MIN_GAP - 0.01);
});
test('enabled:false отключает навсегда; сбои сети — пауза и отключение до конца ночи', () => {
  const n = new Notes(); const s = mk(); const req = run(n, s, 60);
  assert.equal(n.accept({ ok: true, data: { enabled: false } }, req, s), null); assert.equal(n.enabled, false); assert.equal(run(n, s, 600), null);
  const m = new Notes(); let calls = 0;
  for (let t = 0; t < 900; t += 0.5) { const q = m.update(s, 0.5); if (q) { calls++; m.accept(null, q, s); } }
  assert.equal(calls, NOTES.FAILS_OFF, 'после серии сбоев замолкает');
});
test('заметка, пришедшая уже во время кризиса, не показывается; чужие токены игнорируются', () => {
  const n = new Notes(); const s = mk(); const req = run(n, s, 60);
  assert.equal(n.accept(okResp(), { ...req, token: 999 }, s), null);
  assert.equal(n.accept(okResp(), req, mk({ leaks: [{}] })), null);
  const n2 = new Notes(); const r2 = run(n2, s, 60); assert.ok(n2.accept(okResp(), r2, s));
});
test('мусорные ответы отвергаются', () => {
  const s = mk();
  for (const d of [{ enabled: true, note: 123 }, { enabled: true, note: 'x'.repeat(400) }, { enabled: true, note: '' }, { enabled: true, note: null, retry_s: 30 }]) {
    const n = new Notes(); const req = run(n, s, 60); assert.equal(n.accept({ ok: true, data: d }, req, s), null);
  }
  const n = new Notes(); const req = run(n, s, 60); assert.equal(n.accept({ ok: false, status: 500, data: null }, req, s), null);
});
test('в запрос не попадает ничего, кроме ситуации и ночи', () => {
  const req = run(new Notes(), mk({ nick: 'Вася' }), 60);
  assert.deepEqual(Object.keys(req).sort(), ['n', 's', 'token']);
});
