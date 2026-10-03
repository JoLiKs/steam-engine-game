"""ИИ-комментатор: сервис заметок механика + управление провайдерами (для админки).
Браузер ключей не видит и ИИ не вызывает: игра просит у бэкенда готовую заметку, бэкенд ходит к ИИ сам."""
from __future__ import annotations

import json
import random
import secrets
import threading
import time
from collections import deque
from typing import Any, Callable

from . import aiproviders as P
from .aicrypto import KeyVault, VaultError, mask_key
from .ainotes import (DEFAULT_SETTINGS, FREQ, LENGTHS, SITUATIONS, build_prompt, clean_note, clean_settings, fallback_note, split_notes)

SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,            -- kind: own | builtin
  spec_id TEXT NOT NULL, model TEXT NOT NULL,
  key_enc TEXT, key_mask TEXT,
  prio INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'new', last_error TEXT, last_ok_at INTEGER, last_check_at INTEGER,
  fails INTEGER NOT NULL DEFAULT 0, cooldown_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0
);
"""
BUILTINS = [("b-ovh", "ovh", 1000), ("b-chat", "chat", 1010), ("b-llm7", "llm7", 1020), ("b-pollinations", "pollinations", 1030)]


class AiError(Exception):
    def __init__(self, msg: str, code: int = 400):
        super().__init__(msg)
        self.code = code


class AiService:
    MAX_IP_KEYS = 20000                           # жёсткий потолок таблицы лимитов по IP (защита памяти)

    def __init__(self, db, vault: KeyVault, clock: Callable[[], float] = time.time, transport: Any = None,
                 gen_per_hour: int = 40, ip_gap_s: float = 20.0, ip_per_hour: int = 24, pool_ttl_s: int = 6 * 3600, background: bool = True):
        self.db, self.vault, self.clock, self.transport = db, vault, clock, transport
        self.gen_per_hour, self.ip_gap_s, self.ip_per_hour, self.pool_ttl_s, self.background = gen_per_hour, ip_gap_s, ip_per_hour, pool_ttl_s, background
        self.rng = random.Random()
        self._lock = threading.RLock()
        self.pool: dict[str, deque] = {}              # ситуация → заметки {text, ts, src, provider}
        self.served: deque[str] = deque(maxlen=40)    # недавно показанные тексты (не повторяем подряд)
        self.generating: set[str] = set()
        self.gen_times: deque[float] = deque()
        self.ip_hits: dict[str, deque] = {}
        self.stats = {"served_ai": 0, "served_fallback": 0, "generated": 0, "gen_failed": 0, "rate_limited": 0}
        db._c.executescript(SCHEMA)
        self._seed()

    # ------------------------------------------------------------ настройки
    def settings(self) -> dict:
        row = self.db.one("SELECT v FROM meta WHERE k='ai_settings'")
        cur = dict(DEFAULT_SETTINGS)
        if row:
            try:
                cur = clean_settings(json.loads(row["v"]), cur)
            except (ValueError, TypeError):
                pass
        return cur

    def save_settings(self, d: dict) -> dict:
        try:
            new = clean_settings(d, self.settings())
        except ValueError as e:
            raise AiError(f"неверное значение: {e}", 422) from None
        with self.db.tx() as c:
            c.execute("INSERT INTO meta(k,v) VALUES('ai_settings',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (json.dumps(new, ensure_ascii=False),))
        with self._lock:
            self.pool.clear()                          # смена темы/стиля/длины — старые заметки не подходят
        return new

    # ------------------------------------------------------------ провайдеры
    def _seed(self) -> None:
        now = int(self.clock())
        for pid, sid, prio in BUILTINS:
            if not self.db.one("SELECT id FROM ai_providers WHERE id=?", (pid,)):
                sp = P.SPECS[sid]
                with self.db.tx() as c:
                    c.execute("INSERT INTO ai_providers(id,name,kind,spec_id,model,prio,enabled,created_at) VALUES(?,?,?,?,?,?,1,?)", (pid, sp.name, "builtin", sid, sp.default_model, prio, now))

    def _public(self, r: dict) -> dict:
        """Описание провайдера для админки: БЕЗ ключа (только маска)."""
        sp = P.SPECS.get(r["spec_id"])
        return {"id": r["id"], "name": r["name"], "kind": r["kind"], "provider": sp.name if sp else r["spec_id"], "spec_id": r["spec_id"], "model": r["model"],
                "key_mask": r["key_mask"] or "", "prio": r["prio"], "enabled": bool(r["enabled"]), "status": r["status"], "last_error": r["last_error"] or "",
                "last_ok_at": r["last_ok_at"], "last_check_at": r["last_check_at"], "cooling_down": r["cooldown_until"] > self.clock(), "uses": r["uses"], "fails": r["fails"]}

    def providers(self) -> list[dict]:
        return [self._public(r) for r in self.db.q("SELECT * FROM ai_providers ORDER BY prio, created_at")]

    def add_provider(self, key: str, name: str = "") -> dict:
        key = (key or "").strip()
        if not self.vault.available:
            raise AiError("шифрование ключей не настроено на сервере (SEG_AI_MASTER_KEY) — ключ не сохранён", 503)
        if not P.valid_key_format(key):
            raise AiError("ключ выглядит неправильно (16–400 символов: латиница, цифры, - _ . : / + =)", 422)
        for r in self.db.q("SELECT key_enc FROM ai_providers WHERE kind='own'"):
            try:
                if self.vault.decrypt(r["key_enc"]) == key:
                    raise AiError("такой ключ уже добавлен", 409)
            except VaultError:
                pass
        try:
            ident = P.identify(key, self.transport)
        except P.ProviderError as e:
            raise AiError(str(e), 422) from None
        spec = P.SPECS[ident.spec_id]
        nm = (name or "").strip()[:40] or spec.name
        nm = "".join(ch for ch in nm if ch.isprintable() and ch not in "<>")[:40] or spec.name
        pid = "k-" + secrets.token_hex(4)
        m = (self.db.one("SELECT MIN(prio) AS m FROM ai_providers WHERE kind='own'") or {}).get("m")
        prio = 500 if m is None else m - 10                                  # свои ключи — выше бесплатных (1000+); новый — первым
        now = int(self.clock())
        with self.db.tx() as c:
            c.execute("INSERT INTO ai_providers(id,name,kind,spec_id,model,key_enc,key_mask,prio,enabled,status,last_ok_at,last_check_at,created_at) VALUES(?,?,?,?,?,?,?,?,1,'ok',?,?,?)",
                      (pid, nm, "own", ident.spec_id, ident.model, self.vault.encrypt(key), mask_key(key), prio, now, now, now))
        out = self._public(self.db.one("SELECT * FROM ai_providers WHERE id=?", (pid,)))
        out["detected"] = {"provider": spec.name, "model": ident.model, "models_found": ident.models_found}
        return out

    def _row(self, pid: str) -> dict:
        r = self.db.one("SELECT * FROM ai_providers WHERE id=?", (pid,))
        if not r:
            raise AiError("провайдер не найден", 404)
        return r

    def delete_provider(self, pid: str) -> None:
        r = self._row(pid)
        if r["kind"] == "builtin":
            raise AiError("встроенный бесплатный провайдер нельзя удалить — только выключить", 409)
        with self.db.tx() as c:
            c.execute("DELETE FROM ai_providers WHERE id=?", (pid,))

    def update_provider(self, pid: str, d: dict) -> dict:
        self._row(pid)
        with self.db.tx() as c:
            if "enabled" in d:
                if not isinstance(d["enabled"], bool):
                    raise AiError("enabled", 422)
                c.execute("UPDATE ai_providers SET enabled=? WHERE id=?", (int(d["enabled"]), pid))
            if "name" in d:
                if not isinstance(d["name"], str):
                    raise AiError("name", 422)
                nm = "".join(ch for ch in d["name"] if ch.isprintable() and ch not in "<>").strip()[:40]
                if nm:
                    c.execute("UPDATE ai_providers SET name=? WHERE id=?", (nm, pid))
            if "model" in d:
                if not isinstance(d["model"], str) or not 1 <= len(d["model"]) <= 120 or not all(ch.isprintable() and ch not in " <>\"'" for ch in d["model"]):
                    raise AiError("model", 422)
                c.execute("UPDATE ai_providers SET model=? WHERE id=?", (d["model"], pid))
        return self._public(self._row(pid))

    def reorder(self, ids: list[str]) -> list[dict]:
        known = {r["id"] for r in self.db.q("SELECT id FROM ai_providers")}
        if not isinstance(ids, list) or not ids or any((not isinstance(i, str)) or i not in known for i in ids) or len(set(ids)) != len(ids):
            raise AiError("неверный список порядка", 422)
        rest = [r["id"] for r in self.db.q("SELECT id FROM ai_providers ORDER BY prio, created_at") if r["id"] not in ids]
        with self.db.tx() as c:
            for n, pid in enumerate(ids + rest):
                c.execute("UPDATE ai_providers SET prio=? WHERE id=?", ((n + 1) * 10, pid))
        return self.providers()

    # ------------------------------------------------------------ вызов ИИ
    def _call_provider(self, r: dict, system: str, user: str, max_tokens: int, timeout: float) -> str:
        sp = P.SPECS[r["spec_id"]]
        key = None
        if r["kind"] == "own":
            try:
                key = self.vault.decrypt(r["key_enc"])
            except VaultError as e:
                raise P.ProviderError(str(e)) from None
        models = [r["model"]] + [m for m in sp.models if m != r["model"]] if sp.keyless else [r["model"]]
        last: P.ProviderError | None = None
        for model in models[:3]:
            try:
                return P.chat(sp, key, model, system, user, max_tokens=max_tokens, transport=self.transport, timeout=timeout)
            except P.ProviderError as e:
                last = e
                if e.status in (401, 403):
                    break
        raise last or P.ProviderError("нет ответа")

    def _mark(self, pid: str, ok: bool, err: str = "") -> None:
        now = int(self.clock())
        with self.db.tx() as c:
            if ok:
                c.execute("UPDATE ai_providers SET status='ok', last_error=NULL, last_ok_at=?, fails=0, cooldown_until=0, uses=uses+1 WHERE id=?", (now, pid))
            else:
                f = (self.db.one("SELECT fails FROM ai_providers WHERE id=?", (pid,)) or {"fails": 0})["fails"] + 1
                c.execute("UPDATE ai_providers SET status='error', last_error=?, fails=?, cooldown_until=? WHERE id=?", (err[:200], f, now + min(900, 60 * f), pid))

    def _chain(self, only: str | None = None) -> list[dict]:
        now = self.clock()
        rows = self.db.q("SELECT * FROM ai_providers WHERE enabled=1 ORDER BY prio, created_at")
        if only:
            return [r for r in rows if r["id"] == only] or [self._row(only)]
        return [r for r in rows if r["cooldown_until"] <= now]

    def generate(self, situation: str, night: int, count: int = 1, only: str | None = None, deadline_s: float = 28.0) -> tuple[list[str], dict]:
        """Цепочка фолбэков: свои ключи по приоритету → бесплатные. Возвращает (заметки, {provider, ms}) или ([], {error})."""
        st = self.settings()
        maxlen = LENGTHS[st["length"]]
        system, user = build_prompt(st, situation, night, count)
        t_end = time.monotonic() + deadline_s
        errors = []
        for r in self._chain(only):
            left = t_end - time.monotonic()
            if left < 3:
                break
            t0 = time.monotonic()
            try:
                raw = self._call_provider(r, system, user, 160 * count + 60, min(12.0, left))
            except P.ProviderError as e:
                self._mark(r["id"], False, str(e)); errors.append(f"{r['name']}: {e}"); continue
            except Exception as e:                                           # любой сбой провайдера не должен ронять игру
                self._mark(r["id"], False, type(e).__name__); errors.append(f"{r['name']}: {type(e).__name__}"); continue
            notes = split_notes(raw, count, maxlen) if count > 1 else ([clean_note(raw, maxlen)] if clean_note(raw, maxlen) else [])
            if notes:
                self._mark(r["id"], True)
                return notes, {"provider": r["name"], "model": r["model"], "ms": int((time.monotonic() - t0) * 1000)}
            self._mark(r["id"], False, "ответ не прошёл проверку (не по-русски/пусто/мусор)")
            errors.append(f"{r['name']}: ответ не прошёл проверку")
        return [], {"error": "; ".join(errors)[:300] or "нет доступных провайдеров"}

    def check_provider(self, pid: str) -> dict:
        r = self._row(pid)
        t0 = time.monotonic()
        now = int(self.clock())
        try:
            sp = P.SPECS[r["spec_id"]]
            raw = self._call_provider(r, "Отвечай по-русски, одним коротким предложением.", "Скажи одну короткую фразу про паровой котёл.", 80, 15.0)
            ok = bool(raw and raw.strip())
            err = "" if ok else "пустой ответ"
        except P.ProviderError as e:
            ok, err = False, str(e)
        ms = int((time.monotonic() - t0) * 1000)
        with self.db.tx() as c:
            c.execute("UPDATE ai_providers SET last_check_at=? WHERE id=?", (now, pid))
        if ok:
            self._mark(pid, True)
        else:
            self._mark(pid, False, err)
            with self.db.tx() as c:
                c.execute("UPDATE ai_providers SET cooldown_until=0 WHERE id=?", (pid,))     # ручная проверка не должна «наказывать» провайдера кулдауном
        return {"ok": ok, "error": err, "ms": ms, "model": r["model"], "provider": P.SPECS[r["spec_id"]].name}

    def sample(self, situation: str = "calm", night: int = 3) -> dict:
        if situation not in SITUATIONS:
            raise AiError("situation", 422)
        if not self._gen_budget():
            raise AiError("слишком часто — подождите", 429)
        notes, info = self.generate(situation, night, 1)
        if notes:
            return {"ok": True, "text": notes[0], **info}
        return {"ok": False, "text": fallback_note(situation, self.rng), "fallback": True, **info}

    # ------------------------------------------------------------ выдача заметок игре
    def _gen_budget(self) -> bool:
        now = self.clock()
        with self._lock:
            while self.gen_times and now - self.gen_times[0] > 3600:
                self.gen_times.popleft()
            if len(self.gen_times) >= self.gen_per_hour:
                return False
            self.gen_times.append(now)
            return True

    def _ip_ok(self, ip: str) -> tuple[bool, float]:
        now = self.clock()
        with self._lock:
            if ip not in self.ip_hits and len(self.ip_hits) >= self.MAX_IP_KEYS:
                for k in [k for k, v in self.ip_hits.items() if not v or now - v[-1] > 3600][:2000]:
                    self.ip_hits.pop(k, None)
                if len(self.ip_hits) >= self.MAX_IP_KEYS:
                    return False, 60.0                # таблица забита свежими адресами — новым отказываем, память не растёт
            q = self.ip_hits.setdefault(ip, deque())
            while q and now - q[0] > 3600:
                q.popleft()
            if q and now - q[-1] < self.ip_gap_s:
                return False, self.ip_gap_s - (now - q[-1])
            if len(q) >= self.ip_per_hour:
                return False, 3600 - (now - q[0])
            q.append(now)
            if len(self.ip_hits) > 5000:
                for k in [k for k, v in self.ip_hits.items() if not v or now - v[-1] > 3600][:2000]:
                    self.ip_hits.pop(k, None)
            return True, 0.0

    def _refill(self, situation: str, night: int) -> None:
        try:
            if not self._gen_budget():
                return
            notes, info = self.generate(situation, night, 3)
            with self._lock:
                if notes:
                    dq = self.pool.setdefault(situation, deque(maxlen=12))
                    for t in notes:
                        dq.append({"text": t, "ts": self.clock(), "src": "ai", "provider": info.get("provider")})
                    self.stats["generated"] += len(notes)
                else:
                    self.stats["gen_failed"] += 1
        finally:
            with self._lock:
                self.generating.discard(situation)

    def note(self, situation: str, night: int, ip: str) -> dict:
        """Ответ для GET /api/g/note. Никогда не ждёт ИИ: берёт из пула, а пул наполняется в фоне."""
        st = self.settings()
        if not st["enabled"]:
            return {"enabled": False}
        fq = FREQ[st["frequency"]]
        meta = {"enabled": True, "next_s": fq["gap"], "per_night": fq["per_night"]}
        if situation not in SITUATIONS:
            situation = "calm"
        ok, wait = self._ip_ok(ip)
        if not ok:
            self.stats["rate_limited"] += 1
            return {**meta, "note": None, "retry_s": int(wait) + 1}
        now = self.clock()
        with self._lock:
            dq = self.pool.get(situation)
            if dq:
                while dq and now - dq[0]["ts"] > self.pool_ttl_s:
                    dq.popleft()
            pick = None
            if dq:
                fresh = [x for x in dq if x["text"] not in self.served] or list(dq)
                pick = self.rng.choice(fresh)
                if len(fresh) <= 1 and pick in dq:
                    dq.remove(pick)           # последнюю свежую — выдаём один раз
            need = (not dq or len(dq) < 3) and situation not in self.generating
            if need:
                self.generating.add(situation)
            if pick:
                self.served.append(pick["text"]); self.stats["served_ai"] += 1
        if need:
            if self.background:
                threading.Thread(target=self._refill, args=(situation, night), daemon=True).start()
            else:
                self._refill(situation, night)
                with self._lock:
                    dq = self.pool.get(situation)
                    if not pick and dq:
                        pick = dq.popleft(); self.served.append(pick["text"]); self.stats["served_ai"] += 1
        if pick:
            return {**meta, "note": pick["text"], "src": "ai"}
        text = fallback_note(situation, self.rng, set(self.served))
        with self._lock:
            self.served.append(text); self.stats["served_fallback"] += 1
        return {**meta, "note": text, "src": "fallback"}

    def admin_state(self) -> dict:
        st = self.settings()
        return {"settings": st, "providers": self.providers(), "vault": self.vault.available, "stats": dict(self.stats),
                "options": {"length": list(LENGTHS), "frequency": {k: v for k, v in FREQ.items()}, "situations": SITUATIONS},
                "pool": {k: len(v) for k, v in self.pool.items()}}
