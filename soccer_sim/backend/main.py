"""
main.py — FastAPI 진입점
작성: 유리 (연구실장) · Millennium Session · 2026.05.14
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from models import SimulationInput, SimulationResult, TeamCreate
from simulation import run_simulation
from ev_calculator import get_event_messages, generate_summary
from db import get_team, search_teams, save_analysis_log

# ─────────────────────────────────────────
# 앱 초기화
# ─────────────────────────────────────────

app = FastAPI(
    title="⚽ 축구 시뮬레이션 배팅 분석 API",
    description="포아송 분포 × 5,000회 시뮬레이션 | Millennium Session",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS (Next.js 프론트 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# 헬스체크
# ─────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "✅ 온라인",
        "service": "축구 시뮬레이션 배팅 분석 API",
        "version": "1.0.0",
        "by": "유리 (연구실장) · Millennium Session"
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": time.time()}


# ─────────────────────────────────────────
# 핵심: 시뮬레이션 실행
# ─────────────────────────────────────────

@app.post("/analyze", response_model=dict, tags=["Analysis"])
async def analyze(data: SimulationInput):
    """
    포아송 시뮬레이션 실행 후 전체 분석 결과 반환
    
    - **home_team / away_team**: 팀명 (DB 자동 매칭 시도)
    - **home_odds / draw_odds / away_odds**: 현재 배당
    - **home_attack, home_defense, away_attack, away_defense**: 팀 스탯 (팀명으로 자동 조회 가능)
    """
    start = time.time()

    # ── 팀 DB 자동 매칭 (팀명 입력 시)
    if data.home_team:
        db_home = get_team(data.home_team)
        if db_home:
            # DB 값이 있으면 스탯 자동 적용 (입력값 우선)
            if data.home_attack == 1.5:  # 기본값이면 DB 값 사용
                data.home_attack = db_home["attack_rating"]
            if data.home_defense == 1.2:
                data.home_defense = db_home["defense_rating"]
            if data.home_form is None:
                data.home_form = db_home["home_form"]

    if data.away_team:
        db_away = get_team(data.away_team)
        if db_away:
            if data.away_attack == 1.4:
                data.away_attack = db_away["attack_rating"]
            if data.away_defense == 1.3:
                data.away_defense = db_away["defense_rating"]
            if data.away_form is None:
                data.away_form = db_away["away_form"]

    # ── 시뮬레이션 실행
    try:
        result = run_simulation(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시뮬레이션 오류: {str(e)}")

    # ── 이벤트 멘트 생성
    event_messages = get_event_messages(result.events)

    # ── 요약 텍스트
    summary = generate_summary(
        home_team=data.home_team,
        away_team=data.away_team,
        probs=result.probabilities,
        ev=result.ev
    )

    # ── 로그 저장
    result_dict = result.model_dump()
    save_analysis_log(data.home_team, data.away_team, result_dict)

    elapsed = round(time.time() - start, 4)

    return {
        "status": "success",
        "elapsed_sec": elapsed,
        "home_team": data.home_team,
        "away_team": data.away_team,
        "home_xg": result.home_xg,
        "away_xg": result.away_xg,
        "probabilities": result.probabilities.model_dump(),
        "market_probs": result.market_probs.model_dump(),
        "sim_probs": result.sim_probs.model_dump(),
        "ev": result.ev.model_dump(),
        "top_scores": result.top_scores,
        "events": result.events.model_dump(),
        "event_messages": event_messages,
        "summary": summary,
        "disclaimer": "⚠️ 이 분석은 참고용이며 배팅 결과를 보장하지 않습니다"
    }


# ─────────────────────────────────────────
# 팀 검색
# ─────────────────────────────────────────

@app.get("/teams/search", tags=["Teams"])
async def search(q: str = Query(..., min_length=1, description="팀명 검색어")):
    """팀명 부분 검색"""
    results = search_teams(q)
    return {"teams": results, "count": len(results)}


@app.get("/teams/{name}", tags=["Teams"])
async def get_team_info(name: str):
    """팀 상세 정보 조회"""
    team = get_team(name)
    if not team:
        raise HTTPException(status_code=404, detail=f"팀을 찾을 수 없습니다: {name}")
    return team


# ─────────────────────────────────────────
# 퀵 테스트 (배당만 넣으면 바로 실행)
# ─────────────────────────────────────────

@app.get("/quick-analyze", tags=["Analysis"])
async def quick_analyze(
    home: str = Query(..., example="맨체스터 시티"),
    away: str = Query(..., example="아스날"),
    h_odds: float = Query(..., example=2.10),
    d_odds: float = Query(..., example=3.40),
    a_odds: float = Query(..., example=3.60)
):
    """
    GET 방식 퀵 분석 — 팀명 + 배당 3개만 입력하면 즉시 결과
    DB에서 팀 스탯 자동 로드
    """
    data = SimulationInput(
        home_team=home,
        away_team=away,
        home_odds=h_odds,
        draw_odds=d_odds,
        away_odds=a_odds
    )
    return await analyze(data)


# ─────────────────────────────────────────
# 실행
# ─────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# ─────────────────────────────────────────
# 팀 목록 + 캐시 재로드
# ─────────────────────────────────────────

@app.get("/teams", tags=["Teams"])
async def list_teams(league: str = None):
    """전체 팀 목록 (league 파라미터로 필터 가능)"""
    from db import get_all_teams
    teams = get_all_teams()
    if league:
        teams = [t for t in teams if league.lower() in t.get("league", "").lower()]
    return {"teams": teams, "count": len(teams)}


@app.post("/admin/reload-cache", tags=["Admin"])
async def reload_team_cache():
    """teams_cache.json 재로드 (update_teams.py 실행 후 호출)"""
    from db import reload_cache
    count = reload_cache()
    return {"status": "reloaded", "team_count": count}


# ─────────────────────────────────────────
# 경기 일정 (날짜/시간별)
# ─────────────────────────────────────────

@app.get("/matches", tags=["Matches"])
async def get_matches(
    date: str = Query(None, description="날짜 (YYYY-MM-DD). 없으면 오늘"),
    days: int = Query(3, ge=1, le=7, description="조회 기간 (일수)")
):
    """
    날짜별 경기 일정 조회
    소스 1: football-data.org (리그별 경기 일정)
    소스 2: The Odds API (배당 있는 경기 — fallback)
    """
    from football_api import fetch_matches_range, fetch_matches_by_date
    from odds_cache import get_all_odds
    from datetime import datetime, timedelta, timezone

    matches = []

    # ── 소스 1: football-data.org ──────────────
    try:
        if date:
            date_to = (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=days-1)).strftime("%Y-%m-%d")
            fd_matches = await fetch_matches_by_date(date, date_to)
        else:
            fd_matches = await fetch_matches_range(days)
        matches.extend(fd_matches)
        print(f"  football-data: {len(fd_matches)}경기")
    except Exception as e:
        print(f"  football-data 실패: {e}")

    # ── 소스 2: The Odds API (배당 있는 경기) ──
    try:
        odds_list = await get_all_odds()
        fd_keys = {(m["home_team"], m["away_team"]) for m in matches}

        for o in odds_list:
            key = (o["home_team"], o["away_team"])
            if key not in fd_keys:
                # Odds API 경기를 일정으로 추가
                utc_str = o.get("commence_time", "")
                matches.append({
                    "id":          None,
                    "utcDate":     utc_str,
                    "status":      "SCHEDULED",
                    "competition": o.get("league", ""),
                    "comp_code":   o.get("league_key", ""),
                    "home_team":   o["home_team"],
                    "away_team":   o["away_team"],
                    "home_score":  None,
                    "away_score":  None,
                    "_source":     "odds_api"
                })
                fd_keys.add(key)
        print(f"  Odds API 추가: {len(matches) - len(fd_matches if fd_matches else [])}경기")
    except Exception as e:
        print(f"  Odds API 경기 추가 실패: {e}")

    # ── KST 변환 + 날짜 필터 + 리그별 그룹화 ──
    kst_offset = timedelta(hours=9)
    kst_zone   = timezone(kst_offset)

    now_kst    = datetime.now(kst_zone)
    if date:
        filter_from = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=kst_zone)
    else:
        filter_from = now_kst.replace(hour=0, minute=0, second=0)
    filter_to = filter_from + timedelta(days=days)

    grouped: dict[str, list] = {}
    for m in matches:
        try:
            raw = m.get("utcDate") or m.get("commence_time", "")
            if not raw:
                continue
            utc_dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            kst_dt = utc_dt.astimezone(kst_zone)

            # 날짜 범위 필터
            if not (filter_from <= kst_dt <= filter_to):
                continue

            m["kst_date"]     = kst_dt.strftime("%Y-%m-%d")
            m["kst_time"]     = kst_dt.strftime("%H:%M")
            m["kst_datetime"] = kst_dt.strftime("%Y-%m-%d %H:%M")
        except Exception:
            m["kst_date"] = (m.get("utcDate") or "")[:10]
            m["kst_time"] = "--:--"

        league = m.get("competition") or "기타"
        if league not in grouped:
            grouped[league] = []
        grouped[league].append(m)

    return {
        "total": sum(len(v) for v in grouped.values()),
        "by_league": grouped
    }


# ─────────────────────────────────────────
# 배당 API
# ─────────────────────────────────────────

@app.get("/odds", tags=["Odds"])
async def get_odds(force: bool = False):
    """전체 배당 조회 (캐시 30분 TTL)"""
    from odds_cache import get_all_odds, get_cache_status
    status = get_cache_status()
    odds = await get_all_odds(force=force)
    return {
        "cache": status,
        "count": len(odds),
        "odds": odds
    }


@app.get("/odds/match", tags=["Odds"])
async def get_match_odds(home: str, away: str):
    """특정 경기 배당 조회"""
    from odds_cache import find_match_odds
    match = await find_match_odds(home, away)
    if not match:
        raise HTTPException(
            status_code=404,
            detail=f"배당 정보 없음: {home} vs {away}"
        )
    return match


@app.post("/odds/refresh", tags=["Odds"])
async def refresh_odds():
    """배당 강제 갱신 (캐시 무시)"""
    from odds_cache import refresh_odds as _refresh
    odds = await _refresh()
    return {"status": "갱신 완료", "count": len(odds)}
