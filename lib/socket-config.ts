// WebSocket server configuration
export const SOCKET_CONFIG = {
  // Development: local WebSocket server
  development: {
    url: 'http://localhost:3001',
    transports: ['websocket'] as string[]
  },
  // Production: deployed WebSocket server (Render, Railway, etc.)
  production: {
    url: process.env.NEXT_PUBLIC_SOCKET_URL || 'https://music-jeopardy.onrender.com',
    transports: ['websocket'] as string[]
  }
}

export function getSocketConfig() {
  const env = process.env.NODE_ENV || 'development'
  return SOCKET_CONFIG[env as keyof typeof SOCKET_CONFIG] || SOCKET_CONFIG.development
}

// Helper function to get the current WebSocket URL
export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable or fallback
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
  }
  
  // Server-side: use environment variable or fallback
  return process.env.SOCKET_URL || 'http://localhost:3001'
} 