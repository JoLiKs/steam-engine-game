// Живая проверка прод-UI: игра показывает заметку механика (ИИ или запасной текст) и вкладка «ИИ» в админке открывается. Тестовых данных не создаёт.
const { launch, openGame, ok, results, sleep, SHOTS } = require('../pw/lib');
const fs = require('fs'), path = require('path');
const pw = (fs.readFileSync(process.env.SEG_SECRETS || '/workspace/.steam_secrets', 'utf8').match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1];
const B = process.env.BASE || 'https://steam-engine-game.pages.dev';
(async () => {
  const browser = await launch();
  const errs = [];
  const g = await openGame(browser, B, { errs, w: 390, h: 844, mobile: true });
  ok(await g.page.isVisible('#b-new'), 'игра открывается на проде (телефонный вьюпорт)');
  await g.page.click('#b-new'); await g.page.click('#b-start'); await sleep(400);
  await g.page.evaluate(() => { window.__game.jump(1); window.__game.setBot('good', { react: 0.4 }); window.__game.setSpeed(8); });
  let t = null;
  for (let i = 0; i < 160 && !t; i++) { await sleep(250); t = await g.page.evaluate(() => { const x = window.__game.toast; return x && x.title === 'Заметка механика' ? x.text : null; }); }
  ok(!!t, 'заметка механика показана: «' + (t || '') + '»');
  if (t) { await sleep(800); await g.page.screenshot({ path: path.join(SHOTS, 'live-ai-note-phone.png') }); }
  ok(errs.length === 0, 'нет ошибок консоли' + JSON.stringify(errs.slice(0, 2)));
  await g.ctx.close();
  const a = await openGame(browser, B, { query: 'admin/', errs: [] });
  await a.page.fill('#pw', pw); await a.page.click('button[type=submit]');
  await a.page.waitForURL('**/admin/panel/', { timeout: 8000 }); await sleep(800);
  await a.page.click('[data-tab=ai]'); await sleep(1500);
  const rows = (await a.page.$$('#aiTable tbody tr')).length;
  ok(rows >= 4, `вкладка «ИИ» открыта, провайдеров в списке: ${rows}`);
  await a.page.screenshot({ path: path.join(SHOTS, 'live-admin-ai.png'), fullPage: true });
  await a.page.click('#logout'); await a.page.waitForURL('**/admin/', { timeout: 8000 });
  ok((await fetch(B + '/api/admin/ai')).status === 401, 'после выхода /api/admin/ai → 401');
  await browser.close();
  const { fails, passes } = results(); console.log(fails ? 'ПРОВАЛЕНО ' + fails : `ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${passes})`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
