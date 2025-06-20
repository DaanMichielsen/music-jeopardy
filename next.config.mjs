/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: [
      'localhost', 
      '127.0.0.1', 
      'vercel.app',
      'vercel.com',
      'blob.vercel-storage.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  env: {
    // Environment variables for WebSocket and API URLs
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    WEBSOCKET_SERVER_URL: process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001',
  },
  webpack: (config, { isServer }) => {
    return config;
  }
}

export default nextConfig
