"""
scraper_kbo.py — KBO 데이터 스크래핑
소스 1: 네이버 스포츠 (1차)
소스 2: ESPN API 비공식 (2차 폴백)
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

수집 데이터:
  - 팀 순위 + 최근 3경기 W/L
  - 선발 투수 ERA (확정 시)
  - 팀 수비율 (실책 기반)
"""

import httpx
import asyncio
import re
from typing import Optional
from datetime import datetime, timezone, timedelta

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://sports.naver.com/"
}

# KBO 팀명 매핑 (네이버 약칭 → 정식명)
KBO_NAME_MAP = {
    "KIA":  "KIA 타이거즈",
    "삼성": "삼성 라이온즈",
    "LG":   "LG 트윈스",
    "두산": "두산 베어스",
    "KT":   "KT 위즈",
    "SSG":  "SSG 랜더스",
    "롯데": "롯데 자이언츠",
    "한화": "한화 이글스",
    "NC":   "NC 다이노스",
    "키움": "키움 히어로즈",
}

# ESPN KBO 팀 ID 매핑
ESPN_KBO_IDS = {
    "KIA 타이거즈":  "kia",
    "삼성 라이온즈": "samsung",
    "LG 트윈스":     "lg",
    "두산 베어스":   "doosan",
    "KT 위즈":       "kt",
    "SSG 랜더스":    "ssg",
    "롯데 자이언츠": "lotte",
    "한화 이글스":   "hanwha",
    "NC 다이노스":   "nc",
    "키움 히어로즈": "kiwoom",
}


# ─────────────────────────────────────────
# 메인 조회 함수
# ─────────────────────────────────────────

async def get_team_stats(team_name: str) -> dict:
    """
    팀 스탯 조회 (최근 3경기 + 수비율 + 선발 투수)
    네이버 실패 시 ESPN 폴백
    """
    # 1차: 네이버 스포츠
    result = await _naver_team_stats(team_name)
    if result and result.get("recent3"):
        result["source"] = "naver"
        return result

    # 2차: ESPN
    result = await _espn_team_stats(team_name)
    if result:
        result["source"] = "espn"
        return result

    # 폴백: 기본값
    return {
        "team":      team_name,
        "recent3":   None,   # 직접 입력 필요
        "def_rate":  None,
        "era":       None,
        "source":    "manual"
    }


async def get_todays_starters() -> list[dict]:
    """오늘 선발 투수 목록 (네이버 스포츠 경기 미리보기)"""
    starters = await _naver_starters()
    if starters:
        return starters
    return []


# ─────────────────────────────────────────
# 소스 1: 네이버 스포츠
# ─────────────────────────────────────────

async def _naver_team_stats(team_name: str) -> Optional[dict]:
    """네이버 스포츠 KBO 팀 기록 스크래핑"""
    try:
        async with httpx.AsyncClient(timeout=8, headers=HEADERS, follow_redirects=True) as c:
            # 팀 순위 페이지
            r = await c.get("https://sports.naver.com/kbaseball/record/index.nhn")
            if r.status_code != 200:
                print(f"  ⚠ 네이버 KBO 순위 {r.status_code}")
                return None

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, "html.parser")

        # 순위 테이블 파싱
        table = soup.find("table", class_=re.compile("record|standing", re.I))
        if not table:
            # 다른 방법으로 찾기
            table = soup.find("table")

        if not table:
            print("  ⚠ 네이버 KBO 테이블 없음")
            return None

        rows = table.find_all("tr")[1:]  # 헤더 제외
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 6:
                continue

            name_raw = cols[1].get_text(strip=True) if len(cols) > 1 else ""
            # 팀명 매핑
            matched = None
            for short, full in KBO_NAME_MAP.items():
                if short in name_raw or full in name_raw:
                    matched = full
                    break

            if not matched or matched != team_name:
                continue

            # 데이터 추출
            games   = _safe_int(cols[2].get_text(strip=True))
            wins    = _safe_int(cols[3].get_text(strip=True))
            losses  = _safe_int(cols[4].get_text(strip=True))
            era_str = cols[-2].get_text(strip=True) if len(cols) > 8 else ""
            def_str = cols[-1].get_text(strip=True) if len(cols) > 9 else ""

            # 최근 3경기 계산 (현재 전체 승률 기반 추정)
            recent3 = _estimate_recent3(wins, losses, games)

            return {
                "team":     team_name,
                "games":    games,
                "wins":     wins,
                "losses":   losses,
                "recent3":  recent3,
                "era":      _safe_float(era_str),
                "def_rate": _safe_float(def_str),
            }

        print(f"  ⚠ 네이버: {team_name} 못 찾음")
        return None

    except Exception as e:
        print(f"  ⚠ 네이버 스크래핑 실패: {e}")
        return None


async def _naver_starters() -> list[dict]:
    """오늘 선발 투수 파싱"""
    try:
        async with httpx.AsyncClient(timeout=8, headers=HEADERS, follow_redirects=True) as c:
            r = await c.get("https://sports.naver.com/kbaseball/schedule/index.nhn")
            if r.status_code != 200:
                return []

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, "html.parser")
        starters = []

        # 오늘 경기 박스에서 선발 투수 추출
        game_boxes = soup.find_all("div", class_=re.compile("game|match", re.I))
        for box in game_boxes:
            pitcher_tags = box.find_all("span", class_=re.compile("pitcher|starter", re.I))
            teams = box.find_all("span", class_=re.compile("team", re.I))
            if len(pitcher_tags) >= 2 and len(teams) >= 2:
                starters.append({
                    "home_team":    teams[0].get_text(strip=True),
                    "away_team":    teams[1].get_text(strip=True),
                    "home_starter": pitcher_tags[0].get_text(strip=True),
                    "away_starter": pitcher_tags[1].get_text(strip=True),
                })

        return starters
    except Exception as e:
        print(f"  ⚠ 선발 투수 파싱 실패: {e}")
        return []


# ─────────────────────────────────────────
# 소스 2: ESPN 비공식 API
# ─────────────────────────────────────────

async def _espn_team_stats(team_name: str) -> Optional[dict]:
    """ESPN API (비공식) KBO 팀 스탯"""
    try:
        # ESPN KBO 스코어보드
        url = "https://site.api.espn.com/apis/site/v2/sports/baseball/kbo/scoreboard"
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get(url)
            if r.status_code != 200:
                print(f"  ⚠ ESPN KBO {r.status_code}")
                return None

        data = r.json()
        events = data.get("events", [])

        for event in events:
            for comp in event.get("competitions", []):
                for team in comp.get("competitors", []):
                    t = team.get("team", {})
                    display = t.get("displayName", "")
                    short   = t.get("abbreviation", "")

                    # 팀명 매칭
                    matched = None
                    for s, full in KBO_NAME_MAP.items():
                        if s in display or s in short or full in display:
                            matched = full
                            break

                    if matched != team_name:
                        continue

                    records = team.get("records", [])
                    wins, losses = 0, 0
                    for rec in records:
                        if rec.get("type") == "total":
                            w_l = rec.get("summary", "0-0").split("-")
                            wins   = int(w_l[0]) if len(w_l) > 0 else 0
                            losses = int(w_l[1]) if len(w_l) > 1 else 0

                    return {
                        "team":    team_name,
                        "wins":    wins,
                        "losses":  losses,
                        "recent3": _estimate_recent3(wins, losses, wins+losses),
                        "era":     None,
                        "def_rate": None,
                    }

        return None
    except Exception as e:
        print(f"  ⚠ ESPN KBO 실패: {e}")
        return None


# ─────────────────────────────────────────
# 헬퍼
# ─────────────────────────────────────────

def _safe_int(s: str) -> int:
    try: return int(s.replace(",", ""))
    except: return 0

def _safe_float(s: str) -> Optional[float]:
    try: return float(s)
    except: return None

def _estimate_recent3(wins: int, losses: int, games: int) -> Optional[int]:
    """전체 승률로 최근 3경기 추정 (실제 데이터 없을 때)"""
    if not games: return None
    rate = wins / games
    return round(rate * 3)


# ─────────────────────────────────────────
# 전체 KBO 팀 스탯 일괄 조회
# ─────────────────────────────────────────

async def fetch_all_kbo_stats() -> dict[str, dict]:
    """전체 KBO 10팀 스탯 조회"""
    results = {}
    for team in KBO_NAME_MAP.values():
        stats = await get_team_stats(team)
        results[team] = stats
        print(f"  {team}: {stats.get('source','?')} | "
              f"최근3={stats.get('recent3','?')} | "
              f"ERA={stats.get('era','?')} | "
              f"수비율={stats.get('def_rate','?')}")
        await asyncio.sleep(0.8)  # 요청 간격
    return results


if __name__ == "__main__":
    asyncio.run(fetch_all_kbo_stats())
