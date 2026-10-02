// Процедурная отрисовка латунных/медных деталей. Всё — Canvas 2D, никаких картинок.
export const C = {
  bg0: '#14100d', bg1: '#1d1713', iron0: '#2a2119', iron1: '#3a2e25', iron2: '#4b3c30',
  brass0: '#7d5f21', brass1: '#c9a24a', brass2: '#f0d37e', copper0: '#6e371c', copper1: '#b8693a', copper2: '#e39a62',
  steam: '#e9f0ec', cream: '#f1e6c8', text: '#f3e7c9', dim: '#b7a98b', green: '#7fd079', yellow: '#f0c24a', red: '#e0523c',
  water: '#4fa6b8', coal: '#1a1512', flame0: '#ff5a1f', flame1: '#ffb13a', flame2: '#fff0a0', gold: '#ffd36b',
};

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function brassGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.brass2); g.addColorStop(0.35, C.brass1); g.addColorStop(0.7, C.brass0); g.addColorStop(1, C.brass1);
  return g;
}
export function copperGrad(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.copper2); g.addColorStop(0.4, C.copper1); g.addColorStop(1, C.copper0);
  return g;
}

export function rivet(ctx, x, y, r = 2.6) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0.2, x, y, r);
  g.addColorStop(0, '#f6e3a6'); g.addColorStop(0.5, '#a98332'); g.addColorStop(1, '#3d2c10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}
export function rivetsRect(ctx, x, y, w, h, inset = 6, r = 2.4, step = 40) {
  const nx = Math.max(1, Math.round((w - inset * 2) / step)), ny = Math.max(1, Math.round((h - inset * 2) / step));
  for (let i = 0; i <= nx; i++) { const px = x + inset + (w - inset * 2) * i / nx; rivet(ctx, px, y + inset, r); rivet(ctx, px, y + h - inset, r); }
  for (let j = 1; j < ny; j++) { const py = y + inset + (h - inset * 2) * j / ny; rivet(ctx, x + inset, py, r); rivet(ctx, x + w - inset, py, r); }
}

// Железная пластина с клёпками и фаской
export function plate(ctx, x, y, w, h, o = {}) {
  const r = o.r ?? 8;
  ctx.save();
  rr(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.top ?? C.iron2); g.addColorStop(1, o.bot ?? C.iron0);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = o.edge ?? 'rgba(0,0,0,.6)'; ctx.stroke();
  rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r - 1);
  ctx.lineWidth = 1; ctx.strokeStyle = o.hi ?? 'rgba(255,230,170,.16)'; ctx.stroke();
  if (o.rivets !== false) rivetsRect(ctx, x, y, w, h, o.inset ?? 7, o.rr ?? 2.2, o.step ?? 46);
  ctx.restore();
}

export function brassFrame(ctx, x, y, w, h, t = 5, r = 8) {
  ctx.save();
  rr(ctx, x, y, w, h, r); ctx.fillStyle = brassGrad(ctx, x, y, x + w, y + h); ctx.fill();
  rr(ctx, x + t, y + t, w - t * 2, h - t * 2, Math.max(2, r - 3)); ctx.fillStyle = '#000'; ctx.globalCompositeOperation = 'destination-out'; ctx.fill();
  ctx.restore();
}

// Шестерня как путь
export function gearPath(ctx, r, teeth, depth = 0.16, hole = 0.28) {
  const n = teeth * 2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 6.2832, a1 = ((i + 1) / n) * 6.2832, rr0 = i % 2 ? r : r * (1 + depth);
    const aa = a0 + (a1 - a0) * 0.15, ab = a0 + (a1 - a0) * 0.85;
    const rin = i % 2 ? r : r * (1 + depth);
    ctx.lineTo(Math.cos(aa) * rin, Math.sin(aa) * rin); ctx.lineTo(Math.cos(ab) * rin, Math.sin(ab) * rin);
    void rr0;
  }
  ctx.closePath();
  ctx.moveTo(r * hole, 0); ctx.arc(0, 0, r * hole, 0, 6.2832, true);
}

const gearCache = new Map();
// Предрисованная шестерня (латунь/медь/железо) как offscreen-canvas
export function gearSprite(r, teeth, kind = 'iron', dpr = 1) {
  const key = `${Math.round(r)}|${teeth}|${kind}|${dpr}`;
  let c = gearCache.get(key); if (c) return c;
  const size = Math.ceil(r * 2.5 * dpr);
  c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); x.scale(dpr, dpr); x.translate(size / 2 / dpr, size / 2 / dpr);
  const pal = { iron: ['#5a4a3b', '#2b211a', '#1a130e'], brass: ['#f0d37e', '#a98332', '#5a4012'], copper: ['#e39a62', '#a85a2c', '#4e2410'] }[kind];
  gearPath(x, r, teeth);
  const g = x.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
  g.addColorStop(0, pal[0]); g.addColorStop(0.6, pal[1]); g.addColorStop(1, pal[2]);
  x.fillStyle = g; x.fill('evenodd');
  x.lineWidth = 1.5; x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke();
  // спицы
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = Math.max(2, r * 0.07);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35); x.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); x.stroke(); }
  x.beginPath(); x.arc(0, 0, r * 0.82, 0, 6.2832); x.lineWidth = 2; x.stroke();
  x.fillStyle = 'rgba(255,240,200,.18)'; x.beginPath(); x.arc(-r * 0.2, -r * 0.25, r * 0.5, 3.6, 5.2); x.lineTo(0, 0); x.fill();
  gearCache.set(key, c); return c;
}
export function drawGear(ctx, x, y, r, teeth, rot, kind, alpha = 1, dpr = 1) {
  const spr = gearSprite(r, teeth, kind, dpr), s = spr.width / dpr;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.restore();
}

// Труба (линия с объёмом)
export function pipe(ctx, pts, w = 12, kind = 'copper') {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
  const cols = kind === 'copper' ? ['#2a130a', C.copper0, C.copper1, C.copper2] : ['#1a1208', C.brass0, C.brass1, C.brass2];
  path(); ctx.strokeStyle = cols[0]; ctx.lineWidth = w + 4; ctx.stroke();
  path(); ctx.strokeStyle = cols[1]; ctx.lineWidth = w; ctx.stroke();
  path(); ctx.strokeStyle = cols[2]; ctx.lineWidth = w * 0.62; ctx.stroke();
  path(); ctx.strokeStyle = cols[3]; ctx.lineWidth = w * 0.18; ctx.globalAlpha = 0.7; ctx.translate(-w * 0.12, -w * 0.12); ctx.stroke();
  ctx.restore();
}
export function flange(ctx, x, y, w = 18, h = 7) {
  ctx.save(); rr(ctx, x - w / 2, y - h / 2, w, h, 2); ctx.fillStyle = brassGrad(ctx, x - w / 2, y, x + w / 2, y); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
// Бегущие «капли пара» вдоль отрезка
export function flowDots(ctx, x0, y0, x1, y1, t, amount, col = 'rgba(240,246,242,0.85)') {
  if (amount <= 0.02) return;
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 14));
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const f = ((i / n) + t * (0.4 + amount * 0.9)) % 1;
    ctx.globalAlpha = Math.min(1, amount * 1.2) * 0.8;
    ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 1.6 + amount * 1.6, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Стеклянный блик
export function glassShine(ctx, x, y, w, h, r = 6) {
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.35, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
}

// ----- иконки (центр x,y, размер s)
export function icon(ctx, name, x, y, s, col = C.cream) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const h = s / 2;
  if (name === 'cross') { const t = s * 0.26; ctx.fillRect(-t / 2, -h, t, s); ctx.fillRect(-h, -t / 2, s, t); }
  else if (name === 'house') { ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(0, -h); ctx.lineTo(h, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(-h * 0.7, 0, s * 0.7, h); ctx.fillStyle = '#2a2119'; ctx.fillRect(-h * 0.2, h * 0.15, h * 0.4, h * 0.85); }
  else if (name === 'factory') { ctx.beginPath(); ctx.moveTo(-h, h); ctx.lineTo(-h, -h * 0.1); ctx.lineTo(-h * 0.3, h * 0.25); ctx.lineTo(-h * 0.3, -h * 0.1); ctx.lineTo(h * 0.3, h * 0.25); ctx.lineTo(h * 0.3, -h * 0.1); ctx.lineTo(h, h * 0.25); ctx.lineTo(h, h); ctx.closePath(); ctx.fill(); ctx.fillRect(h * 0.35, -h, h * 0.4, h * 1.1); }
  else if (name === 'filter') { ctx.beginPath(); ctx.arc(0, h * 0.2, h * 0.75, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-h * 0.5, h * 0.2); ctx.lineTo(h * 0.5, h * 0.2); ctx.moveTo(-h * 0.35, -h * 0.15); ctx.lineTo(h * 0.35, -h * 0.15); ctx.moveTo(-h * 0.35, h * 0.55); ctx.lineTo(h * 0.35, h * 0.55); ctx.stroke(); }
  else if (name === 'person') { ctx.beginPath(); ctx.arc(0, -h * 0.5, h * 0.38, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.arc(0, h * 0.95, h * 0.85, Math.PI, 0); ctx.fill(); }
  else if (name === 'coal') { ctx.beginPath(); ctx.moveTo(-h, h * 0.6); ctx.lineTo(-h * 0.6, -h * 0.3); ctx.lineTo(0, -h * 0.9); ctx.lineTo(h * 0.7, -h * 0.2); ctx.lineTo(h, h * 0.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.5); ctx.lineTo(0, 0); ctx.lineTo(h * 0.4, -h * 0.1); ctx.stroke(); }
  else if (name === 'pause') { ctx.fillRect(-h * 0.55, -h * 0.7, h * 0.4, s * 0.7); ctx.fillRect(h * 0.15, -h * 0.7, h * 0.4, s * 0.7); }
  else if (name === 'shovel') { ctx.beginPath(); ctx.moveTo(-h * 0.2, -h); ctx.lineTo(h * 0.2, h * 0.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-h * 0.1, h * 0.05); ctx.lineTo(h * 0.7, h * 0.2); ctx.lineTo(h * 0.45, h * 0.95); ctx.lineTo(-h * 0.5, h * 0.7); ctx.closePath(); ctx.fill(); }
  else if (name === 'drop') { ctx.beginPath(); ctx.moveTo(0, -h); ctx.quadraticCurveTo(h, h * 0.3, 0, h); ctx.quadraticCurveTo(-h, h * 0.3, 0, -h); ctx.fill(); }
  ctx.restore();
}

export function text(ctx, str, x, y, size, col = C.text, align = 'left', weight = 'bold', stroke = true) {
  ctx.font = `${weight} ${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = col; ctx.fillText(str, x, y);
}
export function sans(ctx, str, x, y, size, col = C.text, align = 'left', weight = '600') {
  ctx.font = `${weight} ${size}px system-ui, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(str, x, y);
}
export function wrap(ctx, str, maxW) {
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
