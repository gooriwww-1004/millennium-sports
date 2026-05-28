'use client'
import { useState, useEffect } from 'react'
import { getMatches, type MatchInfo } from '@/lib/api'

interface Props {
  league: string
  onSelect: (m: MatchInfo) => void
}

export default function MatchSchedule({ league, onSelect }: Props) {
  const [byDate, setByDate]     = useState<Record<string, MatchInfo[]>>({})
  const [days, setDays]         = useState(3)
  const [loading, setLoading]   = useState(false)
  const [activeDate, setActive] = useState('')

  const load = async (d: number) => {
    setLoading(true)
    const data = await getMatches(league, d)
    const dates = Object.keys(data).sort()
    setByDate(data)
    if (dates.length) setActive(dates[0])
    setLoading(false)
  }

  useEffect(() => { load(days) }, [days, league])

  const matches = byDate[activeDate] || []
  const dates   = Object.keys(byDate).sort()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* 기간 탭 */}
      <div style={{ display:'flex', gap:6 }}>
        {[1,3,7].map(d => (
          <button key={d} onClick={()=>setDays(d)} style={{
            flex:1, height:34, borderRadius:8, fontSize:12,
            fontFamily:'var(--font-mono)',
            border:`1px solid ${days===d?'rgba(59,130,246,.45)':'var(--border)'}`,
            background: days===d?'rgba(59,130,246,.12)':'transparent',
            color: days===d?'var(--accent)':'var(--t2)',
            cursor:'pointer', transition:'all .15s'
          }}>{d===1?'오늘':d===3?'3일':'7일'}</button>
        ))}
      </div>

      {/* 날짜 탭 */}
      {dates.length > 0 && (
        <div style={{ display:'flex', gap:5, overflowX:'auto', scrollbarWidth:'none' }}>
          {dates.map(date => (
            <button key={date} onClick={()=>setActive(date)} style={{
              flexShrink:0, padding:'4px 10px', borderRadius:7, fontSize:10,
              fontFamily:'var(--font-mono)',
              border:`1px solid ${activeDate===date?'rgba(59,130,246,.45)':'var(--border)'}`,
              background: activeDate===date?'rgba(59,130,246,.12)':'transparent',
              color: activeDate===date?'var(--accent)':'var(--t2)',
              cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s'
            }}>{date.slice(5)} ({(byDate[date]||[]).length})</button>
          ))}
        </div>
      )}

      {/* 경기 리스트 */}
      <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
        {loading ? (
          <div style={{ padding:20, textAlign:'center', color:'var(--t3)', fontSize:12 }}>불러오는 중...</div>
        ) : matches.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', color:'var(--t3)', fontSize:12 }}>
            {league === 'KBO' ? 'KBO 경기 없음 (시즌 중 확인)' : '경기 없음'}
          </div>
        ) : matches.sort((a,b)=>a.kst_time.localeCompare(b.kst_time)).map((m, i) => {
          const hasOdds = m.home_odds && m.away_odds
          return (
            <button key={i} onClick={()=>onSelect(m)} style={{
              background:'var(--bg-card)', border:`1px solid ${hasOdds?'rgba(59,130,246,.2)':'var(--border)'}`,
              borderRadius:12, padding:'12px 14px', cursor:'pointer',
              textAlign:'left', color:'var(--t1)', display:'flex', flexDirection:'column', gap:7,
              transition:'all .15s'
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(59,130,246,.5)';e.currentTarget.style.background='rgba(59,130,246,.04)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=hasOdds?'rgba(59,130,246,.2)':'var(--border)';e.currentTarget.style.background='var(--bg-card)'}}>
              {/* 리그 + 시간 */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:10, color:'var(--accent)', fontFamily:'var(--font-mono)', background:'rgba(59,130,246,.08)', padding:'2px 7px', borderRadius:5, border:'1px solid rgba(59,130,246,.2)' }}>
                  {m.league}
                </span>
                <span style={{ fontSize:11, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>{m.kst_time} KST</span>
              </div>
              {/* 팀명 */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{m.home_team}</span>
                <span style={{ fontSize:10, color:'var(--t3)', padding:'0 8px' }}>vs</span>
                <span style={{ fontSize:13, fontWeight:600, flex:1, textAlign:'right' }}>{m.away_team}</span>
              </div>
              {/* 배당 */}
              {hasOdds ? (
                <div style={{ display:'flex', gap:6 }}>
                  {[{l:'홈',v:m.home_odds,c:'var(--accent)'},{l:'원정',v:m.away_odds,c:'var(--gold)'}].map(o=>(
                    <div key={o.l} style={{ flex:1, textAlign:'center', background:'var(--bg-input)', borderRadius:7, padding:'5px' }}>
                      <div style={{ fontSize:9, color:'var(--t3)', marginBottom:2 }}>{o.l}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:600, color:o.c }}>{o.v?.toFixed(2)}</div>
                    </div>
                  ))}
                  <div style={{ display:'flex', alignItems:'center', paddingLeft:4 }}>
                    <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>{m.bookmaker}</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:10, color:'var(--t3)', textAlign:'center' }}>배당 없음 — 직접 입력</div>
              )}
              <div style={{ fontSize:10, color:'var(--accent)', textAlign:'right', opacity:.7 }}>
                {hasOdds ? '탭하면 자동 입력 →' : '탭하여 분석 →'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
