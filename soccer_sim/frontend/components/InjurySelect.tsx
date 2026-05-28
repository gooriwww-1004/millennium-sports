'use client'

import { useState } from 'react'

export const INJURY_PRESETS = [
  { key: 'none',          icon: '✅', label: '없음',                  desc: '전원 정상' },
  { key: 'striker',       icon: '⚽', label: '주요 스트라이커 결장',    desc: '득점력 -22%' },
  { key: 'defender',      icon: '🛡️', label: '주요 수비수 결장',        desc: '실점 위험 +18%' },
  { key: 'midfielder',    icon: '🔄', label: '주요 미드필더 결장',       desc: '공수 -10%/-8%' },
  { key: 'gk_absent',     icon: '🧤', label: '주전 골키퍼 결장',         desc: '실점 위험 +22%' },
  { key: 'rotation_light',icon: '↩️', label: '경미한 로테이션',           desc: '전력 소폭 하락' },
  { key: 'rotation_b',    icon: '🔀', label: '2군 로테이션 (50%)',       desc: '전력 대폭 하락' },
  { key: 'multi_absent',  icon: '🚨', label: '복수 핵심 선수 결장',      desc: '득점 -32% / 실점 +25%' },
]

interface Props {
  teamName: string
  value: string
  onChange: (key: string) => void
}

export default function InjurySelect({ teamName, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const current = INJURY_PRESETS.find(p => p.key === value) || INJURY_PRESETS[0]

  return (
    <div style={{ position: 'relative' }}>
      {/* 선택 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '10px 14px',
          background: value !== 'none' ? 'rgba(255,74,107,.07)' : 'var(--bg-input)',
          border: `1px solid ${value !== 'none' ? 'rgba(255,74,107,.3)' : 'var(--border)'}`,
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all .2s', color: 'var(--t1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{current.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: value !== 'none' ? 'var(--red)' : 'var(--t2)'
            }}>
              {teamName} 결장 상황
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
              {current.label}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 10, color: 'var(--t3)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s'
        }}>▼</span>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-raised)', border: '1px solid var(--border-md)',
          borderRadius: 12, overflow: 'hidden', zIndex: 200,
          boxShadow: '0 12px 40px rgba(0,0,0,.7)'
        }}>
          {INJURY_PRESETS.map((p, i) => (
            <button key={p.key}
              onClick={() => { onChange(p.key); setOpen(false) }}
              style={{
                width: '100%', padding: '11px 14px',
                background: value === p.key ? 'rgba(0,229,160,.08)' : 'transparent',
                border: 'none',
                borderBottom: i < INJURY_PRESETS.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', transition: 'background .12s',
                color: 'var(--t1)', textAlign: 'left'
              }}
              onMouseEnter={e => { if (value !== p.key) e.currentTarget.style.background = 'var(--bg-input)' }}
              onMouseLeave={e => { if (value !== p.key) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: value === p.key ? 600 : 400 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {p.desc}
                  </div>
                </div>
              </div>
              {value === p.key && (
                <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
