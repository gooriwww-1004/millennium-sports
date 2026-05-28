"""
ev_calculator.py — EV 계산 + 등급 + 멘트 생성
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

from models import EVResult, EventFlags, Probabilities


# ─────────────────────────────────────────
# EV 계산
# ─────────────────────────────────────────

def calculate_ev(probs: Probabilities, home_odds: float, draw_odds: float, away_odds: float) -> EVResult:
    ev_home = probs.home * home_odds - 1
    ev_draw = probs.draw * draw_odds - 1
    ev_away = probs.away * away_odds - 1

    return EVResult(
        home=round(ev_home, 4),
        draw=round(ev_draw, 4),
        away=round(ev_away, 4),
        home_grade=grade_ev(ev_home),
        draw_grade=grade_ev(ev_draw),
        away_grade=grade_ev(ev_away)
    )


def grade_ev(ev: float) -> str:
    if ev > 0.08:
        return "A"
    if ev > 0.03:
        return "B"
    return "C"


# ─────────────────────────────────────────
# 이벤트 멘트 생성
# ─────────────────────────────────────────

EVENT_MESSAGES = {
    "value_home_found": {
        "text": "역전 발견! 홈팀 기대값이 배당보다 높습니다",
        "clip": "goal_celebration",
        "color": "gold",
        "icon": "⚡"
    },
    "value_away_found": {
        "text": "역전 발견! 원정팀 기대값이 배당보다 높습니다",
        "clip": "goal_celebration",
        "color": "gold",
        "icon": "⚡"
    },
    "dominant_gap": {
        "text": "압도적 전력 차이가 감지되었습니다",
        "clip": "dominant_win",
        "color": "blue",
        "icon": "💪"
    },
    "high_ev": {
        "text": "가치 배팅 포착! 기대값 8% 이상",
        "clip": "value_bet",
        "color": "gold",
        "icon": "🎯"
    },
    "h2h_reversal_warning": {
        "text": "이 맞대결, 역전이 잦습니다 — 주의",
        "clip": "warning",
        "color": "orange",
        "icon": "⚠️"
    },
    "draw_likely": {
        "text": "드로우 확률이 높은 경기입니다",
        "clip": "draw_scene",
        "color": "purple",
        "icon": "🤝"
    },
    "all_ev_negative": {
        "text": "모든 선택지 기대값 마이너스 — 패스 권장",
        "clip": "warning_red",
        "color": "red",
        "icon": "🚫"
    }
}


def get_event_messages(events: EventFlags) -> list[dict]:
    """활성화된 이벤트에 해당하는 멘트 리스트 반환"""
    messages = []
    for field, value in events.model_dump().items():
        if value and field in EVENT_MESSAGES:
            messages.append({
                "event": field,
                **EVENT_MESSAGES[field]
            })
    return messages


# ─────────────────────────────────────────
# 요약 텍스트 생성
# ─────────────────────────────────────────

def generate_summary(
    home_team: str,
    away_team: str,
    probs: Probabilities,
    ev: EVResult
) -> str:
    """결과 요약 한 줄 텍스트"""
    best_ev = max(
        ("홈", ev.home, ev.home_grade),
        ("무", ev.draw, ev.draw_grade),
        ("원정", ev.away, ev.away_grade),
        key=lambda x: x[1]
    )

    label, val, grade = best_ev

    if grade == "A":
        emoji = "✅"
        rec = f"[{label}] 강력 추천"
    elif grade == "B":
        emoji = "🟡"
        rec = f"[{label}] 검토 추천"
    else:
        emoji = "🔴"
        rec = "투자 비추천"

    return (
        f"{emoji} {home_team} vs {away_team} | "
        f"홈 {probs.home*100:.1f}% · 무 {probs.draw*100:.1f}% · 원정 {probs.away*100:.1f}% | "
        f"최고 EV {val*100:+.1f}% ({grade}등급) → {rec}"
    )
