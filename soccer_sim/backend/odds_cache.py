"""
odds_cache.py — 배당 캐시 (콜 수 절약)
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

전략:
  - 배당은 30분마다 갱신 (너무 자주 갱신하면 500콜 금방 소진)
  - 경기 2시간 전부터 10분마다 갱신
  - 메모리 캐시 + JSON 파일 이중 저장
"""

import json
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from odds_api import fetch_all_odds, fetch_odds_by_league, SOCCER_LEAGUES

CACHE_FILE    = Path(__file__).parent / "odds_cache.json"
CACHE_TTL_MIN = 30   # 기본 갱신 주기 (분)


# ─────────────────────────────────────────
# 저장 / 로드
# ─────────────────────────────────────────

def _load() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"updated_at": None, "odds": []}


def _save(odds: list):
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(odds),
        "odds": odds
    }
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"💾 배당 캐시 저장 ({len(odds)}경기)")


def _is_stale(minutes: int = CACHE_TTL_MIN) -> bool:
    data = _load()
    if not data.get("updated_at"):
        return True
    updated = datetime.fromisoformat(data["updated_at"])
    age = (datetime.now(timezone.utc) - updated).total_seconds() / 60
    return age > minutes


# ─────────────────────────────────────────
# 배당 조회 (캐시 우선)
# ─────────────────────────────────────────

async def get_all_odds(force: bool = False) -> list[dict]:
    """캐시된 배당 반환, 만료시 갱신"""
    if force or _is_stale():
        print("🔄 배당 데이터 갱신 중...")
        odds = await fetch_all_odds()
        if odds:
            _save(odds)
        return odds
    data = _load()
    print(f"📦 캐시 사용 ({data.get('count', 0)}경기)")
    return data.get("odds", [])


async def find_match_odds(home_team: str, away_team: str) -> dict | None:
    """
    팀명으로 배당 검색
    football-data.org 팀명과 Odds API 팀명이 다를 수 있어서 퍼지 매칭
    """
    odds_list = await get_all_odds()
    home_l = home_team.lower()
    away_l = away_team.lower()

    best = None
    best_score = 0

    for m in odds_list:
        h = m["home_team"].lower()
        a = m["away_team"].lower()

        # 점수 계산
        score = 0
        if home_l == h: score += 10
        elif home_l in h or h in home_l: score += 5
        elif any(w in h for w in home_l.split() if len(w) > 3): score += 3

        if away_l == a: score += 10
        elif away_l in a or a in away_l: score += 5
        elif any(w in a for w in away_l.split() if len(w) > 3): score += 3

        if score > best_score:
            best_score = score
            best = m

    # 최소 점수 5 이상일 때만 반환
    return best if best_score >= 5 else None


async def refresh_odds():
    """강제 갱신"""
    return await get_all_odds(force=True)


def get_cache_status() -> dict:
    data = _load()
    if not data.get("updated_at"):
        return {"status": "없음", "count": 0, "age_min": None}
    updated = datetime.fromisoformat(data["updated_at"])
    age = (datetime.now(timezone.utc) - updated).total_seconds() / 60
    return {
        "status": "신선" if age < CACHE_TTL_MIN else "만료",
        "count": data.get("count", 0),
        "age_min": round(age, 1),
        "updated_at": data["updated_at"]
    }
