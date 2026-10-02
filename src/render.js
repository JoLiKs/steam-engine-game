// Отрисовка сцены. Читает состояние симуляции и визуальное состояние (vis), ничего не меняет в логике.
import { C, rr, plate, rivet, rivetsRect, brassGrad, copperGrad, pipe, flange, flowDots, glassShine, icon, text, sans, wrap, drawGear, gearSprite } from './draw.js';
import { column } from './layout.js';
import { DISTRICTS, CAP, NIGHTS, TUTORIAL, COAL_MAX, POP_START } from './data.js';
import { P_GREEN, P_VENT, P_DANGER, SHOVEL_CD } from './sim.js';
import { makeRng } from './rng.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------ фон
export function makeBackground(W, H, dpr, scale) {
  const c = document.createElement('canvas'); c.width = Math.ceil(W * scale * dpr); c.height = Math.ceil(H * scale * dpr);
  const x = c.getContext('2d'); x.scale(scale * dpr, scale * dpr);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1511'); g.addColorStop(1, '#0f0b09');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // кирпичная/железная кладка из плит
  const rnd = makeRng(5);
  const bw = 90, bh = 46;
  for (let j = 0; j * bh < H + bh; j++) for (let i = -1; i * bw < W + bw; i++) {
    const ox = (j % 2) * bw / 2, px = i * bw + ox, py = j * bh;
    const v = rnd() * 10;
    x.fillStyle = `rgb(${34 + v},${27 + v * 0.8},${22 + v * 0.6})`;
    x.fillRect(px + 1, py + 1, bw - 2, bh - 2);
    x.fillStyle = 'rgba(255,230,180,.035)'; x.fillRect(px + 1, py + 1, bw - 2, 2);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 1, py + bh - 3, bw - 2, 2);
  }
  const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
  return c;
}

// ------------------------------------------------------------ город
export function makeCity(width, h, seed = 11) {
  const rnd = makeRng(seed); const blds = []; let x = -10;
  const hospAt = width * 0.16, factAt = width * 0.84;
  while (x < width + 10) {
    const w = 26 + rnd() * 34, special = (x < hospAt && x + w > hospAt) ? 'hosp' : (x < factAt && x + w > factAt) ? 'fact' : null;
    const bh = special ? h * 0.8 : 20 + rnd() * (h - 34);
    const b = { x, w, h: bh, special, wins: [], roof: rnd() < 0.5 ? 1 : 0 };
    const cols = Math.max(1, Math.floor((w - 8) / 9)), rows = Math.max(1, Math.floor((bh - 8) / 11));
    const d = special === 'hosp' ? 0 : special === 'fact' ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) b.wins.push({ x: 5 + q * 9 + (w - 8 - cols * 9) / 2 + 2, y: 6 + r * 11, rank: rnd(), d });
    blds.push(b); x += w + 2 + rnd() * 4;
  }
  return { blds, hospAt, factAt, width, h };
}
function drawCity(ctx, R) {
  const { s, L, vis, city } = R; const y0 = L.sky.y, h = L.sky.h, w = L.fullW;
  ctx.save(); ctx.translate(-L.offX, 0); ctx.beginPath(); ctx.rect(0, y0, w, h); ctx.clip();
  const smog = s.smog / 100;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, mix([14, 24, 34], [44, 36, 28], smog)); g.addColorStop(1, mix([52, 66, 74], [92, 76, 56], smog));
  ctx.fillStyle = g; ctx.fillRect(0, y0, w, h);
  // звёзды
  if (!R.reduced) { ctx.fillStyle = 'rgba(255,245,220,.5)'; const rn = makeRng(3); for (let i = 0; i < 26; i++) { const sx = rn() * w, sy = y0 + rn() * h * 0.5; if (rn() < 1 - smog) ctx.fillRect(sx, sy, 1.4, 1.4); } }
  const base = y0 + h;
  const popF = vis.popShown / POP_START;
  for (const b of city.blds) {
    const bx = b.x, by = base - b.h;
    ctx.fillStyle = b.special === 'hosp' ? '#2d2a2c' : '#1d1814'; ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = 'rgba(255,230,180,.06)'; ctx.fillRect(bx, by, b.w, 2);
    if (b.roof) { ctx.beginPath(); ctx.moveTo(bx - 1, by); ctx.lineTo(bx + b.w / 2, by - 7); ctx.lineTo(bx + b.w + 1, by); ctx.fill(); }
    for (const wn of b.wins) {
      const lit = clamp((popF - wn.rank) * 18, 0, 1);
      const sat = vis.satShown[wn.d];
      const a = lit * (0.25 + 0.75 * sat);
      if (a < 0.03) { ctx.fillStyle = '#0d0a08'; ctx.fillRect(bx + wn.x, by + wn.y, 5, 6); continue; }
      ctx.fillStyle = wn.d === 0 ? `rgba(220,245,230,${0.2 + a * 0.8})` : `rgba(255,${190 + sat * 30 | 0},${100 + sat * 30 | 0},${0.2 + a * 0.8})`;
      ctx.fillRect(bx + wn.x, by + wn.y, 5, 6);
    }
    if (b.special === 'hosp') {
      const cx = bx + b.w / 2, cy = by + 8;
      const aa = 0.35 + 0.65 * vis.satShown[0];
      ctx.fillStyle = `rgba(230,70,60,${aa})`; ctx.fillRect(cx - 2, cy - 6, 4, 12); ctx.fillRect(cx - 6, cy - 2, 12, 4);
    }
    if (b.special === 'fact') {
      ctx.fillStyle = '#17120f'; ctx.fillRect(bx + b.w - 12, by - 14, 7, 16); ctx.fillRect(bx + 4, by - 9, 6, 11);
    }
  }
  // дымок завода
  if (R.fxTick && s.flow[2] > 0.3) R.fx.smoke(city.factAt + 12 - L.offX, base - 62 * (h / 88), 1, 0.22 + s.flow[2] / 12);
  // снег
  if (!R.reduced) { ctx.fillStyle = 'rgba(240,245,250,.55)'; for (const f of vis.snow) ctx.fillRect(f.x % w, y0 + f.y, f.s, f.s); }
  // пелена дыма
  ctx.fillStyle = `rgba(70,60,50,${smog * 0.45})`; ctx.fillRect(0, y0, w, h);
  ctx.restore();
  // латунный бортик
  ctx.fillStyle = brassGrad(ctx, 0, y0 + h, 0, y0 + h + 6); ctx.fillRect(-L.offX, y0 + h, w, 5);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-L.offX, y0 + h + 5, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-L.offX, y0 - 2, w, 2);
}
function mix(a, b, t) { return `rgb(${(a[0] + (b[0] - a[0]) * t) | 0},${(a[1] + (b[1] - a[1]) * t) | 0},${(a[2] + (b[2] - a[2]) * t) | 0})`; }

// ------------------------------------------------------------ HUD
function drawHUD(ctx, R) {
  const { s, L, vis } = R; const h = L.hud;
  ctx.fillStyle = '#17110d'; ctx.fillRect(-L.offX, 0, L.fullW, h.h);
  ctx.fillStyle = brassGrad(ctx, 0, h.h - 4, 0, h.h); ctx.fillRect(-L.offX, h.h - 3, L.fullW, 3);
  const N = NIGHTS[s.night] || NIGHTS[NIGHTS.length - 1];
  const tN = s.tut && s.tut.active ? 0 : s.t / N.dur;
  const portrait = L.portrait, fs = portrait ? 13 : 17;
  const nightLabel = portrait ? `Ночь ${s.night + 1}/10` : `Ночь ${s.night + 1} из 10 · ${N.name}`;
  text(ctx, nightLabel, 12, h.h / 2 - 1, fs, C.cream);
  // прогресс ночи
  const px = portrait ? 12 : 12, pw = portrait ? 120 : 220;
  if (!portrait) { /* прогресс под заголовком */ }
  const barY = h.h - 9;
  rr(ctx, px, barY, portrait ? 130 : 260, 5, 2.5); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
  if (s.tut && s.tut.active) { sans(ctx, 'ОБУЧЕНИЕ', px + (portrait ? 132 : 264), barY + 3, 10, C.gold, 'left', '700'); }
  else { rr(ctx, px, barY, Math.max(4, (portrait ? 130 : 260) * clamp(tN, 0, 1)), 5, 2.5); ctx.fillStyle = C.brass1; ctx.fill(); }
  void pw;
  // население и уголь
  const pr = L.pause.x - 8;
  const popStr = String(Math.round(vis.popShown));
  const popCol = vis.popShown / POP_START > 0.9 ? C.cream : vis.popShown / POP_START > 0.8 ? C.yellow : C.red;
  const coalCol = s.coal < 6 ? C.red : s.coal < 14 ? C.yellow : C.cream;
  if (portrait) {
    icon(ctx, 'coal', pr - 128, h.h / 2, 14, coalCol); text(ctx, String(Math.floor(s.coal)), pr - 118, h.h / 2, 14, coalCol, 'left');
    icon(ctx, 'person', pr - 66, h.h / 2, 14, popCol); text(ctx, popStr, pr - 56, h.h / 2, 14, popCol, 'left');
  } else {
    sans(ctx, 'УГОЛЬ', pr - 270, h.h / 2 - 8, 11, C.dim, 'left', '700'); icon(ctx, 'coal', pr - 266, h.h / 2 + 9, 14, coalCol); text(ctx, String(Math.floor(s.coal)), pr - 252, h.h / 2 + 9, 17, coalCol, 'left');
    sans(ctx, 'ЖИТЕЛИ', pr - 150, h.h / 2 - 8, 11, C.dim, 'left', '700'); icon(ctx, 'person', pr - 146, h.h / 2 + 9, 14, popCol); text(ctx, popStr, pr - 132, h.h / 2 + 9, 17, popCol, 'left');
    if (R.reduced === false) { /* noop */ }
  }
  // кнопка паузы
  const pb = L.pause; plate(ctx, pb.x, pb.y, pb.w, pb.h, { r: 6, rivets: false, top: '#5a4a3b', bot: '#2b211a' });
  icon(ctx, 'pause', pb.x + pb.w / 2, pb.y + pb.h / 2, 16, C.cream);
}

// ------------------------------------------------------------ манометр
function drawGauge(ctx, R) {
  const { s, L, vis } = R; const g = L.gauge, r = g.r;
  ctx.save(); ctx.translate(g.cx, g.cy);
  // тень
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(3, 6, r + 4, 0, TAU); ctx.fill();
  // латунный корпус
  ctx.fillStyle = brassGrad(ctx, -r, -r, r, r); ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, TAU); ctx.fill();
  const fg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  fg.addColorStop(0, '#fff3d0'); fg.addColorStop(0.7, '#e4d3a4'); fg.addColorStop(1, '#bba978');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, r - 11, 0, TAU); ctx.fill();
  const a0 = 0.75 * Math.PI, sw = 1.5 * Math.PI, ang = v => a0 + clamp(v, 0, 100) / 100 * sw;
  const rb = r - 22;
  const band = (v0, v1, col) => { ctx.beginPath(); ctx.arc(0, 0, rb, ang(v0), ang(v1)); ctx.strokeStyle = col; ctx.lineWidth = r * 0.11; ctx.lineCap = 'butt'; ctx.stroke(); };
  band(0, P_GREEN[0], '#9d8f6a'); band(P_GREEN[0], P_GREEN[1], '#4d9a4a'); band(P_GREEN[1], P_VENT, '#d9a62c'); band(P_VENT, 100, '#c4402c');
  // деления
  ctx.strokeStyle = '#2a2119'; ctx.fillStyle = '#2a2119';
  for (let v = 0; v <= 100; v += 5) {
    const a = ang(v), big = v % 20 === 0, r1 = rb - r * 0.07, r2 = r1 - (big ? r * 0.12 : r * 0.06);
    ctx.lineWidth = big ? 2.2 : 1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
    if (big) { ctx.font = `bold ${Math.round(r * 0.13)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), Math.cos(a) * (r2 - r * 0.1), Math.sin(a) * (r2 - r * 0.1)); }
  }
  ctx.font = `bold ${Math.round(r * 0.12)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#4a3a2a';
  ctx.fillText('ДАВЛЕНИЕ', 0, r * 0.38); ctx.font = `${Math.round(r * 0.1)}px Georgia, serif`; ctx.fillText('атм', 0, r * 0.52);
  // цифровая подсказка
  // стрелка
  const a = ang(vis.needle);
  ctx.save(); ctx.rotate(a);
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#7a1f12'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -3); ctx.lineTo(rb - 2, -1.2); ctx.lineTo(rb + 4, 0); ctx.lineTo(rb - 2, 1.2); ctx.lineTo(-r * 0.2, 3); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = brassGrad(ctx, -8, -8, 8, 8); ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  glassShine(ctx, -r + 12, -r + 12, r * 2 - 24, r - 10, r * 0.6);
  // кольцо опасности
  if (s.danger > 0) {
    ctx.beginPath(); ctx.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.danger / 2.5, 0, 1)); ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.restore();
  // подпись состояния
  const lab = s.P > P_VENT ? 'ПРЕДОХРАНИТЕЛЬ СРАБОТАЛ' : s.P < P_GREEN[0] ? 'Мало пара' : s.P > P_GREEN[1] ? 'Высокое' : 'В норме';
  const lc = s.P > P_VENT ? C.red : s.P < P_GREEN[0] ? C.yellow : s.P > P_GREEN[1] ? C.yellow : C.green;
  const ly = g.cy + r + (L.portrait ? 14 : 18);
  text(ctx, lab, g.cx, ly, L.portrait ? 12 : 14, lc, 'center');
}

// ------------------------------------------------------------ котёл
function drawBoiler(ctx, R) {
  const { s, L, vis, time } = R; const t = L.tank;
  // труба связи манометра с котлом
  pipe(ctx, L.tankLink, L.portrait ? 8 : 10, 'brass');
  // trunk
  const tr = L.trunk;
  pipe(ctx, tr, L.portrait ? 12 : 14, 'copper');
  const tw = L.portrait ? 12 : 14;
  // сам котёл
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, t.x + 4, t.y + 6, t.w, t.h, 18); ctx.fill();
  rr(ctx, t.x, t.y, t.w, t.h, 18);
  const g = ctx.createLinearGradient(t.x, 0, t.x + t.w, 0);
  g.addColorStop(0, C.copper0); g.addColorStop(0.18, C.copper2); g.addColorStop(0.45, C.copper1); g.addColorStop(1, '#3d1c0c');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
  // перетяжки
  ctx.save(); rr(ctx, t.x, t.y, t.w, t.h, 18); ctx.clip();
  const bands = L.portrait ? [0.3, 0.72] : [0.22, 0.5, 0.78];
  for (const b of bands) { const by = t.y + t.h * b; ctx.fillStyle = brassGrad(ctx, t.x, by, t.x + t.w, by); ctx.fillRect(t.x, by - 4, t.w, 8); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(t.x, by + 4, t.w, 2); for (let i = 0; i < 6; i++) rivet(ctx, t.x + 14 + i * (t.w - 28) / 5, by, 2.3); }
  // внутреннее свечение от давления
  const glow = clamp(s.P / 100, 0, 1);
  const gr = ctx.createRadialGradient(t.x + t.w / 2, t.y + t.h * 0.6, 4, t.x + t.w / 2, t.y + t.h * 0.6, t.w * 0.8);
  gr.addColorStop(0, `rgba(255,170,80,${0.05 + glow * 0.22})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = gr; ctx.fillRect(t.x, t.y, t.w, t.h);
  ctx.restore();
  // смотровое окно с водой
  const wx = t.x + t.w * 0.5 - (L.portrait ? 26 : 30), wy = t.y + t.h * (L.portrait ? 0.34 : 0.28), ww = L.portrait ? 52 : 60, wh = L.portrait ? 34 : 58;
  rr(ctx, wx - 5, wy - 5, ww + 10, wh + 10, 8); ctx.fillStyle = brassGrad(ctx, wx, wy, wx + ww, wy + wh); ctx.fill();
  rr(ctx, wx, wy, ww, wh, 5); ctx.fillStyle = '#10222a'; ctx.fill();
  ctx.save(); rr(ctx, wx, wy, ww, wh, 5); ctx.clip();
  const lvl = 0.5 + 0.1 * Math.sin(time * 1.3) + glow * 0.1;
  ctx.fillStyle = 'rgba(79,166,184,.75)'; ctx.fillRect(wx, wy + wh * (1 - lvl), ww, wh * lvl);
  if (!R.reduced) { ctx.fillStyle = 'rgba(220,245,250,.6)'; for (let i = 0; i < 6; i++) { const f = (time * (0.3 + s.fire / 90) + i * 0.17) % 1; ctx.beginPath(); ctx.arc(wx + 6 + (i * 37 % (ww - 12)), wy + wh - f * wh * lvl, 1.6 + (i % 2), 0, TAU); ctx.fill(); } }
  ctx.restore(); glassShine(ctx, wx, wy, ww, wh, 5);
  // предохранительный клапан
  const vx = t.x + t.w * 0.72, vy = t.y - 2;
  ctx.fillStyle = brassGrad(ctx, vx - 8, vy, vx + 8, vy); ctx.fillRect(vx - 6, vy - 12, 12, 14); ctx.fillRect(vx - 10, vy - 16, 20, 6);
  ctx.restore();
  if (s.venting) R.fx.steam(vx, vy - 18, 1.2, { vy: -90, vx: 10, jx: 24, r: 6, grow: 40, life: 0.9, a: 0.55 });
  // труба-дымоход
  const ch = L.chimney; ctx.fillStyle = '#241c16'; ctx.fillRect(ch.x - 9, ch.y - 22, 18, 24); ctx.fillStyle = brassGrad(ctx, ch.x - 12, 0, ch.x + 12, 0); ctx.fillRect(ch.x - 12, ch.y - 26, 24, 6);
  void tw;
}

// ------------------------------------------------------------ топка
function flame(ctx, x, y, w, h, t, k, seed) {
  // k 0..1
  const n = 5;
  for (let layer = 0; layer < 3; layer++) {
    const cols = [C.flame0, C.flame1, C.flame2], sc = [1, 0.7, 0.4][layer];
    ctx.fillStyle = cols[layer]; ctx.globalAlpha = 0.9;
    for (let i = 0; i < n; i++) {
      const fx = x + w * (i + 0.5) / n, ph = t * (4 + i) + seed + i * 1.7;
      const hh = h * k * sc * (0.65 + 0.35 * Math.sin(ph) * Math.cos(ph * 0.7 + i));
      const ww = w / n * (0.85 - layer * 0.15);
      ctx.beginPath(); ctx.moveTo(fx - ww / 2, y); ctx.quadraticCurveTo(fx - ww * 0.45 + Math.sin(ph) * 3, y - hh * 0.55, fx + Math.sin(ph * 1.3) * 4, y - hh);
      ctx.quadraticCurveTo(fx + ww * 0.45 + Math.sin(ph) * 3, y - hh * 0.55, fx + ww / 2, y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawFurnace(ctx, R) {
  const { s, L, vis, time } = R; const f = L.furnace;
  plate(ctx, f.x, f.y, f.w, f.h, { r: 10 });
  // дверца
  const dx = f.x + 14, dy = f.y + (L.portrait ? 12 : 22), dw = f.w - 28, dh = f.h - (L.portrait ? 24 : 70);
  rr(ctx, dx - 4, dy - 4, dw + 8, dh + 8, 10); ctx.fillStyle = brassGrad(ctx, dx, dy, dx + dw, dy + dh); ctx.fill();
  rr(ctx, dx, dy, dw, dh, 7); ctx.fillStyle = '#0a0605'; ctx.fill();
  const k = clamp(vis.fireShown / 100, 0, 1);
  ctx.save(); rr(ctx, dx, dy, dw, dh, 7); ctx.clip();
  const gl = ctx.createRadialGradient(dx + dw / 2, dy + dh, 4, dx + dw / 2, dy + dh, dw * 0.8);
  gl.addColorStop(0, `rgba(255,150,40,${0.15 + k * 0.7})`); gl.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = gl; ctx.fillRect(dx, dy, dw, dh);
  // угольные брикеты
  ctx.fillStyle = '#15100d'; ctx.beginPath(); ctx.moveTo(dx, dy + dh); for (let i = 0; i <= 12; i++) ctx.lineTo(dx + dw * i / 12, dy + dh - 5 - ((i * 7) % 5)); ctx.lineTo(dx + dw, dy + dh); ctx.fill();
  if (k > 0.02) flame(ctx, dx + 4, dy + dh - 3, dw - 8, dh * 0.95, R.reduced ? time * 0.5 : time, Math.min(1, 0.15 + k * 0.9), 1.3);
  // красные угли
  ctx.fillStyle = `rgba(255,${80 + k * 100 | 0},20,${0.3 + k * 0.5})`; for (let i = 0; i < 7; i++) ctx.fillRect(dx + 6 + i * (dw - 12) / 7, dy + dh - 6, 8, 3);
  ctx.restore();
  // рамка бликов
  rr(ctx, dx, dy, dw, dh, 7); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
  // шкала жара
  const by = f.y + f.h - (L.portrait ? 0 : 38);
  if (!L.portrait) {
    const bx = f.x + 18, bw = f.w - 36;
    sans(ctx, 'ЖАР ТОПКИ', bx, by + 6, 11, C.dim, 'left', '700');
    rr(ctx, bx, by + 16, bw, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
    ctx.save(); rr(ctx, bx, by + 16, bw, 10, 5); ctx.clip();
    ctx.fillStyle = 'rgba(127,208,121,.25)'; ctx.fillRect(bx + bw * 0.25, by + 16, bw * 0.6, 10);
    ctx.fillStyle = k < 0.2 ? C.yellow : k > 0.85 ? C.red : C.copper2; ctx.fillRect(bx, by + 16, bw * k, 10); ctx.restore();
    sans(ctx, k < 0.2 ? 'остывает!' : k > 0.85 ? 'перегрев' : '', bx + bw, by + 6, 11, k < 0.2 ? C.yellow : C.red, 'right', '700');
  }
}
function drawStoker(ctx, R) {
  // силуэт кочегара и (если есть) Тимки у топки
  const { s, L, time, vis } = R; const f = L.furnace;
  const sx = f.x + (L.portrait ? -18 : f.w - 36), sy = f.y + f.h - (L.portrait ? 6 : 42);
  if (L.portrait) return drawChildOnly(ctx, R);
  const swing = vis.swing;
  ctx.save(); ctx.translate(f.x + f.w + 26, f.y + f.h - 12); ctx.fillStyle = '#0c0907';
  ctx.beginPath(); ctx.ellipse(0, -48, 12, 13, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, -30, 0, -34); ctx.quadraticCurveTo(16, -30, 14, 0); ctx.fill();
  ctx.strokeStyle = '#0c0907'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(-30 + swing * 16, -12 - swing * 8); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30 + swing * 16, -12 - swing * 8); ctx.lineTo(-50 + swing * 30, -2 - swing * 12); ctx.stroke();
  ctx.restore(); void sx; void sy; void s;
  drawChildOnly(ctx, R);
}
function drawChildOnly(ctx, R) {
  const { s, L, vis } = R; if (!s.flags.timka) return; const f = L.furnace;
  const x = L.portrait ? f.x + f.w - 18 : f.x + f.w - 4 + 66, y = f.y + f.h - 10;
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.arc(0, -34, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-10, -22, 0, -24); ctx.quadraticCurveTo(10, -22, 9, 0); ctx.fill();
  ctx.strokeStyle = '#16100c'; ctx.lineWidth = 3; const sw = vis.kidSwing;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-18 + sw * 8, -8); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------ уголь + лопата
function drawCoalAndShovel(ctx, R) {
  const { s, L, input } = R; const sv = L.shovel;
  if (L.coal) {
    const c = L.coal; plate(ctx, c.x, c.y, c.w, c.h, { r: 10 });
    sans(ctx, 'БУНКЕР', c.x + c.w / 2, c.y + 18, 12, C.dim, 'center', '700');
    const bx = c.x + 14, by = c.y + 34, bw = c.w - 28, bh = c.h - 74;
    rr(ctx, bx, by, bw, bh, 6); ctx.fillStyle = '#0b0807'; ctx.fill();
    const f = clamp(s.coal / COAL_MAX, 0, 1) ** 0.8;
    ctx.save(); rr(ctx, bx, by, bw, bh, 6); ctx.clip();
    const top = by + bh * (1 - f);
    ctx.fillStyle = '#1d1815'; ctx.fillRect(bx, top, bw, by + bh - top);
    const rn = makeRng(9);
    for (let i = 0; i < 60; i++) { const px = bx + rn() * bw, py = top + rn() * (by + bh - top); if (py < top + 2) continue; ctx.fillStyle = `rgba(${80 + rn() * 60 | 0},${75 + rn() * 50 | 0},${70 + rn() * 50 | 0},.35)`; ctx.fillRect(px, py, 3 + rn() * 4, 2 + rn() * 3); }
    ctx.fillStyle = '#2b2420'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(bx + (i + 0.5) * bw / 12, top + ((i * 5) % 4), 5, Math.PI, 0); ctx.fill(); }
    ctx.restore();
    rr(ctx, bx, by, bw, bh, 6); ctx.strokeStyle = 'rgba(255,230,180,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    const cc = s.coal < 6 ? C.red : s.coal < 14 ? C.yellow : C.cream;
    text(ctx, String(Math.floor(s.coal)), c.x + c.w / 2, c.y + c.h - 20, 22, cc, 'center');
  }
  // кнопка
  const pressed = input.shovelDown > 0;
  const cd = clamp(s.shovelCd / SHOVEL_CD, 0, 1);
  ctx.save(); ctx.translate(0, pressed ? 2 : 0);
  rr(ctx, sv.x, sv.y, sv.w, sv.h, 12); ctx.fillStyle = copperGrad(ctx, sv.x, sv.y, sv.x + sv.w, sv.y + sv.h); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.stroke();
  rr(ctx, sv.x + 3, sv.y + 3, sv.w - 6, sv.h - 6, 10); ctx.strokeStyle = 'rgba(255,230,180,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (cd > 0) { ctx.save(); rr(ctx, sv.x, sv.y, sv.w, sv.h, 12); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(sv.x, sv.y, sv.w * cd, sv.h); ctx.restore(); }
  const noCoal = s.coal < 1;
  if (L.portrait) {
    icon(ctx, 'shovel', sv.x + 36, sv.y + sv.h / 2, 30, noCoal ? C.dim : '#2a1409');
    text(ctx, noCoal ? 'УГЛЯ НЕТ' : 'ПОДБРОСИТЬ УГОЛЬ', sv.x + sv.w / 2 + 14, sv.y + sv.h / 2, 18, noCoal ? C.dim : '#2a1409', 'center', 'bold', false);
  } else {
    icon(ctx, 'shovel', sv.x + sv.w / 2, sv.y + sv.h / 2 - 28, 56, noCoal ? C.dim : '#2a1409');
    text(ctx, noCoal ? 'УГЛЯ НЕТ' : 'УГОЛЬ', sv.x + sv.w / 2, sv.y + sv.h / 2 + 22, 22, noCoal ? C.dim : '#2a1409', 'center', 'bold', false);
    sans(ctx, '[ ПРОБЕЛ ]', sv.x + sv.w / 2, sv.y + sv.h / 2 + 52, 13, '#2a1409', 'center', '800');
  }
  ctx.restore();
}

// ------------------------------------------------------------ колонки вентилей
function drawColumns(ctx, R) {
  const { s, L, vis, input, time } = R; const m = L.modules;
  // коллектор
  const col0 = column(L, 0), col3 = column(L, 3);
  const my = L.manifoldY;
  const pw = L.portrait ? 12 : 14;
  pipe(ctx, [[L.trunk[1][0], my], [Math.max(col3.cx, L.trunk[1][0]), my]], pw, 'copper');
  if (col0.cx < L.trunk[1][0]) pipe(ctx, [[col0.cx, my], [L.trunk[1][0], my]], pw, 'copper');
  for (let i = 0; i < 4; i++) {
    const c = column(L, i);
    pipe(ctx, [[c.cx, my], [c.cx, m.y + 18]], L.portrait ? 9 : 10, 'copper');
    flange(ctx, c.cx, my + (m.y - my) * 0.5 + 1, 16, 6);
    flowDots(ctx, c.cx, my + 4, c.cx, m.y + 12, vis.t * 1.4, s.flow[i] / CAP[i] * 1.2);
  }
  flowDots(ctx, L.trunk[0][0], L.trunk[0][1] - 4, L.trunk[1][0], my, vis.t * 1.2, clamp(s.flow.reduce((a, b) => a + b, 0) / 10, 0, 1));
  // колонки
  for (let i = 0; i < 4; i++) drawColumn(ctx, R, i);
  // утечки
  for (const lk of s.leaks) {
    const c = column(L, lk.pipe), lx = c.leak.x, ly = c.leak.y - (L.portrait ? 2 : 0);
    ctx.save();
    R.fx.steam(lx, ly - 4, 0.7, { vy: -70, vx: 0, jx: 40, r: 6, grow: 34, life: 0.9, a: 0.6 });
    const pulse = R.reduced ? 1 : 0.8 + 0.2 * Math.sin(time * 6);
    ctx.fillStyle = `rgba(224,82,60,${0.9})`; ctx.beginPath(); ctx.arc(lx, ly, 13 * pulse, 0, TAU); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff3d0'; ctx.stroke();
    text(ctx, '!', lx, ly + 1, 16, '#fff', 'center', 'bold', false);
    ctx.restore();
  }
}

function drawColumn(ctx, R, i) {
  const { s, L, vis, input, time } = R; const c = column(L, i), d = DISTRICTS[i];
  const por = L.portrait;
  plate(ctx, c.x, c.y, c.w, c.h, { r: 9, inset: 6, rr: 2, step: 60 });
  const selected = input.sel === i;
  if (selected) { rr(ctx, c.x - 2, c.y - 2, c.w + 4, c.h + 4, 11); ctx.lineWidth = 3; ctx.strokeStyle = C.gold; ctx.stroke(); }
  // заголовок
  icon(ctx, d.icon, c.cx, c.y + (por ? 17 : 21), por ? 17 : 22, C.cream);
  text(ctx, d.name, c.cx, c.y + (por ? 36 : 44), por ? 12 : 15, C.cream, 'center');
  // номер клавиши
  if (!por) { rr(ctx, c.x + 8, c.y + 8, 20, 20, 5); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill(); sans(ctx, String(i + 1), c.x + 18, c.y + 18.5, 12, C.gold, 'center', '800'); }
  // шахта
  const tx = c.cx, y0 = c.ty0, y1 = c.ty1, tw = por ? 16 : 20;
  rr(ctx, tx - tw / 2, y0 - 6, tw, y1 - y0 + 12, tw / 2); ctx.fillStyle = '#0b0807'; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,180,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  const val = s.valves[i], vy = y1 - (y1 - y0) * val;
  // шкала справа/слева
  ctx.strokeStyle = 'rgba(255,230,180,.25)'; ctx.lineWidth = 1;
  for (let k = 0; k <= 10; k++) { const yy = y1 - (y1 - y0) * k / 10, lw = k % 5 === 0 ? 7 : 4; ctx.beginPath(); ctx.moveTo(tx + tw / 2 + 3, yy); ctx.lineTo(tx + tw / 2 + 3 + lw, yy); ctx.stroke(); }
  // заливка пара
  ctx.save(); rr(ctx, tx - tw / 2, y0 - 6, tw, y1 - y0 + 12, tw / 2); ctx.clip();
  const sg = ctx.createLinearGradient(0, vy, 0, y1); sg.addColorStop(0, 'rgba(235,245,240,.9)'); sg.addColorStop(1, 'rgba(120,170,180,.55)');
  ctx.fillStyle = sg; ctx.fillRect(tx - tw / 2, vy, tw, y1 - vy + 8); ctx.restore();
  // отметка потребности
  const need = Math.min(1, s.needNow[i] / CAP[i]), ny = y1 - (y1 - y0) * need;
  const nCol = Math.abs(val - need) < 0.06 ? C.green : C.gold;
  ctx.fillStyle = nCol; ctx.beginPath();
  ctx.moveTo(tx - tw / 2 - 3, ny); ctx.lineTo(tx - tw / 2 - 12, ny - 6); ctx.lineTo(tx - tw / 2 - 12, ny + 6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx + tw / 2 + 3, ny); ctx.lineTo(tx + tw / 2 + 12, ny - 6); ctx.lineTo(tx + tw / 2 + 12, ny + 6); ctx.closePath(); ctx.fill();
  ctx.fillRect(tx - tw / 2 - 3, ny - 1, tw + 6, 2);
  if (!por && i === 0) sans(ctx, 'нужно', c.x + c.w - 6, ny - 11, 11, C.gold, 'right', '700');
  // штурвал
  const wr = por ? 15 : 19;
  ctx.save(); ctx.translate(tx, vy);
  ctx.rotate(val * 9 + (vis.wheelKick[i] || 0));
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(2, 3, wr, 0, TAU); ctx.fill();
  ctx.strokeStyle = brassGrad(ctx, -wr, -wr, wr, wr); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, wr - 3, 0, TAU); ctx.stroke();
  ctx.lineWidth = 3.4; ctx.strokeStyle = '#a98332';
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (wr - 3), Math.sin(a) * (wr - 3)); ctx.stroke(); }
  ctx.fillStyle = copperGrad(ctx, -6, -6, 6, 6); ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = C.red; ctx.fillRect(wr - 5, -1.5, 5, 3);
  ctx.restore();
  if (selected) { ctx.beginPath(); ctx.arc(tx, vy, wr + 4, 0, TAU); ctx.strokeStyle = 'rgba(255,211,107,.7)'; ctx.lineWidth = 2; ctx.stroke(); }
  // процент открытия
  sans(ctx, Math.round(val * 100) + '%', c.cx, y1 + (por ? 16 : 19), por ? 12 : 14, C.cream, 'center', '700');
  // снабжение
  const sat = vis.satShown[i];
  const by = c.y + c.h - (por ? 30 : 34), bx = c.x + 8, bw = c.w - 16;
  const satCol = sat >= 0.85 ? C.green : sat >= 0.6 ? C.yellow : C.red;
  rr(ctx, bx, by, bw, por ? 9 : 11, 4.5); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
  rr(ctx, bx, by, Math.max(5, bw * sat), por ? 9 : 11, 4.5); ctx.fillStyle = satCol; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(bx + bw * 0.85 - 0.5, by - 1, 1, (por ? 9 : 11) + 2);
  // доп. индикатор
  const ly = by + (por ? 20 : 24);
  if (i === 2) { const fw = s.fw / 100, wc = s.burnT > 0 ? C.red : fw > 0.75 ? C.red : fw > 0.5 ? C.yellow : C.green; meter(ctx, bx, ly - 6, bw, por ? 'устал.' : 'усталость', fw, wc, por); }
  else if (i === 3) { const sm = s.smog / 100; meter(ctx, bx, ly - 6, bw, 'дым', sm, sm > 0.65 ? C.red : sm > 0.35 ? C.yellow : C.green, por); }
  else if (i === 0) sans(ctx, sat > 0.85 ? 'тепло' : sat > 0.6 ? 'прохладно' : 'ВЫМИРАЮТ', c.cx, ly, por ? 11 : 13, satCol, 'center', '700');
  else sans(ctx, sat > 0.85 ? 'тепло' : sat > 0.6 ? 'зябко' : 'ЗАМЕРЗАЮТ', c.cx, ly, por ? 11 : 13, satCol, 'center', '700');
  if (i === 2 && s.burnT > 0) { sans(ctx, 'СМЕНА ПАЛА', c.cx, c.y + (por ? 52 : 62), por ? 10 : 12, C.red, 'center', '800'); }
  // подсветка обучения
  if (R.tutHint === 'v' + i) pulseRing(ctx, c.x - 3, c.y - 3, c.w + 6, c.h + 6, time, R.reduced);
}
function meter(ctx, x, y, w, label, v, col, por) {
  sans(ctx, label, x, y, por ? 10 : 12, C.dim, 'left', '700');
  const bx = x + (por ? 40 : 66), bw = w - (por ? 40 : 66);
  rr(ctx, bx, y - 4, bw, 9, 4.5); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
  rr(ctx, bx, y - 4, Math.max(4, bw * clamp(v, 0, 1)), 9, 4.5); ctx.fillStyle = col; ctx.fill();
}
export function pulseRing(ctx, x, y, w, h, time, reduced) {
  ctx.save(); const a = reduced ? 1 : 0.55 + 0.45 * Math.sin(time * 4);
  rr(ctx, x, y, w, h, 12); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,211,107,${a})`; ctx.setLineDash([10, 6]); ctx.lineDashOffset = reduced ? 0 : -time * 20; ctx.stroke(); ctx.restore();
}

// ------------------------------------------------------------ нижняя панель сообщений
function drawMessages(ctx, R) {
  const { s, L, log, time } = R; const m = L.msg;
  plate(ctx, m.x, m.y, m.w, m.h, { r: 10, top: '#2c231b', bot: '#17110d', rivets: !L.portrait });
  const px = m.x + 14, pw = m.w - 28;
  if (s.tut && s.tut.active) {
    const step = TUTORIAL[s.tut.step];
    sans(ctx, `ОБУЧЕНИЕ · шаг ${Math.min(s.tut.step + 1, TUTORIAL.length - 1)} из ${TUTORIAL.length - 1}`, px, m.y + 18, L.portrait ? 12 : 13, C.gold, 'left', '800');
    const fs = L.portrait ? 16 : 19; ctx.font = `bold ${fs}px Georgia, serif`;
    const lines = wrap(ctx, step.text, pw);
    lines.slice(0, 4).forEach((ln, k) => text(ctx, ln, px, m.y + 42 + k * (fs + 5), fs, C.cream, 'left', 'bold', false));
    return;
  }
  const maxLines = Math.max(2, Math.floor((m.h - 20) / (L.portrait ? 38 : 40)));
  const shown = log.slice(-maxLines);
  let yy = m.y + 14; const fs = L.portrait ? 14 : 16;
  if (!shown.length) sans(ctx, 'Держите давление в зелёной зоне. Берегите людей.', px, m.y + 22, fs - 1, C.dim, 'left', '600');
  shown.forEach((e) => {
    const age = time - e.at, a = e.kind === 'talk' ? 1 : 1; ctx.globalAlpha = a * clamp(1 - (age - 20) / 8, 0.45, 1);
    ctx.font = `bold ${fs}px Georgia, serif`;
    const who = e.who ? e.who + ': ' : ''; const wW = ctx.measureText(who).width;
    ctx.font = `${fs}px Georgia, serif`;
    const lines = wrap(ctx, e.text, pw - wW);
    lines.slice(0, 2).forEach((ln, k) => {
      if (k === 0 && who) text(ctx, who, px, yy + 9, fs, e.col || C.gold, 'left', 'bold', false);
      text(ctx, ln, px + (k === 0 ? wW : 0), yy + 9 + k * (fs + 3), fs, e.kind === 'warn' ? C.yellow : C.cream, 'left', 'normal', false);
    });
    yy += (lines.length > 1 ? 2 : 1) * (fs + 3) + 6; ctx.globalAlpha = 1;
  });
  void s;
}

// ------------------------------------------------------------ баннер события
function drawBanner(ctx, R) {
  const b = R.banner; if (!b) return; const age = R.time - b.at; if (age > 4.5) return;
  const L = R.L; const k = age < 0.4 ? age / 0.4 : age > 3.8 ? (4.5 - age) / 0.7 : 1;
  const w = Math.min(L.W - 24, 460), h = 40, x = (L.W - w) / 2, y = L.sky.y + L.sky.h + 12 - (1 - k) * 30;
  ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
  rr(ctx, x, y, w, h, 8); ctx.fillStyle = 'rgba(32,22,14,.94)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.brass1; ctx.stroke();
  icon(ctx, 'drop', x + 24, y + h / 2, 16, C.water);
  text(ctx, b.label, x + 44, y + h / 2, L.portrait ? 14 : 16, C.cream, 'left', 'bold', false);
  ctx.restore();
}

// ------------------------------------------------------------ главная функция
export function drawScene(ctx, R) {
  const { L } = R;
  ctx.save();
  drawCity(ctx, R);
  // шестерни на стене
  for (const g of R.gears) drawGear(ctx, g.x, g.y, g.r, g.n, g.rot, g.kind, g.a, R.dpr * R.scale);
  drawHUD(ctx, R);
  drawGauge(ctx, R);
  drawBoiler(ctx, R);
  drawFurnace(ctx, R);
  drawStoker(ctx, R);
  drawCoalAndShovel(ctx, R);
  drawColumns(ctx, R);
  drawMessages(ctx, R);
  if (R.tutHint === 'shovel') pulseRing(ctx, L.shovel.x - 3, L.shovel.y - 3, L.shovel.w + 6, L.shovel.h + 6, R.time, R.reduced);
  if (R.tutHint === 'gauge') pulseRing(ctx, L.gauge.cx - L.gauge.r - 8, L.gauge.cy - L.gauge.r - 8, L.gauge.r * 2 + 16, L.gauge.r * 2 + 16, R.time, R.reduced);
  if (R.tutHint === 'leak') for (const lk of R.s.leaks) { const c = column(L, lk.pipe); pulseRing(ctx, c.leak.x - 22, c.leak.y - 22, 44, 44, R.time, R.reduced); }
  drawBanner(ctx, R);
  R.fx.draw(ctx);
  // опасность
  if (R.s.P > P_VENT - 4 || R.s.danger > 0) {
    const k = clamp((R.s.P - (P_VENT - 4)) / 12, 0, 1);
    const pulse = R.reduced ? 0.7 : 0.7 + 0.3 * Math.sin(R.time * 4);
    const vg = ctx.createRadialGradient(L.W / 2, L.H / 2, Math.min(L.W, L.H) * 0.4, L.W / 2, L.H / 2, Math.max(L.W, L.H) * 0.8);
    vg.addColorStop(0, 'rgba(200,40,20,0)'); vg.addColorStop(1, `rgba(200,40,20,${0.35 * k * pulse})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, L.W, L.H);
  }
  ctx.restore();
}
