import json
import time

import pytest

from app.scoring import clean_nick, score_js, validate_result, Invalid
from conftest import ORIGIN, PASSWORD, VECTORS, make_client


def good_result(**kw):
    d = {"ending": "light", "nights": 10, "pop": 900, "burnouts": 0, "smog": 10, "duration_s": 600.0}
    d.update(kw)
    d["score"] = score_js(d["nights"], d["pop"], d["ending"], d["burnouts"], d["smog"])
    return d


def token(client, clock=None, advance=0):
    t = client.post("/api/g/run").json()["token"]
    if clock:
        clock.t += advance
    return t


def submit(client, tk, pid="player-0001-abc", nick="Ivan", **kw):
    return client.post("/api/g/score", json={"token": tk, "pid": pid, "nick": nick, **good_result(**kw)})


# ---------------------------------------------------------------- счёт
def test_score_vectors_match_formula():
    for v in VECTORS:
        assert score_js(v["nights"], v["pop"], v["ending"], v["burnouts"], v["smog"]) == v["score"], v


@pytest.mark.parametrize("raw,expected", [
    (None, "Аноним"), ("", "Аноним"), ("  ", "Аноним"), ("a", "Аноним"), (123, "Аноним"),
    ("Иван", "Иван"), ("Ivan_Petrov", "Ivan Petrov"), ("  Ivan   Petrov  ", "Ivan Petrov"),
    ("<script>alert(1)</script>", "scriptalert1scri"), ("<b>x</b>yy", "bxbyy"),
    ("http://evil.com", "Аноним"), ("buy at www.x.ru", "Аноним"), ("@admin", "Аноним"),
    ("A" * 100, "A" * 16), ("zero\u200bwidth\u0000", "zerowidth"), ("a&b;c\"d'e", "abcde"),
])
def test_clean_nick(raw, expected):
    assert clean_nick(raw) == expected


def test_clean_nick_never_has_html_chars():
    for raw in ["<img src=x onerror=alert(1)>", "\"><svg/onload=1>", "`${7*7}`", "{{7*7}}", "a<b>c", "x' OR 1=1 --"]:
        n = clean_nick(raw)
        assert not set(n) & set("<>&\"'`/\\{}$;:=()"), (raw, n)
        assert len(n) <= 16


# ---------------------------------------------------------------- прокси и CORS
def test_health_open_everything_else_requires_proxy_secret(app):
    anon = make_client(app, proxy=False)
    assert anon.get("/api/health").status_code == 200
    assert anon.get("/api/g/leaderboard").status_code == 403
    assert anon.post("/api/g/run").status_code == 403
    assert anon.get("/admin/panel/").status_code == 403
    assert anon.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": ORIGIN}).status_code == 403


def test_cors_only_for_pages_origin(client):
    r = client.get("/api/g/leaderboard", headers={"origin": ORIGIN})
    assert r.headers["access-control-allow-origin"] == ORIGIN
    r = client.get("/api/g/leaderboard", headers={"origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
    assert client.options("/api/g/score", headers={"origin": ORIGIN, "access-control-request-method": "POST"}).status_code == 204
    assert client.options("/api/g/score", headers={"origin": "https://evil.example", "access-control-request-method": "POST"}).status_code == 403
    r = client.get("/api/g/leaderboard")
    assert "access-control-allow-origin" not in r.headers


def test_security_headers(client):
    r = client.get("/api/g/leaderboard")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["cache-control"] == "no-store"


# ---------------------------------------------------------------- билеты и события
def test_ticket_roundtrip_and_tamper(client, clock):
    tk = token(client)
    ev = {"token": tk, "type": "start", "data": {"platform": "android", "sw": 390, "sh": 844, "touch": True, "ua": "Chrome/120 Android"}}
    assert client.post("/api/g/event", json=ev).status_code == 200
    bad = dict(ev, token=tk[:-3] + ("aaa" if not tk.endswith("aaa") else "bbb"))
    assert client.post("/api/g/event", json=bad).status_code == 401
    assert client.post("/api/g/event", json=dict(ev, token="x.y")).status_code == 401
    assert client.post("/api/g/event", json=dict(ev, token=None)).status_code == 401
    clock.t += 7 * 3600
    assert client.post("/api/g/event", json=ev).status_code == 401      # билет просрочен


def test_event_validation(client):
    tk = token(client)
    P = lambda t, d: client.post("/api/g/event", json={"token": tk, "type": t, "data": d})
    assert P("hack", {}).status_code == 422
    assert P("night_end", {"night": 12, "ok": True, "pop": 5, "dur_s": 3}).status_code == 422
    assert P("night_end", {"night": 1, "ok": True, "pop": 5000, "dur_s": 3}).status_code == 422
    assert P("night_end", {"night": 1, "ok": True, "pop": 900, "dur_s": "x"}).status_code == 422
    assert P("night_end", {"night": 1, "ok": True, "pop": 900, "dur_s": 50, "valves": [1, 2, 3, 4]}).status_code == 422
    assert P("ending", {"ending": "light", "nights": 10, "pop": 900, "score": 5, "dur_s": 600}).status_code == 422   # score не сходится
    assert P("night_end", {"night": 1, "ok": True, "pop": 900, "dur_s": 50, "valves": [.1, .2, .3, .4], "moves": 12, "junk": "x"}).status_code == 200
    r = client.post("/api/g/event", content=b"x" * 5000, headers={"content-type": "application/json"})
    assert r.status_code == 413
    assert client.post("/api/g/event", content=b"{not json").status_code == 400


def test_event_limit_per_session(client, settings):
    tk = token(client)
    codes = [client.post("/api/g/event", json={"token": tk, "type": "night_end", "data": {"night": 0, "ok": True, "pop": 900, "dur_s": 40}}).status_code
             for _ in range(settings.max_events_per_run + 3)]
    assert codes.count(200) == settings.max_events_per_run and codes[-1] == 429


def test_event_rate_limit_per_ip(app, settings):
    c = make_client(app, ip="203.0.113.50")
    tk = token(c)
    codes = [c.post("/api/g/event", json={"token": tk, "type": "start", "data": {}}).status_code for _ in range(settings.rl_event_per_min + 5)]
    assert 429 in codes
    other = make_client(app, ip="203.0.113.51")           # другой IP — свой лимит
    assert other.post("/api/g/run").status_code == 200


def test_no_raw_ip_stored(app, client):
    tk = token(client)
    client.post("/api/g/event", json={"token": tk, "type": "start", "data": {"platform": "ios"}})
    rows = app.state.db.q("SELECT * FROM sessions")
    assert rows and "203.0.113.7" not in json.dumps(rows) and len(rows[0]["ip_hash"]) == 16


# ---------------------------------------------------------------- рейтинг
def test_submit_and_read_leaderboard(client, clock):
    tk = token(client, clock, 700)
    r = submit(client, tk, nick="<b>Игрок</b>")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["rank"]["score"] == 1 and "<" not in j["nick"]
    lb = client.get("/api/g/leaderboard?board=score").json()["entries"]
    assert len(lb) == 1 and lb[0]["nick"] == j["nick"] and lb[0]["score"] == good_result()["score"]
    assert set(lb[0]) == {"nick", "score", "nights", "pop", "ending", "date"}           # никаких id/ip/pid наружу
    assert client.get("/api/g/leaderboard?board=nope").status_code == 422


def test_default_nick(client, clock):
    tk = token(client, clock, 700)
    r = client.post("/api/g/score", json={"token": tk, "pid": "player-xyz-12345", **good_result()})
    assert r.json()["nick"] == "Аноним"


def test_score_rejections(app, clock):
    n = [0]
    def fresh():
        n[0] += 1
        c = make_client(app, ip=f"172.16.0.{n[0]}")        # у каждого запроса свой IP, чтобы не упереться в rate limit
        return c, token(c, clock, 700)
    base = good_result()
    def post(**over):
        c, tk = fresh()
        return c.post("/api/g/score", json={"token": tk, "pid": "player-0001-abc", **{**base, **over}})
    assert post().status_code == 200                                                            # контроль: валидный проходит
    assert post(score=base["score"] + 1).status_code == 422                                     # накрутка счёта
    assert post(nights=11).status_code == 422
    assert post(pop=1001).status_code == 422
    assert post(ending="whatever").status_code == 422
    assert post(duration_s=-1).status_code == 422
    assert post(duration_s=5).status_code == 422                                                # слишком быстро
    assert post(duration_s=10 ** 6).status_code == 422
    assert post(smog=101).status_code == 422
    assert post(burnouts=1.5).status_code == 422
    assert post(**good_result(ending="boom", nights=10, pop=0)).status_code == 422             # взрыв после 10 ночей — нельзя
    assert post(**good_result(ending="light", pop=500)).status_code == 422                       # light при малом населении
    assert post(**good_result(ending="cold", pop=900)).status_code == 422
    assert post(**good_result(ending="silence", nights=3, pop=900, duration_s=300)).status_code == 422
    c, tk = fresh()
    assert c.post("/api/g/score", json={"token": "bad", "pid": "player-0001-abc", **base}).status_code == 401
    assert c.post("/api/g/score", json={"token": tk, "pid": "x", **base}).status_code == 422     # плохой pid


def test_server_time_check_blocks_instant_submit(client, clock):
    tk = token(client)                                   # время не прошло: клиент заявляет 600 с, серверу прошло 0
    assert submit(client, tk).status_code == 422


def test_one_score_per_ticket(client, clock):
    tk = token(client, clock, 700)
    assert submit(client, tk).status_code == 200
    assert submit(client, tk).status_code == 409


def test_score_rate_limits(app, clock, settings):
    c = make_client(app, ip="203.0.113.99")
    codes = []
    for i in range(settings.rl_score_per_min + 2):
        tk = token(c, clock, 700)
        codes.append(submit(c, tk, pid=f"player-{i:04d}-abcd").status_code)
    assert codes[: settings.rl_score_per_min] == [200] * settings.rl_score_per_min
    assert codes[-1] == 429
    clock.t += 0                                          # другой IP не затронут
    c2 = make_client(app, ip="203.0.113.100")
    assert submit(c2, token(c2, clock, 700), pid="player-other-123").status_code == 200


def test_leaderboard_one_entry_per_player_and_hidden(app, clock):
    db = app.state.db
    def add(ip, pid, nick, **kw):
        c = make_client(app, ip=ip)
        r = submit(c, token(c, clock, 700), pid=pid, nick=nick, **kw)
        assert r.status_code == 200, r.text
        return r.json()
    add("10.0.0.1", "player-aaaaaa-1", "Аня", pop=900)
    add("10.0.0.1", "player-aaaaaa-1", "Аня2", pop=950)         # тот же игрок: в таблице только лучший
    add("10.0.0.2", "player-bbbbbb-2", "Боб", pop=800)
    add("10.0.0.3", "player-cccccc-3", "Вика", pop=700, ending="cold", smog=5)
    c = make_client(app)
    lb = c.get("/api/g/leaderboard?board=score").json()["entries"]
    assert [e["nick"] for e in lb] == ["Аня2", "Боб", "Вика"]
    sv = c.get("/api/g/leaderboard?board=survival").json()["entries"]
    assert [e["nick"] for e in sv] == ["Аня2", "Боб", "Вика"]
    # лидер скрыт админом — пропадает, но у игрока остаётся прежняя запись
    sid = db.q("SELECT id FROM scores WHERE nick='Аня2'")[0]["id"]
    assert db.set_hidden(sid, True)
    assert [e["nick"] for e in c.get("/api/g/leaderboard").json()["entries"]] == ["Аня", "Боб", "Вика"]


# ---------------------------------------------------------------- админка
def test_admin_requires_session(client):
    for path in ["/api/admin/me", "/api/admin/stats", "/api/admin/sessions", "/api/admin/scores", "/api/admin/export",
                 "/api/admin/facets", "/api/admin/nothing", "/admin/panel/", "/admin/panel", "/admin/panel/app.js", "/admin/panel/admin.css", "/admin/panel/index.html"]:
        assert client.get(path).status_code == 401, path
    for m, path in [("post", "/api/admin/purge"), ("delete", "/api/admin/sessions/abc"), ("delete", "/api/admin/scores/1"), ("post", "/api/admin/scores/1/hide"), ("post", "/api/admin/logout")]:
        assert getattr(client, m)(path).status_code == 401, path


def test_forged_cookie_rejected(client):
    client.cookies.set("seg_admin", "aaa.bbb")
    assert client.get("/api/admin/stats").status_code == 401
    client.cookies.set("seg_admin", "e30.AAAA")
    assert client.get("/admin/panel/").status_code == 401


def test_login_wrong_password_and_lockout(app):
    c = make_client(app, ip="192.0.2.1")
    for _ in range(5):
        assert c.post("/api/admin/login", json={"password": "wrong"}, headers={"origin": ORIGIN}).status_code == 401
    r = c.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": ORIGIN})
    assert r.status_code == 429                                  # заблокирован даже с верным паролем
    other = make_client(app, ip="192.0.2.2")
    assert other.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": ORIGIN}).status_code == 200


def test_login_requires_allowed_origin(app):
    c = make_client(app, ip="192.0.2.3")
    assert c.post("/api/admin/login", json={"password": PASSWORD}).status_code == 403
    assert c.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": "https://evil.example"}).status_code == 403


def test_panel_available_after_login(admin):
    r = admin.get("/admin/panel/")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert "script-src 'self'" in r.headers["content-security-policy"]
    assert admin.get("/admin/panel/app.js").status_code == 200
    assert admin.get("/admin/panel/admin.css").status_code == 200
    assert admin.get("/admin/panel/../../etc/passwd").status_code in (404, 401)
    assert admin.get("/admin/panel/secret.txt").status_code == 404
    assert admin.get("/api/admin/me").json()["authenticated"] is True


def test_csrf_and_origin_required_for_writes(admin, app):
    admin.headers.pop("x-csrf-token")
    assert admin.delete("/api/admin/scores/1").status_code == 403
    admin.headers["x-csrf-token"] = "wrong"
    assert admin.delete("/api/admin/scores/1").status_code == 403
    admin.headers["x-csrf-token"] = admin.get("/api/admin/me").json()["csrf"]
    admin.headers["origin"] = "https://evil.example"
    assert admin.delete("/api/admin/scores/1").status_code == 403
    admin.headers["origin"] = ORIGIN
    assert admin.delete("/api/admin/scores/1").status_code == 404      # права есть, записи нет


def test_logout_revokes_session(admin):
    assert admin.post("/api/admin/logout").status_code == 200
    assert admin.get("/api/admin/stats").status_code == 401


def seed(app, clock):
    """Три сессии с разными платформами/концовками + рейтинг."""
    specs = [("android", 390, 844, "light", 10, 900), ("ios", 375, 812, "smoke", 10, 800), ("windows", 1920, 1080, "boom", 4, 600), ("android", 360, 640, None, 2, 950)]
    for i, (plat, w, h, ending, nights, pop) in enumerate(specs):
        c = make_client(app, ip=f"10.1.0.{i}")
        tk = token(c, clock)
        c.post("/api/g/event", json={"token": tk, "type": "start", "data": {"platform": plat, "sw": w, "sh": h, "touch": plat != "windows", "ua": "Chrome/120 X11; Linux <x>"}})
        for n in range(nights if not ending else min(nights, 9)):
            c.post("/api/g/event", json={"token": tk, "type": "night_end", "data": {"night": n, "ok": True, "pop": pop, "lost": 3, "coal": 10, "smog": 10, "fw": 20, "burnouts": 0, "dur_s": 50 * (n + 1), "valves": [.5, .4, .6, .3], "moves": 20 + n}})
        if ending:
            sc = score_js(nights, pop, ending, 0, 10)
            r = c.post("/api/g/event", json={"token": tk, "type": "ending", "data": {"ending": ending, "nights": nights, "pop": pop, "burnouts": 0, "smog": 10, "dur_s": 540.5, "score": sc, "valves": [.5, .4, .6, .3], "moves": 99}})
            assert r.status_code == 200, r.text
        clock.t += 1


def test_admin_stats_sessions_filters_export(admin, app, clock):
    seed(app, clock)
    st = admin.get("/api/admin/stats").json()
    assert st["sessions"] == 4 and st["ended"] == 3
    assert st["endings"] == {"light": 1, "smoke": 1, "boom": 1}
    assert st["platforms"]["android"] == 2 and st["platforms"]["windows"] == 1
    assert st["reached_night"]["10"] == 2 and st["reached_night"]["2"] == 1
    assert st["avg_duration_s"] > 0 and st["avg_valves"] is not None
    assert "телефон (<500)" in st["screens"] and "десктоп (≥900)" in st["screens"]
    # фильтры
    ss = admin.get("/api/admin/sessions?platform=android").json()
    assert ss["total"] == 2
    assert admin.get("/api/admin/sessions?ending=boom").json()["total"] == 1
    assert admin.get("/api/admin/sessions?min_nights=10").json()["total"] == 2
    assert admin.get("/api/admin/sessions?status=playing").json()["total"] == 1
    assert admin.get("/api/admin/sessions?min_duration=500").json()["total"] >= 3
    assert admin.get("/api/admin/sessions?sort=score&dir=asc&limit=2").json()["items"].__len__() == 2
    assert admin.get("/api/admin/sessions?since=2999-01-01").json()["total"] == 0
    assert admin.get("/api/admin/sessions?min_nights=abc").status_code == 422
    assert admin.get("/api/admin/sessions?since=bad").status_code == 422
    assert admin.get("/api/admin/stats?platform=ios").json()["sessions"] == 1
    # детали
    rid = ss["items"][0]["rid"]
    d = admin.get(f"/api/admin/sessions/{rid}").json()
    assert d["events"] and d["events"][0]["type"] == "start"
    assert "<x>" not in d["ua"] and "<" not in json.dumps(d["events"])
    # CSV
    r = admin.get("/api/admin/export?what=sessions")
    assert r.headers["content-type"].startswith("text/csv") and r.text.count("\n") == 5
    assert "rid,created_at" in r.text
    assert admin.get("/api/admin/export?what=zzz").status_code == 422
    # удаление
    assert admin.delete(f"/api/admin/sessions/{rid}").status_code == 200
    assert admin.get(f"/api/admin/sessions/{rid}").status_code == 404
    assert admin.get("/api/admin/stats").json()["sessions"] == 3


def test_admin_hide_delete_score_and_csv_injection(admin, app, clock):
    cl = make_client(app, ip="10.2.0.1")
    r = submit(cl, token(cl, clock, 700), nick="=SUM(1)")
    nick = r.json()["nick"]
    sc = admin.get("/api/admin/scores").json()["items"]
    assert len(sc) == 1 and sc[0]["hidden"] == 0
    sid = sc[0]["id"]
    csv_text = admin.get("/api/admin/export?what=scores").text
    assert "=SUM" not in csv_text.replace("'=", "")                     # ведущие = + - @ экранируются
    assert admin.post(f"/api/admin/scores/{sid}/hide", json={"hidden": True}).status_code == 200
    assert cl.get("/api/g/leaderboard").json()["entries"] == []
    assert admin.post(f"/api/admin/scores/{sid}/hide", json={"hidden": False}).status_code == 200
    assert len(cl.get("/api/g/leaderboard").json()["entries"]) == 1
    assert admin.delete(f"/api/admin/scores/{sid}").status_code == 200
    assert cl.get("/api/g/leaderboard").json()["entries"] == []
    assert admin.get("/api/admin/scores").json()["total"] == 0
    assert nick


def test_purge(admin, app, clock):
    seed(app, clock)
    app.state.db.q("SELECT 1")
    with app.state.db.tx() as c:
        c.execute("UPDATE sessions SET created_at = created_at - 400*86400 WHERE rowid=1")
    assert admin.post("/api/admin/purge", json={"days": 365}).json()["sessions"] == 1
    assert admin.post("/api/admin/purge", json={"days": -1}).status_code == 422
