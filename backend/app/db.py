"""SQLite: сессии (анонимная телеметрия), события, результаты рейтинга. IP — только суточный HMAC, id игрока — HMAC."""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from contextlib import contextmanager
from typing import Any, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
  rid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  platform TEXT, screen_w INTEGER, screen_h INTEGER, touch INTEGER DEFAULT 0, ua TEXT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'playing',          -- playing | ended
  nights_done INTEGER NOT NULL DEFAULT 0,          -- сколько ночей пройдено (максимум)
  ending TEXT, score INTEGER, pop INTEGER, burnouts INTEGER, smog INTEGER,
  duration_s REAL NOT NULL DEFAULT 0,
  valves TEXT, moves INTEGER,                      -- средняя открытость 4 вентилей (JSON) и число движений
  n_events INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_sessions_created ON sessions(created_at);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, rid TEXT NOT NULL, ts INTEGER NOT NULL, type TEXT NOT NULL, data TEXT
);
CREATE INDEX IF NOT EXISTS ix_events_rid ON events(rid);
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT, rid TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL, nick TEXT NOT NULL, score INTEGER NOT NULL, nights INTEGER NOT NULL, pop INTEGER NOT NULL,
  ending TEXT NOT NULL, duration_s REAL NOT NULL, burnouts INTEGER NOT NULL, smog INTEGER NOT NULL,
  pid_hash TEXT NOT NULL, ip_hash TEXT, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_scores_score ON scores(hidden, score DESC);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS daily_scores (
  day TEXT NOT NULL, pid_hash TEXT NOT NULL, nick TEXT NOT NULL, score INTEGER NOT NULL, nights INTEGER NOT NULL, pop INTEGER NOT NULL,
  ending TEXT NOT NULL, burnouts INTEGER NOT NULL, smog INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, tries INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, pid_hash)
);
CREATE INDEX IF NOT EXISTS ix_daily_day_score ON daily_scores(day, hidden, score DESC);
CREATE TABLE IF NOT EXISTS revoked_sessions (sid TEXT PRIMARY KEY, exp INTEGER NOT NULL);
"""

SESSION_SORT = {"created_at", "updated_at", "duration_s", "nights_done", "score", "platform", "ending"}


class DB:
    def __init__(self, path: str):
        self.path = path
        self._lock = threading.RLock()
        self._c = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._c.row_factory = sqlite3.Row
        self._c.execute("PRAGMA journal_mode=WAL")
        self._c.execute("PRAGMA synchronous=NORMAL")
        self._c.execute("PRAGMA busy_timeout=5000")
        self._c.executescript(SCHEMA)

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self._c.execute("BEGIN IMMEDIATE")
            try:
                yield self._c
                self._c.execute("COMMIT")
            except BaseException:
                self._c.execute("ROLLBACK")
                raise

    def q(self, sql: str, args: tuple = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(r) for r in self._c.execute(sql, args).fetchall()]

    def one(self, sql: str, args: tuple = ()) -> dict[str, Any] | None:
        r = self.q(sql, args)
        return r[0] if r else None

    # ---------------- телеметрия ----------------
    def record_event(self, rid: str, etype: str, data: dict[str, Any], meta: dict[str, Any], ip_hash: str, max_events: int) -> bool:
        """Сохраняет событие и обновляет сводку сессии. False — лимит событий на сессию исчерпан."""
        now = int(time.time())
        with self.tx() as c:
            row = c.execute("SELECT n_events, status FROM sessions WHERE rid=?", (rid,)).fetchone()
            if row is None:
                c.execute("INSERT INTO sessions(rid, created_at, updated_at, ip_hash) VALUES(?,?,?,?)", (rid, now, now, ip_hash))
                n = 0
            else:
                n = row["n_events"]
            if n >= max_events:
                return False
            c.execute("INSERT INTO events(rid, ts, type, data) VALUES(?,?,?,?)", (rid, now, etype, json.dumps(data, ensure_ascii=False, separators=(",", ":"))))
            sets, args = ["updated_at=?", "n_events=n_events+1"], [now]
            if etype == "start":
                for k, col in (("platform", "platform"), ("sw", "screen_w"), ("sh", "screen_h"), ("touch", "touch"), ("ua", "ua")):
                    if k in meta:
                        sets.append(f"{col}=?"); args.append(meta[k])
            elif etype == "night_end":
                if data.get("ok"):
                    sets.append("nights_done=MAX(nights_done, ?)"); args.append(data["night"] + 1)
                for k, col in (("dur_s", "duration_s"), ("pop", "pop"), ("burnouts", "burnouts"), ("smog", "smog")):
                    sets.append(f"{col}=?"); args.append(data[k])
                if "valves" in data:
                    sets.append("valves=?"); args.append(json.dumps(data["valves"])); sets.append("moves=?"); args.append(data.get("moves", 0))
            elif etype == "ending":
                sets += ["status='ended'", "ending=?", "score=?", "pop=?", "burnouts=?", "smog=?", "duration_s=?", "nights_done=MAX(nights_done, ?)"]
                args += [data["ending"], data["score"], data["pop"], data["burnouts"], data["smog"], data["dur_s"], data["nights"]]
                if "valves" in data:
                    sets += ["valves=?", "moves=?"]; args += [json.dumps(data["valves"]), data.get("moves", 0)]
            args.append(rid)
            c.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE rid=?", args)
        return True

    # ---------------- рейтинг ----------------
    def add_score(self, rid: str, r: dict[str, Any], nick: str, pid_hash: str, ip_hash: str) -> int | None:
        now = int(time.time())
        with self.tx() as c:
            if c.execute("SELECT 1 FROM scores WHERE rid=?", (rid,)).fetchone():
                return None
            cur = c.execute(
                "INSERT INTO scores(rid, created_at, nick, score, nights, pop, ending, duration_s, burnouts, smog, pid_hash, ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (rid, now, nick, r["score"], r["nights"], r["pop"], r["ending"], r["duration_s"], r["burnouts"], r["smog"], pid_hash, ip_hash))
            return int(cur.lastrowid)

    ORDER = {"score": "score DESC, created_at ASC", "survival": "nights DESC, pop DESC, score DESC, created_at ASC"}

    def leaderboard(self, board: str, limit: int = 20) -> list[dict[str, Any]]:
        order = self.ORDER[board]
        # лучшая запись каждого игрока (pid_hash), скрытые не учитываются
        rows = self.q(
            f"""SELECT id, nick, score, nights, pop, ending, created_at FROM scores s WHERE hidden=0 AND id = (
                  SELECT id FROM scores t WHERE t.pid_hash=s.pid_hash AND t.hidden=0 ORDER BY {order.replace('created_at', 't.created_at')} LIMIT 1)
                ORDER BY {order} LIMIT ?""", (limit,))
        return rows

    def rank_of(self, score_id: int, board: str) -> int | None:
        row = self.one("SELECT * FROM scores WHERE id=? AND hidden=0", (score_id,))
        if not row:
            return None
        if board == "score":
            cond, args = "(score > ? OR (score = ? AND created_at < ?))", (row["score"], row["score"], row["created_at"])
        else:
            cond = "(nights > ? OR (nights = ? AND (pop > ? OR (pop = ? AND score > ?))))"
            args = (row["nights"], row["nights"], row["pop"], row["pop"], row["score"])
        better = self.one(f"SELECT COUNT(DISTINCT pid_hash) AS n FROM scores WHERE hidden=0 AND pid_hash != ? AND {cond}", (row["pid_hash"],) + args)
        return (better["n"] if better else 0) + 1

    def claim_ticket(self, rid: str) -> bool:
        """Один билет — один зачёт в испытании дня (повторная отправка того же результата отклоняется)."""
        with self.tx() as c:
            c.execute("CREATE TABLE IF NOT EXISTS used_tickets (rid TEXT PRIMARY KEY, ts INTEGER NOT NULL)")
            if c.execute("SELECT 1 FROM used_tickets WHERE rid=?", (rid,)).fetchone() or c.execute("SELECT 1 FROM scores WHERE rid=?", (rid,)).fetchone():
                return False
            c.execute("INSERT INTO used_tickets(rid, ts) VALUES(?,?)", (rid, int(time.time())))
            return True

    # ---------------- сезон (календарный месяц UTC): лучшая запись каждого игрока ----------------
    def season_board(self, start: int, end: int, limit: int = 20) -> list[dict[str, Any]]:
        return self.q(
            """SELECT id, nick, score, nights, pop, ending, created_at FROM scores s WHERE hidden=0 AND created_at>=? AND created_at<? AND id = (
                 SELECT id FROM scores t WHERE t.pid_hash=s.pid_hash AND t.hidden=0 AND t.created_at>=? AND t.created_at<? ORDER BY t.score DESC, t.created_at ASC LIMIT 1)
               ORDER BY score DESC, created_at ASC LIMIT ?""", (start, end, start, end, limit))

    def season_rank(self, pid_hash: str, start: int, end: int) -> dict[str, Any] | None:
        me = self.one("SELECT MAX(score) AS best, COUNT(*) AS n FROM scores WHERE hidden=0 AND pid_hash=? AND created_at>=? AND created_at<?", (pid_hash, start, end))
        if not me or me["best"] is None:
            return None
        better = self.one("SELECT COUNT(*) AS n FROM (SELECT pid_hash, MAX(score) AS b FROM scores WHERE hidden=0 AND created_at>=? AND created_at<? AND pid_hash != ? GROUP BY pid_hash) WHERE b > ?",
                          (start, end, pid_hash, me["best"]))
        return {"rank": (better["n"] if better else 0) + 1, "best": me["best"], "games": me["n"]}

    # ---------------- испытание дня ----------------
    def add_daily(self, day: str, pid_hash: str, nick: str, r: dict[str, Any], done: bool) -> dict[str, Any]:
        now = int(time.time())
        with self.tx() as c:
            row = c.execute("SELECT score, tries, done FROM daily_scores WHERE day=? AND pid_hash=?", (day, pid_hash)).fetchone()
            if row is None:
                c.execute("INSERT INTO daily_scores(day,pid_hash,nick,score,nights,pop,ending,burnouts,smog,done,tries,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,?)",
                          (day, pid_hash, nick, r["score"], r["nights"], r["pop"], r["ending"], r["burnouts"], r["smog"], int(done), now))
                return {"best": r["score"], "improved": True, "tries": 1}
            improved = r["score"] > row["score"]
            if improved:
                c.execute("UPDATE daily_scores SET nick=?, score=?, nights=?, pop=?, ending=?, burnouts=?, smog=?, done=?, tries=tries+1, created_at=? WHERE day=? AND pid_hash=?",
                          (nick, r["score"], r["nights"], r["pop"], r["ending"], r["burnouts"], r["smog"], int(done or row["done"]), now, day, pid_hash))
            else:
                c.execute("UPDATE daily_scores SET tries=tries+1, done=? WHERE day=? AND pid_hash=?", (int(done or row["done"]), day, pid_hash))
            return {"best": max(row["score"], r["score"]), "improved": improved, "tries": row["tries"] + 1}

    def daily_board(self, day: str, limit: int = 20) -> list[dict[str, Any]]:
        return self.q("SELECT nick, score, nights, pop, ending, done FROM daily_scores WHERE day=? AND hidden=0 ORDER BY score DESC, created_at ASC LIMIT ?", (day, limit))

    def daily_me(self, day: str, pid_hash: str) -> dict[str, Any] | None:
        me = self.one("SELECT score, nights, pop, ending, done, tries FROM daily_scores WHERE day=? AND pid_hash=? AND hidden=0", (day, pid_hash))
        if not me:
            return None
        better = self.one("SELECT COUNT(*) AS n FROM daily_scores WHERE day=? AND hidden=0 AND score>?", (day, me["score"]))
        total = self.one("SELECT COUNT(*) AS n FROM daily_scores WHERE day=? AND hidden=0", (day,))
        return {**me, "done": bool(me["done"]), "rank": (better["n"] if better else 0) + 1, "total": total["n"] if total else 1}

    # ---------------- админка ----------------
    def sessions(self, f: dict[str, Any], sort: str = "created_at", desc: bool = True, limit: int = 50, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
        where, args = self._where(f)
        sort = sort if sort in SESSION_SORT else "created_at"
        total = self.one(f"SELECT COUNT(*) AS n FROM sessions {where}", tuple(args))["n"]
        rows = self.q(f"SELECT * FROM sessions {where} ORDER BY {sort} {'DESC' if desc else 'ASC'} LIMIT ? OFFSET ?", tuple(args) + (limit, offset))
        return rows, total

    @staticmethod
    def _where(f: dict[str, Any]) -> tuple[str, list[Any]]:
        cl, a = [], []
        if f.get("platform"): cl.append("platform=?"); a.append(f["platform"])
        if f.get("ending"): cl.append("ending=?"); a.append(f["ending"])
        if f.get("status"): cl.append("status=?"); a.append(f["status"])
        if f.get("min_nights") is not None: cl.append("nights_done>=?"); a.append(f["min_nights"])
        if f.get("max_nights") is not None: cl.append("nights_done<=?"); a.append(f["max_nights"])
        if f.get("min_duration") is not None: cl.append("duration_s>=?"); a.append(f["min_duration"])
        if f.get("since") is not None: cl.append("created_at>=?"); a.append(f["since"])
        if f.get("until") is not None: cl.append("created_at<?"); a.append(f["until"])
        return ("WHERE " + " AND ".join(cl)) if cl else "", a

    def session_detail(self, rid: str) -> dict[str, Any] | None:
        s = self.one("SELECT * FROM sessions WHERE rid=?", (rid,))
        if not s:
            return None
        s["events"] = self.q("SELECT ts, type, data FROM events WHERE rid=? ORDER BY id", (rid,))
        return s

    def delete_session(self, rid: str) -> bool:
        with self.tx() as c:
            c.execute("DELETE FROM events WHERE rid=?", (rid,))
            return c.execute("DELETE FROM sessions WHERE rid=?", (rid,)).rowcount > 0

    def stats(self, f: dict[str, Any]) -> dict[str, Any]:
        where, a = self._where(f); a = tuple(a)
        tot = self.one(f"""SELECT COUNT(*) AS n, SUM(status='ended') AS ended, AVG(CASE WHEN duration_s>0 THEN duration_s END) AS avg_dur,
                           AVG(nights_done) AS avg_nights, AVG(score) AS avg_score, MAX(score) AS max_score, AVG(moves) AS avg_moves FROM sessions {where}""", a)
        def dist(col: str, extra: str = "") -> dict[str, int]:
            w = (where + (" AND " if where else "WHERE ") + f"{col} IS NOT NULL") if True else where
            return {str(r["k"]): r["n"] for r in self.q(f"SELECT {col} AS k, COUNT(*) AS n FROM sessions {w} GROUP BY {col} ORDER BY n DESC", a)}
        nights = {str(r["k"]): r["n"] for r in self.q(f"SELECT nights_done AS k, COUNT(*) AS n FROM sessions {where} GROUP BY nights_done ORDER BY k", a)}
        screens = {str(r["k"]): r["n"] for r in self.q(
            f"SELECT CASE WHEN screen_w IS NULL THEN 'нет данных' WHEN MIN(screen_w, screen_h) < 500 THEN 'телефон (<500)' WHEN MIN(screen_w, screen_h) < 900 THEN 'планшет/малый (500–900)' ELSE 'десктоп (≥900)' END AS k, COUNT(*) AS n FROM sessions {where} GROUP BY k ORDER BY n DESC", a)}
        days = self.q(f"SELECT date(created_at,'unixepoch') AS d, COUNT(*) AS n FROM sessions {where} GROUP BY d ORDER BY d DESC LIMIT 14", a)
        vs = [json.loads(r["valves"]) for r in self.q(f"SELECT valves FROM sessions {where + (' AND ' if where else 'WHERE ')}valves IS NOT NULL", a) if r["valves"]]
        avg_valves = [round(sum(v[i] for v in vs) / len(vs), 3) for i in range(4)] if vs else None
        sc = self.one("SELECT COUNT(*) AS n, SUM(hidden) AS hidden FROM scores") or {"n": 0, "hidden": 0}
        return {
            "sessions": tot["n"], "ended": tot["ended"] or 0, "avg_duration_s": round(tot["avg_dur"] or 0, 1),
            "avg_nights": round(tot["avg_nights"] or 0, 2), "avg_score": round(tot["avg_score"] or 0, 1) if tot["avg_score"] is not None else None,
            "max_score": tot["max_score"], "avg_moves": round(tot["avg_moves"] or 0, 1),
            "endings": dist("ending"), "reached_night": nights, "platforms": dist("platform"), "screens": screens,
            "per_day": list(reversed(days)), "avg_valves": avg_valves, "scores": {"total": sc["n"], "hidden": sc["hidden"] or 0},
        }

    def scores(self, limit: int = 200, offset: int = 0, q: str = "") -> tuple[list[dict[str, Any]], int]:
        w, a = ("WHERE nick LIKE ?", [f"%{q}%"]) if q else ("", [])
        total = self.one(f"SELECT COUNT(*) AS n FROM scores {w}", tuple(a))["n"]
        return self.q(f"SELECT id, rid, created_at, nick, score, nights, pop, ending, duration_s, burnouts, smog, hidden FROM scores {w} ORDER BY created_at DESC LIMIT ? OFFSET ?", tuple(a) + (limit, offset)), total

    def set_hidden(self, sid: int, hidden: bool) -> bool:
        with self.tx() as c:
            return c.execute("UPDATE scores SET hidden=? WHERE id=?", (1 if hidden else 0, sid)).rowcount > 0

    def delete_score(self, sid: int) -> bool:
        with self.tx() as c:
            return c.execute("DELETE FROM scores WHERE id=?", (sid,)).rowcount > 0

    def purge(self, days: int) -> dict[str, int]:
        cut = int(time.time()) - days * 86400
        with self.tx() as c:
            e = c.execute("DELETE FROM events WHERE rid IN (SELECT rid FROM sessions WHERE created_at<?)", (cut,)).rowcount
            s = c.execute("DELETE FROM sessions WHERE created_at<?", (cut,)).rowcount
        return {"sessions": s, "events": e}

    def facets(self) -> dict[str, list[str]]:
        return {"platforms": [r["k"] for r in self.q("SELECT DISTINCT platform AS k FROM sessions WHERE platform IS NOT NULL ORDER BY 1")],
                "endings": [r["k"] for r in self.q("SELECT DISTINCT ending AS k FROM sessions WHERE ending IS NOT NULL ORDER BY 1")]}

    def close(self) -> None:
        with self._lock:
            self._c.close()
