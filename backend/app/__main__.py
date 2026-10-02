import os

import uvicorn

from .config import Settings
from .main import create_app

s = Settings.from_env()
ai_transport = None
if os.environ.get("SEG_AI_MOCK") == "1":      # только локальные e2e-тесты: ИИ-провайдеры подменены заглушкой, наружу запросов нет
    from .aimock import transport
    ai_transport = transport()
app = create_app(s, ai_transport=ai_transport)
if __name__ == "__main__":
    uvicorn.run(app, host=s.host, port=s.port, log_level="warning", access_log=False, proxy_headers=False, server_header=False)
