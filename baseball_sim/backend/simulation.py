"""
simulation.py — 야구 시뮬레이션 엔진 v2
최근 3경기 + 수비율 + 선발 ERA 반영
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""
import numpy as np
from scipy.stats import nbinom
from models import (
    BaseballInput, BaseballResult, WinProbs,
    BaseballEV, ScoreEntry, EventFlags, AdjustmentInfo
)
from pitcher_weights import (
    PITCHER_PRESETS, PARK_PRESETS, BULLPEN_PRESETS,
    form3_multiplier, form3_label
)

LEAGUE_DEFAULTS = {
    "KBO": {"avg_ops": 0.742, "avg_era": 4.80, "avg_runs": 4.8,  "avg_def": 0.982},
    "MLB": {"avg_ops": 0.728, "avg_era": 4.40, "avg_runs": 4.4,  "avg_def": 0.985},
    "NPB": {"avg_ops": 0.718, "avg_era": 3.90, "avg_runs": 3.9,  "avg_def": 0.988},
}


def run_simulation(data: BaseballInput) -> BaseballResult:
    D = LEAGUE_DEFAULTS.get(data.league, LEAGUE_DEFAULTS["KBO"])

    home_ops  = data.home_ops  or D["avg_ops"]
    away_ops  = data.away_ops  or D["avg_ops"]
    home_era  = data.home_era  or D["avg_era"]
    away_era  = data.away_era  or D["avg_era"]

    # ── 1. 기본 기대 득점 ─────────────────────
    home_run_base = D["avg_runs"] * (home_ops / D["avg_ops"]) * (D["avg_era"] / away_era)
    away_run_base = D["avg_runs"] * (away_ops / D["avg_ops"]) * (D["avg_era"] / home_era)
    home_adv = 1.06 if data.league == "KBO" else 1.05
    home_run_base *= home_adv

    # ── 2. 선발 투수 보정 ─────────────────────
    hp = PITCHER_PRESETS.get(data.home_pitcher, PITCHER_PRESETS["mid"])
    ap = PITCHER_PRESETS.get(data.away_pitcher, PITCHER_PRESETS["mid"])

    # 실제 ERA가 있으면 리그 평균 대비 비율로 보정
    if data.home_pitcher_era is not None:
        h_era_mult = data.home_pitcher_era / D["avg_era"]
        away_run_base *= h_era_mult   # 홈 선발 ERA → 원정 득점 영향
    else:
        away_run_base *= hp["era_mult"]

    if data.away_pitcher_era is not None:
        a_era_mult = data.away_pitcher_era / D["avg_era"]
        home_run_base *= a_era_mult
    else:
        home_run_base *= ap["era_mult"]

    actual_home_pitcher_era = data.home_pitcher_era
    actual_away_pitcher_era = data.away_pitcher_era

    # ── 3. 구장 보정 ──────────────────────────
    park = PARK_PRESETS.get(data.park_factor, PARK_PRESETS["neutral"])
    home_run_base *= park["run_mult"]
    away_run_base *= park["run_mult"]

    # ── 4. 최근 3경기 폼 ──────────────────────
    home_run_base *= form3_multiplier(data.home_form3)
    away_run_base *= form3_multiplier(data.away_form3)

    # ── 5. 수비율 보정 ────────────────────────
    # 수비율이 높을수록 상대 득점 감소
    avg_def = D["avg_def"]
    if data.home_def_rate is not None:
        away_run_base *= (avg_def / max(data.home_def_rate, 0.90))
    if data.away_def_rate is not None:
        home_run_base *= (avg_def / max(data.away_def_rate, 0.90))

    # ── 6. 불펜 보정 ──────────────────────────
    hb = BULLPEN_PRESETS.get(data.home_bullpen, BULLPEN_PRESETS["normal"])
    ab = BULLPEN_PRESETS.get(data.away_bullpen, BULLPEN_PRESETS["normal"])
    away_run_base *= hb["era_mult"]
    home_run_base *= ab["era_mult"]

    home_run_exp = max(round(home_run_base, 3), 0.5)
    away_run_exp = max(round(away_run_base, 3), 0.5)

    # ── 7. 음이항분포 5,000회 시뮬 ───────────
    sim_home_win, sim_away_win = _simulate(home_run_exp, away_run_exp)

    # ── 8. 배당 역산 ─────────────────────────
    margin   = 1/data.home_odds + 1/data.away_odds
    mkt_home = (1/data.home_odds) / margin
    mkt_away = (1/data.away_odds) / margin

    # ── 9. 가중치 혼합 ────────────────────────
    final_home = sim_home_win * 0.65 + mkt_home * 0.35
    final_away = sim_away_win * 0.65 + mkt_away * 0.35
    total = final_home + final_away
    final_home /= total
    final_away /= total

    # ── 10. EV ───────────────────────────────
    ev_home = final_home * data.home_odds - 1
    ev_away = final_away * data.away_odds - 1

    # ── 11. 예상 스코어 ───────────────────────
    top_scores = _score_dist(home_run_exp, away_run_exp)

    # ── 12. 이벤트 감지 ───────────────────────
    def_diff = None
    if data.home_def_rate and data.away_def_rate:
        def_diff = abs(data.home_def_rate - data.away_def_rate)

    events = EventFlags(
        high_ev=(ev_home > 0.08 or ev_away > 0.08),
        value_home_found=(final_home - mkt_home) > 0.10,
        value_away_found=(final_away - mkt_away) > 0.10,
        ace_vs_back=(
            (data.home_pitcher=="ace" and data.away_pitcher=="back") or
            (data.home_pitcher=="back" and data.away_pitcher=="ace")
        ),
        hitter_park_warning=(data.park_factor=="hitter"),
        bullpen_risk=(data.home_bullpen=="tired" or data.away_bullpen=="tired"),
        all_ev_negative=(ev_home < 0 and ev_away < 0),
        def_advantage=(def_diff is not None and def_diff > 0.008),
    )

    summary = _summary(data.home_team, data.away_team, final_home, final_away, ev_home, ev_away)

    # 투수 레이블
    if actual_home_pitcher_era is not None:
        home_p_label = f"{hp['icon']} ERA {actual_home_pitcher_era:.2f} (실측)"
    else:
        home_p_label = f"{hp['icon']} {hp['label']}"

    if actual_away_pitcher_era is not None:
        away_p_label = f"{ap['icon']} ERA {actual_away_pitcher_era:.2f} (실측)"
    else:
        away_p_label = f"{ap['icon']} {ap['label']}"

    return BaseballResult(
        home_run_exp=home_run_exp,
        away_run_exp=away_run_exp,
        probabilities=WinProbs(home=round(final_home,4), away=round(final_away,4)),
        market_probs=WinProbs(home=round(mkt_home,4), away=round(mkt_away,4)),
        sim_probs=WinProbs(home=round(sim_home_win,4), away=round(sim_away_win,4)),
        ev=BaseballEV(
            home=round(ev_home,4), away=round(ev_away,4),
            home_grade=_grade(ev_home), away_grade=_grade(ev_away)
        ),
        top_scores=top_scores,
        events=events,
        adjustments=AdjustmentInfo(
            home_pitcher_label=home_p_label,
            away_pitcher_label=away_p_label,
            park_label=f"{park['icon']} {park['label']}",
            home_form_label=form3_label(data.home_form3),
            away_form_label=form3_label(data.away_form3),
            home_run_exp=home_run_exp,
            away_run_exp=away_run_exp,
            home_def_rate=data.home_def_rate,
            away_def_rate=data.away_def_rate,
            home_pitcher_era=actual_home_pitcher_era,
            away_pitcher_era=actual_away_pitcher_era,
        ),
        summary=summary,
    )


def _simulate(home_exp: float, away_exp: float, n: int = 5000):
    rng = np.random.default_rng()
    r   = 0.45
    def nb(mu): p = r/(r+mu); return rng.negative_binomial(r, p, n)
    hs = nb(home_exp); as_ = nb(away_exp)
    tied = hs == as_
    if tied.any():
        hs[tied] += nb(home_exp/9)[:tied.sum()]
        as_[tied] += nb(away_exp/9)[:tied.sum()]
    hw = float(np.sum(hs > as_) / n)
    return hw, 1.0 - hw


def _score_dist(hxg: float, axg: float) -> list[ScoreEntry]:
    r = 5.0
    scores = []
    for h in range(16):
        for a in range(16):
            ph = nbinom.pmf(h, r, r/(r+hxg))
            pa = nbinom.pmf(a, r, r/(r+axg))
            prob = ph * pa * 100
            if prob > 0.1:
                scores.append(ScoreEntry(score=f"{h}-{a}", prob=round(prob,1)))
    return sorted(scores, key=lambda x:-x.prob)[:5]


def _grade(ev: float) -> str:
    if ev > 0.08: return "A"
    if ev > 0.03: return "B"
    return "C"


def _summary(ht, at, fh, fa, eh, ea) -> str:
    best = ("홈", eh, _grade(eh)) if eh >= ea else ("원정", ea, _grade(ea))
    label, val, grade = best
    emoji = "✅" if grade=="A" else "🟡" if grade=="B" else "🔴"
    rec   = "강력 추천" if grade=="A" else "검토" if grade=="B" else "패스 권장"
    return (f"{emoji} {ht} vs {at} | "
            f"홈 {fh*100:.1f}% · 원정 {fa*100:.1f}% | "
            f"최고 EV {val*100:+.1f}% ({grade}) → [{label}] {rec}")