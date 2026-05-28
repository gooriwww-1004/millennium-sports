'use client'
import { useState, useEffect } from 'react'

interface NewsItem {
  title: string; url: string; sport: string
}

// ── 고정 링크 (날짜 자동 반영) ──────────────────────
function getFixedLinks(sport: 'baseball' | 'soccer' | 'general'): NewsItem[] {
  const today  = new Date()
  const ymd    = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
  const mmd    = `${today.getMonth()+1}월 ${today.getDate()}일`

  const map = {
    general: [
      { title:'🏠 네이버 스포츠 홈',           url:'https://sports.naver.com',                                           sport:'general' },
      { title:'⚾ KBO 야구',                   url:'https://sports.naver.com/kbaseball/index.nhn',                       sport:'general' },
      { title:'⚽ 축구',                        url:'https://sports.naver.com/wfootball/index.nhn',                       sport:'general' },
      { title:'🏀 농구',                        url:'https://sports.naver.com/basketball/index.nhn',                      sport:'general' },
      { title:'🎾 테니스',                      url:'https://sports.naver.com/tennis/index.nhn',                          sport:'general' },
      { title:'📊 스포츠 뉴스',                 url:'https://sports.news.naver.com',                                      sport:'general' },
    ],
    baseball: [
      { title:`⚾ KBO 오늘 경기 일정 (${mmd})`, url:`https://sports.naver.com/kbaseball/schedule/index.nhn?date=${ymd}`,  sport:'baseball' },
      { title:'🏆 KBO 팀 순위',                 url:'https://sports.naver.com/kbaseball/record/index.nhn',               sport:'baseball' },
      { title:'📊 KBO 팀 기록',                 url:'https://sports.naver.com/kbaseball/record/teamRecordList.nhn',      sport:'baseball' },
      { title:'⭐ KBO 선수 기록',               url:'https://sports.naver.com/kbaseball/record/playerRecordList.nhn',    sport:'baseball' },
      { title:`🇺🇸 MLB 오늘 경기 (${mmd})`,    url:`https://sports.naver.com/mlb/schedule/index.nhn?date=${ymd}`,        sport:'baseball' },
      { title:'🏆 MLB 팀 순위',                 url:'https://sports.naver.com/mlb/record/index.nhn',                     sport:'baseball' },
      { title:'⚾ KBO 뉴스',                   url:'https://sports.news.naver.com/kbaseball/news/index.nhn',             sport:'baseball' },
    ],
    soccer: [
      { title:`⚽ K리그 오늘 경기 (${mmd})`,   url:`https://sports.naver.com/kfootball/schedule/index.nhn?date=${ymd}`,  sport:'soccer' },
      { title:'🏆 K리그 순위',                  url:'https://sports.naver.com/kfootball/record/index.nhn',               sport:'soccer' },
      { title:`🏴󠁧󠁢󠁥󠁮󠁧󠁿 프리미어리그 (${mmd})`,  url:`https://sports.naver.com/wfootball/schedule/index.nhn?category=epl&date=${ymd}`, sport:'soccer' },
      { title:`🇪🇸 라리가 (${mmd})`,          url:`https://sports.naver.com/wfootball/schedule/index.nhn?category=lal&date=${ymd}`, sport:'soccer' },
      { title:`🏅 챔피언스리그 (${mmd})`,       url:`https://sports.naver.com/wfootball/schedule/index.nhn?category=ucl&date=${ymd}`, sport:'soccer' },
      { title:`🇩🇪 분데스리가 (${mmd})`,       url:`https://sports.naver.com/wfootball/schedule/index.nhn?category=bun&date=${ymd}`, sport:'soccer' },
      { title:'⚽ 축구 뉴스',                   url:'https://sports.news.naver.com/wfootball/news/index.nhn',            sport:'soccer' },
    ],
  }
  return map[sport] || []
}

interface Props {
  sport: 'baseball' | 'soccer' | 'general'
  title: string
  accent: string
  defaultOpen?: boolean
}

export default function NewsPanel({ sport, title, accent, defaultOpen = true }: Props) {
  const [items, setItems]   = useState<NewsItem[]>([])
  const [open,  setOpen]    = useState(defaultOpen)

  useEffect(() => {
    // 즉시 고정 링크 표시
    const fixed = getFixedLinks(sport)
    setItems(fixed)

    // 서버 API로 실시간 뉴스 추가 시도 (성공 시 교체)
    fetch(`/api/news?sport=${sport}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.items?.length >= 3) setItems(d.items)
      })
      .catch(() => {/* 고정 링크 유지 */})
  }, [sport])

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${open ? accent + '44' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: open ? `0 4px 20px ${accent}18` : 'var(--shadow)',
      transition: 'all .25s'
    }}>
      {/* 헤더 */}
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '13px 16px', cursor: 'pointer',
        background: open ? `linear-gradient(135deg, ${accent}0f 0%, transparent 100%)` : 'transparent',
        border: 'none',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        transition: 'all .2s', textAlign: 'left'
      }}>
        <div style={{ width:3, height:16, background:accent, borderRadius:2, flexShrink:0 }}/>
        <span style={{
          flex:1, fontSize:12, fontWeight:700, color:'var(--t1)',
          fontFamily:'var(--font-mono)', letterSpacing:'.06em'
        }}>{title}</span>
        <div style={{
          width:7, height:7, borderRadius:'50%',
          background:accent, animation:'pulse 2s ease-in-out infinite', flexShrink:0
        }}/>
        <span style={{
          fontSize:10, color:'var(--t3)', marginLeft:6,
          transform: open ? 'rotate(180deg)' : 'none',
          transition:'transform .22s', display:'inline-block'
        }}>▼</span>
      </button>

      {/* 링크 목록 */}
      {open && (
        <div style={{ overflowY:'auto', maxHeight:300, animation:'fadeUp .2s ease' }}>
          {items.length === 0 ? (
            [1,2,3,4].map(i => (
              <div key={i} style={{
                margin:'6px 12px', height:28, borderRadius:6,
                background:'linear-gradient(90deg,var(--bg-raised) 25%,var(--bg-input) 50%,var(--bg-raised) 75%)',
                backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite'
              }}/>
            ))
          ) : items.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 16px', textDecoration:'none', color:'var(--t1)',
                borderBottom: i < items.length-1 ? '1px solid var(--border)' : 'none',
                transition:'background .15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${accent}0d`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:accent, flexShrink:0 }}/>
              <span style={{
                fontSize:12, color:'var(--t1)', lineHeight:1.4, flex:1,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>{item.title}</span>
              <span style={{ fontSize:10, color:accent, fontFamily:'var(--font-mono)', flexShrink:0, opacity:.7 }}>↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}