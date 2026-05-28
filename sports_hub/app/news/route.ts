// app/api/news/route.ts
// 네이버 스포츠 스크래핑 → RSS 폴백
// Millennium Session · 유리 (연구실장)

import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600 // 1시간 캐시

export interface NewsItem {
  title:   string
  url:     string
  source:  string
  date?:   string
  sport:   'baseball' | 'soccer' | 'general'
}

// ─── RSS 소스 (안정적 폴백) ───────────────────────────
const RSS_SOURCES = {
  baseball: [
    { url: 'https://sports.news.naver.com/kbaseball/news/index.nhn?isphoto=N', label: '네이버 야구' },
    { url: 'https://www.yna.co.kr/sports/baseball', label: '연합뉴스 야구' },
  ],
  soccer: [
    { url: 'https://sports.news.naver.com/wfootball/news/index.nhn?isphoto=N', label: '네이버 축구' },
    { url: 'https://www.yna.co.kr/sports/soccer', label: '연합뉴스 축구' },
  ],
  general: [
    { url: 'https://sports.news.naver.com/index.nhn', label: '네이버 스포츠' },
  ]
}

// ─── 네이버 스포츠 헤드라인 스크래핑 ─────────────────
async function scrapeNaverSports(sport: 'baseball' | 'soccer' | 'general'): Promise<NewsItem[]> {
  const urlMap = {
    baseball: 'https://sports.news.naver.com/kbaseball/news/index.nhn',
    soccer:   'https://sports.news.naver.com/wfootball/news/index.nhn',
    general:  'https://sports.news.naver.com/index.nhn',
  }
  
  try {
    const res = await fetch(urlMap[sport], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://sports.naver.com/',
      },
      next: { revalidate: 3600 }
    })
    if (!res.ok) return []
    
    const html = await res.text()
    const items: NewsItem[] = []
    
    // 뉴스 링크 패턴 추출
    const patterns = [
      // 네이버 스포츠 뉴스 링크 패턴
      /href="(https?:\/\/sports\.news\.naver\.com\/[^"]+)"[^>]*>([^<]{10,60})</g,
      /href="(\/news\/[^"]+)"[^>]*title="([^"]{10,60})"/g,
    ]
    
    for (const pattern of patterns) {
      let m: RegExpExecArray | null
      while ((m = pattern.exec(html)) !== null && items.length < 8) {
        const url   = m[1].startsWith('http') ? m[1] : `https://sports.naver.com${m[1]}`
        const title = m[2].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()
        if (title.length > 8 && !items.find(i => i.url === url)) {
          items.push({ title, url, source: '네이버 스포츠', sport })
        }
      }
    }
    
    return items
  } catch {
    return []
  }
}

// ─── RSS 파싱 ─────────────────────────────────────────
async function fetchRSS(sport: 'baseball' | 'soccer' | 'general'): Promise<NewsItem[]> {
  // 네이버 스포츠 일정 페이지 직접 링크 (안정적)
  const today = new Date()
  const ymd   = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
  
  const fixedLinks: Record<string, NewsItem[]> = {
    baseball: [
      { title: `⚾ KBO 오늘 경기 일정 (${today.getMonth()+1}/${today.getDate()})`, url: `https://sports.naver.com/kbaseball/schedule/index.nhn?date=${ymd}`, source: '네이버 스포츠', sport:'baseball' },
      { title: '🏆 KBO 순위표', url: 'https://sports.naver.com/kbaseball/record/index.nhn', source: '네이버 스포츠', sport:'baseball' },
      { title: '📊 KBO 팀 기록', url: 'https://sports.naver.com/kbaseball/record/teamRecordList.nhn', source: '네이버 스포츠', sport:'baseball' },
      { title: '⭐ KBO 선수 기록', url: 'https://sports.naver.com/kbaseball/record/playerRecordList.nhn', source: '네이버 스포츠', sport:'baseball' },
      { title: '🇺🇸 MLB 오늘 경기', url: `https://sports.naver.com/mlb/schedule/index.nhn?date=${ymd}`, source: '네이버 스포츠', sport:'baseball' },
    ],
    soccer: [
      { title: `⚽ K리그 오늘 경기 (${today.getMonth()+1}/${today.getDate()})`, url: `https://sports.naver.com/kfootball/schedule/index.nhn?date=${ymd}`, source: '네이버 스포츠', sport:'soccer' },
      { title: '🏆 K리그 순위', url: 'https://sports.naver.com/kfootball/record/index.nhn', source: '네이버 스포츠', sport:'soccer' },
      { title: '🌍 프리미어리그 일정', url: `https://sports.naver.com/wfootball/schedule/index.nhn?category=epl&date=${ymd}`, source: '네이버 스포츠', sport:'soccer' },
      { title: '🇪🇸 라리가 일정', url: `https://sports.naver.com/wfootball/schedule/index.nhn?category=lal&date=${ymd}`, source: '네이버 스포츠', sport:'soccer' },
      { title: '🏅 챔피언스리그', url: `https://sports.naver.com/wfootball/schedule/index.nhn?category=ucl&date=${ymd}`, source: '네이버 스포츠', sport:'soccer' },
    ],
    general: [
      { title: '🏠 네이버 스포츠 홈', url: 'https://sports.naver.com', source: '네이버 스포츠', sport:'general' },
      { title: '⚾ 야구', url: 'https://sports.naver.com/kbaseball/index.nhn', source: '네이버 스포츠', sport:'general' },
      { title: '⚽ 축구', url: 'https://sports.naver.com/wfootball/index.nhn', source: '네이버 스포츠', sport:'general' },
      { title: '🏀 농구', url: 'https://sports.naver.com/basketball/index.nhn', source: '네이버 스포츠', sport:'general' },
      { title: '🎾 테니스', url: 'https://sports.naver.com/tennis/index.nhn', source: '네이버 스포츠', sport:'general' },
    ]
  }
  return fixedLinks[sport] || []
}

// ─── GET 핸들러 ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const sport = (req.nextUrl.searchParams.get('sport') || 'general') as 'baseball' | 'soccer' | 'general'
  
  // 1차: 스크래핑 시도
  let items = await scrapeNaverSports(sport)
  
  // 2차: 스크래핑 실패 → 고정 링크
  if (items.length < 3) {
    items = await fetchRSS(sport)
  }
  
  return NextResponse.json({ items, count: items.length, sport })
}
