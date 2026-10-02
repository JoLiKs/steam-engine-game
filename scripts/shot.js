// Быстрый скриншот сцены: node scripts/shot.js out.png W H [mobile] [night] [waitMs]
const puppeteer = require('puppeteer-core'); const { serve } = require('../tests/serve');
(async () => {
  const [out, W, H, mob, night, wait] = process.argv.slice(2);
  const { srv, port } = await serve();
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: +W, height: +H, deviceScaleFactor: 2, isMobile: mob === '1', hasTouch: mob === '1' });
  await p.goto(`http://127.0.0.1:${port}/?debug`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 300));
  await p.evaluate(n => { window.__game.jump(n); window.__game.setBot('good'); }, +(night || 2));
  await new Promise(r => setTimeout(r, +(wait || 4000)));
  await p.screenshot({ path: out });
  await b.close(); srv.close();
})();
