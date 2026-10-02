// Мобильный звук (мок AudioContext): жест → resume, индикатор «нужен тап», interrupted/suspended/closed, ошибки не роняют игру.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/audio.js';

function fakeCtx(initial = 'suspended', opts = {}) {
  const node = () => ({ gain: { value: 1, setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, frequency: { value: 0, setTargetAtTime() {}, setValueAtTime() {} }, Q: { value: 0 }, connect() {}, start() {}, stop() {}, type: '', buffer: null, loop: false });
  const c = {
    state: initial, currentTime: 0, sampleRate: 8000, destination: {}, resumes: 0, closed: false, primes: 0,
    resume() { this.resumes++; if (opts.rejectResume) return Promise.reject(new DOMException('x', 'InvalidStateError')); return Promise.resolve().then(() => { if (!opts.stayBlocked) { this.state = 'running'; this.onstatechange && this.onstatechange(); } }); },
    close() { this.closed = true; this.state = 'closed'; return Promise.resolve(); },
    createGain: node, createOscillator: node, createBiquadFilter: node, createDynamicsCompressor: node,
    createBuffer: (ch, n) => ({ getChannelData: () => new Float32Array(n) }), createBufferSource() { const n = node(); const self = c; const st = n.start; n.start = (...a) => { if (!n.loop) self.primes++; return st(...a); }; return n; },
    onstatechange: null,
  };
  return c;
}
const tick = () => new Promise(r => setTimeout(r, 5));

test('контекст создаётся только в жесте (unlock), не при конструировании; до жеста индикатора нет', () => {
  let made = 0; const s = new Sound(() => { made++; return fakeCtx('suspended'); });
  assert.equal(made, 0); assert.equal(s.state, 'none'); assert.equal(s.needsTap(), false, 'до первого касания кнопка не нужна');
  s.unlock(); assert.equal(made, 1);
});

test('unlock в жесте: ctx создан suspended → вызван resume() → стал running; разблокирующий тихий буфер проигран', async () => {
  let ctx; const s = new Sound(() => (ctx = fakeCtx('suspended')));
  s.unlock(); assert.equal(ctx.resumes, 1, 'resume вызван сразу внутри жеста'); await tick();
  assert.equal(s.state, 'running'); assert.equal(s.needsTap(), false);
  assert.ok(ctx.primes >= 1, 'тихий буфер проигран (iOS-разблокировка)');
  const n = ctx.primes; s.unlock(); s.unlock(); assert.equal(ctx.primes, n, 'буфер не проигрывается при каждом тапе');
});

test('если после жеста контекст не running (iOS interrupted / политика) → needsTap=true, следующий жест возвращает звук', async () => {
  let ctx, blocked = true; const s = new Sound(() => (ctx = fakeCtx('interrupted', { stayBlocked: true })));
  const seen = []; s.onState = st => seen.push(st);
  s.unlock(); await tick();
  assert.equal(s.state, 'interrupted'); assert.equal(s.needsTap(), true, 'нужна кнопка «Включить звук»');
  blocked = false; ctx.resume = function () { this.state = 'running'; this.onstatechange && this.onstatechange(); return Promise.resolve(); };
  s.unlock(); await tick();
  assert.equal(s.needsTap(), false); assert.ok(seen.includes('running')); void blocked;
});

test('сворачивание/блокировка: контекст ушёл в suspended → statechange уведомляет UI; возврат во вкладку пытается resume', async () => {
  let ctx; const s = new Sound(() => (ctx = fakeCtx('suspended'))); const seen = []; s.onState = st => seen.push(st);
  s.unlock(); await tick(); assert.equal(s.state, 'running');
  ctx.state = 'suspended'; ctx.onstatechange(); assert.equal(s.needsTap(), true); assert.equal(seen.at(-1), 'suspended');
  const before = ctx.resumes; s.resumeIfNeeded(); await tick();
  assert.equal(ctx.resumes, before + 1); assert.equal(s.state, 'running'); assert.equal(s.needsTap(), false);
});

test('resume() отклонён (вне жеста) — исключения нет, индикатор остаётся', async () => {
  let ctx; const s = new Sound(() => (ctx = fakeCtx('suspended', { rejectResume: true })));
  assert.doesNotThrow(() => s.unlock()); await tick();
  assert.equal(s.needsTap(), true);
  assert.doesNotThrow(() => s.resumeIfNeeded()); await tick(); assert.equal(s.needsTap(), true);
});

test('контекст закрыт системой (closed) → на следующем жесте создаётся новый, музыка возвращается', async () => {
  const made = []; const s = new Sound(() => { const c = fakeCtx('running'); made.push(c); return c; });
  s.unlock(); s.startMusic(); assert.equal(s.musicOn, true);
  made[0].state = 'closed'; s.unlock(); await tick();
  assert.equal(made.length, 2, 'создан новый контекст'); assert.equal(s.state, 'running'); assert.equal(s.musicOn, true, 'музыка перезапущена');
  s.stopMusic();
});

test('звук выключен пользователем — кнопка «Включить звук» не нужна', async () => {
  const s = new Sound(() => fakeCtx('suspended', { stayBlocked: true })); s.unlock(); await tick();
  assert.equal(s.needsTap(), true); s.set({ enabled: false }); assert.equal(s.needsTap(), false);
});

test('AudioContext недоступен/падает → state=dead, unlock не бросает, кнопка не показывается', () => {
  const s = new Sound(() => { throw new Error('Failed to start the audio device'); });
  assert.doesNotThrow(() => s.unlock()); assert.equal(s.state, 'dead'); assert.equal(s.needsTap(), false);
});

test('keep-alive для iOS: audioSession.type = playback, тихий <audio> зациклен', () => {
  const g = globalThis; const plays = []; const hadNav = Object.getOwnPropertyDescriptor(g, 'navigator');
  Object.defineProperty(g, 'navigator', { value: { audioSession: { type: 'auto' }, userAgent: 'iPhone' }, configurable: true });
  g.Audio = class { constructor(u) { this.u = u; this.attrs = {}; } setAttribute(k, v) { this.attrs[k] = v; } play() { plays.push(this); return Promise.resolve(); } };
  g.Blob = g.Blob || class {}; g.URL.createObjectURL = () => 'blob:x';
  try {
    const s = new Sound(() => fakeCtx('running')); s.unlock();
    assert.equal(g.navigator.audioSession.type, 'playback');
    assert.equal(plays.length, 1); assert.equal(plays[0].loop, true); assert.equal('playsinline' in plays[0].attrs, true);
  } finally { delete g.Audio; if (hadNav) Object.defineProperty(g, 'navigator', hadNav); else delete g.navigator; }
});

test('на не-iOS keep-alive <audio> не создаётся', () => {
  const g = globalThis; const plays = [];
  Object.defineProperty(g, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)', maxTouchPoints: 5 }, configurable: true });
  g.Audio = class { constructor() { } setAttribute() { } play() { plays.push(1); return Promise.resolve(); } };
  try { const s = new Sound(() => fakeCtx('running')); s.unlock(); assert.equal(plays.length, 0); }
  finally { delete g.Audio; delete g.navigator; }
});
