// Процедурный звук на WebAudio: пар, шестерни, поршни, клапаны и музыкальная петля.
// Никаких файлов — всё синтезируется на лету.
import { makeRng } from '../core/rng.js';

// Громкость 0..1 (положение ползунка) → усиление. Логарифмическая кривая: диапазон 40 дБ, 0 — полная тишина.
export const DB_RANGE = 40;
export function volCurve(v) {
  v = Math.max(0, Math.min(1, +v || 0));
  return v <= 0.001 ? 0 : Math.pow(10, -(DB_RANGE / 20) * (1 - v));
}
export const SFX_MAX = 2.2, MUSIC_MAX = 1.6; // усиление при ползунке на 100%

export class Sound {
  // makeCtx — необязательная фабрика AudioContext (тесты подставляют мок или OfflineAudioContext)
  constructor(makeCtx) {
    this.makeCtx = makeCtx || null;
    this.ctx = null; this.enabled = true; this.sfxVol = 0.7; this.musicVol = 0.6;
    this.master = null; this.sfx = null; this.music = null; this.noiseBuf = null;
    this.hiss = null; this.rumble = null; this.musicTimer = null; this.step = 0; this.nextT = 0;
    this.musicOn = false; this.rng = makeRng(77); this.lastT = {};
    this.gestured = false; this.wantMusic = false; this.primed = null; this.keepEl = null; this.onState = null;
  }
  ensure() {
    if (this.dead) return false;
    if (this.ctx && this.ctx.state === 'closed') this.dropCtx();            // iOS иногда закрывает контекст — создадим заново на жесте
    if (this.ctx) { if (this.ctx.state !== 'running') this.tryResume(); return !!this.ctx; }
    try {
      if (this.makeCtx) this.ctx = this.makeCtx();
      else { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; this.ctx = new AC(); }
    } catch (e) { this.dead = true; return false; }
    try {
      const c = this.ctx;
      if ('onstatechange' in c) c.onstatechange = () => this.notify();       // suspended/interrupted/running → индикатор «Включить звук»
      this.master = c.createGain(); this.sfx = c.createGain(); this.music = c.createGain();
      const comp = c.createDynamicsCompressor();
      this.sfx.connect(this.master); this.music.connect(this.master); this.master.connect(comp); comp.connect(c.destination);
      this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = this.rng() * 2 - 1;
      this.applyVol(true);
      this.buildLoops();
      if (this.wantMusic && !this.musicOn) this.startMusic();               // контекст пересоздан — вернуть музыку
      if (c.state !== 'running') this.tryResume();                          // iOS: контекст, созданный даже в жесте, бывает suspended
      this.notify();
      return true;
    } catch (e) {   // частичная инициализация (редкие/старые реализации WebAudio): без звука, но игра идёт
      this.dead = true; try { this.ctx.close(); } catch (e2) { /* */ } this.ctx = null; return false;
    }
  }
  // ---- мобильный звук: жест, «разблокировка», режим «Без звука» на iOS, возобновление после сворачивания
  get state() { return this.dead ? 'dead' : !this.ctx ? 'none' : this.ctx.state; }
  // звук нужен (включён, игрок уже касался экрана), но контекст не играет — показать кнопку «Включить звук»
  needsTap() { return !this.dead && this.enabled && this.gestured && (!this.ctx || this.ctx.state !== 'running'); }
  notify() { try { if (this.onState) this.onState(this.state); } catch (e) { /* */ } }
  dropCtx() {
    try { if (this.ctx) { this.ctx.onstatechange = null; this.ctx.close(); } } catch (e) { /* */ }
    this.ctx = null; this.master = this.sfx = this.music = this.hiss = this.rumble = null; this.primed = null;
    this.wantMusic = this.wantMusic || this.musicOn; this.musicOn = false; clearInterval(this.musicTimer);
  }
  tryResume() {
    if (!this.ctx) return;
    try { const pr = this.ctx.resume(); if (pr && pr.then) pr.then(() => this.notify(), () => this.notify()); else this.notify(); } catch (e) { this.notify(); }
  }
  // вызывать ВНУТРИ жеста (pointerup / touchend / click / keydown): создаёт контекст, resume(), тихий буфер, keep-alive для iOS
  unlock() {
    this.gestured = true;
    const ok = this.ensure();
    this.prime();
    return ok;
  }
  prime() {
    if (!this.ctx || this.primed === this.ctx) return;
    this.primed = this.ctx;
    try { const c = this.ctx, b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) { /* */ }   // классическая «разблокировка» iOS
    this.keepAlive();
  }
  // iOS: переключатель «Без звука» глушит WebAudio, но не <audio> — тихий зацикленный элемент переводит страницу в «медиа»-сеанс
  keepAlive() {
    try { if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* Safari 16.4+ */ }
    try {
      // тихий <audio> нужен только на iOS/iPadOS (режим «Без звука»); на остальных платформах не рискуем лишним медиа-конвейером
      const nav = typeof navigator !== 'undefined' ? navigator : {};
      const ios = !!nav.audioSession || /iPhone|iPad|iPod/.test(nav.userAgent || '') || (/Macintosh/.test(nav.userAgent || '') && nav.maxTouchPoints > 1);
      const force = typeof window !== 'undefined' ? window.__keepAlive : undefined;   // true/false — только для тестов
      if (force === false || (!ios && !force)) return;
      if (typeof Audio === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
      if (!this.keepEl) {
        const n = 4000, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
        const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
        w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
        buf.fill(128, 44);                                            // 8-бит PCM: 128 = тишина
        const el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
        el.loop = true; el.setAttribute('playsinline', ''); el.setAttribute('aria-hidden', 'true'); this.keepEl = el;
      }
      const pr = this.keepEl.play(); if (pr && pr.catch) pr.catch(() => {});
    } catch (e) { /* без keep-alive просто остаёмся на WebAudio */ }
  }
  // вернулись во вкладку / pageshow / focus: попробовать возобновить (вне жеста может не получиться — тогда покажем кнопку)
  resumeIfNeeded() {
    if (this.dead || !this.enabled || !this.gestured) { this.notify(); return; }
    if (this.ctx && this.ctx.state === 'closed') { this.dropCtx(); this.notify(); return; }
    if (this.ctx && this.ctx.state !== 'running') this.tryResume(); else this.notify();
    if (this.keepEl && this.keepEl.paused) { try { const pr = this.keepEl.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* */ } }
  }
  // master — только общий выключатель; «Звуки» и «Музыка» — независимые узлы gain со своей кривой
  applyVol(immediate) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const put = (g, v, tc) => { if (immediate) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(v, t); } else g.gain.setTargetAtTime(v, t, tc); };
    put(this.master, this.enabled ? 1 : 0, 0.05);
    put(this.sfx, volCurve(this.sfxVol) * SFX_MAX, 0.05);
    put(this.music, volCurve(this.musicVol) * MUSIC_MAX, 0.05);
  }
  set(opts) { Object.assign(this, opts); this.applyVol(); }
  noiseSrc(loop = false) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop;
    if (!loop) s.loopStart = 0; return s;
  }
  // постоянные петли: шипение пара и гул котла
  buildLoops() {
    const c = this.ctx;
    const n = this.noiseSrc(true); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); g.connect(this.sfx); n.start();
    this.hiss = { g, f };
    const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = 'sawtooth'; o2.type = 'triangle';
    o1.frequency.value = 48; o2.frequency.value = 71;
    const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 180;
    const rg = c.createGain(); rg.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 6; const lg = c.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(rg.gain);
    o1.connect(lf); o2.connect(lf); lf.connect(rg); rg.connect(this.sfx);
    o1.start(); o2.start(); lfo.start();
    this.rumble = { g: rg, o1, o2, lfo };
  }
  // непрерывное состояние: hiss 0..1, rumble 0..1 (зависит от давления)
  ambient(hiss, rumble) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.hiss.g.gain.setTargetAtTime(this.enabled ? Math.min(0.5, hiss * 0.5) : 0, t, 0.08);
    this.hiss.f.frequency.setTargetAtTime(2200 + hiss * 2800, t, 0.1);
    this.rumble.g.gain.setTargetAtTime(Math.min(0.1, rumble * 0.1), t, 0.2);
    this.rumble.o1.frequency.setTargetAtTime(42 + rumble * 22, t, 0.3);
    this.rumble.lfo.frequency.setTargetAtTime(3 + rumble * 9, t, 0.3);
  }
  silence() { this.ambient(0, 0); }
  // --- короткие эффекты
  gate(name, ms) { const n = performance.now(); if (this.lastT[name] && n - this.lastT[name] < ms) return false; this.lastT[name] = n; return true; }
  env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  tone(freq, dur, type = 'sine', vol = 0.3, when = 0, dest, slideTo) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    this.env(g, t, 0.006, vol, dur); o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, freq, q, vol, when = 0, type = 'bandpass', dest, fto) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when;
    const s = this.noiseSrc(); s.loopStart = 0; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (fto) f.frequency.exponentialRampToValueAtTime(fto, t + dur); f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.01, vol, dur); s.connect(f); f.connect(g); g.connect(dest || this.sfx);
    s.start(t, this.rng() * 1.5, dur + 0.1);
  }
  play(name, arg) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'click': if (this.gate('click', 40)) { this.tone(900, 0.05, 'square', 0.08); this.tone(1300, 0.04, 'square', 0.05, 0.02); } break;
      case 'shovel': this.noise(0.18, 600, 1.2, 0.5); this.tone(120, 0.14, 'triangle', 0.4, 0, null, 60); this.tone(2400 + this.rng() * 600, 0.05, 'square', 0.05, 0.03); this.noise(0.5, 900, 0.5, 0.18, 0.08, 'lowpass', null, 200); break;
      case 'spill': this.noise(0.25, 300, 0.7, 0.4); this.tone(90, 0.2, 'sawtooth', 0.15, 0, null, 50); break;
      case 'nocoal': if (this.gate('nocoal', 300)) { this.tone(180, 0.15, 'square', 0.18); this.tone(140, 0.2, 'square', 0.18, 0.12); } break;
      case 'valve': if (this.gate('valve', 70)) { const f = 160 + (arg || 0) * 220; this.tone(f, 0.07, 'triangle', 0.1); this.noise(0.05, 2500, 3, 0.06); } break;
      case 'leak': this.noise(0.5, 4500, 0.8, 0.25, 0, 'highpass'); this.tone(720, 0.12, 'square', 0.1); this.tone(540, 0.16, 'square', 0.1, 0.14); break;
      case 'fix': this.tone(260, 0.1, 'triangle', 0.35, 0, null, 140); this.noise(0.14, 1600, 2, 0.3); this.tone(880, 0.12, 'sine', 0.12, 0.08); break;
      case 'vent': if (this.gate('vent', 160)) this.noise(0.22, 5200, 0.7, 0.25, 0, 'highpass'); break;
      case 'warn': if (this.gate('warn', 900)) { this.tone(660, 0.18, 'square', 0.1); this.tone(660, 0.18, 'square', 0.1, 0.26); } break;
      case 'loss': if (this.gate('loss', 900)) { this.tone(70, 0.5, 'sine', 0.35, 0, null, 40); } break;
      case 'collapse': this.tone(110, 0.8, 'sawtooth', 0.25, 0, null, 38); this.noise(0.9, 800, 0.5, 0.4, 0, 'lowpass', null, 120); break;
      case 'boom': this.noise(2.2, 400, 0.4, 0.9, 0, 'lowpass', null, 60); this.tone(60, 1.6, 'sine', 0.9, 0, null, 24); this.noise(1.4, 3000, 0.6, 0.5, 0.05, 'highpass'); break;
      case 'timka': this.noise(0.14, 700, 1.2, 0.3); this.tone(520, 0.08, 'triangle', 0.12); break;
      case 'tut': this.tone(660, 0.12, 'triangle', 0.22); this.tone(990, 0.2, 'triangle', 0.22, 0.1); break;
      case 'event': this.tone(330, 0.3, 'sawtooth', 0.12, 0, null, 300); this.tone(247, 0.4, 'sawtooth', 0.1, 0.15); break;
      case 'nightend': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.22, i * 0.13)); this.noise(0.8, 3000, 0.5, 0.1, 0, 'highpass'); break;
      case 'night': this.tone(196, 0.9, 'sawtooth', 0.12, 0, null, 150); this.noise(0.7, 500, 0.5, 0.2, 0, 'lowpass', null, 150); break;
      case 'gear': if (this.gate('gear', 90)) this.tone(1800 + this.rng() * 300, 0.025, 'square', 0.04); break;
      case 'end-good': [262, 330, 392, 523, 659, 784].forEach((f, i) => { this.tone(f, 1.2, 'triangle', 0.2, i * 0.18); this.tone(f * 2, 0.9, 'sine', 0.07, i * 0.18); }); break;
      case 'end-bitter': [262, 311, 392, 466].forEach((f, i) => this.tone(f, 1.4, 'triangle', 0.2, i * 0.3)); break;
      case 'end-fail': [196, 185, 165, 131].forEach((f, i) => this.tone(f, 1.6, 'sawtooth', 0.14, i * 0.4)); break;
    }
  }
  // --- музыка: минорная паровая «шарманка» с поршневым ритмом
  startMusic() { this.wantMusic = true; if (!this.ctx || this.musicOn) return; this.musicOn = true; this.step = 0; this.nextT = this.ctx.currentTime + 0.1; this.musicTimer = setInterval(() => this.schedule(), 120); }
  stopMusic() { this.wantMusic = false; this.musicOn = false; clearInterval(this.musicTimer); }
  setIntensity(x) { this.intensity = x; }
  schedule() {
    if (!this.ctx || !this.musicOn) return;
    const c = this.ctx, bpm = 92 + (this.intensity || 0) * 22, sp = 60 / bpm / 2; // восьмые
    while (this.nextT < c.currentTime + 0.4) {
      const st = this.step % 64, bar = Math.floor(st / 8) % 8, t = this.nextT;
      const prog = [57, 53, 48, 55, 57, 53, 52, 55]; // Am F C G Am F Em G (A=57)
      const root = prog[bar] - 24;
      // бас на сильные доли
      if (st % 4 === 0) this.mtone(midi(root), sp * 3.6, 'triangle', 0.28, t);
      if (st % 8 === 4) this.mtone(midi(root + 7), sp * 2, 'triangle', 0.16, t);
      // поршень (хлопок) и хэт-пар
      if (st % 4 === 0) this.mnoise(0.1, 220, 0.5, 0.5, t, 'lowpass');
      if (st % 2 === 1) this.mnoise(0.05, 7000, 0.7, 0.08, t, 'highpass');
      if (st % 8 === 6) this.mnoise(0.09, 1600, 1, 0.12, t, 'bandpass');
      // арпеджио «шарманки»
      const chord = [0, 3 + (bar === 1 || bar === 2 || bar === 3 || bar === 5 || bar === 7 ? 1 : 0), 7];
      const arp = [0, 2, 1, 2, 0, 1, 2, 1][st % 8];
      const nn = prog[bar] + chord[arp] + (st % 16 >= 8 ? 12 : 0);
      this.mtone(midi(nn), sp * 0.9, 'square', 0.055, t, 1500);
      // мелодия (на второй половине цикла)
      if (st >= 32) {
        const mel = [[0, 7, 0, 3, 0, 0, 5, 3], [3, 0, 5, 0, 7, 0, 5, 0], [7, 0, 0, 5, 3, 0, 2, 0], [0, 0, 3, 5, 7, 0, 0, 0]][bar % 4][st % 8];
        if (mel || st % 8 === 0) if (!(mel === 0 && st % 8 !== 0)) this.mtone(midi(prog[bar] + 12 + mel), sp * 1.7, 'sawtooth', 0.07, t, 1900);
      }
      this.nextT += sp; this.step++;
    }
  }
  mtone(f, dur, type, vol, t, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    let out = g; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; g.connect(fl); out = fl; }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); out.connect(this.music); o.start(t); o.stop(t + dur + 0.05);
  }
  mnoise(dur, freq, q, vol, t, type) {
    const c = this.ctx, s = this.noiseSrc(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.music); s.start(t, this.rng() * 1.5, dur + 0.1);
  }
}
// Звук никогда не должен ронять игру: любое исключение WebAudio в публичных методах глотается, а звук отключается.
for (const name of ['applyVol', 'set', 'ambient', 'silence', 'play', 'startMusic', 'unlock', 'prime', 'keepAlive', 'tryResume', 'resumeIfNeeded', 'stopMusic', 'setIntensity', 'schedule']) {
  const orig = Sound.prototype[name];
  Sound.prototype[name] = function (...args) { try { return orig.apply(this, args); } catch (e) { this.errors = (this.errors || 0) + 1; return undefined; } };
}
function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
