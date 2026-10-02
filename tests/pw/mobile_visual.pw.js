// E2E (Playwright): мобильные вьюпорты, касания, манометр без наложений, один дым, safe-area, производительность. Скриншоты → screenshots/v1.1/
const { start } = require('../devstack');
const { launch, openGame, ok, results, sleep, SHOTS } = require('./lib');
const path = require('path');

const VIEWS = [['390x844', 390, 844], ['360x640', 360, 640], ['412x915', 412, 915], ['844x390-landscape', 844, 390]];
const ALLOWED_GAUGE = new Set(['0', '20', '40', '60', '80', '100', 'ДАВЛЕНИЕ', 'атм']);

async function cdpTouch(page, type, x, y) {
  const cdp = page._cdp || (page._cdp = await page.context().newCDPSession(page));
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
}
const toCss = (page, fx) => page.evaluate(fx);   // логические → CSS координаты считаются внутри страницы

async function checkGauge(page) {
      const gauge = await page.evaluate(async () => {
        const { gaugeLabels } = await import('/src/render.js'); const G = window.__game, r = G.L.gauge.r;
        const c = document.createElement('canvas').getContext('2d'); const labs = gaugeLabels(r);
        const boxes = labs.map(l => { c.font = l.font; const m = c.measureText(l.t); const fs = parseFloat(l.font.match(/(\d+(\.\d+)?)px/)[1]); const hw = m.width / 2, hh = fs * 0.62; return { t: l.t, x0: l.x - hw, x1: l.x + hw, y0: l.y - hh, y1: l.y + hh, fs }; });
        const overlaps = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) overlaps.push(a.t + '×' + b.t); }
        const outside = boxes.filter(b => [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].some(([x, y]) => Math.hypot(x, y) > r - 14)).map(b => b.t);
        const hub = boxes.filter(b => b.x0 < r * 0.1 + 3 && b.x1 > -(r * 0.1 + 3) && b.y0 < r * 0.1 + 3 && b.y1 > -(r * 0.1 + 3)).map(b => b.t);
        return { r, texts: labs.map(l => l.t), overlaps, outside, hub, minFs: Math.min(...boxes.map(b => b.fs)) };
      });
  ok(gauge.texts.length === 8 && gauge.texts.every(t => ALLOWED_GAUGE.has(t)), 'на манометре только «ДАВЛЕНИЕ», «атм» и отметки: ' + gauge.texts.join(' '));
  ok(gauge.overlaps.length === 0, 'надписи манометра не пересекаются' + (gauge.overlaps.length ? ': ' + gauge.overlaps : ''));
  ok(gauge.outside.length === 0, 'надписи внутри циферблата' + (gauge.outside.length ? ': ' + gauge.outside : ''));
  ok(gauge.hub.length === 0, 'надписи не под осью стрелки' + (gauge.hub.length ? ': ' + gauge.hub : ''));
}

(async () => {
  const stack = await start();
  const browser = await launch();
  try {
    for (const [name, w, h] of VIEWS) {
      console.log(`\n== Мобильный ${name} (${w}×${h}, касание, DPR 2)`);
      const errs = [];
      const { ctx, page } = await openGame(browser, stack.base, { w, h, mobile: true, errs, ip: '203.0.113.' + (30 + w % 50) });
      const landscape = w > h;
      // --- титульный экран
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1), 'нет прокрутки страницы');
      const vp = await page.$eval('meta[name=viewport]', e => e.content);
      ok(/width=device-width/.test(vp) && /user-scalable=no/.test(vp) && /viewport-fit=cover/.test(vp) && /maximum-scale=1/.test(vp), 'viewport: ' + vp);
      ok(await page.evaluate(() => getComputedStyle(document.getElementById('game')).touchAction === 'none' && getComputedStyle(document.body).touchAction === 'manipulation'), 'touch-action: холст none, страница manipulation (без зума по двойному тапу)');
      ok(await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return Math.abs(r.width - innerWidth) < 1 && Math.abs(r.height - innerHeight) < 1; }), 'холст занимает весь экран');
      ok(await page.evaluate(() => window.__game.sound.ctx === null), 'аудио не запущено до первого касания');
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-1-title.png`) });
      const small = await page.$$eval('.screen:not([hidden]) .btn', els => els.filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect().height).filter(v => v < 44));
      ok(small.length === 0, 'кнопки меню ≥ 44px по высоте');
      // --- тап «Новая игра» запускает аудио
      await page.tap('#b-new'); await sleep(300);
      ok(await page.evaluate(() => window.__game.sound.ctx && window.__game.sound.ctx.state === 'running'), 'аудио стартует по тапу');
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-2-prologue.png`) });
      await page.tap('#b-start'); await sleep(500);
      ok(await page.evaluate(() => window.__game.ui === 'play'), 'игра началась тапом');
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-3-tutorial.png`) });
      // --- геометрия целей касания (CSS-пиксели)
      const g = await page.evaluate(() => {
        const G = window.__game, L = G.L, sc = G.view.scale, r = document.getElementById('game').getBoundingClientRect();
        const cols = [0, 1, 2, 3].map(i => { const m = L.modules, gap = L.portrait ? 6 : 14, cw = (m.w - gap * 3) / 4; return { w: cw * sc, h: m.h * sc }; });
        const ph = G.pauseHit();
        return { portrait: L.portrait, scale: sc, cols, shovel: { w: L.shovel.w * sc, h: L.shovel.h * sc }, pause: { w: ph.w * sc, h: ph.h * sc }, leak: 2 * Math.max(32, 23 / sc) * sc };
      });
      ok(g.portrait === !landscape, `раскладка: ${g.portrait ? 'книжная' : 'альбомная'}, масштаб ${g.scale.toFixed(2)}`);
      ok(g.cols.every(c => c.w >= 44 && c.h >= 44), 'колонки вентилей ≥ 44px: ' + g.cols.map(c => Math.round(c.w) + '×' + Math.round(c.h)).join(', '));
      ok(g.shovel.w >= 44 && g.shovel.h >= 44, `кнопка «Уголь» ${Math.round(g.shovel.w)}×${Math.round(g.shovel.h)} CSS px`);
      ok(g.pause.w >= 44 && g.pause.h >= 44, `зона паузы ${Math.round(g.pause.w)}×${Math.round(g.pause.h)} CSS px`);
      ok(g.leak >= 44, `зона заделки утечки ${Math.round(g.leak)} CSS px`);
      // --- касание: уголь и перетаскивание вентиля пальцем (CDP touch)
      const pos = await page.evaluate(() => { const G = window.__game, L = G.L, sc = G.view.scale, r = document.getElementById('game').getBoundingClientRect(), c = (lx, ly) => [r.left + (lx + L.offX) * sc, r.top + ly * sc];
        const m = L.modules, gap = L.portrait ? 6 : 14, cw = (m.w - gap * 3) / 4, head = L.portrait ? 42 : 52, ty0 = m.y + head + 34, ty1 = m.y + m.h - (L.portrait ? 62 : 72);
        return { shovel: c(L.shovel.x + L.shovel.w / 2, L.shovel.y + L.shovel.h / 2), v0a: c(m.x + cw / 2, ty1), v0b: c(m.x + cw / 2, ty0 + (ty1 - ty0) * 0.3), pause: c(L.pause.x + L.pause.w / 2, L.pause.y + L.pause.h / 2) }; });
      const fire0 = await page.evaluate(() => window.__game.s.fire);
      await page.touchscreen.tap(pos.shovel[0], pos.shovel[1]); await sleep(250);
      ok(await page.evaluate(f => window.__game.s.fire > f, fire0), 'тап по «Уголь» подбрасывает уголь');
      // два быстрых тапа подряд не зумят страницу
      await page.touchscreen.tap(pos.shovel[0], pos.shovel[1]); await sleep(60); await page.touchscreen.tap(pos.shovel[0], pos.shovel[1]); await sleep(200);
      ok(await page.evaluate(() => (window.visualViewport ? window.visualViewport.scale : 1) === 1), 'двойной тап не меняет масштаб страницы');
      await page.evaluate(() => { window.__game.s.tut.active = false; window.__game.s.tut.done = true; });
      await cdpTouch(page, 'touchStart', pos.v0a[0], pos.v0a[1]);
      for (let k = 1; k <= 6; k++) { await cdpTouch(page, 'touchMove', pos.v0a[0] + (pos.v0b[0] - pos.v0a[0]) * k / 6, pos.v0a[1] + (pos.v0b[1] - pos.v0a[1]) * k / 6); await sleep(30); }
      await cdpTouch(page, 'touchEnd', 0, 0); await sleep(100);
      ok(await page.evaluate(() => window.__game.s.valves[0] > 0.55), 'палец тянет вентиль вверх: ' + (await page.evaluate(() => window.__game.s.valves[0].toFixed(2))));
      await page.touchscreen.tap(pos.pause[0], pos.pause[1]); await sleep(250);
      ok(await page.evaluate(() => window.__game.ui === 'pause'), 'тап по кнопке паузы');
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-4-pause.png`) });
      await page.tap('#b-resume'); await sleep(200);
      // --- игровой экран ночи 4 для скриншота и проверки манометра/дыма
      await page.evaluate(() => { window.__game.jump(3); window.__game.setBot('good', { react: 0.5 }); });
      await sleep(4200);
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-5-game.png`) });
      await checkGauge(page);
      // --- дым: один источник — труба котла; в HUD не заходит (рисуется под ним)
      const smoke = await page.evaluate(() => { const G = window.__game, ch = G.L.chimney, ps = G.fx.p.filter(p => p.k === 'smoke'); return { n: ps.length, chx: ch.x, xs: ps.map(p => p.x), hud: G.L.hud.h }; });
      ok(smoke.n > 0, 'дым идёт из трубы (' + smoke.n + ' частиц)');
      ok(smoke.xs.every(x => x > smoke.chx - 8 && x < smoke.chx + 24 * 5.5), 'все частицы дыма — из одной трубы (один шлейф)');
      ok(await page.evaluate(() => !window.__game.fx.p.some(p => p.k === 'steam' && p.col === '70,64,60')), 'второго (фабричного) шлейфа нет');
      ok(errs.length === 0, 'нет ошибок консоли' + (errs.length ? ': ' + errs.join(' | ') : ''));
      // --- производительность
      const fps = await page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
      ok(fps >= 20, `FPS в headless (программная отрисовка): ${fps.toFixed(0)}`);
      // --- safe-area (эмуляция выреза через CSS-переменные)
      if (landscape) {
        await page.evaluate(() => { document.documentElement.style.setProperty('--sa-l', '44px'); document.documentElement.style.setProperty('--sa-r', '44px'); window.__game.resize(); });
        await sleep(400);
        const sa = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { l: r.left, w: r.width }; });
        ok(Math.abs(sa.l - 44) < 1 && Math.abs(sa.w - (w - 88)) < 1, 'safe-area: холст сдвинут на 44px от краёв (' + sa.l + ', ' + sa.w + ')');
        await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-6-safearea.png`) });
        await page.evaluate(() => { document.documentElement.style.setProperty('--sa-l', '0px'); document.documentElement.style.setProperty('--sa-r', '0px'); window.__game.resize(); });
      }
      // --- настройки и финальные экраны на этом размере
      await page.evaluate(() => { window.__game.setBot(null); });
      await page.keyboard.press('Escape'); await sleep(150);
      await page.tap('#b-pset'); await sleep(250);
      ok(await page.evaluate(() => { const el = document.querySelector('#settings .panel'); const r = el.getBoundingClientRect(); return r.width <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }), 'настройки помещаются по ширине');
      const rs = await page.evaluate(() => [...document.querySelectorAll('#settings input[type=range]')].map(e => [e.id, Math.round(e.getBoundingClientRect().height), Math.round(e.getBoundingClientRect().width)]));
      ok(rs.length === 2 && rs.some(r => r[0] === 'o-sfx') && rs.some(r => r[0] === 'o-music') && rs.every(r => r[1] >= 16 && r[2] >= 80), 'ползунки «Звуки» и «Музыка» на месте: ' + JSON.stringify(rs));
      await page.screenshot({ path: path.join(SHOTS, `mobile-${name}-7-settings.png`) });
      await ctx.close();
    }
    for (const [w, h] of [[1280, 800], [1920, 1080], [1024, 600]]) {
      console.log(`\n== Десктоп ${w}×${h}: манометр и дым`);
      const errs3 = [];
      const { ctx, page } = await openGame(browser, stack.base, { w, h, errs: errs3 });
      await page.click('#b-new'); await page.click('#b-start'); await sleep(300);
      await page.evaluate(() => { window.__game.jump(3); window.__game.setBot('good', { react: 0.5 }); });
      await sleep(4500);
      await page.screenshot({ path: path.join(SHOTS, `desktop-${w}x${h}-game.png`) });
      await checkGauge(page);
      const sm = await page.evaluate(() => { const G = window.__game, ps = G.fx.p.filter(p => p.k === 'smoke'); return { n: ps.length, ok: ps.every(p => p.x > G.L.chimney.x - 8 && p.x < G.L.chimney.x + 24 * 5.5) }; });
      ok(sm.n > 0 && sm.ok, 'дым — один шлейф из трубы котла (' + sm.n + ')');
      ok(errs3.length === 0, 'нет ошибок консоли');
      await ctx.close();
    }
    // ориентация: поворот телефона на лету
    console.log('\n== Поворот 390×844 → 844×390 на лету');
    const errs2 = [];
    const { ctx, page } = await openGame(browser, stack.base, { w: 390, h: 844, mobile: true, errs: errs2 });
    await page.tap('#b-new'); await page.tap('#b-start'); await sleep(400);
    ok(await page.evaluate(() => window.__game.L.portrait), 'сначала книжная раскладка');
    await page.setViewportSize({ width: 844, height: 390 }); await sleep(500);
    ok(await page.evaluate(() => !window.__game.L.portrait && window.__game.ui === 'play'), 'после поворота — альбомная, игра продолжается');
    await page.screenshot({ path: path.join(SHOTS, 'mobile-rotate-landscape.png') });
    ok(errs2.length === 0, 'нет ошибок при повороте');
    await ctx.close();
  } catch (e) { ok(false, 'исключение: ' + (e.stack || e)); console.log(stack.log().slice(-1200)); }
  finally { await browser.close(); await stack.stop(); }
  const { fails, passes } = results();
  console.log(`\n${fails ? 'ПРОВАЛЕНО' : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ'}: ✓${passes} ✗${fails}`); process.exit(fails ? 1 : 0);
})();
