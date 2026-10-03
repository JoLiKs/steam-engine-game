"""Детерминированное ядро симуляции «Последнего котла» — точный порт src/core/sim.js (без обучения).

Нужно серверу мультиплеера (авторитетная симуляция) и ботам. Данные кампании берутся из simdata.json, который выгружается из
src/core/data.js (tools/gen-simdata.mjs), поэтому баланс не расходится. Совпадение с JS проверяется общими тест-векторами
(tests/fixtures/sim_vectors.json): те же сид и ввод → те же числа (допуск 1e-9). Шаг фиксирован: DT = 1/60 с.
Состояние — обычный dict; JS-имена полей сохранены, чтобы снимки были понятны клиенту.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

_D = json.loads((Path(__file__).with_name("simdata.json")).read_text(encoding="utf-8"))
NIGHTS: list[dict] = _D["NIGHTS"]
CARDS: dict[int, dict] = {int(k): v for k, v in _D["CARDS"].items()}
CAP: list[float] = _D["CAP"]
TICKER: dict[int, list[dict]] = {int(k): v for k, v in _D["TICKER"].items()}
POP_START: float = _D["POP_START"]
COAL_MAX: float = _D["COAL_MAX"]
K = _D["consts"]
P_VENT, P_DANGER = K["P_VENT"], K["P_DANGER"]
FIRE_COEF, FIRE_DECAY, SHOVEL_FIRE, SHOVEL_CD = K["FIRE_COEF"], K["FIRE_DECAY"], K["SHOVEL_FIRE"], K["SHOVEL_CD"]
BOILER_CAP, IRON_TOLL, SMOKE_AVG, COLD_POP, SILENCE_POP = K["BOILER_CAP"], K["IRON_TOLL"], K["SMOKE_AVG"], K["COLD_POP"], K["SILENCE_POP"]
DT = 1 / 60
M32 = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return (a * b) & M32


def next_rand(s: dict) -> float:
    """mulberry32, как в src/core/rng.js."""
    s["rs"] = (s["rs"] + 0x6D2B79F5) & M32
    t = s["rs"]
    t = _imul(t ^ (t >> 15), t | 1)
    t ^= (t + _imul(t ^ (t >> 7), t | 61)) & M32
    return ((t ^ (t >> 14)) & M32) / 4294967296


def rand_range(s: dict, a: float, b: float) -> float:
    return a + (b - a) * next_rand(s)


def js_round(x: float) -> int:
    return math.floor(x + 0.5)


def create_state(seed: int = 1) -> dict[str, Any]:
    seed &= M32
    return {
        "v": 1, "rs": seed or 1, "seed": seed, "phase": "night", "night": 0, "t": 0.0, "clock": 0.0,
        "P": 22.0, "fire": 0.0, "coal": 24.0, "smog": 8.0, "smogSum": 0.0, "smogTime": 0.0,
        "valves": [0.0] * 4, "sat": [1.0] * 4, "flow": [0.0] * 4, "needNow": [0.0] * 4,
        "pop": POP_START, "lostHosp": 0.0, "lostCold": 0.0, "lostSmog": 0.0, "nightLost": 0.0,
        "fw": 10.0, "burnouts": 0, "burnT": 0.0, "exhaustSec": 0.0, "timkaShovels": 0, "timkaCd": 0.0,
        "leaks": [], "leakTimer": 12.0, "leakId": 1, "leaksFixed": 0, "leaksIgnored": 0,
        "shovelCd": 0.0, "danger": 0.0, "venting": False, "spills": 0, "shovels": 0,
        "flags": {"timka": False, "extend": False, "brown": False, "aid": False},
        "choices": {}, "card": None, "ending": None, "summary": None,
        "tickerIdx": 0, "evShown": {}, "events": [], "shake": 0.0,
        "coalMade": 0.0, "coalBurned": 0.0, "nightStartCoal": 24.0, "nightStartPop": POP_START, "nightCoalMade": 0.0,
    }


def emit(s: dict, typ: str, **data: Any) -> None:
    if len(s["events"]) < 200:
        s["events"].append({"type": typ, **data})


def _isnum(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _isidx(i: Any) -> bool:
    return isinstance(i, int) and not isinstance(i, bool) and 0 <= i < 4


def _event_mult(s: dict, d: int) -> float:
    N = NIGHTS[s["night"]]
    m = 1.0
    for e in N["events"]:
        if e["d"] != d:
            continue
        if e["t0"] <= s["t"] <= e["t1"]:
            ramp = min(1, (s["t"] - e["t0"]) / 2, (e["t1"] - s["t"]) / 2)
            m = max(m, 1 + (e["m"] - 1) * max(0, ramp))
    return m


def need_now(s: dict, d: int) -> float:
    N = NIGHTS[s["night"]]
    n = N["need"][d] * _event_mult(s, d)
    if d == 0:
        n *= 1 + s["smog"] / 300
    return n


# -------------------------------------------------------------- команды
def set_valve(s: dict, i: Any, v: Any) -> bool:
    if _isidx(i) and _isnum(v):
        s["valves"][i] = max(0.0, min(1.0, float(v)))
        return True
    return False


def shovel(s: dict) -> bool:
    if s["phase"] != "night" or s["shovelCd"] > 0:
        return False
    if s["coal"] < 1:
        emit(s, "nocoal")
        s["shovelCd"] = 0.3
        return False
    s["coal"] -= 1
    s["coalBurned"] += 1
    s["shovelCd"] = SHOVEL_CD
    s["shovels"] += 1
    if s["fire"] > 85:
        s["fire"] = min(100, s["fire"] + 4)
        s["spills"] += 1
        s["smog"] = min(100, s["smog"] + 1.5)
        emit(s, "spill")
    else:
        s["fire"] = min(100, s["fire"] + SHOVEL_FIRE)
        emit(s, "shovel", good=s["fire"] < 88)
    return True


def fix_leak(s: dict, lid: Any = None) -> bool:
    if lid is not None and (not isinstance(lid, int) or isinstance(lid, bool)):
        return False
    if lid is None:
        idx = 0 if s["leaks"] else -1
    else:
        idx = next((k for k, l in enumerate(s["leaks"]) if l["id"] == lid), -1)
    if idx < 0:
        return False
    l = s["leaks"].pop(idx)
    s["leaksFixed"] += 1
    emit(s, "fix", pipe=l["pipe"], id=l["id"])
    return True


def spawn_leak(s: dict, pipe: int | None = None) -> None:
    if len(s["leaks"]) >= 3:
        return
    if pipe is None:
        pipe = math.floor(next_rand(s) * 4)
    if any(l["pipe"] == pipe for l in s["leaks"]):
        return
    l = {"id": s["leakId"], "pipe": pipe, "age": 0.0}
    s["leakId"] += 1
    s["leaks"].append(l)
    emit(s, "leak", pipe=pipe, id=l["id"])


def choose_card(s: dict, key: Any) -> bool:
    if s["phase"] != "card" or not s["card"]:
        return False
    c = s["card"]
    if not isinstance(key, str) or not any(o["key"] == key for o in c["options"]):
        return False
    s["choices"][c["id"]] = key
    cid = c["id"]
    f = s["flags"]
    if cid == "timka":
        if key == "help":
            f["timka"] = True
        else:
            s["coal"] = max(0, s["coal"] - 6)
    elif cid == "shift":
        if key == "extend":
            f["extend"] = True
    elif cid == "brown":
        if key == "accept":
            f["brown"] = True
            s["coal"] = min(COAL_MAX, s["coal"] + 32)
    elif cid == "sloboda":
        if key == "aid":
            f["aid"] = True
            s["coal"] = max(0, s["coal"] - 18)
    emit(s, "choice", id=cid, key=key)
    s["card"] = None
    begin_night(s, s["night"] + 1)
    return True


def begin_night(s: dict, n: int) -> None:
    s["night"], s["t"], s["phase"] = n, 0.0, "night"
    s["nightLost"], s["tickerIdx"], s["evShown"] = 0.0, 0, {}
    s["smog"] *= 0.8
    s["fw"] *= 0.55
    s["burnT"] = 0.0
    s["leaks"] = []
    le = NIGHTS[n]["leakEvery"]
    s["leakTimer"] = le * 0.6 if le else 99
    s["danger"] = 0.0
    s["nightStartPop"], s["nightStartCoal"] = s["pop"], s["coal"]
    s["nightCoalMade"] = s["coalMade"]
    emit(s, "night", n=n)


def continue_summary(s: dict) -> bool:
    if s["phase"] != "summary":
        return False
    c = CARDS.get(s["night"] + 1)
    if s["night"] + 1 >= len(NIGHTS):
        _finish(s, compute_ending(s))
    elif c:
        s["card"], s["phase"] = c, "card"
    else:
        begin_night(s, s["night"] + 1)
    return True


# -------------------------------------------------------------- итоги
def toll(s: dict) -> float:
    return s["exhaustSec"] * 0.5 + s["burnouts"] * 15 + s["timkaShovels"] * 0.6 + (8 if s["flags"]["extend"] else 0)


def smog_avg(s: dict) -> float:
    return s["smogSum"] / s["smogTime"] if s["smogTime"] > 0 else 0.0


def compute_ending(s: dict) -> str:
    pop = s["pop"] / POP_START
    if pop < COLD_POP:
        return "cold"
    toll_r, smog_r = toll(s) / IRON_TOLL, smog_avg(s) / SMOKE_AVG
    if toll_r >= 1 or smog_r >= 1:
        return "iron" if toll_r >= smog_r else "smoke"
    return "light"


def _finish(s: dict, eid: str) -> None:
    s["ending"], s["phase"] = eid, "ended"
    emit(s, "ending", id=eid)


def nights_done(s: dict) -> int:
    return min(s["night"], 9) if s["ending"] in ("boom", "silence") else 10


# -------------------------------------------------------------- шаг
def step(s: dict, dt: float = DT) -> None:
    s["clock"] += dt
    if s["shake"] > 0:
        s["shake"] = max(0, s["shake"] - dt * 2.2)
    if s["phase"] != "night":
        return
    N = NIGHTS[s["night"]]
    f = s["flags"]
    s["shovelCd"] = max(0, s["shovelCd"] - dt)
    s["t"] += dt
    for i in range(4):
        s["needNow"][i] = need_now(s, i)
    for k, e in enumerate(N["events"]):
        if not s["evShown"].get(k) and s["t"] >= e["t0"]:
            s["evShown"][k] = True
            emit(s, "event", label=e["label"], d=e["d"])
    tk = TICKER.get(s["night"])
    if tk and s["tickerIdx"] < len(tk) and s["t"] >= tk[s["tickerIdx"]]["t"]:
        emit(s, "talk", **tk[s["tickerIdx"]])
        s["tickerIdx"] += 1

    if f["timka"] and s["fire"] < 22 and s["timkaCd"] <= 0 and s["coal"] >= 1:
        s["coal"] -= 1
        s["coalBurned"] += 1
        s["fire"] += 13
        s["timkaShovels"] += 1
        s["timkaCd"] = 2.0
        emit(s, "timka")
    s["timkaCd"] = max(0, s["timkaCd"] - dt)

    for l in s["leaks"]:
        l["age"] += dt
    leak_loss = 0.0
    for l in s["leaks"]:
        leak_loss += 1.6 + min(l["age"], 12) * 0.1
    if N["leakEvery"]:
        s["leakTimer"] -= dt
        if s["leakTimer"] <= 0:
            spawn_leak(s)
            s["leakTimer"] = N["leakEvery"] * rand_range(s, 0.75, 1.25)

    s["fire"] = max(0, s["fire"] - s["fire"] * FIRE_DECAY * dt)
    if s["fire"] < 0.05:
        s["fire"] = 0.0
    gen = FIRE_COEF * s["fire"]
    pf = max(0, min(1, s["P"] / 30))
    s["burnT"] = max(0, s["burnT"] - dt)
    total_flow = 0.0
    for i in range(4):
        op = s["valves"][i]
        if i == 2 and s["burnT"] > 0:
            op = 0
        s["flow"][i] = op * CAP[i] * pf
        total_flow += s["flow"][i]
    s["venting"] = s["P"] > P_VENT
    vent = 2 + (s["P"] - P_VENT) * 0.8 if s["venting"] else 0
    if s["venting"] and math.floor(s["clock"] * 6) != math.floor((s["clock"] - dt) * 6):
        emit(s, "vent")
    s["P"] += (gen - total_flow - leak_loss - vent - 0.012 * s["P"]) / BOILER_CAP * dt
    s["P"] = max(0, min(100, s["P"]))
    if s["P"] >= P_DANGER:
        s["danger"] += dt
    else:
        s["danger"] = max(0, s["danger"] - dt * 0.8)
    if s["danger"] >= 2.5:
        s["shake"] = 1
        _finish(s, "boom")
        return

    for i in range(4):
        tgt = min(1, s["flow"][i] / s["needNow"][i])
        s["sat"][i] += (tgt - s["sat"][i]) * min(1, dt * 1.2)

    smog_mul = 1.6 if f["brown"] else 1
    s["smog"] += (s["fire"] * 0.016 * smog_mul - s["flow"][3] * 0.55 - 0.012 * s["smog"]) * dt
    s["smog"] = max(0, min(100, s["smog"]))
    s["smogSum"] += s["smog"] * dt
    s["smogTime"] += dt

    shift_m = 1.4 if f["extend"] else 1
    ratio = s["flow"][2] / s["needNow"][2]
    if s["burnT"] > 0:
        s["fw"] = max(0, s["fw"] - 1.2 * dt)
    elif ratio < 0.15:
        s["fw"] = max(0, s["fw"] - 2.2 * dt)
    else:
        s["fw"] = min(100, s["fw"] + (ratio * 1.4 * shift_m - 0.5) * dt)
    if s["fw"] >= 100:
        s["burnouts"] += 1
        s["burnT"] = 8.0
        s["fw"] = 65.0
        s["shake"] = max(s["shake"], 0.5)
        emit(s, "collapse")
    if s["fw"] >= 75:
        s["exhaustSec"] += dt
    eff = 1 - 0.6 * max(0, (s["fw"] - 50) / 50)
    made = s["flow"][2] * 0.08 * eff * (1.35 if f["extend"] else 1) * dt
    s["coal"] = min(COAL_MAX, s["coal"] + made)
    s["coalMade"] += made

    r0 = max(0, 0.75 - s["sat"][0]) * 2.2
    r1 = max(0, 0.6 - s["sat"][1]) * 2.0 * (0.5 if f["aid"] else 1)
    r2 = max(0, s["smog"] - 65) * 0.03
    s["lostHosp"] += r0 * dt
    s["lostCold"] += r1 * dt
    s["lostSmog"] += r2 * dt
    lost = (r0 + r1 + r2) * dt
    before = math.floor(s["pop"])
    s["pop"] = max(0, s["pop"] - lost)
    s["nightLost"] += lost
    if math.floor(s["pop"]) < before:
        emit(s, "loss", d=0 if r0 >= r1 else 1)
    if s["pop"] / POP_START < SILENCE_POP:
        _finish(s, "silence")
        return

    if s["t"] >= N["dur"]:
        _end_night(s)


def _end_night(s: dict) -> None:
    N = NIGHTS[s["night"]]
    s["summary"] = {
        "night": s["night"], "name": N["name"], "lost": js_round(s["nightLost"]), "pop": math.floor(s["pop"]),
        "coalDelta": js_round(s["coal"] - s["nightStartCoal"]), "smog": js_round(s["smog"]), "fw": js_round(s["fw"]),
        "burnouts": s["burnouts"], "leaks": s["leaksFixed"],
    }
    s["phase"] = "summary"
    emit(s, "nightend")
