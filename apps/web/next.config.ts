import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@emas/ui', '@emas/tenancy', '@emas/sdk'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
