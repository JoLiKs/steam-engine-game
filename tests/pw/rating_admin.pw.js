// E2E (Playwright): рейтинг, телеметрия, офлайн-режим, админка (401/логин/панель/скрытие/CSV) — на локальном стенде (бэкенд + настоящий _worker.js).
const { start } = require('../devstack');
const { launch, openGame, playToEnding, adminLogin, ok, results, sleep, SHOTS } = require('./lib');
const path = require('path');

(async () => {
  const stack = await start();
  const base = stack.base;
  const browser = await launch();
  try {
    console.log('\n== Админка: доступ без сессии');
    for (const p of ['/admin/panel/', '/admin/panel/app.js', '/api/admin/stats', '/api/admin/sessions', '/api/admin/export?what=scores']) {
      const r = await fetch(base + p); ok(r.status === 401, `${p} без сессии → 401 (${r.status})`);
    }
    ok((await fetch(base + '/admin/')).status === 200, '/admin/ (страница входа) открыта');
    ok((await fetch(base + '/api/admin/login', { method: 'POST', body: '{"password":"x"}', headers: { 'content-type': 'application/json' } })).status === 403, 'вход без допустимого Origin → 403');
    const bad = await adminLogin(base, 'wrong-password', '203.0.113.5'); ok(bad.status === 401, 'неверный пароль → 401');
    ok((await fetch(base + '/api/g/score', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })).status === 401, 'POST /api/g/score без билета → 401');
    ok((await fetch(base + '/api/g/leaderboard', { method: 'DELETE' })).status === 405, 'лишние методы на публичном API → 405');
    ok((await fetch(base + '/api/g/unknown')).status === 404, 'неизвестный путь /api/g/* → 404');

    console.log('\n== Игра с нуля до концовки → рейтинг и телеметрия (desktop 1280×800)');
    const errs = [];
    const { ctx, page } = await openGame(browser, base, { errs, ip: '203.0.113.21' });
    ok(await page.isVisible('#b-board'), 'кнопка «Рейтинг» видна, когда бэкенд доступен');
    await page.click('#b-board'); await sleep(500);
    ok(await page.isVisible('#board') && (await page.textContent('#lb-msg')).includes('Пока пусто'), 'пустой рейтинг: «Пока пусто»');
    await page.screenshot({ path: path.join(SHOTS, 'rating-empty-desktop.png') });
    await page.click('#b-lbclose');
    const reached = await playToEnding(page);
    ok(reached, 'бот дошёл до концовки');
    await sleep(600);
    ok(await page.isVisible('#e-rank'), 'на финале есть форма рейтинга');
    ok(await page.isVisible('#b-submit'), 'кнопка «Отправить в рейтинг»');
    ok(await page.$eval('#e-nick', e => e.getAttribute('placeholder') === 'Аноним' && e.maxLength === 16), 'ник необязателен: placeholder «Аноним», maxlength 16');
    await page.screenshot({ path: path.join(SHOTS, 'ending-with-rating-desktop.png') });
    const myScore = await page.evaluate(() => window.__game.s.ending);
    await page.fill('#e-nick', '<b>Тест</b>');
    await page.click('#b-submit'); await sleep(1200);
    ok(await page.isVisible('#board'), 'после отправки открылся рейтинг');
    const items = await page.$$eval('#lb-list li', els => els.map(e => ({ t: e.textContent, html: e.innerHTML })));
    ok(items.length === 1, 'в рейтинге одна запись (' + items.length + ')');
    ok(items[0] && !/<img|<script/i.test(items[0].html) && !/[<>]/.test(items[0].t) && /Тест/.test(items[0].t), 'ник санитизирован, без HTML: «' + (items[0] && items[0].t.split(/\d/)[0]) + '»');
    await page.screenshot({ path: path.join(SHOTS, 'rating-filled-desktop.png') });
    await page.click('[data-board=survival]'); await sleep(500);
    ok((await page.$$('#lb-list li')).length === 1, 'вкладка «По выживанию» показывает запись');
    // повторная отправка того же результата невозможна
    await page.click('#b-lbclose'); await sleep(150);
    ok(await page.evaluate(() => document.getElementById('b-submit').hidden), 'кнопка отправки скрыта после успеха');
    ok(errs.length === 0, 'нет ошибок в консоли' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();

    console.log('\n== Телеметрия видна в админке');
    const adm = await adminLogin(base, stack.password);
    ok(adm.status === 200, 'вход с верным паролем → 200');
    ok((await adm.api('/admin/panel/')).status === 200, 'панель отдаётся после входа');
    const st = await adm.json('/api/admin/stats');
    ok(st.sessions === 1 && st.ended === 1, `1 сессия, завершена (sessions=${st.sessions})`);
    ok(Object.keys(st.endings).length === 1 && Object.keys(st.endings)[0] === myScore, 'распределение концовок: ' + JSON.stringify(st.endings));
    ok(st.reached_night['10'] === 1, 'дошла до 10 ночей');
    ok(st.platforms.linux === 1 || st.platforms.other === 1, 'платформа определена: ' + JSON.stringify(st.platforms));
    ok(Array.isArray(st.avg_valves) && st.avg_valves.every(v => v >= 0 && v <= 1), 'средние вентили есть: ' + JSON.stringify(st.avg_valves));
    const ses = await adm.json('/api/admin/sessions');
    const det = await adm.json('/api/admin/sessions/' + ses.items[0].rid);
    const types = det.events.map(e => e.type);
    ok(types[0] === 'start' && types.filter(t => t === 'night_end').length === 10 && types.at(-1) === 'ending', 'события: start, 10×night_end, ending (' + types.length + ')');
    ok(!JSON.stringify(det).match(/203\.0\.113\.21|127\.0\.0\.1/), 'IP нигде не хранится в открытом виде');
    ok(det.ua && det.screen_w === 1280, 'устройство/экран: ' + det.ua + ' ' + det.screen_w + '×' + det.screen_h);
    const csv = await (await adm.api('/api/admin/export?what=sessions')).text();
    ok(csv.includes('rid,created_at') && csv.trim().split('\n').length === 2, 'CSV сессий');

    console.log('\n== Переключатель статистики выключен');
    const e2 = [];
    const o = await openGame(browser, base, { errs: e2, ip: '203.0.113.22' });
    await o.page.click('#b-settings'); await sleep(200);
    ok(await o.page.isChecked('#o-stats'), 'по умолчанию «Отправлять анонимную статистику» включено');
    ok((await o.page.textContent('#stats-note')).includes('Без имени'), 'честное описание в настройках');
    await o.page.screenshot({ path: path.join(SHOTS, 'settings-desktop.png') });
    await o.page.uncheck('#o-stats'); await o.page.click('#b-sclose');
    ok(await o.page.evaluate(() => JSON.parse(localStorage.getItem('last-boiler-settings-v1')).stats === false), 'настройка сохранена в localStorage');
    ok(await playToEnding(o.page), 'прохождение без статистики');
    await sleep(400);
    ok((await adm.json('/api/admin/stats')).sessions === 1, 'новых сессий нет (события не отправлялись)');
    ok(await o.page.isVisible('#e-rank'), 'рейтинг при этом доступен по кнопке');
    await o.ctx.close();

    console.log('\n== Офлайн / бэкенд недоступен');
    const e3 = [];
    const off = await openGame(browser, base, { errs: e3, offline: true, ip: '203.0.113.23' });
    ok(await off.page.$eval('#b-board', e => e.hidden), 'кнопка «Рейтинг» скрыта');
    ok(await playToEnding(off.page), 'игра проходится до конца без бэкенда');
    await sleep(500);
    ok(await off.page.$eval('#e-rank', e => e.hidden), 'форма рейтинга не показывается');
    ok(await off.page.evaluate(() => document.getElementById('e-stats').textContent.includes('Счёт')), 'счёт на финале показан и офлайн');
    ok(e3.length === 0, 'нет ошибок консоли офлайн' + (e3.length ? ': ' + e3.join(' | ') : ''));
    await off.ctx.close();

    console.log('\n== Страница входа и панель (UI)');
    const e4 = [];
    const lp = await openGame(browser, base, { errs: e4, query: 'admin/', ip: '198.51.100.88' });
    await lp.page.fill('#pw', 'nope'); await lp.page.click('button[type=submit]'); await sleep(900);
    ok(await lp.page.isVisible('#err') && (await lp.page.textContent('#err')).includes('Неверный'), 'неверный пароль: сообщение');
    await lp.page.screenshot({ path: path.join(SHOTS, 'admin-login.png') });
    await lp.page.fill('#pw', stack.password); await lp.page.click('button[type=submit]');
    await lp.page.waitForURL('**/admin/panel/', { timeout: 5000 }); await sleep(900);
    ok(await lp.page.isVisible('#cards .stat'), 'панель открылась, агрегаты показаны');
    const cards = await lp.page.$$eval('#cards .stat', els => els.map(e => e.textContent));
    ok(cards[0].includes('1'), 'карточка «Сессий»: ' + cards[0]);
    await lp.page.screenshot({ path: path.join(SHOTS, 'admin-overview.png'), fullPage: true });
    lp.page.on('dialog', x => x.accept());
    await lp.page.click('[data-tab=sessions]'); await sleep(700);
    ok((await lp.page.$$('#sTable tbody tr')).length === 1, 'в «Сессиях» одна строка (вторая сессия — без статистики не пишется)');
    await lp.page.selectOption('#sFilters [name=platform]', { index: 1 }); await lp.page.click('#sFilters button[type=submit]'); await sleep(500);
    ok((await lp.page.$$('#sTable tbody tr')).length === 1, 'фильтр по платформе работает');
    await lp.page.screenshot({ path: path.join(SHOTS, 'admin-sessions.png'), fullPage: true });
    await lp.page.click('[data-tab=scores]'); await sleep(600);
    ok((await lp.page.$$('#scTable tbody tr')).length === 1, 'в «Рейтинге» одна запись');
    const dl = lp.page.waitForEvent('download', { timeout: 5000 });
    await lp.page.click('#scCsv'); const d = await dl; ok(d.suggestedFilename().endsWith('.csv'), 'экспорт CSV рейтинга: ' + d.suggestedFilename());
    await lp.page.click('#scTable tbody tr button:first-child'); await sleep(700);   // «Скрыть»
    ok((await (await fetch(base + '/api/g/leaderboard')).json()).entries.length === 0, 'скрытая запись пропала из публичного рейтинга');
    await lp.page.click('#scTable tbody tr button:first-child'); await sleep(700);   // «Показать»
    ok((await (await fetch(base + '/api/g/leaderboard')).json()).entries.length === 1, 'запись можно вернуть');
    await lp.page.screenshot({ path: path.join(SHOTS, 'admin-scores.png'), fullPage: true });
    await lp.page.click('#scTable tbody tr button.danger'); await sleep(700);
    ok((await (await fetch(base + '/api/g/leaderboard')).json()).entries.length === 0, 'удаление записи из панели');
    await lp.page.click('#logout'); await lp.page.waitForURL('**/admin/', { timeout: 5000 });
    ok((await fetch(base + '/admin/panel/')).status === 401, 'после выхода панель недоступна (401)');
    ok(e4.length === 0, 'нет ошибок консоли в админке' + (e4.length ? ': ' + e4.join(' | ') : ''));
    await lp.ctx.close();
  } catch (e) { ok(false, 'исключение: ' + (e.stack || e)); console.log(stack.log().slice(-1500)); }
  finally { await browser.close(); await stack.stop(); }
  const { fails, passes } = results();
  console.log(`\n${fails ? 'ПРОВАЛЕНО' : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'}: ✓${passes} ✗${fails}`); process.exit(fails ? 1 : 0);
})();
