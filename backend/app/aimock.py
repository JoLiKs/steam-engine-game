"""Подставной «интернет» для провайдеров ИИ — ТОЛЬКО для локальных e2e-тестов (SEG_AI_MOCK=1). На сервере не включается."""
import httpx

NOTES = ("Манометр Бурдона изобрели в 1849 году, и кочегары наконец перестали гадать по звуку.\n"
         "Хороший котёл любит ровный огонь: уголь по чуть-чуть, давление — в зелёной зоне.\n"
         "Паровые машины XIX века двигали фабрики, поезда и корабли, а мастера ценили тех, кто умел слушать трубы.")
GROQ_KEY_PREFIX = "gsk_"


def handler(request: httpx.Request) -> httpx.Response:
    host = request.url.host
    auth = request.headers.get("authorization", "").replace("Bearer ", "")
    if host == "api.groq.com":
        if not auth.startswith(GROQ_KEY_PREFIX):
            return httpx.Response(401, json={"error": "bad key"})
        if request.method == "GET":
            return httpx.Response(200, json={"data": [{"id": "llama-3.3-70b-versatile"}, {"id": "whisper-large-v3"}]})
    elif host in ("ch.at", "api.llm7.io", "text.pollinations.ai", "oai.endpoints.kepler.ai.cloud.ovh.net"):
        if request.method == "GET":
            return httpx.Response(200, json={"data": [{"id": "gpt-4o"}]})
    else:
        return httpx.Response(401, json={"error": "unknown host"})
    return httpx.Response(200, json={"choices": [{"message": {"content": NOTES}}]})


def transport() -> httpx.MockTransport:
    return httpx.MockTransport(handler)
