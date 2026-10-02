"""Пароль администратора, подписанная сессионная кука, CSRF-токен, хеш IP."""
from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import time
from typing import Any

from .config import Settings

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


# ---------------- пароль ----------------
def make_password_hash(password: str, salt: bytes | None = None, n: int = SCRYPT_N, r: int = SCRYPT_R, p: int = SCRYPT_P) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, dklen=32, maxmem=128 * 1024 * 1024)
    return f"scrypt${n}${r}${p}${_b64e(salt)}${_b64e(dk)}"


def verify_password_hash(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, dk = stored.split("$")
        if algo != "scrypt":
            return False
        calc = hashlib.scrypt(password.encode(), salt=_b64d(salt), n=int(n), r=int(r), p=int(p), dklen=32, maxmem=128 * 1024 * 1024)
        return hmac.compare_digest(calc, _b64d(dk))
    except Exception:
        return False


class AdminAuth:
    """Проверка пароля и выпуск/проверка подписанных сессий (без серверного хранилища, кроме списка отозванных)."""

    COOKIE_MAX_REVOKED = 1000

    def __init__(self, settings: Settings):
        self.s = settings
        self._key = settings.secret_key.encode()
        if settings.admin_password_hash:
            self._hash = settings.admin_password_hash
        elif settings.admin_password:
            self._hash = make_password_hash(settings.admin_password)   # в памяти; пароль в открытом виде не хранится дальше
        else:
            self._hash = ""
        self.enabled = bool(self._hash)
        # отпечаток пароля: при смене пароля старые сессии становятся недействительными
        self._pv = hmac.new(self._key, b"pv:" + self._hash.encode(), hashlib.sha256).hexdigest()[:12]
        self._dummy = make_password_hash("dummy-" + secrets.token_hex(4))
        self._revoked: dict[str, int] = {}

    @property
    def cookie_name(self) -> str:
        return "__Host-seg_admin" if self.s.cookie_secure else "seg_admin"

    def check_password(self, password: str) -> bool:
        # проверка выполняется всегда (даже если админка выключена) — время не зависит от результата
        stored = self._hash or self._dummy
        ok = verify_password_hash(password[:1024], stored)
        return ok and self.enabled

    def issue(self) -> tuple[str, dict[str, Any]]:
        now = int(time.time())
        payload = {"sid": secrets.token_urlsafe(12), "iat": now, "exp": now + self.s.admin_session_hours * 3600,
                   "csrf": secrets.token_urlsafe(24), "pv": self._pv}
        body = _b64e(json.dumps(payload, separators=(",", ":")).encode())
        sig = _b64e(hmac.new(self._key, b"sess:" + body.encode(), hashlib.sha256).digest())
        return f"{body}.{sig}", payload

    def parse(self, token: str | None) -> dict[str, Any] | None:
        if not token or token.count(".") != 1 or len(token) > 1024:
            return None
        body, sig = token.split(".")
        good = _b64e(hmac.new(self._key, b"sess:" + body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        try:
            p = json.loads(_b64d(body))
        except Exception:
            return None
        if not isinstance(p, dict) or int(p.get("exp", 0)) < time.time():
            return None
        if not hmac.compare_digest(str(p.get("pv", "")), self._pv) or p.get("sid") in self._revoked:
            return None
        return p

    def revoke(self, payload: dict[str, Any]) -> None:
        if len(self._revoked) > self.COOKIE_MAX_REVOKED:
            now = time.time()
            self._revoked = {k: v for k, v in self._revoked.items() if v > now}
        self._revoked[payload["sid"]] = int(payload["exp"])


# ---------------- IP / билеты ----------------
PROXY_SECRET_HEADER = "x-seg-proxy-secret"
PROXY_IP_HEADER = "x-seg-client-ip"


def proxy_verified(headers, secret: str) -> bool:
    """Запрос пришёл через наш Cloudflare Pages Worker: X-SEG-Proxy-Secret совпал с SEG_PROXY_SECRET."""
    if not secret:
        return False
    got = headers.get(PROXY_SECRET_HEADER) or ""
    return bool(got) and hmac.compare_digest(got.encode(), secret.encode())


def _valid_ip(v: str) -> str | None:
    try:
        return str(ipaddress.ip_address(v.strip()))
    except ValueError:
        return None


LOOPBACK = ("127.0.0.1", "::1")


def client_ip(headers, peer: str | None, proxy_secret: str) -> str:
    """Реальный адрес клиента: X-SEG-Client-IP — только при верном секрете прокси (Pages Worker); X-Real-IP — только если соединение
    пришло с loopback (то есть от нашего nginx, который сам его выставляет и затирает клиентский); иначе — адрес соединения."""
    if proxy_verified(headers, proxy_secret):
        ip = _valid_ip(headers.get(PROXY_IP_HEADER) or "")
        if ip:
            return ip
    if peer in LOOPBACK:
        ip = _valid_ip(headers.get("x-real-ip") or "")
        if ip:
            return ip
    return peer or "unknown"


def hash_ip(ip: str, secret: str, day: int | None = None) -> str:
    """IP не хранится: только HMAC с суточным вращением (разные сутки — разные хеши, связать нельзя)."""
    d = str(day if day is not None else int(time.time() // 86400))
    return hmac.new(secret.encode(), f"ip:{d}:{ip}".encode(), hashlib.sha256).hexdigest()[:16]


def hash_pid(pid: str, secret: str) -> str:
    return hmac.new(secret.encode(), f"pid:{pid}".encode(), hashlib.sha256).hexdigest()[:20]


class Tickets:
    """Подписанный билет прохождения: rid + время выдачи. Ничего не хранится на сервере до первого события/результата."""

    def __init__(self, secret: str, ttl: int):
        self._key, self.ttl = secret.encode(), ttl

    def issue(self, now: float | None = None) -> str:
        now = int(now if now is not None else time.time())
        body = _b64e(json.dumps({"r": secrets.token_hex(8), "t": now}, separators=(",", ":")).encode())
        sig = _b64e(hmac.new(self._key, b"tk:" + body.encode(), hashlib.sha256).digest())[:22]
        return f"{body}.{sig}"

    def parse(self, token, now: float | None = None) -> dict[str, Any] | None:
        if not isinstance(token, str) or token.count(".") != 1 or len(token) > 200:
            return None
        body, sig = token.split(".")
        good = _b64e(hmac.new(self._key, b"tk:" + body.encode(), hashlib.sha256).digest())[:22]
        if not hmac.compare_digest(sig, good):
            return None
        try:
            p = json.loads(_b64d(body))
            rid, t = str(p["r"]), int(p["t"])
        except Exception:
            return None
        now = now if now is not None else time.time()
        if not re.fullmatch(r"[0-9a-f]{16}", rid) or t > now + 5 or now - t > self.ttl:
            return None
        return {"rid": rid, "iat": t}
