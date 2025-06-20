import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket(gameId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!gameId || !isClient) return

    // Dynamically determine the socket server URL
    const getSocketUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const port = '3001' // Socket server port
        
        // If we're on localhost, use localhost for socket too
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `http://localhost:${port}`
        }
        
        // Otherwise use the same hostname as the current page
        return `http://${hostname}:${port}`
      }
      
      // Fallback for server-side rendering
      return 'http://localhost:3001'
    }

    const socketUrl = getSocketUrl()
    console.log('Connecting to socket server at:', socketUrl)

    // Connect to WebSocket server
    const socket = io(socketUrl, {
      transports: ['websocket'], // Only use WebSocket, no polling fallback
      timeout: 5000, // 5 second timeout
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to WebSocket server')
      setIsConnected(true)
      
      // Join the game room
      socket.emit('join-game', gameId)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts')
      setIsConnected(true)
      
      // Re-join the game room after reconnection
      socket.emit('join-game', gameId)
    })

    socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error)
    })

    return () => {
      if (socket) {
        socket.emit('leave-game', gameId)
        socket.disconnect()
      }
    }
  }, [gameId, isClient])

  const emitAvatarUpdate = (playerId: string, avatarUrl: string) => {
    if (socketRef.current && gameId) {
      socketRef.current.emit('avatar-updated', {
        gameId,
        playerId,
        avatarUrl
      })
    }
  }

  return {
    isConnected: isClient ? isConnected : false, // Always false on server
    emitAvatarUpdate,
    socket: socketRef.current
  }
} 