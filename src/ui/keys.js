// Горячие клавиши не должны срабатывать, пока игрок печатает в поле ввода (ник, чат): «ь»/«m» отключали звук, «p»/«з» — ставили паузу.
/** @param {{tagName?: string, isContentEditable?: boolean} | null | undefined} target */
export function shouldIgnoreKey(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target.isContentEditable;
}
