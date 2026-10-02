const puppeteer = require('puppeteer-core'); const { serve } = require('./serve');
// usage: node clip.js night w h x y cw ch out [mobile] [bot]
(async () => {
  const [night, w, h, x, y, cw, ch, out, mob, extra] = process.argv.slice(2);
  const { srv, port } = await serve();
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage(); await p.setViewport({ width: +w, height: +h, deviceScaleFactor: mob === '1' ? 2 : 1.5, isMobile: mob === '1', hasTouch: mob === '1' });
  p.on('pageerror', e => console.log('PE', e.message)); p.on('console', m => m.type() === 'error' && console.log('CE', m.text()));
  await p.goto(`http://127.0.0.1:${port}/?debug`); await new Promise(r => setTimeout(r, 300));
  await p.click('#b-new'); await p.click('#b-start'); await new Promise(r => setTimeout(r, 300));
  await p.evaluate((n, ex) => { const g = window.__game; g.jump(+n); g.setBot('good', { react: 0.5 }); g.setSpeed(10); }, night, extra);
  await new Promise(r => setTimeout(r, +(process.env.WAIT || 3000)));
  await p.evaluate(() => window.__game.setSpeed(1)); await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: out, clip: { x: +x, y: +y, width: +cw, height: +ch } });
  await b.close(); srv.close();
})();
