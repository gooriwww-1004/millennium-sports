import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '⚽ Match Analyzer | Millennium Session',
  description: '축구 포아송 시뮬레이션 배팅 분석 툴 · EV 계산 · A/B/C 등급',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Match Analyzer',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0c10',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
