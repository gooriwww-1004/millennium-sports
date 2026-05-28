"""
pitcher_weights.py — 투수/구장/폼/불펜 가중치
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""
from dataclasses import dataclass


# ─────────────────────────────────────────
# 선발 투수 등급
# ─────────────────────────────────────────

PITCHER_PRESETS = {
    "ace": {
        "label": "에이스 (1선발)",
        "icon":  "🔥",
        "era_mult": 0.72,      # ERA 28% 감소 → 실점 억제
        "desc":  "팀 에이스 / 외국인 에이스"
    },
    "mid": {
        "label": "로테이션 (2~3선발)",
        "icon":  "⚾",
        "era_mult": 1.00,
        "desc":  "일반 로테이션 선발"
    },
    "back": {
        "label": "하위 선발 (4~5선발)",
        "icon":  "📉",
        "era_mult": 1.38,      # ERA 38% 증가
        "desc":  "5선발 / 긴급 선발"
    },
    "unknown": {
        "label": "모름 (평균값)",
        "icon":  "❓",
        "era_mult": 1.00,
        "desc":  "정보 없음 → 평균 적용"
    },
}


# ─────────────────────────────────────────
# 구장 특성
# ─────────────────────────────────────────

PARK_PRESETS = {
    "pitcher": {
        "label":       "투수 유리 구장",
        "icon":        "🏟️",
        "run_mult":    0.88,
        "desc":        "잠실, 사직 등 외야 깊음",
        "examples_kbo": ["잠실", "사직"],
        "examples_mlb": ["Oracle Park", "Petco Park"],
    },
    "neutral": {
        "label":       "중립 구장",
        "icon":        "⚖️",
        "run_mult":    1.00,
        "desc":        "평균적인 구장",
        "examples_kbo": ["수원", "창원"],
        "examples_mlb": ["Wrigley Field"],
    },
    "hitter": {
        "label":       "타자 유리 구장",
        "icon":        "💪",
        "run_mult":    1.15,
        "desc":        "고척, 대구 등 외야 짧음",
        "examples_kbo": ["고척", "대구"],
        "examples_mlb": ["Coors Field", "Great American Ballpark"],
    },
}


# ─────────────────────────────────────────
# 최근 5경기 폼
# ─────────────────────────────────────────

def form_multiplier(wins: int) -> float:
    """최근 5경기 승수 → 득점 기대값 배율"""
    table = {
        5: 1.15,   # 5승0패
        4: 1.08,   # 4승1패
        3: 1.00,   # 3승2패 (기본)
        2: 0.93,   # 2승3패
        1: 0.87,   # 1승4패
        0: 0.80,   # 0승5패
    }
    return table.get(wins, 1.00)


def form_label(wins: int) -> str:
    labels = {
        5: "🔥 5승 0패", 4: "✅ 4승 1패", 3: "➡️ 3승 2패",
        2: "⚠️ 2승 3패", 1: "📉 1승 4패", 0: "❌ 0승 5패"
    }
    return labels.get(wins, f"{wins}승")


# ─────────────────────────────────────────
# 불펜 상태
# ─────────────────────────────────────────

BULLPEN_PRESETS = {
    "normal":  {"label": "정상", "icon": "✅", "era_mult": 1.00},
    "tired":   {"label": "피로 (전날 혹사)", "icon": "😴", "era_mult": 1.22},
    "unknown": {"label": "모름", "icon": "❓", "era_mult": 1.00},
}


# ─────────────────────────────────────────
# 전체 조회용
# ─────────────────────────────────────────

def get_pitcher_presets() -> list[dict]:
    return [{"key": k, **v} for k, v in PITCHER_PRESETS.items()]

def get_park_presets() -> list[dict]:
    return [{"key": k, **v} for k, v in PARK_PRESETS.items()]

def get_bullpen_presets() -> list[dict]:
    return [{"key": k, **v} for k, v in BULLPEN_PRESETS.items()]


# ─────────────────────────────────────────
# 최근 3경기 폼 (5경기에서 변경)
# ─────────────────────────────────────────

def form3_multiplier(wins: int) -> float:
    """최근 3경기 승수 → 기대득점 배율"""
    table = {
        3: 1.12,   # 3승 0패 🔥
        2: 1.04,   # 2승 1패 ✅
        1: 0.96,   # 1승 2패 ⚠️
        0: 0.88,   # 0승 3패 ❌
    }
    return table.get(wins, 1.00)


def form3_label(wins: int) -> str:
    labels = {
        3: "🔥 3승 0패", 2: "✅ 2승 1패",
        1: "⚠️ 1승 2패", 0: "❌ 0승 3패"
    }
    return labels.get(wins, f"{wins}승")
