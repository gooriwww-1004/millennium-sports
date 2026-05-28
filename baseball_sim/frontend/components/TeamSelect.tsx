'use client'
import { useState, useEffect, useRef } from 'react'
import { getTeams, type TeamInfo } from '@/lib/api'

interface Props {
  label: string; value: string; league: string
  onChange: (team: TeamInfo|null, name: string) => void
  onOpen?: ()=>void; onClose?: ()=>void
}

export default function TeamSelect({ label, value, league, onChange, onOpen, onClose }: Props) {
  const [open, setOpen]       = useState(false)
  const [teams, setTeams]     = useState<TeamInfo[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await getTeams(league)
      setTeams(data)
      setLoading(false)
    }
    load()
  }, [league])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); onClose?.()
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const filtered = search.trim()
    ? teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : teams

  const toggle = () => {
    const next = !open; setOpen(next)
    next ? onOpen?.() : onClose?.()
  }

  const select = (t: TeamInfo) => {
    onChange(t, t.name); setOpen(false); setSearch(''); onClose?.()
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation(); onChange(null, ''); setSearch(''); onClose?.()
  }

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <label className="label">{label}</label>
      <button type="button" onClick={toggle} style={{
        width:'100%', height:50, background:'var(--bg-input)',
        border:`1px solid ${open?'var(--accent)':'var(--border-md)'}`,
        borderRadius:11, padding:'0 14px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        cursor:'pointer', transition:'all .2s', color:'var(--t1)',
        boxShadow: open?'0 0 0 3px var(--accent-glow)':'none'
      }}>
        <span style={{ fontSize:14, color:value?'var(--t1)':'var(--t3)', fontFamily:'var(--font-body)' }}>
          {value || '팀 선택...'}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {value && <span onClick={clear} style={{ fontSize:13, color:'var(--t3)', padding:'2px 4px', cursor:'pointer' }}>✕</span>}
          <span style={{ fontSize:10, color:'var(--t3)', transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</span>
        </div>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 5px)', left:0, right:0,
          background:'var(--bg-raised)', border:'1px solid var(--border-md)',
          borderRadius:13, zIndex:200, boxShadow:'0 12px 40px rgba(0,0,0,.7)', overflow:'hidden'
        }}>
          <div style={{ padding:'10px 10px 6px' }}>
            <input className="input-field" placeholder="검색..." value={search}
              onChange={e=>setSearch(e.target.value)} autoFocus style={{ height:38, fontSize:13 }}/>
          </div>
          <div style={{ maxHeight:220, overflowY:'auto', borderTop:'1px solid var(--border)' }}>
            {loading ? (
              <div style={{ padding:16, textAlign:'center', color:'var(--t3)', fontSize:12 }}>로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:16, textAlign:'center', color:'var(--t3)', fontSize:12 }}>없음</div>
            ) : filtered.map((t, i) => (
              <button key={i} onClick={()=>select(t)} style={{
                width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 15px', background:t.name===value?'rgba(59,130,246,.08)':'transparent',
                border:'none', borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',
                cursor:'pointer', color:'var(--t1)', textAlign:'left', transition:'background .12s'
              }}
              onMouseEnter={e=>{ if(t.name!==value) e.currentTarget.style.background='var(--bg-input)' }}
              onMouseLeave={e=>{ if(t.name!==value) e.currentTarget.style.background='transparent' }}>
                <span style={{ fontSize:13, fontWeight:t.name===value?600:400 }}>
                  {t.name===value?'✓ ':''}{t.name}
                </span>
                <span style={{ fontSize:10, color:'var(--accent)', fontFamily:'var(--font-mono)', background:'rgba(59,130,246,.07)', padding:'2px 6px', borderRadius:5, border:'1px solid rgba(59,130,246,.15)' }}>
                  {t.league}
                </span>
              </button>
            ))}
          </div>
          <div style={{ padding:'6px 14px', borderTop:'1px solid var(--border)', fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)', textAlign:'right' }}>
            {filtered.length}팀
          </div>
        </div>
      )}
    </div>
  )
}
