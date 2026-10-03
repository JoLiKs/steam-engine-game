// Детерминированный ГСЧ (mulberry32). Состояние — одно uint32, поэтому оно сериализуется в сохранение.
export function nextRand(s) {
  s.rs = (s.rs + 0x6D2B79F5) >>> 0;
  let t = s.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randRange(s, a, b) { return a + (b - a) * nextRand(s); }
export function pick(s, arr) { return arr[Math.floor(nextRand(s) * arr.length) % arr.length]; }
// Независимый ГСЧ для косметики (частицы и т.п.) — не влияет на симуляцию
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
