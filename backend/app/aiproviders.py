"""Таблица провайдеров ИИ: определение по формату ключа (сигнатуры), пробный запрос к /models, выбор модели, вызов чата.
Адреса провайдеров зашиты в таблицу (админ вводит только ключ) — произвольные URL не принимаются (нет SSRF)."""
from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

import httpx

UA = "last-boiler-ai/1.2"


@dataclass(frozen=True)
class Spec:
    id: str
    name: str
    base: str
    kind: str = "openai"                    # openai | anthropic
    models_path: str | None = "/models"     # None — у провайдера нет /models: проверяем пробным чатом
    default_model: str = ""
    prefer: tuple[str, ...] = ()            # регэкспы по приоритету: какую модель взять из списка
    keyless: bool = False
    models: tuple[str, ...] = ()            # для бесключевых: запасные модели по очереди


SPECS: dict[str, Spec] = {s.id: s for s in [
    Spec("openai", "OpenAI", "https://api.openai.com/v1", default_model="gpt-4o-mini", prefer=(r"^gpt-4o-mini$", r"^gpt-4\.1-mini$", r"^gpt-4\.1-nano$", r"^gpt-3\.5-turbo$", r"^gpt-4o$")),
    Spec("anthropic", "Anthropic (Claude)", "https://api.anthropic.com/v1", kind="anthropic", default_model="claude-3-5-haiku-latest", prefer=(r"haiku", r"sonnet")),
    Spec("google", "Google Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", default_model="gemini-2.0-flash", prefer=(r"gemini-2\.0-flash$", r"gemini-2\.5-flash$", r"gemini-1\.5-flash$", r"flash")),
    Spec("groq", "Groq", "https://api.groq.com/openai/v1", default_model="llama-3.1-8b-instant", prefer=(r"^llama-3\.3-70b-versatile$", r"^llama-3\.1-8b-instant$", r"llama")),
    Spec("openrouter", "OpenRouter", "https://openrouter.ai/api/v1", default_model="meta-llama/llama-3.3-70b-instruct:free", prefer=(r"llama-3\.3-70b-instruct:free$", r"(llama|gemma|mistral|qwen).*:free$", r":free$", r"^openai/gpt-4o-mini$")),
    Spec("xai", "xAI (Grok)", "https://api.x.ai/v1", default_model="grok-3-mini", prefer=(r"grok-3-mini$", r"grok-3-mini", r"grok")),
    Spec("mistral", "Mistral AI", "https://api.mistral.ai/v1", default_model="mistral-small-latest", prefer=(r"^mistral-small-latest$", r"^open-mistral-nemo$", r"ministral", r"mistral-small")),
    Spec("deepseek", "DeepSeek", "https://api.deepseek.com/v1", default_model="deepseek-chat", prefer=(r"^deepseek-chat$",)),
    Spec("together", "Together AI", "https://api.together.xyz/v1", default_model="meta-llama/Llama-3.3-70B-Instruct-Turbo", prefer=(r"Llama-3\.3-70B-Instruct-Turbo-Free$", r"Llama-3\.3-70B-Instruct-Turbo$", r"Llama-3\.1-8B-Instruct-Turbo$", r"Instruct")),
    Spec("cerebras", "Cerebras", "https://api.cerebras.ai/v1", default_model="llama3.1-8b", prefer=(r"^llama3\.1-8b$", r"^llama-3\.3-70b$", r"llama")),
    Spec("perplexity", "Perplexity", "https://api.perplexity.ai", models_path=None, default_model="sonar", prefer=()),
    Spec("fireworks", "Fireworks AI", "https://api.fireworks.ai/inference/v1", default_model="accounts/fireworks/models/llama-v3p3-70b-instruct", prefer=(r"llama-v3p3-70b-instruct$", r"llama-v3p1-8b-instruct$", r"instruct")),
    Spec("nvidia", "NVIDIA NIM", "https://integrate.api.nvidia.com/v1", default_model="meta/llama-3.1-8b-instruct", prefer=(r"^meta/llama-3\.1-8b-instruct$", r"llama-3\.3-70b-instruct$", r"instruct")),
    Spec("huggingface", "Hugging Face Inference", "https://router.huggingface.co/v1", default_model="meta-llama/Llama-3.1-8B-Instruct", prefer=(r"Llama-3\.1-8B-Instruct$", r"Instruct")),
    Spec("moonshot", "Moonshot (Kimi)", "https://api.moonshot.cn/v1", default_model="moonshot-v1-8k", prefer=(r"^moonshot-v1-8k$", r"moonshot")),
    Spec("siliconflow", "SiliconFlow", "https://api.siliconflow.cn/v1", default_model="Qwen/Qwen2.5-7B-Instruct", prefer=(r"^Qwen/Qwen2\.5-7B-Instruct$", r"Instruct")),
    Spec("dashscope", "Alibaba Qwen (DashScope)", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", default_model="qwen-turbo", prefer=(r"^qwen-turbo$", r"^qwen-plus$", r"qwen")),
    Spec("cohere", "Cohere", "https://api.cohere.ai/compatibility/v1", default_model="command-r7b-12-2024", prefer=(r"command-r7b", r"command-r$", r"command")),
    Spec("github", "GitHub Models", "https://models.github.ai/inference", models_path=None, default_model="openai/gpt-4o-mini", prefer=()),
    # бесключевые (из платформы free-ai-hub): работают с сервера без ключа
    Spec("ovh", "OVHcloud AI Endpoints (без ключа)", "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", keyless=True, models_path=None, default_model="Mistral-Small-3.2-24B-Instruct-2506",
         models=("Mistral-Small-3.2-24B-Instruct-2506", "Meta-Llama-3_3-70B-Instruct", "gpt-oss-20b")),
    Spec("chat", "ch.at (без ключа)", "https://ch.at/v1", keyless=True, models_path=None, default_model="gpt-4o", models=("gpt-4o",)),
    Spec("llm7", "LLM7.io (без ключа)", "https://api.llm7.io/v1", keyless=True, models_path=None, default_model="mistral-Nemo-Instruct-2407", models=("mistral-Nemo-Instruct-2407", "codestral-latest")),
    Spec("pollinations", "Pollinations (без ключа)", "https://text.pollinations.ai/openai", keyless=True, models_path=None, default_model="openai-fast", models=("openai-fast",)),
]}

# (регэксп формата ключа, [кандидаты], «однозначно?»). Для неоднозначных — пробный запрос к /models каждого кандидата.
SIGNATURES: list[tuple[re.Pattern, list[str], bool]] = [(re.compile(p), c, u) for p, c, u in [
    (r"^sk-ant-", ["anthropic"], True),
    (r"^sk-or-", ["openrouter"], True),
    (r"^gsk_", ["groq"], True),
    (r"^xai-", ["xai"], True),
    (r"^AIza[0-9A-Za-z_\-]{30,}$", ["google"], True),
    (r"^csk-", ["cerebras"], True),
    (r"^pplx-", ["perplexity"], True),
    (r"^fw_", ["fireworks"], True),
    (r"^nvapi-", ["nvidia"], True),
    (r"^hf_[A-Za-z0-9]{20,}$", ["huggingface"], True),
    (r"^tgp_v1_", ["together"], True),
    (r"^(ghp_|gho_|github_pat_)", ["github"], True),
    (r"^sk-(proj|svcacct|admin)-", ["openai"], True),
    (r"^sk-[0-9a-f]{32}$", ["deepseek", "dashscope"], False),          # оба выдают sk-+32 hex
    (r"^sk-[A-Za-z0-9]{48}$", ["openai", "moonshot", "siliconflow"], False),
    (r"^sk-[A-Za-z0-9_\-]{20,}$", ["openai", "moonshot", "siliconflow", "deepseek", "dashscope"], False),
    (r"^[0-9a-f]{64}$", ["together"], False),
    (r"^[A-Za-z0-9]{40}$", ["cohere"], False),
    (r"^[A-Za-z0-9]{32}$", ["mistral"], False),
]]
UNKNOWN_CANDIDATES = ["openai", "mistral", "together", "groq", "deepseek", "openrouter", "xai", "cerebras", "fireworks"]


def candidates(key: str) -> tuple[list[str], bool]:
    """Кандидаты в провайдеры по формату ключа и признак однозначности."""
    k = (key or "").strip()
    for rx, cands, unique in SIGNATURES:
        if rx.search(k):
            return list(cands), unique
    return list(UNKNOWN_CANDIDATES), False


def valid_key_format(key: str) -> bool:
    return isinstance(key, str) and 16 <= len(key.strip()) <= 400 and re.fullmatch(r"[A-Za-z0-9_\-.:/+=]+", key.strip()) is not None


class ProviderError(Exception):
    """Ошибка обращения к провайдеру; сообщение безопасно показывать админу (без ключа)."""
    def __init__(self, msg: str, status: int | None = None):
        super().__init__(msg)
        self.status = status


def _safe(msg: str, key: str | None) -> str:
    msg = str(msg)
    if key:
        msg = msg.replace(key, "***")
    return re.sub(r"(sk-|gsk_|xai-|AIza|csk-|pplx-|nvapi-|hf_)[A-Za-z0-9_\-]{8,}", r"\1***", msg)[:200]


def _headers(spec: Spec, key: str | None) -> dict[str, str]:
    h = {"user-agent": UA, "accept": "application/json"}
    if spec.kind == "anthropic":
        h["x-api-key"] = key or ""; h["anthropic-version"] = "2023-06-01"
    elif key:
        h["authorization"] = "Bearer " + key
    return h


BAD_MODEL = re.compile(r"embed|whisper|tts|speech|audio|image|vision-only|moderation|guard|rerank|dall-e|stable-diffusion|transcrib|realtime|imagen|veo|sora|davinci-00|babbage|computer-use|search|instruct-\d{4}-\d{2}-\d{2}$", re.I)


def pick_model(spec: Spec, ids: list[str]) -> str:
    ids = [i for i in ids if isinstance(i, str) and i and not BAD_MODEL.search(i)]
    for rx in spec.prefer:
        hits = sorted([i for i in ids if re.search(rx, i)], reverse=True)       # самые новые версии — по убыванию имени
        if hits:
            return hits[0]
    if spec.default_model and (not ids or spec.default_model in ids):
        return spec.default_model
    return ids[0] if ids else spec.default_model


def _client(transport: Any | None, timeout: float) -> httpx.Client:
    return httpx.Client(transport=transport, timeout=httpx.Timeout(timeout, connect=min(timeout, 5.0)), follow_redirects=False)


def list_models(spec: Spec, key: str | None, transport=None, timeout: float = 8.0) -> list[str]:
    if not spec.models_path:
        return []
    with _client(transport, timeout) as c:
        try:
            r = c.get(spec.base + spec.models_path, headers=_headers(spec, key))
        except httpx.HTTPError as e:
            raise ProviderError("нет связи с провайдером: " + _safe(type(e).__name__, key)) from None
    if r.status_code in (401, 403):
        raise ProviderError("ключ не принят провайдером (%d)" % r.status_code, r.status_code)
    if r.status_code != 200:
        raise ProviderError("провайдер ответил %d" % r.status_code, r.status_code)
    try:
        j = r.json()
    except ValueError:
        raise ProviderError("ответ провайдера не похож на список моделей") from None
    arr = j.get("data") if isinstance(j, dict) else j
    if not isinstance(arr, list):
        raise ProviderError("ответ провайдера не похож на список моделей")
    out = []
    for m in arr:
        mid = m.get("id") if isinstance(m, dict) else m
        if isinstance(mid, str):
            out.append(mid[len("models/"):] if mid.startswith("models/") else mid)
    return out


def chat(spec: Spec, key: str | None, model: str, system: str, user: str, max_tokens: int = 220, temperature: float = 0.8, transport=None, timeout: float = 12.0) -> str:
    """Один вызов чата. Возвращает «сырой» текст ответа (санитизация — снаружи). Бросает ProviderError."""
    with _client(transport, timeout) as c:
        try:
            if spec.kind == "anthropic":
                r = c.post(spec.base + "/messages", headers={**_headers(spec, key), "content-type": "application/json"},
                           json={"model": model, "max_tokens": max_tokens, "temperature": temperature, "system": system, "messages": [{"role": "user", "content": user}]})
            else:
                body: dict[str, Any] = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": temperature}
                body["max_completion_tokens" if re.match(r"^(o\d|gpt-5)", model) else "max_tokens"] = max_tokens
                r = c.post(spec.base + "/chat/completions" if spec.id != "pollinations" else spec.base, headers={**_headers(spec, key), "content-type": "application/json"}, json=body)
        except httpx.HTTPError as e:
            raise ProviderError("нет связи с провайдером: " + _safe(type(e).__name__, key)) from None
    if r.status_code in (401, 403):
        raise ProviderError("ключ не принят (%d)" % r.status_code, r.status_code)
    if r.status_code == 429:
        raise ProviderError("лимит провайдера (429)", 429)
    if r.status_code >= 400:
        raise ProviderError("провайдер ответил %d" % r.status_code, r.status_code)
    try:
        j = r.json()
        if spec.kind == "anthropic":
            return "".join(b.get("text", "") for b in j.get("content", []) if isinstance(b, dict))
        msg = j["choices"][0]["message"]
        return msg.get("content") or ""
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        raise ProviderError("неожиданный формат ответа провайдера") from None


@dataclass
class Identified:
    spec_id: str
    model: str
    models_found: int = 0
    errors: dict[str, str] = field(default_factory=dict)


def identify(key: str, transport=None, timeout: float = 8.0) -> Identified:
    """Определяет провайдера по ключу: сигнатура → (для неоднозначных) пробный запрос ко всем кандидатам параллельно.
    Бросает ProviderError, если ключ не подошёл никому."""
    k = key.strip()
    cands, unique = candidates(k)

    def probe(sid: str) -> tuple[str, Identified | None, str]:
        spec = SPECS[sid]
        try:
            if spec.models_path:
                ids = list_models(spec, k, transport, timeout)
                return sid, Identified(sid, pick_model(spec, ids), len(ids)), ""
            chat(spec, k, spec.default_model, "Ответь одним словом.", "Привет", max_tokens=8, temperature=0, transport=transport, timeout=timeout)
            return sid, Identified(sid, spec.default_model, 0), ""
        except ProviderError as e:
            return sid, None, str(e)

    with ThreadPoolExecutor(max_workers=min(6, len(cands))) as ex:
        results = list(ex.map(probe, cands))
    errors = {sid: err for sid, ident, err in results if ident is None}
    for sid, ident, _ in results:          # порядок кандидатов = приоритет при совпадении
        if ident:
            ident.errors = errors
            return ident
    if unique:
        raise ProviderError("%s: %s" % (SPECS[cands[0]].name, errors.get(cands[0], "ключ не принят")))
    raise ProviderError("не удалось определить провайдера: ключ не принят ни одним из %d проверенных сервисов (%s)" % (len(cands), ", ".join(SPECS[c].name for c in cands[:4]) + ("…" if len(cands) > 4 else "")))
