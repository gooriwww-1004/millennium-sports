"""
team_data.py — KBO 스크래핑 + MLB Stats API + 팀 DB
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""
import os, json, asyncio
from pathlib import Path
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()
CACHE_FILE = Path(__file__).parent / "teams_baseball.json"


# ─────────────────────────────────────────
# Mock 팀 데이터 (스크래핑 실패 시 폴백)
# ─────────────────────────────────────────

KBO_TEAMS = {
    "KIA 타이거즈":   {"ops": 0.762, "era": 4.21, "home_form": 0.62, "park": "hitter", "city": "광주"},
    "삼성 라이온즈":  {"ops": 0.738, "era": 4.55, "home_form": 0.55, "park": "neutral", "city": "대구"},
    "LG 트윈스":      {"ops": 0.751, "era": 4.38, "home_form": 0.60, "park": "pitcher", "city": "서울"},
    "두산 베어스":    {"ops": 0.745, "era": 4.62, "home_form": 0.58, "park": "pitcher", "city": "서울"},
    "KT 위즈":        {"ops": 0.739, "era": 4.48, "home_form": 0.55, "park": "neutral", "city": "수원"},
    "SSG 랜더스":     {"ops": 0.758, "era": 4.31, "home_form": 0.61, "park": "neutral", "city": "인천"},
    "롯데 자이언츠":  {"ops": 0.731, "era": 4.72, "home_form": 0.52, "park": "pitcher", "city": "부산"},
    "한화 이글스":    {"ops": 0.728, "era": 4.85, "home_form": 0.50, "park": "hitter",  "city": "대전"},
    "NC 다이노스":    {"ops": 0.744, "era": 4.44, "home_form": 0.57, "park": "neutral", "city": "창원"},
    "키움 히어로즈":  {"ops": 0.756, "era": 4.39, "home_form": 0.59, "park": "hitter",  "city": "서울"},
}

MLB_TEAMS = {
    "New York Yankees":       {"ops": 0.758, "era": 3.82, "home_form": 0.62, "park": "hitter",  "div": "AL East"},
    "Los Angeles Dodgers":    {"ops": 0.771, "era": 3.65, "home_form": 0.64, "park": "neutral", "div": "NL West"},
    "Atlanta Braves":         {"ops": 0.762, "era": 3.91, "home_form": 0.61, "park": "hitter",  "div": "NL East"},
    "Houston Astros":         {"ops": 0.748, "era": 3.78, "home_form": 0.60, "park": "neutral", "div": "AL West"},
    "Baltimore Orioles":      {"ops": 0.751, "era": 3.95, "home_form": 0.60, "park": "neutral", "div": "AL East"},
    "Philadelphia Phillies":  {"ops": 0.759, "era": 4.01, "home_form": 0.59, "park": "hitter",  "div": "NL East"},
    "Texas Rangers":          {"ops": 0.744, "era": 4.12, "home_form": 0.57, "park": "hitter",  "div": "AL West"},
    "Milwaukee Brewers":      {"ops": 0.732, "era": 3.71, "home_form": 0.58, "park": "pitcher", "div": "NL Central"},
    "Minnesota Twins":        {"ops": 0.739, "era": 4.05, "home_form": 0.56, "park": "neutral", "div": "AL Central"},
    "San Diego Padres":       {"ops": 0.741, "era": 3.88, "home_form": 0.57, "park": "pitcher", "div": "NL West"},
    "Seattle Mariners":       {"ops": 0.728, "era": 3.75, "home_form": 0.56, "park": "pitcher", "div": "AL West"},
    "Boston Red Sox":         {"ops": 0.753, "era": 4.22, "home_form": 0.58, "park": "hitter",  "div": "AL East"},
    "Chicago Cubs":           {"ops": 0.736, "era": 4.15, "home_form": 0.55, "park": "neutral", "div": "NL Central"},
    "San Francisco Giants":   {"ops": 0.729, "era": 3.98, "home_form": 0.54, "park": "pitcher", "div": "NL West"},
    "Toronto Blue Jays":      {"ops": 0.745, "era": 4.08, "home_form": 0.57, "park": "neutral", "div": "AL East"},
    "New York Mets":          {"ops": 0.742, "era": 4.18, "home_form": 0.56, "park": "neutral", "div": "NL East"},
    "Cincinnati Reds":        {"ops": 0.749, "era": 4.35, "home_form": 0.55, "park": "hitter",  "div": "NL Central"},
    "Cleveland Guardians":    {"ops": 0.731, "era": 3.92, "home_form": 0.57, "park": "neutral", "div": "AL Central"},
    "Arizona Diamondbacks":   {"ops": 0.743, "era": 4.28, "home_form": 0.55, "park": "hitter",  "div": "NL West"},
    "Tampa Bay Rays":         {"ops": 0.726, "era": 3.85, "home_form": 0.58, "park": "pitcher", "div": "AL East"},
}

NPB_TEAMS = {
    "요미우리 자이언츠":  {"ops": 0.722, "era": 3.55, "home_form": 0.60, "park": "neutral"},
    "한신 타이거즈":      {"ops": 0.718, "era": 3.48, "home_form": 0.59, "park": "pitcher"},
    "오릭스 버팔로즈":   {"ops": 0.715, "era": 3.42, "home_form": 0.58, "park": "pitcher"},
    "소프트뱅크 호크스": {"ops": 0.731, "era": 3.61, "home_form": 0.62, "park": "hitter"},
    "히로시마 카프":      {"ops": 0.724, "era": 3.58, "home_form": 0.58, "park": "neutral"},
    "요코하마 DeNA":     {"ops": 0.729, "era": 3.72, "home_form": 0.57, "park": "hitter"},
}

ALL_TEAMS = {
    "KBO": KBO_TEAMS,
    "MLB": MLB_TEAMS,
    "NPB": NPB_TEAMS,
}


# ─────────────────────────────────────────
# 팀 조회
# ─────────────────────────────────────────

def get_team(name: str, league: str = "KBO") -> Optional[dict]:
    db = ALL_TEAMS.get(league, {})
    if name in db:
        return {"name": name, "league": league, **db[name]}
    # 부분 일치
    for k, v in db.items():
        if name.lower() in k.lower() or k.lower() in name.lower():
            return {"name": k, "league": league, **v}
    return None


def search_teams(query: str, league: str = "ALL") -> list[dict]:
    results = []
    q = query.lower().strip()
    leagues = ALL_TEAMS.keys() if league == "ALL" else [league]
    for lg in leagues:
        for name, stats in ALL_TEAMS.get(lg, {}).items():
            if q in name.lower():
                results.append({"name": name, "league": lg, **stats})
    return results[:10]


def get_all_teams(league: str = "ALL") -> list[dict]:
    results = []
    leagues = ALL_TEAMS.keys() if league == "ALL" else [league]
    for lg in leagues:
        for name, stats in ALL_TEAMS.get(lg, {}).items():
            results.append({"name": name, "league": lg, **stats})
    return results


# ─────────────────────────────────────────
# MLB Stats API (공식 무료)
# ─────────────────────────────────────────

async def fetch_mlb_standings() -> list[dict]:
    url = "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025&standingsTypes=regularSeason"
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(url)
            data = r.json()
        teams = []
        for rec in data.get("records", []):
            for t in rec.get("teamRecords", []):
                teams.append({
                    "name":    t["team"]["name"],
                    "wins":    t["wins"],
                    "losses":  t["losses"],
                    "pct":     float(t.get("winningPercentage", 0.5)),
                    "league":  "MLB"
                })
        print(f"  MLB Stats API: {len(teams)}팀 로드")
        return teams
    except Exception as e:
        print(f"  MLB Stats API 실패: {e}")
        return []


# ─────────────────────────────────────────
# KBO 스크래핑 (네이버 스포츠)
# ─────────────────────────────────────────

async def scrape_kbo_standings() -> list[dict]:
    """
    네이버 스포츠 KBO 순위 스크래핑
    URL: https://sports.naver.com/kbaseball/record/index.nhn
    """
    url = "https://sports.naver.com/kbaseball/record/index.nhn"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    try:
        async with httpx.AsyncClient(timeout=10, headers=headers) as c:
            r = await c.get(url)
        from html.parser import HTMLParser

        class KBOParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.teams = []
                self.in_table = False
                self.current = {}
                self.col = 0

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == "tr" and "class" in attrs and "record" in attrs.get("class",""):
                    self.in_table = True
                    self.current = {}
                    self.col = 0
                if self.in_table and tag == "td":
                    self.col += 1

            def handle_data(self, data):
                d = data.strip()
                if not d or not self.in_table: return
                if self.col == 2: self.current["name"] = d
                elif self.col == 3: self.current["games"] = int(d) if d.isdigit() else 0
                elif self.col == 4: self.current["wins"] = int(d) if d.isdigit() else 0
                elif self.col == 5: self.current["losses"] = int(d) if d.isdigit() else 0

            def handle_endtag(self, tag):
                if tag == "tr" and self.in_table and "name" in self.current:
                    g = self.current.get("games", 1) or 1
                    w = self.current.get("wins", 0)
                    self.current["win_rate"] = round(w / g, 3)
                    self.current["league"] = "KBO"
                    self.teams.append(self.current)
                    self.in_table = False

        parser = KBOParser()
        parser.feed(r.text)
        if parser.teams:
            print(f"  KBO 스크래핑 성공: {len(parser.teams)}팀")
            return parser.teams
        else:
            print("  KBO 파싱 결과 없음 — Mock 사용")
            return []
    except Exception as e:
        print(f"  KBO 스크래핑 실패: {e}")
        return []


# ─────────────────────────────────────────
# 경기 일정 (The Odds API → 야구)
# ─────────────────────────────────────────

BASEBALL_ODDS_KEYS = {
    "KBO": "baseball_kbo",
    "MLB": "baseball_mlb",
    "NPB": "baseball_japan_npb",
}
