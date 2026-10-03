// Значки достижений в стиле игры: латунное кольцо, тёмная «эмаль» и штриховой глиф цвета слоновой кости. Генерируются кодом (SVG-строки без пользовательских данных).
const G = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  moon: '<path d="M16 4a8 8 0 1 0 4 14 7 7 0 0 1-4-14z"/><path d="M18 5v3M16.5 6.5h3"/>',
  flag: '<path d="M6 21V4M6 5h11l-2.5 3.5L17 12H6"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.9A5.5 5.5 0 0 0 7 9.5 4.3 4.3 0 0 0 7 18z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"/><circle cx="12" cy="12" r="6.6"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  skull: '<path d="M6 11a6 6 0 1 1 12 0c0 2-.8 3-2 3.8V18H8v-3.2C6.8 14 6 13 6 11z"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/><path d="M10.5 18v-2M13.5 18v-2"/>',
  book: '<path d="M5 5.5C7.5 4.5 10 4.7 12 6c2-1.3 4.5-1.5 7-.5V19c-2.5-1-5-.8-7 .5-2-1.3-4.5-1.5-7-.5z"/><path d="M12 6v13.5"/>',
  shield: '<path d="M12 3.5l7 2.6V12c0 4-3 7-7 8.5C8 19 5 16 5 12V6.1z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
  heart: '<path d="M12 19.5C5.5 15 3.8 11.8 3.8 9a4.2 4.2 0 0 1 8.2-1.2A4.2 4.2 0 0 1 20.2 9c0 2.8-1.7 6-8.2 10.5z"/>',
  wrench: '<path d="M14.5 4.5a4.5 4.5 0 0 0-4.2 6.2L4 17l3 3 6.3-6.3a4.5 4.5 0 0 0 6.2-4.2l-3 2-2.5-.5-.5-2.5z"/>',
  flame: '<path d="M12 3c.5 3-3.5 5-3.5 9a3.5 3.5 0 0 0 7 0c0-1.5-.7-2.4-1.5-3.4.4 2-1 2.6-1 2.6.8-3-.2-5.6-1-8.2z"/><path d="M12 21a5.5 5.5 0 0 0 5.5-5.5C17.5 12 15 10 14 8"/>',
  drop: '<path d="M12 3.5c3.6 4.3 5.6 7.2 5.6 10a5.6 5.6 0 0 1-11.2 0c0-2.8 2-5.7 5.6-10z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.4 2.4"/>',
  crown: '<path d="M4 17.5l1.6-9 4.4 4 2-6 2 6 4.4-4 1.6 9z"/><path d="M4.5 20h15"/>',
  hands: '<path d="M3.5 12.5l4-4 3 1 3-2 2.5 2L20.5 12l-3.8 4.4-3.2.9-3.5-1.4-2.5-.2z"/><path d="M8 11.5l3 3M12.5 9.5l2.5 3"/>',
  bolt: '<path d="M13.2 3L5.5 13.2h5.3L10 21l8-10.5h-5.3z"/>',
  trophy: '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5c0 3 1.2 4.6 3 5M17 5.5h2.5c0 3-1.2 4.6-3 5M12 13.5V17M8.5 20.5h7M9.5 17h5l.5 3.5h-6z"/>',
  scroll: '<path d="M7 4.5h10.5v13a2.5 2.5 0 0 1-2.5 2.5H6.5a2.5 2.5 0 0 0 2.5-2.5V6.5A2 2 0 0 0 7 4.5z"/><path d="M10 8.5h5M10 11.5h5M10 14.5h3"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  mail: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M4.5 7l7.5 6 7.5-6"/>',
  key: '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8.5M17 12v3M20.5 12v2.5"/>',
};
export const GLYPHS = Object.keys(G);
const TIER = { 1: ['#a9733b', '#5a3a1a'], 2: ['#d6ac4a', '#6a4a14'], 3: ['#f4dc86', '#8a6418'] };

/** SVG-значок 48×48. locked=true — серый «замок» без цвета (достижение ещё не получено). */
export function badge(glyph, tier = 2, locked = false) {
  const g = G[glyph] || G.star, [hi, lo] = TIER[tier] || TIER[2];
  const ring = locked ? '#59504a' : hi, ring2 = locked ? '#2d2824' : lo, ink = locked ? '#7c726a' : '#f6ead0';
  return `<svg class="ach-ic" viewBox="0 0 48 48" width="48" height="48" role="img" aria-hidden="true" focusable="false">`
    + `<defs><linearGradient id="bg${tier}${locked ? 'l' : ''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ring}"/><stop offset="1" stop-color="${ring2}"/></linearGradient></defs>`
    + `<circle cx="24" cy="24" r="22" fill="url(#bg${tier}${locked ? 'l' : ''})" stroke="#1a120b" stroke-width="2"/>`
    + `<circle cx="24" cy="24" r="17" fill="#1d1510" stroke="${ring2}" stroke-width="1.5"/>`
    + `<g transform="translate(10.5 10.5) scale(1.125)" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${g}</g>`
    + `<g fill="${ring}" opacity="${locked ? 0.4 : 0.9}"><circle cx="24" cy="4.6" r="1.2"/><circle cx="24" cy="43.4" r="1.2"/><circle cx="4.6" cy="24" r="1.2"/><circle cx="43.4" cy="24" r="1.2"/></g></svg>`;
}
