'use strict';
// Панель администратора. Все данные выводятся через textContent (никакого innerHTML с пользовательскими данными).
const $ = s => document.querySelector(s);
let csrf = '';
const ENDING = { light: 'Свет в каждом окне', smoke: 'Дым над городом', iron: 'Железные люди', cold: 'Холодный расчёт', boom: 'Взрыв Агафьи', silence: 'Тишина' };
const NIGHT_N = ['Растопка', 'Первый иней', 'Лихорадка', 'Долгая смена', 'Дым', 'Метель', 'Чёрный лёд', 'Стылый час', 'Буря', 'Последняя ночь'];
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); for (const k of kids) e.append(k); return e; };
const fmtT = ts => ts ? new Date(ts * 1000).toLocaleString('ru-RU', { hour12: false }) : '';
const fmtDur = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); }

async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', headers: {}, ...opts };
  if (opts.method && opts.method !== 'GET') { o.headers['x-csrf-token'] = csrf; if (opts.body) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(opts.body); } }
  const r = await fetch(path, o);
  if (r.status === 401) { location.href = '/admin/'; throw new Error('401'); }
  if (!r.ok) { toast('Ошибка ' + r.status); throw new Error(String(r.status)); }
  return r;
}
const getJ = async p => (await api(p)).json();

// ---------- вкладки
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => { t.hidden = t.id !== 'tab-' + b.dataset.tab; });
  ({ overview: loadOverview, sessions: loadSessions, scores: loadScores, ai: loadAi }[b.dataset.tab] || (() => {}))();
}));
$('#logout').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST' }); } catch (e) { /* ignore */ } location.href = '/admin/'; });

// ---------- обзор
function bars(box, data, label = k => k, sort = true) {
  box.replaceChildren();
  let ent = Object.entries(data || {}); if (sort) ent.sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...ent.map(e => e[1]));
  if (!ent.length) { box.append(el('p', { className: 'muted', textContent: 'нет данных' })); return; }
  for (const [k, v] of ent) { const i = el('i'); i.style.width = (v / max * 100) + '%'; box.append(el('div', { className: 'bar' }, el('span', { textContent: label(k) }), el('span', {}, i), el('span', { textContent: String(v) }))); }
}
function stat(label, val) { return el('div', { className: 'stat' }, el('small', { textContent: label }), el('b', { textContent: String(val) })); }
async function loadOverview() {
  const st = await getJ('/api/admin/stats');
  const c = $('#cards'); c.replaceChildren(stat('Сессий', st.sessions), stat('Завершено', st.ended), stat('Средняя длительность', fmtDur(st.avg_duration_s)),
    stat('Ночей в среднем', st.avg_nights), stat('Средний счёт', st.avg_score ?? '—'), stat('Лучший счёт', st.max_score ?? '—'), stat('Записей в рейтинге', st.scores.total + (st.scores.hidden ? ` (скрыто ${st.scores.hidden})` : '')));
  bars($('#chEndings'), st.endings, k => ENDING[k] || k);
  bars($('#chNights'), st.reached_night, k => (+k === 0 ? 'ни одной' : `${k}: ${NIGHT_N[+k - 1] || ''}`), false);
  bars($('#chPlatforms'), st.platforms); bars($('#chScreens'), st.screens);
  bars($('#chDays'), Object.fromEntries(st.per_day.map(d => [d.d, d.n])), k => k, false);
  const v = st.avg_valves; bars($('#chValves'), v ? { 'Госпиталь': Math.round(v[0] * 100), 'Кварталы': Math.round(v[1] * 100), 'Завод': Math.round(v[2] * 100), 'Фильтры': Math.round(v[3] * 100) } : {}, k => k, false);
}

// ---------- сессии
let sPage = 0, sSort = 'created_at', sDir = 'desc', sTotal = 0; const PAGE = 50; let cur = null;
const COLS = [['created_at', 'Начало', r => fmtT(r.created_at)], ['platform', 'Платформа', r => r.platform || ''], ['screen', 'Экран', r => r.screen_w ? `${r.screen_w}×${r.screen_h}${r.touch ? ' ✋' : ''}` : ''],
  ['ua', 'Браузер', r => r.ua || ''], ['nights_done', 'Ночей', r => r.nights_done], ['ending', 'Концовка', r => ENDING[r.ending] || (r.status === 'ended' ? '' : 'в игре')], ['score', 'Счёт', r => r.score ?? ''],
  ['pop', 'Жителей', r => r.pop ?? ''], ['burnouts', 'Падений', r => r.burnouts ?? ''], ['duration_s', 'Длит.', r => fmtDur(r.duration_s)],
  ['valves', 'Вентили, %', r => r.valves ? r.valves.map(x => Math.round(x * 100)).join('/') : ''], ['moves', 'Движений', r => r.moves ?? '']];
function sQuery() {
  const p = new URLSearchParams(new FormData($('#sFilters'))); for (const [k, v] of [...p]) if (v === '') p.delete(k); return p;
}
async function loadSessions() {
  const p = sQuery(); $('#sCsv').href = '/api/admin/export?what=sessions&' + p;
  p.set('limit', PAGE); p.set('offset', sPage * PAGE); p.set('sort', sSort); p.set('dir', sDir);
  const d = await getJ('/api/admin/sessions?' + p); sTotal = d.total;
  const th = $('#sTable thead'); th.replaceChildren(el('tr', {}, ...COLS.map(([k, t]) => { const h = el('th', { textContent: t + (sSort === k ? (sDir === 'asc' ? ' ▲' : ' ▼') : '') }); if (['created_at', 'nights_done', 'score', 'duration_s', 'platform', 'ending'].includes(k)) h.addEventListener('click', () => { sDir = sSort === k && sDir === 'desc' ? 'asc' : 'desc'; sSort = k; sPage = 0; loadSessions(); }); return h; })));
  const tb = $('#sTable tbody'); tb.replaceChildren(...d.items.map(r => { const tr = el('tr', { tabIndex: 0 }, ...COLS.map(([, , f]) => el('td', { textContent: String(f(r)) }))); tr.addEventListener('click', () => openSession(r.rid)); return tr; }));
  $('#sInfo').textContent = `${sTotal ? sPage * PAGE + 1 : 0}–${Math.min(sTotal, (sPage + 1) * PAGE)} из ${sTotal}`;
  $('#sPrev').disabled = sPage === 0; $('#sNext').disabled = (sPage + 1) * PAGE >= sTotal;
}
async function openSession(rid) { const d = await getJ('/api/admin/sessions/' + encodeURIComponent(rid)); cur = rid; $('#sDetail').textContent = JSON.stringify(d, null, 2); $('#sDlg').showModal(); }
$('#sFilters').addEventListener('submit', e => { e.preventDefault(); sPage = 0; loadSessions(); });
$('#sFilters').addEventListener('reset', () => setTimeout(() => { sPage = 0; loadSessions(); }));
$('#sPrev').addEventListener('click', () => { sPage--; loadSessions(); }); $('#sNext').addEventListener('click', () => { sPage++; loadSessions(); });
$('#sClose').addEventListener('click', () => $('#sDlg').close());
$('#sDel').addEventListener('click', async () => { if (!cur || !confirm('Удалить сессию безвозвратно?')) return; await api('/api/admin/sessions/' + encodeURIComponent(cur), { method: 'DELETE' }); $('#sDlg').close(); toast('Удалено'); loadSessions(); });

// ---------- рейтинг
async function loadScores() {
  const d = await getJ('/api/admin/scores?q=' + encodeURIComponent($('#scQ').value));
  $('#scTable thead').replaceChildren(el('tr', {}, ...['Дата', 'Ник', 'Счёт', 'Ночей', 'Жителей', 'Концовка', 'Длит.', 'Падений', 'Дым', 'Статус', ''].map(t => el('th', { textContent: t }))));
  $('#scTable tbody').replaceChildren(...d.items.map(r => {
    const hide = el('button', { className: 'btn', textContent: r.hidden ? 'Показать' : 'Скрыть' });
    hide.addEventListener('click', async () => { await api(`/api/admin/scores/${r.id}/hide`, { method: 'POST', body: { hidden: !r.hidden } }); toast(r.hidden ? 'Показано' : 'Скрыто'); loadScores(); });
    const del = el('button', { className: 'btn danger', textContent: 'Удалить' });
    del.addEventListener('click', async () => { if (!confirm(`Удалить запись «${r.nick}» навсегда?`)) return; await api('/api/admin/scores/' + r.id, { method: 'DELETE' }); toast('Удалено'); loadScores(); });
    const tr = el('tr', { className: r.hidden ? 'hid' : '' }, ...[fmtT(r.created_at), r.nick, r.score, r.nights, r.pop, ENDING[r.ending] || r.ending, fmtDur(r.duration_s), r.burnouts, r.smog + '%', r.hidden ? 'скрыта' : 'виден'].map(v => el('td', { textContent: String(v) })), el('td', {}, hide, ' ', del));
    return tr;
  }));
}
$('#scGo').addEventListener('click', loadScores);

// ---------- обслуживание
$('#pGo').addEventListener('click', async () => {
  const days = +$('#pDays').value; if (!confirm(`Удалить сессии старше ${days} дн.?`)) return;
  const r = await (await api('/api/admin/purge', { method: 'POST', body: { days } })).json(); $('#pRes').textContent = `Удалено сессий: ${r.sessions}, событий: ${r.events}`;
});

// ---------- старт
(async () => {
  const me = await fetch('/api/admin/me', { credentials: 'same-origin' });
  if (!me.ok) { location.href = '/admin/'; return; }
  csrf = (await me.json()).csrf;
  const f = await getJ('/api/admin/facets');
  for (const [name, list, lab] of [['platform', f.platforms, x => x], ['ending', f.endings, x => ENDING[x] || x]]) { const sel = $(`#sFilters [name=${name}]`); for (const v of list) sel.append(el('option', { value: v, textContent: lab(v) })); }
  loadOverview();
})();

// ---------- ИИ
const FREQ_RU = { rare: 'Редко (≈2 за ночь)', normal: 'Обычно (≈3 за ночь)', often: 'Чаще (≈5 за ночь)' };
const LEN_RU = { short: 'Короткая (до 110 зн.)', medium: 'Средняя (до 170 зн.)', long: 'Длинная (до 260 зн.)' };
const SIT_RU = { calm: 'Спокойно', pressure_high: 'Давление высокое', pressure_low: 'Давление низкое', coal_low: 'Мало угля', smog_high: 'Много дыма', leak: 'Утечка пара', pop_loss: 'Гибнут жители', night_start: 'Начало ночи', collapse: 'Авария' };
let aiState = null;
// запросы раздела «ИИ» возвращают понятные ошибки (текст сервера), поэтому свой обёрток вместо api()
async function aiReq(path, method = 'GET', body) {
  const o = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') { o.headers['x-csrf-token'] = csrf; o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(body || {}); }
  const r = await fetch(path, o);
  if (r.status === 401) { location.href = '/admin/'; throw new Error('401'); }
  let j = {}; try { j = await r.json(); } catch (e) { /* не JSON */ }
  if (!r.ok) { const e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; }
  return j;
}
function fillSel(sel, map, keys, val) { sel.replaceChildren(...keys.map(k => el('option', { value: k, textContent: map[k] || k }))); sel.value = val; }
function renderAi(d) {
  aiState = d; const s = d.settings;
  $('#aiVaultWarn').hidden = d.vault;
  $('#aiEnabled').checked = s.enabled; $('#aiHost').checked = s.host !== false; $('#aiReview').checked = s.review !== false; $('#aiCompanion').checked = s.companion !== false; $('#aiDaily').checked = s.daily !== false; $('#aiTopic').value = s.topic; $('#aiStyle').value = s.style;
  fillSel($('#aiLength'), LEN_RU, d.options.length, s.length); fillSel($('#aiFreq'), FREQ_RU, Object.keys(d.options.frequency), s.frequency);
  if (!$('#aiSit').options.length) fillSel($('#aiSit'), SIT_RU, Object.keys(d.options.situations), 'calm');
  $('#aiTable thead').replaceChildren(el('tr', {}, ...['№', 'Название', 'Провайдер', 'Модель', 'Ключ', 'Статус', 'Вкл', ''].map(t => el('th', { textContent: t }))));
  const n = d.providers.length;
  $('#aiTable tbody').replaceChildren(...d.providers.map((p, i) => {
    const st = p.status === 'ok' ? el('span', { className: 'ok', textContent: 'работает' }) : p.status === 'error' ? el('span', { className: 'bad', textContent: 'ошибка', title: p.last_error }) : el('span', { className: 'muted', textContent: 'не проверялся' });
    const en = el('input', { type: 'checkbox', checked: p.enabled, title: 'Включить/выключить' });
    en.addEventListener('change', () => aiDo(() => aiReq('/api/admin/ai/providers/' + encodeURIComponent(p.id), 'POST', { enabled: en.checked })));
    const mv = (dir) => { const ids = d.providers.map(x => x.id); const j = i + dir; [ids[i], ids[j]] = [ids[j], ids[i]]; return aiDo(() => aiReq('/api/admin/ai/order', 'POST', { ids })); };
    const bUp = el('button', { className: 'btn', textContent: '▲', title: 'Выше', disabled: i === 0 }); bUp.addEventListener('click', () => mv(-1));
    const bDn = el('button', { className: 'btn', textContent: '▼', title: 'Ниже', disabled: i === n - 1 }); bDn.addEventListener('click', () => mv(1));
    const bCk = el('button', { className: 'btn', textContent: 'Проверить' });
    bCk.addEventListener('click', async () => { bCk.disabled = true; try { const r = await aiReq('/api/admin/ai/providers/' + encodeURIComponent(p.id) + '/check', 'POST'); toast(r.ok ? `Работает (${r.ms} мс)` : 'Ошибка: ' + r.error); } catch (e) { toast(e.message); } await loadAi(); });
    const acts = [bUp, bDn, bCk];
    if (p.kind === 'own') { const bDel = el('button', { className: 'btn danger', textContent: 'Удалить' }); bDel.addEventListener('click', () => { if (confirm('Удалить ключ «' + p.name + '»? Он будет стёрт с сервера.')) aiDo(() => aiReq('/api/admin/ai/providers/' + encodeURIComponent(p.id), 'DELETE')); }); acts.push(bDel); }
    return el('tr', {}, el('td', { textContent: String(i + 1) }), el('td', { textContent: p.name + (p.kind === 'builtin' ? ' (бесплатный)' : '') }), el('td', { textContent: p.provider }), el('td', { textContent: p.model }),
      el('td', { textContent: p.key_mask || '—' }), el('td', {}, st), el('td', {}, en), el('td', {}, ...acts));
  }));
}
async function aiDo(fn) { try { await fn(); } catch (e) { toast(e.message); } await loadAi(); }
async function loadAi() { try { renderAi(await aiReq('/api/admin/ai')); } catch (e) { if (e.message !== '401') toast(e.message); } }
$('#aiSave').addEventListener('click', async () => {
  try {
    const r = await aiReq('/api/admin/ai/settings', 'POST', { enabled: $('#aiEnabled').checked, host: $('#aiHost').checked, review: $('#aiReview').checked, companion: $('#aiCompanion').checked, daily: $('#aiDaily').checked, topic: $('#aiTopic').value, style: $('#aiStyle').value, length: $('#aiLength').value, frequency: $('#aiFreq').value });
    $('#aiSaveRes').textContent = 'Сохранено'; toast('Сохранено'); aiState.settings = r.settings;
  } catch (e) { $('#aiSaveRes').textContent = e.message; }
});
$('#aiAdd').addEventListener('click', async () => {
  const key = $('#aiKey').value.trim(); if (!key) { $('#aiAddRes').textContent = 'Вставьте ключ'; return; }
  const b = $('#aiAdd'); b.disabled = true; $('#aiAddRes').textContent = 'Определяю провайдера…';
  try {
    const r = await aiReq('/api/admin/ai/providers', 'POST', { key, name: $('#aiName').value.trim() });
    $('#aiKey').value = ''; $('#aiName').value = '';
    $('#aiAddRes').textContent = `Добавлен: ${r.provider.provider}, модель ${r.provider.model}`; toast('Добавлено');
  } catch (e) { $('#aiAddRes').textContent = e.message; }
  b.disabled = false; await loadAi();
});
$('#aiSample').addEventListener('click', async () => {
  const b = $('#aiSample'); b.disabled = true; $('#aiSampleOut').textContent = '…'; $('#aiSampleMeta').textContent = '';
  try {
    const r = await aiReq('/api/admin/ai/sample', 'POST', { situation: $('#aiSit').value });
    $('#aiSampleOut').textContent = r.text || '';
    $('#aiSampleMeta').textContent = r.ok ? `${r.provider} · ${r.model} · ${r.ms} мс` : 'ИИ недоступен — показан запасной текст. ' + (r.error || '');
  } catch (e) { $('#aiSampleOut').textContent = ''; $('#aiSampleMeta').textContent = e.message; }
  b.disabled = false; await loadAi();
});
