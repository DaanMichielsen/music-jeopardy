const { Server } = require('socket.io')
const http = require('http')
const os = require('os')

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

// Track buzzer state for each game
const buzzerState = new Map()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join a game room
  socket.on('join-game', (gameId) => {
    socket.join(gameId)
    console.log(`Socket ${socket.id} joined game ${gameId}`)
    
    // Initialize buzzer state for this game if it doesn't exist
    if (!buzzerState.has(gameId)) {
      buzzerState.set(gameId, {
        isActive: false,
        firstBuzz: null,
        buzzedPlayers: new Set()
      })
    }
  })

  // Leave a game room
  socket.on('leave-game', (gameId) => {
    socket.leave(gameId)
    console.log(`Socket ${socket.id} left game ${gameId}`)
  })

  // Handle avatar updates
  socket.on('avatar-updated', (data) => {
    socket.to(data.gameId).emit('avatar-updated', data)
    console.log(`Avatar updated for player ${data.playerId} in game ${data.gameId}`)
  })

  // Handle buzzer activation (from game board)
  socket.on('activate-buzzer', (gameId) => {
    const state = buzzerState.get(gameId)
    if (state) {
      state.isActive = true
      state.firstBuzz = null
      state.buzzedPlayers.clear()
      console.log(`Buzzer activated for game ${gameId}`)
      
      // Notify all clients in the game
      io.to(gameId).emit('buzz-activated')
    }
  })

  // Handle buzzer deactivation (from game board)
  socket.on('deactivate-buzzer', (gameId) => {
    const state = buzzerState.get(gameId)
    if (state) {
      state.isActive = false
      state.firstBuzz = null
      state.buzzedPlayers.clear()
      console.log(`Buzzer deactivated for game ${gameId}`)
      
      // Notify all clients in the game
      io.to(gameId).emit('buzz-deactivated')
    }
  })

  // Handle buzz-in from players
  socket.on('buzz-in', (data) => {
    const { gameId, teamId, playerId, playerName, teamName } = data
    const state = buzzerState.get(gameId)
    
    if (!state || !state.isActive) {
      // Buzzer not active, ignore
      socket.emit('buzz-failed', { playerId, reason: 'Buzzer not active' })
      return
    }

    if (state.buzzedPlayers.has(playerId)) {
      // Player already buzzed, ignore
      socket.emit('buzz-failed', { playerId, reason: 'Already buzzed' })
      return
    }

    // Record the buzz
    state.buzzedPlayers.add(playerId)
    
    if (!state.firstBuzz) {
      // First to buzz!
      state.firstBuzz = { teamId, playerId, playerName, teamName }
      console.log(`First buzz in game ${gameId}: ${playerName} from ${teamName}`)
      
      // Notify the first buzzer
      socket.emit('buzz-success', { playerId, isFirst: true })
      
      // Notify all other clients that someone buzzed first
      socket.to(gameId).emit('buzz-success', { playerId, isFirst: false })
      
      // Notify game board of first buzz
      io.to(gameId).emit('first-buzz', { teamId, playerId, playerName, teamName })
      
      // Also emit as a regular buzz for order tracking
      io.to(gameId).emit('buzz-received', { teamId, playerId, playerName, teamName })
    } else {
      // Not first, but still recorded
      console.log(`Buzz in game ${gameId}: ${playerName} from ${teamName} (not first)`)
      socket.emit('buzz-success', { playerId, isFirst: false })
      
      // Emit for order tracking
      io.to(gameId).emit('buzz-received', { teamId, playerId, playerName, teamName })
    }
  })

  // Handle buzzer reset (from game board)
  socket.on('reset-buzzer', (gameId) => {
    const state = buzzerState.get(gameId)
    if (state) {
      state.isActive = false
      state.firstBuzz = null
      state.buzzedPlayers.clear()
      console.log(`Buzzer reset for game ${gameId}`)
      
      // Notify all clients in the game
      io.to(gameId).emit('buzz-reset')
    }
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
        } else if (event === 'activate-buzzer' && data.gameId) {
          io.to(data.gameId).emit('activate-buzzer', data.gameId)
          console.log(`Buzzer activated for game ${data.gameId}`)
        } else if (event === 'deactivate-buzzer' && data.gameId) {
          io.to(data.gameId).emit('deactivate-buzzer', data.gameId)
          console.log(`Buzzer deactivated for game ${data.gameId}`)
        } else if (event === 'reset-buzzer' && data.gameId) {
          io.to(data.gameId).emit('reset-buzzer', data.gameId)
          console.log(`Buzzer reset for game ${data.gameId}`)
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
  console.log('Listening on all network interfaces')
  
  // Get network interfaces for better logging
  const networkInterfaces = os.networkInterfaces()
  console.log('\nAvailable network addresses:')
  
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaces = networkInterfaces[interfaceName]
    interfaces.forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`  ${interfaceName}: http://${interface.address}:${PORT}`)
      }
    })
  })
  
  console.log('\nHandling avatar updates and buzzer functionality')
}) 