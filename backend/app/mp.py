"""Мультиплеер «Последнего котла»: комнаты, лобби, кооператив (2–4 игрока), авторитетная симуляция на сервере.

Слой не зависит от транспорта: `Hub.handle(conn, text)` — синхронный разбор одного сообщения клиента, `Conn.send` кладёт ответы в
очередь, которую WebSocket-обработчик (main.py) пишет в сокет. Поэтому ядро полностью тестируется без сети.
Весь код выполняется в одном потоке event loop — блокировки не нужны. Протокол и обоснование — MULTIPLAYER.md.
"""
from __future__ import annotations

import hmac
import json
import logging
import math
import re
import secrets
import time
import unicodedata
from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Any, Callable

from . import botcore
from . import simcore as sc
from .aigame import COMPANION_FALLBACK, COMPANION_NICK, HOST_TEXT, clean_agg
from .scoring import clean_nick, score_js

log = logging.getLogger("seg.mp")
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"      # без I, L, O, 0, 1 — не путаются при диктовке
CODE_LEN = 5
EMOJI = frozenset({"thumbs", "fire", "scream", "heart", "clap", "cold", "steam", "sos"})
MODES = ("coop", "versus")
CHAT_MAX = 120
_LINKISH = re.compile(r"(https?:|www\.|://|\b\w+\.(com|ru|by|io|net|org|me|su|xyz|ly|gg)\b|t\.me|@\w)", re.I)
SNAP_EVERY = 5                                          # тиков (1/60 с) между снимками → 12 Гц
PUBLIC_EVENTS = {"shovel", "spill", "nocoal", "leak", "fix", "collapse", "event", "talk", "loss", "choice", "night", "nightend", "ending", "timka", "vent", "hostev"}


@dataclass
class Limits:
    max_rooms: int = 200
    conns_per_ip: int = 8
    creates_per_window: int = 10
    create_window_s: float = 600
    max_msg_bytes: int = 2048
    msg_rate: float = 40.0              # сообщений в секунду (token bucket)
    msg_burst: float = 80.0
    max_strikes: int = 40               # нарушений протокола до разрыва
    chat_gap_s: float = 1.0
    emo_gap_s: float = 0.5
    lobby_idle_s: float = 900
    ended_idle_s: float = 600
    room_max_age_s: float = 2 * 3600
    grace_lobby_s: float = 30
    grace_play_s: float = 60
    card_timeout_s: float = 25
    summary_timeout_s: float = 15
    outbox_max: int = 200
    ping_every_s: float = 25
    board_every_ticks: int = 30         # живая таблица соревнования ≈2 раза в секунду
    bot_chat_gap_s: float = 18.0

    @classmethod
    def from_env(cls, env: Any = None) -> "Limits":
        """Лимиты из окружения: SEG_MP_CREATES (комнат за окно на IP), SEG_MP_CREATE_WINDOW (с), SEG_MP_MAX_ROOMS, SEG_MP_CONNS_PER_IP."""
        import os
        e = os.environ if env is None else env
        lim = cls()
        def num(name: str, cur: float, lo: float, hi: float) -> float:
            try:
                v = float(e.get(name, ""))
            except ValueError:
                return cur
            return v if lo <= v <= hi else cur
        lim.creates_per_window = int(num("SEG_MP_CREATES", lim.creates_per_window, 1, 1000))
        lim.create_window_s = num("SEG_MP_CREATE_WINDOW", lim.create_window_s, 10, 86400)
        lim.max_rooms = int(num("SEG_MP_MAX_ROOMS", lim.max_rooms, 1, 5000))
        lim.conns_per_ip = int(num("SEG_MP_CONNS_PER_IP", lim.conns_per_ip, 1, 100))
        return lim


class Conn:
    """Одно клиентское соединение. Транспорт читает `outbox`, пока не `closed`."""

    def __init__(self, ip: str, clock: Callable[[], float], limits: Limits):
        self.ip, self.clock, self.lim = ip, clock, limits
        self.outbox: deque[str] = deque()
        self.closed = False
        self.close_code, self.close_reason = 1000, ""
        self.room: Room | None = None
        self.player: Player | None = None
        self.strikes = 0
        self._tokens, self._tok_t = limits.msg_burst, clock()
        self.on_wake: Callable[[], None] | None = None
        self.last_ping = clock()
        self.counted = True

    def send(self, msg: dict) -> None:
        if self.closed:
            return
        if len(self.outbox) >= self.lim.outbox_max:
            if msg.get("t") == "snap":                    # медленному клиенту снимки не копим — он получит следующий
                return
            self.close(1013, "slow consumer")
            return
        self.outbox.append(json.dumps(msg, ensure_ascii=False, separators=(",", ":")))
        if self.on_wake:
            self.on_wake()

    def close(self, code: int = 1000, reason: str = "") -> None:
        if not self.closed:
            self.closed, self.close_code, self.close_reason = True, code, reason[:100]
            if self.on_wake:
                self.on_wake()

    def allow(self) -> bool:
        now = self.clock()
        self._tokens = min(self.lim.msg_burst, self._tokens + (now - self._tok_t) * self.lim.msg_rate)
        self._tok_t = now
        if self._tokens < 1:
            return False
        self._tokens -= 1
        return True


@dataclass
class Player:
    pid: str
    nick: str
    secret: str
    ready: bool = False
    conn: Conn | None = None
    left_at: float | None = None          # когда пропало соединение
    last_chat: float = 0.0
    last_emo: float = 0.0
    bot: bool = False                     # ИИ-напарник: без соединения, всегда «на связи»

    @property
    def connected(self) -> bool:
        return self.bot or (self.conn is not None and not self.conn.closed)


def assign_roles(pids: list[str]) -> dict[str, dict[str, Any]]:
    """Распределение управления между игроками. Каждый клапан и лопата всегда принадлежат ровно одному игроку."""
    n = len(pids)
    layouts = {
        1: [dict(valves=[0, 1, 2, 3], shovel=True, leaks=True)],
        2: [dict(valves=[0, 1], shovel=False, leaks=True), dict(valves=[2, 3], shovel=True, leaks=False)],
        3: [dict(valves=[0, 1], shovel=False, leaks=False), dict(valves=[2, 3], shovel=False, leaks=False), dict(valves=[], shovel=True, leaks=True)],
        4: [dict(valves=[0], shovel=False, leaks=False), dict(valves=[1], shovel=False, leaks=False), dict(valves=[2, 3], shovel=False, leaks=False), dict(valves=[], shovel=True, leaks=True)],
    }
    return {p: dict(r) for p, r in zip(pids, layouts[n])}


def clean_chat(raw: Any) -> str | None:
    """Текст чата: NFKC, без управляющих/невидимых символов, ≤120, без ссылок. None — отклонить."""
    if not isinstance(raw, str) or len(raw) > 600:
        return None
    s = unicodedata.normalize("NFKC", raw)
    s = "".join(ch for ch in s if unicodedata.category(ch)[0] != "C" or ch in " ")
    s = re.sub(r"\s+", " ", s).strip()[:CHAT_MAX]
    if not s or _LINKISH.search(s):
        return None
    return s


def _r(x: float, n: int) -> float:
    return round(x, n)


def replay_rig(seed: int, log: list, ticks: int) -> dict:
    """Серверная перепроверка итога соревнования: чистый повтор партии с нуля по сиду и журналу команд. Совпадение с «живым» результатом доказывает,
    что итог получен только допустимыми командами на детерминированном ядре."""
    s = sc.create_state(seed, host=True)
    by_tick: dict[int, list] = {}
    for t, c in log:
        by_tick.setdefault(t, []).append(c)
    def apply(c: list) -> None:
        k = c[0]
        if k == "valve":
            sc.set_valve(s, c[1], c[2])
        elif k == "shovel":
            sc.shovel(s)
        elif k == "fix":
            sc.fix_leak(s, c[1])
        elif k == "card":
            sc.choose_card(s, c[1])
        elif k == "continue":
            sc.continue_summary(s)
    for i in range(ticks):
        for c in by_tick.get(i, ()):
            apply(c)
        sc.step(s, sc.DT)
        s["events"].clear()
        if s["phase"] == "ended":
            break
    else:
        for c in by_tick.get(ticks, ()):
            apply(c)
    return result_of(s)


def result_of(s: dict) -> dict:
    nights = sc.nights_done(s) if s["ending"] else min(s["night"], 10)
    pop, burn, smog = max(0, min(1000, round(s["pop"]))), min(60, s["burnouts"]), max(0, min(100, round(sc.smog_avg(s))))
    return {"ending": s["ending"], "nights": nights, "pop": pop, "burnouts": burn, "smog": smog, "score": score_js(nights, pop, s["ending"], burn, smog),
            "leaksFixed": s["leaksFixed"], "shovels": s["shovels"]}


class Rig:
    """Личный котёл игрока в соревновании: свой экземпляр ядра на общем сиде, свой таймер карточек, журнал команд для перепроверки."""
    MAX_LOG = 60000

    def __init__(self, room: "Room", p: Player):
        self.room, self.pid, self.nick = room, p.pid, p.nick
        self.sim = sc.create_state(room.seed, host=True)
        self.tick = 0
        self.log: list = []
        self.phase_left = 0.0
        self.vote: str | None = None
        self.acked = False
        self.pending: list[dict] = []
        self.done = False
        self.dnf = False
        self.result: dict | None = None
        self.finish_order = 0
        self.seq = 0
        self._since_snap = 0
        self.paused = False

    @property
    def player(self) -> Player | None:
        return self.room.players.get(self.pid)

    def live_score(self) -> int:
        s = self.sim
        if self.result:
            return self.result["score"]
        return max(0, s["night"] * 100 + sc.js_round(max(0.0, s["pop"]) / 2) - min(60, s["burnouts"]) * 25 - round(sc.smog_avg(s)))

    # --- ход времени
    def advance(self, n: int) -> None:
        s, lim = self.sim, self.room.hub.lim
        p = self.player
        self.paused = p is None or not p.connected
        if self.done or self.paused:
            return
        for _ in range(n):
            ph = s["phase"]
            if ph == "night":
                sc.step(s, sc.DT)
            elif ph in ("card", "summary"):
                s["clock"] += sc.DT
                self.phase_left -= sc.DT
            self.tick += 1
            if ph in ("card", "summary") and self.phase_left <= 0:
                self._timeout()
            self._collect()
            if s["phase"] == "ended":
                self._finish()
                return
            self._since_snap += 1
            if self._since_snap >= SNAP_EVERY:
                self.push()

    def _timeout(self) -> None:
        s, lim = self.sim, self.room.hub.lim
        if s["phase"] == "summary":
            self.log.append((self.tick, ["continue"]))
            sc.continue_summary(s)
            self._after_continue()
        elif s["phase"] == "card" and s["card"]:
            key = self.vote or s["card"]["options"][0]["key"]
            self.log.append((self.tick, ["card", key]))
            sc.choose_card(s, key)
            self.vote = None

    def _after_continue(self) -> None:
        self.vote, self.acked = None, False
        if self.sim["phase"] == "card":
            self.phase_left = self.room.hub.lim.card_timeout_s

    def _collect(self) -> None:
        s = self.sim
        for e in s["events"]:
            if e.get("type") in PUBLIC_EVENTS and len(self.pending) < 40:
                if e["type"] == "hostev":
                    e = {**e, "text": self.room.hub.host_text(e["id"], s["night"])}
                self.pending.append(e)
        s["events"].clear()
        if s["phase"] == "summary" and "summary_seen" not in s:
            s["summary_seen"] = True
            self.phase_left, self.acked = self.room.hub.lim.summary_timeout_s, False
            self.push()
        if s["phase"] == "night":
            s.pop("summary_seen", None)

    # --- команды
    def command(self, m: dict) -> str | None:
        s, t = self.sim, m.get("t")
        if self.done:
            return None
        if t == "valve":
            i = m.get("i")
            if not (isinstance(i, int) and not isinstance(i, bool)) or not 0 <= i < 4:
                return "forbidden"
            if s["phase"] != "night" or self.paused:
                return None
            if len(self.log) >= self.MAX_LOG:
                return None
            v = m.get("v")
            if not sc.set_valve(s, i, v):
                return "bad_value"
            self.log.append((self.tick, ["valve", i, float(v)]))
            return None
        if t == "shovel":
            if s["phase"] == "night" and not self.paused and len(self.log) < self.MAX_LOG:
                self.log.append((self.tick, ["shovel"]))
                sc.shovel(s)
            return None
        if t == "fix":
            if s["phase"] == "night" and not self.paused and len(self.log) < self.MAX_LOG:
                lid = m.get("id")
                self.log.append((self.tick, ["fix", lid if isinstance(lid, int) and not isinstance(lid, bool) else None]))
                sc.fix_leak(s, lid if isinstance(lid, int) and not isinstance(lid, bool) else None)
            return None
        if t == "card":
            if s["phase"] != "card" or not s["card"]:
                return None
            key = m.get("key")
            if not isinstance(key, str) or not any(o["key"] == key for o in s["card"]["options"]):
                return "bad_value"
            self.log.append((self.tick, ["card", key]))
            sc.choose_card(s, key)
            self.vote = None
            self._collect()
            self.push()
            return None
        if t == "next":
            if s["phase"] == "summary":
                self.log.append((self.tick, ["continue"]))
                sc.continue_summary(s)
                self._after_continue()
                self._collect()
                if s["phase"] == "ended":
                    self._finish()
                else:
                    self.push()
            return None
        return "unknown"

    # --- итог
    def _finish(self, dnf: bool = False) -> None:
        if self.done:
            return
        self.done, self.dnf = True, dnf
        self.result = result_of(self.sim)
        self.finish_order = self.room._next_finish()
        self.push()
        self.room._rig_done(self)

    def verify(self) -> bool:
        """Перепроверка: повтор по журналу должен дать тот же итог. При расхождении побеждает повтор (он эталонный)."""
        try:
            again = replay_rig(self.room.seed, self.log, self.tick)
        except Exception:
            log.exception("replay failed")
            return False
        keys = ("ending", "nights", "pop", "burnouts", "smog", "score")
        if self.result and all(again[k] == self.result[k] for k in keys):
            return True
        if not self.dnf:
            log.error("replay mismatch: live=%s replay=%s", self.result, again)
            self.result = again
        return False

    def push(self) -> None:
        p = self.player
        self._since_snap = 0
        if p is None or p.conn is None:
            self.pending.clear()
            return
        self.seq += 1
        p.conn.send(self.room.snap_dict(self.sim, self.seq, self.paused, {self.pid: self.vote} if self.vote else {}, [self.pid] if self.vote else [],
                                        [self.pid] if self.acked else [], self.phase_left, self.pending))
        self.pending.clear()


class Room:
    def __init__(self, hub: "Hub", code: str, mode: str, max_players: int, seed: int):
        self.hub, self.code, self.mode, self.max_players, self.seed = hub, code, mode, max_players, seed
        self.players: dict[str, Player] = {}
        self.host: str | None = None
        self.state = "lobby"
        self.sim: dict[str, Any] | None = None
        self.roles: dict[str, dict] = {}
        self.created = self.last_activity = hub.clock()
        self.votes: dict[str, str] = {}
        self.acks: set[str] = set()
        self.phase_left = 0.0
        self.paused = False
        self.seq = 0
        self._since_snap = 0
        self.pending: list[dict] = []
        self.chat_log: deque[dict] = deque(maxlen=30)
        self.result: dict | None = None
        self.last_tick_t: float | None = None
        self._acc = 0.0
        self.rigs: dict[str, Rig] = {}
        self.reviews: dict[str, dict] = {}
        self._board_acc = 0
        self._finishes = 0
        self._bot_acc = 0.0
        self._bs: dict[str, Any] = {"last": -999.0, "night": -1, "leaks": 0, "pop": None, "hi": -999.0, "coal": -999.0, "end": False}

    def versus(self) -> bool:
        return self.mode == "versus"

    def active(self) -> bool:
        return self.sim is not None or bool(self.rigs)

    def humans(self) -> list[Player]:
        return [p for p in self.players.values() if not p.bot]

    def _next_finish(self) -> int:
        self._finishes += 1
        return self._finishes

    # ------------------------------------------------------------ рассылка
    def broadcast(self, msg: dict, skip: Player | None = None) -> None:
        for p in self.players.values():
            if p is not skip and p.conn is not None and p.connected:
                p.conn.send(msg)

    def lobby_msg(self) -> dict:
        return {"t": "lobby", "code": self.code, "mode": self.mode, "state": self.state, "max": self.max_players, "host": self.host,
                "players": [{"pid": p.pid, "nick": p.nick, "ready": p.ready, "online": p.connected, "bot": p.bot,
                             "role": self.roles.get(p.pid)} for p in self.players.values()]}

    def push_lobby(self) -> None:
        self.broadcast(self.lobby_msg())

    # ------------------------------------------------------------ игроки
    def add(self, nick: str, conn: Conn) -> Player:
        p = Player(pid=secrets.token_hex(4), nick=self._unique_nick(nick), secret=secrets.token_urlsafe(18), conn=conn)
        self.players[p.pid] = p
        if self.host is None:
            self.host = p.pid
        conn.room, conn.player = self, p
        self.touch()
        return p

    def _unique_nick(self, nick: str) -> str:
        names = {p.nick for p in self.players.values()}
        if nick not in names:
            return nick
        for i in range(2, 10):
            cand = f"{nick[:13]} {i}"
            if cand not in names:
                return cand
        return nick

    def touch(self) -> None:
        self.last_activity = self.hub.clock()

    def detach(self, conn: Conn) -> None:
        p = conn.player
        if p is None or p.conn is not conn:
            return
        p.conn = None
        p.left_at = self.hub.clock()
        if self.state == "lobby":
            p.ready = False
        self._migrate_host()
        self.push_lobby()

    def _migrate_host(self) -> None:
        if self.host in self.players and self.players[self.host].connected:
            return
        for p in self.players.values():
            if p.connected and not p.bot:
                self.host = p.pid
                return

    def remove(self, pid: str, reason: str = "left") -> None:
        p = self.players.pop(pid, None)
        if not p:
            return
        if p.conn:
            p.conn.room = p.conn.player = None
            p.conn.send({"t": "left", "reason": reason})
        self.votes.pop(pid, None)
        self.acks.discard(pid)
        if p.bot is False and not self.humans():           # остались только боты — комната закрывается
            self.players.clear()
            return
        if self.versus() and pid in self.rigs:
            rg = self.rigs[pid]
            if not rg.done:
                rg._finish(dnf=True)
        if self.host == pid:
            self.host = None
            self._migrate_host()
            if self.host is None and self.players:
                self.host = next((p.pid for p in self.players.values() if not p.bot), None)
        if self.state == "playing" and self.players and not self.versus():
            self.roles = self._merge_orphans(pid)
        self.push_lobby()
        if self.state == "playing" and not self.versus():
            self._check_phase_progress()
            self._push_snapshot(force=True)

    def _merge_orphans(self, gone: str) -> dict[str, dict]:
        """Элементы управления ушедшего игрока переходят к оставшимся: лопата/утечки — онлайн-игроку с наименьшей нагрузкой."""
        old = self.roles.pop(gone, None) or {"valves": [], "shovel": False, "leaks": False}
        if not self.players:
            return self.roles
        online = [p for p in self.players.values() if p.connected] or list(self.players.values())
        heir = min(online, key=lambda p: len(self.roles[p.pid]["valves"]) + 2 * self.roles[p.pid]["shovel"] + self.roles[p.pid]["leaks"])
        r = self.roles[heir.pid]
        r["valves"] = sorted(set(r["valves"]) | set(old["valves"]))
        r["shovel"] = r["shovel"] or old["shovel"]
        r["leaks"] = r["leaks"] or old["leaks"]
        return self.roles

    # ------------------------------------------------------------ игра
    def start(self) -> None:
        pids = list(self.players)
        self.rigs, self._finishes, self._board_acc = {}, 0, 0
        self._bs = {"last": -999.0, "night": -1, "leaks": 0, "pop": None, "hi": -999.0, "coal": -999.0, "end": False}
        if self.versus():
            self.sim = None
            self.roles = {p: dict(valves=[0, 1, 2, 3], shovel=True, leaks=True) for p in pids}
            self.rigs = {p.pid: Rig(self, p) for p in self.players.values()}
        else:
            self.sim = sc.create_state(self.seed, host=True)
            self.roles = assign_roles(pids)
        self.state, self.paused = "playing", False
        self.votes.clear(); self.acks.clear(); self.pending.clear()
        self.last_tick_t, self._acc, self.seq, self._since_snap = None, 0.0, 0, 0
        self.touch()
        for p in self.players.values():
            p.ready = p.bot
        self.broadcast({"t": "start", "seed": self.seed, "roles": self.roles, "mode": self.mode})
        self.push_lobby()
        if self.versus():
            for rg in self.rigs.values():
                rg.push()
            self.push_board()
        else:
            self._push_snapshot(force=True)

    def _paused_now(self) -> bool:
        return any(not p.connected for p in self.players.values()) or not any(p.connected for p in self.players.values())

    def advance(self, n: int = 1) -> None:
        """n тиков по 1/60 с (сервер вызывает по реальному времени, тесты — вручную)."""
        if self.state == "playing" and self.versus():
            return self._advance_versus(n)
        if self.state != "playing" or self.sim is None:
            return
        s = self.sim
        self.paused = self._paused_now()
        if self.paused:
            return
        self._bots_think(n)
        for _ in range(n):
            if s["phase"] == "night":
                sc.step(s, sc.DT)
            elif s["phase"] in ("card", "summary"):
                s["clock"] += sc.DT
                self.phase_left -= sc.DT
                if self.phase_left <= 0:
                    self._phase_timeout()
            self._collect_events()
            if s["phase"] == "ended":
                break
            self._since_snap += 1
            if self._since_snap >= SNAP_EVERY:
                self._push_snapshot()
        if s["phase"] == "ended":
            self._finish_game()

    def _collect_events(self) -> None:
        s = self.sim
        if s["events"]:
            for e in s["events"]:
                if e.get("type") in PUBLIC_EVENTS and len(self.pending) < 60:
                    if e["type"] == "hostev":
                        e = {**e, "text": self.hub.host_text(e["id"], s["night"])}
                    self.pending.append(e)
            s["events"].clear()
        if s["phase"] == "summary" and "summary_seen" not in s:
            s["summary_seen"] = True
            self.phase_left, self.acks = self.hub.lim.summary_timeout_s, set()
            self._push_snapshot(force=True)
        if s["phase"] == "night":
            s.pop("summary_seen", None)

    def _phase_timeout(self) -> None:
        s = self.sim
        if s["phase"] == "summary":
            sc.continue_summary(s)
            self._after_continue()
        elif s["phase"] == "card":
            self._resolve_vote()

    def _post(self) -> None:
        """После смены фазы вне advance(): собрать события, завершить игру или разослать снимок."""
        self._collect_events()
        if self.sim["phase"] == "ended":
            self._finish_game()
        else:
            self._push_snapshot(force=True)

    def _after_continue(self) -> None:
        s = self.sim
        self.votes.clear(); self.acks.clear()
        if s["phase"] == "card":
            self.phase_left = self.hub.lim.card_timeout_s
        self._post()

    def _resolve_vote(self) -> None:
        s = self.sim
        card = s["card"]
        if not card:
            return
        tally = Counter(self.votes.values())
        keys = [o["key"] for o in card["options"]]
        best = max(keys, key=lambda k: (tally.get(k, 0), -keys.index(k)))     # ничья → первый вариант
        sc.choose_card(s, best)
        self.votes.clear()
        self._post()

    def _check_phase_progress(self) -> None:
        s = self.sim
        online = [p.pid for p in self.players.values() if p.connected] or list(self.players)
        if not online or s is None:
            return
        if s["phase"] == "card" and all(p in self.votes for p in online):
            self._resolve_vote()
        elif s["phase"] == "summary" and all(p in self.acks for p in online):
            sc.continue_summary(s)
            self._after_continue()

    def _finish_game(self) -> None:
        s = self.sim
        if self.state == "ended":
            return
        self._push_snapshot(force=True)
        nights = sc.nights_done(s)
        pop, burn, smog = max(0, min(1000, round(s["pop"]))), min(60, s["burnouts"]), max(0, min(100, round(sc.smog_avg(s))))
        self.result = {"ending": s["ending"], "nights": nights, "pop": pop, "burnouts": burn, "smog": smog,
                       "score": score_js(nights, pop, s["ending"], burn, smog), "players": [p.nick for p in self.players.values()]}
        self.state = "ended"
        self.touch()
        self.result.update({"mode": self.mode, "seed": self.seed})
        self.broadcast({"t": "end", "result": self.result})
        self.push_lobby()
        self._bot_final()
        self.hub.request_review(self, None, {"nights": nights, "pop": pop, "burnouts": burn, "smog": smog, "leaksFixed": s["leaksFixed"], "shovels": s["shovels"],
                                              "ending": s["ending"], "players": len(self.humans()) or 1, "mode": "coop"})

    def back_to_lobby(self) -> None:
        self.state, self.sim, self.roles, self.result, self.rigs, self.reviews = "lobby", None, {}, None, {}, {}
        self.seed = secrets.randbits(32) or 1
        for p in self.players.values():
            p.ready = p.bot
        self.touch()
        self.push_lobby()

    # ------------------------------------------------------------ снимки
    def snapshot(self, pid: str | None = None) -> dict:
        if self.versus() and pid in self.rigs:
            rg = self.rigs[pid]
            return self.snap_dict(rg.sim, rg.seq, rg.paused, {pid: rg.vote} if rg.vote else {}, [pid] if rg.vote else [], [pid] if rg.acked else [], rg.phase_left, [])
        return self.snap_dict(self.sim, self.seq, self.paused, dict(Counter(self.votes.values())), list(self.votes), list(self.acks), self.phase_left, self.pending[:])

    def snap_dict(self, s: dict, seq: int, paused: bool, votes: dict, voted: list, acks: list, phase_left: float, ev: list) -> dict:
        card = s["card"]
        if votes and all(isinstance(v, str) for v in votes.values()):
            votes = dict(Counter(votes.values()))
        return {"t": "snap", "seq": seq, "paused": paused,
                "s": {"phase": s["phase"], "night": s["night"], "t": _r(s["t"], 2), "P": _r(s["P"], 2), "fire": _r(s["fire"], 2), "coal": _r(s["coal"], 2),
                      "smog": _r(s["smog"], 2), "pop": _r(s["pop"], 2), "fw": _r(s["fw"], 2), "danger": _r(s["danger"], 2), "burnT": _r(s["burnT"], 2),
                      "shovelCd": _r(s["shovelCd"], 2), "venting": s["venting"], "shake": _r(s["shake"], 2),
                      "valves": [_r(v, 3) for v in s["valves"]], "sat": [_r(v, 3) for v in s["sat"]], "flow": [_r(v, 2) for v in s["flow"]],
                      "needNow": [_r(v, 2) for v in s["needNow"]], "leaks": [{"id": l["id"], "pipe": l["pipe"], "age": _r(l["age"], 1)} for l in s["leaks"]],
                      "flags": s["flags"], "ending": s["ending"], "summary": s["summary"] if s["phase"] == "summary" else None,
                      "card": card["id"] if card else None, "burnouts": s["burnouts"], "exhaustSec": _r(s["exhaustSec"], 1),
                      "smogSum": _r(s["smogSum"], 1), "smogTime": _r(s["smogTime"], 1), "timkaShovels": s["timkaShovels"], "leaksFixed": s["leaksFixed"],
                      "coalMade": _r(s["coalMade"], 1), "nightStartPop": _r(s["nightStartPop"], 1)},
                "votes": dict(votes), "voted": list(voted), "acks": list(acks), "left": math.ceil(max(0.0, phase_left)),
                "ev": ev}

    def _push_snapshot(self, force: bool = False) -> None:
        if self.sim is None:
            return
        self.seq += 1
        self._since_snap = 0
        self.broadcast(self.snapshot())
        self.pending.clear()

    # ------------------------------------------------------------ команды игрока
    def command(self, p: Player, m: dict) -> str | None:
        """Возвращает код ошибки или None."""
        if self.state != "playing" or (self.sim is None and not self.rigs):
            return "not_playing"
        if self.versus():
            rg = self.rigs.get(p.pid)
            self.touch()
            return rg.command(m) if rg else "forbidden"
        s, r, t = self.sim, self.roles.get(p.pid), m.get("t")
        if r is None:
            return "forbidden"
        self.touch()
        if t == "valve":
            i = m.get("i")
            if not (isinstance(i, int) and not isinstance(i, bool)) or i not in r["valves"]:
                return "forbidden"
            if s["phase"] != "night" or self.paused:
                return None
            return None if sc.set_valve(s, i, m.get("v")) else "bad_value"
        if t == "shovel":
            if not r["shovel"]:
                return "forbidden"
            if s["phase"] == "night" and not self.paused:
                sc.shovel(s)
            return None
        if t == "fix":
            if not r["leaks"]:
                return "forbidden"
            if s["phase"] == "night" and not self.paused:
                sc.fix_leak(s, m.get("id"))
            return None
        if t == "card":
            if s["phase"] != "card" or not s["card"]:
                return None
            key = m.get("key")
            if not isinstance(key, str) or not any(o["key"] == key for o in s["card"]["options"]):
                return "bad_value"
            self.votes[p.pid] = key
            self._check_phase_progress()
            if self.sim["phase"] == "card":
                self._push_snapshot(force=True)
            return None
        if t == "next":
            if s["phase"] == "summary":
                self.acks.add(p.pid)
                self._check_phase_progress()
                if self.sim["phase"] == "summary":
                    self._push_snapshot(force=True)
            return None
        return "unknown"

    # ------------------------------------------------------------ соревнование
    def _advance_versus(self, n: int) -> None:
        for rg in list(self.rigs.values()):
            if self.state != "playing":
                break
            rg.advance(n)
        if self.state == "playing":
            self._board_acc += n
            if self._board_acc >= self.hub.lim.board_every_ticks:
                self._board_acc = 0
                self.push_board()

    def board_rows(self) -> list[dict]:
        rows = []
        for pid, rg in self.rigs.items():
            p = self.players.get(pid)
            s = rg.sim
            state = "dnf" if rg.dnf else "done" if rg.done else "offline" if (p is None or not p.connected) else "playing"
            rows.append({"pid": pid, "nick": rg.nick, "night": min(10, s["night"] + 1), "pop": max(0, min(1000, round(s["pop"]))), "score": rg.live_score(),
                         "state": state, "ending": rg.result["ending"] if rg.result else None, "o": rg.finish_order})
        rows.sort(key=lambda r: (-r["score"], r["o"] or 99))
        return rows

    def push_board(self) -> None:
        self.broadcast({"t": "board", "rows": self.board_rows()})

    def _rig_done(self, rg: Rig) -> None:
        self.push_board()
        if all(r.done for r in self.rigs.values()):
            self._finish_versus()

    def _finish_versus(self) -> None:
        if self.state == "ended":
            return
        entries = []
        for pid, rg in self.rigs.items():
            ok = rg.verify()
            r = rg.result or result_of(rg.sim)
            entries.append({"pid": pid, "nick": rg.nick, **{k: r[k] for k in ("score", "nights", "pop", "ending", "burnouts", "smog")}, "dnf": rg.dnf, "verified": ok or rg.dnf, "o": rg.finish_order})
        entries.sort(key=lambda e: (e["dnf"], -e["score"], -e["nights"], -e["pop"], e["o"]))
        for i, e in enumerate(entries):
            e["place"] = i + 1
            e.pop("o", None)
        self.result = {"mode": "versus", "seed": self.seed, "places": entries, "players": [e["nick"] for e in entries]}
        self.state = "ended"
        self.touch()
        self.broadcast({"t": "end", "result": self.result})
        self.push_lobby()
        for pid, rg in self.rigs.items():
            r = rg.result or result_of(rg.sim)
            self.hub.request_review(self, pid, {"nights": r["nights"], "pop": r["pop"], "burnouts": r["burnouts"], "smog": r["smog"], "leaksFixed": r.get("leaksFixed", 0),
                                                "shovels": r.get("shovels", 0), "ending": r["ending"] or "silence", "players": len(self.rigs), "mode": "versus"})

    # ------------------------------------------------------------ ИИ-напарник
    def add_bot(self) -> Player | None:
        if self.mode != "coop" or self.state != "lobby" or len(self.players) >= self.max_players or any(p.bot for p in self.players.values()):
            return None
        p = Player(pid="bot" + secrets.token_hex(2), nick=COMPANION_NICK, secret="", conn=None, ready=True, bot=True)
        self.players[p.pid] = p
        self.touch()
        self.push_lobby()
        return p

    def remove_bot(self) -> bool:
        b = next((p for p in self.players.values() if p.bot), None)
        if not b or self.state != "lobby":
            return False
        self.players.pop(b.pid, None)
        self.touch()
        self.push_lobby()
        return True

    def _bots_think(self, n: int) -> None:
        bots = [p for p in self.players.values() if p.bot]
        if not bots or self.sim is None:
            return
        self._bot_acc += n * sc.DT
        if self._bot_acc < botcore.REACT:
            return
        self._bot_acc = 0.0
        s, lim = self.sim, self.hub.lim
        for b in bots:
            role = self.roles.get(b.pid, {})
            if s["phase"] == "night":
                for c in botcore.decide(s, role):
                    if c[0] == "valve":
                        sc.set_valve(s, c[1], c[2])
                    elif c[0] == "shovel":
                        sc.shovel(s)
                    elif c[0] == "fix":
                        sc.fix_leak(s, None)
            elif s["phase"] == "card" and b.pid not in self.votes and lim.card_timeout_s - self.phase_left > 2.0:
                key = botcore.card_choice(s)
                if key:
                    self.votes[b.pid] = key
                    self._check_phase_progress()
            elif s["phase"] == "summary" and b.pid not in self.acks and lim.summary_timeout_s - self.phase_left > 3.0:
                self.acks.add(b.pid)
                self._check_phase_progress()
            if self.sim is not None and self.sim["phase"] in ("night",):
                self._bot_chat(b)

    def _bot_chat(self, b: Player) -> None:
        s, st = self.sim, self._bs
        clock = s["clock"]
        sit = None
        if st["night"] != s["night"] and s["t"] < 3:
            st["night"], st["leaks"], st["pop"] = s["night"], 0, s["pop"]
            sit = "night_start"
        elif len(s["leaks"]) > st["leaks"]:
            sit = "leak"
        elif s["P"] > 90 and clock - st["hi"] > 40:
            sit, st["hi"] = "pressure_high", clock
        elif s["coal"] < 6 and clock - st["coal"] > 60:
            sit, st["coal"] = "coal_low", clock
        elif st["pop"] is not None and st["pop"] - s["pop"] > 25:
            sit, st["pop"] = "pop_loss", s["pop"]
        st["leaks"] = len(s["leaks"])
        if sit and clock - st["last"] >= self.hub.lim.bot_chat_gap_s:
            self._bot_say(b, sit)

    def _bot_say(self, b: Player, sit: str) -> None:
        text = self.hub.companion_line(sit, (self.sim or {}).get("night", 0) + 1)
        if not text:
            return
        self._bs["last"] = self.sim["clock"] if self.sim else 0.0
        msg = {"t": "chat", "pid": b.pid, "nick": b.nick, "text": text}
        self.chat_log.append(msg)
        self.broadcast(msg)

    def _bot_final(self) -> None:
        b = next((p for p in self.players.values() if p.bot), None)
        if b and not self._bs["end"]:
            self._bs["end"] = True
            win = self.result and self.result.get("ending") in ("light", "smoke", "iron")
            self._bot_say(b, "win" if win else "lose")

    # ------------------------------------------------------------ обслуживание (раз в секунду)
    def housekeeping(self, now: float) -> bool:
        """True — комнату пора закрыть."""
        lim = self.hub.lim
        if now - self.created > lim.room_max_age_s:
            return True
        grace = lim.grace_play_s if self.state == "playing" else lim.grace_lobby_s
        for p in list(self.players.values()):
            if not p.connected and p.left_at is not None and now - p.left_at > grace:
                self.remove(p.pid, "timeout")
        if not self.players:
            return True
        idle = now - self.last_activity
        if self.state == "lobby" and idle > lim.lobby_idle_s:
            return True
        if self.state == "ended" and idle > lim.ended_idle_s:
            return True
        if self.state == "playing" and not any(p.connected for p in self.players.values()) and idle > grace + 5:
            return True
        return False


class Hub:
    def __init__(self, clock: Callable[[], float] = time.time, limits: Limits | None = None, rng: Callable[[], int] | None = None):
        self.clock, self.lim = clock, limits or Limits.from_env()
        self.ai: Any = None                      # GameAi (ведущий, напарник, разбор) — задаётся в main.py; None — только запасные тексты
        self.bg: Callable[[Callable[[], Any], Callable[[Any], None]], None] | None = None   # запуск блокирующей работы вне event loop
        self.rooms: dict[str, Room] = {}
        self.ip_conns: Counter[str] = Counter()
        self.create_log: dict[str, deque] = {}
        self._rng = rng or (lambda: secrets.randbits(32) or 1)
        self.stats = {"rooms_created": 0, "games": 0, "msgs": 0, "rejected": 0}

    # ------------------------------------------------------------ ИИ-хуки (всегда безопасны: сбой ИИ → запасной текст)
    def host_text(self, ev_id: str, night: int) -> str:
        try:
            if self.ai is not None:
                return self.ai.host_text(ev_id, night)
        except Exception:
            log.exception("host_text")
        return HOST_TEXT.get(ev_id, "В городе что-то случилось.")

    def companion_line(self, situation: str, night: int) -> str | None:
        try:
            if self.ai is not None:
                return self.ai.companion_line(situation, night)
        except Exception:
            log.exception("companion_line")
        return COMPANION_FALLBACK.get(situation, COMPANION_FALLBACK["calm"])[0]

    def run_bg(self, fn: Callable[[], Any], cb: Callable[[Any], None]) -> None:
        if self.bg is not None:
            self.bg(fn, cb)
        else:
            cb(fn())

    def request_review(self, room: "Room", pid: str | None, agg: dict) -> None:
        """Разбор партии (3–4 предложения) по агрегатам без ников: ИИ в фоне, иначе запасной текст по правилам."""
        ai = self.ai
        a = clean_agg(agg)
        if ai is None or a is None or not ai.enabled("review"):
            return
        def done(res: Any) -> None:
            try:
                text, src = res
            except (TypeError, ValueError):
                return
            msg = {"t": "review", "text": text, "src": src}
            room.reviews[pid or "*"] = msg
            if room.state != "ended":
                return
            if pid is None:
                room.broadcast(msg)
            else:
                p = room.players.get(pid)
                if p and p.conn:
                    p.conn.send(msg)
        self.run_bg(lambda: ai.review(a), done)

    # ------------------------------------------------------------ соединения
    def connect(self, ip: str, on_wake: Callable[[], None] | None = None) -> Conn | None:
        if self.ip_conns[ip] >= self.lim.conns_per_ip:
            self.stats["rejected"] += 1
            return None
        self.ip_conns[ip] += 1
        c = Conn(ip, self.clock, self.lim)
        c.on_wake = on_wake
        return c

    def disconnect(self, conn: Conn) -> None:
        if not conn.counted:
            return
        conn.counted = False
        self.ip_conns[conn.ip] -= 1
        if self.ip_conns[conn.ip] <= 0:
            self.ip_conns.pop(conn.ip, None)
        if conn.room:
            conn.room.detach(conn)
        conn.close()

    # ------------------------------------------------------------ сообщения
    def _err(self, conn: Conn, code: str, strike: bool = True) -> None:
        conn.send({"t": "err", "code": code})
        if strike:
            conn.strikes += 1
            if conn.strikes > self.lim.max_strikes:
                conn.close(1008, "too many errors")

    def handle(self, conn: Conn, text: Any) -> None:
        if conn.closed:
            return
        self.stats["msgs"] += 1
        if not isinstance(text, str) or len(text.encode("utf-8", "ignore")) > self.lim.max_msg_bytes:
            conn.close(1009, "message too big")
            return
        if not conn.allow():
            self._err(conn, "rate_limit")
            return
        try:
            m = json.loads(text)
        except ValueError:
            return self._err(conn, "bad_json")
        if not isinstance(m, dict) or not isinstance(m.get("t"), str):
            return self._err(conn, "bad_message")
        t = m["t"]
        if t == "ping":
            conn.send({"t": "pong"})
            return
        if conn.room is None:
            if t == "create":
                return self._create(conn, m)
            if t == "join":
                return self._join(conn, m)
            if t == "rejoin":
                return self._rejoin(conn, m)
            return self._err(conn, "no_room")
        room, me = conn.room, conn.player
        assert me is not None
        if t == "leave":
            room.remove(me.pid, "left")
            if not room.players:
                self.rooms.pop(room.code, None)
        elif t == "ready":
            if room.state == "lobby":
                me.ready = bool(m.get("ready", True))
                room.touch(); room.push_lobby()
        elif t == "start":
            self._start(conn, room, me)
        elif t == "again":
            if room.state == "ended" and room.host == me.pid:
                room.back_to_lobby()
        elif t == "addbot":
            if room.host == me.pid and room.add_bot() is None:
                self._err(conn, "bad_state", strike=False)
        elif t == "rmbot":
            if room.host == me.pid:
                room.remove_bot()
        elif t == "kick":
            pid = m.get("pid")
            if room.host == me.pid and isinstance(pid, str) and pid in room.players and pid != me.pid and room.state == "lobby":
                room.remove(pid, "kicked")
        elif t == "chat":
            self._chat(conn, room, me, m)
        elif t == "emo":
            self._emo(conn, room, me, m)
        elif t in ("valve", "shovel", "fix", "card", "next"):
            err = room.command(me, m)
            if err:
                self._err(conn, err, strike=err in ("bad_value", "unknown"))
        else:
            self._err(conn, "unknown")

    # ------------------------------------------------------------ комнаты
    def _new_code(self) -> str:
        for _ in range(50):
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LEN))
            if code not in self.rooms:
                return code
        raise RuntimeError("no free code")

    def _create(self, conn: Conn, m: dict) -> None:
        now = self.clock()
        q = self.create_log.setdefault(conn.ip, deque())
        while q and now - q[0] > self.lim.create_window_s:
            q.popleft()
        if len(q) >= self.lim.creates_per_window:
            return self._err(conn, "create_limit")
        if len(self.rooms) >= self.lim.max_rooms:
            return self._err(conn, "server_full", strike=False)
        mode = m.get("mode", "coop")
        mx = m.get("max", 2)
        if mode not in MODES or not (isinstance(mx, int) and not isinstance(mx, bool) and 2 <= mx <= 4):
            return self._err(conn, "bad_value")
        q.append(now)
        if len(self.create_log) > 5000:
            for k in [k for k, v in self.create_log.items() if not v or now - v[-1] > self.lim.create_window_s][:2000]:
                self.create_log.pop(k, None)
        room = Room(self, self._new_code(), mode, mx, self._rng())
        self.rooms[room.code] = room
        self.stats["rooms_created"] += 1
        p = room.add(clean_nick(m.get("nick")), conn)
        self._joined(conn, room, p)

    def _join(self, conn: Conn, m: dict) -> None:
        code = m.get("code")
        room = self.rooms.get(code.strip().upper()) if isinstance(code, str) and len(code) <= 12 else None
        if room is None:
            return self._err(conn, "no_such_room")
        if room.state != "lobby":
            return self._err(conn, "already_started", strike=False)
        if len(room.players) >= room.max_players:
            return self._err(conn, "room_full", strike=False)
        p = room.add(clean_nick(m.get("nick")), conn)
        self._joined(conn, room, p)

    def _rejoin(self, conn: Conn, m: dict) -> None:
        code, pid, sec = m.get("code"), m.get("pid"), m.get("secret")
        room = self.rooms.get(code.strip().upper()) if isinstance(code, str) and len(code) <= 12 else None
        p = room.players.get(pid) if room and isinstance(pid, str) else None
        if p is None or not isinstance(sec, str) or not hmac.compare_digest(sec.encode(), p.secret.encode()):
            return self._err(conn, "no_such_room")
        if p.conn is not None and not p.conn.closed:
            old = p.conn
            old.room = old.player = None
            old.send({"t": "left", "reason": "replaced"})
            old.close(4000, "replaced")
        p.conn, p.left_at = conn, None
        conn.room, conn.player = room, p
        room.touch()
        room._migrate_host()
        self._joined(conn, room, p)
        if room.state in ("playing", "ended") and room.active():
            conn.send({"t": "start", "seed": room.seed, "roles": room.roles, "mode": room.mode})
            conn.send(room.snapshot(p.pid))
            if room.versus():
                conn.send({"t": "board", "rows": room.board_rows()})
            if room.result:
                conn.send({"t": "end", "result": room.result})
                for k in ("*", p.pid):
                    if k in room.reviews:
                        conn.send(room.reviews[k])

    def _joined(self, conn: Conn, room: Room, p: Player) -> None:
        conn.send({"t": "joined", "code": room.code, "pid": p.pid, "secret": p.secret, "nick": p.nick, "chat": list(room.chat_log)})
        room.push_lobby()

    def _start(self, conn: Conn, room: Room, me: Player) -> None:
        if room.host != me.pid:
            return self._err(conn, "not_host")
        if room.state != "lobby":
            return self._err(conn, "bad_state", strike=False)
        online = [p for p in room.players.values() if p.connected]
        if len(online) < 2 or len(online) != len(room.players):
            return self._err(conn, "need_players", strike=False)
        if not all(p.ready or p.pid == room.host for p in online):
            return self._err(conn, "not_ready", strike=False)
        self.stats["games"] += 1
        room.start()

    def _chat(self, conn: Conn, room: Room, me: Player, m: dict) -> None:
        now = self.clock()
        if now - me.last_chat < self.lim.chat_gap_s:
            return self._err(conn, "chat_rate", strike=False)
        text = clean_chat(m.get("text"))
        if text is None:
            return self._err(conn, "bad_chat", strike=False)
        me.last_chat = now
        room.touch()
        msg = {"t": "chat", "pid": me.pid, "nick": me.nick, "text": text}
        room.chat_log.append(msg)
        room.broadcast(msg)

    def _emo(self, conn: Conn, room: Room, me: Player, m: dict) -> None:
        now = self.clock()
        e = m.get("e")
        if e not in EMOJI:
            return self._err(conn, "bad_value")
        if now - me.last_emo < self.lim.emo_gap_s:
            return
        me.last_emo = now
        room.broadcast({"t": "emo", "pid": me.pid, "nick": me.nick, "e": e})

    # ------------------------------------------------------------ часы
    def tick(self, now: float | None = None) -> None:
        """Вызывается циклом ~каждые 16 мс: переводит игровые часы комнат на реальное время (не более 6 тиков за раз)."""
        now = self.clock() if now is None else now
        for room in list(self.rooms.values()):
            if room.state != "playing":
                continue
            if room.last_tick_t is None:
                room.last_tick_t = now
            room._acc += min(0.1, max(0.0, now - room.last_tick_t))
            room.last_tick_t = now
            n = int(room._acc / sc.DT)
            if n:
                room._acc -= n * sc.DT
                try:
                    room.advance(min(n, 6))
                except Exception:                        # сбой в одной комнате не должен останавливать остальные
                    log.exception("room %s: tick failed", room.code)
                    room.state = "ended"; room.broadcast({"t": "left", "reason": "room_closed"}); room.players.clear()

    def housekeeping(self, now: float | None = None) -> None:
        now = self.clock() if now is None else now
        for code, room in list(self.rooms.items()):
            try:
                close = room.housekeeping(now)
            except Exception:
                log.exception("room %s: housekeeping failed", code)
                close = True
            if close:
                for p in list(room.players.values()):
                    if p.conn:
                        p.conn.send({"t": "left", "reason": "room_closed"})
                        p.conn.room = p.conn.player = None
                self.rooms.pop(code, None)
        for c in {pl.conn for r in self.rooms.values() for pl in r.players.values() if pl.conn}:
            if c and not c.closed and now - c.last_ping > self.lim.ping_every_s:
                c.last_ping = now
                c.send({"t": "ping"})
