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
    domains: ['localhost', '127.0.0.1', '192.168.0.190', '192.168.1.1', '10.0.0.1'],
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
  allowedDevOrigins: ['http://192.168.0.190:3000'],
  env: {
    // Allow dynamic hostname detection
    NEXT_PUBLIC_HOSTNAME: process.env.NEXT_PUBLIC_HOSTNAME || 'localhost',
  },
  // Handle different environments
  webpack: (config, { isServer }) => {
    return config;
  }
}

export default nextConfig
