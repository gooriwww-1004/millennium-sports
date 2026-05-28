import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🏆 Millennium Sports Hub',
  description: 'KBO · MLB · K리그 · EPL 분석 허브 | Millennium Session',
}
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#08090f'
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>
}
