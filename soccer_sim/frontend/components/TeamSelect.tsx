'use client'

import { useState, useEffect, useRef } from 'react'
import type { TeamInfo } from '@/lib/api'

interface Props {
  label: string
  value: string
  placeholder?: string
  onChange: (team: TeamInfo | null, name: string) => void
  onOpen?: () => void
  onClose?: () => void
}

const LEAGUES = [
  { code: 'ALL', name: '전체' },
  { code: 'PL',  name: '프리미어리그' },
  { code: 'PD',  name: '라리가' },
  { code: 'BL1', name: '분데스리가' },
  { code: 'SA',  name: '세리에A' },
  { code: 'FL1', name: '리그앙' },
  { code: 'CL',  name: '챔스' },
]

export default function TeamSelect({ label, value, placeholder, onChange, onOpen, onClose }: Props) {
  const [open, setOpen]         = useState(false)
  const [league, setLeague]     = useState('ALL')
  const [teams, setTeams]       = useState<TeamInfo[]>([])
  const [filtered, setFiltered] = useState<TeamInfo[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/teams`)
        const data = await res.json()
        setTeams(data.teams || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let list = teams
    if (league !== 'ALL') {
      const leagueName = LEAGUES.find(l => l.code === league)?.name || ''
      list = list.filter(t => t.league?.includes(leagueName))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t as any).short_name?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [teams, league, search])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        onClose?.()
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const toggle = () => {
    const next = !open
    setOpen(next)
    next ? onOpen?.() : onClose?.()
  }

  const select = (team: TeamInfo) => {
    onChange(team, team.name)
    setOpen(false)
    setSearch('')
    onClose?.()
  }

  const clear = () => {
    onChange(null, '')
    setSearch('')
    onClose?.()
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label className="label">{label}</label>

      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%', height: 52,
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border-md)'}`,
          borderRadius: 12, padding: '0 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'border-color .2s',
          boxShadow: open ? '0 0 0 3px var(--accent-glow)' : 'none'
        }}
      >
        <span style={{ fontSize: 14, color: value ? 'var(--t1)' : 'var(--t3)', fontFamily: 'var(--font-body)' }}>
          {value || '팀 선택...'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {value && (
            <span onClick={e => { e.stopPropagation(); clear() }}
              style={{ fontSize: 14, color: 'var(--t3)', cursor: 'pointer', padding: '2px 4px' }}>
              ✕
            </span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--t3)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s', display: 'block'
          }}>▼</span>
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-raised)', border: '1px solid var(--border-md)',
          borderRadius: 14, zIndex: 100,
          boxShadow: '0 12px 40px rgba(0,0,0,.7)', overflow: 'hidden'
        }}>
          {/* 검색창 */}
          <div style={{ padding: '12px 12px 8px' }}>
            <input
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder || '팀명 검색...'}
              autoComplete="off"
              style={{ height: 40, fontSize: 13 }}
            />
          </div>

          {/* 리그 탭 */}
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {LEAGUES.map(l => (
              <button key={l.code} onClick={() => setLeague(l.code)} style={{
                flexShrink: 0, padding: '4px 10px', borderRadius: 8, fontSize: 11,
                fontFamily: 'var(--font-mono)',
                border: `1px solid ${league === l.code ? 'rgba(0,229,160,.4)' : 'var(--border)'}`,
                background: league === l.code ? 'rgba(0,229,160,.12)' : 'transparent',
                color: league === l.code ? 'var(--accent)' : 'var(--t2)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s'
              }}>
                {l.name}
              </button>
            ))}
          </div>

          {/* 팀 리스트 */}
          <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid var(--border)' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>불러오는 중...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>검색 결과 없음</div>
            ) : filtered.map((team, i) => (
              <button key={(team as any).id || i} onClick={() => select(team)} style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '11px 16px',
                background: team.name === value ? 'rgba(0,229,160,.08)' : 'transparent',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background .12s', color: 'var(--t1)', textAlign: 'left'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
              onMouseLeave={e => (e.currentTarget.style.background = team.name === value ? 'rgba(0,229,160,.08)' : 'transparent')}>
                <span style={{ fontSize: 14, fontWeight: team.name === value ? 600 : 400 }}>
                  {team.name === value ? '✓ ' : ''}{team.name}
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                  background: 'rgba(0,229,160,.06)', padding: '2px 7px',
                  borderRadius: 5, border: '1px solid rgba(0,229,160,.15)', whiteSpace: 'nowrap'
                }}>
                  {team.league}
                </span>
              </button>
            ))}
          </div>

          {/* 카운터 */}
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--border)',
            fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-mono)', textAlign: 'right'
          }}>
            {filtered.length}팀
          </div>
        </div>
      )}
    </div>
  )
}