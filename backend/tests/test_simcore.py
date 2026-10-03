"""Python-порт ядра обязан давать те же числа, что JS (общие векторы tests/fixtures/sim_vectors.json)."""
import json
import math
import subprocess
from pathlib import Path

import pytest
from app import simcore as sc

ROOT = Path(__file__).resolve().parents[2]
V = json.loads((ROOT / "tests" / "fixtures" / "sim_vectors.json").read_text())


def snap_cmp(py, js, where):
    for k, want in js.items():
        got = py[k] if k != "leaks" else [[l["id"], l["pipe"], l["age"]] for l in py["leaks"]]
        if isinstance(want, list) and want and isinstance(want[0], list):
            assert len(got) == len(want), (where, k)
            for a, b in zip(got, want):
                assert a == pytest.approx(b, abs=1e-9, rel=1e-9), (where, k)
        elif isinstance(want, list):
            assert got == pytest.approx(want, abs=1e-9, rel=1e-9), (where, k)
        elif isinstance(want, (int, float)) and not isinstance(want, bool):
            assert got == pytest.approx(want, abs=1e-9, rel=1e-9), (where, k, got, want)
        else:
            assert got == want, (where, k, got, want)


def apply(s, c):
    if c[0] == "valve": sc.set_valve(s, c[1], c[2])
    elif c[0] == "shovel": sc.shovel(s)
    elif c[0] == "fix": sc.fix_leak(s, c[1])
    elif c[0] == "card": sc.choose_card(s, c[1])
    elif c[0] == "continue": sc.continue_summary(s)


@pytest.mark.parametrize("case", V["cases"], ids=lambda c: f"{c['kind']}-{c['seed']}")
def test_python_port_matches_js(case):
    s = sc.create_state(case["seed"])
    log = {t: cmds for t, cmds in case["log"]}
    checks = {t: snap for t, snap in case["checks"]}
    for tick in range(60 * 60 * 14):
        for c in log.get(tick, []):
            apply(s, c)
        sc.step(s, sc.DT)
        s["events"].clear()
        if tick in checks:
            snap_cmp(s, checks[tick], f"tick {tick}")
        if s["phase"] == "ended":
            break
    assert s["ending"] == case["ending"]
    snap_cmp(s, case["final"], "final")


def test_vectors_and_data_are_fresh():
    """simdata.json и векторы должны соответствовать текущему JS (иначе Python-порт молча разойдётся с клиентом)."""
    for script in ("tools/gen-simdata.mjs", "tools/gen-simvectors.mjs"):
        r = subprocess.run(["node", script, "--check"], cwd=ROOT, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr


def test_input_validation_like_js():
    s = sc.create_state(3)
    for bad in (float("nan"), math.inf, "x", None, True):
        assert sc.set_valve(s, 0, bad) is False
    for bad in ("1", 1.5, -1, 4, None):
        assert sc.set_valve(s, bad, 0.5) is False
    assert s["valves"] == [0, 0, 0, 0]
    assert sc.set_valve(s, 2, 9) and s["valves"][2] == 1.0
    s["phase"] = "card"; s["card"] = sc.CARDS[1]
    assert sc.choose_card(s, "bogus") is False and s["phase"] == "card"
    assert sc.choose_card(s, "ration") and s["phase"] == "night" and s["night"] == 1
