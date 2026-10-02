// Живая проверка ИИ на проде (нужен файл с паролем админки; ключей и пароля не печатает; настройки админа не меняет).
// node tests/live/ai_live.js  (SEG_SECRETS=/путь/к/файлу с ADMIN_PASSWORD=..., BASE=https://…)
const { adminLogin } = require('../pw/lib');
const fs = require('fs');
const pw = (fs.readFileSync(process.env.SEG_SECRETS || '/workspace/.steam_secrets', 'utf8').match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1];
const B = process.env.BASE || 'https://steam-engine-game.pages.dev';
let bad = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) bad++; };
(async () => {
  for (const [m, p] of [['GET', '/api/admin/ai'], ['POST', '/api/admin/ai/sample'], ['POST', '/api/admin/ai/providers']]) {
    const r = await fetch(B + p, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'POST' ? '{}' : undefined }); ok(r.status === 401, `${m} ${p} без сессии → ${r.status}`);
  }
  const n = await fetch(B + '/api/g/note?s=calm&n=3'); const nj = await n.json();
  ok(n.status === 200 && nj.enabled && nj.note, `публичная заметка: ${nj.src}: «${(nj.note || '').slice(0, 60)}»`);
  const a = await adminLogin(B, pw); ok(a.status === 200, 'вход админа: ' + a.status);
  const st = await a.json('/api/admin/ai');
  ok(st.vault === true, 'шифрование ключей настроено (мастер-ключ задан)');
  console.log('  провайдеры:', st.providers.map(p => `${p.name}[${p.status}]`).join(', '));
  for (const p of st.providers) {
    const r = await (await a.api(`/api/admin/ai/providers/${p.id}/check`, { method: 'POST', body: '{}' })).json().catch(() => ({ ok: false, error: 'не-JSON ответ (таймаут?)' }));
    console.log(`  проверка ${p.name}: ${r.ok ? 'OK ' + r.ms + ' мс' : 'ошибка: ' + r.error}`);
  }
  for (const sit of ['calm', 'leak', 'pressure_high']) {
    const r = await (await a.api('/api/admin/ai/sample', { method: 'POST', body: JSON.stringify({ situation: sit }) })).json().catch(() => ({ ok: false, text: 'не-JSON ответ (таймаут?)' }));
    console.log(`  пример (${sit}): ${r.ok ? 'ИИ' : 'ЗАПАСНОЙ'} ${r.provider || ''} ${r.ms || ''} мс — «${r.text}»`);
  }
  await a.api('/api/admin/logout', { method: 'POST', body: '{}' });
  console.log(bad ? 'ПРОВАЛЕНО ' + bad : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
})();
