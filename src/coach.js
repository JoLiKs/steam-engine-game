// «Тренер»: подсказки из обучения показываются ТОЛЬКО когда игрок несколько раз подряд делает нелогичные вещи.
// Чистая логика (без DOM/Audio), время — по игровым часам s.clock, поэтому тестируется детерминированно.
//
// Нелогичные действия (категории):
//   valve_close  — вентиль, которому не хватает пара, прикрывают дальше (человек мёрзнет, а его закрывают)
//   valve_open   — вентиль, получающий заметно больше нужного, открывают ещё (пар уходит впустую)
//   shovel_waste — уголь в уже полную топку (высыпается)
//   p_high       — давление у красной черты держится ≥ 6 с, а игрок ничего не делает
//   p_low        — давление упало почти до нуля, топка остыла, уголь есть, а игрок не подбрасывает ≥ 8 с
//   leak         — утечка висит ≥ 7 с (3 раза → ≈ 21 с)
//   smog         — дым выше 70 %, а вентиль фильтров почти закрыт (периодами по 8 с)
// Разумное действие (вентиль в нужную сторону, нужное подбрасывание, заделанная утечка) обнуляет серию.
// Подсказка выдаётся при ≥ NEED нелогичных событиях за WINDOW секунд; затем общий кулдаун, кулдаун на категорию и лимит на ночь.
import { CAP, TUTORIAL } from './data.js';

export const COACH = { WINDOW: 20, NEED: 3, COOLDOWN: 45, CAT_COOLDOWN: 90, PER_NIGHT: 3, STALL: 25, STALL_COOLDOWN: 40, RING: 7 };
const NAMES = ['Госпиталя', 'Кварталов', 'Завода', 'Фильтров'];
const NAMES_NOM = ['Госпиталь', 'Кварталы', 'Завод', 'Фильтры'];

export const HINTS = {
  valve_close: i => ({ text: `Вентиль ${NAMES[i]} почти закрыт, а людям не хватает пара. Откройте его до золотой отметки.`, ring: 'v' + i }),
  valve_open: i => ({ text: `${NAMES_NOM[i]} получает больше пара, чем нужно, — лишнее уходит впустую. Прикройте вентиль до отметки.`, ring: 'v' + i }),
  shovel_waste: () => ({ text: 'Топка уже полна — уголь высыпается. Подбрасывайте, когда жар опускается.', ring: 'shovel' }),
  p_high: () => ({ text: 'Давление у красной черты! Приоткройте вентили и не подбрасывайте уголь, пока стрелка не вернётся в зелёную зону.', ring: 'gauge' }),
  p_low: () => ({ text: 'Давление падает, топка остывает — подбросьте уголь (ПРОБЕЛ).', ring: 'shovel' }),
  leak: () => ({ text: 'Утечка пара! Нажмите на облачко над трубой (или F), чтобы заткнуть её.', ring: 'leak' }),
  smog: () => ({ text: 'Город задыхается от дыма. Откройте вентиль Фильтров до отметки.', ring: 'v3' }),
};

export class Coach {
  constructor(opts = {}) { this.o = { ...COACH, ...opts }; this.reset(); }
  reset() {
    this.streak = [];            // [{t, cat, i}]
    this.lastHint = -1e9; this.catLast = {}; this.nightCount = 0; this.night = -1;
    this.prev = null; this.sampleT = 0; this.cond = { p_high: 0, p_low: 0, leak: 0, smog: 0 };
    this.ringId = null; this.ringUntil = -1; this.stepKey = null; this.stepAt = 0; this.stallLast = -1e9;
    this.shown = 0;
  }
  ring(clock) { return clock < this.ringUntil ? this.ringId : null; }
  good() { this.streak.length = 0; }
  bad(clock, cat, i = 0) {
    this.streak.push({ t: clock, cat, i });
    this.streak = this.streak.filter(x => clock - x.t <= this.o.WINDOW);
  }
  // события симуляции: 'shovel' {good}, 'spill', 'fix'
  onEvent(e, s) {
    const c = s.clock;
    if (e.type === 'shovel') { if (e.good === false) this.bad(c, 'shovel_waste'); else if (s.fire < 60) this.good(); }
    else if (e.type === 'spill') this.bad(c, 'shovel_waste');
    else if (e.type === 'fix') this.good();
  }
  // вызывать каждый шаг симуляции в фазе «ночь». Возвращает подсказку {text, ring, cat} или null.
  update(s, dt) {
    const c = s.clock;
    if (s.night !== this.night) { this.night = s.night; this.nightCount = 0; this.streak = []; this.prev = s.valves.slice(); this.sampleT = c; this.cond = { p_high: 0, p_low: 0, leak: 0, smog: 0 }; }
    // 1) вентили: смотрим смещение раз в 0,3 с
    if (!this.prev) { this.prev = s.valves.slice(); this.sampleT = c; }
    if (c - this.sampleT >= 0.3) {
      for (let i = 0; i < 4; i++) {
        const d = s.valves[i] - this.prev[i];
        if (Math.abs(d) < 0.04) continue;
        const m = Math.min(1, s.needNow[i] / CAP[i]), from = this.prev[i];
        if (m <= 0.02) continue;
        if (d < 0 && from < m - 0.06 && s.sat[i] < 0.85) this.bad(c, 'valve_close', i);
        else if (d > 0 && from > m + 0.2) this.bad(c, 'valve_open', i);
        else if ((d > 0 && from < m - 0.04) || (d < 0 && from > m + 0.1)) this.good();
        this.prev[i] = s.valves[i];
      }
      for (let i = 0; i < 4; i++) if (Math.abs(s.valves[i] - this.prev[i]) < 0.04 && c - this.sampleT > 1.2) this.prev[i] = s.valves[i];
      this.sampleT = c;
    }
    // 2) «игнор»: условие держится — за каждый период по событию
    const cond = (k, on, period, cat) => {
      if (!on) { this.cond[k] = 0; return; }
      this.cond[k] += dt;
      if (this.cond[k] >= period) { this.cond[k] -= period; this.bad(c, cat, k === 'smog' ? 3 : 0); }
    };
    cond('p_high', s.P >= 90, 6, 'p_high');
    cond('p_low', s.P < 12 && s.fire < 25 && s.coal >= 1 && !(s.tut && s.tut.active), 8, 'p_low');
    cond('leak', s.leaks.length > 0 && !(s.tut && s.tut.active), 7, 'leak');
    cond('smog', s.smog > 70 && s.valves[3] < Math.min(1, s.needNow[3] / CAP[3]) - 0.1, 8, 'smog');
    // 3) подсказка по серии нелогичных действий
    this.streak = this.streak.filter(x => c - x.t <= this.o.WINDOW);
    if (this.streak.length >= this.o.NEED && c - this.lastHint >= this.o.COOLDOWN && this.nightCount < this.o.PER_NIGHT) {
      const last = this.streak[this.streak.length - 1];
      if (c - (this.catLast[last.cat + last.i] ?? -1e9) >= this.o.CAT_COOLDOWN) return this.fire(c, last.cat, last.i);
    }
    // 4) обучение: подсказка текущего шага, если игрок застрял на нём
    if (s.tut && s.tut.active) {
      const step = s.tut.step;
      if (this.stepKey !== step) { this.stepKey = step; this.stepAt = c; }
      if (c - this.stepAt >= this.o.STALL && c - this.stallLast >= this.o.STALL_COOLDOWN && c - this.lastHint >= 8) {
        const T = TUTORIAL[step]; this.stallLast = c;
        if (T && T.hint) return this.fire(c, 'stall', 0, { text: T.text, ring: T.hint }, true);
      }
    }
    return null;
  }
  fire(c, cat, i, custom, noCount) {
    const h = custom || HINTS[cat](i);
    this.lastHint = c; this.catLast[cat + i] = c; if (!noCount) { this.nightCount++; this.streak = []; }
    this.ringId = h.ring; this.ringUntil = c + this.o.RING; this.shown++;
    return { text: h.text, ring: h.ring, cat };
  }
}
