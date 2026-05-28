'use client'
import type { AnalysisResult } from '@/lib/api'
import { formatEV, formatProb, gradeClass } from '@/lib/api'

export default function ResultCard({ result, homeTeam, awayTeam }: {
  result: AnalysisResult; homeTeam: string; awayTeam: string
}) {
  const { probabilities: p, ev, top_scores, adjustments, events } = result
  const bestEV = ev.home >= ev.away ? 'home' : 'away'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* 이벤트 배너 */}
      {(events.high_ev||events.ace_vs_back||events.hitter_park_warning||events.bullpen_risk||events.all_ev_negative) && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {events.value_home_found && <Banner icon="⚡" text="홈팀 기대값이 배당보다 높습니다" color="blue"/>}
          {events.value_away_found && <Banner icon="⚡" text="원정팀 기대값이 배당보다 높습니다" color="blue"/>}
          {events.high_ev && !events.value_home_found && !events.value_away_found && <Banner icon="🎯" text="가치 배팅 포착! EV 8% 이상" color="gold"/>}
          {events.ace_vs_back && <Banner icon="🔥" text="에이스 vs 하위선발 — 전력 격차 큼" color="orange"/>}
          {events.hitter_park_warning && <Banner icon="💪" text="타자 유리 구장 — 득점 상승 예상" color="purple"/>}
          {events.bullpen_risk && <Banner icon="😴" text="불펜 피로 — 중후반 실점 위험" color="red"/>}
          {events.all_ev_negative && <Banner icon="🚫" text="모든 선택지 EV 마이너스 — 패스 권장" color="red"/>}
        </div>
      )}

      {/* 기대 득점 */}
      <div className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>홈 기대득점</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:36, color:'var(--accent)', lineHeight:1 }}>
            {result.home_run_exp.toFixed(1)}
          </div>
        </div>
        <div style={{ color:'var(--t3)', fontSize:12, fontFamily:'var(--font-display)' }}>VS</div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>원정 기대득점</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:36, color:'var(--gold)', lineHeight:1 }}>
            {result.away_run_exp.toFixed(1)}
          </div>
        </div>
      </div>

      {/* 승률 + EV */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ textAlign:'center', fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>홈 승</div>
          <div style={{ textAlign:'center', fontSize:10, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>원정 승</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:'14px 16px' }}>
          {[{v:p.home,c:'var(--accent)'},{v:p.away,c:'var(--gold)'}].map((x,i)=>(
            <div key={i} style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:38, color:x.c, lineHeight:1 }}>
              {formatProb(x.v)}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', height:4, margin:'0 16px', borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:formatProb(p.home), background:'var(--accent)', transition:'width .6s ease' }}/>
          <div style={{ width:formatProb(p.away), background:'var(--gold)', transition:'width .6s ease' }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', padding:'12px 16px', borderTop:'1px solid var(--border)', marginTop:10 }}>
          {[
            {ev:ev.home, grade:ev.home_grade, best:bestEV==='home'},
            {ev:ev.away, grade:ev.away_grade, best:bestEV==='away'}
          ].map((x,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div className={`grade-badge ${gradeClass(x.grade)}`} style={{ margin:'0 auto 6px' }}>{x.grade}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:500, color:x.ev>0?'var(--green)':'var(--red)' }}>
                {formatEV(x.ev)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 조정 정보 */}
      <div className="card">
        <div className="label" style={{ marginBottom:10 }}>적용된 변수</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            ['홈 선발', adjustments.home_pitcher_label],
            ['원정 선발', adjustments.away_pitcher_label],
            ['구장', adjustments.park_label],
            ['홈 최근5', adjustments.home_form_label],
            ['원정 최근5', adjustments.away_form_label],
          ].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:'var(--t3)' }}>{k}</span>
              <span style={{ color:'var(--t1)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 예상 스코어 TOP5 */}
      <div className="card">
        <div className="label" style={{ marginBottom:12 }}>예상 스코어 TOP 5</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {top_scores.map((s,i)=>(
            <div key={s.score} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:i===0?600:400, width:36, color:i===0?'var(--accent)':'var(--t1)' }}>{s.score}</div>
              <div style={{ flex:1, height:6, background:'var(--bg-input)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(s.prob/top_scores[0].prob)*100}%`, background:i===0?'var(--accent)':'var(--t3)', borderRadius:3, transition:'width .8s ease' }}/>
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:i===0?'var(--accent)':'var(--t2)', width:38, textAlign:'right' }}>{s.prob}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 면책 */}
      <div style={{ padding:'10px 13px', background:'rgba(249,115,22,.04)', border:'1px solid rgba(249,115,22,.12)', borderRadius:10, fontSize:11, color:'var(--orange)', lineHeight:1.5 }}>
        {result.disclaimer}
      </div>
    </div>
  )
}

function Banner({ icon, text, color }: { icon:string; text:string; color:string }) {
  const colors: Record<string, {bg:string;border:string;c:string}> = {
    gold:   {bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.25)',  c:'var(--gold)'},
    blue:   {bg:'rgba(59,130,246,.08)',  border:'rgba(59,130,246,.25)',  c:'var(--accent)'},
    orange: {bg:'rgba(249,115,22,.08)',  border:'rgba(249,115,22,.25)',  c:'var(--orange)'},
    purple: {bg:'rgba(168,85,247,.08)',  border:'rgba(168,85,247,.25)',  c:'#a855f7'},
    red:    {bg:'rgba(239,68,68,.08)',   border:'rgba(239,68,68,.25)',   c:'var(--red)'},
  }
  const s = colors[color] || colors.gold
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:11 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:12, color:s.c, fontWeight:500 }}>{text}</span>
    </div>
  )
}
