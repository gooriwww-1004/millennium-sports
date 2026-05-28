'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TeamSelect from '@/components/TeamSelect'
import MatchSchedule from '@/components/MatchSchedule'
import { OptionSelect, FormSelect } from '@/components/OptionSelect'
import type { TeamInfo, MatchInfo } from '@/lib/api'

const LEAGUES = [
  { key:'KBO', flag:'🇰🇷', name:'KBO' },
  { key:'MLB', flag:'🇺🇸', name:'MLB' },
  { key:'NPB', flag:'🇯🇵', name:'NPB' },
]

const PITCHER_OPTIONS = [
  { key:'ace',     icon:'🔥', label:'에이스 (1선발)',      desc:'ERA -28%' },
  { key:'mid',     icon:'⚾', label:'로테이션 (2~3선발)',   desc:'기본값' },
  { key:'back',    icon:'📉', label:'하위선발 (4~5선발)',   desc:'ERA +38%' },
  { key:'unknown', icon:'❓', label:'모름 (평균값)',        desc:'정보 없음' },
]
const PARK_OPTIONS = [
  { key:'pitcher', icon:'🏟️', label:'투수 유리',   desc:'득점 ×0.88' },
  { key:'neutral', icon:'⚖️', label:'중립 구장',   desc:'기본값' },
  { key:'hitter',  icon:'💪', label:'타자 유리',   desc:'득점 ×1.15' },
]
const BULLPEN_OPTIONS = [
  { key:'normal',  icon:'✅', label:'정상',          desc:'' },
  { key:'tired',   icon:'😴', label:'피로 (전날 혹사)', desc:'실점 +22%' },
  { key:'unknown', icon:'❓', label:'모름',          desc:'평균 적용' },
]

export default function HomePage() {
  const router = useRouter()
  const [league, setLeague]       = useState('KBO')
  const [homeTeam, setHomeTeam]   = useState<TeamInfo|null>(null)
  const [awayTeam, setAwayTeam]   = useState<TeamInfo|null>(null)
  const [homeName, setHomeName]   = useState('')
  const [awayName, setAwayName]   = useState('')
  const [homeOdds, setHomeOdds]   = useState('')
  const [awayOdds, setAwayOdds]   = useState('')
  const [homePitcher, setHomePitcher] = useState('mid')
  const [awayPitcher, setAwayPitcher] = useState('mid')
  const [parkFactor, setParkFactor]   = useState('neutral')
  const [homeForm3, setHomeForm3]     = useState(2)
  const [awayForm3, setAwayForm3]     = useState(2)
  const [homeBullpen, setHomeBullpen] = useState('normal')
  const [awayBullpen, setAwayBullpen] = useState('normal')
  const [activeSelect, setActiveSelect] = useState<'home'|'away'|null>(null)
  const [homeDefRate, setHomeDefRate] = useState<number|null>(null)
  const [awayDefRate, setAwayDefRate] = useState<number|null>(null)
  const [homePitcherEra, setHomePitcherEra] = useState<number|null>(null)
  const [awayPitcherEra, setAwayPitcherEra] = useState<number|null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [showVars, setShowVars]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const isReady = homeName.trim() && awayName.trim() && parseFloat(homeOdds)>1 && parseFloat(awayOdds)>1

  // 경기 일정 탭 → 자동 입력
  const handleMatchSelect = (m: MatchInfo) => {
    setHomeName(m.home_team); setAwayName(m.away_team)
    setHomeTeam(null); setAwayTeam(null)
    if (m.home_odds) setHomeOdds(String(m.home_odds))
    if (m.away_odds) setAwayOdds(String(m.away_odds))
  }


  // 팀 스탯 자동 조회
  const fetchTeamStats = async (teamName: string, side: 'home'|'away') => {
    if (!teamName.trim()) return
    setStatsLoading(true)
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API}/stats/${league}/${encodeURIComponent(teamName)}`)
      if (!res.ok) return
      const data = await res.json()
      if (side === 'home') {
        if (data.recent3 !== null && data.recent3 !== undefined) setHomeForm3(Math.min(data.recent3, 3))
        if (data.def_rate) setHomeDefRate(data.def_rate)
        if (data.era) setHomePitcherEra(null) // 팀ERA는 별도, 선발ERA는 starters API로
      } else {
        if (data.recent3 !== null && data.recent3 !== undefined) setAwayForm3(Math.min(data.recent3, 3))
        if (data.def_rate) setAwayDefRate(data.def_rate)
      }
      console.log(`✅ ${teamName} 스탯 자동 로드:`, data)
    } catch (e) {
      console.log(`⚠ ${teamName} 스탯 조회 실패 — 수동 입력`)
    }
    setStatsLoading(false)
  }

  const handleAnalyze = async () => {
    if (!isReady||loading) return
    setLoading(true); setError('')
    try {
      const q = new URLSearchParams({
        ht: homeName, at: awayName, lg: league,
        ho: homeOdds, ao: awayOdds,
        hp: homePitcher, ap: awayPitcher,
        pk: parkFactor,
        hf: String(homeForm3), af: String(awayForm3),
        hb: homeBullpen, ab: awayBullpen,
        ...(homeDefRate ? {hdr: String(homeDefRate)} : {}),
        ...(awayDefRate ? {adr: String(awayDefRate)} : {}),
        ...(homePitcherEra ? {hpera: String(homePitcherEra)} : {}),
        ...(awayPitcherEra ? {apera: String(awayPitcherEra)} : {}),
        ...(homeTeam?.ops ? {hops: String(homeTeam.ops)} : {}),
        ...(awayTeam?.ops ? {aops: String(awayTeam.ops)} : {}),
        ...(homeTeam?.era ? {hera: String(homeTeam.era)} : {}),
        ...(awayTeam?.era ? {aera: String(awayTeam.era)} : {}),
      })
      router.push(`/analysis?${q}`)
    } catch { setError('오류가 발생했습니다.'); setLoading(false) }
  }

  return (
    <main className="app-shell">
      {/* 헤더 */}
      <div style={{ padding:'24px 0 18px' }} className="fade-up-1">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <span style={{ fontSize:20 }}>⚾</span>
          <span style={{ fontFamily:'var(--font-display)', fontSize:11, letterSpacing:'3px', color:'var(--accent)' }}>
            MILLENNIUM SESSION
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 className="section-title">BASEBALL<br/>ANALYZER</h1>
            <p style={{ fontSize:12, color:'var(--t2)', marginTop:5 }}>음이항분포 5,000회 시뮬레이션 · EV 분석</p>
          </div>
          <button onClick={()=>router.push('/history')} style={{
            marginTop:8, padding:'8px 14px', borderRadius:10,
            background:'var(--bg-raised)', border:'1px solid var(--border-md)',
            color:'var(--t2)', cursor:'pointer', fontSize:12,
            fontFamily:'var(--font-mono)', display:'flex', alignItems:'center', gap:6,
            transition:'all .18s'
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(59,130,246,.4)';e.currentTarget.style.color='var(--accent)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-md)';e.currentTarget.style.color='var(--t2)'}}>
            📋 기록
          </button>
        </div>
      </div>

      {/* 리그 탭 */}
      <div className="fade-up-1" style={{ display:'flex', gap:7, marginBottom:14 }}>
        {LEAGUES.map(l => (
          <button key={l.key} onClick={()=>{ setLeague(l.key); setHomeName(''); setAwayName(''); setHomeTeam(null); setAwayTeam(null) }}
            style={{
              flex:1, height:42, borderRadius:11, fontSize:14,
              border:`1px solid ${league===l.key?'rgba(59,130,246,.5)':'var(--border)'}`,
              background: league===l.key?'rgba(59,130,246,.12)':'transparent',
              color: league===l.key?'var(--accent)':'var(--t2)',
              cursor:'pointer', transition:'all .18s',
              fontFamily:'var(--font-display)', letterSpacing:'1px'
            }}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        {/* 경기 일정 */}
        <div className="card fade-up-1">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span className="label" style={{ margin:0 }}>TODAY'S GAMES</span>
            <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>탭하면 자동 입력</span>
          </div>
          <MatchSchedule league={league} onSelect={handleMatchSelect}/>
        </div>

        {/* 팀 선택 */}
        <div className="card fade-up-2" style={{ display:'flex', flexDirection:'column', gap:14, overflow:'visible' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>
            ⚡ 리그 무관 — 아무 팀이나 조합 가능
          </div>
          <div style={{ position:'relative', zIndex:activeSelect==='home'?30:10 }}>
            <TeamSelect label="홈팀 (HOME)" value={homeName} league={league}
              onOpen={()=>setActiveSelect('home')} onClose={()=>setActiveSelect(null)}
              onChange={(t,n)=>{ setHomeTeam(t); setHomeName(n); if(n) fetchTeamStats(n,'home') }}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--t3)', fontSize:10 }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>VS
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          </div>
          <div style={{ position:'relative', zIndex:activeSelect==='away'?30:9 }}>
            <TeamSelect label="원정팀 (AWAY)" value={awayName} league={league}
              onOpen={()=>setActiveSelect('away')} onClose={()=>setActiveSelect(null)}
              onChange={(t,n)=>{ setAwayTeam(t); setAwayName(n); if(n) fetchTeamStats(n,'away') }}/>
          </div>
        </div>

        {/* 배당 입력 */}
        <div className="card fade-up-2">
          <div className="label">배당 입력</div>
          <div style={{ display:'flex', gap:10 }}>
            {[
              {label:'홈 승', val:homeOdds, set:setHomeOdds, color:'var(--accent)'},
              {label:'원정 승', val:awayOdds, set:setAwayOdds, color:'var(--gold)'},
            ].map(f => (
              <div key={f.label} style={{ flex:1 }}>
                <label className="label" style={{ textAlign:'center', display:'block' }}>{f.label}</label>
                <input type="number" inputMode="decimal" step="0.01" min="1.01" className="input-field"
                  value={f.val} onChange={e=>f.set(e.target.value)} placeholder="1.90"
                  style={{ textAlign:'center', fontSize:22, fontFamily:'var(--font-mono)', fontWeight:600, color:f.color }}/>
              </div>
            ))}
          </div>
          {/* 마진 표시 */}
          {parseFloat(homeOdds)>1 && parseFloat(awayOdds)>1 && (() => {
            const m = ((1/parseFloat(homeOdds)+1/parseFloat(awayOdds)-1)*100).toFixed(1)
            return <div style={{ textAlign:'center', fontSize:11, color:'var(--t3)', fontFamily:'var(--font-mono)', marginTop:8 }}>
              북메이커 마진 {m}%
            </div>
          })()}
        </div>

        {/* 변수 설정 */}
        <div className="fade-up-3">
          <button onClick={()=>setShowVars(!showVars)} style={{
            width:'100%', height:40, background:'transparent',
            border:'1px solid var(--border)', borderRadius:10,
            color:showVars?'var(--accent)':'var(--t2)', fontSize:12,
            fontFamily:'var(--font-mono)', cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center', gap:6, transition:'all .2s'
          }}>
            <span style={{ transform:showVars?'rotate(90deg)':'none', transition:'transform .2s' }}>▶</span>
            변수 설정 (투수 · 구장 · 폼 · 불펜)
            {!showVars && <span style={{ fontSize:10, color:'var(--t3)', marginLeft:4 }}>기본값 적용 중</span>}
          </button>

          {showVars && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
              <div className="card">
                <OptionSelect label={`홈팀 선발 투수 — ${homeName||'홈팀'}`}
                  value={homePitcher} options={PITCHER_OPTIONS} onChange={setHomePitcher} compact/>
              </div>
              <div className="card">
                <OptionSelect label={`원정팀 선발 투수 — ${awayName||'원정팀'}`}
                  value={awayPitcher} options={PITCHER_OPTIONS} onChange={setAwayPitcher} compact/>
              </div>
              <div className="card">
                <OptionSelect label="구장 특성" value={parkFactor} options={PARK_OPTIONS} onChange={setParkFactor} compact/>
              </div>
              <div className="card">
                <FormSelect label={`홈팀 최근 3경기 — ${homeName||'홈팀'}`} value={homeForm3} onChange={setHomeForm3}/>
              </div>
              <div className="card">
                <FormSelect label={`원정팀 최근 3경기 — ${awayName||'원정팀'}`} value={awayForm3} onChange={setAwayForm3}/>
              </div>
              <div className="card">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <OptionSelect label={`홈 불펜`} value={homeBullpen} options={BULLPEN_OPTIONS} onChange={setHomeBullpen} compact/>
                  <OptionSelect label={`원정 불펜`} value={awayBullpen} options={BULLPEN_OPTIONS} onChange={setAwayBullpen} compact/>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding:'12px 16px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, fontSize:13, color:'var(--red)' }}>
            🚫 {error}
          </div>
        )}

        <button className="btn-primary fade-up-4" onClick={handleAnalyze} disabled={!isReady||loading}
          style={{ animation: isReady&&!loading?'pulse-blue 3s ease-in-out infinite':undefined }}>
          {loading ? '시뮬레이션 실행 중...' : '⚾ 시뮬레이션 실행'}
        </button>
      </div>
    </main>
  )
}
