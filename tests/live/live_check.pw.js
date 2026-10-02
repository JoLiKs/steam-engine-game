// Живая проверка прода (запуск вручную): node tests/live/live_check.pw.js
// Пароль админки берётся из файла, указанного в SEG_SECRETS_FILE (строка ADMIN_PASSWORD=...), и нигде не печатается.
const { launch, openGame, ok, results, sleep, SHOTS } = require('../pw/lib');
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'https://steam-engine-game.pages.dev';
const pw = (fs.readFileSync(process.env.SEG_SECRETS_FILE || '/workspace/.steam_secrets', 'utf8').match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1];
(async () => {
  const browser = await launch(); const errs = [];
  const { ctx, page } = await openGame(browser, BASE, { errs, query: '?debug' });
  ok(await page.title() !== '', 'игра открылась: ' + await page.title());
  await page.waitForSelector('#b-board', { state: 'visible', timeout: 8000 }).catch(() => {}); ok(await page.isVisible('#b-board'), 'кнопка «Рейтинг» видна (бэкенд через Pages доступен)');
  await page.click('#b-board'); await sleep(700);
  await page.screenshot({ path: path.join(SHOTS, 'live-rating.png') });
  await page.click('#b-lbclose');
  // настройки и звук
  await page.click('#b-settings'); await sleep(300);
  ok(await page.isVisible('#o-sfx') && await page.isVisible('#o-music'), 'в настройках «Звуки» и «Музыка»');
  await page.screenshot({ path: path.join(SHOTS, 'live-settings.png') });
  await page.click('#b-sclose');
  // прохождение: безвольный бот на реальном времени до концовки
  await page.click('#b-new').catch(() => {}); await page.click('#b-start'); await sleep(500);
  await page.evaluate(() => { window.__game.setBot('reckless'); window.__game.setSpeed(1); });
  const t0 = Date.now(); let ended = false;
  while (Date.now() - t0 < 200000) {
    const st = await page.evaluate(() => ({ ui: window.__game.ui }));
    if (st.ui === 'ending') { ended = true; break; }
    if (st.ui === 'card') await page.click('#c-opts .choice >> nth=0');
    else if (st.ui === 'summary') await page.click('#b-next');
    await sleep(200);
    if (Date.now() - t0 > 30000 && !(Date.now() % 7)) await page.screenshot({ path: path.join(SHOTS, 'live-play.png') });
  }
  ok(ended, 'дошли до концовки за ' + Math.round((Date.now() - t0) / 1000) + ' с');
  await sleep(1500);
  const info = await page.evaluate(() => ({ ending: window.__game.s.ending, nights: window.__game.s.night, rank: !!document.querySelector('#e-rank') && getComputedStyle(document.querySelector('#e-rank')).display }));
  console.log('  концовка:', JSON.stringify(info));
  await page.screenshot({ path: path.join(SHOTS, 'live-ending.png') });
  if (ended && await page.isVisible('#b-submit')) {
    await page.fill('#e-nick', 'ТЕСТ-проверка');
    await page.click('#b-submit'); await sleep(2000);
    ok(await page.isVisible('#board'), 'результат принят, открыт рейтинг');
    const txt = await page.$$eval('#lb-list li', e => e.map(x => x.textContent));
    ok(txt.some(t => t.includes('ТЕСТ-проверка')), 'запись видна в публичном рейтинге');
    await page.screenshot({ path: path.join(SHOTS, 'live-rating-filled.png') });
  }
  console.log('  ошибки консоли игры:', errs.length, errs.slice(0, 3));
  ok(errs.length === 0, 'консоль чистая');
  await ctx.close();

  // админка: вход через интерфейс
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const ap = await a.newPage();
  const aerr = []; ap.on('pageerror', e => aerr.push(e.message));
  await ap.goto(BASE + '/admin/'); await sleep(500);
  await ap.screenshot({ path: path.join(SHOTS, 'live-admin-login.png') });
  const inp = await ap.$('input[type=password]'); await inp.fill(pw);
  await Promise.all([ap.waitForURL(/admin\/panel/, { timeout: 15000 }).catch(() => {}), ap.keyboard.press('Enter')]);
  await sleep(2500);
  ok(/admin\/panel/.test(ap.url()), 'вход в админку выполнен → панель');
  await ap.screenshot({ path: path.join(SHOTS, 'live-admin-overview.png') });
  // забрать данные через сессионный fetch в самой странице
  const res = await ap.evaluate(async () => {
    const me = await (await fetch('/api/admin/me')).json();
    const sc = await (await fetch('/api/admin/scores?limit=50')).json().catch(() => null);
    const ss = await (await fetch('/api/admin/sessions?limit=5')).json().catch(() => null);
    return { me, sc, ss };
  });
  console.log('  scores keys:', res.sc && Object.keys(res.sc), 'sessions keys:', res.ss && Object.keys(res.ss));
  fs.writeFileSync('/tmp/live_admin.json', JSON.stringify(res));
  ok(aerr.length === 0, 'нет ошибок JS на странице админки');
  await browser.close();
  const r = results(); console.log(r.fails ? `ПРОВАЛЕНО ✓${r.passes} ✗${r.fails}` : `ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ: ✓${r.passes}`);
})().catch(e => { console.error('ОШИБКА', e.message); process.exit(1); });
