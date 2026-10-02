// Сеть: любой вызов к бэкенду завершается не позже чем через 3 с и никогда не бросает исключение.
import test from 'node:test';
import assert from 'node:assert/strict';
import { call, TIMEOUT, fetchBoard, Run } from '../src/net.js';

const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test('лимит сети — 3 секунды', () => assert.equal(TIMEOUT, 3000));

test('зависший fetch (не реагирует даже на abort) → null за ≤ 3,3 с', async () => {
  globalThis.fetch = () => new Promise(() => { /* никогда */ });
  const t = Date.now(); const r = await call('/leaderboard');
  const dt = Date.now() - t;
  assert.equal(r, null); assert.ok(dt >= 2900 && dt < 3400, 'время ' + dt);
});

test('opts.timeout не может превысить 3 с', async () => {
  globalThis.fetch = () => new Promise(() => {});
  const t = Date.now(); await call('/x', {}, { timeout: 60000 });
  assert.ok(Date.now() - t < 3400);
});

test('обрыв сети, 500 и не-JSON не бросают исключений', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await call('/run', {}), null);
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => { throw new Error('bad'); } });
  const r = await call('/run', {}); assert.equal(r.ok, false); assert.equal(r.data, null);
  assert.equal(await fetchBoard('score'), null);
});

test('Run.begin при зависшем сервере завершается за ≤ 3,3 с и игра остаётся офлайн', async () => {
  globalThis.fetch = () => new Promise(() => {});
  const run = new Run(true); const t = Date.now(); await run.begin();
  assert.ok(Date.now() - t < 3400); assert.equal(run.online, false);
});

test('fetch отсутствует (очень старый браузер) → null', async () => {
  globalThis.fetch = undefined;
  assert.equal(await call('/x'), null);
});
