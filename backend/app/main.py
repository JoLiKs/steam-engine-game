"""Последний котёл — API: рейтинг, анонимная телеметрия сессий и админка (/api/admin, /admin/panel)."""
from __future__ import annotations

import asyncio
import csv
import hmac
import io
import json
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, Response

from . import __version__
from .config import Settings
from .db import DB, SESSION_SORT
from .ai import AiError, AiService
from .aicrypto import KeyVault
from .ainotes import SITUATIONS
from .ratelimit import LoginGuard, RateLimiter
from .scoring import ENDING_BONUS, PLATFORMS, Invalid, clean_nick, int_in, score_js, validate_result
from .security import AdminAuth, Tickets, client_ip, hash_ip, hash_pid, proxy_verified

STATIC = Path(__file__).parent / "static"
CSP_API = "default-src 'none'; frame-ancestors 'none'"
CSP_PANEL = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; "
             "base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'")
UA_OK = re.compile(r"[^A-Za-z0-9 ._/+\-]")
EVENT_TYPES = ("start", "night_end", "ending")


def err(status: int, msg: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse({"error": msg}, status_code=status, headers=headers)


def _num(v: Any, lo: float, hi: float, name: str) -> float:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or not lo <= v <= hi:
        raise Invalid(name)
    return float(v)


def _valves(v: Any) -> list[float]:
    if not isinstance(v, list) or len(v) != 4:
        raise Invalid("valves")
    return [round(_num(x, 0, 1, "valves"), 3) for x in v]


def validate_event(etype: str, d: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    """(данные события, метаданные сессии для start). Всё, что не из белого списка, отбрасывается."""
    if not isinstance(d, dict):
        raise Invalid("data")
    meta: dict[str, Any] = {}
    out: dict[str, Any] = {}
    if etype == "start":
        plat = d.get("platform", "other")
        meta["platform"] = plat if plat in PLATFORMS else "other"
        meta["sw"] = int_in(d.get("sw", 0), 0, 10000, "sw"); meta["sh"] = int_in(d.get("sh", 0), 0, 10000, "sh")
        meta["touch"] = 1 if d.get("touch") else 0
        ua = d.get("ua", "")
        meta["ua"] = UA_OK.sub("", ua)[:40] if isinstance(ua, str) else ""
        out = dict(meta)
    elif etype == "night_end":
        out = {"night": int_in(d.get("night"), 0, 9, "night"), "ok": bool(d.get("ok")),
               "pop": int_in(d.get("pop"), 0, 1000, "pop"), "lost": int_in(d.get("lost", 0), 0, 1000, "lost"),
               "coal": int_in(d.get("coal", 0), 0, 99, "coal"), "smog": int_in(d.get("smog", 0), 0, 100, "smog"),
               "fw": int_in(d.get("fw", 0), 0, 100, "fw"), "burnouts": int_in(d.get("burnouts", 0), 0, 60, "burnouts"),
               "dur_s": round(_num(d.get("dur_s"), 0, 6 * 3600, "dur_s"), 1)}
        if "valves" in d:
            out["valves"] = _valves(d["valves"]); out["moves"] = int_in(d.get("moves", 0), 0, 100000, "moves")
    elif etype == "ending":
        ending = d.get("ending")
        if ending not in ENDING_BONUS:
            raise Invalid("ending")
        out = {"ending": ending, "nights": int_in(d.get("nights"), 0, 10, "nights"), "pop": int_in(d.get("pop"), 0, 1000, "pop"),
               "burnouts": int_in(d.get("burnouts", 0), 0, 60, "burnouts"), "smog": int_in(d.get("smog", 0), 0, 100, "smog"),
               "dur_s": round(_num(d.get("dur_s"), 0, 6 * 3600, "dur_s"), 1), "score": int_in(d.get("score"), 0, 3000, "score")}
        if out["score"] != score_js(out["nights"], out["pop"], ending, out["burnouts"], out["smog"]):
            raise Invalid("score")
        if "valves" in d:
            out["valves"] = _valves(d["valves"]); out["moves"] = int_in(d.get("moves", 0), 0, 100000, "moves")
    return out, meta


def create_app(settings: Settings | None = None, db: DB | None = None, clock=time.time, ai_transport=None, ai_background: bool = True) -> FastAPI:
    s = settings or Settings.from_env()
    s.validate()
    db = db or DB(s.db_path)
    auth = AdminAuth(s, db)
    s_key = s.secret_key
    ai = AiService(db, KeyVault(s.ai_master_key), clock=clock, transport=ai_transport, background=ai_background)
    rl_ai = RateLimiter(12, 60)          # тяжёлые действия раздела «ИИ» в админке (проверка ключа, пример) — на сессию
    tickets = Tickets(s.secret_key, s.ticket_ttl_s)
    rl_run, rl_event = RateLimiter(s.rl_run_per_min, 60), RateLimiter(s.rl_event_per_min, 60)
    rl_score, rl_score_day = RateLimiter(s.rl_score_per_min, 60), RateLimiter(s.rl_score_per_day, 86400)
    rl_read, rl_admin = RateLimiter(s.rl_read_per_min, 60), RateLimiter(300, 60)
    guard = LoginGuard(max_fails=5, lock_s=900, global_max=60, global_lock_s=300)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        async def cleanup() -> None:
            while True:
                await asyncio.sleep(3600)
                try:
                    db.purge(s.retention_days)
                    for r in (rl_run, rl_event, rl_score, rl_score_day, rl_read, rl_admin):
                        r.gc()
                except Exception:
                    pass
        t = asyncio.create_task(cleanup())
        yield
        t.cancel()

    app = FastAPI(title="Last Boiler API", version=__version__, lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.db, app.state.settings, app.state.ai = db, s, ai

    def ip_of(request: Request) -> str:
        return client_ip(request.headers, request.client.host if request.client else None, s.proxy_secret)

    def is_public(path: str) -> bool:
        return path.startswith("/api/g/")

    @app.middleware("http")
    async def security(request: Request, call_next):
        path = request.url.path
        origin = (request.headers.get("origin") or "").rstrip("/").lower()
        cors_ok = bool(origin) and origin in s.allowed_origins
        if request.method == "OPTIONS" and is_public(path):
            if not cors_ok:
                return Response(status_code=403)
            resp: Response = Response(status_code=204)
        elif (path != "/api/health" and s.require_proxy and not proxy_verified(request.headers, s.proxy_secret)
              and not (is_public(path) and cors_ok and origin in s.direct_origins and request.method in ("GET", "HEAD", "POST"))):
            resp = err(403, "forbidden")          # прямой доступ в обход Pages Worker запрещён (исключение — публичное API с доверенных сайтов-владельцев игры, см. SEG_DIRECT_ORIGINS)
        else:
            try:
                resp = await call_next(request)
            except Exception:
                resp = err(500, "internal error")
        h = resp.headers
        h["X-Content-Type-Options"] = "nosniff"; h["Referrer-Policy"] = "no-referrer"; h["X-Frame-Options"] = "DENY"
        h["Content-Security-Policy"] = CSP_PANEL if path.startswith("/admin") else CSP_API
        h["Cache-Control"] = "no-store"
        h["X-Robots-Tag"] = "noindex, nofollow"
        if is_public(path) and cors_ok:
            h["Access-Control-Allow-Origin"] = origin; h["Vary"] = "Origin"
            h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"; h["Access-Control-Allow-Headers"] = "Content-Type"
            h["Access-Control-Max-Age"] = "600"
        return resp

    async def read_json(request: Request, limit: int = 4096) -> Any:
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > limit:
            raise HTTPException(413, "too large")
        body = await request.body()
        if len(body) > limit:
            raise HTTPException(413, "too large")
        try:
            return json.loads(body or b"null")
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(400, "bad json")

    @app.exception_handler(HTTPException)
    async def http_exc(request: Request, exc: HTTPException):
        return err(exc.status_code, str(exc.detail), getattr(exc, "headers", None))

    def limited(rl: RateLimiter, key: str) -> JSONResponse | None:
        ok, wait = rl.check(key)
        return None if ok else err(429, "too many requests", {"Retry-After": str(int(wait) + 1)})

    # ====================================================== публичное API игры
    @app.get("/api/health")
    def health():
        return {"ok": True, "version": __version__}

    @app.post("/api/g/run")
    def new_run(request: Request):
        ip = ip_of(request)
        if (r := limited(rl_run, ip)):
            return r
        return {"token": tickets.issue(clock())}

    @app.post("/api/g/event")
    async def post_event(request: Request):
        ip = ip_of(request)
        if (r := limited(rl_event, ip)):
            return r
        d = await read_json(request)
        if not isinstance(d, dict):
            return err(422, "body")
        tk = tickets.parse(d.get("token"), clock())
        if not tk:
            return err(401, "bad ticket")
        etype = d.get("type")
        if etype not in EVENT_TYPES:
            return err(422, "type")
        try:
            data, meta = validate_event(etype, d.get("data"))
        except Invalid as e:
            return err(422, f"invalid: {e}")
        if not db.record_event(tk["rid"], etype, data, meta, hash_ip(ip, s.secret_key), s.max_events_per_run):
            return err(429, "event limit for this session")
        return {"ok": True}

    @app.post("/api/g/score")
    async def post_score(request: Request):
        ip = ip_of(request)
        if (r := limited(rl_score, ip)) or (r := limited(rl_score_day, ip)):
            return r
        d = await read_json(request)
        if not isinstance(d, dict):
            return err(422, "body")
        tk = tickets.parse(d.get("token"), clock())
        if not tk:
            return err(401, "bad ticket")
        pid = d.get("pid")
        if not isinstance(pid, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", pid):
            return err(422, "pid")
        try:
            res = validate_result(d, clock() - tk["iat"], s.min_time_factor)
        except Invalid as e:
            return err(422, f"invalid: {e}")
        nick = clean_nick(d.get("nick"))
        sid = db.add_score(tk["rid"], res, nick, hash_pid(pid, s.secret_key), hash_ip(ip, s.secret_key))
        if sid is None:
            return err(409, "already submitted")
        return {"ok": True, "nick": nick, "rank": {"score": db.rank_of(sid, "score"), "survival": db.rank_of(sid, "survival")}}

    @app.get("/api/g/leaderboard")
    def leaderboard(request: Request, board: str = "score", limit: int = 20):
        if (r := limited(rl_read, ip_of(request))):
            return r
        if board not in db.ORDER:
            return err(422, "board")
        rows = db.leaderboard(board, max(1, min(limit, 50)))
        return {"board": board, "entries": [{"nick": x["nick"], "score": x["score"], "nights": x["nights"], "pop": x["pop"], "ending": x["ending"],
                                             "date": time.strftime("%Y-%m-%d", time.gmtime(x["created_at"]))} for x in rows]}


    @app.get("/api/g/note")
    def game_note(request: Request, s: str = "calm", n: int = 1):
        """«Заметка механика»: ответ мгновенный (из пула/запасных текстов), ИИ дергается в фоне. Ситуация — только из белого списка."""
        ip = ip_of(request)
        if (r := limited(rl_read, ip)):
            return r
        return ai.note(s if s in SITUATIONS else "calm", max(1, min(10, n)), hash_ip(ip, s_key))

    # ====================================================== админка
    def origin_ok(request: Request) -> bool:
        o = (request.headers.get("origin") or "").strip().rstrip("/").lower()
        return bool(o) and o in s.admin_origins

    def current(request: Request) -> dict[str, Any] | None:
        return auth.parse(request.cookies.get(auth.cookie_name))

    def require_admin(request: Request, write: bool = False) -> dict[str, Any]:
        sess = current(request)
        if not sess:
            raise HTTPException(401, "unauthorized")
        ok, _ = rl_admin.check(sess["sid"])
        if not ok:
            raise HTTPException(429, "too many requests")
        if write:
            if not origin_ok(request):
                raise HTTPException(403, "bad origin")
            if not hmac.compare_digest(request.headers.get("x-csrf-token", ""), sess["csrf"]):
                raise HTTPException(403, "bad csrf")
        return sess

    @app.post("/api/admin/login")
    async def admin_login(request: Request):
        ip = ip_of(request)
        if not origin_ok(request):
            return err(403, "bad origin")
        wait = guard.locked_for(ip)
        if wait > 0:
            return err(429, "locked", {"Retry-After": str(int(wait) + 1)})
        d = await read_json(request, 2048)
        pw = d.get("password") if isinstance(d, dict) else None
        if not isinstance(pw, str) or not auth.check_password(pw):
            guard.fail(ip)
            await asyncio.sleep(0.4)
            return err(401, "wrong password")
        guard.success(ip)
        token, payload = auth.issue()
        resp = JSONResponse({"ok": True, "csrf": payload["csrf"]})
        resp.set_cookie(auth.cookie_name, token, max_age=s.admin_session_hours * 3600, httponly=True, secure=s.cookie_secure, samesite="strict", path="/")
        return resp

    @app.post("/api/admin/logout")
    def admin_logout(request: Request):
        sess = require_admin(request, write=True)
        auth.revoke(sess)
        resp = JSONResponse({"ok": True})
        resp.delete_cookie(auth.cookie_name, path="/")
        return resp

    @app.get("/api/admin/me")
    def admin_me(request: Request):
        sess = current(request)
        if not sess:
            return JSONResponse({"authenticated": False}, status_code=401)
        return {"authenticated": True, "csrf": sess["csrf"], "expires": sess["exp"]}

    def qint(v: str | None, name: str) -> int | None:
        if v in (None, ""):
            return None
        try:
            return int(v)
        except ValueError:
            raise HTTPException(422, name)

    def day_ts(v: str | None, name: str, end: bool = False) -> int | None:
        if not v:
            return None
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            raise HTTPException(422, name)
        import calendar
        t = calendar.timegm(time.strptime(v, "%Y-%m-%d"))
        return t + 86400 if end else t

    def filters(request: Request) -> dict[str, Any]:
        q = request.query_params
        return {"platform": q.get("platform") or None, "ending": q.get("ending") or None, "status": q.get("status") if q.get("status") in ("playing", "ended") else None,
                "min_nights": qint(q.get("min_nights"), "min_nights"), "max_nights": qint(q.get("max_nights"), "max_nights"),
                "min_duration": qint(q.get("min_duration"), "min_duration"), "since": day_ts(q.get("since"), "since"), "until": day_ts(q.get("until"), "until", True)}

    def dump(r: dict[str, Any]) -> dict[str, Any]:
        r = dict(r)
        if r.get("valves"):
            r["valves"] = json.loads(r["valves"])
        return r

    @app.get("/api/admin/sessions")
    def admin_sessions(request: Request):
        require_admin(request)
        q = request.query_params
        limit = max(1, min(qint(q.get("limit"), "limit") or 50, 500)); offset = max(0, qint(q.get("offset"), "offset") or 0)
        sort = q.get("sort", "created_at")
        rows, total = db.sessions(filters(request), sort if sort in SESSION_SORT else "created_at", q.get("dir", "desc") != "asc", limit, offset)
        return {"total": total, "items": [dump(r) for r in rows]}

    @app.get("/api/admin/sessions/{rid}")
    def admin_session(rid: str, request: Request):
        require_admin(request)
        d = db.session_detail(rid)
        if not d:
            raise HTTPException(404, "not found")
        d = dump(d)
        d["events"] = [{"ts": e["ts"], "type": e["type"], "data": json.loads(e["data"] or "{}")} for e in d["events"]]
        return d

    @app.delete("/api/admin/sessions/{rid}")
    def admin_delete_session(rid: str, request: Request):
        require_admin(request, write=True)
        if not db.delete_session(rid):
            raise HTTPException(404, "not found")
        return {"ok": True}

    @app.get("/api/admin/stats")
    def admin_stats(request: Request):
        require_admin(request)
        return db.stats(filters(request))

    @app.get("/api/admin/facets")
    def admin_facets(request: Request):
        require_admin(request)
        return db.facets()

    @app.get("/api/admin/scores")
    def admin_scores(request: Request):
        require_admin(request)
        q = request.query_params
        rows, total = db.scores(max(1, min(qint(q.get("limit"), "limit") or 200, 1000)), max(0, qint(q.get("offset"), "offset") or 0), (q.get("q") or "")[:30])
        return {"total": total, "items": rows}

    @app.post("/api/admin/scores/{sid}/hide")
    async def admin_hide(sid: int, request: Request):
        require_admin(request, write=True)
        d = await read_json(request, 256)
        hidden = bool(d.get("hidden", True)) if isinstance(d, dict) else True
        if not db.set_hidden(sid, hidden):
            raise HTTPException(404, "not found")
        return {"ok": True, "hidden": hidden}

    @app.delete("/api/admin/scores/{sid}")
    def admin_delete_score(sid: int, request: Request):
        require_admin(request, write=True)
        if not db.delete_score(sid):
            raise HTTPException(404, "not found")
        return {"ok": True}

    @app.post("/api/admin/purge")
    async def admin_purge(request: Request):
        require_admin(request, write=True)
        d = await read_json(request, 256)
        days = d.get("days") if isinstance(d, dict) else None
        if isinstance(days, bool) or not isinstance(days, int) or not 0 <= days <= 3650:
            raise HTTPException(422, "days")
        return {"ok": True, **db.purge(days)}

    def csv_cell(v: Any) -> Any:
        if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + v      # защита от CSV-инъекций в Excel
        return v

    @app.get("/api/admin/export")
    def admin_export(request: Request, what: str = "sessions"):
        require_admin(request)
        buf = io.StringIO()
        w = csv.writer(buf)
        if what == "scores":
            rows, _ = db.scores(100000, 0)
            cols = ["id", "created_at", "nick", "score", "nights", "pop", "ending", "duration_s", "burnouts", "smog", "hidden"]
        elif what == "sessions":
            rows, _ = db.sessions(filters(request), "created_at", True, 100000, 0)
            cols = ["rid", "created_at", "updated_at", "platform", "screen_w", "screen_h", "touch", "ua", "status", "nights_done", "ending", "score", "pop", "burnouts", "smog", "duration_s", "valves", "moves", "n_events"]
        else:
            raise HTTPException(422, "what")
        w.writerow(cols)
        for r in rows:
            w.writerow([csv_cell(time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(r[c])) if c in ("created_at", "updated_at") and r[c] else r[c]) for c in cols])
        return Response("\ufeff" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="last-boiler-{what}.csv"'})


    # ---- раздел «ИИ»: настройки, провайдеры (ключи шифруются, наружу — только маски), проверка, пример
    def ai_guard(request: Request, write: bool = False, heavy: bool = False) -> dict[str, Any]:
        sess = require_admin(request, write=write)
        if heavy:
            ok, _ = rl_ai.check(sess["sid"])
            if not ok:
                raise HTTPException(429, "too many requests")
        return sess

    def ai_call(fn):
        try:
            return fn()
        except AiError as e:
            return err(e.code, str(e))

    @app.get("/api/admin/ai")
    def admin_ai(request: Request):
        ai_guard(request)
        return ai.admin_state()

    @app.post("/api/admin/ai/settings")
    async def admin_ai_settings(request: Request):
        ai_guard(request, write=True)
        d = await read_json(request, 4096)
        if not isinstance(d, dict):
            return err(422, "body")
        return ai_call(lambda: {"settings": ai.save_settings(d)})

    @app.post("/api/admin/ai/providers")
    async def admin_ai_add(request: Request):
        ai_guard(request, write=True, heavy=True)
        d = await read_json(request, 2048)
        if not isinstance(d, dict) or not isinstance(d.get("key"), str):
            return err(422, "key")
        name = d.get("name") if isinstance(d.get("name"), str) else ""
        return await asyncio.get_running_loop().run_in_executor(None, lambda: ai_call(lambda: {"provider": ai.add_provider(d["key"], name)}))

    @app.post("/api/admin/ai/order")
    async def admin_ai_order(request: Request):
        ai_guard(request, write=True)
        d = await read_json(request, 2048)
        return ai_call(lambda: {"providers": ai.reorder(d.get("ids") if isinstance(d, dict) else None)})

    @app.post("/api/admin/ai/sample")
    async def admin_ai_sample(request: Request):
        ai_guard(request, write=True, heavy=True)
        d = await read_json(request, 1024)
        sit = d.get("situation", "calm") if isinstance(d, dict) else "calm"
        return await asyncio.get_running_loop().run_in_executor(None, lambda: ai_call(lambda: ai.sample(sit if isinstance(sit, str) else "calm")))

    @app.post("/api/admin/ai/providers/{pid}/check")
    async def admin_ai_check(pid: str, request: Request):
        ai_guard(request, write=True, heavy=True)
        return await asyncio.get_running_loop().run_in_executor(None, lambda: ai_call(lambda: ai.check_provider(pid)))

    @app.post("/api/admin/ai/providers/{pid}")
    async def admin_ai_patch(pid: str, request: Request):
        ai_guard(request, write=True)
        d = await read_json(request, 2048)
        if not isinstance(d, dict):
            return err(422, "body")
        return ai_call(lambda: {"provider": ai.update_provider(pid, d)})

    @app.delete("/api/admin/ai/providers/{pid}")
    def admin_ai_delete(pid: str, request: Request):
        ai_guard(request, write=True)
        def run():
            ai.delete_provider(pid)
            return {"ok": True}
        return ai_call(run)

    @app.api_route("/api/admin/{rest:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
    def admin_unknown(rest: str, request: Request):
        require_admin(request)
        raise HTTPException(404, "not found")

    # Панель отдаётся ТОЛЬКО с действующей сессией; без неё — 401 (страница входа живёт на Cloudflare Pages: /admin/).
    PANEL = {"": ("index.html", "text/html; charset=utf-8"), "index.html": ("index.html", "text/html; charset=utf-8"),
             "app.js": ("app.js", "text/javascript; charset=utf-8"), "admin.css": ("admin.css", "text/css; charset=utf-8")}

    @app.get("/admin/panel")
    @app.get("/admin/panel/")
    @app.get("/admin/panel/{name}")
    def panel(request: Request, name: str = ""):
        if not current(request):
            if name in ("", "index.html"):
                return HTMLResponse('<!doctype html><meta charset="utf-8"><title>401</title><p>Нужен вход. <a href="/admin/">Перейти к входу</a></p>', status_code=401)
            return PlainTextResponse("unauthorized", status_code=401)
        ent = PANEL.get(name)
        if not ent:
            return PlainTextResponse("not found", status_code=404)
        return Response((STATIC / ent[0]).read_bytes(), media_type=ent[1])

    return app
