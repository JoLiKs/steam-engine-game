// E2E (Playwright): ИИ-комментатор и раздел «ИИ» в админке на локальном стенде (бэкенд с подставными провайдерами SEG_AI_MOCK=1 + настоящий _worker.js).
const { start } = require('../devstack');
const { launch, openGame, adminLogin, ok, results, sleep, SHOTS } = require('./lib');
const path = require('path');
const GROQ = 'gsk_' + 'a1B2c3D4e5'.repeat(5);

(async () => {
  const stack = await start();
  const base = stack.base;
  const browser = await launch();
  try {
    console.log('\n== ИИ: доступ без сессии и публичный /api/g/note');
    for (const [m, p] of [['GET', '/api/admin/ai'], ['POST', '/api/admin/ai/settings'], ['POST', '/api/admin/ai/providers'], ['POST', '/api/admin/ai/sample'], ['POST', '/api/admin/ai/providers/b-chat/check'], ['DELETE', '/api/admin/ai/providers/b-chat']]) {
      const r = await fetch(base + p, { method: m, headers: { 'content-type': 'application/json', origin: base }, body: m === 'POST' ? '{}' : undefined });
      ok(r.status === 401, `${m} ${p} без сессии → 401 (${r.status})`);
    }
    const n1 = await (await fetch(base + '/api/g/note?s=calm&n=2')).json();
    ok(n1.enabled === true && typeof n1.note === 'string' && n1.note.length > 20 && ['ai', 'fallback'].includes(n1.src), `публичная заметка: ${n1.src}, «${(n1.note || '').slice(0, 40)}…»`);
    ok(!JSON.stringify(n1).match(/key|gsk_|sk-/i), 'в ответе нет ключей/служебных полей');
    ok((await fetch(base + '/api/g/note', { method: 'POST', body: '{}' })).status === 405, 'POST на /api/g/note → 405');

    console.log('\n== Админка: вкладка «ИИ» (UI)');
    const errs = [];
    const lp = await openGame(browser, base, { errs, query: 'admin/', ip: '198.51.100.91' });
    await lp.page.fill('#pw', stack.password); await lp.page.click('button[type=submit]');
    await lp.page.waitForURL('**/admin/panel/', { timeout: 5000 }); await sleep(600);
    lp.page.on('dialog', x => x.accept());
    await lp.page.click('[data-tab=ai]'); await sleep(900);
    ok(await lp.page.isVisible('#tab-ai') && (await lp.page.$$('#aiTable tbody tr')).length === 4, 'раздел «ИИ»: 4 встроенных бесплатных провайдера в списке');
    ok(!(await lp.page.isVisible('#aiVaultWarn')), 'шифрование ключей настроено — предупреждения нет');
    // 2.0 м2: переключатели ИИ-функций игры (ведущий, разбор, напарник, сюжет дня)
    ok(await lp.page.isChecked('#aiHost') && await lp.page.isChecked('#aiReview') && await lp.page.isChecked('#aiCompanion') && await lp.page.isChecked('#aiDaily'), 'вкладка «ИИ»: четыре новых переключателя по умолчанию включены');
    const rv = async () => (await fetch(base + '/api/g/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nights: 10, pop: 800, burnouts: 0, smog: 20, ending: 'light', mode: 'solo' }) })).json();
    ok((await rv()).enabled === true && (await rv()).text.length > 20, 'разбор партии отвечает, пока включён');
    await lp.page.uncheck('#aiReview'); await lp.page.uncheck('#aiDaily'); await lp.page.click('#aiSave'); await sleep(700);
    const st0 = await (await adminLogin(base, stack.password, '198.51.100.93')).json('/api/admin/ai');
    ok(st0.settings.review === false && st0.settings.daily === false && st0.settings.host === true && st0.settings.companion === true, 'выключатели сохранились на сервере (review/daily выкл., host/companion вкл.)');
    await sleep(5200);   // кэш настроек ИИ на сервере живёт до 5 с
    ok((await rv()).enabled === false, 'разбор выключен в админке → /api/g/review отдаёт enabled:false');
    ok((await (await fetch(base + '/api/g/daily')).json()).quest.src === 'fallback', 'сюжет дня выключен → запасной текст задания');
    await lp.page.check('#aiReview'); await lp.page.check('#aiDaily'); await lp.page.click('#aiSave'); await sleep(600);
    await lp.page.fill('#aiTopic', 'Котлы и давление в эпоху пара'); await lp.page.selectOption('#aiFreq', 'rare'); await lp.page.selectOption('#aiLength', 'long');
    await lp.page.click('#aiSave'); await sleep(500);
    const st = await (await adminLogin(base, stack.password, '198.51.100.92')).json('/api/admin/ai');
    ok(st.settings.topic === 'Котлы и давление в эпоху пара' && st.settings.frequency === 'rare' && st.settings.length === 'long', 'настройки (тема/частота/длина) сохранились на сервере');
    // добавление своего ключа: вставляем только ключ
    await lp.page.fill('#aiKey', GROQ); await lp.page.click('#aiAdd'); await sleep(1200);
    const addRes = await lp.page.textContent('#aiAddRes');
    ok(/Groq/.test(addRes) && /llama-3\.3/.test(addRes), 'провайдер определён по ключу: ' + addRes);
    ok((await lp.page.$$('#aiTable tbody tr')).length === 5, 'в списке 5 провайдеров');
    const firstRow = await lp.page.$eval('#aiTable tbody tr', r => r.textContent);
    ok(firstRow.includes('Groq') && firstRow.includes('gsk_…') , 'свой ключ — первым, с маской: ' + firstRow.replace(/\s+/g, ' ').slice(0, 80));
    const html = await lp.page.content();
    ok(!html.includes(GROQ) && !html.includes(GROQ.slice(4, -4)), 'полный ключ нигде не показан в странице');
    ok((await lp.page.inputValue('#aiKey')) === '', 'поле ключа очищено после добавления');
    const apiTxt = JSON.stringify(st) + JSON.stringify(await (await adminLogin(base, stack.password, '198.51.100.92')).json('/api/admin/ai'));
    ok(!apiTxt.includes(GROQ.slice(4, -4)), 'API админки не возвращает ключ');
    ok(!stack.log().includes(GROQ.slice(4, -4)), 'ключа нет в логах бэкенда');
    await lp.page.click('#aiTable tbody tr:first-child button:has-text("Проверить")'); await sleep(900);
    ok((await lp.page.$eval('#toast', e => e.textContent)).includes('Работает'), 'кнопка «Проверить» → «Работает»');
    await lp.page.click('#aiTable tbody tr:nth-child(2) button:has-text("▲")'); await sleep(700);
    ok(!(await lp.page.$eval('#aiTable tbody tr:first-child', r => r.textContent)).includes('gsk_…'), 'порядок меняется кнопкой ▲');
    await lp.page.selectOption('#aiSit', 'leak'); await lp.page.click('#aiSample'); await sleep(1500);
    const sample = await lp.page.textContent('#aiSampleOut'); const meta = await lp.page.textContent('#aiSampleMeta');
    ok(sample.length > 20 && /мс/.test(meta), `«Сгенерировать пример»: «${sample.slice(0, 40)}…» (${meta})`);
    await lp.page.screenshot({ path: path.join(SHOTS, 'admin-ai.png'), fullPage: true });
    await lp.page.fill('#aiKey', 'zzzzzzzzzzzzzzzzzzzzzzzz-bad'); await lp.page.click('#aiAdd'); await sleep(1000);
    ok(/не удалось/i.test(await lp.page.textContent('#aiAddRes')), 'неверный ключ: понятная ошибка');
    await lp.page.fill('#aiKey', '');
    // удалить свой ключ
    const delBtn = await lp.page.$$('#aiTable tbody tr button.danger'); ok(delBtn.length === 1, 'кнопка «Удалить» только у своего ключа');
    await lp.page.click('#aiTable tbody tr:nth-child(2) button.danger'); await sleep(800);
    ok((await lp.page.$$('#aiTable tbody tr')).length === 4, 'свой ключ удалён');
    // выключатель
    await lp.page.uncheck('#aiEnabled'); await lp.page.click('#aiSave'); await sleep(500);
    ok((await (await fetch(base + '/api/g/note')).json()).enabled === false, 'выключено в админке → /api/g/note отдаёт enabled:false');
    await lp.page.check('#aiEnabled'); await lp.page.click('#aiSave'); await sleep(500);
    ok(errs.filter(e => !/401|favicon/.test(e)).length === 0, 'нет ошибок консоли админки ' + JSON.stringify(errs.slice(0, 2)));
    await lp.ctx.close();

    console.log('\n== Игра: заметка механика появляется в панели сообщений');
    const ge = [];
    const g = await openGame(browser, base, { errs: ge, ip: '203.0.113.60' });
    ok(await g.page.isVisible('#b-new'), 'игра открылась');
    const noTut = await g.page.evaluate(() => !document.body.innerText.includes('ОБУЧЕНИЕ'));
    ok(noTut, 'надписи «ОБУЧЕНИЕ» в интерфейсе нет');
    await g.page.click('#b-new'); await g.page.click('#b-start'); await sleep(400);
    await g.page.evaluate(() => { window.__game.jump(1); window.__game.setBot('good', { react: 0.4 }); window.__game.setSpeed(40); });
    let toast = null;
    for (let i = 0; i < 60 && !toast; i++) { await sleep(250); toast = await g.page.evaluate(() => { const t = window.__game.toast; return t && t.title === 'Заметка механика' ? { ...t } : null; }); }
    ok(!!toast && toast.text.length > 20, 'заметка механика показана: «' + (toast ? toast.text.slice(0, 50) : '') + '…»');
    ok(toast && !/[<>]/.test(toast.text), 'в тексте нет HTML');
    if (toast) await g.page.screenshot({ path: path.join(SHOTS, 'ai-note-desktop.png') });
    await sleep(1500);
    const cnt = await g.page.evaluate(() => window.__game.notes.count);
    ok(cnt <= 3, `за ночь заметок не больше лимита (${cnt})`);
    await g.ctx.close();

    console.log('\n== Игра на телефоне (iPhone-вьюпорт 390×844): заметка влезает в панель');
    const m = await openGame(browser, base, { w: 390, h: 844, mobile: true, ip: '203.0.113.61' });
    await m.page.click('#b-new'); await m.page.click('#b-start'); await sleep(400);
    await m.page.evaluate(() => { window.__game.jump(1); window.__game.setBot('good', { react: 0.4 }); window.__game.setSpeed(40); });
    let mt = null;
    for (let i = 0; i < 60 && !mt; i++) { await sleep(250); mt = await m.page.evaluate(() => { const t = window.__game.toast; return t && t.title === 'Заметка механика'; }); }
    ok(!!mt, 'заметка на телефоне показана');
    await sleep(900); await m.page.screenshot({ path: path.join(SHOTS, 'ai-note-phone.png') });
    await m.ctx.close();

    console.log('\n== Игра без бэкенда ИИ: работает как раньше (запросы заметок падают)');
    const o = await openGame(browser, base, { offline: true, ip: '203.0.113.62' });
    await o.page.click('#b-new'); await o.page.click('#b-start'); await sleep(300);
    await o.page.evaluate(() => { window.__game.jump(1); window.__game.setBot('good', { react: 0.4 }); window.__game.setSpeed(40); });
    await sleep(6000);
    ok(await o.page.evaluate(() => window.__game.s.phase !== undefined && window.__game.toast == null), 'офлайн: игра идёт, заметок нет, ошибок нет');
    await o.ctx.close();
  } finally { await browser.close(); await stack.stop(); }
  const { fails, passes } = results();
  console.log(fails ? `\nПРОВАЛЕНО: ${fails} (прошло ${passes})` : `\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${passes})`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
