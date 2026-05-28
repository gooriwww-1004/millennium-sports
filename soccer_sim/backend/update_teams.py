"""
update_teams.py — football-data.org → 로컬 팀 DB 자동 갱신
작성: 유리 (연구실장) · Millennium Session · 2026.05.14

실행:
  python update_teams.py              # 전체 리그
  python update_teams.py PL PD BL1   # 특정 리그만
  python update_teams.py --verify     # API 키 검증만

cron 등록 (매일 새벽 4시):
  0 4 * * * cd /path/to/backend && python update_teams.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from football_api import fetch_all_leagues, fetch_standings, verify_api_key

# 팀 데이터 저장 경로
TEAMS_FILE = Path(__file__).parent / "teams_cache.json"


# ─────────────────────────────────────────
# 저장 / 로드
# ─────────────────────────────────────────

def save_teams(teams: list[dict]):
    data = {
        "updated_at": datetime.now().isoformat(),
        "count": len(teams),
        "teams": teams
    }
    with open(TEAMS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"💾 {TEAMS_FILE} 저장 완료 ({len(teams)}팀)")


def load_teams() -> list[dict]:
    if not TEAMS_FILE.exists():
        return []
    with open(TEAMS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("teams", [])


def get_cache_info() -> dict:
    if not TEAMS_FILE.exists():
        return {"exists": False}
    with open(TEAMS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "exists": True,
        "updated_at": data.get("updated_at"),
        "count": data.get("count", 0)
    }


# ─────────────────────────────────────────
# 메인
# ─────────────────────────────────────────

async def main():
    args = sys.argv[1:]

    # API 키 검증만
    if "--verify" in args:
        await verify_api_key()
        return

    # 캐시 정보 출력
    info = get_cache_info()
    if info["exists"]:
        print(f"📦 기존 캐시: {info['count']}팀 (갱신: {info['updated_at']})")

    print("\n🔄 football-data.org 데이터 수집 시작...\n")

    # 특정 리그 코드가 인수로 오면 그것만
    league_codes = [a for a in args if not a.startswith("--")] or None

    if league_codes:
        teams = []
        for code in league_codes:
            t = await fetch_standings(code.upper())
            teams.extend(t)
            await asyncio.sleep(1.2)
    else:
        teams = await fetch_all_leagues()

    if not teams:
        print("❌ 수집된 팀 없음 — API 키 확인 필요")
        return

    save_teams(teams)

    # 요약 출력
    print("\n─── 리그별 팀 수 ───")
    from collections import Counter
    for league, count in Counter(t["league"] for t in teams).items():
        print(f"  {league}: {count}팀")

    print(f"\n✅ 총 {len(teams)}팀 갱신 완료")


if __name__ == "__main__":
    asyncio.run(main())