"""Счёт прохождения и проверка правдоподобия. Формула ОБЯЗАТЕЛЬНО совпадает с клиентской (src/score.js)."""
from __future__ import annotations

import re
import unicodedata

POP_START = 1000
NIGHT_DUR = [42, 55, 55, 55, 55, 55, 55, 55, 55, 60]     # из src/data.js (NIGHTS[].dur)
ENDING_BONUS = {"light": 300, "smoke": 150, "iron": 150, "cold": 50, "boom": 0, "silence": 0}
FULL_ENDINGS = ("light", "smoke", "iron", "cold")          # игра дошла до обоза: 10 ночей
COLD_POP = 0.74 * POP_START
SILENCE_POP = 0.50 * POP_START
MAX_SCORE = 10 * 100 + POP_START // 2 + 300
NICK_MAX = 16
DEFAULT_NICK = "Аноним"
PLATFORMS = {"android", "ios", "windows", "mac", "linux", "other"}


def js_round_half(x: float) -> int:
    """Math.round в JS: .5 округляется вверх."""
    import math
    return math.floor(x + 0.5)


def score_js(nights: int, pop: int, ending: str, burnouts: int, smog: int) -> int:
    return max(0, nights * 100 + js_round_half(pop / 2) + ENDING_BONUS.get(ending, 0) - burnouts * 25 - smog)


_NICK_BAD = re.compile(r"[^\w \-]", re.UNICODE)
_SPACES = re.compile(r"\s+")
_URLISH = re.compile(r"(https?|www|t\.me|@)", re.I)


def clean_nick(raw) -> str:
    """Никнейм: только буквы/цифры/пробел/дефис/подчёркивание, ≤16 символов, без HTML и ссылок. Пустое -> «Аноним»."""
    if not isinstance(raw, str):
        return DEFAULT_NICK
    s = unicodedata.normalize("NFKC", raw[:80])
    if _URLISH.search(s):
        return DEFAULT_NICK
    s = "".join(ch for ch in s if unicodedata.category(ch)[0] in "LNZPS" or ch == " ")   # убираем управляющие/невидимые
    s = _NICK_BAD.sub("", s).replace("_", " ")
    s = _SPACES.sub(" ", s).strip(" -")[:NICK_MAX].strip()
    return s if len(s) >= 2 else DEFAULT_NICK


class Invalid(ValueError):
    pass


def int_in(v, lo: int, hi: int, name: str) -> int:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v or v in (float("inf"), float("-inf")):
        raise Invalid(f"{name}: нужно число")
    if int(v) != v:
        raise Invalid(f"{name}: нужно целое")
    v = int(v)
    if not lo <= v <= hi:
        raise Invalid(f"{name}: вне диапазона {lo}..{hi}")
    return v


def validate_result(d: dict, elapsed_s: float, min_time_factor: float = 0.5) -> dict:
    """Проверка результата прохождения. Бросает Invalid. elapsed_s — по серверным часам от выдачи билета."""
    if not isinstance(d, dict):
        raise Invalid("тело запроса")
    ending = d.get("ending")
    if ending not in ENDING_BONUS:
        raise Invalid("ending")
    nights = int_in(d.get("nights"), 0, 10, "nights")
    pop = int_in(d.get("pop"), 0, POP_START, "pop")
    burnouts = int_in(d.get("burnouts", 0), 0, 60, "burnouts")
    smog = int_in(d.get("smog", 0), 0, 100, "smog")
    dur = d.get("duration_s")
    if isinstance(dur, bool) or not isinstance(dur, (int, float)) or dur != dur or not 0 <= dur <= 6 * 3600:
        raise Invalid("duration_s")
    score = int_in(d.get("score"), 0, 3000, "score")
    if score != score_js(nights, pop, ending, burnouts, smog):
        raise Invalid("score не сходится с показателями")
    # согласованность концовки
    if ending in FULL_ENDINGS:
        if nights != 10:
            raise Invalid("концовка требует 10 ночей")
        if ending == "cold" and not pop < COLD_POP:
            raise Invalid("cold: слишком много жителей")
        if ending != "cold" and pop < COLD_POP:
            raise Invalid(f"{ending}: слишком мало жителей")
        if ending == "light" and (burnouts > 2):
            raise Invalid("light: слишком много падений смены (цена смены ≥ 40)")
    else:
        if nights > 9:
            raise Invalid("взрыв/тишина возможны только до 10-й ночи")
        if ending == "silence" and pop > SILENCE_POP:
            raise Invalid("silence: жителей слишком много")
    # время: нельзя пройти быстрее доли длительности ночей и дольше, чем прошло по серверным часам
    need = sum(NIGHT_DUR[:nights]) * min_time_factor
    if dur < need:
        raise Invalid("слишком быстро")
    if elapsed_s + 5 < dur:
        raise Invalid("длительность больше времени билета")
    if elapsed_s < need:
        raise Invalid("слишком быстро (серверное время)")
    return {"ending": ending, "nights": nights, "pop": pop, "burnouts": burnouts, "smog": smog, "duration_s": round(float(dur), 1), "score": score}
