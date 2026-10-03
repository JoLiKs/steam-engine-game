// Бот для тестов и балансировки. skill: 'good' | 'ok' | 'bad' | 'idle'
import { setValve, shovel, fixLeak, step, continueSummary, chooseCard, needNow } from './sim.js';
import { CAP, TUTORIAL } from './data.js';

const PRI = ['good', 'ok'];

export function botAct(s, skill = 'good', opts = {}) {
  if (s.phase === 'summary') { continueSummary(s); return; }
  if (s.phase === 'card') { chooseCard(s, pickChoice(s, opts)); return; }
  if (s.phase !== 'night') return;
  if (skill === 'idle') return;
  const react = opts.react ?? (skill === 'good' ? 0.35 : 0.9);
  s._botT = (s._botT || 0);
  // tutorial
  if (s.tut && s.tut.active) {
    const id = TUTORIAL[s.tut.step].id;
    const want = [0, 1, 2, 3].map(d => Math.min(1, needNow(s, d) / CAP[d]));
    if (id === 'shovel' || id === 'pressure') { if (s.fire < 30) shovel(s); return; }
    if (s.fire < 35) shovel(s);
    if (id === 'hosp') setValve(s, 0, want[0]);
    if (id === 'home') { setValve(s, 0, want[0]); setValve(s, 1, want[1]); }
    if (id === 'fact') { setValve(s, 2, want[2]); }
    if (id === 'scrub') { setValve(s, 3, want[3]); }
    if (id === 'leak') { if (s.leaks.length) fixLeak(s, null); }
    return;
  }
  if (skill === 'reckless') { if (s.fire < 98) shovel(s); for (let i = 0; i < 4; i++) setValve(s, i, 0); if (s.leaks.length) fixLeak(s, null); return; }
  if (skill === 'bad') {
    // слишком много угля, вентили открыты как попало
    if (s.fire < 90) shovel(s);
    setValve(s, 0, 0.2); setValve(s, 1, 0.3); setValve(s, 2, 1); setValve(s, 3, 0);
    return;
  }
  // решения с задержкой реакции
  if (s.clock - s._botT < react) return;
  s._botT = s.clock;
  const need = [0, 1, 2, 3].map(d => needNow(s, d));
  const want = need.map((n, d) => Math.min(1, n / CAP[d]));
  // приоритеты: госпиталь, кварталы, фильтры; завод — по необходимости угля
  const aim = skill === 'good' ? 1.0 : skill === 'stingy' ? (opts.aim ?? 0.62) : 0.85;
  setValve(s, 0, Math.min(1, want[0] * aim * 1.05));
  setValve(s, 1, Math.min(1, want[1] * aim * 1.0));
  const coalLow = s.coal < 18;
  let fact = want[2] * (coalLow ? 1.0 : 0.8);
  if (!opts.pusher) {
    if (s.fw > 70) fact = want[2] * 0.4;
    else if (s.fw > 55 && !coalLow) fact = want[2] * 0.6;
    if (s.burnT > 0) fact = 0.3;
  } else fact = want[2] * 1.1;
  setValve(s, 2, Math.min(1, fact));
  setValve(s, 3, Math.min(1, want[3] * (s.smog > 25 ? 1.3 : 1.0) * (skill === 'good' ? 1 : 0.6)));
  // утечки
  if (s.leaks.length && s.leaks[0].age > react) fixLeak(s, null);
  // топка: держим давление ~ 60
  const target = skill === 'good' ? 56 : 48;
  const flowTot = s.flow.reduce((a, b) => a + b, 0);
  const wantFire = Math.min(80, flowTot / 0.16 + (target - s.P) * 1.4 + 6);
  if (s.fire < wantFire - 7 && s.P < 80) shovel(s);
}

function pickChoice(s, opts) {
  const c = s.card.id; const p = opts.policy || 'good';
  const table = {
    good: { timka: 'ration', shift: 'refuse', brown: 'decline', sloboda: 'aid' },
    greedy: { timka: 'help', shift: 'extend', brown: 'accept', sloboda: 'keep' },
    smoky: { timka: 'ration', shift: 'refuse', brown: 'accept', sloboda: 'aid' },
    iron: { timka: 'help', shift: 'extend', brown: 'decline', sloboda: 'aid' },
  };
  return (table[p] || table.good)[c];
}

export function runGame(s, skill = 'good', opts = {}) {
  const dt = 1 / 60; let guard = 0;
  while (s.phase !== 'ended' && guard++ < 60 * 60 * 30) {
    botAct(s, skill, opts);
    step(s, dt);
    s.events.length = 0;
  }
  return s;
}
