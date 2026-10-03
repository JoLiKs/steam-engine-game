"""Стратегия ИИ-напарника (порт `botAct('good')` из src/core/bot.js без обучения): чистая функция «состояние + роль → команды».

Бот управляет только тем, что ему выдано ролью (клапаны/лопата/утечки), и принимает решения не чаще раза в REACT секунд — как живой игрок.
"""
from __future__ import annotations

from typing import Any

from . import simcore as sc

REACT = 0.35
CARD_POLICY = {"timka": "ration", "shift": "refuse", "brown": "decline", "sloboda": "aid"}


def card_choice(s: dict) -> str | None:
    c = s.get("card")
    if not c:
        return None
    want = CARD_POLICY.get(c["id"])
    keys = [o["key"] for o in c["options"]]
    return want if want in keys else (keys[0] if keys else None)


def decide(s: dict, role: dict[str, Any]) -> list[tuple]:
    """Команды ночи: ("valve", i, v) | ("shovel",) | ("fix", None)."""
    if s["phase"] != "night":
        return []
    cmds: list[tuple] = []
    need = [sc.need_now(s, d) for d in range(4)]
    want = [min(1.0, need[d] / sc.CAP[d]) for d in range(4)]
    vals = [0.0] * 4
    vals[0] = min(1.0, want[0] * 1.05)
    vals[1] = min(1.0, want[1])
    coal_low = s["coal"] < 18
    fact = want[2] * (1.0 if coal_low else 0.8)
    if s["fw"] > 70:
        fact = want[2] * 0.4
    elif s["fw"] > 55 and not coal_low:
        fact = want[2] * 0.6
    if s["burnT"] > 0:
        fact = 0.3
    vals[2] = min(1.0, fact)
    vals[3] = min(1.0, want[3] * (1.3 if s["smog"] > 25 else 1.0))
    for i in role.get("valves", []):
        v = round(vals[i] * 100) / 100
        if abs(s["valves"][i] - v) > 0.02:
            cmds.append(("valve", i, v))
    if role.get("leaks") and s["leaks"] and s["leaks"][0]["age"] > REACT:
        cmds.append(("fix", None))
    if role.get("shovel"):
        flow_tot = sum(s["flow"])
        want_fire = min(80.0, flow_tot / sc.FIRE_COEF + (56 - s["P"]) * 1.4 + 6)
        if s["fire"] < want_fire - 7 and s["P"] < 80:
            cmds.append(("shovel",))
    return cmds
