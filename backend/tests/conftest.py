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
    return Settings(db_path=str(tmp_path / "t.db"), secret_key="k" * 48, proxy_secret=PROXY, admin_password=PASSWORD,
                    cookie_secure=False, allowed_origins=[ORIGIN], admin_origins=[ORIGIN])


@pytest.fixture()
def app(settings, clock):
    return create_app(settings, clock=clock)


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
