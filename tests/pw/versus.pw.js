// e2e 2.0 м2: соревнование на два браузера (общий сид, живая таблица, финал с местами, проверка сервером), ИИ-напарник в кооперативе,
// испытание дня (задание, рейтинг дня), ссылка-вызов, достижения, карточка-шаринг. Против локального стенда; часы комнат ускорены (SEG_MP_TIMESCALE).
const { ok, results, sleep, launch } = require('./lib');
const path = require('path'), fs = require('fs');
const SHOTS = path.resolve(__dirname, '../../screenshots/v2.0'); fs.mkdirSync(SHOTS, { recursive: true });
const G = (p, f, a) => p.evaluate(f, a);
const until = async (p, f, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* перезагрузка */ } await sleep(150); } return false; };

(async () => {
  const stack = await require('../devstack').start({ env: { SEG_MP_TIMESCALE: '30', SEG_MP_CREATES: '60' } });
  const b = await launch(); const errs = [];
  const mk = async (opts) => { const ctx = await b.newContext(opts); const page = await ctx.newPage(); await ctx.grantPermissions([], {}).catch(() => {});
    page.on('console', m => { if (m.type() === 'error' && !/\/api\/(g|admin)\//.test(m.location().url || '')) errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message)); return { ctx, page }; };
  const A = await mk({ viewport: { width: 1280, height: 800 } });
  const B = await mk({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pa = A.page, pb = B.page;
  const Q = `?debug&ws=${encodeURIComponent(stack.ws)}`;
  try {
    console.log('\n== Соревнование: лобби');
    await pa.goto(stack.base + '/' + Q); await pa.waitForSelector('#b-mp', { state: 'visible' });
    await pa.click('#b-mp'); await pa.waitForSelector('#lobby:not([hidden])');
    ok(await pa.isVisible('#mp-mode'), 'в лобби есть выбор режима');
    await pa.fill('#mp-nick', 'Анна'); await pa.selectOption('#mp-max', '2'); await pa.selectOption('#mp-mode', 'versus'); await pa.click('#mp-create');
    ok(await until(pa, () => !document.getElementById('mp-room').hidden), 'комната создана');
    ok((await pa.textContent('#mp-modename')).includes('Соревнование'), 'метка режима «Соревнование»');
    ok(await pa.isHidden('#mp-bot'), 'ИИ-напарника в соревновании нет');
    const code = await pa.textContent('#mp-roomcode');
    await pb.goto(stack.base + '/' + Q + '&room=' + code); await pb.waitForSelector('#lobby:not([hidden])');
    await pb.fill('#mp-nick', 'Борис'); await pb.click('#mp-join');
    ok(await until(pb, () => !document.getElementById('mp-room').hidden) && (await pb.textContent('#mp-modename')).includes('Соревнование'), 'второй игрок в комнате соревнования');
    await pb.click('#mp-ready'); ok(await until(pa, () => !document.getElementById('mp-start').disabled), 'старт доступен');
    await pa.click('#mp-start');
    ok(await until(pa, () => window.__game.ui === 'play' && window.__game.mp.inGame) && await until(pb, () => window.__game.ui === 'play' && window.__game.mp.inGame), 'оба в гонке');
    const seedA = await G(pa, () => window.__game.s.seed), seedB = await G(pb, () => window.__game.s.seed);
    ok(seedA > 0 && seedA === seedB, 'общий сид у обоих: ' + seedA);
    ok(JSON.stringify(await G(pa, () => window.__game.mp.mine.valves)) === '[0,1,2,3]' && await G(pa, () => window.__game.mp.mine.shovel), 'у каждого свой котёл целиком (все вентили и лопата)');
    ok(await until(pa, () => !document.getElementById('mp-board').hidden && document.querySelectorAll('#mp-board li').length === 2, 8000), 'живая таблица гонки: 2 строки');
    ok(await until(pb, () => !document.getElementById('mp-board').hidden && document.querySelectorAll('#mp-board li').length === 2, 8000), 'таблица видна и на телефоне');
    // Анна активно играет (лопата), Борис молчит → у Анны очки/огонь выше
    for (let i = 0; i < 6; i++) { const sp = await pa.evaluate(() => window.__game.shovelPt()); await pa.mouse.click(sp.x, sp.y); await sleep(260); }
    ok(await until(pa, () => window.__game.s.fire > 5, 5000), 'бросок угля работает в своём котле');
    ok(await G(pb, () => window.__game.s.fire) < await G(pa, () => window.__game.s.fire), 'котёл соперника не затронут');
    await pa.screenshot({ path: path.join(SHOTS, 'versus-play-desktop.png') }); await pb.screenshot({ path: path.join(SHOTS, 'versus-play-mobile.png') });

    console.log('\n== Соревнование: финал');
    const drive = async (p) => { const t0 = Date.now(); while (Date.now() - t0 < 170000) { const st = await G(p, () => window.__game.ui).catch(() => ''); if (st === 'ending') return true; if (st === 'card') await p.click('#c-opts .choice >> nth=0').catch(() => {}); else if (st === 'summary') await p.click('#b-next').catch(() => {}); await sleep(200); } return false; };
    const [ea, eb] = await Promise.all([drive(pa), drive(pb)]);
    ok(ea && eb, 'оба дошли до финального экрана');
    ok(await until(pa, () => document.querySelectorAll('#e-places-list li').length === 2 && !document.getElementById('e-places').hidden, 20000), 'финал: список мест (2 игрока)');
    ok(await until(pb, () => document.querySelectorAll('#e-places-list li').length === 2, 20000), 'тот же список на телефоне');
    const txt = await pa.$$eval('#e-places-list li', l => l.map(x => x.textContent));
    ok(txt.some(t => t.includes('Анна')) && txt.some(t => t.includes('Борис')), 'в местах оба ника');
    ok(txt.every(t => /проверено сервером/.test(t)), 'у каждого отметка «проверено сервером»');
    const scs = await pa.$$eval('#e-places-list li span', l => l.map(x => parseInt(x.textContent, 10)));
    ok(scs.length === 2 && scs[0] >= scs[1], 'места отсортированы по очкам: ' + scs.join(' ≥ '));
    ok(await until(pa, () => !document.getElementById('e-review').hidden && document.getElementById('e-review').textContent.length > 20, 20000), 'разбор партии (ИИ или запасной) показан');
    ok(!(await pa.textContent('#e-review')).includes('Анна') && !(await pa.textContent('#e-review')).includes('Борис'), 'в разборе нет ников');
    ok(await G(pa, () => !!window.__game.meta.ach.rival), 'достижение «Соперник» получено');
    await pa.screenshot({ path: path.join(SHOTS, 'versus-final-desktop.png') }); await pb.screenshot({ path: path.join(SHOTS, 'versus-final-mobile.png'), fullPage: false });
    // шаринг: карточка и ссылка
    await pa.click('#b-share'); await sleep(700);
    ok((await pa.textContent('#e-share-msg')).length > 5, 'шаринг: есть сообщение («' + (await pa.textContent('#e-share-msg')).slice(0, 60) + '»)');
    const px = await G(pa, () => { const c = document.getElementById('share-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] > 120) n++; return { w: c.width, h: c.height, n }; });
    ok(px.w === 1200 && px.h === 630 && px.n > 200, 'карточка-картинка 1200×630 нарисована (светлых точек ' + px.n + ')');
    ok(await G(pa, () => !!window.__game.meta.ach.sharer), 'достижение за шаринг');

    console.log('\n== ИИ-напарник в кооперативе');
    const pc = (await mk({ viewport: { width: 1280, height: 800 } })).page;
    await pc.goto(stack.base + '/' + Q); await pc.click('#b-mp'); await pc.fill('#mp-nick', 'Вера'); await pc.selectOption('#mp-max', '2'); await pc.click('#mp-create');
    ok(await until(pc, () => !document.getElementById('mp-room').hidden), 'кооператив создан');
    ok(await pc.isVisible('#mp-bot'), 'кнопка «+ ИИ-напарник» видна хозяину');
    await pc.click('#mp-bot');
    ok(await until(pc, () => document.querySelectorAll('#mp-players li.bot').length === 1), 'бот в списке игроков');
    ok((await pc.textContent('#mp-players li.bot')).includes('Механик ИИ'), 'имя «Механик ИИ»');
    ok(await until(pc, () => !document.getElementById('mp-start').disabled), 'старт доступен: человек + бот');
    await pc.click('#mp-start');
    ok(await until(pc, () => window.__game.ui === 'play' && window.__game.mp.inGame), 'игра с ботом началась');
    ok(await until(pc, () => window.__game.s.t > 3 && window.__game.s.fire > 3, 40000), 'бот сам подбрасывает уголь (огонь растёт без действий человека)');
    ok(await until(pc, () => document.querySelectorAll('#mp-chatlog li').length >= 1, 40000), 'бот пишет реплику в чат');
    await pc.screenshot({ path: path.join(SHOTS, 'coop-bot.png') });

    console.log('\n== Испытание дня');
    const pd = (await mk({ viewport: { width: 1280, height: 800 } })).page;
    await pd.goto(stack.base + '/' + Q); await pd.waitForSelector('#b-daily', { state: 'visible' });
    await pd.click('#b-daily');
    ok(await until(pd, () => !document.getElementById('d-play').disabled && document.getElementById('d-title').textContent.length > 3), 'загружено задание дня: ' + (await pd.textContent('#d-title')));
    ok((await pd.textContent('#d-story')).length > 20 && (await pd.textContent('#d-goal')).startsWith('Задание'), 'сюжет и цель задания показаны');
    await pd.screenshot({ path: path.join(SHOTS, 'daily-overlay.png') });
    await pd.click('#d-play');
    ok(await until(pd, () => window.__game.ui === 'play' && window.__game.s.hostOn === true), 'старт испытания: ведущий включён');
    const dseed = await G(pd, () => window.__game.s.seed);
    const apiSeed = await (await fetch(stack.base + '/api/g/daily')).json();
    ok(apiSeed.seed === dseed, 'сид игры = сид дня с сервера (' + dseed + ')');
    await pd.evaluate(() => { window.__game.setBot('good', { react: 0.5 }); window.__game.setSpeed(30); });
    const dr = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 170000) { const st = await G(pd, () => window.__game.ui); if (st === 'ending') return true; if (st === 'card') await pd.click('#c-opts .choice >> nth=0').catch(() => {}); else if (st === 'summary') await pd.click('#b-next').catch(() => {}); await sleep(120); } return false; })();
    ok(dr, 'испытание пройдено до финала');
    ok(await pd.isVisible('#e-daily-msg') && (await pd.textContent('#e-daily-msg')).includes('Задание'), 'финал показывает исход задания: ' + (await pd.textContent('#e-daily-msg')).slice(0, 70));
    ok(await pd.evaluate(() => localStorage.getItem('last-boiler-save-v1')) === null, 'одиночное сохранение испытанием не затронуто');
    await pd.fill('#e-nick', 'Дарья'); await pd.click('#b-submit');
    ok(await until(pd, () => /место/.test(document.getElementById('e-rank-msg').textContent), 8000), 'результат записан в рейтинг дня: ' + (await pd.textContent('#e-rank-msg')).slice(0, 80));
    const board = await (await fetch(stack.base + '/api/g/daily/board')).json();
    ok(board.entries.length === 1 && board.entries[0].nick === 'Дарья', 'рейтинг дня на сервере содержит запись');
    ok(await G(pd, () => window.__game.meta.st.streak === 1 && !!window.__game.meta.ach.first_dawn), 'серия дней = 1, достижения выданы');
    await pd.screenshot({ path: path.join(SHOTS, 'daily-final.png') });
    // достижения: экран
    await pd.click('#b-emenu'); await pd.click('#b-ach');
    const cnt = await pd.$$eval('#a-list li', l => ({ n: l.length, got: l.filter(x => !x.classList.contains('lock')).length, svg: l.filter(x => x.querySelector('svg')).length }));
    ok(cnt.n >= 20 && cnt.svg === cnt.n && cnt.got >= 1, `экран достижений: ${cnt.n} шт., получено ${cnt.got}, у всех значок`);
    await pd.screenshot({ path: path.join(SHOTS, 'achievements.png') });
    await pd.click('#a-close');
    // вкладки рейтинга: сезон и день
    await pd.evaluate(() => { document.getElementById('b-board').hidden = false; }); await pd.click('#b-board');
    await pd.click('#board .tab[data-board="day"]'); ok(await until(pd, () => document.querySelectorAll('#lb-list li').length === 1), 'вкладка «День»: 1 запись');
    await pd.click('#board .tab[data-board="season"]'); ok(await until(pd, () => /Сезон|Пока пусто/.test(document.getElementById('lb-msg').textContent)), 'вкладка «Сезон» отвечает');
    await pd.click('#b-lbclose');

    console.log('\n== Ссылка-вызов');
    const pe = (await mk({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true })).page;
    await pe.goto(stack.base + '/' + Q + '&seed=4242&c=900'); await pe.waitForSelector('#t-chal:not([hidden])');
    ok((await pe.textContent('#t-chal')).includes('4242') && (await pe.textContent('#t-chal')).includes('900'), 'баннер вызова: сид и счёт');
    await pe.click('#b-chal');
    ok(await until(pe, () => window.__game.ui === 'play' && window.__game.s.seed === 4242), 'вызов стартует с сидом из ссылки');
    await sleep(600); ok(await pe.evaluate(() => localStorage.getItem('last-boiler-save-v1')) === null, 'вызов не пишет одиночное сохранение');
    const pf = (await mk({ viewport: { width: 412, height: 860 } })).page;
    await pf.goto(stack.base + '/' + Q + '&seed=abc&c=<script>'); await pf.waitForSelector('#b-new'); ok(await pf.isHidden('#t-chal'), 'мусорная ссылка вызова игнорируется');

    ok(errs.length === 0, 'ошибок в консоли нет' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'исключение: ' + (e.stack || e).toString().slice(0, 500)); await pa.screenshot({ path: path.join(SHOTS, 'fail-a.png') }).catch(() => {}); }
  await b.close(); await stack.stop();
  const r = results(); console.log(r.fails ? `\nПРОВАЛЕНО: ${r.fails}` : `\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${r.passes})`); process.exit(r.fails ? 1 : 0);
})();
