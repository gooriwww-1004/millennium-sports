/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }]
  },
}
