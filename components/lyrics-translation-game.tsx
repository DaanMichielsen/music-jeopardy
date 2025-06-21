"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Music, Trophy, Eye, Award, Play, Pause, X, Zap, QrCode, Volume2, VolumeX } from "lucide-react"
import { useSpotifyPlayer } from "@/hooks/use-spotify-player"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import QRCode from "qrcode"
import type { LyricsTranslationCategory, LyricsTranslationQuestion, Team, SpotifyTrack, AudioSnippet } from "../types/game"
import { useSocket } from "@/hooks/use-socket"
import { getLyricsTranslationQuestion } from "@/app/actions/lyrics-translation"

interface LyricsTranslationGameProps {
  gameId?: string
  categories: LyricsTranslationCategory[]
  teams: Team[]
  onCategoriesChange: (categories: LyricsTranslationCategory[]) => void
  onTeamsChange: (teams: Team[]) => void
  onBackToSetup: () => void
}

export default function LyricsTranslationGame({
  gameId,
  categories,
  teams,
  onCategoriesChange,
  onTeamsChange,
  onBackToSetup,
}: LyricsTranslationGameProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: LyricsTranslationCategory; question: LyricsTranslationQuestion } | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlayingFullSong, setIsPlayingFullSong] = useState(false)
  const [stopTimer, setStopTimer] = useState<NodeJS.Timeout | null>(null)
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
  const [showLyrics, setShowLyrics] = useState(false)
  const [showTranslatedLyrics, setShowTranslatedLyrics] = useState(false)
  
  // Use ref for more reliable timing
  const buzzStartTimeRef = useRef<number | null>(null)
  
  // Get access token from localStorage
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null
  
  // Use Spotify Web Playback SDK
  const { 
    isReady, 
    isConnected, 
    connect, 
    playTrack, 
    pause, 
    currentTrack, 
    isPlaying: sdkIsPlaying,
    position,
    duration
  } = useSpotifyPlayer(accessToken)

  // WebSocket connection for buzzer functionality
  const { socket } = useSocket(gameId || null)

  const selectQuestion = async (category: LyricsTranslationCategory, question: LyricsTranslationQuestion) => {
    if (!question.isAnswered) {
      try {
        // Load the full question data including lyrics and song information
        const fullQuestion = await getLyricsTranslationQuestion(question.id)
        
        setSelectedQuestion({ category, question: fullQuestion })
        setShowAnswer(false)
        setShowHint(false)
        setShowLyrics(false)
        setShowTranslatedLyrics(false)
        setIsFlipped(false)
        setIsPlaying(false)
        setIsPlayingFullSong(false)
        setCurrentTime(0)
        
        // Reset and activate buzzer for this question
        setBuzzOrder([])
        setFirstBuzz(null)
        setShowBuzzOrder(false)
        setShowBuzzFeed(false)
        setShowScoreboard(true) // Show scoreboard when question opens
        
        // Small delay to ensure question is loaded before activating buzzer
        setTimeout(() => {
          activateBuzzer()
          // Trigger flip animation
          setTimeout(() => setIsFlipped(true), 100)
        }, 500)
      } catch (error) {
        console.error('Error loading question data:', error)
      }
    }
  }

  const playAudioSnippet = async (track: SpotifyTrack, snippet: AudioSnippet) => {
    if (!isConnected || !track.id) {
      console.log('Not connected to Spotify or no track ID')
      return
    }

    try {
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
    // Spotify functionality not available for lyrics translation questions
    console.log('Full song playback not available for lyrics translation questions')
  }

  const togglePlay = async () => {
    // Spotify functionality not available for lyrics translation questions
    console.log('Audio snippet playback not available for lyrics translation questions')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const openInSpotify = () => {
    // Spotify functionality not available for lyrics translation questions
    console.log('Spotify link not available for lyrics translation questions')
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatBuzzTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`
  }

  // Buzzer functionality
  useEffect(() => {
    if (!socket) return

    socket.on('buzz-in', (data) => {
      console.log('Buzz received:', data)
      
      if (!firstBuzz) {
        setFirstBuzz(data)
        setBuzzStartTime(Date.now())
        buzzStartTimeRef.current = Date.now()
      }
      
      setBuzzOrder(prev => [...prev, data])
      setShowBuzzFeed(true)
    })

    socket.on('buzz-reset', () => {
      console.log('Buzz reset')
      setFirstBuzz(null)
      setBuzzOrder([])
      setShowBuzzOrder(false)
      setShowBuzzFeed(false)
      setBuzzStartTime(null)
      buzzStartTimeRef.current = null
    })

    return () => {
      socket.off('buzz-in')
      socket.off('buzz-reset')
    }
  }, [socket, firstBuzz])

  const activateBuzzer = () => {
    if (socket) {
      socket.emit('activate-buzzer', { gameId })
      setBuzzerActive(true)
      console.log('Buzzer activated')
    }
  }

  const deactivateBuzzer = () => {
    if (socket) {
      socket.emit('deactivate-buzzer', { gameId })
      setBuzzerActive(false)
      console.log('Buzzer deactivated')
    }
  }

  const showBuzzOrderList = () => {
    setShowBuzzOrder(true)
  }

  const resetBuzzer = () => {
    if (socket) {
      socket.emit('reset-buzzer', { gameId })
      setFirstBuzz(null)
      setBuzzOrder([])
      setShowBuzzOrder(false)
      setShowBuzzFeed(false)
      setBuzzStartTime(null)
      buzzStartTimeRef.current = null
    }
  }

  const showBuzzerQRCode = async () => {
    const getBuzzerUrl = () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      return `${baseUrl}/buzzer?gameId=${gameId}`
    }

    const url = getBuzzerUrl()
    setBuzzerQRUrl(url)

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setBuzzerQRDataUrl(dataUrl)
      setShowBuzzerQR(true)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const markQuestionAnswered = () => {
    if (!selectedQuestion) return

    // Update the question as answered
    const updatedCategories = categories.map(category => {
      if (category.id === selectedQuestion.category.id) {
        return {
          ...category,
          questions: category.questions.map(question => 
            question.id === selectedQuestion.question.id 
              ? { ...question, isAnswered: true }
              : question
          )
        }
      }
      return category
    })

    onCategoriesChange(updatedCategories)
    closeQuestion()
  }

  const awardPoints = (teamId: string) => {
    if (!selectedQuestion) return

    // Award points to the team
    const updatedTeams = teams.map(team => 
      team.id === teamId 
        ? { ...team, score: team.score + selectedQuestion.question.points }
        : team
    )

    onTeamsChange(updatedTeams)
    markQuestionAnswered()
  }

  const closeQuestion = () => {
    setSelectedQuestion(null)
    setShowAnswer(false)
    setShowHint(false)
    setShowLyrics(false)
    setShowTranslatedLyrics(false)
    setIsFlipped(false)
    setIsPlaying(false)
    setIsPlayingFullSong(false)
    setCurrentTime(0)
    setShowScoreboard(false)
    
    // Clear stop timer
    if (stopTimer) {
      clearTimeout(stopTimer)
      setStopTimer(null)
    }
    
    // Deactivate buzzer
    deactivateBuzzer()
  }

  const totalQuestions = categories.reduce((total, category) => total + category.questions.length, 0)
  const answeredQuestions = categories.reduce((total, category) => 
    total + category.questions.filter(q => q.isAnswered).length, 0
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToSetup} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Setup
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Music className="h-6 w-6 text-purple-400" />
                Lyrics Translation Game
              </h1>
              <p className="text-slate-300 text-sm">Translate lyrics and guess the song!</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">
                {answeredQuestions}/{totalQuestions} Questions
              </span>
            </div>
            <Button onClick={showBuzzerQRCode} variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
              <QrCode className="h-4 w-4 mr-2" />
              Show Buzzer QR
            </Button>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Game Instructions */}
        <div className="mb-6 bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-2">How to Play:</h2>
          <div className="text-slate-300 text-sm space-y-1">
            <p>• Click on any question card to reveal the lyrics translation challenge</p>
            <p>• Players can buzz in using their mobile devices via the QR code</p>
            <p>• Host controls when to reveal original lyrics, translated lyrics, hints, and answers</p>
            <p>• Award points to teams who correctly identify the song</p>
          </div>
        </div>

        <div className="grid gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                  {category.description && (
                    <p className="text-slate-400 text-sm">{category.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {category.questions.map((question) => (
                    <Button
                      key={question.id}
                      onClick={() => selectQuestion(category, question)}
                      disabled={question.isAnswered}
                      className={`h-20 text-lg font-bold transition-all ${
                        question.isAnswered
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white hover:scale-105'
                      }`}
                      title={question.isAnswered ? 'Already answered' : `Click to reveal question`}
                    >
                      {question.isAnswered ? '✓' : question.points}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Question Modal */}
      {selectedQuestion && (
        <Dialog open={true} onOpenChange={closeQuestion}>
          <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-800 border-slate-700 text-white overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-bold text-white">
                  {selectedQuestion.category.name} - {selectedQuestion.question.points} Points
                </DialogTitle>
                <Button variant="ghost" onClick={closeQuestion} className="text-slate-300">
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Lyrics Display with Tabs */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
                <Tabs defaultValue="original" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-600">
                    <TabsTrigger 
                      value="original" 
                      className="text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Original Lyrics
                    </TabsTrigger>
                    <TabsTrigger 
                      value="translated" 
                      className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      Translated Lyrics
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="original" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-white">Original Lyrics</h3>
                      <Button
                        onClick={() => setShowLyrics(!showLyrics)}
                        size="sm"
                        variant="outline"
                        className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                      >
                        {showLyrics ? 'Hide' : 'Show'} Original
                      </Button>
                    </div>
                    {showLyrics && (
                      <div className="bg-slate-800 p-6 rounded-lg text-lg leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {selectedQuestion.question.originalLyrics}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="translated" className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-white">Translated Lyrics</h3>
                      <Button
                        onClick={() => setShowTranslatedLyrics(!showTranslatedLyrics)}
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      >
                        {showTranslatedLyrics ? 'Hide' : 'Show'} Translated
                      </Button>
                    </div>
                    {showTranslatedLyrics && (
                      <div className="bg-slate-800 p-6 rounded-lg text-lg leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {selectedQuestion.question.translatedLyrics}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Hint */}
              {selectedQuestion.question.hint && (
                <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-medium text-white">Hint</h3>
                    <Button
                      onClick={() => setShowHint(!showHint)}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      {showHint ? 'Hide' : 'Show'} Hint
                    </Button>
                  </div>
                  {showHint && (
                    <div className="bg-slate-800 p-6 rounded-lg text-lg leading-relaxed">
                      {selectedQuestion.question.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Answer */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-white">Answer</h3>
                  <Button
                    onClick={() => setShowAnswer(!showAnswer)}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    {showAnswer ? 'Hide' : 'Show'} Answer
                  </Button>
                </div>
                {showAnswer && (
                  <div className="bg-slate-800 p-6 rounded-lg text-lg leading-relaxed">
                    <p className="mb-2"><strong>Song:</strong> {selectedQuestion.question.songTitle}</p>
                    <p><strong>Artist:</strong> {selectedQuestion.question.artist}</p>
                  </div>
                )}
              </div>

              {/* Buzzer Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={resetBuzzer}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    Reset Buzzer
                  </Button>
                  <Button
                    onClick={showBuzzOrderList}
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    Show Buzz Order
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {teams.map((team) => (
                    <Button
                      key={team.id}
                      onClick={() => awardPoints(team.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Award {team.name} ({selectedQuestion.question.points} pts)
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Scoreboard Overlay */}
      {showScoreboard && (
        <div className="fixed top-4 right-4 bg-slate-800/90 border border-slate-600 rounded-lg p-4 min-w-64 z-50">
          <h3 className="text-lg font-semibold text-white mb-3">Scoreboard</h3>
          <div className="space-y-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between">
                <span className="text-white">{team.name}</span>
                <Badge variant="secondary" className="bg-slate-700 text-white">
                  {team.score} pts
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buzz Feed Overlay */}
      {showBuzzFeed && (
        <div className="fixed bottom-4 left-4 bg-slate-800/90 border border-slate-600 rounded-lg p-4 min-w-64 z-50">
          <h3 className="text-lg font-semibold text-white mb-3">Buzz Feed</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {buzzOrder.map((buzz, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-white">{buzz.playerName} ({buzz.teamName})</span>
                <span className="text-slate-400">
                  {buzzStartTime ? formatBuzzTime(Date.now() - buzzStartTime) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buzzer QR Code Modal */}
      <Dialog open={showBuzzerQR} onOpenChange={setShowBuzzerQR}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Buzzer QR Code</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-slate-300">Scan this QR code to access the buzzer</p>
            {buzzerQRDataUrl && (
              <img src={buzzerQRDataUrl} alt="Buzzer QR Code" className="mx-auto" />
            )}
            <p className="text-sm text-slate-400">Or visit: {buzzerQRUrl}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buzz Order Modal */}
      <Dialog open={showBuzzOrder} onOpenChange={setShowBuzzOrder}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Buzz Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {buzzOrder.map((buzz, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                <span className="text-white">
                  {index + 1}. {buzz.playerName} ({buzz.teamName})
                </span>
                <span className="text-slate-400">
                  {buzzStartTime ? formatBuzzTime(Date.now() - buzzStartTime) : ''}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 