import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import Settings          # noqa: E402
from app.main import create_app          # noqa: E402

PROXY = "p" * 40
ORIGIN = "https://steam-engine-game.pages.dev"
PASSWORD = "test-password-123"
VECTORS = json.loads((Path(__file__).resolve().parents[2] / "tests" / "score_vectors.json").read_text())


class Clock:
    def __init__(self):
        self.t = 1_800_000_000.0

    def __call__(self):
        return self.t


@pytest.fixture()
def clock():
    return Clock()


@pytest.fixture()
def settings(tmp_path):
    from app.aicrypto import KeyVault
    return Settings(ai_master_key=KeyVault.generate(), db_path=str(tmp_path / "t.db"), secret_key="k" * 48, proxy_secret=PROXY, admin_password=PASSWORD,
                    cookie_secure=False, allowed_origins=[ORIGIN], admin_origins=[ORIGIN])


class FakeAI:
    """Подставной «интернет» для провайдеров ИИ (httpx.MockTransport): какой ключ какому хосту принадлежит, что отвечает чат."""
    def __init__(self):
        self.valid = {}                    # host -> ключ, который этот хост принимает
        self.keyless_ok = set()            # хосты, отвечающие без ключа
        self.reply = "Паровой манометр Бурдона изобрели в 1849 году, и кочегары наконец перестали гадать по звуку."
        self.reply_by_host = {}
        self.models = {}                   # host -> список id
        self.fail_hosts = {}               # host -> HTTP-статус ошибки
        self.calls = []                    # (host, method, path, headers)

    def __call__(self, request):
        import httpx
        host = request.url.host; self.calls.append((host, request.method, request.url.path, dict(request.headers), request.content))
        if host in self.fail_hosts:
            return httpx.Response(self.fail_hosts[host], json={"error": "x"})
        auth = request.headers.get("authorization", "").replace("Bearer ", "") or request.headers.get("x-api-key", "")
        if host not in self.keyless_ok and self.valid.get(host) != auth:
            return httpx.Response(401, json={"error": "bad key"})
        if request.method == "GET":
            ids = self.models.get(host, ["gpt-4o-mini", "gpt-4o", "text-embedding-3-small", "whisper-1"])
            return httpx.Response(200, json={"data": [{"id": i} for i in ids]})
        text = self.reply_by_host.get(host, self.reply)
        if host == "api.anthropic.com":
            return httpx.Response(200, json={"content": [{"type": "text", "text": text}]})
        return httpx.Response(200, json={"choices": [{"message": {"content": text}}]})


@pytest.fixture()
def fake_ai():
    return FakeAI()


@pytest.fixture()
def app(settings, clock, fake_ai):
    import httpx
    return create_app(settings, clock=clock, ai_transport=httpx.MockTransport(fake_ai), ai_background=False)


def make_client(app, ip="203.0.113.7", proxy=True):
    c = TestClient(app, base_url="http://testserver")
    if proxy:
        c.headers.update({"x-seg-proxy-secret": PROXY, "x-seg-client-ip": ip})
    return c


@pytest.fixture()
def client(app):
    return make_client(app)


@pytest.fixture()
def admin(app):
    """Клиент админа с cookie-сессией и csrf-заголовком."""
    c = make_client(app, ip="198.51.100.9")
    r = c.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": ORIGIN})
    assert r.status_code == 200, r.text
    c.headers.update({"x-csrf-token": r.json()["csrf"], "origin": ORIGIN})
    return c
