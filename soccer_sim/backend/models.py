"""
models.py — Pydantic 데이터 모델 v2
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

from pydantic import BaseModel, Field
from typing import Optional


# ─────────────────────────────────────────
# 입력
# ─────────────────────────────────────────

class SimulationInput(BaseModel):
    home_team: str = Field(..., description="홈팀명")
    away_team: str = Field(..., description="원정팀명")

    home_attack: float  = Field(default=1.5, ge=0.1, le=5.0)
    home_defense: float = Field(default=1.2, ge=0.1, le=5.0)
    away_attack: float  = Field(default=1.4, ge=0.1, le=5.0)
    away_defense: float = Field(default=1.3, ge=0.1, le=5.0)

    home_odds: float = Field(..., ge=1.01, le=100.0)
    draw_odds: float = Field(..., ge=1.01, le=100.0)
    away_odds: float = Field(..., ge=1.01, le=100.0)

    # 결장 프리셋 키 (injury_weights.py 참조)
    home_injury: str = Field(default="none", description="홈팀 결장 상황")
    away_injury: str = Field(default="none", description="원정팀 결장 상황")

    # 하위 호환 (기존 bool 필드)
    home_injured: bool = Field(default=False)
    away_injured: bool = Field(default=False)

    home_form: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    away_form: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    h2h_reversals: int = Field(default=0, ge=0)


# ─────────────────────────────────────────
# 출력
# ─────────────────────────────────────────

class Probabilities(BaseModel):
    home: float
    draw: float
    away: float


class EVResult(BaseModel):
    home: float
    draw: float
    away: float
    home_grade: str
    draw_grade: str
    away_grade: str


class EventFlags(BaseModel):
    value_home_found: bool    = False
    value_away_found: bool    = False
    dominant_gap: bool        = False
    high_ev: bool             = False
    h2h_reversal_warning: bool = False
    draw_likely: bool         = False
    all_ev_negative: bool     = False


class InjuryInfo(BaseModel):
    home_label: str
    away_label: str
    home_icon: str
    away_icon: str
    home_attack_mult: float
    home_defense_mult: float
    away_attack_mult: float
    away_defense_mult: float


class SimulationResult(BaseModel):
    home_xg: float
    away_xg: float
    home_xg_raw: float        # 결장 보정 전 원본
    away_xg_raw: float
    probabilities: Probabilities
    market_probs: Probabilities
    sim_probs: Probabilities
    ev: EVResult
    top_scores: list[dict]
    events: EventFlags
    injury_info: InjuryInfo


# ─────────────────────────────────────────
# 팀 모델
# ─────────────────────────────────────────

class TeamBase(BaseModel):
    name: str
    league: str
    attack_rating: float  = 1.0
    defense_rating: float = 1.0
    home_form: float      = 0.5
    away_form: float      = 0.5


class TeamCreate(TeamBase):
    pass


class TeamResponse(TeamBase):
    id: str

    class Config:
        from_attributes = True
