"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, Music, Trophy, Eye, Award, Play, Pause, Volume2, VolumeX, ExternalLink, X, Zap, QrCode } from "lucide-react"
import { useSpotifyPlayer } from "@/hooks/use-spotify-player"
import { useSpotify } from "@/lib/spotify-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import QRCode from "qrcode"
import type { Category, Question, Team, SpotifyTrack, AudioSnippet } from "../types/game"
import { useSocket } from "@/hooks/use-socket"

interface GameBoardProps {
  gameId?: string
  categories: Category[]
  teams: Team[]
  onCategoriesChange: (categories: Category[]) => void
  onTeamsChange: (teams: Team[]) => void
  onBackToQuestions: () => void
}

export default function GameBoard({
  gameId,
  categories,
  teams,
  onCategoriesChange,
  onTeamsChange,
  onBackToQuestions,
}: GameBoardProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: Category; question: Question } | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hideAnswer, setHideAnswer] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlayingFullSong, setIsPlayingFullSong] = useState(false)
  const [stopTimer, setStopTimer] = useState<NodeJS.Timeout | null>(null)
  const [scoringMode, setScoringMode] = useState<'song' | 'artist'>('song')
  const [songCorrect, setSongCorrect] = useState(false)
  const [artistCorrect, setArtistCorrect] = useState(false)
  const [songTeamId, setSongTeamId] = useState<string | null>(null)
  const [artistTeamId, setArtistTeamId] = useState<string | null>(null)
  const [showBuzzerQR, setShowBuzzerQR] = useState(false)
  const [buzzerQRUrl, setBuzzerQRUrl] = useState("")
  const [buzzerQRDataUrl, setBuzzerQRDataUrl] = useState("")
  const [buzzerActive, setBuzzerActive] = useState(false)
  const [firstBuzz, setFirstBuzz] = useState<any>(null)
  const [buzzOrder, setBuzzOrder] = useState<any[]>([])
  const [showBuzzOrder, setShowBuzzOrder] = useState(false)
  const [buzzStartTime, setBuzzStartTime] = useState<number | null>(null)
  const [showBuzzFeed, setShowBuzzFeed] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)
  
  // Live full track player state
  const [fullTrackPlayTime, setFullTrackPlayTime] = useState(0)
  const [fullTrackStartTime, setFullTrackStartTime] = useState<number | null>(null)
  const [fullTrackTimer, setFullTrackTimer] = useState<NodeJS.Timeout | null>(null)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekPosition, setSeekPosition] = useState(0)
  
  // Use ref for more reliable timing
  const buzzStartTimeRef = useRef<number | null>(null)
  
  // Use centralized Spotify context
  const { isAuthenticated, getValidAccessToken } = useSpotify()
  
  // Use Spotify Web Playback SDK with centralized context
  const { 
    isReady, 
    isConnected, 
    connect, 
    playTrack, 
    pause, 
    currentTrack, 
    isPlaying: sdkIsPlaying,
    position,
    duration,
    seek
  } = useSpotifyPlayer()

  // WebSocket connection for buzzer functionality
  const { socket } = useSocket(gameId || null)

  // Test connection function
  const testConnection = () => {
    if (socket) {
      console.log('=== GAME BOARD: Sending ping to server ===')
      socket.emit('ping', { 
        client: 'game-board',
        gameId: gameId,
        timestamp: Date.now()
      })
    } else {
      console.log('=== GAME BOARD: No socket available for ping test ===')
    }
  }

  // Listen for pong responses
  useEffect(() => {
    if (!socket) return

    const handlePong = (data: any) => {
      console.log('=== GAME BOARD: Pong received from server ===')
      console.log('Pong data:', data)
    }

    socket.on('pong', handlePong)

    return () => {
      socket.off('pong', handlePong)
    }
  }, [socket])

  const selectQuestion = (category: Category, question: Question) => {
    if (question.isAnswered) return

    // Reset buzzer state for new question
    setBuzzStartTime(null)
    setBuzzOrder([])
    buzzStartTimeRef.current = null
    setFirstBuzz(null)
    setShowBuzzFeed(false)
    setShowScoreboard(false)
    setShowAnswer(false)
    setShowHint(false)
    setHideAnswer(false)
    setScoringMode('song')
    setSongCorrect(false)
    setArtistCorrect(false)
    setSongTeamId(null)
    setArtistTeamId(null)
    setIsFlipped(false)

    // Stop any current audio
    pause()
    setIsPlaying(false)
    setIsPlayingFullSong(false)
    if (fullTrackTimer) {
      clearInterval(fullTrackTimer)
      setFullTrackTimer(null)
    }
    setFullTrackStartTime(null)
    setFullTrackPlayTime(0)

    // Reset buzzer on server
    if (socket) {
      socket.emit('reset-buzzer', gameId)
    }

    setSelectedQuestion({ category, question })
    
    // Trigger flip animation after a short delay
    setTimeout(() => setIsFlipped(true), 100)
  }

  const playAudioSnippet = async (track: SpotifyTrack, snippet: AudioSnippet) => {
    if (!isAuthenticated || !track.id) {
      console.log('Not authenticated or no track ID')
      return
    }

    try {
      // Get valid access token from centralized context
      const accessToken = await getValidAccessToken()
      if (!accessToken) {
        console.log('No valid access token available')
        return
      }

      // Connect to Spotify if not already connected
      if (!isConnected) {
        const connected = await connect()
        if (!connected) {
          console.log('Failed to connect to Spotify')
          return
        }
      }

      // Clear any existing stop timer
      if (stopTimer) {
        clearTimeout(stopTimer)
        setStopTimer(null)
      }

      // Play the track starting from the snippet start time
      const trackUri = `spotify:track:${track.id}`
      const success = await playTrack(trackUri, snippet.startTime)
      
      if (success) {
        setIsPlaying(true)
        setIsPlayingFullSong(false)
        console.log('Started playing snippet')
        
        // Calculate how long to play before stopping
        const snippetDuration = snippet.endTime - snippet.startTime
        console.log(`Setting timer to stop after ${snippetDuration}ms`)
        
        // Set up timer to stop at the exact end time
        const timer = setTimeout(() => {
          console.log('Timer triggered - stopping snippet playback')
          pause()
          setIsPlaying(false)
          setStopTimer(null)
        }, snippetDuration)
        
        setStopTimer(timer)
      } else {
        console.log('Failed to play snippet')
      }
    } catch (error) {
      console.error('Error playing audio snippet:', error)
    }
  }

  const playFullSong = async () => {
    if (!selectedQuestion?.question.spotifyTrackId || !isAuthenticated) {
      console.log('No track ID or not authenticated')
      return
    }

    try {
      // Get valid access token from centralized context
      const accessToken = await getValidAccessToken()
      if (!accessToken) {
        console.log('No valid access token available')
        return
      }

      // Connect to Spotify if not already connected
      if (!isConnected) {
        const connected = await connect()
        if (!connected) {
          console.log('Failed to connect to Spotify')
          return
        }
      }

      // If already playing full song, pause it
      if (isPlayingFullSong) {
        await pause()
        setIsPlayingFullSong(false)
        setIsPlaying(false)
        
        // Stop the timer
        if (fullTrackTimer) {
          clearInterval(fullTrackTimer)
          setFullTrackTimer(null)
        }
        setFullTrackStartTime(null)
        setFullTrackPlayTime(0)
        return
      }

      // Play the full track from the beginning
      const trackUri = `spotify:track:${selectedQuestion.question.spotifyTrackId}`
      const success = await playTrack(trackUri, 0)
      
      if (success) {
        setIsPlayingFullSong(true)
        setIsPlaying(false)
        console.log('Started playing full song')
        
        // Start live timer tracking
        const startTime = Date.now()
        setFullTrackStartTime(startTime)
        setFullTrackPlayTime(0)
        
        // Set up timer to update play time every 100ms
        const timer = setInterval(() => {
          // Don't update if we're currently seeking
          if (!isSeeking) {
            const elapsed = Date.now() - startTime
            setFullTrackPlayTime(elapsed)
          }
        }, 100)
        
        setFullTrackTimer(timer)
      } else {
        console.log('Failed to play full song')
      }
    } catch (error) {
      console.error('Error playing full song:', error)
    }
  }

  const togglePlay = async () => {
    if (!selectedQuestion?.question.spotifyTrackId || selectedQuestion.question.snippetStartTime === null || selectedQuestion.question.snippetEndTime === null) {
      console.log('No track ID or snippet data available')
      return
    }

    if (!isAuthenticated) {
      console.log('Not authenticated with Spotify')
      return
    }

    if (isPlaying || sdkIsPlaying) {
      // Clear the stop timer when pausing
      if (stopTimer) {
        clearTimeout(stopTimer)
        setStopTimer(null)
      }
      
      await pause()
      setIsPlaying(false)
      setIsPlayingFullSong(false)
    } else {
      // Create snippet object from database properties
      const snippet: AudioSnippet = {
        startTime: selectedQuestion.question.snippetStartTime || 0,
        endTime: selectedQuestion.question.snippetEndTime || 0,
        duration: (selectedQuestion.question.snippetEndTime || 0) - (selectedQuestion.question.snippetStartTime || 0)
      }
      
      // Create track object from database properties
      const track: SpotifyTrack = {
        id: selectedQuestion.question.spotifyTrackId,
        name: selectedQuestion.question.spotifyTrackName || '',
        artists: selectedQuestion.question.spotifyArtistNames ? JSON.parse(selectedQuestion.question.spotifyArtistNames).map((name: string) => ({ id: '', name })) : [],
        album: {
          id: '',
          name: selectedQuestion.question.spotifyAlbumName || '',
          images: selectedQuestion.question.spotifyAlbumImage ? [{ url: selectedQuestion.question.spotifyAlbumImage, width: 300, height: 300 }] : []
        },
        preview_url: selectedQuestion.question.spotifyPreviewUrl || null,
        duration_ms: selectedQuestion.question.spotifyDurationMs || 0,
        popularity: selectedQuestion.question.spotifyPopularity || 0,
        external_urls: { spotify: selectedQuestion.question.spotifyExternalUrl || '' }
      }
      
      await playAudioSnippet(track, snippet)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const seekFullTrack = async (seekTime: number) => {
    if (!isPlayingFullSong || !isConnected) return
    
    try {
      // Set seeking state to prevent timer interference
      setIsSeeking(true)
      setSeekPosition(seekTime)
      
      // Seek to the specified time
      await seek(seekTime)
      
      // Update the timer to reflect the new position
      if (fullTrackStartTime) {
        const newStartTime = Date.now() - seekTime
        setFullTrackStartTime(newStartTime)
        setFullTrackPlayTime(seekTime)
      }
      
      // Resume timer updates after a short delay
      setTimeout(() => {
        setIsSeeking(false)
        setSeekPosition(0)
      }, 100)
    } catch (error) {
      console.error('Error seeking in full track:', error)
      setIsSeeking(false)
      setSeekPosition(0)
    }
  }

  const openInSpotify = () => {
    if (selectedQuestion?.question.spotifyTrack?.external_urls?.spotify) {
      window.open(selectedQuestion.question.spotifyTrack.external_urls.spotify, '_blank')
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatBuzzTime = (ms: number) => {
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

  // Update current time from SDK
  useEffect(() => {
    setCurrentTime(position)
  }, [position])

  // Update playing state from SDK
  useEffect(() => {
    setIsPlaying(sdkIsPlaying && !isPlayingFullSong)
    
    // If SDK stops playing and we were playing full song, clean up
    if (!sdkIsPlaying && isPlayingFullSong) {
      setIsPlayingFullSong(false)
      if (fullTrackTimer) {
        clearInterval(fullTrackTimer)
        setFullTrackTimer(null)
      }
      setFullTrackStartTime(null)
      setFullTrackPlayTime(0)
    }
  }, [sdkIsPlaying, isPlayingFullSong, fullTrackTimer])

  // Send audio-started event when audio begins playing
  useEffect(() => {
    if (!socket || !selectedQuestion) return

    // Send audio-started when audio begins playing
    if ((isPlaying || isPlayingFullSong) && socket) {
      socket.emit('audio-started', {})
      console.log('Audio started event sent')
    }
  }, [socket, selectedQuestion, isPlaying, isPlayingFullSong])

  // Send initial game state when component mounts
  useEffect(() => {
    if (!socket || !gameId) return

    const initialGameState = {
      currentQuestion: selectedQuestion ? {
        category: selectedQuestion.category.name,
        points: selectedQuestion.question.points,
        songName: selectedQuestion.question.songName,
        artist: selectedQuestion.question.artist
      } : null,
      isPlaying: !!selectedQuestion,
      buzzStartTime: buzzStartTime,
      buzzOrder: buzzOrder,
      scoreboard: teams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        score: team.score,
        color: team.color
      }))
    }

    socket.emit('game-state-update', initialGameState)
    console.log('Initial game state sent:', initialGameState)
  }, [socket, gameId, teams]) // Send when socket connects or teams change

  // Send game state updates to buzzer clients
  useEffect(() => {
    if (!socket) return

    const gameStateUpdate = {
      currentQuestion: selectedQuestion ? {
        category: selectedQuestion.category.name,
        points: selectedQuestion.question.points,
        songName: selectedQuestion.question.songName,
        artist: selectedQuestion.question.artist
      } : null,
      isPlaying: !!selectedQuestion, // Question is active
      buzzStartTime: buzzStartTime,
      buzzOrder: buzzOrder,
      scoreboard: teams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        score: team.score,
        color: team.color
      }))
    }

    console.log('=== GAME BOARD: Sending game state update ===')
    console.log('Socket connected:', !!socket)
    console.log('Game state data:', gameStateUpdate)
    console.log('Teams count:', teams.length)
    console.log('Selected question:', selectedQuestion ? 'Yes' : 'No')
    socket.emit('game-state-update', gameStateUpdate)
    console.log('=== GAME BOARD: Game state update sent ===')
  }, [socket, selectedQuestion, buzzStartTime, buzzOrder, teams])

  // Enable buzzer immediately when question is selected
  useEffect(() => {
    if (!socket || !selectedQuestion) return

    // Enable buzzer immediately when question is opened
    const startTime = Date.now()
    setBuzzStartTime(startTime)
    buzzStartTimeRef.current = startTime
    
    // Send buzzer enable to all buzzer clients
    socket.emit('enable-buzzer', { startTime })
    console.log('Buzzer enabled immediately for question at:', startTime)
  }, [socket, selectedQuestion?.question.id]) // Only trigger when question ID changes

  // Cleanup timer when component unmounts or question changes
  useEffect(() => {
    return () => {
      if (stopTimer) {
        clearTimeout(stopTimer)
        setStopTimer(null)
      }
      if (fullTrackTimer) {
        clearInterval(fullTrackTimer)
        setFullTrackTimer(null)
      }
    }
  }, [stopTimer, fullTrackTimer])

  // Handle first buzz from players
  useEffect(() => {
    if (!socket) return

    const handleFirstBuzz = (data: any) => {
      console.log('First buzz received:', data)
      setFirstBuzz(data)
      setBuzzOrder(prev => [...prev, data])
    }

    const handleBuzzReceived = (data: any) => {
      console.log('Buzz received:', data)
      setBuzzOrder(prev => [...prev, data])
    }

    socket.on('first-buzz', handleFirstBuzz)
    socket.on('buzz-received', handleBuzzReceived)

    return () => {
      socket.off('first-buzz', handleFirstBuzz)
      socket.off('buzz-received', handleBuzzReceived)
    }
  }, [socket])

  const activateBuzzer = () => {
    if (!socket || !gameId) {
      console.log('Cannot activate buzzer:', { socket: !!socket, gameId })
      return
    }
    
    console.log('Activating buzzer for game:', gameId)
    setBuzzerActive(true)
    setFirstBuzz(null)
    setBuzzOrder([])
    setShowBuzzOrder(false)
    setShowBuzzFeed(false)
    setBuzzStartTime(null)
    buzzStartTimeRef.current = null
    socket.emit('activate-buzzer', gameId)
    console.log('Buzzer activated')
  }

  const deactivateBuzzer = () => {
    if (!socket || !gameId) return
    
    setBuzzerActive(false)
    socket.emit('deactivate-buzzer', gameId)
    console.log('Buzzer deactivated')
  }

  const showBuzzOrderList = () => {
    setShowBuzzOrder(true)
  }

  const resetBuzzer = () => {
    if (!socket || !gameId) return
    
    setBuzzerActive(false)
    setFirstBuzz(null)
    setBuzzOrder([])
    setShowBuzzOrder(false)
    setShowBuzzFeed(false)
    setBuzzStartTime(null)
    buzzStartTimeRef.current = null
    socket.emit('reset-buzzer', gameId)
    console.log('Buzzer reset')
  }

  const showBuzzerQRCode = async () => {
    if (!gameId) return
    
    // Dynamically determine the buzzer URL
    const getBuzzerUrl = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const port = '3000' // Next.js server port
        
        // If we're on localhost, use localhost for buzzer too
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.0.193') {
          return `http://192.168.0.193:${port}/buzzer?gameId=${gameId}`
        }
        
        // Otherwise use the same hostname as the current page
        return `http://${hostname}/buzzer?gameId=${gameId}`
      }
      
      // Fallback for server-side rendering
      return `http://192.168.0.193:3000/buzzer?gameId=${gameId}`
    }
    
    const buzzerUrl = getBuzzerUrl()
    setBuzzerQRUrl(buzzerUrl)
    
    try {
      const qrDataUrl = await QRCode.toDataURL(buzzerUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setBuzzerQRDataUrl(qrDataUrl)
    } catch (err) {
      console.error('Error generating QR code:', err)
    }
    
    setShowBuzzerQR(true)
  }

  const markQuestionAnswered = () => {
    console.log('markQuestionAnswered called with selectedQuestion:', selectedQuestion)
    if (selectedQuestion) {
      // Clear the stop timer
      if (stopTimer) {
        clearTimeout(stopTimer)
        setStopTimer(null)
      }
      
      // Stop audio
      pause()
      setIsPlaying(false)
      setIsPlayingFullSong(false)

      // Hide overlays
      setShowBuzzFeed(false)
      setShowScoreboard(false)

      console.log('Current categories before update:', categories)
      console.log('Looking for category:', selectedQuestion.category.id)
      console.log('Looking for question:', selectedQuestion.question.id)

      const updatedCategories = categories.map((category) => {
        console.log('Checking category:', category.id, 'vs', selectedQuestion.category.id)
        if (category.id === selectedQuestion.category.id) {
          console.log('Found matching category, updating questions')
          const updatedQuestions = category.questions.map((question) => {
            console.log('Checking question:', question.id, 'vs', selectedQuestion.question.id)
            if (question.id === selectedQuestion.question.id) {
              console.log('Found matching question, marking as answered')
              return { ...question, isAnswered: true }
            }
            return question
          })
          return {
            ...category,
            questions: updatedQuestions
          }
        }
        return category
      })
      
      console.log('Updated categories:', updatedCategories)
      onCategoriesChange(updatedCategories)
      setSelectedQuestion(null)
      setShowAnswer(false)
      setShowHint(false)
      setHideAnswer(false)
      setScoringMode('song')
      setIsFlipped(false)
      setSongTeamId(null)
      setArtistTeamId(null)
    } else {
      console.log('markQuestionAnswered called but no selectedQuestion')
    }
  }

  const awardPoints = (teamId: string) => {
    if (selectedQuestion) {
      let updatedTeams = [...teams]
      let pointsAwarded = 0
      let newSongTeamId = songTeamId
      let newArtistTeamId = artistTeamId
      
      // Award song points if correct and not already awarded
      if (songCorrect && songTeamId === null) {
        const songPoints = Math.floor(selectedQuestion.question.points * 0.5)
        updatedTeams = updatedTeams.map((team) =>
          team.id === teamId ? { ...team, score: team.score + songPoints } : team,
        )
        newSongTeamId = teamId
        pointsAwarded += songPoints
      }
      
      // Award artist points if correct and not already awarded
      if (artistCorrect && artistTeamId === null) {
        const artistPoints = Math.floor(selectedQuestion.question.points * 0.5)
        updatedTeams = updatedTeams.map((team) =>
          team.id === teamId ? { ...team, score: team.score + artistPoints } : team,
        )
        newArtistTeamId = teamId
        pointsAwarded += artistPoints
      }
      
      // Update teams if any points were awarded
      if (pointsAwarded > 0) {
        onTeamsChange(updatedTeams)
      }
      
      // Update the team IDs for the check
      setSongTeamId(newSongTeamId)
      setArtistTeamId(newArtistTeamId)
      
      // Check if all available points have been awarded using the NEW values
      const songAwarded = songCorrect && newSongTeamId !== null
      const artistAwarded = artistCorrect && newArtistTeamId !== null
      
      console.log('Points awarded check:', {
        songCorrect,
        artistCorrect,
        newSongTeamId,
        newArtistTeamId,
        songAwarded,
        artistAwarded,
        pointsAwarded
      })
      
      // Determine if all available points have been awarded
      let allPointsAwarded = false
      
      if (songCorrect && artistCorrect) {
        // Both song and artist are correct - need both points awarded
        allPointsAwarded = songAwarded && artistAwarded
      } else if (songCorrect && !artistCorrect) {
        // Only song is correct - need song points awarded
        allPointsAwarded = songAwarded
      } else if (!songCorrect && artistCorrect) {
        // Only artist is correct - need artist points awarded
        allPointsAwarded = artistAwarded
      } else {
        // Neither is correct - no points to award, close immediately
        allPointsAwarded = true
      }
      
      // Close question if all available points are awarded
      if (allPointsAwarded) {
        console.log('All available points awarded, closing question')
        console.log('Calling markQuestionAnswered...')
        markQuestionAnswered()
        console.log('markQuestionAnswered called successfully')
      } else {
        console.log('Not all points awarded yet, keeping question open')
        console.log('Song correct:', songCorrect, 'Artist correct:', artistCorrect)
        console.log('Song awarded:', songAwarded, 'Artist awarded:', artistAwarded)
      }
    }
  }

  const closeQuestion = () => {
    if (socket) {
      socket.emit('reset-buzzer', gameId)
    }
    setSelectedQuestion(null)
    setFirstBuzz(null)
    setBuzzOrder([])
    setBuzzStartTime(null)
    buzzStartTimeRef.current = null
    setIsPlaying(false)
    setIsPlayingFullSong(false)
    if (fullTrackTimer) {
      clearInterval(fullTrackTimer)
      setFullTrackTimer(null)
    }
    setFullTrackStartTime(null)
    setFullTrackPlayTime(0)
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 flex flex-col">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2 h-1/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Music Jeopardy</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBackToQuestions} size="sm" className="border-slate-600 text-slate-300 w-fit">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar instellen
            </Button>
            <Button 
              variant="outline" 
              onClick={showBuzzerQRCode} 
              size="sm" 
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Buzzer QR
            </Button>
            <Button 
              variant="outline" 
              onClick={testConnection} 
              size="sm" 
              className="border-green-500 text-green-400 hover:bg-green-500/10"
            >
              Test Socket
            </Button>
          </div>
        </div>
        
        {/* Team Scores - Expanded to fill space */}
        <div className="flex mr-12 items-center gap-4 flex-1 justify-end max-w-[calc(100vw-300px)] overflow-x-auto">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-4 bg-slate-800/50 px-6 py-4 rounded-lg flex-shrink-0 min-w-[200px]">
              <div className="flex flex-col items-center gap-2">
                <span className="font-semibold text-white text-lg">{team.name}</span>
                <span className="text-yellow-400 font-bold text-2xl">{team.score}</span>
              </div>
              
              {/* Player Avatars */}
              <div className="flex items-center gap-2">
                {team.players.slice(0, 3).map((player) => (
                  <div key={player.id} className="relative group">
                    <Avatar 
                      className="w-24 h-24 border-2 border-slate-600"
                      gameId={gameId}
                      playerId={player.id}
                    >
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback className="bg-slate-600 text-white text-sm">
                        {player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                {Array.isArray(team.players) && team.players.length > 3 && (
                  <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <span className="text-sm text-white font-medium">+{Array.isArray(team.players) ? team.players.length - 3 : 0}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Buzzer Status */}
        <div className="flex items-center gap-3">
          
          {firstBuzz && (
            <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg px-3 py-2">
              <p className="text-yellow-400 text-sm font-semibold">
                {firstBuzz.playerName} ({firstBuzz.teamName})
              </p>
              <p className="text-yellow-300 text-xs">buzzed in first!</p>
              <div className="flex items-center gap-2 mt-2">
                {Array.isArray(buzzOrder) && buzzOrder.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={showBuzzOrderList}
                    className="text-yellow-400 hover:text-yellow-300 text-xs"
                  >
                    Show order ({Array.isArray(buzzOrder) ? buzzOrder.length : 0} total)
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBuzzFeed(!showBuzzFeed)}
                  className={`text-xs ${
                    showBuzzFeed 
                      ? 'text-green-400 hover:text-green-300' 
                      : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  {showBuzzFeed ? 'Hide' : 'Show'} Live Feed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowScoreboard(!showScoreboard)}
                  className={`text-xs ${
                    showScoreboard 
                      ? 'text-green-400 hover:text-green-300' 
                      : 'text-purple-400 hover:text-purple-300'
                  }`}
                >
                  {showScoreboard ? 'Hide' : 'Show'} Scoreboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Board - Takes up remaining space */}
      <div className="flex-1 flex flex-col">
        {/* Category Headers */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          {categories.map((category) => (
            <div key={category.id} className="text-center bg-slate-800/50 p-2 rounded-lg">
              <h3 className="text-lg font-bold text-white truncate">{category.name}</h3>
              <Badge variant="outline" className="text-xs text-slate-300 border-slate-600 mt-1">
                {category.genre}
              </Badge>
            </div>
          ))}
        </div>

        {/* Question Grid - Takes up most of the space */}
        <div className="flex-1 grid grid-cols-5 gap-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-col gap-2">
              {category.questions
                .sort((a, b) => a.points - b.points)
                .map((question) => (
                <Button
                  key={question.id}
                  onClick={() => selectQuestion(category, question)}
                  disabled={question.isAnswered}
                  className={`flex-1 text-3xl font-bold ${
                    question.isAnswered
                      ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {question.isAnswered ? "✓" : `$${question.points}`}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Question Modal - Full screen */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="w-full h-full max-w-4xl max-h-[90vh]">
            <div className="relative w-full h-full perspective-1000">
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* Front of card - Points */}
                <Card className="absolute inset-0 bg-blue-600 border-blue-500 backface-hidden">
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-white">
                      <h2 className="text-4xl font-bold mb-4">{selectedQuestion.category.name}</h2>
                      <p className="text-8xl font-bold">${selectedQuestion.question.points}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Back of card - Question content */}
                <Card className="absolute inset-0 bg-slate-800 border-slate-700 rotate-y-180 backface-hidden">
                  <CardContent className="flex flex-col h-full p-6 transform scale-x-[-1]">
                    {/* Top Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-yellow-600 text-white text-2xl px-4 py-2">
                        ${selectedQuestion.question.points}
                      </Badge>
                      
                      <div className="flex items-center gap-3">
                        
                        {/* Close Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeQuestion}
                          className="text-slate-300 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        {/* Volume Control */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleMute}
                            className="text-slate-300 hover:text-white"
                          >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          <div className="w-20">
                            <Slider
                              value={[isMuted ? 0 : volume * 100]}
                              onValueChange={(value) => {
                                setVolume(value[0] / 100)
                                if (value[0] > 0) setIsMuted(false)
                              }}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>
                        
                        {/* Full Song Live Player */}
                        {selectedQuestion.question.spotifyTrackId && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={playFullSong}
                                disabled={!isAuthenticated || !isConnected}
                                className={`border-green-500 text-green-400 hover:bg-green-500/10 ${
                                  !isAuthenticated || !isConnected ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {isPlayingFullSong ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                <span className="ml-1 text-xs">
                                  {isPlayingFullSong ? 'Pause' : 'Volledige nummer'}
                                </span>
                              </Button>
                              
                              {isPlayingFullSong && (
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                  <span>{formatTime(isSeeking ? seekPosition : fullTrackPlayTime)}</span>
                                  <span>/</span>
                                  <span>{formatTime(selectedQuestion.question.spotifyDurationMs || 0)}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Seek Bar - Only show when playing full song */}
                            {isPlayingFullSong && (
                              <div className="space-y-1">
                                <Slider
                                  value={[isSeeking ? seekPosition : fullTrackPlayTime]}
                                  onValueChange={(value) => {
                                    // Update seek position during dragging
                                    setSeekPosition(value[0])
                                  }}
                                  onValueCommit={(value) => {
                                    // Perform actual seek when user finishes dragging
                                    seekFullTrack(value[0])
                                  }}
                                  max={selectedQuestion.question.spotifyDurationMs || 0}
                                  step={1000}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>0:00</span>
                                  <span>{formatTime(selectedQuestion.question.spotifyDurationMs || 0)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-white space-y-8">

                      {/* Play Button - Large and prominent */}
                      {selectedQuestion.question.spotifyTrackId && selectedQuestion.question.snippetStartTime !== null && selectedQuestion.question.snippetEndTime !== null && (
                        <div className="space-y-4">
                          <Button
                            size="lg"
                            onClick={togglePlay}
                            disabled={!isAuthenticated || !isConnected || !selectedQuestion.question.spotifyTrackId}
                            className={`w-24 h-24 rounded-full text-white ${
                              isAuthenticated && isConnected && selectedQuestion.question.spotifyTrackId
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                          </Button>
                          
                          <div className="text-sm text-slate-300">
                            <p>Klik om het fragment af te spelen</p>
                            <p className="text-xs">
                              {formatTime(selectedQuestion.question.snippetStartTime || 0)} - {formatTime(selectedQuestion.question.snippetEndTime || 0)}
                            </p>
                            {!isAuthenticated && (
                              <p className="text-xs text-red-400 mt-1">Niet ingelogd bij Spotify</p>
                            )}
                            {isAuthenticated && !isConnected && (
                              <p className="text-xs text-yellow-400 mt-1">Verbinden met Spotify...</p>
                            )}
                            {isAuthenticated && isConnected && (
                              <p className="text-xs text-green-400 mt-1">Verbonden met Spotify</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show message if no audio available */}
                      {(!selectedQuestion.question.spotifyTrackId || selectedQuestion.question.snippetStartTime === null || selectedQuestion.question.snippetEndTime === null) && (
                        <div className="space-y-4">
                          <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center">
                            <Music className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="text-sm text-slate-400">
                            <p>Geen audio fragment beschikbaar</p>
                            <p className="text-xs mt-1">
                              {!selectedQuestion.question.spotifyTrackId && "Geen Spotify track ID"}
                              {selectedQuestion.question.spotifyTrackId && !selectedQuestion.question.snippetStartTime && "Geen snippet start time"}
                              {selectedQuestion.question.spotifyTrackId && selectedQuestion.question.snippetStartTime !== null && !selectedQuestion.question.snippetEndTime && "No snippet end time"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Song Information Display */}
                      {showAnswer && !hideAnswer && (
                        <div className="bg-slate-800/80 border border-slate-600 rounded-lg p-6 max-w-lg">
                          <div className="flex items-center justify-between mb-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHideAnswer(true)}
                              className="text-slate-300 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-start gap-4">
                            {/* Album Thumbnail */}
                            {selectedQuestion.question.spotifyAlbumImage && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={selectedQuestion.question.spotifyAlbumImage} 
                                  alt="Album cover"
                                  className="w-20 h-20 rounded-lg object-cover shadow-lg"
                                />
                              </div>
                            )}
                            
                            {/* Song Details */}
                            <div className="flex-1 space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-sm">Nummer:</span>
                                  <span className="text-white font-semibold">{selectedQuestion.question.songName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-sm">Artiest:</span>
                                  <span className="text-white font-semibold">{selectedQuestion.question.artist}</span>
                                </div>
                                {/* {selectedQuestion.question.spotifyAlbumName && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Album:</span>
                                    <span className="text-white font-medium">{selectedQuestion.question.spotifyAlbumName}</span>
                                  </div>
                                )} */}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Hidden Song Information Indicator */}
                      {showAnswer && hideAnswer && (
                        <div className="bg-slate-600/20 border border-slate-500 rounded-lg p-4 max-w-md">
                          <div className="flex items-center justify-between">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHideAnswer(false)}
                              className="text-slate-300 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Scoring Mode Selection */}
                      {showAnswer && (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 max-w-md mx-auto">
                            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id="songCorrect"
                                  checked={songCorrect}
                                  onChange={(e) => setSongCorrect(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="songCorrect" className="text-white font-medium">
                                  Nummer naam
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-400 font-bold">
                                  +{Math.floor(selectedQuestion.question.points * 0.5)} punten
                                </span>
                                {songTeamId && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    {teams.find(t => t.id === songTeamId)?.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id="artistCorrect"
                                  checked={artistCorrect}
                                  onChange={(e) => setArtistCorrect(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="artistCorrect" className="text-white font-medium">
                                  Artiest naam
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-400 font-bold">
                                  +{Math.floor(selectedQuestion.question.points * 0.5)} punten
                                </span>
                                {artistTeamId && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    {teams.find(t => t.id === artistTeamId)?.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {(songCorrect || artistCorrect) && (
                            <div className="text-center">
                              <p className="text-sm text-slate-300">
                                Nog te verdienen: <span className="font-bold text-green-400">
                                  {(() => {
                                    let available = 0
                                    if (songCorrect && !songTeamId) available += Math.floor(selectedQuestion.question.points * 0.5)
                                    if (artistCorrect && !artistTeamId) available += Math.floor(selectedQuestion.question.points * 0.5)
                                    return available
                                  })()} punten
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex flex-wrap gap-3 justify-center mt-4">
                      {!showAnswer ? (
                        <Button onClick={() => setShowAnswer(true)} className="bg-green-600 hover:bg-green-700">
                          <Eye className="h-4 w-4 mr-2" />
                          Toon nummer informatie
                        </Button>
                      ) : (
                        <>
                          {/* Check if there are any points still available */}
                          {(() => {
                            const songAvailable = songCorrect && !songTeamId
                            const artistAvailable = artistCorrect && !artistTeamId
                            return songAvailable || artistAvailable
                          })() ? (
                            <>
                              <div className="w-full text-center mb-2">
                                <p className="text-sm text-slate-300">
                                  Nog te verdienen: <span className="font-bold text-green-400">
                                    {(() => {
                                      let available = 0
                                      if (songCorrect && !songTeamId) available += Math.floor(selectedQuestion.question.points * 0.5)
                                      if (artistCorrect && !artistTeamId) available += Math.floor(selectedQuestion.question.points * 0.5)
                                      return available
                                    })()} punten
                                  </span>
                                </p>
                              </div>
                              {teams.map((team) => (
                                <Button
                                  key={team.id}
                                  onClick={() => awardPoints(team.id)}
                                  className={`${team.color} hover:bg-${team.color}-700 text-white`}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  {team.name}
                                </Button>
                              ))}
                            </>
                          ) : (
                            <div className="w-full text-center">
                              <p className="text-sm text-slate-400">
                                {songCorrect || artistCorrect ? 'Alle punten toegekend' : 'Selecteer wat ze goed hebben geraden'}
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={closeQuestion}
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                          >
                            Sluiten
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Live Buzz Feed - Positioned absolutely off to the side */}
      {showBuzzFeed && Array.isArray(buzzOrder) && buzzOrder.length > 0 && selectedQuestion && (
        <div className="fixed top-4 right-4 w-80 max-h-[calc(100vh-2rem)] bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Live Buzz Feed
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                  {Array.isArray(buzzOrder) ? buzzOrder.length : 0} buzz{Array.isArray(buzzOrder) && buzzOrder.length !== 1 ? 'es' : ''}
                </Badge>
                {/* {selectedQuestion && (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">
                    ${selectedQuestion.question.points}
                  </Badge>
                )} */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBuzzFeed(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="space-y-1 p-2">
              {Array.isArray(buzzOrder) && buzzOrder.map((buzz, index) => (
                <div 
                  key={buzz.playerId} 
                  className={`flex items-center justify-between p-2 rounded-md transition-all duration-200 ${
                    index === 0 
                      ? 'bg-yellow-600/20 border border-yellow-500/50' 
                      : 'bg-slate-800/50 border border-slate-600/50 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {buzz.playerName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {buzz.teamName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono ${
                      index === 0 ? 'text-yellow-400' : 'text-slate-400'
                    }`}>
                      {index === 0 ? '0ms' : formatBuzzTime(buzz.timeFromPrevious)}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-yellow-600 text-white text-xs px-1 py-0">
                        FIRST
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary footer */}
          <div className="bg-slate-800 px-4 py-2 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Eerste: {firstBuzz ? formatBuzzTime(0) : 'Waiting...'}
              </span>
              <span>
                Laatste: {Array.isArray(buzzOrder) && buzzOrder.length > 1 ? formatBuzzTime(Array.isArray(buzzOrder) && buzzOrder.length > 0 ? buzzOrder[buzzOrder.length - 1]?.timeFromPrevious || 0 : 0) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Live Scoreboard - Positioned absolutely on the left side */}
      {showScoreboard && selectedQuestion && (
        <div className="fixed top-4 left-4 w-80 max-h-[calc(100vh-2rem)] bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Scorebord
              </h3> 
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                    ${selectedQuestion.question.points}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowScoreboard(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="space-y-1 p-2">
              {teams
                .sort((a, b) => b.score - a.score) // Sort by score descending
                .map((team, index) => (
                <div 
                  key={team.id} 
                  className={`flex items-center justify-between p-3 rounded-md transition-all duration-200 ${
                    index === 0 
                      ? 'bg-yellow-600/20 border border-yellow-500/50' 
                      : index === 1
                      ? 'bg-slate-700/20 border border-slate-500/50'
                      : index === 2
                      ? 'bg-orange-600/20 border border-orange-500/50'
                      : 'bg-slate-800/50 border border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : index === 1
                        ? 'bg-slate-500 text-white'
                        : index === 2
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {team.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {Array.isArray(team.players) ? team.players.length : 0} speler{Array.isArray(team.players) && team.players.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-lg font-bold ${
                      index === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                      ${team.score}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-yellow-600 text-white text-xs px-1 py-0">
                        LEIDER
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary footer */}
          <div className="bg-slate-800 px-4 py-2 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Totaal: ${Array.isArray(teams) ? teams.reduce((sum, team) => sum + team.score, 0) : 0}
              </span>
              <span>
                Teams: {Array.isArray(teams) ? teams.length : 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Buzzer QR Code Dialog */}
      <Dialog open={showBuzzerQR} onOpenChange={setShowBuzzerQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buzzer QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your phone to access the buzzer
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              {buzzerQRDataUrl ? (
                <img 
                  src={buzzerQRDataUrl} 
                  alt="Buzzer QR Code" 
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-gray-400" />
                  <p className="text-xs text-gray-500 ml-2">Loading...</p>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Or visit: <span className="font-mono text-xs break-all">{buzzerQRUrl}</span>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buzz Order Dialog */}
      <Dialog open={showBuzzOrder} onOpenChange={setShowBuzzOrder}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Buzz Order & Timing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Players who buzzed in (in order):
              </p>
              <Badge variant="outline" className="text-xs">
                {Array.isArray(buzzOrder) ? buzzOrder.length : 0} total
              </Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Array.isArray(buzzOrder) && buzzOrder.map((buzz, index) => (
                <div 
                  key={buzz.playerId} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 
                      ? 'bg-yellow-600/20 border border-yellow-500' 
                      : 'bg-slate-700/50 border border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold truncate ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {buzz.playerName}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {buzz.teamName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-mono ${
                      index === 0 ? 'text-yellow-400' : 'text-slate-400'
                    }`}>
                      {index === 0 ? '0ms' : formatBuzzTime(buzz.timeFromPrevious)}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-yellow-600 text-white text-xs">
                        FIRST
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Timing Summary */}
            {Array.isArray(buzzOrder) && buzzOrder.length > 1 && (
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                <h4 className="text-sm font-medium text-white mb-2">Timing Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">First buzz:</span>
                    <span className="text-green-400 ml-2 font-mono">{formatBuzzTime(0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Last buzz:</span>
                    <span className="text-blue-400 ml-2 font-mono">
                      {formatBuzzTime(Array.isArray(buzzOrder) && buzzOrder.length > 0 ? buzzOrder[buzzOrder.length - 1]?.timeFromPrevious || 0 : 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total time:</span>
                    <span className="text-purple-400 ml-2 font-mono">
                      {formatBuzzTime(Array.isArray(buzzOrder) && buzzOrder.length > 0 ? buzzOrder[buzzOrder.length - 1]?.timeFromStart || 0 : 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Avg gap:</span>
                    <span className="text-orange-400 ml-2 font-mono">
                      {Array.isArray(buzzOrder) && buzzOrder.length > 2
                        ? formatBuzzTime(buzzOrder.slice(1).reduce((sum, buzz) => sum + buzz.timeFromPrevious, 0) / (buzzOrder.length - 1))
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

