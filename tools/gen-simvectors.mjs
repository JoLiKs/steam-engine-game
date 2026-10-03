// Генерирует общие тест-векторы ядра: сид + запись команд по тикам + контрольные точки состояния (JS — эталон).
// Python-порт (backend/app/simcore.py) обязан пройти те же команды и получить те же числа. Запуск: node tools/gen-simvectors.mjs [--check]
import fs from 'node:fs';
import { createState, step, setValve, shovel, fixLeak, chooseCard, continueSummary } from '../src/core/sim.js';
import { makeRng } from '../src/core/rng.js';

const KEYS = ['t', 'clock', 'P', 'fire', 'coal', 'smog', 'pop', 'fw', 'danger', 'burnouts', 'night', 'phase', 'shovels', 'leaksFixed', 'exhaustSec', 'smogSum', 'coalMade'];
const snap = s => { const o = {}; for (const k of KEYS) o[k] = s[k]; o.valves = [...s.valves]; o.sat = [...s.sat]; o.leaks = s.leaks.map(l => [l.id, l.pipe, l.age]); o.ending = s.ending; o.rs = s.rs; return o; };

function policy(kind, rnd) {
  return (s, tick) => {
    const cmds = [];
    if (s.phase === 'summary') { cmds.push(['continue']); return cmds; }
    if (s.phase === 'card') { const o = s.card.options; cmds.push(['card', kind === 'good' ? o[0].key : o[Math.floor(rnd() * o.length)].key]); return cmds; }
    if (s.phase !== 'night') return cmds;
    if (kind === 'idle') return cmds;
    if (kind === 'reckless') { if (tick % 10 === 0) cmds.push(['shovel']); return cmds; }
    if (tick % 30 === 0) {
      for (let i = 0; i < 4; i++) {
        let v = kind === 'good' ? Math.min(1, (s.needNow[i] / [5.6, 8.5, 6.5, 3.2][i]) * (i === 3 ? 1.1 : 1.0) * 1.05) : Math.round(rnd() * 100) / 100;
        v = Math.round(v * 100) / 100; cmds.push(['valve', i, v]);
      }
    }
    const want = kind === 'good' ? 38 : 25 + rnd() * 50;
    if (s.fire < want && tick % 5 === 0) cmds.push(['shovel']);
    if (s.leaks.length && tick % 40 === 0) cmds.push(['fix', kind === 'good' ? null : s.leaks[s.leaks.length - 1].id]);
    return cmds;
  };
}
function apply(s, c) {
  if (c[0] === 'valve') setValve(s, c[1], c[2]); else if (c[0] === 'shovel') shovel(s); else if (c[0] === 'fix') fixLeak(s, c[1]);
  else if (c[0] === 'card') chooseCard(s, c[1]); else if (c[0] === 'continue') continueSummary(s);
}
const cases = [];
for (const [kind, seed] of [['good', 1], ['good', 777], ['good', 4242], ['random', 5], ['random', 99], ['random', 2026], ['idle', 3], ['reckless', 8]]) {
  const rnd = makeRng(seed * 7 + 1), pol = policy(kind, rnd), s = createState(seed, { skipTutorial: true });
  const log = [], checks = [];
  for (let tick = 0; tick < 60 * 60 * 14; tick++) {
    const cmds = pol(s, tick);
    if (cmds.length) { log.push([tick, cmds]); for (const c of cmds) apply(s, c); }
    step(s, 1 / 60); s.events.length = 0;
    if (tick % 600 === 0 || s.phase === 'ended') checks.push([tick, snap(s)]);
    if (s.phase === 'ended') break;
  }
  cases.push({ kind, seed, ticks: log.length ? undefined : 0, log, checks, ending: s.ending, final: snap(s) });
}
const out = JSON.stringify({ dt: '1/60', cases }) + '\n';
const file = new URL('../tests/fixtures/sim_vectors.json', import.meta.url);
if (process.argv.includes('--check')) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== out) { console.error('tests/fixtures/sim_vectors.json устарел: node tools/gen-simvectors.mjs'); process.exit(1); } console.log('векторы актуальны'); }
else { fs.writeFileSync(file, out); console.log('векторы записаны', (out.length / 1024).toFixed(0) + ' КБ', cases.map(c => c.kind + ':' + c.ending).join(' ')); }
