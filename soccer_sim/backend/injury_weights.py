"""
injury_weights.py — 결장/로테이션 가중치 시스템
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

가중치 설계 원칙:
  - xG에 직접 곱해지는 배율
  - 공격 관련 결장 → 홈/원정 자신의 xG 감소
  - 수비 관련 결장 → 상대방 xG 증가
  - 복합 결장 가능 (스택)
"""

from dataclasses import dataclass
from typing import Optional

# ─────────────────────────────────────────
# 가중치 정의
# ─────────────────────────────────────────

INJURY_PRESETS = {
    "none": {
        "label": "없음",
        "desc": "전원 정상",
        "attack_mult": 1.00,   # 자팀 공격 xG 배율
        "defense_mult": 1.00,  # 상대 공격 xG 배율 (수비력 저하)
        "icon": "✅"
    },
    "striker": {
        "label": "주요 스트라이커 결장",
        "desc": "에이스 공격수 부재 → 득점력 하락",
        "attack_mult": 0.78,
        "defense_mult": 1.00,
        "icon": "⚽"
    },
    "defender": {
        "label": "주요 수비수 결장",
        "desc": "핵심 수비수 부재 → 실점 위험 상승",
        "attack_mult": 1.00,
        "defense_mult": 1.18,
        "icon": "🛡️"
    },
    "midfielder": {
        "label": "주요 미드필더 결장",
        "desc": "중원 약화 → 공수 모두 소폭 하락",
        "attack_mult": 0.90,
        "defense_mult": 1.08,
        "icon": "🔄"
    },
    "rotation_b": {
        "label": "2군 로테이션 (50%)",
        "desc": "주전 절반 이상 교체 → 전반적 전력 하락",
        "attack_mult": 0.75,
        "defense_mult": 1.20,
        "icon": "🔀"
    },
    "rotation_light": {
        "label": "경미한 로테이션",
        "desc": "1~2명 교체 수준",
        "attack_mult": 0.92,
        "defense_mult": 1.05,
        "icon": "↩️"
    },
    "multi_absent": {
        "label": "복수 핵심 선수 결장",
        "desc": "2명 이상 주요 선수 동시 결장",
        "attack_mult": 0.68,
        "defense_mult": 1.25,
        "icon": "🚨"
    },
    "gk_absent": {
        "label": "주전 골키퍼 결장",
        "desc": "백업 GK 출전 → 수비 불안정",
        "attack_mult": 1.00,
        "defense_mult": 1.22,
        "icon": "🧤"
    },
}


@dataclass
class InjuryEffect:
    attack_mult: float = 1.00
    defense_mult: float = 1.00
    label: str = "없음"
    icon: str = "✅"


def get_injury_effect(preset_key: str) -> InjuryEffect:
    """프리셋 키로 가중치 반환"""
    preset = INJURY_PRESETS.get(preset_key, INJURY_PRESETS["none"])
    return InjuryEffect(
        attack_mult=preset["attack_mult"],
        defense_mult=preset["defense_mult"],
        label=preset["label"],
        icon=preset["icon"]
    )


def apply_injury_to_xg(
    home_xg: float,
    away_xg: float,
    home_injury: str = "none",
    away_injury: str = "none"
) -> tuple[float, float]:
    """
    홈/원정 결장 상황을 xG에 반영
    
    홈팀 결장:
      - 홈 attack_mult → 홈 xG 감소
      - 홈 defense_mult → 원정 xG 증가 (홈 수비 약화)
    
    원정팀 결장:
      - 원정 attack_mult → 원정 xG 감소
      - 원정 defense_mult → 홈 xG 증가 (원정 수비 약화)
    """
    h_effect = get_injury_effect(home_injury)
    a_effect = get_injury_effect(away_injury)

    # 홈 xG = (홈 공격력 보정) × (원정 수비 약화)
    new_home_xg = home_xg * h_effect.attack_mult * a_effect.defense_mult

    # 원정 xG = (원정 공격력 보정) × (홈 수비 약화)
    new_away_xg = away_xg * a_effect.attack_mult * h_effect.defense_mult

    return (
        max(round(new_home_xg, 3), 0.1),
        max(round(new_away_xg, 3), 0.1)
    )


def get_all_presets() -> list[dict]:
    """프론트엔드용 전체 프리셋 목록"""
    return [
        {"key": k, **{kk: vv for kk, vv in v.items()}}
        for k, v in INJURY_PRESETS.items()
    ]
