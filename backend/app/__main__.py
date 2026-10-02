import uvicorn

from .config import Settings
from .main import create_app

s = Settings.from_env()
app = create_app(s)
if __name__ == "__main__":
    uvicorn.run(app, host=s.host, port=s.port, log_level="warning", access_log=False, proxy_headers=False, server_header=False)
