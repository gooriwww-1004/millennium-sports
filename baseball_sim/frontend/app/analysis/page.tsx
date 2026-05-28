'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResultCard from '@/components/ResultCard'
import { runAnalysis, type AnalysisResult } from '@/lib/api'

function Counter({ target=5000, running=true }: { target?:number; running?:boolean }) {
  const [n, setN] = useState(0)
  const raf = useRef<number|null>(null)
  const t0  = useRef<number|null>(null)
  useEffect(() => {
    if (!running) return
    const animate = (ts: number) => {
      if (!t0.current) t0.current = ts
      const p = Math.min((ts - t0.current) / 1800, 1)
      const e = p===1 ? 1 : 1 - Math.pow(2, -10*p)
      setN(Math.floor(e * target))
      if (p < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [running, target])
  return <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{n.toLocaleString()}</span>
}

function AnalysisContent() {
  const router = useRouter()
  const sp     = useSearchParams()
  const [phase, setPhase]   = useState<'loading'|'done'|'error'>('loading')
  const [result, setResult] = useState<AnalysisResult|null>(null)
  const [errMsg, setErrMsg] = useState('')

  const ht = sp.get('ht')||''; const at = sp.get('at')||''
  const lg = sp.get('lg')||'KBO'

  useEffect(() => {
    const go = async () => {
      try {
        const input = {
          home_team: ht, away_team: at, league: lg,
          home_odds: parseFloat(sp.get('ho')||'1.9'),
          away_odds: parseFloat(sp.get('ao')||'1.9'),
          home_pitcher: sp.get('hp')||'mid',
          away_pitcher: sp.get('ap')||'mid',
          park_factor:  sp.get('pk')||'neutral',
          home_form5: parseInt(sp.get('hf')||'3'),
          away_form5: parseInt(sp.get('af')||'3'),
          home_bullpen: sp.get('hb')||'normal',
          away_bullpen: sp.get('ab')||'normal',
          ...(sp.get('hops') ? {home_ops:parseFloat(sp.get('hops')!)} : {}),
          ...(sp.get('aops') ? {away_ops:parseFloat(sp.get('aops')!)} : {}),
          ...(sp.get('hera') ? {home_era:parseFloat(sp.get('hera')!)} : {}),
          ...(sp.get('aera') ? {away_era:parseFloat(sp.get('aera')!)} : {}),
        }
        const [data] = await Promise.all([
          runAnalysis(input),
          new Promise(r => setTimeout(r, 2000))
        ])
        setResult(data); setPhase('done')
      } catch (e: any) { setErrMsg(e.message||'분석 오류'); setPhase('error') }
    }
    go()
  }, [])

  return (
    <main className="app-shell">
      {/* 헤더 */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'20px 0 16px' }}>
        <button onClick={()=>router.back()} style={{ width:36, height:36, borderRadius:9, background:'var(--bg-raised)', border:'1px solid var(--border)', color:'var(--t1)', cursor:'pointer', fontSize:15 }}>←</button>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, lineHeight:1 }}>
            {ht} <span style={{ color:'var(--t3)', fontSize:13 }}>vs</span> {at}
          </div>
          <div style={{ fontSize:10, color:'var(--accent)', marginTop:2, fontFamily:'var(--font-mono)' }}>{lg} · 음이항분포 시뮬레이션</div>
        </div>
      </div>

      {/* 로딩 */}
      {phase==='loading' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ aspectRatio:'16/9', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <div style={{ fontSize:52 }}>⚾</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:14, letterSpacing:'3px', color:'var(--accent)' }}>SIMULATING</div>
            <div style={{ fontSize:12, color:'var(--t3)' }}>
              <Counter target={5000} running={true}/>회 완료
            </div>
          </div>
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:9 }}>
              <span style={{ fontSize:11, color:'var(--t2)' }}>음이항분포 시뮬레이션</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)' }}>
                <Counter target={5000} running={true}/> / 5,000
              </span>
            </div>
            <div style={{ height:3, background:'var(--bg-input)', borderRadius:2 }}>
              <div id="pb" style={{ height:'100%', width:'0%', background:'var(--accent)', borderRadius:2, transition:'width 1.8s ease' }}/>
            </div>
          </div>
          {[100, 180, 140].map((h,i)=>(
            <div key={i} className="skel" style={{ height:h }}/>
          ))}
          <style>{`#pb{animation:pbar 1.9s ease-out forwards;}@keyframes pbar{to{width:85%}}`}</style>
        </div>
      )}

      {/* 오류 */}
      {phase==='error' && (
        <div className="card" style={{ textAlign:'center', padding:32 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
          <div style={{ color:'var(--red)', fontSize:14, marginBottom:20 }}>{errMsg}</div>
          <button className="btn-primary" onClick={()=>router.back()} style={{ maxWidth:200, margin:'0 auto' }}>돌아가기</button>
        </div>
      )}

      {/* 결과 */}
      {phase==='done' && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* 요약 */}
          <div className="card" style={{ borderColor:'rgba(59,130,246,.3)', background:'rgba(59,130,246,.05)', padding:'13px 16px', borderLeft:'3px solid var(--accent)' }}>
            <p style={{ fontSize:12, color:'var(--t1)', lineHeight:1.6, fontFamily:'var(--font-mono)' }}>
              {result.summary}
            </p>
          </div>
          <ResultCard result={result} homeTeam={ht} awayTeam={at}/>
          <div style={{ textAlign:'center', fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)' }}>
            분석 완료 · {(result.elapsed_sec*1000).toFixed(0)}ms · ENGINE V1.0
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button className="btn-primary" onClick={()=>router.back()}
              style={{ background:'var(--bg-raised)', color:'var(--t1)', border:'1px solid var(--border-md)', boxShadow:'none', fontSize:14 }}>
              ← 새 경기
            </button>
            <button className="btn-primary" onClick={()=>router.push('/history')}
              style={{ background:'rgba(59,130,246,.1)', color:'var(--accent)', border:'1px solid rgba(59,130,246,.3)', boxShadow:'none', fontSize:14 }}>
              📋 기록 보기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="app-shell" style={{ alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'var(--accent)', fontFamily:'var(--font-display)', fontSize:18, letterSpacing:2 }}>LOADING...</div>
      </div>
    }>
      <AnalysisContent/>
    </Suspense>
  )
}
