import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@emas/tenancy', '@emas/sdk'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8001/:path*',
      },
    ]
  },
}

export default nextConfig
