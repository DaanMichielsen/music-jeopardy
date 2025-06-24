const { Server } = require('socket.io')
const http = require('http')
const os = require('os')

// Environment variables
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket'] // Only WebSocket, no polling
})

// Store the io instance globally for HTTP endpoint access
global.io = io

// Track buzzer state for each game
const buzzerState = new Map()

// Track game state for each game
const gameState = new Map()

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
        buzzedPlayers: new Set(),
        buzzStartTime: null,
        buzzOrder: []
      })
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
    }

    // Send current game state to the new client
    const currentGameState = gameState.get(gameId)
    if (currentGameState) {
      socket.emit('game-state-update', currentGameState)
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

  // Handle game state updates (from game board)
  socket.on('game-state-update', (data) => {
    const gameId = socket.rooms.values().next().value
    if (gameId && gameId !== socket.id) {
      gameState.set(gameId, data)
      socket.to(gameId).emit('game-state-update', data)
      console.log(`Game state updated for game ${gameId}`)
    }
  })

  // Handle buzz activation with timing (from game board)
  socket.on('buzz-activated', (data) => {
    const gameId = socket.rooms.values().next().value
    if (gameId && gameId !== socket.id) {
      const state = buzzerState.get(gameId)
      if (state) {
        state.isActive = true
        state.firstBuzz = null
        state.buzzedPlayers.clear()
        state.buzzStartTime = data.startTime
        state.buzzOrder = []
        console.log(`Buzzer activated for game ${gameId} at ${data.startTime}`)
        
        // Update game state
        const gameStateData = gameState.get(gameId)
        if (gameStateData) {
          gameStateData.isPlaying = true // This now means "question is active"
          gameStateData.buzzStartTime = data.startTime
          gameStateData.buzzOrder = []
          gameState.set(gameId, gameStateData)
        }
        
        // Notify all clients in the game
        io.to(gameId).emit('buzz-activated', { startTime: data.startTime })
      }
    }
  })

  // Handle buzzer deactivation (from game board)
  socket.on('deactivate-buzzer', (gameId) => {
    const state = buzzerState.get(gameId)
    if (state) {
      state.isActive = false
      state.firstBuzz = null
      state.buzzedPlayers.clear()
      state.buzzStartTime = null
      state.buzzOrder = []
      console.log(`Buzzer deactivated for game ${gameId}`)
      
      // Update game state
      const gameStateData = gameState.get(gameId)
      if (gameStateData) {
        gameStateData.isPlaying = false
        gameStateData.buzzStartTime = null
        gameStateData.buzzOrder = []
        gameState.set(gameId, gameStateData)
      }
      
      // Notify all clients in the game
      io.to(gameId).emit('buzz-deactivated')
    }
  })

  // Handle buzz-in from players with client-side timing and 500ms delay validation
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

    // Check if buzz is after the 500ms delay period
    const serverTime = Date.now()
    const timeSinceActivation = serverTime - state.buzzStartTime
    
    if (timeSinceActivation < 500) {
      // Too early, ignore the buzz
      socket.emit('buzz-failed', { playerId, reason: 'Too early' })
      return
    }

    // Record the buzz with client timing
    state.buzzedPlayers.add(playerId)
    
    const buzzData = {
      teamId,
      playerId,
      playerName,
      teamName,
      timestamp: serverTime,
      clientTime: clientTimestamp,
      timeFromStart: timeFromStart,
      serverTimeFromStart: timeSinceActivation
    }
    
    if (!state.firstBuzz) {
      // First to buzz!
      state.firstBuzz = buzzData
      console.log(`First buzz in game ${gameId}: ${playerName} from ${teamName} at ${timeFromStart}ms (server: ${timeSinceActivation}ms)`)
      
      // Notify the first buzzer
      socket.emit('buzz-success', { playerId, isFirst: true, clientTime: timeFromStart })
      
      // Notify all other clients that someone buzzed first
      socket.to(gameId).emit('buzz-success', { playerId, isFirst: false })
      
      // Notify game board of first buzz
      io.to(gameId).emit('first-buzz', buzzData)
    } else {
      // Not first, but still recorded
      console.log(`Buzz in game ${gameId}: ${playerName} from ${teamName} at ${timeFromStart}ms (server: ${timeSinceActivation}ms) - not first`)
      socket.emit('buzz-success', { playerId, isFirst: false })
    }
    
    // Add to buzz order (sorted by client time for fairness)
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
        } else if (event === 'game-state-update' && data.gameId) {
          io.to(data.gameId).emit('game-state-update', data)
          console.log(`Game state updated for game ${data.gameId}`)
        } else if (event === 'buzz-activated' && data.gameId) {
          io.to(data.gameId).emit('buzz-activated', data)
          console.log(`Buzzer activated for game ${data.gameId}`)
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
  
  console.log(`\nHealth check: http://localhost:${PORT}/health`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
}) 