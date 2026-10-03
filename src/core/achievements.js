// @ts-check
// Достижения «Последнего котла»: чистая логика (без DOM). Контекст — итоги одной завершённой партии, плюс накопленная статистика игрока.
// Хранится локально (localStorage → meta.ach / meta.st); на сервер не отправляется.

/**
 * @typedef {{ mode: 'solo'|'daily'|'challenge'|'coop'|'versus', ending: string, nights: number, pop: number, burnouts: number, smog: number, score: number,
 *   durationS?: number, leaksFixed?: number, shovels?: number, spills?: number, players?: number, place?: number, dnf?: boolean, questDone?: boolean }} RunCtx
 * @typedef {{ plays: number, endings: string[], ach: Record<string, number>, st: Stats }} Meta
 * @typedef {{ coop: number, versus: number, wins: number, dailyDone: number, streak: number, lastDay: string, shares: number, challenges: number, leaks: number, shovels: number }} Stats
 */

export const FULL = ['light', 'smoke', 'iron', 'cold'];
const full = (/** @type {RunCtx} */ c) => FULL.includes(c.ending) && c.nights >= 10;

/** id, название, описание, значок (ключ глифа из ui/icons.js), ярус (1 бронза, 2 латунь, 3 золото), проверка */
export const ACHIEVEMENTS = [
  { id: 'first_dawn', name: 'Первый рассвет', desc: 'Переживите хотя бы одну ночь.', icon: 'sun', tier: 1, test: (/** @type {RunCtx} */ c) => c.nights >= 1 },
  { id: 'half_way', name: 'Полпути', desc: 'Доживите до шестой ночи.', icon: 'moon', tier: 1, test: c => c.nights >= 5 },
  { id: 'convoy', name: 'Обоз пришёл', desc: 'Переживите все десять ночей.', icon: 'flag', tier: 2, test: full },
  { id: 'light', name: 'Светлая зима', desc: 'Добейтесь светлой концовки.', icon: 'star', tier: 3, test: c => c.ending === 'light' },
  { id: 'smoke_end', name: 'Дымная правда', desc: 'Увидьте концовку «город в дыму».', icon: 'cloud', tier: 1, test: c => c.ending === 'smoke' },
  { id: 'iron_end', name: 'Железная цена', desc: 'Увидьте концовку «железная цена».', icon: 'gear', tier: 1, test: c => c.ending === 'iron' },
  { id: 'cold_end', name: 'Холодная зима', desc: 'Дойдите до обоза, потеряв почти весь город.', icon: 'snow', tier: 1, test: c => c.ending === 'cold' },
  { id: 'boom', name: 'Бабах', desc: 'Взорвите Агафью. Бывает.', icon: 'skull', tier: 1, test: c => c.ending === 'boom' },
  { id: 'silence', name: 'Тишина', desc: 'Дождитесь, пока в городе погаснут огни.', icon: 'moon', tier: 1, test: c => c.ending === 'silence' },
  { id: 'all_endings', name: 'Все судьбы', desc: 'Откройте все шесть концовок.', icon: 'book', tier: 3, test: (c, m) => new Set([...(m ? m.endings : []), c.ending]).size >= 6 },
  { id: 'clean_shift', name: 'Без падений', desc: 'Пройдите игру, ни разу не уронив смену.', icon: 'shield', tier: 2, test: c => full(c) && c.burnouts === 0 },
  { id: 'clean_sky', name: 'Чистое небо', desc: 'Пройдите игру со средним дымом не выше 20%.', icon: 'cloud', tier: 2, test: c => full(c) && c.smog <= 20 },
  { id: 'hospital_hero', name: 'Хранитель города', desc: 'Сохраните не меньше 900 жителей.', icon: 'heart', tier: 2, test: c => full(c) && c.pop >= 900 },
  { id: 'every_one', name: 'Каждый на счету', desc: 'Сохраните не меньше 950 жителей.', icon: 'heart', tier: 3, test: c => full(c) && c.pop >= 950 },
  { id: 'plumber', name: 'Водопроводчик', desc: 'Заделайте 15 утечек за одну партию.', icon: 'wrench', tier: 2, test: c => (c.leaksFixed || 0) >= 15 },
  { id: 'coal_baron', name: 'Угольный барон', desc: 'Бросьте 200 лопат угля за одну партию.', icon: 'flame', tier: 2, test: c => (c.shovels || 0) >= 200 },
  { id: 'no_spill', name: 'Ни крошки мимо', desc: 'Пройдите игру, ни разу не пересыпав топку.', icon: 'drop', tier: 2, test: c => full(c) && c.spills === 0 },
  { id: 'master', name: 'Мастер котла', desc: 'Наберите 1500 очков.', icon: 'crown', tier: 2, test: c => c.score >= 1500 },
  { id: 'legend', name: 'Легенда Феррограда', desc: 'Наберите 1700 очков.', icon: 'crown', tier: 3, test: c => c.score >= 1700 },
  { id: 'team', name: 'Одна команда', desc: 'Дойдите до обоза в кооперативе.', icon: 'hands', tier: 2, test: c => c.mode === 'coop' && full(c) },
  { id: 'coop_light', name: 'Дружная зима', desc: 'Светлая концовка в кооперативе.', icon: 'star', tier: 3, test: c => c.mode === 'coop' && c.ending === 'light' },
  { id: 'rival', name: 'Соперник', desc: 'Сыграйте в соревновании.', icon: 'bolt', tier: 1, test: c => c.mode === 'versus' },
  { id: 'champion', name: 'Чемпион котельной', desc: 'Займите первое место в соревновании.', icon: 'trophy', tier: 3, test: c => c.mode === 'versus' && c.place === 1 && (c.players || 0) >= 2 && !c.dnf },
  { id: 'quartet', name: 'Четвёрка', desc: 'Сыграйте соревнование вчетвером.', icon: 'hands', tier: 2, test: c => c.mode === 'versus' && (c.players || 0) >= 4 },
  { id: 'daily_first', name: 'Задание дня', desc: 'Выполните сюжетное задание дня.', icon: 'scroll', tier: 2, test: c => c.mode === 'daily' && !!c.questDone },
  { id: 'streak3', name: 'Три дня подряд', desc: 'Играйте испытание дня три дня подряд.', icon: 'clock', tier: 2, test: (c, m) => !!m && m.st.streak >= 3 },
  { id: 'streak7', name: 'Неделя у котла', desc: 'Играйте испытание дня семь дней подряд.', icon: 'clock', tier: 3, test: (c, m) => !!m && m.st.streak >= 7 },
  { id: 'challenger', name: 'Вызов принят', desc: 'Сыграйте по ссылке-вызову друга.', icon: 'flag', tier: 1, test: c => c.mode === 'challenge' },
  { id: 'sharer', name: 'Рассказал друзьям', desc: 'Поделитесь результатом.', icon: 'mail', tier: 1, test: (c, m) => !!m && m.st.shares >= 1 },
  { id: 'veteran', name: 'Старый кочегар', desc: 'Сыграйте десять партий.', icon: 'key', tier: 2, test: (c, m) => !!m && m.plays >= 10 },
];

/** @returns {Stats} */
export function emptyStats() { return { coop: 0, versus: 0, wins: 0, dailyDone: 0, streak: 0, lastDay: '', shares: 0, challenges: 0, leaks: 0, shovels: 0 }; }

/** Приводит сохранённую мету к безопасному виду (портится localStorage — игра не должна падать). @returns {Meta} */
export function cleanMeta(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const st = emptyStats(), rs = o.st && typeof o.st === 'object' ? o.st : {};
  for (const k of Object.keys(st)) if (k !== 'lastDay') st[k] = Number.isFinite(rs[k]) ? Math.max(0, Math.min(1e6, Math.floor(rs[k]))) : 0;
  st.lastDay = typeof rs.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rs.lastDay) ? rs.lastDay : '';
  /** @type {Record<string, number>} */ const ach = {};
  if (o.ach && typeof o.ach === 'object') for (const a of ACHIEVEMENTS) if (Number.isFinite(o.ach[a.id])) ach[a.id] = o.ach[a.id];
  const endings = Array.isArray(o.endings) ? o.endings.filter(/** @param {any} e */ e => typeof e === 'string').slice(0, 12) : [];
  return { plays: Number.isFinite(o.plays) ? Math.max(0, Math.floor(o.plays)) : 0, endings, ach, st };
}

/** Сутки подряд: «вчера» от дня `day` (UTC). */
export function prevDay(day) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }

/**
 * Учитывает завершённую партию в статистике, затем проверяет достижения. Меняет meta на месте, возвращает список НОВЫХ достижений.
 * @param {Meta} meta @param {RunCtx} ctx @param {{ day?: string, now?: number }} [opt]
 */
export function applyRun(meta, ctx, opt = {}) {
  const st = meta.st;
  if (ctx.mode === 'coop') st.coop++;
  if (ctx.mode === 'versus') { st.versus++; if (ctx.place === 1 && !ctx.dnf && (ctx.players || 0) >= 2) st.wins++; }
  if (ctx.mode === 'challenge') st.challenges++;
  if (ctx.mode === 'daily' && opt.day) {
    if (st.lastDay !== opt.day) { st.streak = st.lastDay === prevDay(opt.day) ? st.streak + 1 : 1; st.lastDay = opt.day; }
    if (ctx.questDone) st.dailyDone++;
  }
  st.leaks += ctx.leaksFixed || 0; st.shovels += ctx.shovels || 0;
  const now = opt.now ?? Date.now();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.ach[a.id]) continue;
    let ok = false;
    try { ok = !!a.test(ctx, meta); } catch (e) { ok = false; }
    if (ok) { meta.ach[a.id] = now; fresh.push(a); }
  }
  return fresh;
}

/** Достижение, зависящее только от действия вне партии (шаринг). */
export function applyShare(meta, now = Date.now()) {
  meta.st.shares++;
  const a = ACHIEVEMENTS.find(x => x.id === 'sharer');
  if (a && !meta.ach[a.id]) { meta.ach[a.id] = now; return [a]; }
  return [];
}

/** Выполнено ли сюжетное задание дня (та же логика, что quest_done на сервере). goal — объект из /api/g/daily. */
export function questDone(goal, r) {
  if (!goal || typeof goal !== 'object') return false;
  if ('pop_min' in goal && r.pop < goal.pop_min) return false;
  if ('burn_max' in goal && r.burnouts > goal.burn_max) return false;
  if ('smog_max' in goal && r.smog > goal.smog_max) return false;
  if ('nights_min' in goal && r.nights < goal.nights_min) return false;
  if ('ending' in goal && r.ending !== goal.ending) return false;
  if ('score_min' in goal && r.score < goal.score_min) return false;
  return true;
}
