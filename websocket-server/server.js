const { Server } = require('socket.io')
const http = require('http')
const os = require('os')

// Environment variables
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket'] // Only WebSocket, no polling
})

// Store the io instance globally for HTTP endpoint access
global.io = io

// Track buzzer state for each game
const buzzerState = new Map()

// Track game state for each game (new feature)
const gameState = new Map()

io.on('connection', (socket) => {
  console.log('=== SERVER: Client connected ===')
  console.log('Socket ID:', socket.id)
  console.log('Client address:', socket.handshake.address)
  console.log('Client headers:', socket.handshake.headers.origin)

  // Join a game room
  socket.on('join-game', (gameId) => {
    socket.join(gameId)
    console.log(`=== SERVER: Socket ${socket.id} joined game ${gameId} ===`)
    
    // Initialize buzzer state for this game if it doesn't exist
    if (!buzzerState.has(gameId)) {
      buzzerState.set(gameId, {
        isActive: false,
        firstBuzz: null,
        buzzedPlayers: new Set(),
        buzzStartTime: null,
        buzzOrder: [],
        audioStartTime: null
      })
      console.log(`=== SERVER: Initialized buzzer state for game ${gameId} ===`)
    }

    // Initialize game state for this game if it doesn't exist
    if (!gameState.has(gameId)) {
      gameState.set(gameId, {
        currentQuestion: null,
        isPlaying: false,
        buzzStartTime: null,
        buzzOrder: [],
        scoreboard: []
      })
      console.log(`=== SERVER: Initialized game state for game ${gameId} ===`)
    }

    // Send current game state to the new client
    const currentGameState = gameState.get(gameId)
    if (currentGameState) {
      socket.emit('game-state-update', currentGameState)
      console.log(`=== SERVER: Sent current game state to new client for game ${gameId} ===`)
      console.log('Game state data:', currentGameState)
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

  // Handle game state updates (from game board) - NEW FEATURE
  socket.on('game-state-update', (data) => {
    // Get game ID from the socket's rooms
    const rooms = Array.from(socket.rooms.values())
    const gameId = rooms.find(room => room !== socket.id)
    
    console.log(`Game state update received from socket ${socket.id} for game ${gameId}:`, data)
    
    if (gameId) {
      // Store the game state
      gameState.set(gameId, data)
      
      // Send to all clients in the game room
      io.to(gameId).emit('game-state-update', data)
      console.log(`Game state broadcasted to all clients in game ${gameId}`)
    }
  })

  // Handle buzzer enable (from game board) - NEW FEATURE
  socket.on('enable-buzzer', (data) => {
    const rooms = Array.from(socket.rooms.values())
    const gameId = rooms.find(room => room !== socket.id)
    
    if (gameId) {
      const state = buzzerState.get(gameId)
      if (state) {
        state.isActive = true
        state.firstBuzz = null
        state.buzzedPlayers.clear()
        state.buzzStartTime = data.startTime
        state.buzzOrder = []
        state.audioStartTime = null
        console.log(`Buzzer enabled for game ${gameId} at ${data.startTime}`)
        
        // Update game state
        const gameStateData = gameState.get(gameId)
        if (gameStateData) {
          gameStateData.isPlaying = true
          gameStateData.buzzStartTime = data.startTime
          gameStateData.buzzOrder = []
          gameState.set(gameId, gameStateData)
        }
        
        // Notify all clients in the game
        io.to(gameId).emit('buzzer-enabled', { startTime: data.startTime })
      }
    }
  })

  // Handle audio start (from game board) - NEW FEATURE
  socket.on('audio-started', (data) => {
    const rooms = Array.from(socket.rooms.values())
    const gameId = rooms.find(room => room !== socket.id)
    
    if (gameId) {
      const state = buzzerState.get(gameId)
      if (state) {
        state.audioStartTime = Date.now()
        console.log(`Audio started for game ${gameId} at ${state.audioStartTime}`)
        
        // Notify all clients that audio has started
        io.to(gameId).emit('audio-started', { audioStartTime: state.audioStartTime })
      }
    }
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

  // Handle buzz-in from players with enhanced logic
  socket.on('buzz-in', (data) => {
    const { gameId, teamId, playerId, playerName, teamName, clientTimestamp, timeFromStart } = data
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

    // Check if audio has started and if buzz is after 500ms from audio start
    if (state.audioStartTime) {
      const timeSinceAudioStart = Date.now() - state.audioStartTime
      if (timeSinceAudioStart < 500) {
        // Too early, ignore the buzz
        socket.emit('buzz-failed', { playerId, reason: 'Too early' })
        return
      }
    }

    // Record the buzz
    state.buzzedPlayers.add(playerId)
    
    const buzzData = {
      teamId,
      playerId,
      playerName,
      teamName,
      timestamp: Date.now(),
      clientTime: clientTimestamp,
      timeFromStart: timeFromStart
    }
    
    if (!state.firstBuzz) {
      // First to buzz!
      state.firstBuzz = buzzData
      console.log(`First buzz in game ${gameId}: ${playerName} from ${teamName}`)
      
      // Notify the first buzzer
      socket.emit('buzz-success', { playerId, isFirst: true, clientTime: timeFromStart })
      
      // Notify all other clients that someone buzzed first
      socket.to(gameId).emit('buzz-success', { playerId, isFirst: false })
      
      // Notify game board of first buzz
      io.to(gameId).emit('first-buzz', buzzData)
      
      // Disable buzzer for all clients
      io.to(gameId).emit('buzzer-disabled', { reason: 'First buzz received' })
      state.isActive = false
    } else {
      // Not first, but still recorded
      console.log(`Buzz in game ${gameId}: ${playerName} from ${teamName} (not first)`)
      socket.emit('buzz-success', { playerId, isFirst: false })
    }
    
    // Add to buzz order
    state.buzzOrder.push(buzzData)
    state.buzzOrder.sort((a, b) => a.timeFromStart - b.timeFromStart)
    
    // Update game state
    const gameStateData = gameState.get(gameId)
    if (gameStateData) {
      gameStateData.buzzOrder = state.buzzOrder
      gameState.set(gameId, gameStateData)
    }
    
    // Emit for order tracking
    io.to(gameId).emit('buzz-received', buzzData)
    io.to(gameId).emit('buzz-order-update', { buzzOrder: state.buzzOrder })
  })

  // Handle buzzer reset (from game board)
  socket.on('reset-buzzer', (gameId) => {
    const state = buzzerState.get(gameId)
    if (state) {
      state.isActive = false
      state.firstBuzz = null
      state.buzzedPlayers.clear()
      state.buzzStartTime = null
      state.buzzOrder = []
      state.audioStartTime = null
      console.log(`Buzzer reset for game ${gameId}`)
      
      // Update game state
      const gameStateData = gameState.get(gameId)
      if (gameStateData) {
        gameStateData.isPlaying = false
        gameStateData.buzzStartTime = null
        gameStateData.buzzOrder = []
        gameState.set(gameId, gameStateData)
      }
      
      // Notify all clients in the game
      io.to(gameId).emit('buzz-reset')
    }
  })

  // Simple ping-pong test for connection verification
  socket.on('ping', (data) => {
    console.log(`Ping received from ${socket.id}:`, data)
    socket.emit('pong', { 
      message: 'Server received your ping!',
      timestamp: Date.now(),
      socketId: socket.id,
      ...data
    })
  })

  socket.on('disconnect', () => {
    console.log('=== SERVER: Client disconnected ===')
    console.log('Socket ID:', socket.id)
    console.log('Reason:', socket.disconnectReason)
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
        } else if (event === 'game-state-update' && data.gameId) {
          io.to(data.gameId).emit('game-state-update', data)
          console.log(`Game state updated for game ${data.gameId}`)
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error processing emit request:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      activeGames: buzzerState.size,
      gameStates: gameState.size,
      activeConnections: io.engine.clientsCount
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT} in ${NODE_ENV} mode`)
  console.log('Listening on all network interfaces')
  
  if (NODE_ENV === 'development') {
    // Get network interfaces for better logging (development only)
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
  }
  
  console.log(`\nHealth check: http://192.168.0.193:${PORT}/health`)
  console.log(`WebSocket endpoint: ws://192.168.0.193:${PORT}`)
}) 