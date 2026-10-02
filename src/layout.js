// Вычисляет раскладку сцены в логических координатах. Две раскладки: книжная (телефон) и альбомная (десктоп).
export const MIN_P = { w: 400, h: 860 };
export const MIN_L = { w: 1100, h: 700 };

export function viewFor(cssW, cssH) {
  const portrait = cssW / cssH < 0.95;
  const m = portrait ? MIN_P : MIN_L;
  const scale = Math.min(cssW / m.w, cssH / m.h);
  return { portrait, scale, W: cssW / scale, H: cssH / scale };
}

export function makeLayout(fullW, H, portrait) {
  if (portrait) {
    const W = Math.min(fullW, 520), w = W;
    const L = {
      portrait, W, H, fullW, offX: (fullW - W) / 2,
      hud: { x: 0, y: 0, w: W, h: 46 },
      sky: { x: 0, y: 46, w: W, h: 78 },
      gauge: { cx: 102, cy: 224, r: 84 },
      tank: { x: 200, y: 134, w: 190, h: 100 },
      furnace: { x: 200, y: 242, w: 190, h: 72 },
      coal: null,
      shovel: { x: 16, y: 648, w: w - 32, h: 64 },
      manifoldY: 338,
      modules: { x: 8, y: 372, w: w - 16, h: 268 },
      msg: { x: 12, y: 722, w: w - 24, h: Math.max(90, H - 722 - 8) },
      pause: { x: W - 42, y: 5, w: 36, h: 36 },
    };
    L.trunkX = 188;
    L.trunk = [[188, L.tank.y + L.tank.h * 0.55], [188, L.manifoldY]];
    L.tankLink = [[L.tank.x, L.tank.y + L.tank.h * 0.55], [L.gauge.cx + L.gauge.r - 10, L.tank.y + L.tank.h * 0.55]];
    L.chimney = { x: L.tank.x + L.tank.w * 0.75, y: L.tank.y - 6 };
    return L;
  }
  const mw = Math.min(fullW - 590, 800), W = 590 + mw;
  const L = {
    portrait, W, H, fullW, offX: (fullW - W) / 2,
    hud: { x: 0, y: 0, w: W, h: 52 },
    sky: { x: 0, y: 52, w: W, h: 88 },
    gauge: { cx: 190, cy: 300, r: 120 },
    tank: { x: 335, y: 190, w: 190, h: 232 },
    furnace: { x: 30, y: 458, w: 250, h: 210 },
    coal: { x: 290, y: 458, w: 100, h: 210 },
    shovel: { x: 400, y: 458, w: 125, h: 210 },
    manifoldY: 172,
    modules: { x: 570, y: 206, w: mw, h: 362 },
    msg: { x: 570, y: 580, w: mw, h: Math.max(100, H - 580 - 16) },
    pause: { x: W - 48, y: 8, w: 38, h: 38 },
  };
  L.trunkX = L.tank.x + L.tank.w * 0.8;
  L.trunk = [[L.tank.x + L.tank.w * 0.8, L.tank.y], [L.tank.x + L.tank.w * 0.8, L.manifoldY]];
  L.tankLink = [[L.tank.x, L.tank.y + L.tank.h * 0.5], [L.gauge.cx + L.gauge.r - 10, L.tank.y + L.tank.h * 0.5]];
  L.chimney = { x: L.tank.x + L.tank.w * 0.3, y: L.tank.y - 6 };
  return L;
}

// геометрия колонки вентиля i
export function column(L, i) {
  const m = L.modules, gap = L.portrait ? 6 : 14;
  const cw = (m.w - gap * 3) / 4;
  const x = m.x + i * (cw + gap);
  const head = L.portrait ? 42 : 52;
  const ty0 = m.y + head + 34, ty1 = m.y + m.h - (L.portrait ? 62 : 72);
  return { x, y: m.y, w: cw, h: m.h, cx: x + cw / 2, head, ty0, ty1, leak: { x: x + cw / 2, y: L.manifoldY + (m.y - L.manifoldY) * 0.55 } };
}

export const MAX_CONTENT = { portrait: 520, landscape: 1350 };
export function contentFor(W, H, portrait) {
  const cw = portrait ? Math.min(W, MAX_CONTENT.portrait) : Math.min(W, MAX_CONTENT.landscape);
  return { cw, offX: (W - cw) / 2 };
}
