// Живая проверка кооператива в настоящих браузерах: игрок A на pages.dev, игрок B на github.io (разные origin → прямой wss к бэкенду).
const { ok, results, sleep, launch } = require('../pw/lib');
const PG = process.env.PG || 'https://steam-engine-game.pages.dev/', GH = process.env.GH || 'https://joliks.github.io/steam-engine-game/';
const until = async (p, f, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* ... */ } await sleep(200); } return false; };
(async () => {
  const b = await launch(), errs = [];
  const mk = async (opts) => { const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error' && !/\/api\/g\//.test(m.location().url || '')) errs.push(m.text().slice(0, 200)); }); p.on('pageerror', e => errs.push('pageerror ' + e.message)); return p; };
  const pa = await mk({ viewport: { width: 1280, height: 800 } }), pb = await mk({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  try {
    await pa.goto(PG + '?debug'); await pa.waitForSelector('#b-mp'); await pa.click('#b-mp'); await pa.fill('#mp-nick', 'ТЕСТ А'); await pa.click('#mp-create');
    ok(await until(pa, () => !document.getElementById('mp-room').hidden), 'pages.dev: комната создана по wss (CSP пропускает)');
    const code = await pa.textContent('#mp-roomcode'); console.log('  код', code);
    await pb.goto(GH + '?debug&room=' + code); await pb.waitForSelector('#lobby:not([hidden])'); await pb.fill('#mp-nick', 'ТЕСТ Б'); await pb.click('#mp-join');
    ok(await until(pb, () => !document.getElementById('mp-room').hidden), 'github.io: вошёл по ссылке ?room=КОД');
    ok(await until(pa, () => document.querySelectorAll('#mp-players li').length === 2), 'оба видят друг друга');
    await pb.click('#mp-ready'); ok(await until(pa, () => !document.getElementById('mp-start').disabled), '«Начать» активна'); await pa.click('#mp-start');
    ok(await until(pa, () => window.__game.mp.inGame && window.__game.ui === 'play') && await until(pb, () => window.__game.mp.inGame && window.__game.ui === 'play'), 'игра идёт у обоих');
    ok(await until(pb, () => window.__game.s.t > 1, 10000), 'снимки сервера идут (время ночи у github.io растёт)');
    await pa.keyboard.press('ArrowUp'); await sleep(200);
    ok(await until(pb, () => window.__game.s.valves[0] > 0.04, 6000), 'клапан Госпиталя игрока A поднят — виден игроку B');
    await pa.click('#mp-chatbtn'); await pa.fill('#mp-chatin', 'проверка связи'); await pa.press('#mp-chatin', 'Enter');
    ok(await until(pb, () => document.querySelector('#mp-chatlog li') && document.querySelector('#mp-chatlog li').textContent.includes('проверка связи')), 'чат между pages.dev и github.io');
    await pa.screenshot({ path: '/workspace/steam-game/screenshots/v2.0/live-pages.png' }); await pb.screenshot({ path: '/workspace/steam-game/screenshots/v2.0/live-ghpages.png' });
    await pa.evaluate(() => { window.confirm = () => true; }); await pb.evaluate(() => { window.confirm = () => true; });
    ok(errs.length === 0, 'ошибок консоли нет' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) { ok(false, 'исключение ' + String(e.stack || e).slice(0, 300)); }
  await b.close(); const r = results(); console.log(r.fails ? 'ПРОВАЛЕНО ' + r.fails : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (' + r.passes + ')'); process.exit(r.fails ? 1 : 0);
})();
