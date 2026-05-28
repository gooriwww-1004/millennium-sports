'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface HistoryItem {
  analyzed_at:  string
  home_team:    string
  away_team:    string
  league:       string
  home_odds:    number
  away_odds:    number
  home_prob:    number
  away_prob:    number
  ev_home:      number
  ev_away:      number
  home_grade:   string
  away_grade:   string
  home_run_exp: number
  away_run_exp: number
  top_scores:   { score: string; prob: number }[]
  summary:      string
  adjustments:  {
    home_pitcher_label: string
    away_pitcher_label: string
    park_label:         string
    home_form_label:    string
    away_form_label:    string
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const GRADE_COLOR: Record<string, string> = {
  A: 'var(--green)', B: 'var(--gold)', C: 'var(--red)'
}
const LEAGUE_FLAG: Record<string, string> = {
  KBO: '🇰🇷', MLB: '🇺🇸', NPB: '🇯🇵'
}

export default function HistoryPage() {
  const router = useRouter()
  const [items, setItems]       = useState<HistoryItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [league, setLeague]     = useState('ALL')
  const [confirmClear, setConfirmClear] = useState(false)

  const load = async (lg: string) => {
    setLoading(true)
    try {
      const url = lg === 'ALL'
        ? `${API}/history?limit=100`
        : `${API}/history?limit=100&league=${lg}`
      const res  = await fetch(url)
      const data = await res.json()
      setItems(data.items || [])
    } catch { setItems([]) }
    setLoading(false)
  }

  useEffect(() => { load(league) }, [league])

  const handleClear = async () => {
    await fetch(`${API}/history`, { method: 'DELETE' })
    setItems([]); setConfirmClear(false); setSelected(null)
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    } catch { return iso.slice(5,16) }
  }

  const bestEV = (item: HistoryItem) =>
    item.ev_home >= item.ev_away
      ? { label:'홈', ev:item.ev_home, grade:item.home_grade }
      : { label:'원정', ev:item.ev_away, grade:item.away_grade }

  return (
    <main className="app-shell">
      {/* 헤더 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 0 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>router.back()} style={{
            width:36, height:36, borderRadius:9,
            background:'var(--bg-raised)', border:'1px solid var(--border)',
            color:'var(--t1)', cursor:'pointer', fontSize:15
          }}>←</button>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, lineHeight:1 }}>
              HISTORY
            </h1>
            <p style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)', marginTop:2 }}>
              분석 기록 {items.length}건
            </p>
          </div>
        </div>

        {/* 삭제 버튼 */}
        {!confirmClear ? (
          <button onClick={()=>setConfirmClear(true)} style={{
            padding:'6px 12px', borderRadius:8, fontSize:11,
            background:'transparent', border:'1px solid rgba(239,68,68,.3)',
            color:'var(--red)', cursor:'pointer', fontFamily:'var(--font-mono)'
          }}>전체 삭제</button>
        ) : (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={handleClear} style={{
              padding:'6px 12px', borderRadius:8, fontSize:11,
              background:'rgba(239,68,68,.15)', border:'1px solid var(--red)',
              color:'var(--red)', cursor:'pointer', fontFamily:'var(--font-mono)'
            }}>확인</button>
            <button onClick={()=>setConfirmClear(false)} style={{
              padding:'6px 12px', borderRadius:8, fontSize:11,
              background:'transparent', border:'1px solid var(--border)',
              color:'var(--t2)', cursor:'pointer'
            }}>취소</button>
          </div>
        )}
      </div>

      {/* 리그 필터 */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {['ALL','KBO','MLB','NPB'].map(lg => (
          <button key={lg} onClick={()=>setLeague(lg)} style={{
            flex:1, height:36, borderRadius:9, fontSize:11,
            fontFamily:'var(--font-mono)',
            border:`1px solid ${league===lg?'rgba(59,130,246,.45)':'var(--border)'}`,
            background: league===lg?'rgba(59,130,246,.12)':'transparent',
            color: league===lg?'var(--accent)':'var(--t2)',
            cursor:'pointer', transition:'all .15s'
          }}>{LEAGUE_FLAG[lg] || '🌐'} {lg}</button>
        ))}
      </div>

      {/* 리스트 */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:82 }}/>)}
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ color:'var(--t2)', fontSize:14 }}>분석 기록이 없습니다</div>
          <div style={{ color:'var(--t3)', fontSize:12, marginTop:6 }}>시뮬레이션을 실행하면 자동으로 저장됩니다</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((item, i) => {
            const best = bestEV(item)
            const isSelected = selected?.analyzed_at === item.analyzed_at

            return (
              <div key={i}>
                {/* 카드 */}
                <button onClick={()=>setSelected(isSelected ? null : item)} style={{
                  width:'100%', background: isSelected?'rgba(59,130,246,.07)':'var(--bg-card)',
                  border:`1px solid ${isSelected?'rgba(59,130,246,.4)':'var(--border)'}`,
                  borderRadius: isSelected?'14px 14px 0 0':14, padding:'14px 16px',
                  cursor:'pointer', textAlign:'left', color:'var(--t1)',
                  transition:'all .18s'
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    {/* 왼쪽: 팀명 + 확률 */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <span style={{ fontSize:11 }}>{LEAGUE_FLAG[item.league]}</span>
                        <span style={{
                          fontSize:9, color:'var(--accent)', fontFamily:'var(--font-mono)',
                          background:'rgba(59,130,246,.08)', padding:'1px 6px',
                          borderRadius:5, border:'1px solid rgba(59,130,246,.2)'
                        }}>{item.league}</span>
                        <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>
                          {formatDate(item.analyzed_at)}
                        </span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4 }}>
                        {item.home_team}
                        <span style={{ color:'var(--t3)', fontWeight:400, fontSize:11, margin:'0 6px' }}>vs</span>
                        {item.away_team}
                      </div>
                      <div style={{ fontSize:11, color:'var(--t2)', marginTop:4, fontFamily:'var(--font-mono)' }}>
                        홈 {item.home_prob}% · 원정 {item.away_prob}%
                      </div>
                    </div>

                    {/* 오른쪽: EV 배지 */}
                    <div style={{ textAlign:'right', marginLeft:12 }}>
                      <div style={{
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        width:30, height:30, borderRadius:9,
                        fontFamily:'var(--font-display)', fontSize:16,
                        background: best.grade==='A'?'rgba(34,197,94,.15)':best.grade==='B'?'rgba(245,158,11,.12)':'rgba(239,68,68,.1)',
                        border: `1px solid ${best.grade==='A'?'rgba(34,197,94,.3)':best.grade==='B'?'rgba(245,158,11,.3)':'rgba(239,68,68,.25)'}`,
                        color: GRADE_COLOR[best.grade],
                        marginBottom:4
                      }}>{best.grade}</div>
                      <div style={{
                        fontSize:12, fontFamily:'var(--font-mono)', fontWeight:600,
                        color: best.ev > 0 ? 'var(--green)' : 'var(--red)'
                      }}>
                        {best.ev >= 0 ? '+' : ''}{best.ev.toFixed(1)}%
                      </div>
                      <div style={{ fontSize:9, color:'var(--t3)' }}>{best.label}</div>
                    </div>
                  </div>
                </button>

                {/* 펼치면 상세 */}
                {isSelected && (
                  <div style={{
                    background:'var(--bg-raised)',
                    border:'1px solid rgba(59,130,246,.4)',
                    borderTop:'none', borderRadius:'0 0 14px 14px',
                    padding:'14px 16px',
                    display:'flex', flexDirection:'column', gap:12
                  }}>
                    {/* 배당 + 기대득점 */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        {label:'홈 배당', val:item.home_odds.toFixed(2), c:'var(--accent)'},
                        {label:'원정 배당', val:item.away_odds.toFixed(2), c:'var(--gold)'},
                        {label:'홈 기대득점', val:item.home_run_exp.toFixed(1), c:'var(--accent)'},
                        {label:'원정 기대득점', val:item.away_run_exp.toFixed(1), c:'var(--gold)'},
                      ].map(x => (
                        <div key={x.label} style={{
                          background:'var(--bg-input)', borderRadius:9, padding:'9px 12px'
                        }}>
                          <div style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{x.label}</div>
                          <div style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:600, color:x.c }}>{x.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* EV */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        {label:'홈 EV', ev:item.ev_home, grade:item.home_grade},
                        {label:'원정 EV', ev:item.ev_away, grade:item.away_grade},
                      ].map(x => (
                        <div key={x.label} style={{
                          background:'var(--bg-input)', borderRadius:9, padding:'9px 12px',
                          display:'flex', alignItems:'center', justifyContent:'space-between'
                        }}>
                          <div>
                            <div style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{x.label}</div>
                            <div style={{
                              fontFamily:'var(--font-mono)', fontSize:15, fontWeight:600,
                              color: x.ev > 0 ? 'var(--green)' : 'var(--red)'
                            }}>{x.ev >= 0 ? '+' : ''}{x.ev.toFixed(1)}%</div>
                          </div>
                          <div style={{
                            width:26, height:26, borderRadius:8,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontFamily:'var(--font-display)', fontSize:14,
                            color: GRADE_COLOR[x.grade],
                            background: x.grade==='A'?'rgba(34,197,94,.12)':x.grade==='B'?'rgba(245,158,11,.1)':'rgba(239,68,68,.08)',
                            border: `1px solid ${x.grade==='A'?'rgba(34,197,94,.25)':x.grade==='B'?'rgba(245,158,11,.25)':'rgba(239,68,68,.2)'}`
                          }}>{x.grade}</div>
                        </div>
                      ))}
                    </div>

                    {/* 예상 스코어 */}
                    {item.top_scores?.length > 0 && (
                      <div>
                        <div style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--font-mono)', marginBottom:8, letterSpacing:'.08em', textTransform:'uppercase' }}>
                          예상 스코어 TOP {item.top_scores.length}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          {item.top_scores.map((s, si) => (
                            <div key={si} style={{
                              flex:1, textAlign:'center',
                              background:'var(--bg-input)', borderRadius:9, padding:'8px 6px'
                            }}>
                              <div style={{
                                fontFamily:'var(--font-mono)', fontSize:14, fontWeight:si===0?600:400,
                                color:si===0?'var(--accent)':'var(--t1)', marginBottom:3
                              }}>{s.score}</div>
                              <div style={{ fontSize:10, color:'var(--t2)', fontFamily:'var(--font-mono)' }}>
                                {s.prob.toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 적용 변수 */}
                    <div style={{
                      padding:'10px 12px', background:'var(--bg-input)',
                      borderRadius:9, display:'flex', flexDirection:'column', gap:5
                    }}>
                      {[
                        ['홈 선발', item.adjustments?.home_pitcher_label],
                        ['원정 선발', item.adjustments?.away_pitcher_label],
                        ['구장', item.adjustments?.park_label],
                        ['홈 최근3', item.adjustments?.home_form_label],
                        ['원정 최근3', item.adjustments?.away_form_label],
                      ].filter(([,v]) => v).map(([k,v]) => (
                        <div key={k as string} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                          <span style={{ color:'var(--t3)' }}>{k}</span>
                          <span style={{ color:'var(--t1)', fontWeight:500 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* 다시 분석 버튼 */}
                    <button onClick={()=>{
                      const q = new URLSearchParams({
                        ht: item.home_team, at: item.away_team, lg: item.league,
                        ho: String(item.home_odds), ao: String(item.away_odds),
                      })
                      router.push(`/analysis?${q}`)
                    }} style={{
                      width:'100%', height:40, borderRadius:10,
                      background:'rgba(59,130,246,.1)',
                      border:'1px solid rgba(59,130,246,.3)',
                      color:'var(--accent)', cursor:'pointer',
                      fontFamily:'var(--font-mono)', fontSize:12,
                      transition:'all .15s'
                    }}>
                      ⚾ 이 경기 다시 분석
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
