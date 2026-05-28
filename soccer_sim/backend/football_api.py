"""
football_api.py — football-data.org API 클라이언트
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

무료 티어 지원 리그:
  PL   = 프리미어리그
  PD   = 라리가
  BL1  = 분데스리가
  SA   = 세리에A
  FL1  = 리그앙
  CL   = 챔피언스리그
  PPL  = 포르투갈 프리메이라
"""

import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

API_KEY  = os.getenv("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"

HEADERS = {
    "X-Auth-Token": API_KEY
}

# 무료 티어 지원 리그 목록
FREE_LEAGUES = {
    "PL":  "프리미어리그",
    "PD":  "라리가",
    "BL1": "분데스리가",
    "SA":  "세리에A",
    "FL1": "리그앙",
    "CL":  "챔피언스리그",
    "PPL": "프리메이라리가",
}


# ─────────────────────────────────────────
# 기본 요청
# ─────────────────────────────────────────

async def _get(endpoint: str, params: dict = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url, headers=HEADERS, params=params or {})
        res.raise_for_status()
        return res.json()


# ─────────────────────────────────────────
# 리그 순위 → 팀 스탯 추출
# ─────────────────────────────────────────

async def fetch_standings(league_code: str) -> list[dict]:
    """
    리그 순위표에서 팀 목록 + 공격/수비 스탯 추출
    반환: [{ name, league, attack_rating, defense_rating, home_form, away_form }, ...]
    """
    try:
        data = await _get(f"/competitions/{league_code}/standings")
    except Exception as e:
        print(f"  ⚠ {league_code} 조회 실패: {e}")
        return []

    league_name = FREE_LEAGUES.get(league_code, league_code)
    teams = []

    for group in data.get("standings", []):
        if group.get("type") != "TOTAL":
            continue
        for entry in group.get("table", []):
            t = entry.get("team", {})
            played   = entry.get("playedGames", 1) or 1
            won      = entry.get("won", 0)
            drawn    = entry.get("draw", 0)
            goals_f  = entry.get("goalsFor", 0)
            goals_a  = entry.get("goalsAgainst", 1) or 1

            # 공격력: 경기당 득점 (리그 평균 ~1.4 기준 정규화)
            attack_rating  = round((goals_f / played) / 1.4, 3)
            # 수비력: 경기당 실점 역수 (낮을수록 수비 좋음 → 지수 높음)
            defense_rating = round(1.4 / (goals_a / played), 3)
            # 폼: 승률 기반
            form = round((won + drawn * 0.4) / played, 3)

            teams.append({
                "id":             str(t.get("id", "")),
                "name":           t.get("name", ""),
                "short_name":     t.get("shortName", t.get("name", "")),
                "tla":            t.get("tla", ""),
                "league":         league_name,
                "league_code":    league_code,
                "attack_rating":  min(max(attack_rating, 0.3), 3.0),
                "defense_rating": min(max(defense_rating, 0.3), 3.0),
                "home_form":      min(form + 0.05, 1.0),   # 홈 약간 보정
                "away_form":      max(form - 0.05, 0.0),   # 원정 약간 보정
                "played":         played,
                "won":            won,
                "goals_for":      goals_f,
                "goals_against":  goals_a,
            })

    print(f"  ✅ {league_name}: {len(teams)}팀 로드")
    return teams


# ─────────────────────────────────────────
# 전체 리그 일괄 수집
# ─────────────────────────────────────────

async def fetch_all_leagues(league_codes: list[str] = None) -> list[dict]:
    """전체 무료 리그 팀 데이터 수집"""
    codes = league_codes or list(FREE_LEAGUES.keys())
    all_teams = []

    for code in codes:
        teams = await fetch_standings(code)
        all_teams.extend(teams)
        await asyncio.sleep(1.2)  # 무료 티어 요청 간격 (분당 10회 제한)

    print(f"\n총 {len(all_teams)}팀 수집 완료")
    return all_teams


# ─────────────────────────────────────────
# API 키 검증
# ─────────────────────────────────────────

async def verify_api_key() -> bool:
    if not API_KEY:
        print("❌ FOOTBALL_DATA_API_KEY 없음 — .env 파일 확인")
        return False
    try:
        data = await _get("/competitions/PL")
        print(f"✅ API 키 정상 — {data.get('name', 'OK')}")
        return True
    except Exception as e:
        print(f"❌ API 키 오류: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(verify_api_key())


# ─────────────────────────────────────────
# 날짜별 경기 일정 조회
# ─────────────────────────────────────────

async def fetch_matches_by_league(league_code: str, date_from: str, date_to: str) -> list[dict]:
    """리그별 경기 일정 조회 (무료 티어 지원)"""
    try:
        data = await _get(
            f"/competitions/{league_code}/matches",
            {"dateFrom": date_from, "dateTo": date_to}
        )
    except Exception as e:
        print(f"  ⚠ {league_code} 경기 조회 실패: {e}")
        return []

    matches = []
    for m in (data or {}).get("matches", []):
        matches.append({
            "id":          m.get("id"),
            "utcDate":     m.get("utcDate"),
            "status":      m.get("status"),
            "competition": m.get("competition", {}).get("name", ""),
            "comp_code":   league_code,
            "home_team":   m.get("homeTeam", {}).get("name", ""),
            "away_team":   m.get("awayTeam", {}).get("name", ""),
            "home_score":  m.get("score", {}).get("fullTime", {}).get("home"),
            "away_score":  m.get("score", {}).get("fullTime", {}).get("away"),
        })
    return matches


async def fetch_matches_by_date(date_from: str, date_to: str = None) -> list[dict]:
    """
    전체 지원 리그 날짜별 경기 일정 (리그별 순차 호출)
    무료 티어: 글로벌 /matches 엔드포인트 미지원 → 리그별 호출
    """
    if not date_to:
        date_to = date_from

    all_matches = []
    for code in FREE_LEAGUES.keys():
        matches = await fetch_matches_by_league(code, date_from, date_to)
        all_matches.extend(matches)
        await asyncio.sleep(0.6)  # 분당 10콜 제한 대응

    return all_matches


async def fetch_matches_range(days: int = 3) -> list[dict]:
    """오늘부터 N일치 경기 일정"""
    from datetime import datetime, timedelta
    today = datetime.utcnow()
    date_from = today.strftime("%Y-%m-%d")
    date_to   = (today + timedelta(days=days)).strftime("%Y-%m-%d")
    return await fetch_matches_by_date(date_from, date_to)
