"""
models.py — 야구 시뮬레이터 v2 (최근 3경기 + 수비율 + 선발 ERA)
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""
from pydantic import BaseModel, Field
from typing import Optional


class BaseballInput(BaseModel):
    home_team:   str   = Field(..., description="홈팀명")
    away_team:   str   = Field(..., description="원정팀명")
    league:      str   = Field(default="KBO")

    home_odds:   float = Field(..., ge=1.01, le=50.0)
    away_odds:   float = Field(..., ge=1.01, le=50.0)

    # 선발 투수 등급
    home_pitcher: str  = Field(default="mid")
    away_pitcher: str  = Field(default="mid")

    # 선발 투수 실제 ERA (있으면 등급 보정 대신 직접 사용)
    home_pitcher_era: Optional[float] = Field(default=None, description="홈 선발 ERA")
    away_pitcher_era: Optional[float] = Field(default=None, description="원정 선발 ERA")

    # 구장 특성
    park_factor: str   = Field(default="neutral")

    # 최근 3경기 폼 (승수 0~3)
    home_form3:  int   = Field(default=2, ge=0, le=3)
    away_form3:  int   = Field(default=2, ge=0, le=3)

    # 불펜 상태
    home_bullpen: str  = Field(default="normal")
    away_bullpen: str  = Field(default="normal")

    # 팀 스탯
    home_ops:      Optional[float] = Field(default=None)
    away_ops:      Optional[float] = Field(default=None)
    home_era:      Optional[float] = Field(default=None)
    away_era:      Optional[float] = Field(default=None)
    home_def_rate: Optional[float] = Field(default=None, description="홈팀 수비율 (0~1, 높을수록 좋음)")
    away_def_rate: Optional[float] = Field(default=None, description="원정팀 수비율 (0~1)")


class WinProbs(BaseModel):
    home: float
    away: float


class BaseballEV(BaseModel):
    home:       float
    away:       float
    home_grade: str
    away_grade: str


class ScoreEntry(BaseModel):
    score: str
    prob:  float


class AdjustmentInfo(BaseModel):
    home_pitcher_label: str
    away_pitcher_label: str
    park_label:         str
    home_form_label:    str
    away_form_label:    str
    home_run_exp:       float
    away_run_exp:       float
    home_def_rate:      Optional[float] = None
    away_def_rate:      Optional[float] = None
    home_pitcher_era:   Optional[float] = None
    away_pitcher_era:   Optional[float] = None


class EventFlags(BaseModel):
    high_ev:             bool = False
    value_home_found:    bool = False
    value_away_found:    bool = False
    ace_vs_back:         bool = False
    hitter_park_warning: bool = False
    bullpen_risk:        bool = False
    all_ev_negative:     bool = False
    def_advantage:       bool = False   # 수비율 차이 큼


class BaseballResult(BaseModel):
    home_run_exp:  float
    away_run_exp:  float
    probabilities: WinProbs
    market_probs:  WinProbs
    sim_probs:     WinProbs
    ev:            BaseballEV
    top_scores:    list[ScoreEntry]
    events:        EventFlags
    adjustments:   AdjustmentInfo
    summary:       str
    disclaimer:    str = "⚠️ 이 분석은 참고용이며 베팅 결과를 보장하지 않습니다"
