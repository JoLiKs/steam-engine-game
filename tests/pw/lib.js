// Общие помощники Playwright-тестов (системный Chrome, без скачивания браузеров).
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const SHOTS = path.resolve(__dirname, '../../screenshots/v1.2'); fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0, passes = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ok(c, m) { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? passes++ : fails++; }
const results = () => ({ fails, passes });
const launch = () => chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

// страница игры; collect — массив для ошибок консоли/страницы (сетевые сбои /api/g/ при офлайн-тестах не считаются)
async function openGame(browser, base, { w = 1280, h = 800, mobile = false, dpr, offline = false, query = '?debug', errs = [], ip } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr || (mobile ? 2 : 1), isMobile: mobile, hasTouch: mobile, extraHTTPHeaders: ip ? { 'x-test-ip': ip } : {}, userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' : undefined });
  const page = await ctx.newPage();
  if (offline) await page.route('**/api/g/**', r => r.abort('failed'));
  page.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/\/api\/(g|admin)\//.test(m.location().url || '')) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(base + '/' + query, { waitUntil: 'load' });
  await sleep(400);
  return { ctx, page };
}

// пройти игру ботом до экрана концовки реальными кликами по интерфейсу (ускорение только в ?debug)
async function playToEnding(page, { speed = 30, skill = 'good', timeout = 170000 } = {}) {
  await page.click('#b-new'); await page.click('#b-start'); await sleep(500);
  await page.evaluate(([sp, sk]) => { window.__game.setBot(sk, { react: 0.5 }); window.__game.setSpeed(sp); }, [speed, skill]);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const st = await page.evaluate(() => ({ ui: window.__game.ui, card: window.__game.s.card && window.__game.s.card.id }));
    if (st.ui === 'ending') return true;
    if (st.ui === 'card') { const idx = { timka: 1, shift: 1, brown: 1, sloboda: 0 }[st.card] ?? 0; await page.click(`#c-opts .choice >> nth=${idx}`); }
    else if (st.ui === 'summary') await page.click('#b-next');
    await sleep(120);
  }
  return false;
}

async function adminLogin(base, password, ip = '198.51.100.77') {
  const r = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'x-test-ip': ip }, body: JSON.stringify({ password }) });
  const cookie = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map(c => c.split(';')[0]).join('; ');
  const csrf = r.ok ? (await r.json()).csrf : null;
  const api = (p, o = {}) => fetch(base + p, { ...o, headers: { cookie, origin: base, 'x-csrf-token': csrf || '', 'content-type': 'application/json', 'x-test-ip': ip, ...(o.headers || {}) } });
  return { status: r.status, cookie, csrf, api, json: async (p) => (await api(p)).json() };
}

module.exports = { launch, openGame, playToEnding, adminLogin, ok, results, sleep, SHOTS };
