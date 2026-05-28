'use client'

interface Option { key: string; icon: string; label: string; desc: string }

interface SelectProps {
  label: string; value: string; options: Option[]
  onChange: (key: string) => void; compact?: boolean
}

export function OptionSelect({ label, value, options, onChange, compact }: SelectProps) {
  const current = options.find(o => o.key === value) || options[0]
  const isDefault = value === 'mid' || value === 'neutral' || value === 'normal' || value === 'unknown'

  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {options.map(o => (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            display:'flex', alignItems:'center', gap:10, padding:compact?'9px 12px':'11px 14px',
            background: value===o.key ? 'rgba(59,130,246,.1)' : 'var(--bg-input)',
            border: `1px solid ${value===o.key?'rgba(59,130,246,.4)':'var(--border)'}`,
            borderRadius:10, cursor:'pointer', transition:'all .15s', textAlign:'left',
            color:'var(--t1)'
          }}>
            <span style={{ fontSize:16, width:22, textAlign:'center' }}>{o.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:value===o.key?600:400, color:value===o.key?'var(--accent)':'var(--t1)' }}>
                {o.label}
              </div>
              {!compact && (
                <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)', marginTop:1 }}>{o.desc}</div>
              )}
            </div>
            {value===o.key && <span style={{ color:'var(--accent)', fontSize:14 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// 최근 3경기 폼 선택
interface FormProps { label: string; value: number; onChange: (v: number) => void; loading?: boolean }

const FORM3_LABELS = ['❌ 0승','⚠️ 1승','✅ 2승','🔥 3승']
const FORM3_COLORS = ['var(--red)','var(--orange)','var(--green)','var(--accent)']

export function FormSelect({ label, value, onChange, loading }: FormProps) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <label className="label" style={{ margin:0 }}>{label}</label>
        {loading && <span style={{ fontSize:10, color:'var(--accent)', fontFamily:'var(--font-mono)', animation:'spin .8s linear infinite', display:'inline-block' }}>⟳</span>}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2,3].map(n => (
          <button key={n} onClick={()=>onChange(n)} style={{
            flex:1, height:52, borderRadius:10, fontSize:12,
            fontFamily:'var(--font-mono)',
            background: value===n ? 'rgba(59,130,246,.12)' : 'var(--bg-input)',
            border: `1px solid ${value===n ? 'rgba(59,130,246,.45)' : 'var(--border)'}`,
            color: value===n ? FORM3_COLORS[n] : 'var(--t3)',
            cursor:'pointer', transition:'all .15s',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3
          }}>
            <span style={{ fontSize:18 }}>{FORM3_LABELS[n].split(' ')[0]}</span>
            <span style={{ fontSize:9 }}>{n}승 {3-n}패</span>
          </button>
        ))}
      </div>
      <div style={{ textAlign:'center', fontSize:11, color:FORM3_COLORS[value], marginTop:7, fontFamily:'var(--font-mono)' }}>
        최근 3경기: {FORM3_LABELS[value]}
      </div>
    </div>
  )
}
