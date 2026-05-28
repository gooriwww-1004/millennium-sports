'use client'

import { useEffect, useState } from 'react'
import type { EventMessage } from '@/lib/api'

interface Props {
  messages: EventMessage[]
}

const colorMap: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  gold:   { bg: 'rgba(255, 202, 40, 0.08)',  border: 'rgba(255, 202, 40, 0.2)',  color: 'var(--gold)', icon: '👑' },
  blue:   { bg: 'rgba(100, 160, 255, 0.08)', border: 'rgba(100, 160, 255, 0.2)', color: '#64a0ff', icon: '🌐' },
  orange: { bg: 'rgba(255, 128, 56, 0.08)',  border: 'rgba(255, 128, 56, 0.2)',  color: 'var(--orange)', icon: '⚡' },
  purple: { bg: 'rgba(180, 100, 255, 0.08)', border: 'rgba(180, 100, 255, 0.2)', color: '#b464ff', icon: '🔬' },
  red:    { bg: 'rgba(255, 74, 107, 0.08)',   border: 'rgba(255, 74, 107, 0.25)',  color: 'var(--red)', icon: '🚨' },
  green:  { bg: 'rgba(0, 255, 179, 0.08)',   border: 'rgba(0, 255, 179, 0.25)',  color: 'var(--accent)', icon: '⚽' },
}

export default function EventBanner({ messages }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => setVisible(true), 150)
      return () => clearTimeout(t)
    }
  }, [messages])

  if (!messages || messages.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity .4s cubic-bezier(0.16, 1, 0.3, 1), transform .4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {messages.map((msg, i) => {
        const config = colorMap[msg.color] || colorMap.gold
        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: config.bg,
            border: `1px solid ${config.border}`,
            padding: '14px 16px',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: 15, lineHeight: 1.2 }}>{config.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                color: config.color, letterSpacing: '0.5px', textTransform: 'uppercase'
              }}>
                SIMULATION TRIGGER DETECTED
              </span>
              <span style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.4, fontWeight: 400 }}>
                {msg.text}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}