"""Мультиплеер: комнаты, лобби, роли, кооператив, голосование, реконнект, лимиты, санитизация, транспорт WebSocket."""
import json
import re
import time

import pytest
from fastapi.testclient import TestClient

from app import simcore as sc
from app.config import Settings
from app.main import create_app
from app.mp import CODE_ALPHABET, Hub, Limits, assign_roles, clean_chat

ORIGIN = "https://steam-engine-game.pages.dev"
GH = "https://joliks.github.io"


class Clock:
    def __init__(self): self.t = 1_800_000_000.0
    def __call__(self): return self.t


class Bot:
    """Клиент-бот поверх Hub без сети: шлёт JSON, разбирает исходящую очередь."""
    def __init__(self, hub, ip="1.1.1.1"):
        self.hub = hub
        self.conn = hub.connect(ip)
        assert self.conn is not None
        self.log = []
        self.snap = None
        self.pid = self.secret = self.code = None

    def send(self, **m): self.hub.handle(self.conn, json.dumps(m))
    def raw(self, text): self.hub.handle(self.conn, text)

    def pump(self):
        out = []
        while self.conn.outbox:
            m = json.loads(self.conn.outbox.popleft())
            out.append(m)
            if m["t"] == "snap": self.snap = m
            if m["t"] == "joined": self.pid, self.secret, self.code = m["pid"], m["secret"], m["code"]
        self.log += out
        return out

    def last(self, t):
        self.pump()
        return next((m for m in reversed(self.log) if m["t"] == t), None)

    def errs(self):
        self.pump()
        return [m["code"] for m in self.log if m["t"] == "err"]


@pytest.fixture()
def clock(): return Clock()

@pytest.fixture()
def hub(clock): return Hub(clock=clock, limits=Limits(), rng=lambda: 12345)


def lobby2(hub, nick_a="Анна", nick_b="Борис"):
    a, b = Bot(hub, "1.1.1.1"), Bot(hub, "2.2.2.2")
    a.send(t="create", nick=nick_a, max=2); a.pump()
    b.send(t="join", code=a.code.lower(), nick=nick_b); b.pump()
    return a, b


def started(hub):
    a, b = lobby2(hub)
    b.send(t="ready", ready=True)
    a.send(t="start")
    for x in (a, b): x.pump()
    return a, b, hub.rooms[a.code]


# ------------------------------------------------------------------ лобби
def test_create_room_code_and_lobby(hub):
    a = Bot(hub)
    a.send(t="create", nick="Анна", max=3); a.pump()
    assert re.fullmatch(f"[{CODE_ALPHABET}]{{5}}", a.code)
    lob = a.last("lobby")
    assert lob["host"] == a.pid and lob["state"] == "lobby" and lob["max"] == 3 and lob["players"][0]["nick"] == "Анна"
    assert a.secret and len(a.secret) >= 20


def test_join_case_insensitive_and_unique_nicks(hub):
    a = Bot(hub); a.send(t="create", nick="Игрок", max=4); a.pump()
    b = Bot(hub, "2.2.2.2"); b.send(t="join", code=" " + a.code.lower() + " ", nick="Игрок"); b.pump()
    assert b.code == a.code
    nicks = [p["nick"] for p in a.last("lobby")["players"]]
    assert len(set(nicks)) == 2


def test_nick_is_sanitized(hub):
    a = Bot(hub); a.send(t="create", nick="<script>alert(1)</script>", max=2); a.pump()
    nick = a.last("joined")["nick"]
    assert "<" not in nick and ">" not in nick
    b = Bot(hub, "2.2.2.2"); b.send(t="join", code=a.code, nick="http://evil.example"); b.pump()
    assert "http" not in b.last("joined")["nick"]


def test_join_errors(hub):
    a, b = lobby2(hub)
    c = Bot(hub, "3.3.3.3"); c.send(t="join", code=a.code, nick="C"); assert "room_full" in c.errs()
    d = Bot(hub, "4.4.4.4"); d.send(t="join", code="ZZZZZ", nick="D"); assert "no_such_room" in d.errs()
    d.send(t="join", code=["x"], nick="D"); d.send(t="join", code="A" * 500, nick="D"); assert d.errs().count("no_such_room") == 3
    b.send(t="ready", ready=True); a.send(t="start")
    e = Bot(hub, "5.5.5.5"); e.send(t="join", code=a.code, nick="E"); assert "already_started" in e.errs()


def test_start_rules(hub):
    a = Bot(hub); a.send(t="create", nick="A", max=2); a.pump()
    a.send(t="start"); assert "need_players" in a.errs()
    b = Bot(hub, "2.2.2.2"); b.send(t="join", code=a.code, nick="B"); b.pump()
    b.send(t="start"); assert "not_host" in b.errs()
    a.send(t="start"); assert "not_ready" in a.errs()
    b.send(t="ready", ready=True); a.send(t="start")
    assert a.last("start")["roles"] and hub.rooms[a.code].state == "playing"


def test_leave_kick_and_empty_room_removed(hub):
    a, b = lobby2(hub)
    b.send(t="kick", pid=a.pid); assert hub.rooms[a.code].host == a.pid and a.pid in hub.rooms[a.code].players
    a.send(t="kick", pid=b.pid); assert b.pid not in hub.rooms[a.code].players and b.last("left")["reason"] == "kicked"
    code = a.code; a.send(t="leave")
    assert code not in hub.rooms


def test_host_migrates_on_disconnect(hub):
    a, b = lobby2(hub)
    hub.disconnect(a.conn)
    assert hub.rooms[b.code].host == b.pid
    assert [p["online"] for p in b.last("lobby")["players"]] == [False, True]


# ------------------------------------------------------------------ роли и права
@pytest.mark.parametrize("n", [1, 2, 3, 4])
def test_roles_cover_everything_exactly_once(n):
    r = assign_roles([f"p{i}" for i in range(n)])
    valves = sorted(v for x in r.values() for v in x["valves"])
    assert valves == [0, 1, 2, 3] and sum(x["shovel"] for x in r.values()) == 1 and sum(x["leaks"] for x in r.values()) == 1


def test_permissions_and_authoritative_valves(hub):
    a, b, room = started(hub)
    ra, rb = room.roles[a.pid], room.roles[b.pid]
    assert ra["valves"] == [0, 1] and rb["valves"] == [2, 3] and rb["shovel"] and ra["leaks"]
    a.send(t="valve", i=2, v=1.0); assert a.errs() == ["forbidden"]
    a.send(t="shovel"); assert "forbidden" in a.errs()
    b.send(t="fix", id=None); assert "forbidden" in b.errs()
    a.send(t="valve", i=0, v=0.8); a.send(t="valve", i=1, v=0.3)
    b.send(t="valve", i=2, v=0.5)
    assert room.sim["valves"][:3] == [0.8, 0.3, 0.5] and room.sim["valves"][3] == 0
    for bad in ("x", None, True, [0.1], {"a": 1}):
        a.send(t="valve", i=0, v=bad)
    assert room.sim["valves"][0] == 0.8
    a.send(t="valve", i="0", v=0.1); a.send(t="valve", i=True, v=0.1); a.send(t="valve", i=-1, v=0.1)
    assert room.sim["valves"][0] == 0.8
    b.send(t="shovel"); assert room.sim["shovels"] == 1
    room.advance(10)


def test_snapshot_shape_and_rate(hub):
    a, b, room = started(hub)
    a.pump(); n0 = sum(1 for m in a.pump() if m["t"] == "snap")
    room.advance(60)
    snaps = [m for m in a.pump() if m["t"] == "snap"]
    assert len(snaps) == 12
    s = snaps[-1]
    assert s["seq"] > 0 and abs(s["s"]["t"] - 1.0) < 0.1 and len(s["s"]["valves"]) == 4 and "ev" in s
    assert len(json.dumps(s)) < 1500


def test_invalid_commands_before_start_and_in_lobby(hub):
    a, b = lobby2(hub)
    a.send(t="valve", i=0, v=1); assert "not_playing" in a.errs()
    c = Bot(hub, "9.9.9.9"); c.send(t="valve", i=0, v=1); assert "no_room" in c.errs()


# ------------------------------------------------------------------ полная кооперативная партия ботами
def good_bot(room, bots):
    for bot in bots:
        r = room.roles[bot.pid]; s = bot.snap["s"] if bot.snap else None
        if not s: continue
        if s["phase"] == "night":
            for i in r["valves"]:
                want = min(1, s["needNow"][i] / sc.CAP[i] * 1.08)
                if abs(s["valves"][i] - want) > 0.05: bot.send(t="valve", i=i, v=round(want, 2))
            if r["shovel"] and s["fire"] < 40: bot.send(t="shovel")
            if r["leaks"] and s["leaks"]: bot.send(t="fix", id=s["leaks"][0]["id"])
        elif s["phase"] == "card":
            bot.send(t="card", key=sc.CARDS[room.sim["night"] + 1]["options"][0]["key"])
        elif s["phase"] == "summary":
            bot.send(t="next")


def test_full_coop_game_reaches_ending_and_is_authoritative(hub):
    a, b, room = started(hub)
    for step in range(60 * 60 * 12 // 6):
        room.advance(6); hub.clock.t += 0.1
        for x in (a, b): x.pump()
        good_bot(room, (a, b))
        if room.state == "ended": break
    assert room.state == "ended"
    end = a.last("end")["result"]
    assert end["ending"] == room.sim["ending"] and end["score"] >= 0 and end["nights"] in range(0, 11)
    assert b.last("end")["result"] == end
    # результат совпадает с чистой симуляцией на сервере: сид и ввод есть только у сервера, клиент ничего не «присылает»
    assert room.result["players"] == ["Анна", "Борис"]


def test_idle_players_lose_game_by_silence_or_boom(hub):
    a, b, room = started(hub)
    for _ in range(60 * 60 * 3):
        room.advance(10); hub.clock.t += 0.17
        for x in (a, b): x.pump()
        if room.state == "ended": break
    assert room.state == "ended" and room.result["ending"] in ("silence", "boom", "cold")
    for x in (a, b): x.pump()
    a.send(t="again"); assert room.state == "lobby" and room.sim is None


# ------------------------------------------------------------------ голосование и таймауты
def to_card(room, bots):
    s = room.sim
    s.update(phase="summary", night=0, summary={"night": 0}, summary_seen=True)
    room.phase_left = 5
    for b in bots: b.pump()


def test_card_vote_majority_tie_and_timeout():
    clock = Clock(); hub = Hub(clock=clock, limits=Limits(), rng=lambda: 7)
    a, b = lobby2(hub); b.send(t="ready", ready=True); a.send(t="start")
    room = hub.rooms[a.code]
    to_card(room, (a, b))
    a.send(t="next"); b.send(t="next")
    assert room.sim["phase"] == "card" and room.sim["card"]["id"] == "timka"
    a.send(t="card", key="help"); assert room.sim["phase"] == "card"
    a.send(t="card", key="nonsense"); assert "bad_value" in a.errs()
    b.send(t="card", key="ration")                       # ничья 1:1 → первый вариант (help)
    assert room.sim["phase"] == "night" and room.sim["flags"]["timka"] is True and room.sim["night"] == 1
    # таймаут: никто не голосует
    room.sim.update(phase="summary", night=2, summary={"night": 2}, summary_seen=True); room.phase_left = 1
    room.advance(61)
    assert room.sim["phase"] == "card" and room.sim["card"]["id"] == "shift"
    room.advance(int(25 * 60) + 5)
    assert room.sim["phase"] == "night" and room.sim["night"] == 3 and room.sim["flags"]["extend"] is True


def test_summary_auto_continue_after_timeout(hub):
    a, b, room = started(hub)
    room.sim.update(phase="summary", night=3, summary={"night": 3}, summary_seen=True); room.phase_left = 15
    room.advance(15 * 60 + 2)
    assert room.sim["phase"] == "night" and room.sim["night"] == 4


# ------------------------------------------------------------------ реконнект
def test_disconnect_pauses_and_rejoin_restores(hub, clock):
    a, b, room = started(hub)
    room.advance(30)
    t0 = room.sim["t"]
    hub.disconnect(b.conn)
    room.advance(120)
    assert room.paused and room.sim["t"] == t0                           # игра ждёт отключившегося
    b2 = Bot(hub, "2.2.2.2"); b2.send(t="rejoin", code=a.code, pid=b.pid, secret="wrong"); assert "no_such_room" in b2.errs()
    b2.send(t="rejoin", code=a.code.lower(), pid=b.pid, secret=b.secret)
    kinds = [m["t"] for m in b2.pump()]
    assert kinds[:2] == ["joined", "lobby"] and "start" in kinds and "snap" in kinds
    room.advance(60)
    assert not room.paused and room.sim["t"] > t0
    assert room.roles[b.pid]["valves"] == [2, 3]


def test_rejoin_replaces_old_connection(hub):
    a, b, room = started(hub)
    b2 = Bot(hub, "2.2.2.2"); b2.send(t="rejoin", code=a.code, pid=b.pid, secret=b.secret); b2.pump()
    assert b.last("left")["reason"] == "replaced" and b.conn.closed
    hub.disconnect(b.conn)                                               # закрытие старого сокета не должно выкинуть нового
    assert room.players[b.pid].conn is b2.conn and room.players[b.pid].connected


def test_grace_timeout_removes_player_and_merges_roles(hub, clock):
    a, b, room = started(hub)
    hub.disconnect(b.conn)
    clock.t += 30; hub.housekeeping(); assert b.pid in room.players
    clock.t += 40; hub.housekeeping()
    assert b.pid not in room.players
    assert room.roles[a.pid]["valves"] == [0, 1, 2, 3] and room.roles[a.pid]["shovel"]
    room.advance(30); assert not room.paused


def test_empty_lobby_room_gc_and_idle_lobby_closed(hub, clock):
    a = Bot(hub); a.send(t="create", nick="A", max=2); a.pump(); code = a.code
    hub.disconnect(a.conn); clock.t += 31; hub.housekeeping()
    assert code not in hub.rooms
    b = Bot(hub, "2.2.2.2"); b.send(t="create", nick="B", max=2); b.pump(); code = b.code
    clock.t += 901; b.conn.last_ping = clock.t; hub.housekeeping()
    assert code not in hub.rooms and b.last("left")["reason"] == "room_closed"


# ------------------------------------------------------------------ чат и эмодзи
def test_chat_sanitization():
    assert clean_chat("  привет\n\t  котёл \u200b\u202e ") == "привет котёл"
    assert clean_chat("x" * 500) == "x" * 120
    for bad in ("", "   ", "\x00\x01", "зайди на http://evil.ru", "www.evil.com", "пиши @bob", "t.me/abc", "evil.com/free", None, 5, ["a"], "a" * 601):
        assert clean_chat(bad) is None, bad
    assert clean_chat("<b>hi</b>") == "<b>hi</b>"                         # HTML не вырезаем — клиент всегда использует textContent


def test_chat_broadcast_rate_and_history(hub, clock):
    a, b = lobby2(hub)
    a.send(t="chat", text="Всем привет"); assert b.last("chat")["text"] == "Всем привет" and b.last("chat")["nick"] == "Анна"
    a.send(t="chat", text="спам"); assert "chat_rate" in a.errs()
    clock.t += 1.1; a.send(t="chat", text="ссылка http://x.y"); assert "bad_chat" in a.errs()
    c = Bot(hub, "3.3.3.3"); hub.rooms[a.code].max_players = 3; c.send(t="join", code=a.code, nick="C")
    assert [m["text"] for m in c.last("joined")["chat"]] == ["Всем привет"]
    assert a.last("chat")["pid"] == a.pid


def test_emoji_whitelist_and_rate(hub, clock):
    a, b = lobby2(hub)
    a.send(t="emo", e="fire"); assert b.last("emo")["e"] == "fire"
    clock.t += 1
    a.send(t="emo", e="<img src=x>"); a.send(t="emo", e="😈"); a.send(t="emo", e=None)
    assert a.errs().count("bad_value") == 3
    n = len([m for m in b.pump() if m["t"] == "emo"]); a.send(t="emo", e="heart"); a.send(t="emo", e="heart")
    assert len([m for m in b.pump() if m["t"] == "emo"]) == 1


# ------------------------------------------------------------------ лимиты и злоупотребления
def test_connections_per_ip_limit(hub):
    cs = [hub.connect("7.7.7.7") for _ in range(8)]
    assert all(cs) and hub.connect("7.7.7.7") is None and hub.connect("8.8.8.8")
    hub.disconnect(cs[0]); hub.disconnect(cs[0])                         # повторный disconnect не уводит счётчик в минус
    assert hub.connect("7.7.7.7") is not None and hub.connect("7.7.7.7") is None


def test_room_creation_rate_limit_and_total_cap(clock):
    hub = Hub(clock=clock, limits=Limits(max_rooms=5), rng=lambda: 1)
    a = Bot(hub, "1.1.1.1")
    for k in range(3):
        a.send(t="create", nick="A", max=2); a.pump(); a.send(t="leave")
    a.send(t="create", nick="A", max=2); assert "create_limit" in a.errs()
    clock.t += 601; a.send(t="create", nick="A", max=2); a.pump(); assert a.code
    for i in range(10):
        x = Bot(hub, f"9.9.{i}.1"); x.send(t="create", nick="X", max=2)
    assert len(hub.rooms) == 5


def test_create_validation(hub):
    a = Bot(hub)
    for kw in (dict(max=9), dict(max=1), dict(max="2"), dict(max=True), dict(mode="battle", max=2), dict(max=2.5)):
        a.send(t="create", nick="A", **kw)
    assert a.errs().count("bad_value") == 6 and not hub.rooms


def test_oversized_garbage_and_rate_limited_messages(hub):
    a = Bot(hub); a.raw("x" * 3000); assert a.conn.closed and a.conn.close_code == 1009
    b = Bot(hub, "2.2.2.2")
    for bad in ("{", "[]", "5", '{"t":5}', '{"nope":1}', "null"): b.raw(bad)
    assert len(b.errs()) == 6
    for _ in range(150): b.raw('{"t":"ping"}')
    assert "rate_limit" in b.errs()
    c = Bot(hub, "3.3.3.3")
    for _ in range(200):
        if c.conn.closed: break
        c.raw("{"); c.conn._tokens = 80
    assert c.conn.closed and c.conn.close_code == 1008


def test_unknown_type_in_room_and_slow_consumer(hub):
    a, b = lobby2(hub)
    a.send(t="drop_tables"); assert "unknown" in a.errs()
    for _ in range(300): hub.rooms[a.code].push_lobby()                  # b не читает очередь
    assert b.conn.closed and b.conn.close_code == 1013


def test_prototype_pollution_and_weird_fields(hub):
    a, b, room = started(hub)
    a.raw('{"t":"valve","i":0,"v":0.5,"__proto__":{"x":1},"constructor":{"prototype":{"y":2}}}')
    a.raw('{"t":"card","key":{"a":1}}'); a.raw('{"t":"fix","id":{"a":1}}'); a.raw('{"t":"fix","id":1e999}')
    assert room.sim["valves"][0] == 0.5 and hub.rooms
    room.advance(120)
    assert all(isinstance(v, float) and v == v for v in room.sim["valves"])


# ------------------------------------------------------------------ транспорт: настоящий WebSocket
@pytest.fixture()
def ws_app(tmp_path):
    from app.aicrypto import KeyVault
    s = Settings(ai_master_key=KeyVault.generate(), db_path=str(tmp_path / "t.db"), secret_key="k" * 48, proxy_secret="p" * 40, admin_password="x" * 12,
                 cookie_secure=False, allowed_origins=[ORIGIN], direct_origins=[GH], admin_origins=[ORIGIN])
    return create_app(s, mp_autotick=True, ai_background=False)


def recv_until(ws, kind, n=200):
    for _ in range(n):
        m = ws.receive_json()
        if m["t"] == kind:
            return m
    raise AssertionError("не дождались " + kind)


def test_ws_origin_policy(ws_app):
    from starlette.websockets import WebSocketDisconnect
    with TestClient(ws_app) as c:
        for good in (ORIGIN, GH):
            with c.websocket_connect("/ws", headers={"origin": good}) as ws:
                ws.send_json({"t": "ping"}); assert ws.receive_json()["t"] == "pong"
        for bad in ("https://evil.example", "http://steam-engine-game.pages.dev", "null", ""):
            with pytest.raises(WebSocketDisconnect):
                with c.websocket_connect("/ws", headers={"origin": bad}) as ws:
                    ws.receive_json()


def test_ws_two_clients_play_coop_live(ws_app):
    with TestClient(ws_app) as c:
        with c.websocket_connect("/ws", headers={"origin": GH}) as w1, c.websocket_connect("/ws", headers={"origin": ORIGIN}) as w2:
            w1.send_json({"t": "create", "nick": "Анна", "max": 2})
            j1 = recv_until(w1, "joined")
            w2.send_json({"t": "join", "code": j1["code"], "nick": "Борис"})
            j2 = recv_until(w2, "joined")
            w2.send_json({"t": "ready", "ready": True})
            lob = recv_until(w1, "lobby")
            while len(lob["players"]) < 2 or not lob["players"][1]["ready"]:
                lob = recv_until(w1, "lobby")
            w1.send_json({"t": "start"})
            st = recv_until(w2, "start")
            assert set(st["roles"]) == {j1["pid"], j2["pid"]}
            w1.send_json({"t": "valve", "i": 0, "v": 0.7})
            w2.send_json({"t": "shovel"})
            t_end = time.time() + 5
            snap = recv_until(w1, "snap")
            while time.time() < t_end:
                snap = recv_until(w2, "snap")
                if snap["s"]["valves"][0] == 0.7 and snap["s"]["fire"] > 5 and snap["s"]["t"] > 0.5:
                    break
            assert snap["s"]["valves"][0] == 0.7 and snap["s"]["fire"] > 5
            # реконнект по сокету
        with c.websocket_connect("/ws", headers={"origin": GH}) as w3:
            w3.send_json({"t": "rejoin", "code": j1["code"], "pid": j1["pid"], "secret": j1["secret"]})
            assert recv_until(w3, "joined")["pid"] == j1["pid"]
            assert recv_until(w3, "start")["roles"]


def test_ws_oversized_message_closes(ws_app):
    from starlette.websockets import WebSocketDisconnect
    with TestClient(ws_app) as c:
        with c.websocket_connect("/ws", headers={"origin": ORIGIN}) as ws:
            ws.send_text("x" * 5000)
            with pytest.raises(WebSocketDisconnect) as e:
                for _ in range(5): ws.receive_json()
            assert e.value.code == 1009


def test_ws_no_origin_allowed_only_when_enabled(tmp_path):
    from starlette.websockets import WebSocketDisconnect
    from app.aicrypto import KeyVault
    mk = lambda flag: create_app(Settings(ai_master_key=KeyVault.generate(), db_path=str(tmp_path / f"{flag}.db"), secret_key="k" * 48, proxy_secret="p" * 40, admin_password="x" * 12,
                                          cookie_secure=False, ws_allow_no_origin=flag), mp_autotick=False, ai_background=False)
    with TestClient(mk(False)) as c, pytest.raises(WebSocketDisconnect):
        with c.websocket_connect("/ws") as ws: ws.receive_json()
    with TestClient(mk(True)) as c, c.websocket_connect("/ws") as ws:
        ws.send_json({"t": "ping"}); assert ws.receive_json()["t"] == "pong"


def test_http_security_unchanged_for_other_paths(ws_app):
    with TestClient(ws_app) as c:
        assert c.get("/api/health").status_code == 200
        assert c.get("/api/g/note").status_code in (403, 404, 405)
