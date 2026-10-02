// Счёт прохождения. Формула ОБЯЗАТЕЛЬНО совпадает с backend/app/scoring.py (общие тестовые векторы: tests/score_vectors.json).
//   счёт = ночи×100 + жители/2 + бонус концовки − падения смены×25 − средний дым (%)
export const ENDING_BONUS = { light: 300, smoke: 150, iron: 150, cold: 50, boom: 0, silence: 0 };
export function computeScore({ nights, pop, ending, burnouts = 0, smog = 0 }) {
  return Math.max(0, nights * 100 + Math.round(pop / 2) + (ENDING_BONUS[ending] || 0) - burnouts * 25 - smog);
}
// сколько ночей пройдено к моменту концовки: взрыв/тишина происходят ВО ВРЕМЯ ночи s.night (0-based), остальные — после 10-й
export function nightsDone(s) { return s.ending === 'boom' || s.ending === 'silence' ? Math.min(s.night, 9) : 10; }
export function runResult(s, smogAvgFn, durS) {
  const nights = nightsDone(s), pop = Math.max(0, Math.min(1000, Math.round(s.pop)));
  const burnouts = Math.min(60, s.burnouts | 0), smog = Math.max(0, Math.min(100, Math.round(smogAvgFn(s))));
  return { ending: s.ending, nights, pop, burnouts, smog, duration_s: Math.round(durS * 10) / 10, score: computeScore({ nights, pop, ending: s.ending, burnouts, smog }) };
}
