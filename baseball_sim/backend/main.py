"""
main.py — 야구 시뮬레이터 FastAPI
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""
import os, time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import BaseballInput, BaseballResult
from simulation import run_simulation
from team_data import get_team, search_teams, get_all_teams, BASEBALL_ODDS_KEYS
from pitcher_weights import get_pitcher_presets, get_park_presets, get_bullpen_presets

load_dotenv()
ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")

app = FastAPI(
    title="⚾ 야구 시뮬레이터 API",
    description="KBO · MLB · NPB | 음이항분포 × 5,000회 | Millennium Session",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://*.vercel.app"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


# ─────────────────────────────────────────
# 헬스
# ─────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "✅ 온라인", "service": "야구 시뮬레이터", "version": "1.0.0"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": time.time()}


# ─────────────────────────────────────────
# 핵심: 시뮬레이션
# ─────────────────────────────────────────

@app.post("/analyze", tags=["Analysis"])
async def analyze(data: BaseballInput):
    start = time.time()

    # 팀 DB 자동 매칭
    home_db = get_team(data.home_team, data.league)
    away_db = get_team(data.away_team, data.league)

    if home_db:
        if data.home_ops  is None: data.home_ops  = home_db.get("ops")
        if data.home_era  is None: data.home_era  = home_db.get("era")
        if data.park_factor == "neutral" and home_db.get("park"):
            data.park_factor = home_db["park"]

    if away_db:
        if data.away_ops  is None: data.away_ops  = away_db.get("ops")
        if data.away_era  is None: data.away_era  = away_db.get("era")

    try:
        result = run_simulation(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시뮬레이션 오류: {e}")

    elapsed = round(time.time() - start, 4)
    response = {
        "elapsed_sec": elapsed,
        "home_team": data.home_team,
        "away_team": data.away_team,
        "league": data.league,
        **result.model_dump()
    }

    # 분석 결과 로그 저장
    try:
        import json
        from pathlib import Path
        from datetime import datetime
        log_path = Path(__file__).parent / "analysis_log.jsonl"
        log_entry = {
            "analyzed_at": datetime.now().isoformat(),
            "home_team":   data.home_team,
            "away_team":   data.away_team,
            "league":      data.league,
            "home_odds":   data.home_odds,
            "away_odds":   data.away_odds,
            "home_prob":   round(result.probabilities.home * 100, 1),
            "away_prob":   round(result.probabilities.away * 100, 1),
            "ev_home":     round(result.ev.home * 100, 2),
            "ev_away":     round(result.ev.away * 100, 2),
            "home_grade":  result.ev.home_grade,
            "away_grade":  result.ev.away_grade,
            "home_run_exp": result.home_run_exp,
            "away_run_exp": result.away_run_exp,
            "top_scores":  [s.model_dump() for s in result.top_scores[:3]],
            "summary":     result.summary,
            "adjustments": result.adjustments.model_dump(),
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"  로그 저장 실패: {e}")

    return response


# ─────────────────────────────────────────
# 팀 검색
# ─────────────────────────────────────────

@app.get("/teams", tags=["Teams"])
async def list_teams(league: str = "ALL"):
    return {"teams": get_all_teams(league), "count": len(get_all_teams(league))}

@app.get("/teams/search", tags=["Teams"])
async def search(q: str = Query(..., min_length=1), league: str = "ALL"):
    return {"teams": search_teams(q, league)}

@app.get("/teams/{league}/{name}", tags=["Teams"])
async def get_team_info(league: str, name: str):
    t = get_team(name, league.upper())
    if not t: raise HTTPException(404, f"팀 없음: {name}")
    return t


# ─────────────────────────────────────────
# 프리셋 조회 (프론트 드롭다운용)
# ─────────────────────────────────────────

@app.get("/presets", tags=["Config"])
async def get_presets():
    return {
        "pitchers": get_pitcher_presets(),
        "parks":    get_park_presets(),
        "bullpens": get_bullpen_presets(),
    }


# ─────────────────────────────────────────
# 경기 일정 + 배당 (The Odds API)
# ─────────────────────────────────────────

@app.get("/matches", tags=["Matches"])
async def get_matches(league: str = "ALL", days: int = Query(3, ge=1, le=7)):
    import httpx
    from datetime import datetime, timezone, timedelta

    leagues = (
        list(BASEBALL_ODDS_KEYS.items())
        if league == "ALL"
        else [(league.upper(), BASEBALL_ODDS_KEYS.get(league.upper(), ""))]
    )

    all_matches = []
    kst = timezone(timedelta(hours=9))

    async with httpx.AsyncClient(timeout=10) as client:
        for lg_name, sport_key in leagues:
            if not sport_key: continue
            try:
                r = await client.get(
                    f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds",
                    params={
                        "apiKey": ODDS_API_KEY,
                        "regions": "eu",
                        "markets": "h2h",
                        "oddsFormat": "decimal",
                    }
                )
                remaining = r.headers.get("x-requests-remaining", "?")
                if r.status_code != 200:
                    print(f"  ⚠ {lg_name} {r.status_code}")
                    continue

                for g in r.json():
                    # KST 변환
                    utc_dt = datetime.fromisoformat(
                        g["commence_time"].replace("Z", "+00:00")
                    )
                    kst_dt = utc_dt.astimezone(kst)
                    now_kst = datetime.now(kst)

                    # days 범위 필터
                    if kst_dt > now_kst + timedelta(days=days):
                        continue
                    if kst_dt < now_kst - timedelta(hours=3):
                        continue

                    # 배당 추출
                    home_odds, away_odds, bookmaker = None, None, ""
                    for bm in g.get("bookmakers", []):
                        for mkt in bm.get("markets", []):
                            if mkt["key"] == "h2h":
                                outcomes = mkt["outcomes"]
                                if len(outcomes) == 2:
                                    home_odds = outcomes[0]["price"]
                                    away_odds = outcomes[1]["price"]
                                    bookmaker = bm.get("title", "")
                                    break
                        if home_odds: break

                    all_matches.append({
                        "league":     lg_name,
                        "home_team":  g["home_team"],
                        "away_team":  g["away_team"],
                        "kst_date":   kst_dt.strftime("%Y-%m-%d"),
                        "kst_time":   kst_dt.strftime("%H:%M"),
                        "home_odds":  home_odds,
                        "away_odds":  away_odds,
                        "bookmaker":  bookmaker,
                        "status":     "SCHEDULED",
                    })

                print(f"  ✅ {lg_name}: {len([m for m in all_matches if m['league']==lg_name])}경기  잔여콜:{remaining}")
                await __import__("asyncio").sleep(0.3)

            except Exception as e:
                print(f"  ⚠ {lg_name} 실패: {e}")

    # 날짜별 그룹
    grouped: dict[str, list] = {}
    for m in all_matches:
        d = m["kst_date"]
        if d not in grouped: grouped[d] = []
        grouped[d].append(m)

    return {"total": len(all_matches), "by_date": grouped}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)


# ─────────────────────────────────────────
# 팀 스탯 자동 조회 (스크래핑)
# ─────────────────────────────────────────

@app.get("/stats/{league}/{team}", tags=["Stats"])
async def get_team_live_stats(league: str, team: str):
    """
    팀 실시간 스탯 조회
    KBO: 네이버 스포츠 스크래핑
    MLB: MLB Stats API (공식)
    반환: 최근 3경기, 수비율, ERA
    """
    lg = league.upper()
    if lg == "KBO":
        from scraper_kbo import get_team_stats
        result = await get_team_stats(team)
    elif lg == "MLB":
        from mlb_api import get_mlb_team_stats
        result = await get_mlb_team_stats(team)
    else:
        raise HTTPException(400, f"지원 리그: KBO, MLB")

    if not result:
        raise HTTPException(404, f"스탯 없음: {team}")
    return result


@app.get("/starters/{league}", tags=["Stats"])
async def get_todays_starters(league: str):
    """오늘 선발 투수 목록 (확정된 경우)"""
    lg = league.upper()
    if lg == "KBO":
        from scraper_kbo import get_todays_starters
        starters = await get_todays_starters()
    elif lg == "MLB":
        from mlb_api import get_todays_mlb_starters
        starters = await get_todays_mlb_starters()
    else:
        raise HTTPException(400, "지원 리그: KBO, MLB")
    return {"starters": starters, "count": len(starters)}


# ─────────────────────────────────────────
# 분석 히스토리
# ─────────────────────────────────────────

@app.get("/history", tags=["History"])
async def get_history(limit: int = Query(50, ge=1, le=200), league: str = None):
    """분석 로그 조회 (최신순)"""
    import json
    from pathlib import Path
    log_path = Path(__file__).parent / "analysis_log.jsonl"
    if not log_path.exists():
        return {"items": [], "count": 0}

    items = []
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                entry = json.loads(line)
                if league and entry.get("league","").upper() != league.upper():
                    continue
                items.append(entry)
            except Exception:
                continue

    # 최신순 정렬
    items.reverse()
    return {"items": items[:limit], "count": len(items)}


@app.delete("/history", tags=["History"])
async def clear_history():
    """분석 로그 전체 삭제"""
    from pathlib import Path
    log_path = Path(__file__).parent / "analysis_log.jsonl"
    if log_path.exists():
        log_path.write_text("")
    return {"status": "cleared"}
