// Загрузка игры на «телефонах»: Android Chromium и iPhone WebKit; нормальная сеть, медленная сеть,
// /api/* оборван / завис / 500 / 401, «старый» режим (бандл с пониженным синтаксисом). Проверяется, что игра стартует и рисует кадры.
// BASE=https://steam-engine-game.pages.dev node tests/compat/boot.pw.js   (по умолчанию — локальный сервер dist/)
const { chromium, webkit, devices } = require('playwright-core');
const { ok, results, sleep } = require('../pw/lib');
const WK_ENV = { ...process.env, GIO_EXTRA_MODULES: '/workspace/debs/gio', GIO_USE_PROXY_RESOLVER: 'dummy', WEBKIT_DISABLE_COMPOSITING_MODE: '1', EGL_PLATFORM: 'surfaceless', __EGL_VENDOR_LIBRARY_FILENAMES: '/workspace/debs/root/usr/share/glvnd/egl_vendor.d/50_mesa.json', LIBGL_DRIVERS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/dri', GBM_BACKENDS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/gbm' };
let BASE = process.env.BASE;
const only = process.env.ONLY;

const ENGINES = [
  { name: 'Android Chromium (Pixel 7)', launch: () => chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }), device: devices['Pixel 7'], slow: true },
  { name: 'iPhone WebKit (iPhone 13)', launch: () => webkit.launch({ env: WK_ENV }), device: devices['iPhone 13'], slow: false },
];
const nodeCheck = {
  fatalVisible: p => p.evaluate(() => { const f = document.getElementById('fatal'); return !!f && f.style.display !== 'none' && f.getBoundingClientRect().width > 100; }),
};
const SCEN = [
  ['нормально', async () => { }],
  ['/api/* обрыв сети', async (p) => { await p.route('**/api/**', r => r.abort('connectionrefused')); }],
  ['/api/* зависает навсегда', async (p) => { await p.route('**/api/**', () => { /* не отвечаем */ }); }],
  ['/api/* отвечает 500', async (p) => { await p.route('**/api/**', r => r.fulfill({ status: 500, body: 'x' })); }],
  ['/api/* отвечает 401/HTML', async (p) => { await p.route('**/api/**', r => r.fulfill({ status: 401, contentType: 'text/html', body: '<h1>401</h1>' })); }],
  ['медленная сеть (3G) + /api завис', async (p, ctx, eng) => { await p.route('**/api/**', () => {}); if (eng.slow) { const c = await ctx.newCDPSession(p); await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 }); } }],
];
// аварийные сценарии: ожидается либо нормальный старт (устойчивость), либо понятный экран ошибки вместо чёрного экрана
const FAULT = [
  ['сломанное сохранение в localStorage', 'start', async p => { await p.addInitScript(() => { try { localStorage.setItem('last-boiler-save-v1', '{"bad":'); localStorage.setItem('last-boiler-settings-v1', 'nonsense'); localStorage.setItem('last-boiler-meta-v1', '[[['); } catch (e) { /* */ } }); }],
  ['localStorage бросает исключения (приватный режим/запрет)', 'start', async p => { await p.addInitScript(() => { const bad = () => { throw new DOMException('denied', 'SecurityError'); }; Object.defineProperty(window, 'localStorage', { get: bad }); }); }],
  ['AudioContext бросает при создании', 'start', async p => { await p.addInitScript(() => { window.AudioContext = window.webkitAudioContext = function () { throw new Error('Failed to start the audio device'); }; }); }],
  ['AudioContext создаётся, но createGain/resume падают', 'start', async p => { await p.addInitScript(() => { const Real = window.AudioContext || window.webkitAudioContext; window.AudioContext = window.webkitAudioContext = function () { const c = new Real(); c.createDynamicsCompressor = () => { throw new Error('boom'); }; c.resume = () => Promise.reject(new DOMException('x', 'InvalidStateError')); return c; }; }); }],
  ['нет современных API (at/replaceAll/replaceChildren/structuredClone/ResizeObserver/AbortController/visualViewport/matchMedia)', 'start', async p => { await p.addInitScript(() => { delete Array.prototype.at; delete String.prototype.replaceAll; delete Element.prototype.replaceChildren; delete window.structuredClone; delete window.ResizeObserver; delete window.AbortController; delete window.visualViewport; window.matchMedia = undefined; Object.fromEntries = undefined; }); }],
  ['файл игры не загрузился (404/обрыв)', 'fatal', async p => { await p.route(/game\.[0-9a-f]+\.js|src\/main\.js/, r => r.abort('failed')); }],
  ['ошибка при старте скрипта игры', 'fatal', async p => { await p.route(/game\.[0-9a-f]+\.js|src\/main\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'throw new Error("тестовая ошибка запуска");' })); }],
  ['синтаксическая ошибка в файле игры', 'fatal', async p => { await p.route(/game\.[0-9a-f]+\.js|src\/main\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'var a = ;;; ((' })); }],
];

(async () => {
  let stack = null;
  if (!BASE) {
    const { execFileSync } = require('child_process'); const fs = require('fs');
    const dist = '/tmp/seg-dist'; execFileSync('node', [require('path').resolve(__dirname, '../../scripts/build.mjs'), dist], { stdio: 'inherit' });
    process.env.SEG_SITE = dist; stack = await require('../devstack').start(); BASE = stack.base;
  }
  console.log('Проверяем: ' + BASE);
  for (const eng of ENGINES) {
    if (only && !eng.name.includes(only)) continue;
    let b; try { b = await eng.launch(); } catch (e) { console.log('  ✗ не запустился', eng.name, e.message.slice(0, 200)); ok(false, eng.name + ': запуск'); continue; }
    console.log('\n== ' + eng.name);
    for (const [title, setup] of SCEN) {
      const ctx = await b.newContext({ ...eng.device });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push('pageerror: ' + e.message));
      p.on('console', m => { if (m.type() === 'error' && !/\/api\//.test(m.location().url || '') && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
      if (/WebKit/.test(eng.name)) await p.addInitScript(() => { window.__keepAlive = false; });   // в песочнице WPE нет медиа-конвейера: <audio> роняет процесс
      await setup(p, ctx, eng);
      const t0 = Date.now();
      await p.goto(BASE + '/', { waitUntil: 'commit', timeout: 60000 }).catch(e => errs.push('goto: ' + e.message.slice(0, 100)));
      let ready = false;
      try { await p.waitForSelector('#b-new', { state: 'visible', timeout: 25000 }); ready = true; } catch (e) { /* */ }
      const tReady = Date.now() - t0;
      let started = false, frames = 0;
      if (ready) {
        await p.tap('#b-new'); await sleep(300);
        await p.tap('#b-start').catch(() => {}); await sleep(1500);
        frames = await p.evaluate(() => new Promise(res => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 1000) requestAnimationFrame(f); else res(n); })(); }));
        const canvasOk = await p.evaluate(() => { const c = document.getElementById('game'); const x = c.getContext('2d'); const d = x.getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return c.width > 100 && c.height > 100 && (d[3] > 0); });
        started = canvasOk;
      }
      const overlayErr = await p.evaluate(() => !!document.getElementById('fatal') && getComputedStyle(document.getElementById('fatal')).display !== 'none').catch(() => false);
      ok(ready && started && !errs.length && !overlayErr, `${title}: игра готова за ${tReady} мс, кадры/с≈${frames}, холст рисует=${started}${errs.length ? ' ОШИБКИ: ' + errs.slice(0, 2).join(' | ') : ''}${overlayErr ? ' [показан экран ошибки]' : ''}`);
      await ctx.close();
    }
    for (const [title, expect, setup] of FAULT) {
      const ctx = await b.newContext({ ...eng.device });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      if (/WebKit/.test(eng.name)) await p.addInitScript(() => { window.__keepAlive = false; });
      await setup(p, ctx, eng);
      await p.goto(BASE + '/', { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
      if (expect === 'start') {
        let ready = false; try { await p.waitForSelector('#b-new', { state: 'visible', timeout: 15000 }); ready = true; } catch (e) { /* */ }
        let playing = false;
        if (ready) { await p.tap('#b-new'); await sleep(300); await p.tap('#b-start').catch(() => {}); await sleep(1200); playing = await p.evaluate(() => !!document.getElementById('game') && !document.getElementById('fatal')); }
        ok(ready && playing, `${title}: игра запускается${errs.length ? ' (необработанные ошибки: ' + errs.slice(0, 2).join(' | ').slice(0, 160) + ')' : ''}`);
      } else {
        await sleep(2500);
        const fv = await nodeCheck.fatalVisible(p);
        const txt = fv ? await p.$eval('#fatal', e => e.textContent) : '';
        ok(fv && /Перезагрузить/.test(txt), `${title}: вместо чёрного экрана — понятное сообщение с кнопкой «Перезагрузить»`);
        if (fv) { await p.screenshot({ path: require('path').resolve(__dirname, '../../screenshots/v1.1/fatal-' + (eng.name.includes('iPhone') ? 'iphone' : 'android') + '.png') }).catch(() => {}); }
      }
      await ctx.close();
    }
    await b.close();
  }
  if (stack) await stack.stop();
  const r = results(); console.log(r.fails ? `ПРОВАЛЕНО ✓${r.passes} ✗${r.fails}` : `ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ: ✓${r.passes}`);
})().catch(e => { console.error('ОШИБКА', e); process.exit(1); });
