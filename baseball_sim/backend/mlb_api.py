"""
mlb_api.py — MLB Stats API (공식 무료)
https://statsapi.mlb.com/api/v1

수집 데이터:
  - 팀 최근 3경기 W/L
  - 선발 투수 ERA (오늘 선발 확정 시)
  - 팀 수비율 (Fielding %)
  - 팀 전체 ERA
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

import httpx
import asyncio
from typing import Optional
from datetime import datetime, timezone, timedelta

MLB_API = "https://statsapi.mlb.com/api/v1"

# MLB 팀 ID (MLB Stats API 기준)
MLB_TEAM_IDS = {
    "Arizona Diamondbacks":      109,
    "Atlanta Braves":            144,
    "Baltimore Orioles":         110,
    "Boston Red Sox":            111,
    "Chicago Cubs":              112,
    "Chicago White Sox":         145,
    "Cincinnati Reds":           113,
    "Cleveland Guardians":       114,
    "Colorado Rockies":          115,
    "Detroit Tigers":            116,
    "Houston Astros":            117,
    "Kansas City Royals":        118,
    "Los Angeles Angels":        108,
    "Los Angeles Dodgers":       119,
    "Miami Marlins":             146,
    "Milwaukee Brewers":         158,
    "Minnesota Twins":           142,
    "New York Mets":             121,
    "New York Yankees":          147,
    "Oakland Athletics":         133,
    "Philadelphia Phillies":     143,
    "Pittsburgh Pirates":        134,
    "San Diego Padres":          135,
    "San Francisco Giants":      137,
    "Seattle Mariners":          136,
    "St. Louis Cardinals":       138,
    "Tampa Bay Rays":            139,
    "Texas Rangers":             140,
    "Toronto Blue Jays":         141,
    "Washington Nationals":      120,
}


async def _get(endpoint: str, params: dict = None) -> dict:
    url = f"{MLB_API}{endpoint}"
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(url, params=params or {})
        r.raise_for_status()
        return r.json()


# ─────────────────────────────────────────
# 팀 스탯 조회
# ─────────────────────────────────────────

async def get_mlb_team_stats(team_name: str) -> Optional[dict]:
    """MLB 팀 스탯 (최근 3경기 + 수비율 + ERA)"""
    team_id = MLB_TEAM_IDS.get(team_name)
    if not team_id:
        print(f"  ⚠ MLB 팀 ID 없음: {team_name}")
        return None

    try:
        # 팀 시즌 스탯
        data = await _get(f"/teams/{team_id}/stats", {
            "stats": "season", "group": "pitching,fielding",
            "season": datetime.now().year
        })

        era      = None
        def_rate = None

        for group in data.get("stats", []):
            splits = group.get("splits", [{}])
            if not splits: continue
            stat = splits[0].get("stat", {})

            if group.get("group", {}).get("displayName") == "pitching":
                era = stat.get("era")
                try: era = float(era)
                except: era = None

            if group.get("group", {}).get("displayName") == "fielding":
                fp = stat.get("fielding")
                try: def_rate = float(fp)
                except: def_rate = None

        # 최근 3경기
        recent3 = await _get_recent_games(team_id, n=3)

        return {
            "team":     team_name,
            "era":      era,
            "def_rate": def_rate,
            "recent3":  recent3,
            "source":   "mlb_api"
        }

    except Exception as e:
        print(f"  ⚠ MLB 팀 스탯 실패 ({team_name}): {e}")
        return None


async def _get_recent_games(team_id: int, n: int = 3) -> Optional[int]:
    """최근 N경기 승수"""
    try:
        today = datetime.now(timezone.utc)
        start = (today - timedelta(days=14)).strftime("%Y-%m-%d")
        end   = today.strftime("%Y-%m-%d")

        data = await _get("/schedule", {
            "teamId": team_id,
            "startDate": start,
            "endDate": end,
            "sportId": 1,
            "gameType": "R",
        })

        results = []
        for date_entry in data.get("dates", []):
            for game in date_entry.get("games", []):
                if game.get("status", {}).get("abstractGameState") != "Final":
                    continue
                teams   = game.get("teams", {})
                is_home = teams.get("home", {}).get("team", {}).get("id") == team_id
                side    = "home" if is_home else "away"
                won     = teams.get(side, {}).get("isWinner", False)
                results.append(1 if won else 0)

        recent = results[-n:] if len(results) >= n else results
        return sum(recent) if recent else None

    except Exception as e:
        print(f"  ⚠ 최근 경기 조회 실패: {e}")
        return None


# ─────────────────────────────────────────
# 오늘 선발 투수 조회
# ─────────────────────────────────────────

async def get_todays_mlb_starters() -> list[dict]:
    """오늘 MLB 선발 투수 목록 + ERA"""
    today = datetime.now(timezone(timedelta(hours=-5))).strftime("%Y-%m-%d")  # ET 기준
    try:
        data = await _get("/schedule", {
            "sportId": 1,
            "date": today,
            "gameType": "R",
            "hydrate": "probablePitcher(note),team"
        })

        starters = []
        for date_entry in data.get("dates", []):
            for game in date_entry.get("games", []):
                teams = game.get("teams", {})
                home_pitcher = teams.get("home", {}).get("probablePitcher", {})
                away_pitcher = teams.get("away", {}).get("probablePitcher", {})

                home_era = await _get_pitcher_era(home_pitcher.get("id")) if home_pitcher.get("id") else None
                away_era = await _get_pitcher_era(away_pitcher.get("id")) if away_pitcher.get("id") else None

                starters.append({
                    "home_team":     teams.get("home", {}).get("team", {}).get("name", ""),
                    "away_team":     teams.get("away", {}).get("team", {}).get("name", ""),
                    "home_starter":  home_pitcher.get("fullName", ""),
                    "away_starter":  away_pitcher.get("fullName", ""),
                    "home_era":      home_era,
                    "away_era":      away_era,
                    "game_time":     game.get("gameDate", ""),
                })

        return starters
    except Exception as e:
        print(f"  ⚠ MLB 선발 조회 실패: {e}")
        return []


async def _get_pitcher_era(pitcher_id: int) -> Optional[float]:
    """투수 시즌 ERA"""
    try:
        data = await _get(f"/people/{pitcher_id}/stats", {
            "stats": "season", "group": "pitching",
            "season": datetime.now().year
        })
        for group in data.get("stats", []):
            splits = group.get("splits", [])
            if splits:
                era = splits[0].get("stat", {}).get("era")
                try: return float(era)
                except: pass
        return None
    except:
        return None


if __name__ == "__main__":
    async def test():
        print("=== MLB 선발 투수 ===")
        starters = await get_todays_mlb_starters()
        for s in starters[:3]:
            print(f"  {s['home_team']} vs {s['away_team']}")
            print(f"  홈: {s['home_starter']} (ERA {s['home_era']}) vs 원정: {s['away_starter']} (ERA {s['away_era']})")

        print("\n=== 팀 스탯: Yankees ===")
        stats = await get_mlb_team_stats("New York Yankees")
        print(stats)

    asyncio.run(test())
