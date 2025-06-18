const { Server } = require('socket.io')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket'] // Only WebSocket, no polling
})

// Store the io instance globally for HTTP endpoint access
global.io = io

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join a game room
  socket.on('join-game', (gameId) => {
    socket.join(gameId)
    console.log(`Socket ${socket.id} joined game ${gameId}`)
  })

  // Leave a game room
  socket.on('leave-game', (gameId) => {
    socket.leave(gameId)
    console.log(`Socket ${socket.id} left game ${gameId}`)
  })

  // Handle avatar updates only
  socket.on('avatar-updated', (data) => {
    socket.to(data.gameId).emit('avatar-updated', data)
    console.log(`Avatar updated for player ${data.playerId} in game ${data.gameId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// HTTP endpoint to emit events from the API
server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/emit') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { event, data } = JSON.parse(body)
        console.log(`Emitting ${event} event:`, data)
        
        if (event === 'avatar-updated' && data.gameId) {
          io.to(data.gameId).emit('avatar-updated', data)
          console.log(`WebSocket event emitted: ${event} for game ${data.gameId}`)
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error processing emit request:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
  } else {
    res.writeHead(404)
    res.end()
  }
})

const PORT = 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Accessible at: http://192.168.0.190:${PORT}`)
  console.log('Only handling avatar updates - no polling')
}) 