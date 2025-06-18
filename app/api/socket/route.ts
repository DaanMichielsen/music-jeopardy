import { NextRequest, NextResponse } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer | null = null

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.IO server
    io = new SocketIOServer(3001, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Join a game room
      socket.on('join-game', (gameId: string) => {
        socket.join(gameId)
        console.log(`Socket ${socket.id} joined game ${gameId}`)
      })

      // Leave a game room
      socket.on('leave-game', (gameId: string) => {
        socket.leave(gameId)
        console.log(`Socket ${socket.id} left game ${gameId}`)
      })

      // Handle avatar updates
      socket.on('avatar-updated', (data: { gameId: string, playerId: string, avatarUrl: string }) => {
        socket.to(data.gameId).emit('avatar-updated', data)
        console.log(`Avatar updated for player ${data.playerId} in game ${data.gameId}`)
      })

      // Handle player updates
      socket.on('player-updated', (data: { gameId: string, player: any }) => {
        socket.to(data.gameId).emit('player-updated', data)
        console.log(`Player updated in game ${data.gameId}`)
      })

      // Handle team updates
      socket.on('team-updated', (data: { gameId: string, team: any }) => {
        socket.to(data.gameId).emit('team-updated', data)
        console.log(`Team updated in game ${data.gameId}`)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  return NextResponse.json({ message: 'WebSocket server running' })
}

// Export the io instance for use in other parts of the app
export { io } 