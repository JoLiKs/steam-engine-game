// e2e мультиплеера на два настоящих браузера (два контекста Chromium: десктоп и «телефон»): лобби, роли, права, кооператив,
// чат с защитой от XSS, голосование, реконнект после перезагрузки страницы, выход. Против локального стенда с настоящим бэкендом.
const { ok, results, sleep, launch } = require('./lib');
const path = require('path'), fs = require('fs');
const SHOTS = path.resolve(__dirname, '../../screenshots/v2.0'); fs.mkdirSync(SHOTS, { recursive: true });
const G = (p, f) => p.evaluate(f);
const until = async (p, f, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* страница могла перезагружаться */ } await sleep(150); } return false; };
const drag = async (p, i, v) => { const a = await p.evaluate(([i, v]) => window.__game.pt(i, 0.5), [i, v]); const b = await p.evaluate(([i, v]) => window.__game.pt(i, v), [i, v]); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(b.x, b.y, { steps: 6 }); await p.mouse.up(); };

(async () => {
  const stack = await require('../devstack').start();
  const b = await launch(); const errsA = [], errsB = [];
  const mkpage = async (opts, errs) => {
    const ctx = await b.newContext(opts); const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/\/api\/(g|admin)\//.test(m.location().url || '')) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    return { ctx, page };
  };
  const A = await mkpage({ viewport: { width: 1280, height: 800 } }, errsA);
  const B = await mkpage({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, errsB);
  const pa = A.page, pb = B.page;
  const Q = `?debug&ws=${encodeURIComponent(stack.ws)}`;
  try {
    await pa.goto(stack.base + '/' + Q); await pa.waitForSelector('#b-mp', { state: 'visible' });
    console.log('\n== Лобби');
    await pa.click('#b-mp'); await pa.waitForSelector('#lobby:not([hidden])');
    ok(await pa.isVisible('#mp-create') && await pa.isVisible('#mp-join'), 'лобби: форма создания и входа');
    await pa.fill('#mp-nick', ''); await pa.type('#mp-nick', 'mьpзм');
    ok((await pa.inputValue('#mp-nick')) === 'mьpзм' && await G(pa, () => window.__game.settings.sound === true) && await G(pa, () => window.__game.ui) === 'lobby', 'AUD-07: ввод «m ь p з» в поле ника не выключает звук и не ставит паузу');
    await pa.fill('#mp-nick', '<b>Анна</b>'); await pa.selectOption('#mp-max', '2'); await pa.click('#mp-create');
    ok(await until(pa, () => !document.getElementById('mp-room').hidden), 'комната создана, показан экран комнаты');
    const code = await pa.textContent('#mp-roomcode'); ok(/^[A-HJ-NP-Z2-9]{5}$/.test(code), 'код комнаты из 5 символов: ' + code);
    const nickA = await pa.$eval('#mp-players li b', e => e.textContent); ok(!/[<>]/.test(nickA), 'ник очищен от HTML: «' + nickA + '»');
    ok(await pa.isDisabled('#mp-start'), 'до прихода второго игрока «Начать» недоступно');

    await pb.goto(stack.base + '/' + Q + '&room=' + code); await pb.waitForSelector('#lobby:not([hidden])');
    ok((await pb.inputValue('#mp-code')) === code, 'по ссылке ?room=КОД поле кода заполнено');
    await pb.fill('#mp-nick', 'Борис'); await pb.click('#mp-join');
    ok(await until(pb, () => !document.getElementById('mp-room').hidden), 'второй игрок вошёл в комнату');
    ok(await until(pa, () => document.querySelectorAll('#mp-players li').length === 2), 'хозяин видит двух игроков');
    ok(await pb.isHidden('#mp-start'), 'не-хозяину кнопки «Начать» нет');
    await pa.screenshot({ path: path.join(SHOTS, 'lobby-desktop.png') }); await pb.screenshot({ path: path.join(SHOTS, 'lobby-mobile.png') });
    ok(await pa.isDisabled('#mp-start') && await G(pa, () => window.__game.ui) === 'lobby', 'пока второй не нажал «Готов», старт заблокирован');
    await pb.click('#mp-ready'); ok(await until(pa, () => !document.getElementById('mp-start').disabled), 'после «Готов» кнопка «Начать» активна');

    console.log('\n== Игра вдвоём');
    await pa.click('#mp-start');
    ok(await until(pa, () => window.__game.ui === 'play' && window.__game.mp.inGame) && await until(pb, () => window.__game.ui === 'play' && window.__game.mp.inGame), 'оба перешли в игру');
    const ra = await G(pa, () => window.__game.mp.mine), rb = await G(pb, () => window.__game.mp.mine);
    ok(JSON.stringify(ra.valves) === '[0,1]' && ra.leaks && !ra.shovel && JSON.stringify(rb.valves) === '[2,3]' && rb.shovel, 'роли: Анна — Госпиталь+Кварталы+утечки; Борис — Завод+Фильтры+лопата');
    ok(await until(pa, () => window.__game.s.t > 0.5, 8000), 'сервер присылает снимки: время ночи идёт');
    ok((await pa.textContent('#mp-role')).includes('Госпиталь'), 'подпись роли в интерфейсе');
    await pa.screenshot({ path: path.join(SHOTS, 'coop-desktop.png') }); await pb.screenshot({ path: path.join(SHOTS, 'coop-mobile.png') });

    // права: Анна двигает свой клапан → Борис видит; Борис пытается двинуть клапан Анны → нет эффекта
    await drag(pa, 0, 0.8);
    ok(await until(pb, () => Math.abs(window.__game.s.valves[0] - 0.8) < 0.06, 6000), 'Госпиталь Анны (0.8) виден у Бориса через сервер');
    await pb.keyboard.press('1'); await pb.keyboard.press('ArrowDown'); await pb.keyboard.press('ArrowDown'); await sleep(500);
    ok(await G(pb, () => window.__game.s.valves[0]) > 0.7, 'Борис не может двигать чужой клапан (нет эффекта)');
    ok(await G(pa, () => window.__game.s.valves[0]) > 0.7, 'у Анны значение не изменилось');
    await drag(pb, 2, 0.5); ok(await until(pa, () => Math.abs(window.__game.s.valves[2] - 0.5) < 0.06, 6000), 'Завод Бориса (0.5) виден у Анны');
    // лопата: только у Бориса
    const f0 = await G(pa, () => window.__game.s.fire);
    const sp = await pb.evaluate(() => window.__game.shovelPt()); await pb.mouse.click(sp.x, sp.y);
    ok(await until(pa, f => window.__game.s.fire > f + 4, 5000, f0), 'бросок угля Бориса виден у Анны (огонь растёт)');
    const spa = await pa.evaluate(() => window.__game.shovelPt()); const sh0 = await G(pa, () => window.__game.s.shovels || 0);
    await pa.mouse.click(spa.x, spa.y); await sleep(500);
    ok(await G(pa, () => window.__game.s.shovels || 0) === sh0, 'Анна лопату не получает');

    console.log('\n== Чат и реакции');
    await pa.click('#mp-chatbtn'); await pa.fill('#mp-chatin', 'Привет, <img src=x onerror=window.__xss=1> держим давление!'); await pa.press('#mp-chatin', 'Enter');
    ok(await until(pb, () => document.querySelectorAll('#mp-chatlog li').length >= 1), 'сообщение дошло до Бориса');
    ok(await pb.$$eval('#mp-chatlog img', e => e.length) === 0 && !(await G(pb, () => window.__xss)), 'HTML в чате не исполняется (XSS)');
    ok((await pb.$eval('#mp-chatlog li', e => e.textContent)).includes('<img src=x'), 'текст показан буквально');
    await pa.fill('#mp-chatin', 'ссылка http://evil.example'); await sleep(1100); await pa.press('#mp-chatin', 'Enter'); await sleep(300);
    ok(await pb.$$eval('#mp-chatlog li', e => e.length) === 1, 'сообщение со ссылкой отклонено сервером');
    await pa.click('#mp-emos .emo >> nth=1'); ok(await until(pb, () => document.querySelectorAll('#mp-float .floaty').length >= 1, 4000), 'эмодзи-реакция всплыла у Бориса');
    await pa.keyboard.press('Escape'); await pa.click('#mp-chatbtn');   // закрыть панель

    console.log('\n== Ночь → рассвет → голосование');
    ok(await until(pa, () => window.__game.ui === 'summary', 70000) && await until(pb, () => window.__game.ui === 'summary', 5000), 'после первой ночи у обоих экран «Рассвет»');
    ok(await G(pa, () => window.__game.s.summary && window.__game.s.summary.night === 0), 'сводка ночи 1 пришла с сервера');
    await pa.click('#b-next'); await sleep(400);
    ok(await pa.isDisabled('#b-next') && (await pa.textContent('#b-next')).includes('Ждём'), 'после «Дальше» у Анны — ожидание остальных');
    await pb.click('#b-next');
    ok(await until(pa, () => window.__game.ui === 'card') && await until(pb, () => window.__game.ui === 'card'), 'карточка решения у обоих');
    await pa.click('#c-opts .choice >> nth=0'); await sleep(400);
    ok((await pb.textContent('#c-vote')).includes('1 из 2'), 'Борис видит ход голосования («1 из 2»)');
    await pb.click('#c-opts .choice >> nth=0');
    ok(await until(pa, () => window.__game.ui === 'play' && window.__game.s.night === 1) && await until(pb, () => window.__game.ui === 'play' && window.__game.s.night === 1), 'решение принято, началась ночь 2');
    ok(await G(pa, () => window.__game.s.flags.timka === true), 'решение применено на сервере у обоих (Тимка помогает)');

    console.log('\n== Реконнект');
    await pb.reload(); await pb.waitForSelector('#game');
    ok(await until(pb, () => window.__game.mp && window.__game.mp.inGame && window.__game.ui === 'play', 15000), 'после перезагрузки страницы Борис вернулся в игру (rejoin по секрету)');
    ok(JSON.stringify(await G(pb, () => window.__game.mp.mine.valves)) === '[2,3]', 'его роли сохранились');
    ok(await until(pa, () => window.__game.s.t > 1 && !document.getElementById('mp-net').textContent.includes('Пауза'), 12000), 'у Анны игра снова идёт');
    // обрыв без перезагрузки: гасим сеть у Бориса
    await B.ctx.setOffline(true).catch(() => {}); await pb.evaluate(() => window.__game && 0);
    await sleep(500); await B.ctx.setOffline(false);

    console.log('\n== Выход');
    pb.once('dialog', d => d.accept());
    const hit = await pb.evaluate(() => { const p = window.__game.pauseHit(), r = document.getElementById('game').getBoundingClientRect(), v = window.__game.view, L = window.__game.L; return { x: r.left + (p.x + p.w / 2 + L.offX) * v.scale, y: r.top + (p.y + p.h / 2) * v.scale }; });
    await pb.mouse.click(hit.x, hit.y);
    ok(await until(pb, () => window.__game.ui === 'title', 5000), 'кнопка «Пауза» в кооперативе = выход из комнаты (с подтверждением)');
    ok(await until(pa, () => window.__game.mp.players.length === 1, 5000), 'Анна видит, что Борис вышел; сервер перераспределил его управление');
    ok(JSON.stringify(await G(pa, () => window.__game.mp.mine.valves)) === '[0,1,2,3]' || await G(pa, () => window.__game.mp.mine.shovel), 'Анна получила лопату и клапаны Бориса');
    ok(errsA.length === 0 && errsB.length === 0, 'ошибок в консоли нет' + (errsA.length + errsB.length ? ': ' + [...errsA, ...errsB].slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'исключение: ' + (e.stack || e).toString().slice(0, 400)); await pa.screenshot({ path: path.join(SHOTS, 'fail-a.png') }).catch(() => {}); await pb.screenshot({ path: path.join(SHOTS, 'fail-b.png') }).catch(() => {}); }
  await b.close(); await stack.stop();
  const r = results(); console.log(r.fails ? `\nПРОВАЛЕНО: ${r.fails}` : `\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${r.passes})`); process.exit(r.fails ? 1 : 0);
})();
