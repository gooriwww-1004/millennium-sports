"""
simulation.py — 포아송 분석 엔진 v2
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

import numpy as np
from scipy.stats import poisson
from models import SimulationInput, SimulationResult, Probabilities, EVResult, EventFlags, InjuryInfo
from injury_weights import apply_injury_to_xg, get_injury_effect


def run_simulation(data: SimulationInput) -> SimulationResult:

    # ── 1. 결장 프리셋 처리 ──────────────────────
    # 하위 호환: home_injured=True면 striker로 자동 매핑
    home_injury_key = data.home_injury
    away_injury_key = data.away_injury
    if data.home_injured and home_injury_key == "none":
        home_injury_key = "striker"
    if data.away_injured and away_injury_key == "none":
        away_injury_key = "striker"

    h_effect = get_injury_effect(home_injury_key)
    a_effect = get_injury_effect(away_injury_key)

    # ── 2. 기본 xG 계산 ──────────────────────────
    home_xg_raw = _calc_xg(data.home_attack, data.away_defense, home=True)
    away_xg_raw = _calc_xg(data.away_attack, data.home_defense, home=False)

    # ── 3. 폼 보정 ───────────────────────────────
    if data.home_form is not None:
        home_xg_raw *= (0.85 + data.home_form * 0.30)
    if data.away_form is not None:
        away_xg_raw *= (0.85 + data.away_form * 0.30)

    # ── 4. 결장 가중치 적용 ──────────────────────
    home_xg, away_xg = apply_injury_to_xg(
        home_xg_raw, away_xg_raw,
        home_injury_key, away_injury_key
    )

    # ── 5. 포아송 5,000회 시뮬 ───────────────────
    rng = np.random.default_rng()
    hg = rng.poisson(home_xg, size=5000)
    ag = rng.poisson(away_xg, size=5000)

    sim_home = float(np.sum(hg > ag) / 5000)
    sim_draw = float(np.sum(hg == ag) / 5000)
    sim_away = float(np.sum(hg < ag) / 5000)

    # ── 6. 배당 역산 ─────────────────────────────
    margin = (1/data.home_odds) + (1/data.draw_odds) + (1/data.away_odds)
    mkt_home = (1/data.home_odds) / margin
    mkt_draw = (1/data.draw_odds) / margin
    mkt_away = (1/data.away_odds) / margin

    # ── 7. 가중치 혼합 (시뮬 70% + 배당 30%) ──────
    final_home = sim_home * 0.70 + mkt_home * 0.30
    final_draw = sim_draw * 0.70 + mkt_draw * 0.30
    final_away = sim_away * 0.70 + mkt_away * 0.30

    total = final_home + final_draw + final_away
    final_home /= total
    final_draw /= total
    final_away /= total

    # ── 8. EV ────────────────────────────────────
    ev_home = final_home * data.home_odds - 1
    ev_draw = final_draw * data.draw_odds - 1
    ev_away = final_away * data.away_odds - 1

    # ── 9. 스코어 분포 ───────────────────────────
    scores = _calc_score_distribution(home_xg, away_xg)

    # ── 10. 이벤트 감지 ──────────────────────────
    events = _detect_events(
        final_home, final_draw, final_away,
        mkt_home, mkt_away,
        ev_home, ev_draw, ev_away,
        data.h2h_reversals
    )

    return SimulationResult(
        home_xg=round(home_xg, 3),
        away_xg=round(away_xg, 3),
        home_xg_raw=round(home_xg_raw, 3),
        away_xg_raw=round(away_xg_raw, 3),
        probabilities=Probabilities(
            home=round(final_home, 4),
            draw=round(final_draw, 4),
            away=round(final_away, 4)
        ),
        market_probs=Probabilities(
            home=round(mkt_home, 4),
            draw=round(mkt_draw, 4),
            away=round(mkt_away, 4)
        ),
        sim_probs=Probabilities(
            home=round(sim_home, 4),
            draw=round(sim_draw, 4),
            away=round(sim_away, 4)
        ),
        ev=EVResult(
            home=round(ev_home, 4),
            draw=round(ev_draw, 4),
            away=round(ev_away, 4),
            home_grade=grade_ev(ev_home),
            draw_grade=grade_ev(ev_draw),
            away_grade=grade_ev(ev_away)
        ),
        top_scores=scores,
        events=events,
        injury_info=InjuryInfo(
            home_label=h_effect.label,
            away_label=a_effect.label,
            home_icon=h_effect.icon,
            away_icon=a_effect.icon,
            home_attack_mult=h_effect.attack_mult,
            home_defense_mult=h_effect.defense_mult,
            away_attack_mult=a_effect.attack_mult,
            away_defense_mult=a_effect.defense_mult,
        )
    )


def _calc_xg(attack: float, defense: float, home: bool) -> float:
    base = attack / max(defense, 0.1)
    if home:
        base *= 1.15
    return max(base, 0.1)


def grade_ev(ev: float) -> str:
    if ev > 0.08: return "A"
    if ev > 0.03: return "B"
    return "C"


def _calc_score_distribution(hxg: float, axg: float) -> list[dict]:
    scores = []
    for h in range(7):
        for a in range(7):
            prob = poisson.pmf(h, hxg) * poisson.pmf(a, axg)
            if prob > 0.005:
                scores.append({"score": f"{h}-{a}", "prob": round(float(prob)*100, 1)})
    return sorted(scores, key=lambda x: -x["prob"])[:5]


def _detect_events(fh, fd, fa, mh, ma, eh, ed, ea, h2h=0) -> EventFlags:
    return EventFlags(
        value_home_found=(fh - mh) > 0.10,
        value_away_found=(fa - ma) > 0.10,
        dominant_gap=abs(fh - fa) > 0.35,
        high_ev=(eh > 0.08 or ea > 0.08),
        h2h_reversal_warning=(h2h >= 3),
        draw_likely=(fd > 0.30),
        all_ev_negative=(eh < 0 and ed < 0 and ea < 0)
    )
