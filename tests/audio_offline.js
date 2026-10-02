// Браузерный тест: реальный OfflineAudioContext. Пик/энергия канала «звуки» не зависит от «Музыки», и наоборот.
const puppeteer = require('puppeteer-core'); const { serve } = require('./serve');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
(async () => {
  const { srv, port } = await serve();
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${port}/?debug`, { waitUntil: 'load' });
  const res = await p.evaluate(async () => {
    const { Sound } = await import('/src/audio.js');
    // channel: 'sfx' — только эффект (тон), 'music' — только музыка
    async function render(channel, sfxVol, musicVol) {
      const oc = new OfflineAudioContext(1, 22050, 22050);
      const s = new Sound(() => oc); s.set({ sfxVol, musicVol }); s.ensure();
      // отключаем фоновые петли пара/гула: они в канале sfx
      s.hiss.g.gain.value = 0; s.rumble.g.gain.value = 0; s.rumble.lfo.stop(0);
      if (channel === 'sfx') s.tone(440, 0.4, 'sine', 0.3, 0.05);
      else { s.startMusic(); s.schedule(); s.stopMusic(); }
      const buf = await oc.startRendering(); const d = buf.getChannelData(0); let pk = 0, e = 0;
      for (const v of d) { pk = Math.max(pk, Math.abs(v)); e += v * v; }
      return { pk, e };
    }
    const out = {};
    out.sfx_a = await render('sfx', 0.8, 0); out.sfx_b = await render('sfx', 0.8, 1); out.sfx_c = await render('sfx', 0.2, 1);
    out.mus_a = await render('music', 0, 0.8); out.mus_b = await render('music', 1, 0.8); out.mus_c = await render('music', 1, 0.2);
    out.mus_0 = await render('music', 1, 0); out.mus_1 = await render('music', 1, 1); out.sfx_0 = await render('sfx', 0, 1);
    return out;
  });
  const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a));
  console.log(JSON.stringify(res));
  ok(res.sfx_a.pk > 0.01, 'эффект слышен');
  ok(near(res.sfx_a.e, res.sfx_b.e), 'музыка 0→100 не меняет громкость эффекта');
  ok(res.sfx_c.e < res.sfx_a.e * 0.5, 'ползунок «Звуки» меняет громкость эффекта');
  ok(res.sfx_0.pk === 0, '«Звуки» = 0 → эффект полностью тих');
  ok(res.mus_a.pk > 0.001, 'музыка слышна');
  ok(near(res.mus_a.e, res.mus_b.e), '«Звуки» 0→100 не меняет громкость музыки');
  ok(res.mus_c.e < res.mus_a.e * 0.1, 'ползунок «Музыка» сильно меняет громкость (80→20 даёт спад > 10× по энергии)');
  ok(res.mus_0.pk === 0, '«Музыка» = 0 → полная тишина');
  ok(res.mus_1.pk > res.mus_a.pk, '«Музыка» 100 громче 80');
  await b.close(); srv.close();
  console.log(fails ? `\nПРОВАЛЕНО: ${fails}` : '\nOK'); process.exit(fails ? 1 : 0);
})();
