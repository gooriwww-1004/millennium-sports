"""
db.py — 팀 DB (football-data.org 캐시 + Mock 폴백)
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

import os
import json
from pathlib import Path
from typing import Optional

TEAMS_FILE = Path(__file__).parent / "teams_cache.json"

# ─────────────────────────────────────────
# 캐시 로드
# ─────────────────────────────────────────

def _load_cache() -> dict[str, dict]:
    """teams_cache.json → 이름 기준 딕셔너리"""
    if TEAMS_FILE.exists():
        with open(TEAMS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        teams = data.get("teams", [])
        result = {}
        for t in teams:
            result[t["name"]] = t
            # short_name도 키로 등록
            if t.get("short_name") and t["short_name"] != t["name"]:
                result[t["short_name"]] = t
        print(f"[DB] 캐시 로드: {len(teams)}팀")
        return result
    print("[DB] 캐시 없음 — Mock 데이터 사용")
    return {}


# Mock 데이터 (캐시 없을 때 폴백)
MOCK_TEAMS: dict[str, dict] = {
    "맨체스터 시티": {
        "id": "mc-001", "name": "맨체스터 시티", "short_name": "Man City",
        "league": "프리미어리그", "attack_rating": 1.85, "defense_rating": 1.10,
        "home_form": 0.72, "away_form": 0.65
    },
    "아스날": {
        "id": "ars-001", "name": "아스날", "short_name": "Arsenal",
        "league": "프리미어리그", "attack_rating": 1.65, "defense_rating": 1.15,
        "home_form": 0.68, "away_form": 0.60
    },
    "레알 마드리드": {
        "id": "rm-001", "name": "레알 마드리드", "short_name": "Real Madrid",
        "league": "라리가", "attack_rating": 1.90, "defense_rating": 1.05,
        "home_form": 0.78, "away_form": 0.70
    },
    "바르셀로나": {
        "id": "bar-001", "name": "바르셀로나", "short_name": "Barcelona",
        "league": "라리가", "attack_rating": 1.75, "defense_rating": 1.20,
        "home_form": 0.70, "away_form": 0.62
    },
    "리버풀": {
        "id": "liv-001", "name": "리버풀", "short_name": "Liverpool",
        "league": "프리미어리그", "attack_rating": 1.80, "defense_rating": 1.08,
        "home_form": 0.75, "away_form": 0.67
    },
    "바이에른 뮌헨": {
        "id": "bay-001", "name": "바이에른 뮌헨", "short_name": "Bayern",
        "league": "분데스리가", "attack_rating": 1.95, "defense_rating": 1.00,
        "home_form": 0.80, "away_form": 0.72
    },
}

# 실제 캐시 로드 시도
_CACHE: dict[str, dict] = _load_cache()
_DB = _CACHE if _CACHE else MOCK_TEAMS


# ─────────────────────────────────────────
# 팀 조회
# ─────────────────────────────────────────

def get_team(name: str) -> Optional[dict]:
    """정확한 팀명 조회"""
    return _DB.get(name)


def search_teams(query: str) -> list[dict]:
    """팀명 부분 일치 검색 (최대 6개)"""
    q = query.lower().strip()
    seen = set()
    results = []
    for key, team in _DB.items():
        team_id = team.get("id", team["name"])
        if team_id in seen:
            continue
        name = team.get("name", "")
        short = team.get("short_name", "")
        tla = team.get("tla", "")
        if q in name.lower() or q in short.lower() or q in tla.lower():
            seen.add(team_id)
            results.append(team)
        if len(results) >= 6:
            break
    return results


def get_all_teams() -> list[dict]:
    """전체 팀 목록"""
    seen = set()
    result = []
    for team in _DB.values():
        tid = team.get("id", team["name"])
        if tid not in seen:
            seen.add(tid)
            result.append(team)
    return result


def reload_cache():
    """캐시 재로드 (update_teams.py 실행 후 호출)"""
    global _CACHE, _DB
    _CACHE = _load_cache()
    _DB = _CACHE if _CACHE else MOCK_TEAMS
    return len(_DB)


# ─────────────────────────────────────────
# 분석 로그
# ─────────────────────────────────────────

def save_analysis_log(home_team: str, away_team: str, result: dict) -> bool:
    try:
        log_path = Path(__file__).parent / "analysis_log.jsonl"
        from datetime import datetime
        entry = {
            "home_team": home_team,
            "away_team": away_team,
            "result": result,
            "analyzed_at": datetime.now().isoformat()
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False


# ─────────────────────────────────────────
# Supabase SQL 스키마 (참조용)
# ─────────────────────────────────────────

SUPABASE_SCHEMA = """
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  short_name VARCHAR,
  tla VARCHAR(5),
  league VARCHAR NOT NULL,
  attack_rating FLOAT DEFAULT 1.0,
  defense_rating FLOAT DEFAULT 1.0,
  home_form FLOAT DEFAULT 0.5,
  away_form FLOAT DEFAULT 0.5,
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_teams_name ON teams USING GIN (to_tsvector('simple', name));
"""
