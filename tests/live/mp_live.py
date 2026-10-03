"""Живая проверка мультиплеера на проде: два бота-клиента по wss с разных разрешённых origin, плохой origin отклоняется.
Запуск: python tests/live/mp_live.py   (нужен пакет websockets). Ничего не пишет в БД, комнаты живут только в памяти."""
import asyncio, json, sys
import websockets

URL = "wss://185-255-133-179.sslip.io/steam/ws"
GH, PG = "https://joliks.github.io", "https://steam-engine-game.pages.dev"
fails = 0
def ok(c, m):
    global fails
    print(("  ✓ " if c else "  ✗ ") + m); fails += (not c)

async def recv(ws, kind, n=60):
    for _ in range(n):
        m = json.loads(await asyncio.wait_for(ws.recv(), 10))
        if m["t"] == kind: return m
    raise AssertionError(kind)

async def main():
    for bad in ("https://evil.example", "http://steam-engine-game.pages.dev"):
        try:
            async with websockets.connect(URL, origin=bad) as ws:
                await ws.send('{"t":"ping"}'); await asyncio.wait_for(ws.recv(), 3); ok(False, "чужой origin принят: " + bad)
        except Exception as e:
            ok(True, f"чужой origin отклонён ({bad}): {type(e).__name__}")
    async with websockets.connect(URL, origin=GH) as a, websockets.connect(URL, origin=PG) as b:
        await a.send(json.dumps({"t": "create", "nick": "ТЕСТ-А", "max": 2})); ja = await recv(a, "joined")
        ok(len(ja["code"]) == 5, "комната создана с github.io, код " + ja["code"])
        await b.send(json.dumps({"t": "join", "code": ja["code"], "nick": "ТЕСТ-Б"})); await recv(b, "joined")
        await b.send('{"t":"ready","ready":true}'); await asyncio.sleep(0.3); await a.send('{"t":"start"}')
        st = await recv(a, "start"); await recv(b, "start")
        ok(len(st["roles"]) == 2, "игра началась у обоих (pages.dev + github.io)")
        pid_a = ja["pid"]; v = st["roles"][pid_a]["valves"][0]
        await a.send(json.dumps({"t": "valve", "i": v, "v": 0.6}))
        t0 = asyncio.get_event_loop().time(); got = False
        while asyncio.get_event_loop().time() - t0 < 6:
            m = json.loads(await asyncio.wait_for(b.recv(), 5))
            if m["t"] == "snap" and abs(m["s"]["valves"][v] - 0.6) < 0.01 and m["s"]["t"] > 0.3: got = True; break
        ok(got, "команда игрока A видна игроку B через сервер за ≤6 с")
        await a.send(json.dumps({"t": "valve", "i": 99, "v": 1})); e = await recv(a, "err"); ok(e["code"] == "forbidden", "чужой/несуществующий клапан запрещён")
        await b.send(json.dumps({"t": "chat", "text": "привет из живой проверки"})); c = await recv(a, "chat"); ok("привет" in c["text"], "чат работает")
        await a.send('{"t":"leave"}'); await b.send('{"t":"leave"}')
    print("ПРОВАЛЕНО: %d" % fails if fails else "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ")
    sys.exit(1 if fails else 0)

asyncio.run(main())
