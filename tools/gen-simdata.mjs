// Выгружает данные кампании из src/core/data.js в backend/app/simdata.json (единый источник правды для JS и Python-порта ядра).
// Запуск: node tools/gen-simdata.mjs [--check]  (--check: ошибка, если файл устарел)
import fs from 'node:fs';
import { NIGHTS, CARDS, CAP, TICKER, POP_START, COAL_MAX } from '../src/core/data.js';
import * as sim from '../src/core/sim.js';

const consts = Object.fromEntries(Object.entries(sim).filter(([, v]) => typeof v === 'number'));
const cards = Object.fromEntries(Object.entries(CARDS).map(([k, c]) => [k, { id: c.id, title: c.title, who: c.who, text: c.text, options: c.options.map(o => ({ key: o.key, label: o.label, hint: o.hint })) }]));
const out = JSON.stringify({ NIGHTS, CARDS: cards, CAP, TICKER, POP_START, COAL_MAX, consts }, null, 1) + '\n';
const file = new URL('../backend/app/simdata.json', import.meta.url);
if (process.argv.includes('--check')) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== out) { console.error('backend/app/simdata.json устарел: node tools/gen-simdata.mjs'); process.exit(1); } console.log('simdata.json актуален'); }
else { fs.writeFileSync(file, out); console.log('simdata.json записан'); }
