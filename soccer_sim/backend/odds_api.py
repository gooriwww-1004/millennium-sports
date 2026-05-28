"""
odds_api.py — The Odds API 연동
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

무료 티어: 월 500콜
엔드포인트:
  GET /v4/sports                          → 지원 스포츠 목록
  GET /v4/sports/{sport}/odds             → 경기별 배당
  GET /v4/sports/{sport}/scores           → 경기 결과

지원 마켓: h2h (승/무/패 1x2)
"""

import os
import httpx
import asyncio
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
BASE_URL     = "https://api.the-odds-api.com/v4"

# 축구 리그 코드 (The Odds API 기준)
SOCCER_LEAGUES = {
    "soccer_epl":               "프리미어리그",
    "soccer_spain_la_liga":     "라리가",
    "soccer_germany_bundesliga":"분데스리가",
    "soccer_italy_serie_a":     "세리에A",
    "soccer_france_ligue_one":  "리그앙",
    "soccer_uefa_champs_league":"챔피언스리그",
    "soccer_korea_kleague1":    "K리그1",
    "soccer_conmebol_copa_libertadores": "코파 리베르타도레스",
}

# football-data.org 리그코드 ↔ The Odds API 리그코드 매핑
FD_TO_ODDS = {
    "PL":  "soccer_epl",
    "PD":  "soccer_spain_la_liga",
    "BL1": "soccer_germany_bundesliga",
    "SA":  "soccer_italy_serie_a",
    "FL1": "soccer_france_ligue_one",
    "CL":  "soccer_uefa_champs_league",
}


# ─────────────────────────────────────────
# 기본 요청
# ─────────────────────────────────────────

async def _get(endpoint: str, params: dict = None) -> dict | list | None:
    if not ODDS_API_KEY:
        print("❌ ODDS_API_KEY 없음")
        return None
    url = f"{BASE_URL}{endpoint}"
    p = {"apiKey": ODDS_API_KEY, **(params or {})}
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(url, params=p)
        # 잔여 콜 수 출력
        remaining = res.headers.get("x-requests-remaining", "?")
        used      = res.headers.get("x-requests-used", "?")
        print(f"  [Odds API] 사용: {used} / 잔여: {remaining}")
        res.raise_for_status()
        return res.json()


# ─────────────────────────────────────────
# 핵심: 경기별 배당 조회
# ─────────────────────────────────────────

async def fetch_odds_by_league(league_key: str) -> list[dict]:
    """
    리그의 현재 배당 조회
    반환: [{ home_team, away_team, commence_time, home_odds, draw_odds, away_odds, bookmaker }, ...]
    """
    data = await _get(f"/sports/{league_key}/odds", {
        "regions":  "eu",       # 유럽 북메이커
        "markets":  "h2h",      # 승/무/패
        "oddsFormat": "decimal",
        "dateFormat": "iso",
    })
    if not data:
        return []

    results = []
    for game in data:
        home = game.get("home_team", "")
        away = game.get("away_team", "")
        time = game.get("commence_time", "")

        # 배당 추출 (Bet365 우선, 없으면 첫 번째 북메이커)
        home_odds, draw_odds, away_odds, bookmaker = _extract_h2h_odds(
            game.get("bookmakers", [])
        )
        if not home_odds:
            continue

        results.append({
            "home_team":    home,
            "away_team":    away,
            "commence_time": time,
            "home_odds":    home_odds,
            "draw_odds":    draw_odds,
            "away_odds":    away_odds,
            "bookmaker":    bookmaker,
            "league":       SOCCER_LEAGUES.get(league_key, league_key),
            "league_key":   league_key,
        })

    return results


async def fetch_all_odds() -> list[dict]:
    """전체 지원 리그 배당 일괄 조회"""
    all_odds = []
    for key in SOCCER_LEAGUES:
        try:
            odds = await fetch_odds_by_league(key)
            all_odds.extend(odds)
            print(f"  ✅ {SOCCER_LEAGUES[key]}: {len(odds)}경기")
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"  ⚠ {key} 실패: {e}")
    return all_odds


async def get_match_odds(home_team: str, away_team: str) -> dict | None:
    """
    특정 경기 배당 조회
    팀명 퍼지 매칭으로 찾기
    """
    all_odds = await fetch_all_odds()
    home_l = home_team.lower()
    away_l = away_team.lower()

    for m in all_odds:
        h = m["home_team"].lower()
        a = m["away_team"].lower()
        # 정확 매칭 또는 포함 매칭
        if (home_l in h or h in home_l) and (away_l in a or a in away_l):
            return m
    return None


# ─────────────────────────────────────────
# 배당 추출 헬퍼
# ─────────────────────────────────────────

PREFERRED_BOOKMAKERS = ["bet365", "unibet", "betway", "pinnacle", "1xbet", "betfair"]

def _extract_h2h_odds(bookmakers: list) -> tuple:
    """북메이커 목록에서 h2h 배당 추출 (선호 순서대로)"""
    # 선호 북메이커 우선
    sorted_bm = sorted(
        bookmakers,
        key=lambda b: (
            PREFERRED_BOOKMAKERS.index(b["key"])
            if b["key"] in PREFERRED_BOOKMAKERS
            else 99
        )
    )

    for bm in sorted_bm:
        for market in bm.get("markets", []):
            if market.get("key") != "h2h":
                continue
            outcomes = {o["name"]: o["price"] for o in market.get("outcomes", [])}
            draw = outcomes.get("Draw")
            # h2h에 무승부 있는 경우 (축구)
            if draw:
                teams = [k for k in outcomes if k != "Draw"]
                if len(teams) == 2:
                    return (
                        outcomes[teams[0]],
                        draw,
                        outcomes[teams[1]],
                        bm.get("title", bm["key"])
                    )
    return None, None, None, None


# ─────────────────────────────────────────
# 팀명 정규화 (football-data ↔ Odds API)
# ─────────────────────────────────────────

TEAM_NAME_MAP = {
    # 프리미어리그
    "manchester city fc":       "Manchester City",
    "arsenal fc":               "Arsenal",
    "liverpool fc":             "Liverpool",
    "chelsea fc":               "Chelsea",
    "tottenham hotspur fc":     "Tottenham Hotspur",
    "manchester united fc":     "Manchester United",
    # 라리가
    "real madrid cf":           "Real Madrid",
    "fc barcelona":             "Barcelona",
    "atletico de madrid":       "Atletico Madrid",
    # 분데스리가
    "fc bayern münchen":        "Bayern Munich",
    "borussia dortmund":        "Borussia Dortmund",
}

def normalize_team_name(name: str) -> str:
    return TEAM_NAME_MAP.get(name.lower(), name)


# ─────────────────────────────────────────
# API 키 검증
# ─────────────────────────────────────────

async def verify_odds_api_key() -> bool:
    if not ODDS_API_KEY:
        print("❌ ODDS_API_KEY 없음 — .env 파일 확인")
        return False
    try:
        data = await _get("/sports", {"all": "false"})
        soccer = [s for s in (data or []) if "soccer" in s.get("key","")]
        print(f"✅ Odds API 키 정상 — 축구 리그 {len(soccer)}개 지원")
        return True
    except Exception as e:
        print(f"❌ Odds API 오류: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(verify_odds_api_key())
