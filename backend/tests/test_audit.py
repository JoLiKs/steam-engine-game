"""Тесты по аудиту (AUDIT.md): каждый сначала падал на коде 1.2, затем появилось исправление."""
import httpx
from conftest import ORIGIN, PASSWORD, make_client
from app.ai import AiService
from app.aicrypto import KeyVault
from app.db import DB
from app.main import create_app


def test_aud11_logout_survives_restart(settings, clock, fake_ai):
    """Отозванная при выходе сессия не должна оживать после перезапуска сервиса."""
    from app.security import make_password_hash
    settings.admin_password, settings.admin_password_hash = "", make_password_hash(PASSWORD)   # как в проде: хэш из окружения, одинаковый после перезапуска
    mk = lambda: create_app(settings, db=DB(settings.db_path), clock=clock, ai_transport=httpx.MockTransport(fake_ai), ai_background=False)
    app1 = mk()
    c = make_client(app1, ip="198.51.100.9")
    r = c.post("/api/admin/login", json={"password": PASSWORD}, headers={"origin": ORIGIN}); assert r.status_code == 200
    c.headers.update({"x-csrf-token": r.json()["csrf"], "origin": ORIGIN})
    cookie = c.cookies.get("seg_admin"); assert cookie
    assert c.get("/api/admin/stats").status_code == 200
    assert c.post("/api/admin/logout").status_code == 200
    app2 = mk()                                   # «перезапуск»: новый процесс, та же БД
    c2 = make_client(app2, ip="198.51.100.9")
    c2.cookies.set("seg_admin", cookie)
    assert c2.get("/api/admin/stats").status_code == 401


def test_aud12_ai_ip_table_is_bounded(settings, clock):
    """Таблица лимитов по IP не растёт без предела, даже если все записи свежие (атака с множества адресов)."""
    ai = AiService(DB(settings.db_path), KeyVault(settings.ai_master_key), clock=clock, background=False, ip_gap_s=0, ip_per_hour=1000)
    ok = 0
    for i in range(AiService.MAX_IP_KEYS + 500):
        good, _ = ai._ip_ok(f"10.{i // 65536}.{(i // 256) % 256}.{i % 256}")
        ok += good
    assert len(ai.ip_hits) <= AiService.MAX_IP_KEYS + 1
    assert ok <= AiService.MAX_IP_KEYS + 1
