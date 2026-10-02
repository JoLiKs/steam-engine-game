// Звук на «телефоне»: настоящий AudioContext в Android Chromium (политика автозапуска по умолчанию!) и iPhone WebKit.
// Контекст создаётся в жесте, работает после тапа, при прерывании (suspend) появляется «Включить звук», тап возвращает звук, возврат во вкладку пытается resume.
const { chromium, webkit, devices } = require('playwright-core');
const { ok, results, sleep } = require('./lib');
const WK_ENV = { ...process.env, GIO_EXTRA_MODULES: '/workspace/debs/gio', GIO_USE_PROXY_RESOLVER: 'dummy', WEBKIT_DISABLE_COMPOSITING_MODE: '1', EGL_PLATFORM: 'surfaceless', __EGL_VENDOR_LIBRARY_FILENAMES: '/workspace/debs/root/usr/share/glvnd/egl_vendor.d/50_mesa.json', LIBGL_DRIVERS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/dri', GBM_BACKENDS_PATH: '/workspace/debs/root/usr/lib/x86_64-linux-gnu/gbm' };
const ENG = [
  { name: 'Android Chromium (Pixel 7, автозапуск ЗАПРЕЩЁН без жеста)', launch: () => chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] }), device: devices['Pixel 7'], real: true },
  { name: 'iPhone WebKit (iPhone 13; в песочнице нет аудиоустройства)', launch: () => webkit.launch({ env: WK_ENV }), device: devices['iPhone 13'], real: false },
];
const S = p => p.evaluate(() => { const g = window.__game; return { state: g.sound.state, pill: g.pill, keep: !!g.sound.keepEl, gestured: g.sound.gestured, needs: g.sound.needsTap() }; });

(async () => {
  let BASE = process.env.BASE, stack = null;
  if (!BASE) { stack = await require('../devstack').start(); BASE = stack.base; }
  console.log('Проверяем: ' + BASE);
  for (const eng of ENG) {
    let b; try { b = await eng.launch(); } catch (e) { ok(false, eng.name + ': запуск ' + e.message.slice(0, 100)); continue; }
    console.log('\n== ' + eng.name);
    const ctx = await b.newContext({ ...eng.device }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    if (!eng.real) await p.addInitScript(() => { window.__keepAlive = false; });   // в песочнице WPE нет медиа-конвейера: <audio> роняет процесс (не iOS)
    await p.goto(BASE + '/?debug'); await p.waitForSelector('#b-new', { state: 'visible' }); await sleep(500);
    let st = await S(p);
    ok(st.state === 'none' && !st.pill && !st.gestured, `до касания: контекст не создан (${st.state}), кнопки «Включить звук» нет`);
    await p.tap('#b-new'); await sleep(900);
    st = await S(p);
    if (eng.real) {
      ok(st.state === 'running', `после тапа контекст running (${st.state})`);
      ok(!st.pill, 'после тапа кнопки «Включить звук» нет');
      ok(!st.keep, 'на Android keep-alive <audio> не создаётся (нужен только iOS)');
      await p.evaluate(() => { window.__keepAlive = true; window.__game.sound.keepAlive(); }); await sleep(300);
      ok(await p.evaluate(() => { const e = window.__game.sound.keepEl; return !!e && !e.paused && e.loop; }), 'iOS-режим keep-alive: тихий зацикленный <audio> играет (проверено принудительно в Chromium)');
      ok(await p.evaluate(() => window.__game.sound.ctx.currentTime > 0.2), 'время аудио-контекста идёт (реально играет)');
      // прерывание (звонок/блокировка): контекст suspended
      await p.evaluate(() => window.__game.sound.ctx.suspend()); await sleep(600);
      st = await S(p); ok(st.state === 'suspended' && st.pill && st.needs, `после прерывания: ${st.state}, показана кнопка «Включить звук»`);
      const box = await p.$eval('#b-snd', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; });
      ok(box.h >= 44 && box.x >= 0 && box.x + box.w <= box.vw && box.y >= 0, `кнопка целиком на экране и ≥44px (${Math.round(box.w)}×${Math.round(box.h)})`);
      await p.screenshot({ path: require('path').resolve(__dirname, '../../screenshots/v1.2/sound-pill-android.png') }).catch(() => {});
      await p.tap('#b-snd'); await sleep(900);
      st = await S(p); ok(st.state === 'running' && !st.pill, `тап по кнопке вернул звук (${st.state}), кнопка скрыта`);
      // возврат во вкладку: автоматическая попытка resume
      await p.evaluate(() => window.__game.sound.ctx.suspend()); await sleep(300);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
      st = await S(p); ok(st.state === 'running' || st.pill, `после возврата во вкладку: звук ${st.state === 'running' ? 'возобновлён сам' : 'ждёт тапа (кнопка показана)'}`);
      // выключили звук — кнопка не нужна
      await p.evaluate(() => window.__game.sound.ctx.suspend()); await sleep(300);
      await p.evaluate(() => { window.__game.sound.set({ enabled: false }); window.__game.updatePill(); }); st = await S(p);
      ok(!st.pill, 'звук выключен в настройках — кнопка не показывается');
    } else {
      ok(st.gestured, 'жест зарегистрирован (unlock вызван в обработчике тапа)');
      ok(st.state === 'running' || st.pill, `контекст ${st.state}; если не running — показана кнопка «Включить звук» (${st.pill})`);
    }
    ok(errs.length === 0, 'нет необработанных ошибок' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
    await ctx.close(); await b.close();
  }
  if (stack) await stack.stop();
  const r = results(); console.log(r.fails ? `ПРОВАЛЕНО ✓${r.passes} ✗${r.fails}` : `ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ: ✓${r.passes}`);
})().catch(e => { console.error('ОШИБКА', e); process.exit(1); });
