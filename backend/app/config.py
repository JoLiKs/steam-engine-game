"""Настройки из переменных окружения (SEG_*). Секреты — только из env-файла сервера, не из репозитория."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

DEFAULT_ORIGIN = "https://steam-engine-game.pages.dev"


def _list(v: str | None, default: list[str]) -> list[str]:
    if v is None or not v.strip():
        return default
    return [x.strip().rstrip("/").lower() for x in v.split(",") if x.strip()]


@dataclass
class Settings:
    db_path: str = "/var/lib/steam-engine-game/seg.db"
    host: str = "127.0.0.1"
    port: int = 8932
    secret_key: str = ""                # подпись сессий/билетов и хеширование IP/player id
    proxy_secret: str = ""              # общий секрет с Cloudflare Pages Worker
    admin_password_hash: str = ""       # scrypt$...
    admin_password: str = ""            # только для тестов/локального запуска (в памяти превращается в хеш)
    allowed_origins: list[str] = field(default_factory=lambda: [DEFAULT_ORIGIN])   # CORS
    admin_origins: list[str] = field(default_factory=lambda: [DEFAULT_ORIGIN])     # откуда принимаются изменяющие запросы админки
    cookie_secure: bool = True
    admin_session_hours: int = 12
    retention_days: int = 180           # сессии/события старше — удаляются
    require_proxy: bool = True          # публичные API доступны только через наш Pages Worker (верный секрет)
    ticket_ttl_s: int = 6 * 3600
    # лимиты (на реальный IP, который сообщает Worker)
    rl_run_per_min: int = 12
    rl_event_per_min: int = 90
    rl_score_per_min: int = 4
    rl_score_per_day: int = 25
    rl_read_per_min: int = 120
    max_events_per_run: int = 80
    min_time_factor: float = 0.5        # доля суммарной длительности пройденных ночей, быстрее которой пройти нельзя

    @classmethod
    def from_env(cls, env=os.environ) -> "Settings":
        g = env.get
        s = cls()
        s.db_path = g("SEG_DB_PATH", s.db_path)
        s.host = g("SEG_HOST", s.host)
        s.port = int(g("SEG_PORT", str(s.port)))
        s.secret_key = g("SEG_SECRET_KEY", "")
        s.proxy_secret = g("SEG_PROXY_SECRET", "")
        s.admin_password_hash = g("SEG_ADMIN_PASSWORD_HASH", "")
        s.admin_password = g("SEG_ADMIN_PASSWORD", "")
        s.allowed_origins = _list(g("SEG_ALLOWED_ORIGINS"), [DEFAULT_ORIGIN])
        s.admin_origins = _list(g("SEG_ADMIN_ORIGINS"), [DEFAULT_ORIGIN])
        s.cookie_secure = g("SEG_COOKIE_SECURE", "1") not in ("0", "false", "no")
        s.retention_days = int(g("SEG_RETENTION_DAYS", str(s.retention_days)))
        s.require_proxy = g("SEG_REQUIRE_PROXY", "1") not in ("0", "false", "no")
        s.min_time_factor = float(g("SEG_MIN_TIME_FACTOR", str(s.min_time_factor)))   # 0 — только для локальных e2e-тестов
        s.rl_score_per_min = int(g("SEG_RL_SCORE_PER_MIN", str(s.rl_score_per_min)))
        return s

    def validate(self) -> None:
        if len(self.secret_key) < 32:
            raise SystemExit("SEG_SECRET_KEY должен быть не короче 32 символов")
        if self.require_proxy and len(self.proxy_secret) < 32:
            raise SystemExit("SEG_PROXY_SECRET должен быть не короче 32 символов")
