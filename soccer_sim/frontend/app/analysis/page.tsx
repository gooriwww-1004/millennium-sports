'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResultCard from '@/components/ResultCard'
import EventBanner from '@/components/EventBanner'
import { runAnalysis, type AnalysisResult } from '@/lib/api'

function SimCounter({ target = 5000, running = true }: { target?: number, running?: boolean }) {
  const [count, setCount] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)
  const DURATION = 1800

  useEffect(() => {
    if (!running) return
    const animate = (ts: number) => {
      if (!start.current) start.current = ts
      const elapsed = ts - start.current
      const progress = Math.min(elapsed / DURATION, 1)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(ease * target))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [running, target])

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
      {count.toLocaleString()}
    </span>
  )
}

function AnalysisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const homeTeam = searchParams.get('hn') || ''
  const awayTeam = searchParams.get('an') || ''
  const homeOdds = searchParams.get('ho') || '1.0'
  const drawOdds = searchParams.get('do') || '1.0'
  const awayOdds = searchParams.get('ao') || '1.0'
  const homeInjured = searchParams.get('hi') === '1'
  const awayInjured = searchParams.get('ai') === '1'
  const homeInjury = searchParams.get('hinj') || 'none'
  const awayInjury = searchParams.get('ainj') || 'none'
  const reversals = parseInt(searchParams.get('rev') || '0', 10)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await runAnalysis({
          home_team: homeTeam,
          away_team: awayTeam,
          home_odds: parseFloat(homeOdds),
          draw_odds: parseFloat(drawOdds),
          away_odds: parseFloat(awayOdds),
          home_injured: homeInjured,
          away_injured: awayInjured,
          home_injury: homeInjury,
          away_injury: awayInjury,
          h2h_reversals: reversals
        })
        if (!active) return
        setTimeout(() => {
          setResult(res)
          setLoading(false)
        }, 2000) // 심층 시뮬레이션 체감을 위한 연출 딜레이 보존
      } catch (err) {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [homeTeam, awayTeam, homeOdds, drawOdds, awayOdds, homeInjured, awayInjured, reversals])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {loading ? (
        <div className="card" style={{
          textAlign: 'center', padding: '48px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(18,22,32,0.5) 100%)',
          border: '1px solid var(--border-glow)'
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(0, 255, 179, 0.1)', borderTopColor: 'var(--accent)',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          
          <div>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', letterSpacing: '1px', marginBottom: 4 }}>
              SIMULATING MATCHEUP...
            </div>
            <div style={{ fontSize: 13, color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>
              MONTE CARLO RUNS: <SimCounter target={10000} running={loading} /> / 10,000
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 280, lineHeight: 1.5 }}>
            양 팀의 최근 전적, 부상 변수 가중치 및 배당 마진율을 기반으로 가치 기댓값을 연산하고 있습니다.
          </p>
        </div>
      ) : result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-up-1">
          
          {/* 상단 간결 매치 타이틀 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px' }}>
            <h2 className="section-title" style={{ fontSize: 24 }}>QUANT REPORT</h2>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t2)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              LIVE VALUE
            </div>
          </div>

          {/* 🚩 실시간 이벤트 경고 배너 */}
          {result.event_messages && result.event_messages.length > 0 && (
            <EventBanner messages={result.event_messages} />
          )}

          {/* AI 퀀트 요약 가이드 텍스트 */}
          <div className="card" style={{
            borderColor: 'rgba(0, 255, 179, 0.25)',
            background: 'linear-gradient(90deg, rgba(0,255,179,0.06) 0%, transparent 100%)',
            padding: '16px 18px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)' }} />
            <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, fontWeight: 500 }}>
              {result.summary}
            </p>
          </div>

          {/* 상세 데이터 지표 카드 */}
          <ResultCard result={result} homeTeam={homeTeam} awayTeam={awayTeam} />

          {/* 분석 연산 처리 타임 */}
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            ALGORITHM ELAPSED: {(result.elapsed_sec * 1000).toFixed(0)}ms · ENGINE V4.3
          </div>

          {/* 다시 메인 화면으로 피드백 */}
          <button
            className="btn-primary"
            onClick={() => router.back()}
            style={{
              marginTop: 8, background: 'var(--bg-card)', color: 'var(--t1)',
              border: '1px solid var(--border-md)', boxShadow: 'none'
            }}
          >
            ← ANALYZE ANOTHER MATCH
          </button>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>
          분석 데이터 모델을 불러오지 못했습니다.
        </div>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <main className="app-shell">
      <Suspense fallback={
        <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          LOADING APP STRUCTURE...
        </div>
      }>
        <AnalysisContent />
      </Suspense>
    </main>
  )
}