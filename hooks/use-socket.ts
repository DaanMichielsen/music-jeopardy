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

    // Connect to WebSocket server
    const socket = io('http://192.168.0.190:3001', {
      transports: ['websocket'] // Only use WebSocket, no polling fallback
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