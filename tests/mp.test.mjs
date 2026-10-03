// Клиентская часть мультиплеера: чистые функции и MpClient (поддельный WebSocket, поддельные таймеры) — без сети и браузера.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MpClient, wsUrl, normalizeCode, roomFromSearch, inviteLink, ownership, roleSummary, errText, CODE_RE, DEFAULT_WS, EMOJI } from '../src/net/mp.js';

class FakeWS {
  static all = [];
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; FakeWS.all.push(this); }
  send(d) { this.sent.push(JSON.parse(d)); }
  close(code) { this.readyState = 3; this.onclose && this.onclose({ code }); }
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  recv(o) { this.onmessage && this.onmessage({ data: typeof o === 'string' ? o : JSON.stringify(o) }); }
  drop(code = 1006) { this.readyState = 3; this.onclose && this.onclose({ code }); }
}
const mk = (extra = {}) => {
  FakeWS.all = []; const timers = []; const msgs = [], st = [];
  const c = new MpClient({ url: 'wss://x/ws', WS: FakeWS, onMsg: m => msgs.push(m), onStatus: s => st.push(s), setTimer: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimer: () => {}, ...extra });
  return { c, msgs, st, timers };
};

test('MP-01 код комнаты: нормализация, проверка, ссылка', () => {
  assert.equal(normalizeCode(' k7m-2p '), 'K7M2P'); assert.ok(CODE_RE.test('K7M2P')); assert.ok(!CODE_RE.test('K7M2O')); assert.ok(!CODE_RE.test('ABCD'));
  assert.equal(roomFromSearch('?room=k7m2p&x=1'), 'K7M2P'); assert.equal(roomFromSearch('?room=<script>'), ''); assert.equal(roomFromSearch(''), '');
  assert.equal(inviteLink({ origin: 'https://a.b', pathname: '/steam-engine-game/' }, 'K7M2P'), 'https://a.b/steam-engine-game/?room=K7M2P');
});
test('MP-02 адрес сервера: по умолчанию wss прод; ?ws= только в debug и только ws(s)://', () => {
  assert.equal(wsUrl('?ws=ws://127.0.0.1:9/ws', false), DEFAULT_WS);
  assert.equal(wsUrl('?ws=ws://127.0.0.1:9/ws', true), 'ws://127.0.0.1:9/ws');
  assert.equal(wsUrl('?ws=javascript:alert(1)', true), DEFAULT_WS); assert.equal(wsUrl('?ws=https://evil.example/x', true), DEFAULT_WS);
  assert.match(DEFAULT_WS, /^wss:\/\/185-255-133-179\.sslip\.io\/steam\/ws$/);
});
test('MP-03 владельцы управления и подписи ролей', () => {
  const roles = { a: { valves: [0, 1], shovel: false, leaks: true }, b: { valves: [2, 3], shovel: true, leaks: false } };
  const o = ownership(roles, [{ pid: 'a', nick: 'Анна' }, { pid: 'b', nick: 'Борис' }]);
  assert.deepEqual(o.valve.map(v => v.nick), ['Анна', 'Анна', 'Борис', 'Борис']); assert.equal(o.shovel.nick, 'Борис'); assert.equal(o.leaks.nick, 'Анна');
  assert.equal(roleSummary(roles.a), 'Госпиталь, Кварталы, утечки'); assert.equal(roleSummary(roles.b), 'Завод, Фильтры, лопата');
});
test('MP-04 тексты ошибок известны и не раскрывают внутренности', () => {
  for (const c of ['no_such_room', 'room_full', 'already_started', 'create_limit', 'need_players', 'chat_rate']) assert.ok(errText(c).length > 5);
  assert.match(errText('weird<script>'), /Что-то пошло не так/); assert.equal(Object.keys(EMOJI).length, 8);
});
test('MP-05 подключение, отправка JSON, получение; мусор от сервера игнорируется', async () => {
  const { c, msgs } = mk(); const p = c.connect(); FakeWS.all[0].open(); await p;
  assert.equal(c.status, 'open'); assert.ok(c.send({ t: 'ping' })); assert.deepEqual(FakeWS.all[0].sent, [{ t: 'ping' }]);
  FakeWS.all[0].recv({ t: 'pong' }); FakeWS.all[0].recv('не json'); FakeWS.all[0].recv({ nope: 1 }); FakeWS.all[0].recv('[1]');
  assert.deepEqual(msgs, [{ t: 'pong' }]);
});
test('MP-06 первое подключение провалилось — connect() отклоняется, повторов нет', async () => {
  const { c, timers } = mk(); const p = c.connect(); FakeWS.all[0].drop(1006);
  await assert.rejects(p); assert.equal(c.status, 'closed'); assert.equal(timers.filter(t => t.ms < 20000).length, 0);
});
test('MP-07 обрыв в комнате: переподключение с backoff и rejoin по секрету', async () => {
  const { c, timers, st } = mk(); const p = c.connect(); FakeWS.all[0].open(); await p;
  c.setSession({ code: 'K7M2P', pid: 'ab', secret: 's3cret' });
  FakeWS.all[0].drop(1006);
  assert.equal(c.status, 'reconnecting'); const retry = timers.at(-1); assert.ok(retry.ms >= 400 && retry.ms <= 700);
  retry.f(); assert.equal(FakeWS.all.length, 2); FakeWS.all[1].open();
  assert.deepEqual(FakeWS.all[1].sent[0], { t: 'rejoin', code: 'K7M2P', pid: 'ab', secret: 's3cret' }); assert.equal(c.status, 'open');
  FakeWS.all[1].drop(1006); const r2 = timers.at(-1); assert.ok(r2.ms >= 400 && r2.ms <= 700, 'после успешного открытия задержка сброшена');
  FakeWS.all[1].drop(1006);   // повторное закрытие того же сокета не плодит таймеры
  assert.ok(st.includes('reconnecting'));
});
test('MP-08 длительная потеря связи → статус lost; закрытие 1008/4000 не повторяется', async () => {
  const { c, timers, st } = mk({ maxOfflineS: 0 }); const p = c.connect(); FakeWS.all[0].open(); await p;
  c.setSession({ code: 'K7M2P', pid: 'ab', secret: 's' }); FakeWS.all[0].drop(1006);
  await new Promise(r => setTimeout(r, 5)); timers.at(-1)?.f(); FakeWS.all.at(-1).drop(1006);
  assert.ok(st.includes('lost'));
  const t = mk(); const q = t.c.connect(); FakeWS.all[0].open(); await q; t.c.setSession({ code: 'K7M2P', pid: 'ab', secret: 's' });
  const n = t.timers.length; FakeWS.all[0].drop(1008); assert.equal(t.c.status, 'closed'); assert.equal(t.timers.length, n);
});
test('MP-09 close() — без повторов, сессия забыта; send вне соединения возвращает false', async () => {
  const { c } = mk(); const p = c.connect(); FakeWS.all[0].open(); await p; c.setSession({ code: 'K7M2P', pid: 'a', secret: 's' });
  c.close(); assert.equal(c.session, null); assert.equal(c.send({ t: 'ping' }), false); assert.equal(FakeWS.all.length, 1);
});
