// Сквозной тест в headless Chrome: реальный ввод, туториал, бот до концовки, скриншоты, консоль без ошибок.
const puppeteer = require('puppeteer-core'); const { serve } = require('./serve'); const fs = require('fs'); const path = require('path');
const OUT = path.resolve(__dirname, '../screenshots'); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
const URL_BASE = process.env.GAME_URL || null;

async function run(b, base, name, w, h, mob, prefix = '') {
  console.log(`\n== ${name} ${w}x${h}`);
  const errs = [];
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
  p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !(m.location().url || '').includes('/api/g/')) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('requestfailed', r => !r.url().includes('/api/g/') && errs.push('requestfailed: ' + r.url()));
  const external = []; p.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });
  const shot = async n => { await sleep(150); await p.screenshot({ path: path.join(OUT, `${prefix}${name}-${n}.png`) }); };
  await p.goto(base + '/?debug', { waitUntil: 'load' }); await sleep(500);
  await shot('1-title');
  ok(await p.$eval('#b-continue', e => e.hidden), 'нет «Продолжить» без сохранения');
  // настройки
  await p.click('#b-settings'); await sleep(100);
  await shot('1b-settings');
  await p.evaluate(() => { const c = document.getElementById('o-sound'); c.click(); });
  ok(await p.evaluate(() => window.__game.settings.sound === false), 'настройка звука выключается');
  await p.evaluate(() => document.getElementById('o-sound').click());
  await p.click('#b-sclose'); await sleep(100);
  ok(await p.$eval('#title', e => !e.hidden), 'возврат из настроек на титул');
  await p.click('#b-help'); await sleep(100); await shot('1c-help'); await p.click('#b-hclose');
  await p.click('#b-new'); await sleep(200); await shot('2-prologue'); await p.click('#b-start'); await sleep(600);
  ok(await p.evaluate(() => window.__game.ui === 'play'), 'игра началась');
  // --- туториал реальным вводом
  const tut = () => p.evaluate(() => window.__game.s.tut.step);
  ok(await tut() === 0, 'туториал шаг 0');
  await shot('3-tutorial-1');
  if (mob) { const sv = await p.evaluate(() => { const g = window.__game, r = document.getElementById('game').getBoundingClientRect(); const s = g.view.scale; return [r.left + (g.L.shovel.x + g.L.offX + g.L.shovel.w / 2) * s, r.top + (g.L.shovel.y + g.L.shovel.h / 2) * s]; }); await p.touchscreen.tap(sv[0], sv[1]); }
  else await p.keyboard.press('Space');
  await sleep(200); ok(await tut() >= 1, 'пробел/тап: уголь подброшен, шаг ≥ 1');
  // подбрасываем до давления
  for (let i = 0; i < 40 && (await tut()) < 2; i++) { await p.keyboard.press('Space'); await sleep(450); }
  ok(await tut() >= 2, 'давление в зелёной зоне, шаг ≥ 2');
  await shot('3-tutorial-2');
  const colPos = i => p.evaluate((i) => { const g = window.__game, r = document.getElementById('game').getBoundingClientRect(), s = g.view.scale; const L = g.L; const m = L.modules; const gap = L.portrait ? 6 : 14; const cw = (m.w - gap * 3) / 4; const x = m.x + i * (cw + gap) + cw / 2; return { x: r.left + (x + L.offX) * s, y0: r.top + (m.y + (L.portrait ? 42 : 52) + 34) * s, y1: r.top + (m.y + m.h - (L.portrait ? 62 : 72)) * s }; }, i);
  const dragValve = async (i, frac) => { const c = await colPos(i); const yb = c.y1, yt = c.y0 + (c.y1 - c.y0) * (1 - frac); await p.mouse.move(c.x, yb); await p.mouse.down(); await p.mouse.move(c.x, (yb + yt) / 2, { steps: 4 }); await p.mouse.move(c.x, yt, { steps: 4 }); await p.mouse.up(); };
  const need = i => p.evaluate((i) => { const g = window.__game; return g.s.needNow[i] / [5.6, 8.5, 6.5, 3.2][i]; }, i);
  // клавиатурой — госпиталь
  await p.keyboard.press('1');
  for (let k = 0; k < 20; k++) { const st = await tut(); if (st > 2) break; const v = await p.evaluate(() => window.__game.s.valves[0]); const n = await need(0); if (v < n - 0.02) await p.keyboard.press('ArrowUp'); await p.keyboard.press('Space'); await sleep(120); }
  ok(await tut() >= 3, 'вентиль госпиталя клавиатурой (↑)');
  // мышью — кварталы
  await dragValve(1, await need(1)); await sleep(150);
  ok(await tut() >= 4, 'вентиль кварталов мышью (перетаскивание)');
  await dragValve(2, await need(2)); await sleep(150); await dragValve(3, await need(3)); await sleep(200);
  for (let i = 0; i < 6 && (await tut()) < 6; i++) { await p.keyboard.press('Space'); await sleep(200); }
  ok(await tut() >= 6, 'все вентили настроены, шаг ≥ 6 (утечка)');
  await sleep(300); await shot('3-tutorial-3-leak');
  const lk = await p.evaluate(() => { const g = window.__game, r = document.getElementById('game').getBoundingClientRect(), s = g.view.scale; const lk = g.s.leaks[0]; if (!lk) return null; const L = g.L, m = L.modules, gap = L.portrait ? 6 : 14, cw = (m.w - gap * 3) / 4; const cx = m.x + lk.pipe * (cw + gap) + cw / 2; const ly = L.manifoldY + (m.y - L.manifoldY) * 0.55; return [r.left + (cx + L.offX) * s, r.top + ly * s]; });
  ok(!!lk, 'в туториале появилась утечка');
  if (lk) { await p.mouse.click(lk[0], lk[1]); }
  await sleep(300);
  ok(await p.evaluate(() => window.__game.s.tut.done), 'туториал завершён по клику на утечку');
  // пауза
  await p.keyboard.press('KeyP'); await sleep(150);
  ok(await p.evaluate(() => window.__game.ui === 'pause'), 'пауза по P');
  const t0 = await p.evaluate(() => window.__game.s.clock); await sleep(500);
  ok(Math.abs((await p.evaluate(() => window.__game.s.clock)) - t0) < 0.05, 'время стоит на паузе');
  await shot('3b-pause');
  await p.keyboard.press('Escape'); await sleep(100);
  ok(await p.evaluate(() => window.__game.ui === 'play'), 'продолжение по Esc');
  // --- бот до конца (ускорение)
  await p.evaluate(() => { window.__game.setBot('good', { react: 0.5 }); window.__game.setSpeed(12); });
  let shots = { mid: false, card: false, sum: false };
  const t00 = Date.now(); let cards = 0, sums = 0, endShot = false;
  while (Date.now() - t00 < 170000) {
    const st = await p.evaluate(() => ({ ui: window.__game.ui, n: window.__game.s.night, t: window.__game.s.t, ph: window.__game.s.phase }));
    if (st.ui === 'play' && st.n === 3 && st.t > 25 && !shots.mid) { shots.mid = true; await p.evaluate(() => window.__game.setSpeed(1)); await sleep(300); await shot('4-midgame'); await p.evaluate(() => window.__game.setSpeed(12)); }
    if (st.ui === 'card') { cards++; if (!shots.card) { shots.card = true; await shot('5-card'); } const nm = await p.evaluate(() => window.__game.s.card.id); const idx = { timka: 1, shift: 1, brown: 1, sloboda: 0 }[nm]; await p.click(`#c-opts .choice:nth-child(${idx + 1})`); }
    if (st.ui === 'summary') { sums++; if (process.env.VERBOSE) console.log('   ночь', st.n + 1, JSON.stringify(await p.evaluate(() => window.__game.s.summary))); if (!shots.sum) { shots.sum = true; await shot('5b-summary'); } await p.click('#b-next'); }
    if (st.ui === 'ending') break;
    await sleep(150);
  }
  ok(await p.evaluate(() => window.__game.ui === 'ending'), 'бот дошёл до экрана концовки');
  ok(cards === 4, 'показаны 4 карточки решений (' + cards + ')');
  ok(sums >= 9, 'экраны итогов ночей (' + sums + ')');
  await sleep(500); await shot('6-ending');
  const end = await p.evaluate(() => ({ e: window.__game.s.ending, h: document.getElementById('e-h').textContent, pop: Math.round(window.__game.s.pop) }));
  console.log('  концовка:', end.e, '«' + end.h + '»', 'жителей', end.pop);
  ok(['light', 'smoke', 'iron'].includes(end.e), 'победная концовка у хорошего бота');
  ok(await p.evaluate(() => window.__game.meta.endings.length >= 1 && localStorage.getItem('last-boiler-save-v1') === null), 'концовка записана, сохранение очищено');
  // сохранение/продолжение
  await p.click('#b-emenu'); await sleep(100);
  await p.evaluate(() => { window.__game.setBot(null); });
  await p.click('#b-new'); await p.click('#b-start'); await sleep(500);
  await p.evaluate(() => { window.__game.jump(2); }); await sleep(400);
  ok(await p.evaluate(() => !!localStorage.getItem('last-boiler-save-v1')), 'прогресс сохранён в localStorage');
  await p.reload({ waitUntil: 'load' }); await sleep(500);
  ok(await p.$eval('#b-continue', e => !e.hidden), 'после перезагрузки есть «Продолжить»');
  await p.click('#b-continue'); await sleep(400);
  ok(await p.evaluate(() => window.__game.ui === 'play' && window.__game.s.night === 2), 'продолжение с ночи 3');
  ok(errs.length === 0, 'нет ошибок/предупреждений в консоли' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  ok(external.length === 0, 'нет внешних сетевых запросов' + (external.length ? ': ' + external.join(',') : ''));
  await ctx.close();
}
(async () => {
  let srv, base = URL_BASE;
  if (!base) { const r = await serve(); srv = r.srv; base = 'http://127.0.0.1:' + r.port; }
  const prefix = process.env.SHOT_PREFIX || '';
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    if (!process.env.ONLY) await run(b, base, 'desktop', 1280, 800, false, prefix);
    await run(b, base, 'mobile', 390, 844, true, prefix);
  } finally { await b.close(); if (srv) srv.close(); }
  console.log(fails ? `\nПРОВАЛЕНО проверок: ${fails}` : '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'); process.exit(fails ? 1 : 0);
})();
