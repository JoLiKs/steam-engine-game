"""Прямой доступ к публичному API с GitHub Pages (без Cloudflare Worker): только /api/g/*, только с доверенного Origin; админка — никогда."""
import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.security import client_ip
from conftest import ORIGIN, PASSWORD, PROXY

GH = "https://joliks.github.io"


@pytest.fixture()
def direct(tmp_path, clock, fake_ai):
    st = Settings(db_path=str(tmp_path / "d.db"), secret_key="k" * 48, proxy_secret=PROXY, admin_password=PASSWORD, cookie_secure=False,
                  allowed_origins=[ORIGIN, GH], direct_origins=[GH], admin_origins=[ORIGIN])
    app = create_app(st, clock=clock, ai_transport=httpx.MockTransport(fake_ai), ai_background=False)
    return TestClient(app, base_url="http://testserver")      # без секрета прокси — как браузер с github.io


def test_direct_get_endpoints_with_trusted_origin_and_cors_headers(direct):
    for p in ("/api/g/leaderboard?board=score", "/api/g/note?s=calm&n=1"):
        r = direct.get(p, headers={"origin": GH})
        assert r.status_code == 200, (p, r.text)
        assert r.headers["access-control-allow-origin"] == GH and r.headers["vary"] == "Origin"


def test_direct_preflight_for_post(direct):
    r = direct.options("/api/g/run", headers={"origin": GH, "access-control-request-method": "POST", "access-control-request-headers": "content-type"})
    assert r.status_code == 204 and r.headers["access-control-allow-origin"] == GH and "POST" in r.headers["access-control-allow-methods"]
    assert direct.options("/api/g/run", headers={"origin": "https://evil.example"}).status_code == 403


def test_direct_post_run_ticket_works(direct):
    r = direct.post("/api/g/run", json={}, headers={"origin": GH})
    assert r.status_code == 200 and r.json().get("token"), r.text


def test_direct_denied_without_origin_or_with_foreign_origin(direct):
    assert direct.get("/api/g/leaderboard").status_code == 403
    assert direct.get("/api/g/leaderboard", headers={"origin": "https://evil.example"}).status_code == 403
    assert direct.get("/api/g/leaderboard", headers={"origin": ORIGIN}).status_code == 403, "pages.dev ходит только через Worker (в direct_origins его нет)"


def test_direct_never_reaches_admin_or_other_paths(direct):
    for m, p in (("GET", "/api/admin/stats"), ("POST", "/api/admin/login"), ("GET", "/api/admin/ai"), ("GET", "/admin/panel/"), ("GET", "/api/admin/export?what=scores")):
        r = direct.request(m, p, headers={"origin": GH}, json={"password": PASSWORD} if m == "POST" else None)
        assert r.status_code == 403, (p, r.status_code)
    assert direct.get("/api/health").status_code == 200


def test_direct_other_methods_denied(direct):
    assert direct.delete("/api/g/leaderboard", headers={"origin": GH}).status_code in (403, 405)
    assert direct.put("/api/g/run", headers={"origin": GH}).status_code in (403, 405)


def test_direct_disabled_by_default(app):
    assert TestClient(app, base_url="http://testserver").get("/api/g/leaderboard", headers={"origin": GH}).status_code == 403


def test_x_real_ip_only_trusted_from_loopback():
    h = {"x-real-ip": "198.51.100.5"}
    assert client_ip(h, "127.0.0.1", PROXY) == "198.51.100.5" and client_ip(h, "::1", PROXY) == "198.51.100.5"
    assert client_ip(h, "203.0.113.9", PROXY) == "203.0.113.9", "с внешнего адреса X-Real-IP игнорируется"
    assert client_ip({"x-real-ip": "garbage"}, "127.0.0.1", PROXY) == "127.0.0.1"
    assert client_ip({"x-real-ip": "198.51.100.5", "x-seg-proxy-secret": PROXY, "x-seg-client-ip": "192.0.2.1"}, "127.0.0.1", PROXY) == "192.0.2.1", "Worker приоритетнее"


def test_settings_from_env():
    s = Settings.from_env({"SEG_DIRECT_ORIGINS": "https://joliks.github.io/, https://x.example", "SEG_ALLOWED_ORIGINS": "https://joliks.github.io"})
    assert s.direct_origins == ["https://joliks.github.io", "https://x.example"] and Settings.from_env({}).direct_origins == []
