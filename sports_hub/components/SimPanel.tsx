'use client'
import { useState } from 'react'

interface Props {
  title:    string
  url:      string
  accent:   string
  icon:     string
  isMobile: boolean
}

export default function SimPanel({ title, url, accent, icon, isMobile }: Props) {
  const [open, setOpen] = useState(!isMobile)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${open ? accent + '44' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: open ? `0 4px 24px ${accent}20` : 'var(--shadow)',
      transition: 'all .25s'
    }}>
      {/* 헤더 */}
      <button onClick={() => isMobile && setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 18px',
        background: open ? `linear-gradient(135deg, ${accent}0f 0%, transparent 100%)` : 'transparent',
        border: 'none',
        borderBottom: open ? `1px solid var(--border)` : 'none',
        cursor: isMobile ? 'pointer' : 'default',
        transition: 'all .2s'
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 17,
          letterSpacing: '1px', color: open ? accent : 'var(--t2)',
          transition: 'color .2s'
        }}>{title}</span>

        {/* 전체화면 링크 */}
        <a href={url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            marginLeft: 'auto', fontSize: 10, color: accent,
            fontFamily: 'var(--font-mono)', textDecoration: 'none',
            background: `${accent}15`, padding: '4px 10px', borderRadius: 6,
            border: `1px solid ${accent}30`, flexShrink: 0,
            transition: 'all .15s'
          }}>
          전체화면 ↗
        </a>

        {isMobile && (
          <span style={{
            fontSize: 10, color: 'var(--t3)', marginLeft: 6,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .25s', display: 'inline-block'
          }}>▼</span>
        )}
      </button>

      {/* iframe — 흰 배경으로 시인성 확보 */}
      {open && (
        <div style={{
          height: isMobile ? 520 : 660,
          background: '#ffffff',   // ← iframe 배경 흰색
          position: 'relative',
          animation: 'fadeUp .3s ease'
        }}>
          <iframe
            src={url}
            style={{
              width: '100%', height: '100%',
              border: 'none', display: 'block',
              background: '#ffffff'
            }}
            title={title}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
