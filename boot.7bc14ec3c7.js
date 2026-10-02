/* Страж загрузки (классический скрипт, ES5, без зависимостей): показывает понятное сообщение вместо чёрного экрана.
   Грузится первым. Игра сообщает о готовности через window.__gameReady / window.__bootReady().
   Стили задаются через CSSOM (el.style) — работает и под строгим CSP, и если не загрузился style.css. */
(function () {
  'use strict';
  var shown = false, recent = [], box = null, slowTimer = 0;
  var IGNORE = /audio|AudioContext|NotAllowedError|play\(\) request|ResizeObserver loop|The operation was aborted/i;

  function css(el, s) { el.style.cssText = s; return el; }
  function mk(tag, text, s) { var e = document.createElement(tag); if (text) e.textContent = text; if (s) css(e, s); return e; }
  function btn(label, fn, primary) {
    var b = mk('button', label, 'font:inherit;font-size:17px;padding:12px 18px;margin:6px;min-height:48px;border-radius:10px;border:2px solid #7a5a1c;cursor:pointer;color:' + (primary ? '#2a1d08' : '#f1e6c8') + ';background:' + (primary ? '#d9a93f' : '#3a2e25'));
    b.addEventListener('click', fn); return b;
  }
  function hide() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; shown = false; }
  function clearSave() {
    try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('last-boiler') === 0 && !/pid|nick/.test(k)) localStorage.removeItem(k); } } catch (e) { /* хранилище недоступно */ }
  }
  function show(title, text, detail, soft) {
    if (shown && !soft) { hide(); }
    if (shown) return;
    shown = true;
    box = css(document.createElement('div'), 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(10,7,5,.94);color:#f1e6c8;font-family:Georgia,"Times New Roman",serif;text-align:center');
    box.id = 'fatal'; box.setAttribute('role', 'alert');
    var p = css(document.createElement('div'), 'max-width:440px;width:100%;padding:22px 18px;border-radius:14px;border:3px solid #7a5a1c;background:#241a13;line-height:1.45');
    p.appendChild(mk('h2', title, 'margin:0 0 10px;font-size:22px;color:#f0d37e'));
    p.appendChild(mk('p', text, 'margin:0 0 12px;font-size:16px'));
    if (detail) p.appendChild(mk('p', detail, 'margin:0 0 12px;font-size:12px;opacity:.65;word-break:break-word;font-family:monospace'));
    p.appendChild(btn('Перезагрузить', function () { location.reload(); }, true));
    if (!soft) p.appendChild(btn('Сбросить сохранение и перезагрузить', function () { clearSave(); location.reload(); }));
    else p.appendChild(btn('Подождать', hide));
    box.appendChild(p);
    (document.body || document.documentElement).appendChild(box);
  }
  function fatal(detail) {
    show('Игра не смогла запуститься', 'Что-то пошло не так при загрузке. Попробуйте перезагрузить страницу; если не помогло — сбросьте сохранение. Игре нужен современный браузер (Safari 11+, Chrome 64+).', String(detail || '').slice(0, 220));
  }
  function onError(msg, where) {
    msg = String(msg || '');
    if (IGNORE.test(msg)) return;
    var label = msg + (where ? ' @ ' + where : '');
    if (!window.__gameReady) { fatal(label); return; }
    var now = +new Date(); recent.push(now);
    while (recent.length && now - recent[0] > 3000) recent.shift();
    if (recent.length >= 5) fatal('повторяющаяся ошибка: ' + label);   // игра в работе «сыплет» ошибками — лучше сказать, чем показывать застывший кадр
  }

  window.addEventListener('error', function (e) {
    var t = e && e.target;
    if (t && t !== window && t.tagName && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {   // не загрузился файл игры/стилей
      if (!window.__gameReady) fatal('не загрузился файл: ' + (t.src || t.href || '?').replace(/^https?:\/\/[^/]+/, ''));
      return;
    }
    onError(e && e.message, e && e.filename ? String(e.filename).replace(/^https?:\/\/[^/]+/, '') + ':' + e.lineno : '');
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason; onError(r && r.message ? r.message : r, 'promise');
  });

  window.__bootReady = function () { window.__gameReady = true; clearTimeout(slowTimer); if (box && box.getAttribute('data-soft')) hide(); };
  // медленная загрузка: через 8 с без готовности — мягкая подсказка (исчезает сама, когда игра запустится)
  slowTimer = setTimeout(function () {
    if (window.__gameReady || shown) return;
    show('Загрузка идёт дольше обычного', 'Похоже, слабая связь. Подождите ещё немного или перезагрузите страницу.', '', true);
    if (box) box.setAttribute('data-soft', '1');
  }, 8000);
})();
