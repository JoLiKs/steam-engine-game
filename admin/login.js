'use strict';
const form = document.getElementById('loginForm'), err = document.getElementById('err'), pw = document.getElementById('pw');
// уже вошли? тогда сразу в панель
fetch('/api/admin/me', { credentials: 'same-origin' }).then(r => { if (r.ok) location.replace('/admin/panel/'); }).catch(() => {});
form.addEventListener('submit', async e => {
  e.preventDefault(); err.hidden = true;
  const btn = form.querySelector('button'); btn.disabled = true;
  try {
    const r = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw.value }) });
    if (r.ok) { location.replace('/admin/panel/'); return; }
    err.textContent = r.status === 429 ? 'Слишком много попыток. Подождите несколько минут.' : r.status === 401 ? 'Неверный пароль.' : 'Ошибка входа (' + r.status + ').';
  } catch (x) { err.textContent = 'Нет связи с сервером.'; }
  err.hidden = false; btn.disabled = false; pw.select();
});
