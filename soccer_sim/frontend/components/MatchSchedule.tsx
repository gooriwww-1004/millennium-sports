'use client'

import { useState, useEffect } from 'react'

interface Match {
  id: number
  home_team: string
  away_team: string
  competition: string
  kst_date: string
  kst_time: string
  status: string
  // 배당 (Odds API에서 자동 매칭)
  home_odds?: number
  draw_odds?: number
  away_odds?: number
  bookmaker?: string
}

interface OddsData {
  home_team: string
  away_team: string
  home_odds: number
  draw_odds: number
  away_odds: number
  bookmaker: string
}

interface Props {
  onSelect: (home: string, away: string, odds?: { home: number; draw: number; away: number }) => void
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  SCHEDULED: { text: '예정',  color: 'var(--t3)' },
  LIVE:      { text: 'LIVE', color: 'var(--red)' },
  IN_PLAY:   { text: 'LIVE', color: 'var(--red)' },
  FINISHED:  { text: '종료', color: 'var(--t3)' },
  POSTPONED: { text: '연기', color: 'var(--orange)' },
  CANCELLED: { text: '취소', color: 'var(--red)' },
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function MatchSchedule({ onSelect }: Props) {
  const [grouped, setGrouped]     = useState<Record<string, Match[]>>({})
  const [oddsMap, setOddsMap]     = useState<OddsData[]>([])
  const [loading, setLoading]     = useState(false)
  const [oddsLoading, setOddsLoading] = useState(false)
  const [days, setDays]           = useState(3)
  const [activeDate, setActiveDate] = useState('')
  const [allDates, setAllDates]   = useState<string[]>([])

  // 경기 일정 로드
  const loadMatches = async (d: number) => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/matches?days=${d}`)
      const data = await res.json()
      const byDate: Record<string, Match[]> = {}
      for (const matches of Object.values(data.by_league || {}) as Match[][]) {
        for (const m of matches) {
          const date = m.kst_date || '미정'
          if (!byDate[date]) byDate[date] = []
          byDate[date].push(m)
        }
      }
      const dates = Object.keys(byDate).sort()
      setAllDates(dates)
      setGrouped(byDate)
      if (dates.length > 0) setActiveDate(dates[0])
    } catch {}
    setLoading(false)
  }

  // 배당 로드 (별도 - 캐시 사용)
  const loadOdds = async () => {
    setOddsLoading(true)
    try {
      const res  = await fetch(`${API}/odds`)
      const data = await res.json()
      setOddsMap(data.odds || [])
    } catch {}
    setOddsLoading(false)
  }

  useEffect(() => { loadMatches(days) }, [days])
  useEffect(() => { loadOdds() }, [])

  // 배당 퍼지 매칭
  const findOdds = (home: string, away: string): OddsData | null => {
    const hl = home.toLowerCase()
    const al = away.toLowerCase()
    let best: OddsData | null = null
    let bestScore = 0
    for (const o of oddsMap) {
      const oh = o.home_team.toLowerCase()
      const oa = o.away_team.toLowerCase()
      let score = 0
      if (hl === oh) score += 10
      else if (hl.includes(oh) || oh.includes(hl)) score += 5
      if (al === oa) score += 10
      else if (al.includes(oa) || oa.includes(al)) score += 5
      if (score > bestScore) { bestScore = score; best = o }
    }
    return bestScore >= 5 ? best : null
  }

  const todayMatches = (grouped[activeDate] || [])
    .sort((a, b) => a.kst_time.localeCompare(b.kst_time))

  const handleSelect = (m: Match) => {
    const odds = findOdds(m.home_team, m.away_team)
    onSelect(
      m.home_team,
      m.away_team,
      odds ? { home: odds.home_odds, draw: odds.draw_odds, away: odds.away_odds } : undefined
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 기간 탭 */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 3, 7].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            flex: 1, height: 36, borderRadius: 9, fontSize: 12,
            fontFamily: 'var(--font-mono)',
            border: `1px solid ${days === d ? 'rgba(0,229,160,.4)' : 'var(--border)'}`,
            background: days === d ? 'rgba(0,229,160,.1)' : 'transparent',
            color: days === d ? 'var(--accent)' : 'var(--t2)',
            cursor: 'pointer', transition: 'all .15s'
          }}>
            {d === 1 ? '오늘' : d === 3 ? '3일' : '7일'}
          </button>
        ))}
        {/* 배당 갱신 버튼 */}
        <button onClick={loadOdds} disabled={oddsLoading} style={{
          width: 36, height: 36, borderRadius: 9, fontSize: 14,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: oddsLoading ? 'var(--t3)' : 'var(--accent)',
          cursor: oddsLoading ? 'not-allowed' : 'pointer',
          transition: 'all .15s',
          animation: oddsLoading ? 'spin .8s linear infinite' : 'none'
        }} title="배당 새로고침">
          {oddsLoading ? '⟳' : '💰'}
        </button>
      </div>

      {/* 날짜 탭 */}
      {allDates.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {allDates.map(date => (
            <button key={date} onClick={() => setActiveDate(date)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 8, fontSize: 11,
              fontFamily: 'var(--font-mono)',
              border: `1px solid ${activeDate === date ? 'rgba(0,229,160,.4)' : 'var(--border)'}`,
              background: activeDate === date ? 'rgba(0,229,160,.1)' : 'transparent',
              color: activeDate === date ? 'var(--accent)' : 'var(--t2)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s'
            }}>
              {date.slice(5)} ({(grouped[date] || []).length})
            </button>
          ))}
        </div>
      )}

      {/* 경기 리스트 */}
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
            경기 일정 불러오는 중...
          </div>
        ) : todayMatches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
            경기 없음
          </div>
        ) : (
          todayMatches.map((m, i) => {
            const st   = STATUS_LABEL[m.status] || { text: m.status, color: 'var(--t3)' }
            const odds = findOdds(m.home_team, m.away_team)
            const hasOdds = !!odds

            return (
              <button key={i} onClick={() => handleSelect(m)} style={{
                background: 'var(--bg-card)', border: `1px solid ${hasOdds ? 'rgba(0,229,160,.2)' : 'var(--border)'}`,
                borderRadius: 12, padding: '12px 14px',
                cursor: 'pointer', transition: 'all .15s',
                textAlign: 'left', color: 'var(--t1)',
                display: 'flex', flexDirection: 'column', gap: 8
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,229,160,.45)'
                e.currentTarget.style.background = 'rgba(0,229,160,.04)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = hasOdds ? 'rgba(0,229,160,.2)' : 'var(--border)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
              >
                {/* 리그 + 시간 + 상태 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                    background: 'rgba(0,229,160,.07)', padding: '2px 7px',
                    borderRadius: 5, border: '1px solid rgba(0,229,160,.15)'
                  }}>{m.competition}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}>
                      {m.kst_time} KST
                    </span>
                    <span style={{ fontSize: 10, color: st.color, fontWeight: 600 }}>{st.text}</span>
                  </div>
                </div>

                {/* 홈 vs 원정 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{m.home_team}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', padding: '0 10px' }}>vs</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'right' }}>{m.away_team}</span>
                </div>

                {/* 배당 표시 */}
                {hasOdds ? (
                  <div style={{
                    display: 'flex', gap: 6,
                    borderTop: '1px solid var(--border)', paddingTop: 8
                  }}>
                    {[
                      { label: '홈', val: odds.home_odds, color: 'var(--accent)' },
                      { label: '무', val: odds.draw_odds, color: 'var(--t1)' },
                      { label: '원정', val: odds.away_odds, color: 'var(--gold)' },
                    ].map(o => (
                      <div key={o.label} style={{
                        flex: 1, textAlign: 'center',
                        background: 'var(--bg-input)',
                        borderRadius: 8, padding: '5px 4px'
                      }}>
                        <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 2 }}>{o.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: o.color }}>
                          {o.val?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                        {odds.bookmaker}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center', paddingTop: 4 }}>
                    {oddsLoading ? '배당 로딩 중...' : '배당 없음 — 직접 입력'}
                  </div>
                )}

                <div style={{ fontSize: 10, color: 'var(--accent)', textAlign: 'right', opacity: 0.7 }}>
                  {hasOdds ? '탭하면 배당 자동 입력 →' : '탭하여 분석 →'}
                </div>
              </button>
            )
          })
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
