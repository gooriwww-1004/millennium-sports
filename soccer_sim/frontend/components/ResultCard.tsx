'use client'

import type { AnalysisResult } from '@/lib/api'
import { formatEV, formatProb, gradeClass } from '@/lib/api'

interface Props {
  result: AnalysisResult
  homeTeam: string
  awayTeam: string
}

export default function ResultCard({ result, homeTeam, awayTeam }: Props) {
  const { probabilities: p, ev, top_scores, home_xg, away_xg } = result

  type Side = 'home' | 'draw' | 'away'
  const sides: { key: Side; label: string; color: string }[] = [
    { key: 'home',  label: homeTeam || '홈',  color: 'var(--accent)' },
    { key: 'draw',  label: '무승부',          color: 'var(--t1)' },
    { key: 'away',  label: awayTeam || '원정', color: 'var(--gold)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ⚽ 퀀트 xG(기대 득점) 인디케이터 헤더 */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--bg-raised)' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.5px' }}>HOME xG</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--accent)', marginTop: 2 }}>{home_xg.toFixed(2)}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--t3)', fontStyle: 'italic', padding: '0 10px' }}>VS</div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.5px' }}>AWAY xG</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--gold)', marginTop: 2 }}>{away_xg.toFixed(2)}</div>
        </div>
      </div>

      {/* 📊 메인 밸류 지표 데이터 리스트 */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="label" style={{ marginBottom: 4 }}>VALUE & PROBABILITY</div>
        
        {sides.map(s => {
          const probVal = p[s.key]
          const evVal = ev[s.key]
          const gradeKey = `${s.key}_grade` as 'home_grade' | 'draw_grade' | 'away_grade'
          const grade = gradeClass(ev[gradeKey]) // 'grade-a' | 'grade-b' | 'grade-c'

          return (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-input)', padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--border)'
            }}>
              {/* 팀명 및 확률 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.color, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t2)' }}>
                  확률: <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{formatProb(probVal)}</span>
                </div>
              </div>

              {/* EV 지표 및 등급 배지 배합 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>VALUE EV</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600,
                    color: evVal > 0 ? 'var(--accent)' : evVal < 0 ? 'var(--red)' : 'var(--t1)'
                  }}>
                    {evVal > 0 ? '+' : ''}{formatEV(evVal)}
                  </div>
                </div>
                {/* 글로벌 CSS 클래스 매핑 */}
                <div className={`grade-badge ${grade}`}>
                  {grade.replace('grade-', '').toUpperCase()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 🎯 예상 스코어 TOP 5 확률 바 플롯 차트 */}
      <div className="card">
        <div className="label" style={{ marginBottom: 14 }}>PROBABLE CORRECT SCORES (TOP 5)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top_scores.map((s, i) => (
            <div key={s.score} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* 스코어 텍스트 */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: i === 0 ? 600 : 400,
                width: 38, color: i === 0 ? 'var(--accent)' : 'var(--t1)'
              }}>
                {s.score}
              </div>
              {/* 바 레이아웃 */}
              <div style={{ flex: 1, height: 7, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(s.prob / top_scores[0].prob) * 100}%`,
                  background: i === 0 ? 'linear-gradient(90deg, var(--accent) 0%, var(--accent-dim) 100%)' : 'var(--t3)',
                  borderRadius: 4,
                  transition: 'width .8s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              {/* 확률 퍼센티지 */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: i === 0 ? 'var(--accent)' : 'var(--t2)', width: 42, textAlign: 'right' }}>
                {s.prob}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ⚖️ 디스크레이머 면책조항 가독성 개선 */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 128, 56, 0.04)', border: '1px solid rgba(255, 128, 56, 0.12)',
        borderRadius: 12, fontSize: 11, color: 'var(--orange)', opacity: 0.8, lineHeight: 1.5
      }}>
        <span style={{ fontWeight: 600 }}>⚠️ DISCLAIMER:</span> 본 리포트는 과거 매치 데이터 및 배당 알고리즘 마진 시뮬레이션 결과물일 뿐이며, 실제 경기 결과를 보장하지 않습니다. 무리한 베팅은 자산에 손실을 초래합니다.
      </div>
    </div>
  )
}