// Живая проверка GitHub Pages (https://joliks.github.io/steam-engine-game/): Chromium + WebKit, десктоп и телефон.
// Игра грузится, консоль чистая, рейтинг читается с бэкенда напрямую (CORS), телеметрия (билет+события) принимается, заметка механика появляется, /admin на github.io нет.
// Создаёт тестовые сессии телеметрии на проде — после запуска почистить (node /tmp/cleanup.js-аналог из README: «Очистка после живых тестов»).
const { chromium, webkit, devices } = require('playwright-core');
const BASE = process.env.BASE || 'https://joliks.github.io/steam-engine-game/';
const WK_ENV = { ...process.env, GIO_EXTRA_MODULES: '/workspace/debs/gio', GIO_USE_PROXY_RESOLVER: 'dummy', WEBKIT_DISABLE_COMPOSITING_MODE: '1', EGL_PLATFORM: 'surfaceless', __EGL_VENDOR_LIBRARY_FILENAMES: '/workspace/debs/root/usr/share/glvnd/egl_vendor.d/50_mesa.json', LIBGL_DRIVERS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/dri', GBM_BACKENDS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/gbm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? passes++ : fails++; };
const ENG = [
  { name: 'Chromium десктоп 1280×800', launch: () => chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }), ctx: { viewport: { width: 1280, height: 800 } } },
  { name: 'Chromium телефон (Pixel 7)', launch: () => chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }), ctx: { ...devices['Pixel 7'] } },
  { name: 'WebKit десктоп 1280×800', launch: () => webkit.launch({ env: WK_ENV }), ctx: { viewport: { width: 1280, height: 800 } }, wk: true },
  { name: 'WebKit телефон (iPhone 13)', launch: () => webkit.launch({ env: WK_ENV }), ctx: { ...devices['iPhone 13'] }, wk: true },
];
(async () => {
  for (const e of ENG) {
    console.log('\n== ' + e.name); await sleep(22000);   // сервер не чаще 1 заметки в 20 с с одного IP — между движками пауза
    let b; try { b = await e.launch(); } catch (x) { ok(false, 'запуск: ' + x.message.slice(0, 120)); continue; }
    const ctx = await b.newContext(e.ctx); const p = await ctx.newPage();
    const errs = [], api = [];
    p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 160)); });
    p.on('pageerror', x => errs.push('pageerror: ' + x.message));
    p.on('requestfailed', r => errs.push('requestfailed: ' + r.url().slice(0, 100)));
    p.on('response', r => { if (/\/api\/g\//.test(r.url())) api.push(r.request().method() + ' ' + new URL(r.url()).pathname.replace(/^\/steam/, '') + ' ' + r.status() + ' ' + new URL(r.url()).host); });
    if (e.wk) await p.addInitScript(() => { window.__keepAlive = false; });   // в песочнице WPE <audio> роняет процесс
    await p.goto(BASE + '?debug', { waitUntil: 'load' });
    await p.waitForSelector('#b-new', { state: 'visible', timeout: 15000 });
    ok(true, 'игра загрузилась (' + (await p.title()) + ')');
    // рейтинг
    await p.waitForSelector('#b-board:not([hidden])', { timeout: 8000 }).catch(() => {});
    ok(await p.isVisible('#b-board'), 'кнопка «Рейтинг» видна (бэкенд доступен с github.io)');
    await p.click('#b-board'); await sleep(1200);
    const lb = (await p.textContent('#lb-msg').catch(() => '')) || '';
    ok(await p.isVisible('#board') && !/недоступ|ошибк/i.test(lb), 'рейтинг читается: «' + lb.trim().slice(0, 40) + '» / строк ' + (await p.$$('#board li, #board tr')).length);
    await p.click('#b-lbclose');
    // игра + телеметрия + заметка
    await p.click('#b-new'); await p.click('#b-start'); await sleep(500);
    await p.evaluate(() => { window.__game.jump(1); window.__game.setBot('good', { react: 0.4 }); window.__game.setSpeed(4); });
    let t = null;
    for (let i = 0; i < 160 && !t; i++) { await sleep(250); t = await p.evaluate(() => { const x = window.__game.toast; return x && x.title === 'Заметка механика' ? x.text : null; }); }
    ok(!!t, 'заметка механика: «' + (t || '').slice(0, 60) + '»');
    await sleep(1500);
    ok(api.some(a => a.startsWith('POST /api/g/run 200 185-255-133-179.sslip.io')), 'билет прохождения принят (POST /run 200, напрямую на бэкенд)');
    ok(api.some(a => a.startsWith('POST /api/g/event 200')), 'телеметрия принята (POST /event 200)');
    ok(api.some(a => a.startsWith('GET /api/g/leaderboard 200')) && api.some(a => a.startsWith('GET /api/g/note 200')), 'GET /leaderboard и /note → 200');
    ok(!api.some(a => / (4|5)\d\d /.test(a)), 'нет 4xx/5xx от API: ' + api.filter(a => / (4|5)\d\d /.test(a)).join(', '));
    ok(!errs.length, 'консоль чистая' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
    await b.close();
  }
  // админки на github.io нет
  for (const pth of ['admin/', 'admin/panel/', 'api/admin/stats', '_worker.js', 'backend/app/main.py', 'tests/', '.git/config']) {
    const r = await fetch(new URL(pth, BASE)); ok(r.status === 404, `${pth} на github.io → ${r.status}`);
  }
  console.log(fails ? `\nПРОВАЛЕНО: ${fails} (прошло ${passes})` : `\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ (${passes})`); process.exit(fails ? 1 : 0);
})().catch(x => { console.error(x); process.exit(1); });
