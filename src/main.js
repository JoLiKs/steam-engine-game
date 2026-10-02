// «Последний котёл» — контроллер: цикл, ввод, интерфейс, сохранение, звук.
import { createState, beginNight, step, setValve, adjustValve, shovel, fixLeak, chooseCard, continueSummary, serialize, deserialize, toll, smogAvg, P_VENT } from './sim.js';
import { NIGHTS, CARDS, ENDINGS, POP_START, TUTORIAL, DISTRICTS } from './data.js';
import { viewFor, makeLayout, column } from './layout.js';
import { drawScene, makeBackground, makeCity } from './render.js';
import { Fx } from './fx.js';
import { Sound } from './audio.js';
import { botAct } from './bot.js';
import { makeRng } from './rng.js';

const DT = 1 / 60;
const SAVE_KEY = 'last-boiler-save-v1', SET_KEY = 'last-boiler-settings-v1', META_KEY = 'last-boiler-meta-v1';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

const canvas = $('game'), ctx = canvas.getContext('2d');
const sound = new Sound(), fx = new Fx();
const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

// ---------- хранилище (с защитой от недоступного localStorage)
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
let settings = { sound: true, sfx: 70, music: 60, reduce: mq.matches, shake: true };
try {
  const saved = JSON.parse(store.get(SET_KEY) || '{}');
  if (saved.sfx === undefined && saved.vol !== undefined) { saved.sfx = saved.vol; if (saved.music !== undefined) saved.music = Math.min(100, saved.music + 10); } // миграция со старой «Громкости»
  delete saved.vol; Object.assign(settings, saved);
} catch (e) { /* ignore */ }
for (const k of ['sfx', 'music']) settings[k] = Math.max(0, Math.min(100, +settings[k] || 0));
let meta = { endings: [], plays: 0 };
try { Object.assign(meta, JSON.parse(store.get(META_KEY) || '{}')); } catch (e) { /* ignore */ }

// ---------- состояние контроллера
let s = createState(1);
let ui = 'title', prevUi = 'title';
let snap = null;                 // снимок начала ночи для «переиграть ночь»
let log = [], banner = null, time = 0, acc = 0, last = 0;
let endTimer = 0;
let view = { portrait: false, scale: 1, W: 1100, H: 700 }, L = makeLayout(1100, 700, false), dpr = 1, bg = null, city = null;
const input = { sel: 0, drag: -1, shovelDown: 0, hover: null };
const vis = { needle: 22, fireShown: 0, satShown: [1, 1, 1, 1], popShown: POP_START, swing: 0, kidSwing: 0, wheelKick: [0, 0, 0, 0], snow: [], t: 0, shakeKick: 0 };
const speedParam = Math.max(1, Math.min(60, +(params.get('speed') || 1)));
const dbg = { bot: null, botOpts: {}, speed: speedParam };
const rnd = makeRng(99);
for (let i = 0; i < 70; i++) vis.snow.push({ x: rnd() * 1400, y: rnd() * 90, s: 1 + rnd() * 1.6, v: 8 + rnd() * 16, dx: 6 + rnd() * 10 });
let gears = [];

function applySettings() {
  sound.set({ enabled: settings.sound, sfxVol: settings.sfx / 100, musicVol: settings.music / 100 });
  fx.reduced = settings.reduce; fx.shakeOn = settings.shake;
  document.documentElement.classList.toggle('reduce', settings.reduce);
  store.set(SET_KEY, JSON.stringify(settings));
}

// ---------- размеры
function resize() {
  const cssW = window.innerWidth, cssH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  view = viewFor(cssW, cssH);
  L = makeLayout(view.W, view.H, view.portrait);
  view.W = L.fullW;
  bg = makeBackground(cssW / view.scale, cssH / view.scale, dpr, view.scale);
  city = makeCity(L.fullW, L.sky.h);
  gears = makeGears();
}
function makeGears() {
  const g = [], r = makeRng(31);
  const P = view.portrait;
  const spots = P
    ? [[28, 330, 22, 10, 'brass', 1], [372, 360, 26, 11, 'iron', -1], [30, 820, 26, 11, 'copper', 1], [374, 700, 18, 9, 'brass', -1]]
    : [[24, 150, 34, 12, 'brass', 1], [58, 188, 22, 9, 'iron', -1], [L.W - 20, 300, 40, 14, 'iron', 1], [L.W - 24, 612, 34, 12, 'brass', -1], [540, 680, 26, 10, 'copper', 1], [300, 436, 18, 8, 'brass', -1], [L.W - 56, 660, 20, 9, 'copper', 1]];
  for (const [x, y, rad, n, kind, dir] of spots) g.push({ x, y, r: rad, n, kind, dir, rot: r() * 6, a: 0.85 });
  return g;
}

// ---------- сообщения
function say(who, text, kind = 'info', col) {
  log.push({ who, text, kind, col, at: time }); if (log.length > 12) log.shift();
  $('sr-status').textContent = (who ? who + ': ' : '') + text;
}
const PIPE_NAMES = ['Госпиталя', 'Кварталов', 'Завода', 'Фильтров'];

function handleEvents() {
  for (const e of s.events) {
    switch (e.type) {
      case 'shovel': sound.play('shovel'); vis.swing = 1; { const f = L.furnace; fx.sparks(f.x + f.w * 0.5, f.y + f.h * 0.6, 12, { v: 140 }); fx.steam(f.x + f.w * 0.5, f.y + 20, 2, { vy: -50 }); } break;
      case 'spill': sound.play('spill'); say('', 'Топка переполнена — уголь высыпается!', 'warn'); fx.text(L.furnace.x + L.furnace.w / 2, L.furnace.y, 'Перебор!', '#f0c24a', 16); vis.swing = 1; break;
      case 'nocoal': sound.play('nocoal'); fx.text(L.shovel.x + L.shovel.w / 2, L.shovel.y - 6, 'Нет угля!', '#e0523c', 16); break;
      case 'leak': sound.play('leak'); say('', `Утечка пара в трубе ${PIPE_NAMES[e.pipe]}!`, 'warn'); break;
      case 'fix': { sound.play('fix'); const c = column(L, e.pipe); fx.sparks(c.leak.x, c.leak.y, 10, { col: '240,220,150', v: 120 }); fx.text(c.leak.x, c.leak.y - 14, 'Заделано', '#9be08f', 14); break; }
      case 'vent': sound.play('vent'); break;
      case 'timka': sound.play('timka'); vis.kidSwing = 1; break;
      case 'tutstep': sound.play('tut'); break;
      case 'collapse': sound.play('collapse'); fx.shake(0.8); say('Рабочие', 'Смена не выдержала! Завод встал на 8 секунд.', 'warn', '#e0523c'); { const c = column(L, 2); fx.steam(c.cx, c.y + 60, 14, { vy: -90, r: 10, grow: 40 }); } break;
      case 'loss': sound.play('loss'); break;
      case 'talk': say(e.who, e.text, 'talk'); break;
      case 'event': sound.play('event'); banner = { label: e.label, at: time }; say('', e.label + '.', 'warn'); break;
      case 'night': sound.play('night'); log = []; break;
      case 'nightend': sound.play('nightend'); break;
      case 'ending': sound.play(e.id === 'boom' ? 'boom' : 'warn'); if (e.id === 'boom') { fx.shake(1.2); const g = L.gauge; for (let k = 0; k < 6; k++) fx.steam(L.tank.x + L.tank.w / 2, L.tank.y + L.tank.h / 2, 30, { spread: 160, vy: -140, jx: 220, r: 16, grow: 80, life: 2.2, a: 0.8 }); void g; } break;
      default: break;
    }
  }
  s.events.length = 0;
}

// ---------- сохранение
function saveGame() { if (s.phase === 'ended') return; const str = serialize(s); store.set(SAVE_KEY, str); }
function hasSave() { return !!store.get(SAVE_KEY); }
function loadGame() {
  try { const o = deserialize(store.get(SAVE_KEY)); if (!o || o.v !== 1) return false; s = o; return true; } catch (e) { return false; }
}
let lastPhase = null, lastNight = -1;
function trackPhase() {
  if (s.phase !== lastPhase || s.night !== lastNight) {
    lastPhase = s.phase; lastNight = s.night;
    if (s.phase === 'night' && s.t === 0) { snap = serialize(s); saveGame(); }
    else if (s.phase === 'summary' || s.phase === 'card') saveGame();
    else if (s.phase === 'ended') { store.del(SAVE_KEY); recordEnding(); }
    routeUi();
  }
}
function recordEnding() {
  if (!meta.endings.includes(s.ending)) meta.endings.push(s.ending);
  meta.plays++; store.set(META_KEY, JSON.stringify(meta));
}

// ---------- интерфейс
const screens = ['title', 'prologue', 'pause', 'settings', 'help', 'card', 'summary', 'ending'];
function show(id) {
  for (const k of screens) $(k).hidden = k !== id;
  if (id) { const first = $(id).querySelector('.btn.primary, .choice'); if (first) setTimeout(() => first.focus({ preventScroll: true }), 30); }
  else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
}
function routeUi() {
  if (ui === 'play' || ui === 'card' || ui === 'summary') {
    if (s.phase === 'night') { ui = 'play'; show(null); }
    else if (s.phase === 'summary') { ui = 'summary'; renderSummary(); show('summary'); }
    else if (s.phase === 'card') { ui = 'card'; renderCard(); show('card'); }
    else if (s.phase === 'ended') { endTimer = s.ending === 'boom' ? 2.4 : 0.8; ui = 'play'; show(null); }
  }
}
function setUi(u) { ui = u; if (u === 'play') show(null); else show(u === 'title' ? 'title' : u); }

function updateTitle() {
  $('b-continue').hidden = !hasSave();
  const n = meta.endings.length;
  $('t-endings').textContent = n ? `Открыто концовок: ${n} из ${Object.keys(ENDINGS).length}` : 'Пять минут обучения. Десять ночей. Шесть судеб.';
}
function newGame() {
  s = createState((Math.random() * 2 ** 31) | 0 || 1); lastPhase = null; lastNight = -1;
  log = []; fx.clear(); banner = null; vis.satShown = [1, 1, 1, 1]; vis.popShown = POP_START; vis.needle = s.P; vis.fireShown = 0;
  store.del(SAVE_KEY); show('prologue'); ui = 'prologue';
}
function startPlay() {
  sound.ensure(); sound.startMusic();
  beginPlayFromState();
}
function beginPlayFromState() {
  s.phase === 'night' && s.t === 0 && snap == null && (snap = serialize(s));
  lastPhase = null; lastNight = -1; ui = 'play'; trackPhase();
  if (s.phase === 'night') { ui = 'play'; show(null); }
  if (s.night === 0 && s.t === 0 && !s.tut?.done) say('Агафья', 'Топка остыла. Город ждёт тепла.', 'talk', '#e39a62');
}
function continueGame() {
  if (!loadGame()) { newGame(); return; }
  log = []; fx.clear(); banner = null; vis.satShown = s.sat.slice(); vis.popShown = s.pop; vis.needle = s.P; vis.fireShown = s.fire;
  sound.ensure(); sound.startMusic();
  snap = s.phase === 'night' ? serialize(s) : snap;
  lastPhase = null; lastNight = -1; ui = 'play'; trackPhase(); routeUi();
  if (s.phase === 'night') show(null);
}
function retryNight() {
  if (!snap) return;
  s = deserialize(snap); log = []; fx.clear(); banner = null; lastPhase = null; lastNight = -1;
  vis.satShown = s.sat.slice(); vis.popShown = s.pop; vis.needle = s.P; vis.fireShown = s.fire;
  ui = 'play'; trackPhase(); show(null);
}
function goMenu() { stopToTitle(); }
function stopToTitle() { if (s.phase !== 'ended') saveGame(); ui = 'title'; updateTitle(); show('title'); }
function openOverlay(id) { prevUi = ui; ui = id; show(id); }
function closeOverlay() { ui = prevUi; if (ui === 'play') show(null); else show(ui); if (ui === 'title') updateTitle(); }
function pauseGame() { if (ui !== 'play') return; ui = 'pause'; show('pause'); sound.silence(); }
function resumeGame() { ui = 'play'; show(null); }

function renderCard() {
  const c = s.card; $('c-who').textContent = c.who; $('c-h').textContent = c.title; $('c-text').textContent = c.text;
  const box = $('c-opts'); box.innerHTML = '';
  c.options.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'choice'; b.type = 'button';
    b.innerHTML = `<kbd>${i + 1}</kbd><b></b><span></span>`; b.querySelector('b').textContent = o.label; b.querySelector('span').textContent = o.hint;
    b.addEventListener('click', () => pickCard(o.key)); box.appendChild(b);
  });
}
function pickCard(key) { if (s.phase !== 'card') return; sound.play('click'); chooseCard(s, key); handleEvents(); trackPhase(); }
const NIGHT_LINES = [
  'Первая ночь позади. Город запомнит, как вы растопили Агафью.',
  'Утро. Иней на окнах медленно тает.', 'Госпиталь пережил лихорадку.', 'Смена вернулась домой. Не все — своим шагом.',
  'Дым осел на крышах. Доктор Ивина кашляет в рукав.', 'Метель стихла. Слобода считает печи.', 'Лёд на крышах. Лёд на окнах. Лёд внутри.',
  'Стылый час прошёл. До обоза — две ночи.', 'Ветер унёс остатки метели. Почти дошли.', ''];
function renderSummary() {
  const m = s.summary; const N = NIGHTS[m.night];
  $('su-n').textContent = `Ночь ${m.night + 1} из ${NIGHTS.length}`;
  $('su-h').textContent = m.night + 1 === NIGHTS.length ? 'Рассвет. Обоз у ворот' : 'Рассвет · ' + N.name;
  const cls = (v, a, b) => v <= a ? 'ok' : v <= b ? 'warn' : 'bad';
  const items = [
    ['Жителей', `${m.pop}`, m.pop / POP_START > 0.9 ? 'ok' : m.pop / POP_START > 0.8 ? 'warn' : 'bad'],
    ['Потеряно за ночь', m.lost ? `−${m.lost}` : '0', m.lost === 0 ? 'ok' : cls(m.lost, 15, 40)],
    ['Уголь в бункере', `${Math.floor(s.coal)} (${m.coalDelta >= 0 ? '+' : ''}${m.coalDelta})`, s.coal > 12 ? 'ok' : s.coal > 5 ? 'warn' : 'bad'],
    ['Дым над городом', `${m.smog}%`, cls(m.smog, 25, 50)],
    ['Усталость смены', `${m.fw}%`, cls(m.fw, 45, 70)],
    ['Падений смены', `${m.burnouts}`, m.burnouts === 0 ? 'ok' : 'bad'],
  ];
  $('su-stats').innerHTML = items.map(([a, b, c]) => `<div class="stat"><small>${a}</small><strong class="${c}"></strong></div>`).join('');
  [...$('su-stats').querySelectorAll('strong')].forEach((el, i) => { el.textContent = items[i][1]; });
  let txt = NIGHT_LINES[m.night] || '';
  if (m.lost > 25) txt = 'Эта ночь забрала людей. Их имена вам скажет доктор Ивина — когда сможет.';
  else if (m.burnouts > 0 && m.night > 2) txt = 'Рабочие не забудут эту ночь. Завод — не бездонный колодец.';
  $('su-text').textContent = txt;
  $('b-next').textContent = m.night + 1 >= NIGHTS.length ? 'Встретить обоз' : 'Дальше';
}
function renderEnding() {
  const e = ENDINGS[s.ending]; const tone = e.tone;
  const el = $('ending'); el.className = 'screen tone-' + tone;
  $('e-kicker').textContent = 'Финал · ' + (tone === 'good' ? 'лучшая концовка' : tone === 'fail' ? 'катастрофа' : 'горькая правда');
  $('e-h').textContent = e.title;
  $('e-text').innerHTML = e.lines.map(l => '<p></p>').join('');
  [...$('e-text').querySelectorAll('p')].forEach((p, i) => { p.textContent = e.lines[i]; });
  const alive = Math.round(s.pop), tl = Math.round(toll(s)), sm = Math.round(smogAvg(s));
  const items = [['Выжило жителей', `${alive} из ${POP_START}`], ['Цена смены', s.burnouts ? `${s.burnouts} падений` : tl > 25 ? 'тяжёлая' : 'небольшая'], ['Средний дым', sm + '%'], ['Ночей пережито', `${Math.min(s.night + (s.phase === 'ended' && s.ending !== 'boom' && s.ending !== 'silence' ? 1 : 0), 10)} из 10`]];
  $('e-stats').innerHTML = items.map(() => '<div class="stat"><small></small><strong></strong></div>').join('');
  [...$('e-stats').querySelectorAll('.stat')].forEach((el, i) => { el.querySelector('small').textContent = items[i][0]; el.querySelector('strong').textContent = items[i][1]; });
  const left = Object.keys(ENDINGS).length - meta.endings.length;
  const hints = { light: 'Это лучшая концовка. Остальные цены тоже есть — попробуйте принять «выгодные» решения и посмотрите, чем платят другие.', smoke: 'Попробуйте отказаться от бурого угля и держать фильтры открытыми.', iron: 'Попробуйте не продлевать смену и дать усталости остыть: снижайте вентиль завода, когда шкала красная.', cold: 'Госпиталь и кварталы важнее всего. Не жалейте им пара.', boom: 'Следите за стрелкой: в красной зоне больше двух секунд — взрыв. Не перебарщивайте с углём.', silence: 'Держите хотя бы госпиталь и кварталы в тепле — и утечки заделывайте сразу.' };
  $('e-hint').textContent = hints[s.ending] + (left > 0 ? `  Открыто концовок: ${meta.endings.length} из ${Object.keys(ENDINGS).length}.` : '  Вы открыли все концовки.');
  sound.play(tone === 'good' ? 'end-good' : tone === 'fail' ? 'end-fail' : 'end-bitter');
}

// ---------- события интерфейса
function wire() {
  const click = (id, fn) => $(id).addEventListener('click', () => { sound.ensure(); sound.play('click'); fn(); });
  click('b-new', newGame); click('b-continue', continueGame);
  click('b-help', () => openOverlay('help')); click('b-settings', () => openOverlay('settings'));
  click('b-start', startPlay);
  click('b-resume', resumeGame); click('b-retry', retryNight); click('b-menu', goMenu);
  click('b-pset', () => openOverlay('settings')); click('b-phelp', () => openOverlay('help'));
  click('b-sclose', closeOverlay); click('b-hclose', closeOverlay);
  click('b-next', () => { continueSummary(s); handleEvents(); trackPhase(); });
  click('b-again', () => { newGame(); }); click('b-emenu', () => { ui = 'title'; updateTitle(); show('title'); });
  click('b-wipe', () => { if (confirm('Стереть сохранение и открытые концовки?')) { store.del(SAVE_KEY); meta = { endings: [], plays: 0 }; store.set(META_KEY, JSON.stringify(meta)); updateTitle(); } });
  $('o-sound').addEventListener('change', e => { settings.sound = e.target.checked; applySettings(); sound.ensure(); sound.play('click'); });
  $('o-sfx').addEventListener('input', e => { settings.sfx = +e.target.value; applySettings(); sound.ensure(); sound.play('valve', 0.5); });
  $('o-music').addEventListener('input', e => { settings.music = +e.target.value; applySettings(); });
  $('o-reduce').addEventListener('change', e => { settings.reduce = e.target.checked; applySettings(); });
  $('o-shake').addEventListener('change', e => { settings.shake = e.target.checked; applySettings(); });
  $('o-sound').checked = settings.sound; $('o-sfx').value = settings.sfx; $('o-music').value = settings.music; $('o-reduce').checked = settings.reduce; $('o-shake').checked = settings.shake;
  document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); sound.silence(); } });
  window.addEventListener('blur', () => { if (ui === 'play') pauseGame(); });
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 120));
  if (mq.addEventListener) mq.addEventListener('change', e => { settings.reduce = e.matches; $('o-reduce').checked = e.matches; applySettings(); });
}

// ---------- ввод в игре
function toLogical(ev) {
  const r = canvas.getBoundingClientRect();
  return [(ev.clientX - r.left) / view.scale - L.offX, (ev.clientY - r.top) / view.scale];
}
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function valveFromY(i, y) { const c = column(L, i); return Math.max(0, Math.min(1, (c.ty1 - y) / (c.ty1 - c.ty0))); }
function setV(i, v) {
  v = Math.round(v * 100) / 100; if (Math.abs(v - s.valves[i]) < 0.005) return;
  setValve(s, i, v); sound.play('valve', v); vis.wheelKick[i] += (v - s.valves[i]) * 3;
}
canvas.addEventListener('pointerdown', ev => {
  sound.ensure();
  if (ui !== 'play') return;
  const [x, y] = toLogical(ev);
  canvas.setPointerCapture?.(ev.pointerId);
  if (inRect(x, y, L.pause)) { pauseGame(); return; }
  // утечки
  for (const lk of s.leaks) { const c = column(L, lk.pipe); if (Math.hypot(x - c.leak.x, y - c.leak.y) < 32) { fixLeak(s, lk.id); handleEvents(); return; } }
  if (inRect(x, y, L.shovel)) { input.shovelDown = 0.15; shovel(s); handleEvents(); return; }
  for (let i = 0; i < 4; i++) {
    const c = column(L, i);
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      input.sel = i;
      if (y > c.y + c.head - 6 && y < c.ty1 + 22) { input.drag = i; setV(i, valveFromY(i, y)); }
      return;
    }
  }
});
canvas.addEventListener('pointermove', ev => {
  if (ui !== 'play') return; const [x, y] = toLogical(ev);
  if (input.drag >= 0) { setV(input.drag, valveFromY(input.drag, y)); return; }
  let over = inRect(x, y, L.shovel) || inRect(x, y, L.pause);
  for (const lk of s.leaks) { const c = column(L, lk.pipe); if (Math.hypot(x - c.leak.x, y - c.leak.y) < 32) over = true; }
  for (let i = 0; i < 4 && !over; i++) { const c = column(L, i); if (x >= c.x && x <= c.x + c.w && y >= c.ty0 - 20 && y <= c.ty1 + 20) over = true; }
  canvas.style.cursor = over ? 'pointer' : 'default';
});
const endDrag = () => { input.drag = -1; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', ev => { if (ui !== 'play') return; const [x, y] = toLogical(ev); for (let i = 0; i < 4; i++) { const c = column(L, i); if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { adjustValve(s, i, ev.deltaY < 0 ? 0.05 : -0.05); input.sel = i; ev.preventDefault(); } } }, { passive: false });

window.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key;
  sound.ensure();
  if (k === 'm' || k === 'M' || k === 'ь' || k === 'Ь') { settings.sound = !settings.sound; $('o-sound').checked = settings.sound; applySettings(); return; }
  if (ui === 'card') { if (k === '1' || k === '2') { const o = s.card.options[+k - 1]; if (o) { ev.preventDefault(); pickCard(o.key); } } return; }
  if (ui === 'settings' || ui === 'help') { if (k === 'Escape') closeOverlay(); return; }
  if (ui === 'pause') { if (k === 'Escape' || k === 'p' || k === 'P' || k === 'з' || k === 'З') resumeGame(); return; }
  if (ui !== 'play') return;
  if (k === 'Escape' || k === 'p' || k === 'P' || k === 'з' || k === 'З') { pauseGame(); return; }
  if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); if (!ev.repeat || true) { input.shovelDown = 0.15; shovel(s); handleEvents(); } return; }
  if (k >= '1' && k <= '4') { input.sel = +k - 1; return; }
  const nav = { ArrowLeft: -1, ArrowRight: 1, a: -1, d: 1, ф: -1, в: 1 };
  if (nav[k] !== undefined) { ev.preventDefault(); input.sel = (input.sel + nav[k] + 4) % 4; return; }
  const ud = { ArrowUp: 1, ArrowDown: -1, w: 1, s: -1, ц: 1, ы: -1, PageUp: 5, PageDown: -5 };
  if (ud[k] !== undefined) { ev.preventDefault(); const i = input.sel, before = s.valves[i]; adjustValve(s, i, ud[k] * (ev.shiftKey ? 0.2 : 0.05)); if (s.valves[i] !== before) { sound.play('valve', s.valves[i]); vis.wheelKick[i] += ud[k] * 0.3; } return; }
  if (k === 'f' || k === 'F' || k === 'а' || k === 'А' || k === 'Enter') { if (fixLeak(s, null)) handleEvents(); }
});

// ---------- цикл
function update(dt) {
  if (dbg.bot && s.phase === 'night') { botAct(s, dbg.bot, dbg.botOpts); }
  step(s, dt);
  if (s.shake > 0.6) { fx.shake(s.shake); }
  handleEvents();
  trackPhase();
}
function visUpdate(dt, playing) {
  vis.t += dt; time += dt;
  const k = Math.min(1, dt * 7);
  vis.needle += (s.P - vis.needle) * k; vis.fireShown += (s.fire - vis.fireShown) * Math.min(1, dt * 10);
  for (let i = 0; i < 4; i++) { vis.satShown[i] += (s.sat[i] - vis.satShown[i]) * Math.min(1, dt * 6); vis.wheelKick[i] *= Math.max(0, 1 - dt * 10); }
  vis.popShown += (s.pop - vis.popShown) * Math.min(1, dt * 3);
  vis.swing = Math.max(0, vis.swing - dt * 4); vis.kidSwing = Math.max(0, vis.kidSwing - dt * 4); input.shovelDown = Math.max(0, input.shovelDown - dt);
  const steamUse = s.flow.reduce((a, b) => a + b, 0);
  const sp = fx.reduced ? 0.15 : 1;
  for (const g of gears) g.rot += g.dir * dt * (0.15 + steamUse * 0.07 + s.P * 0.004) * (12 / g.n) * sp * (playing ? 1 : 0.3);
  for (const f of vis.snow) { f.y += f.v * dt * (1 + s.smog / 200); f.x += f.dx * dt; if (f.y > 90) { f.y = 0; f.x = rnd() * 1400; } }
  fx.update(dt);
}
let fxAcc = 0;
function render() {
  const cssW = canvas.width / dpr, cssH = canvas.height / dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  const [sx, sy] = fx.shakeOffset();
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, (L.offX * view.scale + sx) * dpr, sy * dpr);
  const tut = s.tut && s.tut.active ? TUTORIAL[s.tut.step] : null;
  fxAcc += 1;
  const R = { s, L, vis, input, log, time, banner, fx, city, gears, reduced: fx.reduced, dpr, scale: view.scale, tutHint: tut ? tut.hint : null, fxTick: (fxAcc % 6) === 0 };
  drawScene(ctx, R);
  void cssW; void cssH;
}
function ambient() {
  if (ui !== 'play') { sound.ambient(0, 0.02); return; }
  const flow = s.flow.reduce((a, b) => a + b, 0);
  const hiss = Math.min(1, flow / 12 + s.leaks.length * 0.35 + (s.venting ? 0.5 : 0));
  sound.ambient(hiss * 0.8, s.P / 100);
  sound.setIntensity(Math.min(1, Math.max(0, (s.P - 40) / 50) + (s.leaks.length ? 0.2 : 0)));
}
function frame(now) {
  requestAnimationFrame(frame);
  const dtReal = Math.min(0.1, (now - last) / 1000 || 0); last = now;
  const playing = ui === 'play';
  if (playing) {
    acc += dtReal * dbg.speed; let n = 0;
    while (acc >= DT && n < 60 * dbg.speed + 5) { update(DT); acc -= DT; n++; if (ui !== 'play') { acc = 0; break; } }
  } else acc = 0;
  if (s.phase === 'ended' && ui === 'play') {
    endTimer -= dtReal;
    if (endTimer <= 0 && endTimer > -50) { endTimer = -100; ui = 'ending'; renderEnding(); show('ending'); }
  }
  visUpdate(dtReal, playing);
  // дым из трубы — один шлейф (бурый уголь делает его чуть плотнее, а не добавляет второй)
  if (playing && s.fire > 8 && Math.random() < 0.3 + s.fire / 200) { fx.smoke(L.chimney.x, L.chimney.y - 28, 1, 0.22 + s.smog / 250 + (s.flags.brown ? 0.08 : 0)); }
  ambient();
  render();
}

// ---------- тестовые крючки (только с ?debug)
if (DEBUG) {
  window.__game = {
    get s() { return s; }, get ui() { return ui; }, get L() { return L; }, get view() { return view; },
    setBot(skill, opts) { dbg.bot = skill; dbg.botOpts = opts || {}; }, setSpeed(v) { dbg.speed = v; },
    setUiState: (u) => { ui = u; }, input, settings, meta, log, fx, sound,
    jump(night, flags) { // быстрый переход к ночи n (для скриншотов и тестов)
      s = createState(5, { skipTutorial: night > 0 }); if (flags) Object.assign(s.flags, flags);
      s.coal = 30; lastPhase = null; lastNight = -1; log = []; fx.clear(); snap = null;
      beginNight(s, night); ui = 'play'; trackPhase(); show(null);
    },
  };
}

// ---------- запуск
function init() {
  wire(); applySettings(); resize(); updateTitle(); show('title');
  requestAnimationFrame(t => { last = t; frame(t); });
}
init();
