'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TeamSelect from '@/components/TeamSelect'
import MatchSchedule from '@/components/MatchSchedule'
import InjurySelect from '@/components/InjurySelect'
import OddsInput from '@/components/OddsInput'
import type { TeamInfo } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()

  // 팀 상태 (로직 보존)
  const [homeTeam, setHomeTeam] = useState<TeamInfo | null>(null)
  const [awayTeam, setAwayTeam] = useState<TeamInfo | null>(null)
  const [homeName, setHomeName] = useState('')
  const [awayName, setAwayName] = useState('')

  // 배당 상태 (로직 보존)
  const [homeOdds, setHomeOdds] = useState('')
  const [drawOdds, setDrawOdds] = useState('')
  const [awayOdds, setAwayOdds] = useState('')

  // 옵션 상태 (로직 보존)
  const [homeInjured, setHomeInjured] = useState(false)
  const [awayInjured, setAwayInjured] = useState(false)
  const [homeInjury, setHomeInjury] = useState('none')
  const [awayInjury, setAwayInjury] = useState('none')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [h2hReversals, setH2hReversals] = useState('0')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeSelect, setActiveSelect] = useState<'home'|'away'|null>(null)

  const isReady =
    homeName.trim().length > 0 &&
    awayName.trim().length > 0 &&
    parseFloat(homeOdds) > 1 &&
    parseFloat(drawOdds) > 1 &&
    parseFloat(awayOdds) > 1

  const handleAnalyze = async () => {
    if (!isReady || loading) return
    setLoading(true)
    setError('')
    try {
      const q = new URLSearchParams({
        hn: homeName,
        an: awayName,
        ho: homeOdds,
        do: drawOdds,
        ao: awayOdds,
        hi: homeInjured ? '1' : '0',
        ai: awayInjured ? '1' : '0',
        hinj: homeInjury,
        ainj: awayInjury,
        rev: h2hReversals
      })
      router.push(`/analysis?${q.toString()}`)
    } catch (err) {
      setError('시뮬레이션 분석 준비 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      {/* 🔮 감성 헤더 디자인 */}
      <header style={{ textAlign: 'center', marginTop: 12, marginBottom: 32 }} className="fade-up-1">
        <div style={{
          display: 'inline-block',
          background: 'rgba(0, 255, 179, 0.06)',
          border: '1px solid rgba(0, 255, 179, 0.15)',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent)',
          letterSpacing: '1px',
          marginBottom: 10
        }}>
          MILLENNIUM QUANT ENGINE v4.3
        </div>
        <h1 className="section-title">MATCH SIMULATOR</h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 6, fontWeight: 400 }}>
          빅데이터 기반 축구 배팅 가치 변동 시뮬레이션
        </p>
      </header>


      {/* 📅 경기 일정 */}
      <div className="card fade-up-1" style={{ marginBottom: 4 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14
        }}>
          <div className="label" style={{ margin: 0 }}>TODAY'S MATCHES</div>
          <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>탭하면 자동 입력</span>
        </div>
        <MatchSchedule
          onSelect={(home, away, odds) => {
            setHomeName(home)
            setAwayName(away)
            setHomeTeam(null)
            setAwayTeam(null)
            if (odds) {
              setHomeOdds(String(odds.home))
              setDrawOdds(String(odds.draw))
              setAwayOdds(String(odds.away))
            }
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-up-2">
        {/* ⚽ 매치업 선택 섹션 카드 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', overflow: 'visible' }}>
          {/* 가상 경기 안내 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)'
          }}>
            <span style={{ color: 'var(--accent)' }}>⚡</span>
            리그 무관 — 아무 팀이나 조합 가능 (가상 경기 테스트 지원)
          </div>
          
          {/* 홈 팀 선택 */}
          <div style={{ position: 'relative', zIndex: activeSelect === 'home' ? 30 : 10 }}>
            <TeamSelect
              label="HOME TEAM"
              placeholder="홈 팀 검색 또는 직접 입력"
              value={homeName}
              onOpen={() => setActiveSelect('home')}
              onClose={() => setActiveSelect(null)}
              onChange={(t, n) => { setHomeTeam(t); setHomeName(n) }}
            />
            {/* 부상자 토글 스위치 디자인 커스텀 */}
            <div style={{ marginTop: 10 }}>
              <InjurySelect
                teamName={homeName || '홈팀'}
                value={homeInjury}
                onChange={(k) => { setHomeInjury(k); setHomeInjured(k !== 'none') }}
              />
            </div>
          </div>

          {/* 중앙 시각적 분리선 (VS 라벨 배지) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '-6px 0', position: 'relative', height: 1
          }}>
            <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'var(--border-md)' }} />
            <div style={{
              position: 'relative', zIndex: 5,
              fontFamily: 'var(--font-display)', fontSize: 14, fontStyle: 'italic',
              background: 'var(--bg-raised)', border: '1px solid var(--border-md)',
              color: 'var(--t2)', padding: '4px 12px', borderRadius: 8, letterSpacing: '0.5px'
            }}>VS</div>
          </div>

          {/* 원정 팀 선택 */}
          <div style={{ position: 'relative', zIndex: activeSelect === 'away' ? 30 : 9 }}>
            <TeamSelect
              label="AWAY TEAM"
              placeholder="원정 팀 검색 또는 직접 입력"
              value={awayName}
              onOpen={() => setActiveSelect('away')}
              onClose={() => setActiveSelect(null)}
              onChange={(t, n) => { setAwayTeam(t); setAwayName(n) }}
            />
            <div style={{ marginTop: 10 }}>
              <InjurySelect
                teamName={awayName || '원정팀'}
                value={awayInjury}
                onChange={(k) => { setAwayInjury(k); setAwayInjured(k !== 'none') }}
              />
            </div>
          </div>
        </div>

        {/* 📊 책정 오즈(배당) 입력 섹션 카드 */}
        <div className="card fade-up-3" style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(18,22,32,0.7) 100%)' }}>
          <OddsInput
            homeOdds={homeOdds} drawOdds={drawOdds} awayOdds={awayOdds}
            onHomeChange={setHomeOdds} onDrawChange={setDrawOdds} onAwayChange={setAwayOdds}
          />
        </div>

        {/* ⚙️ 고급 시뮬레이션 설정 옵션 */}
        <div className="fade-up-3" style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none', border: 'none', color: 'var(--t2)',
              fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6, transition: 'color .2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}
          >
            {showAdvanced ? '▼' : '▶'} ADVANCED DATA CONFIG
          </button>

          {showAdvanced && (
            <div className="card" style={{ marginTop: 10, animation: 'fadeUp 0.3s ease-out forwards' }}>
              <label className="label">H2H 역전 승부 빈도수</label>
              <input
                type="number" inputMode="numeric" min="0" max="20"
                className="input-field"
                value={h2hReversals}
                onChange={e => setH2hReversals(e.target.value)}
                placeholder="0"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 16 }}
              />
              <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 8, lineHeight: 1.4 }}>
                양 팀의 최근 10경기 중 역전극이 발생한 횟수입니다. (3회 이상 변동 시 고위험 이변 경고 트리거가 작동합니다)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🚨 경고 에러 메시지 팝업 */}
      {error && (
        <div className="fade-up-4" style={{
          marginBottom: 16, padding: '14px 18px',
          background: 'rgba(255, 74, 107, 0.08)', border: '1px solid rgba(255, 74, 107, 0.25)',
          borderRadius: 12, fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>🚫</span> <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* 🚀 최종 퀀트 분석 실행 버튼 */}
      <div className="fade-up-4" style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={!isReady || loading}
          style={{
            animation: isReady && !loading ? 'pulse-glow 2.5s ease-in-out infinite' : undefined,
            fontSize: '16px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '1px'
          }}
        >
          {loading ? 'RUNNING MONTE CARLO SIMULATION...' : 'START QUANT SIMULATION'}
        </button>
      </div>
    </main>
  )
}