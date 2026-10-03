// Шаринг результата: карточка-картинка (canvas → PNG), ссылки-вызовы с сидом и разбор входящих ссылок. Без пользовательского HTML — только fillText.
export const SEED_RE = /^[1-9]\d{0,9}$/;

/** Разбор ?seed=…&c=… (вызов друга) и ?daily (испытание дня). Возвращает null, если ссылки нет или она некорректна. */
export function challengeFromSearch(search) {
  const p = new URLSearchParams(search);
  if (p.has('daily')) return { kind: 'daily' };
  const seed = p.get('seed');
  if (!seed || !SEED_RE.test(seed) || +seed >= 2 ** 32) return null;
  const c = p.get('c');
  const score = c && /^\d{1,4}$/.test(c) ? Math.min(3000, +c) : 0;
  return { kind: 'seed', seed: +seed, score };
}
export function challengeLink(loc, seed, score) { return `${loc.origin}${loc.pathname}?seed=${seed >>> 0}${score > 0 ? '&c=' + Math.min(3000, Math.round(score)) : ''}`; }
export function dailyLink(loc) { return `${loc.origin}${loc.pathname}?daily`; }

export function shareText(r) {
  const base = r.mode === 'daily' ? `Испытание дня в «Последнем котле»: ${r.score} очков.` : `«Последний котёл»: ${r.score} очков, ${r.nights} ночей, ${r.pop} жителей.`;
  return base + ' Побьёте?';
}

/** Рисует карточку 1200×630. data: { score, nights, pop, endingTitle, mode, nick, seed, place? }. */
export function drawShareCard(canvas, data) {
  const W = 1200, H = 630; canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1d14'); g.addColorStop(1, '#0f0a07');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#c9a24a'; c.lineWidth = 8; c.strokeRect(24, 24, W - 48, H - 48);
  c.strokeStyle = '#6a4a14'; c.lineWidth = 2; c.strokeRect(40, 40, W - 80, H - 80);
  // манометр-эмблема
  c.save(); c.translate(180, 200); c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(0, 0, 96, 0, 7); c.fill();
  c.fillStyle = '#f1e6c8'; c.beginPath(); c.arc(0, 0, 76, 0, 7); c.fill();
  c.strokeStyle = '#7a1f12'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(48, -50); c.stroke();
  c.fillStyle = '#2a2119'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.restore();
  c.fillStyle = '#f1e6c8'; c.font = 'bold 64px Georgia, serif'; c.textBaseline = 'alphabetic';
  c.fillText('Последний котёл', 330, 190);
  c.fillStyle = '#c9a24a'; c.font = '30px Georgia, serif';
  c.fillText(data.mode === 'daily' ? 'Испытание дня' : data.mode === 'versus' ? 'Соревнование' : data.mode === 'coop' ? 'Кооператив' : 'Десять ночей зимы', 332, 240);
  c.fillStyle = '#ffd96a'; c.font = 'bold 190px Georgia, serif'; c.fillText(String(data.score), 80, 470);
  c.fillStyle = '#f1e6c8'; c.font = '34px Georgia, serif'; c.fillText('очков', 90, 520);
  c.font = '38px Georgia, serif';
  const lines = [`${data.nights} из 10 ночей`, `${data.pop} жителей выжило`, data.endingTitle || ''];
  if (data.place) lines.push(`${data.place}-е место`);
  lines.forEach((t, i) => c.fillText(t, 640, 330 + i * 56));
  c.fillStyle = '#9c8a64'; c.font = '26px Georgia, serif';
  c.fillText((data.nick ? data.nick + ' · ' : '') + 'сид ' + (data.seed >>> 0) + ' · побьёте?', 80, 580);
  return canvas;
}

/** PNG-файл из canvas (Blob) → File для Web Share API. */
export function canvasToBlob(canvas) { return new Promise(res => { try { canvas.toBlob(b => res(b), 'image/png'); } catch (e) { res(null); } }); }
