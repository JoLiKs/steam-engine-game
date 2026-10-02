// Проверки доступности (prefers-reduced-motion, фокус, мобильные цели касания) и ориентировочной производительности.
const puppeteer = require('puppeteer-core'); const { serve } = require('./serve');
const sleep = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
(async () => {
  const { srv, port } = await serve(); const base = `http://127.0.0.1:${port}/?debug`;
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const errs = [];
  { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.setViewport({ width: 1280, height: 800 });
    await p.goto(base); await sleep(300);
    ok(await p.evaluate(() => window.__game.settings.reduce === true && window.__game.fx.reduced === true), 'prefers-reduced-motion включает режим «меньше движения»');
    await p.click('#b-new'); await p.click('#b-start'); await sleep(300);
    await p.evaluate(() => { window.__game.jump(6); window.__game.setBot('good'); window.__game.setSpeed(5); }); await sleep(2500);
    ok(await p.evaluate(() => window.__game.fx.shakeOffset().every(v => v === 0)), 'тряска экрана отключена при reduced-motion');
    ok(await p.evaluate(() => window.__game.fx.p.length < 120), 'частиц меньше в режиме reduced-motion');
    await p.close(); }
  { const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await p.goto(base); await sleep(300);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('#title .btn')].map(e => e.getBoundingClientRect().height));
    ok(sizes.every(h => h >= 44), 'кнопки меню ≥ 44px на мобильном: ' + sizes.map(Math.round));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'нет горизонтальной прокрутки на 390px');
    await p.click('#b-new'); await p.click('#b-start'); await sleep(300);
    ok(await p.evaluate(() => { const g = window.__game; return g.L.shovel.h * g.view.scale >= 44 && g.L.pause.w * g.view.scale >= 34; }), 'кнопки на холсте достаточно крупные для пальца');
    // фокус и контраст (CSS): кнопки имеют видимый :focus-visible
    ok(await p.evaluate(() => [...document.styleSheets[0].cssRules].some(r => r.selectorText && r.selectorText.includes('focus-visible'))), 'есть стили :focus-visible');
    // FPS
    await p.evaluate(() => { window.__game.jump(6); window.__game.setBot('good'); });
    const fps = await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(), worst = 0, last = t0; const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / ((t - t0) / 1000), worst }); }; requestAnimationFrame(f); }));
    console.log('  fps (headless, software GL, 390x844@2x):', fps.fps.toFixed(1), 'худший кадр', fps.worst.toFixed(0), 'мс');
    ok(fps.fps > 25, 'FPS в headless без GPU > 25');
    await p.close(); }
  { const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 }); await p.goto(base); await sleep(300); await p.click('#b-new'); await p.click('#b-start'); await sleep(300);
    await p.evaluate(() => { window.__game.jump(6); window.__game.setBot('good'); });
    const fps = await p.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(), worst = 0, last = t0; const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else res({ fps: n / ((t - t0) / 1000), worst }); }; requestAnimationFrame(f); }));
    console.log('  fps (headless, 1280x800):', fps.fps.toFixed(1), 'худший кадр', fps.worst.toFixed(0), 'мс'); ok(fps.fps > 40, 'FPS десктоп > 40 (headless)'); await p.close(); }
  ok(errs.length === 0, 'нет ошибок: ' + errs.join('|'));
  await b.close(); srv.close(); console.log(fails ? 'ПРОВАЛ' : 'OK'); process.exit(fails ? 1 : 0);
})();
