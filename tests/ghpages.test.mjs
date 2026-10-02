import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://185-255-133-179.sslip.io/steam/api/g';
const build = (env) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-'));
  execFileSync('node', ['scripts/build.mjs', out], { env: { ...process.env, ...env }, stdio: 'pipe' });
  return out;
};

test('сборка для GitHub Pages: API вшит, нет админки/воркера, пути относительные', () => {
  const out = build({ SEG_TARGET: 'ghpages', SEG_API_BASE: API });
  const files = fs.readdirSync(out);
  for (const bad of ['admin', '_worker.js', '_headers', '_routes.json', 'src']) assert.ok(!files.includes(bad), bad + ' не должен попасть в gh-pages');
  assert.ok(files.includes('.nojekyll') && files.includes('404.html') && files.includes('index.html'));
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(!/(src|href)="\/[^/]/.test(html), 'нет абсолютных путей (сайт живёт в подкаталоге /steam-engine-game/)');
  const game = fs.readFileSync(path.join(out, files.find(f => f.startsWith('game.'))), 'utf8');
  assert.ok(game.includes(API));
  assert.ok(!/ADMIN_PASSWORD|SEG_PROXY_SECRET|x-seg-proxy/i.test(game));
  fs.rmSync(out, { recursive: true, force: true });
});
test('обычная сборка (pages.dev): запросы на тот же origin, админка и воркер на месте', () => {
  const out = build({ SEG_TARGET: '', SEG_API_BASE: '' });
  const files = fs.readdirSync(out);
  assert.ok(files.includes('admin') && files.includes('_worker.js'));
  const game = fs.readFileSync(path.join(out, files.find(f => f.startsWith('game.'))), 'utf8');
  assert.ok(game.includes('/api/g') && !game.includes('sslip.io'));
  fs.rmSync(out, { recursive: true, force: true });
});
test('ghpages без SEG_API_BASE — ошибка сборки', () => {
  assert.throws(() => build({ SEG_TARGET: 'ghpages', SEG_API_BASE: '' }));
});
