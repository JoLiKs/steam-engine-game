"""Хранилище API-ключей админа: шифрование Fernet (мастер-ключ — только в env-файле сервера, не в репозитории).
Ключи нигде не возвращаются в API и не пишутся в логи: наружу — только маска."""
from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken


class VaultError(Exception):
    pass


class KeyVault:
    def __init__(self, master_key: str | None):
        self._f: Fernet | None = None
        mk = (master_key or "").strip()
        if mk:
            try:
                self._f = Fernet(mk.encode())
            except Exception as e:                     # неверный формат мастер-ключа — хранилище недоступно, а не «молча без шифрования»
                raise VaultError("SEG_AI_MASTER_KEY: неверный формат (нужен ключ Fernet)") from e

    @property
    def available(self) -> bool:
        return self._f is not None

    def encrypt(self, key: str) -> str:
        if not self._f:
            raise VaultError("мастер-ключ шифрования не задан (SEG_AI_MASTER_KEY)")
        return self._f.encrypt(key.encode()).decode()

    def decrypt(self, token: str) -> str:
        if not self._f:
            raise VaultError("мастер-ключ шифрования не задан (SEG_AI_MASTER_KEY)")
        try:
            return self._f.decrypt(token.encode()).decode()
        except InvalidToken as e:
            raise VaultError("ключ не расшифровывается (сменился мастер-ключ?)") from e

    @staticmethod
    def generate() -> str:
        return Fernet.generate_key().decode()


def mask_key(key: str) -> str:
    """sk-ant-api03-AbCdEf…wXyZ → 'sk-a…wXyZ' (никогда не больше 4+4 символов)."""
    k = (key or "").strip()
    if len(k) <= 10:
        return "•" * len(k)
    return f"{k[:4]}…{k[-4:]}"
