"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Music, Users, Crown, Zap, Upload, Wifi, WifiOff, Eye, Trophy, Clock } from "lucide-react"
import { getGameState } from "@/app/actions"
import { io, Socket } from 'socket.io-client'

interface GameState {
  id?: string
  teams: Array<{
    id: string
    name: string
    color: string
    score: number
    players: Array<{
      player: {
        id: string
        name: string
        avatar: string | null
      }
    }>
  }>
  host: {
    id: string
    name: string
    avatar: string | null
  } | null
  players: Array<{
    id: string
    name: string
    avatar: string | null
  }>
  categories: any[]
}

interface LiveGameState {
  currentQuestion: {
    category: string
    points: number
    songName: string
    artist: string
  } | null
  isPlaying: boolean
  buzzStartTime: number | null
  buzzOrder: Array<{
    playerId: string
    playerName: string
    teamName: string
    timestamp: number
    clientTime: number
    timeFromStart: number
  }>
  scoreboard: Array<{
    teamId: string
    teamName: string
    score: number
    color: string
  }>
}

function BuzzerPageContent() {
  const searchParams = useSearchParams()
  const gameId = searchParams.get('gameId')
  
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [liveGameState, setLiveGameState] = useState<LiveGameState>({
    currentQuestion: null,
    isPlaying: false,
    buzzStartTime: null,
    buzzOrder: [],
    scoreboard: []
  })
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [buzzedIn, setBuzzedIn] = useState(false)
  const [buzzDisabled, setBuzzDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clientBuzzTime, setClientBuzzTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!gameId) return

    // Load game state
    const loadGameState = async () => {
      try {
        const state = await getGameState(gameId)
        setGameState(state)
      } catch (error) {
        console.error('Error loading game state:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGameState()

    // Connect to socket
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001'
    const socket = io(socketUrl, {
      transports: ['websocket']
    })

    socket.on('connect', () => {
      console.log('Connected to buzzer socket')
      setIsConnected(true)
      socket.emit('join-game', gameId)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from buzzer socket')
      setIsConnected(false)
    })

    // Live game state updates
    socket.on('game-state-update', (data: LiveGameState) => {
      console.log('Game state update received:', data)
      setLiveGameState(data)
    })

    socket.on('buzz-activated', (data: { startTime: number }) => {
      console.log('Buzz activated at:', data.startTime)
      setLiveGameState(prev => ({
        ...prev,
        buzzStartTime: data.startTime,
        isPlaying: true,
        buzzOrder: []
      }))
      setBuzzedIn(false)
      setBuzzDisabled(false)
      setClientBuzzTime(null)
      setCountdown(500) // Start 500ms countdown
    })

    socket.on('buzz-reset', () => {
      console.log('Buzz reset received')
      setLiveGameState(prev => ({
        ...prev,
        buzzStartTime: null,
        isPlaying: false,
        buzzOrder: []
      }))
      setBuzzedIn(false)
      setBuzzDisabled(false)
      setClientBuzzTime(null)
      setCountdown(null)
    })

    socket.on('buzz-success', (data) => {
      if (data.playerId === selectedPlayer?.id) {
        setBuzzedIn(true)
        setBuzzDisabled(true)
        setClientBuzzTime(data.clientTime)
      }
    })

    socket.on('buzz-failed', (data) => {
      if (data.playerId === selectedPlayer?.id) {
        setBuzzedIn(false)
        setBuzzDisabled(true)
      }
    })

    socket.on('buzz-order-update', (data: { buzzOrder: any[] }) => {
      setLiveGameState(prev => ({
        ...prev,
        buzzOrder: data.buzzOrder
      }))
    })

    setSocket(socket)

    return () => {
      socket.disconnect()
    }
  }, [gameId, selectedPlayer?.id])

  // Real-time countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 0) return null
        return prev - 100
      })
    }, 100)

    return () => clearInterval(timer)
  }, [countdown])

  const handleBuzzIn = () => {
    if (!socket || !selectedPlayer || !selectedTeam || buzzDisabled) return

    const clientTimestamp = Date.now()
    const timeFromStart = liveGameState.buzzStartTime ? clientTimestamp - liveGameState.buzzStartTime : 0

    console.log('Buzz attempt:', {
      clientTimestamp,
      buzzStartTime: liveGameState.buzzStartTime,
      timeFromStart
    })

    socket.emit('buzz-in', {
      gameId,
      teamId: selectedTeam.id,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      teamName: selectedTeam.name,
      clientTimestamp,
      timeFromStart
    })
  }

  const handleAvatarUpload = async (playerId: string) => {
    // Create upload URL for this specific player
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    const uploadUrl = `${apiBaseUrl}/upload-avatar?gameId=${gameId}&playerId=${playerId}`
    
    // Open upload page in new tab
    window.open(uploadUrl, '_blank')
  }

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.floor((ms % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }

  const getBuzzStatus = () => {
    if (!liveGameState.buzzStartTime) return { canBuzz: false, message: 'Waiting for question...' }
    
    // Use countdown if available, otherwise calculate from buzzStartTime
    const timeRemaining = countdown !== null ? countdown : Math.max(0, 500 - (Date.now() - liveGameState.buzzStartTime))
    
    if (timeRemaining > 0) {
      return { 
        canBuzz: false, 
        message: `Wait ${formatTime(timeRemaining)}...`,
        timeRemaining: timeRemaining
      }
    }
    
    return { canBuzz: true, message: 'Ready to buzz!' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>Game not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br pt-12 from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Music className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Music Jeopardy</h1>
          </div>
          <div className="flex items-center justify-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Verbonden' : 'Niet verbonden'}
            </span>
          </div>
        </div>

        {/* Live Game State */}
        {liveGameState.currentQuestion && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-400" />
                Huidige vraag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Categorie:</span>
                <span className="text-white font-medium">{liveGameState.currentQuestion.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Punten:</span>
                <Badge className="bg-yellow-600 text-white">
                  ${liveGameState.currentQuestion.points}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Status:</span>
                <span className={`text-sm font-medium ${liveGameState.currentQuestion ? 'text-green-400' : 'text-yellow-400'}`}>
                  {liveGameState.currentQuestion ? 'Vraag actief' : 'Wacht op vraag'}
                </span>
              </div>
              {liveGameState.buzzStartTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Start tijd:</span>
                  <span className="text-white text-sm font-mono">
                    {formatTime(Date.now() - liveGameState.buzzStartTime)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live Scoreboard */}
        {liveGameState.scoreboard.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Scorebord
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {liveGameState.scoreboard
                .sort((a, b) => b.score - a.score)
                .map((team, index) => (
                <div key={team.teamId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-slate-300' : 
                      index === 2 ? 'text-orange-400' : 'text-slate-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="text-white text-sm">{team.teamName}</span>
                  </div>
                  <span className="text-white font-bold">{team.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Live Buzz Feed */}
        {liveGameState.buzzOrder.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Buzz volgorde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-32 overflow-y-auto">
              {liveGameState.buzzOrder.map((buzz, index) => (
                <div key={buzz.playerId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-400' : 'text-slate-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className={`${
                      index === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {buzz.playerName}
                    </span>
                    <span className="text-slate-400 text-xs">({buzz.teamName})</span>
                  </div>
                  <span className={`text-xs font-mono ${
                    index === 0 ? 'text-yellow-400' : 'text-slate-400'
                  }`}>
                    {index === 0 ? 'FIRST' : formatTime(buzz.timeFromStart)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Team Selection */}
        {!selectedTeam && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Selecteer je team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gameState.teams.map((team: any) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTeam?.id === team.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-sm text-slate-400">{Array.isArray(team.players) ? team.players.length : 0} spelers</p>
                    </div>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      {team.score} ptn
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Player Selection */}
        {selectedTeam && !selectedPlayer && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Selecteer je speler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTeam.players.map((playerData: any) => {
                const player = playerData.player
                return (
                  <div
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlayer?.id === player.id
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-slate-600 text-white">
                          {getPlayerInitials(player.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{player.name}</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAvatarUpload(player.id)
                        }}
                        className="border-slate-500 text-slate-300 hover:bg-slate-600"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Player Info (Compact) */}
        {selectedPlayer && selectedTeam && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Je speelt als:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPlayer.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-slate-600 text-white">
                    {getPlayerInitials(selectedPlayer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg">{selectedPlayer.name}</h3>
                  <p className="text-slate-400">Team {selectedTeam.name}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAvatarUpload(selectedPlayer.id)}
                  className="border-slate-500 text-slate-300 hover:bg-slate-600"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Avatar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buzzer */}
        {selectedPlayer && selectedTeam && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Ready to Buzz In!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Button
                  onClick={handleBuzzIn}
                  disabled={!isConnected || buzzDisabled || !liveGameState.currentQuestion || !getBuzzStatus().canBuzz}
                  className={`w-32 h-32 rounded-full text-2xl font-bold shadow-lg transition-all ${
                    buzzedIn
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/50'
                      : buzzDisabled
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-none'
                      : !liveGameState.currentQuestion
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed shadow-none'
                      : !getBuzzStatus().canBuzz
                      ? 'bg-orange-600 text-white shadow-orange-500/50'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-yellow-500/50 hover:scale-105 active:scale-95'
                  }`}
                >
                  {buzzedIn ? (
                    <>
                      <Zap className="h-8 w-8 mr-2" />
                      FIRST!
                    </>
                  ) : buzzDisabled ? (
                    <>
                      <Zap className="h-8 w-8 mr-2" />
                      LATE
                    </>
                  ) : !liveGameState.currentQuestion ? (
                    <>
                      <Clock className="h-8 w-8 mr-2" />
                      WAIT
                    </>
                  ) : !getBuzzStatus().canBuzz ? (
                    <>
                      <Clock className="h-8 w-8 mr-2" />
                      {(() => {
                        const status = getBuzzStatus()
                        return status.timeRemaining && status.timeRemaining < 1000 ? 
                          `${Math.ceil(status.timeRemaining / 100)}` : 
                          'WAIT'
                      })()}
                    </>
                  ) : (
                    <>
                      <Zap className="h-8 w-8 mr-2" />
                      BUZZ!
                    </>
                  )}
                </Button>
              </div>

              {buzzedIn && (
                <div className="text-center">
                  <p className="text-sm text-green-400 font-semibold">
                    You were first! Wait for the host to call on you.
                  </p>
                  {clientBuzzTime && (
                    <p className="text-xs text-green-300 mt-1">
                      Your time: {formatTime(clientBuzzTime)}
                    </p>
                  )}
                </div>
              )}

              {buzzDisabled && !buzzedIn && (
                <div className="text-center">
                  <p className="text-sm text-slate-400">
                    Someone else buzzed in first.
                  </p>
                </div>
              )}

              {!liveGameState.currentQuestion && (
                <div className="text-center">
                  <p className="text-sm text-yellow-400">
                    Waiting for host to select a question...
                  </p>
                </div>
              )}

              {liveGameState.currentQuestion && !buzzedIn && !buzzDisabled && (
                <div className="text-center">
                  <p className="text-sm text-blue-400">
                    {getBuzzStatus().message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function BuzzerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading buzzer...</p>
        </div>
      </div>
    }>
      <BuzzerPageContent />
    </Suspense>
  )
} 