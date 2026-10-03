// DOM лобби и панель чата/реакций мультиплеера. Весь пользовательский текст попадает в DOM только через textContent.
import { EMOJI, EMOJI_NAMES, roleSummary, MODE_NAMES } from '../net/mp.js';

export class LobbyUi {
  /** @param {(id: string) => HTMLElement} $  @param {Record<string, Function>} cb */
  constructor($, cb) {
    this.$ = $; this.cb = cb; this.me = null; this.chatOpen = false; this.floatN = 0;
    const emos = $('mp-emos');
    for (const [k, ch] of Object.entries(EMOJI)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'emo'; b.textContent = ch; b.setAttribute('aria-label', EMOJI_NAMES[k]); b.title = EMOJI_NAMES[k];
      b.addEventListener('click', () => cb.onEmo(k)); emos.appendChild(b);
    }
    $('mp-chatbtn').addEventListener('click', () => this.toggleChat());
    $('mp-chatform').addEventListener('submit', e => { e.preventDefault(); const i = $('mp-chatin'), v = i.value.trim(); if (v) { cb.onChat(v); i.value = ''; } });
    $('mp-create').addEventListener('click', () => cb.onCreate($('mp-nick').value, +$('mp-max').value, $('mp-mode').value));
    $('mp-mode').addEventListener('change', () => { $('mp-modehint').hidden = false; });
    $('mp-bot').addEventListener('click', () => cb.onBot());
    $('mp-share').addEventListener('click', () => cb.onShare());
    if (!(typeof navigator !== 'undefined' && navigator.share)) $('mp-share').hidden = true; else $('mp-share').hidden = false;
    $('mp-join').addEventListener('click', () => cb.onJoin($('mp-nick').value, $('mp-code').value));
    $('mp-code').addEventListener('keydown', e => { if (e.key === 'Enter') cb.onJoin($('mp-nick').value, $('mp-code').value); });
    $('mp-ready').addEventListener('click', () => cb.onReady());
    $('mp-start').addEventListener('click', () => cb.onStart());
    $('mp-leave').addEventListener('click', () => cb.onLeave());
    $('mp-back').addEventListener('click', () => cb.onBack());
    $('mp-copy').addEventListener('click', () => cb.onCopy());
  }
  setStatus(text, bad = false) { const el = this.$('mp-status'); el.textContent = text || ''; el.classList.toggle('bad', !!bad); }
  showEntry() { this.$('mp-entry').hidden = false; this.$('mp-room').hidden = true; }
  setBusy(b) { for (const id of ['mp-create', 'mp-join']) this.$(id).disabled = !!b; }
  toggleChat(open) {
    this.chatOpen = open === undefined ? !this.chatOpen : open;
    this.$('mp-tray').hidden = !this.chatOpen; this.$('mp-hud').classList.toggle('chat-open', this.chatOpen); this.$('mp-chatbtn').setAttribute('aria-expanded', String(this.chatOpen));
    if (this.chatOpen) setTimeout(() => this.$('mp-chatin').focus({ preventScroll: true }), 20);
  }
  hud(visible) { this.$('mp-hud').hidden = !visible; if (!visible) this.toggleChat(false); }
  /** Состояние комнаты: m — сообщение lobby, me — pid игрока */
  renderRoom(m, me) {
    this.me = me;
    this.$('mp-entry').hidden = true; this.$('mp-room').hidden = false;
    this.$('mp-roomcode').textContent = m.code;
    this.$('mp-modename').textContent = MODE_NAMES[m.mode] || MODE_NAMES.coop;
    const ul = this.$('mp-players'); ul.textContent = '';
    for (const p of m.players) {
      const li = document.createElement('li'); li.className = (p.online ? '' : 'off ') + (p.pid === me ? 'me' : '');
      const dot = document.createElement('i'); dot.className = 'dot ' + (p.online ? 'on' : 'off'); dot.setAttribute('aria-hidden', 'true');
      const name = document.createElement('b'); name.textContent = (p.bot ? '🤖 ' : '') + p.nick + (p.pid === me ? ' (вы)' : '');
      if (p.bot) li.classList.add('bot');
      const tag = document.createElement('span'); tag.className = 'tag';
      tag.textContent = (p.bot ? 'ИИ-напарник' : p.pid === m.host ? '★ хозяин' : p.ready ? '✓ готов' : 'не готов') + (p.online ? '' : ' · нет связи');
      li.append(dot, name, tag);
      if (m.state === 'playing' && p.role) { const r = document.createElement('small'); r.textContent = roleSummary(p.role); li.append(r); }
      if (m.host === me && p.pid !== me && m.state === 'lobby') {
        const k = document.createElement('button'); k.type = 'button'; k.className = 'btn small'; k.textContent = 'Убрать'; k.setAttribute('aria-label', 'Убрать игрока ' + p.nick);
        k.addEventListener('click', () => (p.bot ? this.cb.onBot(true) : this.cb.onKick(p.pid))); li.append(k);
      }
      ul.append(li);
    }
    const hasBot = m.players.some(p => p.bot);
    const isHost = m.host === me, mine = m.players.find(p => p.pid === me);
    const others = m.players.filter(p => p.pid !== m.host && !p.bot);
    const canStart = m.players.length >= 2 && m.players.every(p => p.online || p.bot) && others.every(p => p.ready);
    const lobbyState = m.state === 'lobby';
    const botBtn = this.$('mp-bot'); botBtn.hidden = !(isHost && m.mode !== 'versus' && m.state === 'lobby' && !hasBot && m.players.length < m.max);
    this.$('mp-start').hidden = !isHost; this.$('mp-start').disabled = lobbyState && !canStart; this.$('mp-start').textContent = lobbyState ? 'Начать игру' : 'Новая игра';
    this.$('mp-ready').hidden = isHost || !lobbyState; this.$('mp-ready').textContent = mine && mine.ready ? 'Не готов' : 'Готов';
    if (!lobbyState) { this.setStatus(m.state === 'playing' ? 'Идёт игра.' : isHost ? 'Игра окончена. Нажмите «Новая игра», чтобы вернуть всех в лобби.' : 'Игра окончена. Ждём хозяина.'); return; }
    this.setStatus(m.players.length < 2 ? `Ждём игроков (${m.players.length} из ${m.max}). Отправьте друзьям код или ссылку.` : isHost ? (canStart ? 'Все готовы — можно начинать.' : 'Ждём, пока все нажмут «Готов».') : 'Ждём, пока хозяин начнёт игру.');
  }
  addChat(m) {
    const ul = this.$('mp-chatlog'), li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = m.nick + ': '; const s = document.createElement('span'); s.textContent = m.text;
    li.append(b, s); ul.append(li);
    while (ul.children.length > 40) ul.firstChild.remove();
    ul.scrollTop = ul.scrollHeight;
    li.classList.add('fresh'); setTimeout(() => li.classList.remove('fresh'), 9000);
  }
  clearChat() { this.$('mp-chatlog').textContent = ''; }
  floatEmoji(m) {
    const box = this.$('mp-float'); if (box.children.length > 12) return;
    const d = document.createElement('div'); d.className = 'floaty'; d.style.left = (10 + (this.floatN++ * 17) % 70) + '%';
    const e = document.createElement('span'); e.textContent = EMOJI[m.e] || ''; const n = document.createElement('small'); n.textContent = m.nick;
    d.append(e, n); box.append(d); setTimeout(() => d.remove(), 2600);
  }
}
