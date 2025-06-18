import { Server as SocketIOServer } from 'socket.io'
import { Server as NetServer } from 'http'

export type NextApiResponseServerIO = any & {
  socket: any & {
    server: NetServer & {
      io: SocketIOServer
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

// Store active connections by game ID
const gameConnections = new Map<string, Set<string>>()

export function getSocketIO(res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    res.socket.server.io = io
  }
  return res.socket.server.io
}

export function addGameConnection(gameId: string, socketId: string) {
  if (!gameConnections.has(gameId)) {
    gameConnections.set(gameId, new Set())
  }
  gameConnections.get(gameId)!.add(socketId)
}

export function removeGameConnection(gameId: string, socketId: string) {
  const connections = gameConnections.get(gameId)
  if (connections) {
    connections.delete(socketId)
    if (connections.size === 0) {
      gameConnections.delete(gameId)
    }
  }
}

export function notifyGameUpdate(gameId: string, event: string, data: any) {
  const connections = gameConnections.get(gameId)
  if (connections && connections.size > 0) {
    // Get the Socket.IO server instance
    const io = require('socket.io')()
    connections.forEach(socketId => {
      io.to(socketId).emit(event, data)
    })
  }
} 