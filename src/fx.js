// Частицы (пар, искры, дым), всплывающие надписи и дрожание экрана. Чисто косметика: свой ГСЧ.
import { makeRng } from './rng.js';

const MAX = 700;
export class Fx {
  constructor() {
    this.p = []; this.texts = []; this.rng = makeRng(2024); this.reduced = false; this.shakeOn = true;
    this.shakeAmt = 0;
  }
  clear() { this.p.length = 0; this.texts.length = 0; this.shakeAmt = 0; }
  get density() { return this.reduced ? 0.35 : 1; }
  add(o) { if (this.p.length < (this.reduced ? 100 : MAX)) this.p.push(o); }
  steam(x, y, n = 1, o = {}) {
    const r = this.rng;
    n = Math.ceil(n * this.density);
    for (let i = 0; i < n; i++) {
      this.add({ k: 'steam', x: x + (r() - 0.5) * (o.spread ?? 6), y, vx: (o.vx ?? 0) + (r() - 0.5) * (o.jx ?? 18), vy: (o.vy ?? -40) * (0.6 + r() * 0.8),
        r: (o.r ?? 7) * (0.7 + r() * 0.6), grow: o.grow ?? 18, life: 0, max: (o.life ?? 1.1) * (0.7 + r() * 0.6), a: o.a ?? 0.5, col: o.col ?? '236,242,238' });
    }
  }
  sparks(x, y, n = 10, o = {}) {
    const r = this.rng; n = Math.ceil(n * this.density);
    for (let i = 0; i < n; i++) {
      const a = (o.dir ?? -Math.PI / 2) + (r() - 0.5) * (o.cone ?? 2.2), v = (o.v ?? 160) * (0.4 + r());
      this.add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.6 + r() * 1.6, life: 0, max: 0.5 + r() * 0.5, g: 380, col: o.col ?? '255,190,80' });
    }
  }
  smoke(x, y, n = 1, a = 0.35) {
    const r = this.rng; n = Math.ceil(n * this.density);
    for (let i = 0; i < n; i++) this.add({ k: 'smoke', x: x + (r() - 0.5) * 8, y, vx: 10 + r() * 14, vy: -(24 + r() * 24), r: 8, grow: 14, life: 0, max: 3 + r() * 2, a, col: '70,64,60' });
  }
  text(x, y, str, col = '#f1e6c8', size = 16) { if (this.texts.length < 20) this.texts.push({ x, y, str, col, size, life: 0, max: 1.6 }); }
  shake(a) { if (this.shakeOn && !this.reduced) this.shakeAmt = Math.max(this.shakeAmt, a); }
  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i]; q.life += dt;
      if (q.life >= q.max) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.k === 'spark') q.vy += q.g * dt; else { q.r += q.grow * dt; q.vx *= 1 - dt * 0.5; }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]; t.life += dt; t.y -= 26 * dt; if (t.life > t.max) this.texts.splice(i, 1);
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.0);
  }
  shakeOffset() {
    if (this.shakeAmt <= 0 || this.reduced || !this.shakeOn) return [0, 0];
    const a = this.shakeAmt * this.shakeAmt * 10, r = this.rng;
    return [(r() - 0.5) * a, (r() - 0.5) * a];
  }
  // pass: 'smoke' — только дым трубы (рисуется под HUD и котлом); иначе — всё остальное
  draw(ctx, pass) {
    const smokePass = pass === 'smoke';
    for (const q of this.p) {
      if ((q.k === 'smoke') !== smokePass) continue;
      const f = q.life / q.max;
      if (q.k === 'spark') {
        ctx.fillStyle = `rgba(${q.col},${1 - f})`; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r);
      } else {
        const a = q.a * Math.sin(Math.min(1, f * 6) * Math.PI / 2) * (1 - f);
        ctx.fillStyle = `rgba(${q.col},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.2832); ctx.fill();
      }
    }
    if (smokePass) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const f = t.life / t.max; ctx.globalAlpha = 1 - f * f; ctx.font = `bold ${t.size}px Georgia, serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.col; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
