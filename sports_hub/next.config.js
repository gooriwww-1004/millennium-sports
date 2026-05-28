/** @type {import('next').NextConfig} */
module.exports = {
  // iframe으로 외부 앱 임베드 허용
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // sports_hub가 외부 사이트를 iframe으로 불러오는 건 기본 허용
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  // 이미지 최적화 허용 도메인
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sports.naver.com' },
      { protocol: 'https', hostname: '**.naver.com' },
    ]
  }
}
