// Тесты звука: «Звуки» и «Музыка» — независимые каналы (мок AudioContext).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound, volCurve, SFX_MAX, MUSIC_MAX } from '../src/audio.js';

function mockCtx() {
  const mk = () => { const calls = []; return { gain: { value: 1, calls, setValueAtTime(v, t) { calls.push(['set', v, t]); this.value = v; }, setTargetAtTime(v, t, tc) { calls.push(['target', v, t, tc]); this.value = v; }, cancelScheduledValues() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 0 }, buffer: null, loop: false }; };
  return { currentTime: 0, sampleRate: 8000, state: 'running', destination: {}, resume() {}, createGain: mk, createOscillator: mk, createBiquadFilter: mk, createBufferSource: mk, createDynamicsCompressor: mk, createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
}
const lastTarget = g => g.gain.calls.filter(c => c[0] === 'target' || c[0] === 'set').at(-1)?.[1];
const make = () => { const s = new Sound(mockCtx); assert.ok(s.ensure()); return s; };

test('кривая громкости: тишина на нуле, логарифмическая, монотонная, 40 дБ', () => {
  assert.equal(volCurve(0), 0);
  assert.ok(Math.abs(volCurve(1) - 1) < 1e-9);
  assert.ok(Math.abs(volCurve(0.5) - 0.1) < 1e-9);          // −20 дБ на середине
  assert.ok(volCurve(0.01) < 0.012 && volCurve(0.01) > 0);   // почти тишина
  let prev = -1; for (let v = 0; v <= 100; v++) { const g = volCurve(v / 100); assert.ok(g >= prev); prev = g; }
  assert.ok(volCurve(0.9) / volCurve(0.1) > 30);             // большой динамический диапазон
});

test('слайдер «Звуки» не меняет канал музыки', () => {
  const s = make();
  s.set({ sfxVol: 0.7, musicVol: 0.4 });
  const musicBefore = lastTarget(s.music), mn = s.music.gain.calls.length;
  s.set({ sfxVol: 0.1 }); s.set({ sfxVol: 1 }); s.set({ sfxVol: 0 });
  assert.equal(lastTarget(s.music), musicBefore);
  assert.equal(lastTarget(s.music), volCurve(0.4) * MUSIC_MAX);
  assert.equal(lastTarget(s.sfx), 0);
  void mn;
});

test('слайдер «Музыка» не меняет канал звуков и master', () => {
  const s = make();
  s.set({ sfxVol: 0.7, musicVol: 0.4 });
  const sfxBefore = lastTarget(s.sfx), masterBefore = lastTarget(s.master);
  s.set({ musicVol: 0 }); s.set({ musicVol: 1 }); s.set({ musicVol: 0.2 });
  assert.equal(lastTarget(s.sfx), sfxBefore);
  assert.equal(lastTarget(s.sfx), volCurve(0.7) * SFX_MAX);
  assert.equal(lastTarget(s.master), masterBefore);
  assert.equal(lastTarget(s.master), 1);
});

test('музыка: от полной тишины до заметно громкой (≥ 30 дБ разницы между 1% и 100%)', () => {
  const s = make();
  s.set({ musicVol: 0 }); assert.equal(lastTarget(s.music), 0);
  s.set({ musicVol: 0.05 }); const quiet = lastTarget(s.music);
  s.set({ musicVol: 1 }); const loud = lastTarget(s.music);
  assert.ok(loud / quiet > 30); assert.ok(loud >= 1.5);
});

test('общий выключатель гасит master, но не трогает ползунки', () => {
  const s = make();
  s.set({ sfxVol: 0.6, musicVol: 0.6 }); const a = lastTarget(s.sfx), b = lastTarget(s.music);
  s.set({ enabled: false }); assert.equal(lastTarget(s.master), 0);
  assert.equal(lastTarget(s.sfx), a); assert.equal(lastTarget(s.music), b);
  s.set({ enabled: true }); assert.equal(lastTarget(s.master), 1);
});

