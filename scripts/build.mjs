// Сборка для публикации: один классический скрипт с пониженным синтаксисом (Safari 11+/Chrome 64+/Firefox 60+),
// имена файлов с хешем содержимого (неизменяемый кэш, никакой «каши» из старых и новых модулей).
// node scripts/build.mjs [outDir]   (по умолчанию dist/)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const TARGETS = ['chrome64', 'safari11', 'firefox60', 'edge79'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist'));
const sha = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 10);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'src'), { recursive: true }); fs.mkdirSync(path.join(out, 'admin'), { recursive: true });

const r = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', target: TARGETS, write: false, legalComments: 'none', logLevel: 'warning' });
const game = r.outputFiles[0].contents;
const boot = fs.readFileSync(path.join(root, 'boot.js'));
const css = fs.readFileSync(path.join(root, 'style.css'));
const hGame = sha(game), hBoot = sha(boot), hCss = sha(css);
fs.writeFileSync(path.join(out, `game.${hGame}.js`), game);
fs.writeFileSync(path.join(out, `boot.${hBoot}.js`), boot);

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const rep = (a, b) => { if (!html.includes(a)) throw new Error('в index.html не найдено: ' + a); html = html.replace(a, b); };
rep('<script src="boot.js"></script>', `<script src="boot.${hBoot}.js"></script>`);
rep('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="style.css?v=${hCss}">`);
rep('<script type="module" src="src/main.js"></script>', `<script defer src="game.${hGame}.js"></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);

for (const f of ['style.css', '_headers', '_worker.js', '_routes.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of ['index.html', 'login.js', 'login.css']) fs.copyFileSync(path.join(root, 'admin', f), path.join(out, 'admin', f));
// модульные исходники — запасной вариант для уже открытых вкладок со старой страницей (с revalidate, см. _headers)
for (const f of fs.readdirSync(path.join(root, 'src'))) if (f.endsWith('.js')) fs.copyFileSync(path.join(root, 'src', f), path.join(out, 'src', f));
console.log(`сборка → ${out}: game.${hGame}.js (${(game.length / 1024).toFixed(0)} КБ), boot.${hBoot}.js, style.css?v=${hCss}`);
