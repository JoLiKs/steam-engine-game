// Сборка для публикации: один классический скрипт с пониженным синтаксисом (Safari 11+/Chrome 64+/Firefox 60+),
// имена файлов с хешем содержимого (неизменяемый кэш, никакой «каши» из старых и новых модулей).
// node scripts/build.mjs [outDir]   (по умолчанию dist/)
// SEG_TARGET=ghpages SEG_API_BASE=https://host/steam/api/g node scripts/build.mjs out  — сборка для GitHub Pages (подкаталог /steam-engine-game/):
//   API-адрес вшит в бандл, нет _worker.js/_headers/_routes.json, нет /admin (админка живёт только на pages.dev), есть .nojekyll и 404.html.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const TARGETS = ['chrome64', 'safari11', 'firefox60', 'edge79'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist'));
const GH = process.env.SEG_TARGET === 'ghpages';
const API = process.env.SEG_API_BASE || '';
if (GH && !/^https:\/\/[\w.-]+(:\d+)?\/[\w./-]*$/.test(API)) throw new Error('для SEG_TARGET=ghpages нужен SEG_API_BASE (https://…/api/g)');
const sha = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 10);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
if (!GH) { fs.mkdirSync(path.join(out, 'src'), { recursive: true }); fs.mkdirSync(path.join(out, 'admin'), { recursive: true }); }

const r = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', target: TARGETS, write: false, legalComments: 'none', logLevel: 'warning', define: GH ? { __SEG_API_BASE__: JSON.stringify(API) } : {} });
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

fs.copyFileSync(path.join(root, 'style.css'), path.join(out, 'style.css'));
if (GH) {
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  fs.writeFileSync(path.join(out, '404.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Не найдено</title><body style="background:#14100d;color:#e8d9b5;font-family:Georgia,serif;text-align:center;padding:12vh 1em"><h1>Здесь только котёл</h1><p><a style="color:#e0b866" href="./">Вернуться в игру</a></p>');
} else {
  for (const f of ['_headers', '_worker.js', '_routes.json']) fs.copyFileSync(path.join(root, f), path.join(out, f));
  for (const f of ['index.html', 'login.js', 'login.css']) fs.copyFileSync(path.join(root, 'admin', f), path.join(out, 'admin', f));
}
// модульные исходники — запасной вариант для уже открытых вкладок со старой страницей (с revalidate, см. _headers)
if (!GH) {
  const copyTree = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from, { withFileTypes: true })) { if (e.isDirectory()) copyTree(path.join(from, e.name), path.join(to, e.name)); else if (e.name.endsWith('.js')) fs.copyFileSync(path.join(from, e.name), path.join(to, e.name)); } };
  copyTree(path.join(root, 'src'), path.join(out, 'src'));
}
console.log(`сборка${GH ? ' (GitHub Pages)' : ''} → ${out}: game.${hGame}.js (${(game.length / 1024).toFixed(0)} КБ), boot.${hBoot}.js, style.css?v=${hCss}`);
