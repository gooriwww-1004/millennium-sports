'use client'
import { useState, useEffect } from 'react'
import NewsPanel from '@/components/NewsPanel'
import SimPanel  from '@/components/SimPanel'

const BASEBALL_URL = process.env.NEXT_PUBLIC_BASEBALL_URL || 'http://localhost:3001'
const SOCCER_URL   = process.env.NEXT_PUBLIC_SOCCER_URL   || 'http://localhost:3000'
const QMS_URL      = 'https://queenhome.pages.dev'  // 업로드 후 실제 URL로 교체

export default function HubPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>

      {/* ── 탑 네비 ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(240,242,247,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: 54,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}>
        {/* 로고 — queen.ico */}
        <a href={QMS_URL} target="_blank" rel="noopener noreferrer"
          style={{ display:'flex', alignItems:'center', gap: 9, textDecoration:'none' }}>
          <img
            src="/queen.ico"
            alt="Millennium Session"
            width={28} height={28}
            style={{ objectFit:'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.display='none' }}
          />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            letterSpacing: '2px', color: 'var(--t1)'
          }}>MILLENNIUM SPORTS</span>
        </a>

        {/* 데스크탑 우측 링크 */}
        {!isMobile && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {/* QMS 링크 */}
            <a href={QMS_URL} target="_blank" rel="noopener noreferrer" style={{
              padding:'5px 12px', borderRadius:8, fontSize:11,
              fontFamily:'var(--font-mono)', textDecoration:'none',
              background:'rgba(125,95,255,.1)', border:'1px solid rgba(125,95,255,.25)',
              color:'#7d5fff', display:'flex', alignItems:'center', gap:5, transition:'all .15s'
            }}>
              👑 QMS
            </a>
            {[
              { icon:'⚾', label:'BASEBALL', color:'#3b82f6', url: BASEBALL_URL },
              { icon:'⚽', label:'SOCCER',   color:'#059669', url: SOCCER_URL   },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                padding:'5px 12px', borderRadius:8, fontSize:11,
                fontFamily:'var(--font-mono)', textDecoration:'none',
                background:`${l.color}15`, border:`1px solid ${l.color}35`,
                color:l.color, display:'flex', alignItems:'center', gap:5,
                transition:'all .15s'
              }}>
                {l.icon} {l.label}
              </a>
            ))}
          </div>
        )}

        {/* 모바일 햄버거 */}
        {isMobile && (
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{
            width:36, height:36, borderRadius:8,
            background:'var(--bg-raised)', border:'1px solid var(--border)',
            color:'var(--t1)', cursor:'pointer', fontSize:16
          }}>☰</button>
        )}
      </nav>

      {/* 모바일 메뉴 */}
      {isMobile && menuOpen && (
        <div style={{
          position:'fixed', top:54, left:0, right:0, zIndex:99,
          background:'var(--bg-card)', borderBottom:'1px solid var(--border-md)',
          padding:'12px 16px', display:'flex', flexDirection:'column', gap:8,
          animation:'fadeUp .2s ease', boxShadow:'0 8px 24px rgba(0,0,0,0.12)'
        }}>
          {[
            { icon:'👑', label:'QMS 팀 소개',             url: QMS_URL,       color:'#7d5fff' },
            { icon:'⚾', label:'Baseball Analyzer 전체화면', url: BASEBALL_URL,  color:'#3b82f6' },
            { icon:'⚽', label:'Soccer Analyzer 전체화면',   url: SOCCER_URL,    color:'#059669' },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              onClick={()=>setMenuOpen(false)}
              style={{
                padding:'12px 16px', borderRadius:10,
                background:`${l.color}0e`, border:`1px solid ${l.color}25`,
                color:l.color, textDecoration:'none', fontSize:13,
                fontFamily:'var(--font-mono)',
                display:'flex', alignItems:'center', gap:8
              }}>
              <span style={{fontSize:18}}>{l.icon}</span>
              {l.label} ↗
            </a>
          ))}
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <main style={{
        maxWidth: isMobile ? '100%' : 1440,
        margin: '0 auto',
        padding: isMobile ? '16px' : '20px 24px',
      }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 26 : 36,
            letterSpacing: '2px', lineHeight: 1, color: 'var(--t1)'
          }}>SPORTS ANALYZER HUB</h1>
          <p style={{ fontSize:11, color:'var(--t3)', marginTop:5, fontFamily:'var(--font-mono)' }}>
            {new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}
            &nbsp;·&nbsp;뉴스는 클릭으로 펼치기/접기
          </p>
        </div>

        {isMobile ? (
          /* ── 모바일 ── */
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <NewsPanel sport="general"  title="📰 주요 스포츠 뉴스"  accent="#64748b"/>
            <Divider label="⚾ 야구"/>
            <NewsPanel sport="baseball" title="⚾ 야구 뉴스 & 일정"  accent="#3b82f6"/>
            <SimPanel  title="BASEBALL ANALYZER" url={BASEBALL_URL} accent="#3b82f6" icon="⚾" isMobile={true}/>
            <Divider label="⚽ 축구"/>
            <NewsPanel sport="soccer"   title="⚽ 축구 뉴스 & 일정"  accent="#059669"/>
            <SimPanel  title="SOCCER ANALYZER"   url={SOCCER_URL}   accent="#059669" icon="⚽" isMobile={true}/>
          </div>
        ) : (
          /* ── 데스크탑 ── */
          <div style={{display:'flex', flexDirection:'column', gap:18}}>
            {/* 뉴스 3열 */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14}}>
              <NewsPanel sport="general"  title="📰 주요 스포츠 뉴스"  accent="#64748b"/>
              <NewsPanel sport="baseball" title="⚾ 야구 뉴스 & 일정"  accent="#3b82f6"/>
              <NewsPanel sport="soccer"   title="⚽ 축구 뉴스 & 일정"  accent="#059669"/>
            </div>
            {/* 시뮬레이터 2열 */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
              <SimPanel title="BASEBALL ANALYZER" url={BASEBALL_URL} accent="#3b82f6" icon="⚾" isMobile={false}/>
              <SimPanel title="SOCCER ANALYZER"   url={SOCCER_URL}   accent="#059669" icon="⚽" isMobile={false}/>
            </div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer style={{
        textAlign:'center', padding:'24px 16px',
        borderTop:'1px solid var(--border)',
        fontSize:10, color:'var(--t3)', fontFamily:'var(--font-mono)',
        marginTop:32, background:'var(--bg-card)'
      }}>
        <a href={QMS_URL} target="_blank" rel="noopener noreferrer"
          style={{color:'#7d5fff', textDecoration:'none'}}>
          👑 MILLENNIUM SESSION
        </a>
        &nbsp;· SPORTS ANALYZER HUB · 2026
      </footer>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'6px 4px'
    }}>
      <span style={{fontSize:13, fontWeight:700, color:'var(--t2)', fontFamily:'var(--font-mono)'}}>{label}</span>
      <div style={{flex:1, height:1, background:'var(--border)'}}/>
    </div>
  )
}
