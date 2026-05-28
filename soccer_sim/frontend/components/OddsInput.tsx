'use client'

interface Props {
  homeOdds: string
  drawOdds: string
  awayOdds: string
  onHomeChange: (v: string) => void
  onDrawChange: (v: string) => void
  onAwayChange: (v: string) => void
}

export default function OddsInput({
  homeOdds, drawOdds, awayOdds,
  onHomeChange, onDrawChange, onAwayChange
}: Props) {

  const OddsBox = ({
    label, value, onChange, color, activeGlow
  }: {
    label: string, value: string,
    onChange: (v: string) => void,
    color?: string, activeGlow?: string
  }) => (
    <div style={{ flex: 1 }}>
      <label className="label" style={{ textAlign: 'center', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="1.01"
        max="100"
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="2.00"
        style={{
          textAlign: 'center',
          fontSize: 20,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: value ? (color || 'var(--t1)') : 'var(--t3)',
          letterSpacing: '-0.5px',
          padding: '12px 8px'
        }}
        onFocus={e => {
          if (activeGlow) e.target.style.borderColor = activeGlow
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-md)'
        }}
      />
    </div>
  )

  const h = parseFloat(homeOdds)
  const d = parseFloat(drawOdds)
  const a = parseFloat(awayOdds)
  const margin = (h > 1 && d > 1 && a > 1)
    ? ((1/h + 1/d + 1/a - 1) * 100).toFixed(1)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <OddsBox label="HOME ODDS" value={homeOdds} onChange={onHomeChange} color="var(--accent)" activeGlow="var(--accent)" />
        <OddsBox label="DRAW ODDS" value={drawOdds} onChange={onDrawChange} />
        <OddsBox label="AWAY ODDS" value={awayOdds} onChange={onAwayChange} color="var(--gold)" activeGlow="var(--gold)" />
      </div>
      
      {margin !== null && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: parseFloat(margin) > 8 ? 'var(--orange)' : 'var(--t2)',
          background: 'rgba(255,255,255,0.02)',
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          letterSpacing: '0.3px',
          display: 'inline-block',
          margin: '0 auto'
        }}>
          BOOKMAKER OVERROUND MARGIN: <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{margin}%</span>
        </div>
      )}
    </div>
  )
}