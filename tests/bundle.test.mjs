// Прод-бандл должен разбираться как ES2017 (без ?., ??, class fields и т.п.), работать как классический скрипт (без import/export).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'acorn';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'seg-bundle-'));
execFileSync('node', ['scripts/build.mjs', out], { stdio: 'pipe' });
const files = fs.readdirSync(out);
const game = files.find(f => /^game\.[0-9a-f]+\.js$/.test(f)), boot = files.find(f => /^boot\.[0-9a-f]+\.js$/.test(f));

test('бандл игры — валидный ES2017 в виде классического скрипта', () => {
  assert.ok(game && boot);
  const src = fs.readFileSync(path.join(out, game), 'utf8');
  assert.doesNotThrow(() => parse(src, { ecmaVersion: 2017, sourceType: 'script' }));
  assert.ok(!/^\s*(import|export)\s/m.test(src));
  assert.ok(!/\?\.|\?\?/.test(src.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*$/gm, '')), 'остался ?. или ??');
});

test('boot.js — ES5 (разбирается старейшими браузерами)', () => {
  const src = fs.readFileSync(path.join(out, boot), 'utf8');
  assert.doesNotThrow(() => parse(src, { ecmaVersion: 5, sourceType: 'script' }));
});

test('index.html: страж загрузки идёт первым, игра — классический defer-скрипт с хешем, модулей нет', () => {
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(html.indexOf(boot) > 0 && html.indexOf(boot) < html.indexOf(game));
  assert.ok(html.includes(`<script defer src="${game}"></script>`));
  assert.ok(!/type="module"/.test(html));
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'встроенных скриптов быть не должно (CSP script-src self)');
});

test('в dist попали _worker.js, _routes.json, _headers, admin, но не тесты/бэкенд/секреты', () => {
  for (const f of ['_worker.js', '_routes.json', '_headers', 'style.css', 'admin/index.html', 'admin/login.js']) assert.ok(fs.existsSync(path.join(out, f)), f);
  for (const f of ['backend', 'tests', '.git', 'node_modules']) assert.ok(!fs.existsSync(path.join(out, f)), f);
});
