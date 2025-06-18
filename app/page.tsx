"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, Clock, Trophy, History } from "lucide-react"

interface Game {
  id: string
  title: string
  question: string
  maxPlayers: number
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  createdAt: string
  players: Array<{
    id: string
    name: string
    joinedAt: string
  }>
  results?: Array<{
    id: string
    score: number
    position: number
    isWinner: boolean
    player: {
      id: string
      name: string
    }
  }>
  _count?: {
    players: number
  }
}

export default function GameLobby() {
  const [games, setGames] = useState<Game[]>([])
  const [gameHistory, setGameHistory] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [createGameOpen, setCreateGameOpen] = useState(false)
  const [joinGameOpen, setJoinGameOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [playerName, setPlayerName] = useState("")
  const [newGame, setNewGame] = useState({
    title: "",
    question: "",
    maxPlayers: 4,
  })

  useEffect(() => {
    fetchGames()
    fetchGameHistory()
  }, [])

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/games")
      const data = await response.json()
      setGames(data.filter((game: Game) => game.status !== "COMPLETED"))
    } catch (error) {
      console.error("Failed to fetch games:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameHistory = async () => {
    try {
      const response = await fetch("/api/games/history")
      const data = await response.json()
      setGameHistory(data)
    } catch (error) {
      console.error("Failed to fetch game history:", error)
    }
  }

  const createGame = async () => {
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newGame),
      })

      if (response.ok) {
        setCreateGameOpen(false)
        setNewGame({ title: "", question: "", maxPlayers: 4 })
        fetchGames()
      }
    } catch (error) {
      console.error("Failed to create game:", error)
    }
  }

  const joinGame = async () => {
    if (!selectedGame || !playerName.trim()) return

    try {
      const response = await fetch(`/api/games/${selectedGame.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      })

      if (response.ok) {
        setJoinGameOpen(false)
        setPlayerName("")
        setSelectedGame(null)
        fetchGames()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to join game")
      }
    } catch (error) {
      console.error("Failed to join game:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-yellow-500"
      case "IN_PROGRESS":
        return "bg-blue-500"
      case "COMPLETED":
        return "bg-green-500"
      case "CANCELLED":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "WAITING":
        return "Waiting for Players"
      case "IN_PROGRESS":
        return "In Progress"
      case "COMPLETED":
        return "Completed"
      case "CANCELLED":
        return "Cancelled"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Game Lobby</h1>
          <p className="text-gray-600">Create questions, join games, and compete with friends!</p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Games
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Game History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Active Games</h2>
              <Dialog open={createGameOpen} onOpenChange={setCreateGameOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Game
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Game</DialogTitle>
                    <DialogDescription>
                      Set up your question and game settings. Players can join once created.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Game Title</Label>
                      <Input
                        id="title"
                        value={newGame.title}
                        onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                        placeholder="Enter game title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="question">Question</Label>
                      <Textarea
                        id="question"
                        value={newGame.question}
                        onChange={(e) => setNewGame({ ...newGame, question: e.target.value })}
                        placeholder="Enter your question"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPlayers">Max Players</Label>
                      <Input
                        id="maxPlayers"
                        type="number"
                        min="2"
                        max="10"
                        value={newGame.maxPlayers}
                        onChange={(e) => setNewGame({ ...newGame, maxPlayers: Number.parseInt(e.target.value) || 4 })}
                      />
                    </div>
                    <Button onClick={createGame} className="w-full">
                      Create Game
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <Card key={game.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{game.title}</CardTitle>
                      <Badge className={getStatusColor(game.status)}>{getStatusText(game.status)}</Badge>
                    </div>
                    <CardDescription className="text-sm">{game.question}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>
                            {game.players?.length || 0}/{game.maxPlayers} players
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {game.players && game.players.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Players:</p>
                          <div className="flex flex-wrap gap-1">
                            {game.players.map((player) => (
                              <Badge key={player.id} variant="secondary" className="text-xs">
                                {player.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {game.status === "WAITING" && (
                        <Button
                          onClick={() => {
                            setSelectedGame(game)
                            setJoinGameOpen(true)
                          }}
                          className="w-full"
                          disabled={game.players.length >= game.maxPlayers}
                        >
                          {game.players.length >= game.maxPlayers ? "Game Full" : "Join Game"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {games.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No active games</h3>
                <p className="text-gray-500 mb-4">Be the first to create a game!</p>
                <Button onClick={() => setCreateGameOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Game
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Game History</h2>
              <p className="text-gray-600">View completed games and their results</p>
            </div>

            <div className="space-y-4">
              {gameHistory.map((game) => (
                <Card key={game.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{game.title}</CardTitle>
                        <CardDescription>{game.question}</CardDescription>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(game.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {game.results && game.results.length > 0 ? (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          Results
                        </h4>
                        <div className="space-y-2">
                          {game.results.map((result, index) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    result.position === 1
                                      ? "bg-yellow-500 text-white"
                                      : result.position === 2
                                        ? "bg-gray-400 text-white"
                                        : result.position === 3
                                          ? "bg-orange-600 text-white"
                                          : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  {result.position}
                                </div>
                                <div>
                                  <p className="font-medium">{result.player.name}</p>
                                  {result.isWinner && <Badge className="bg-yellow-500 text-xs">Winner</Badge>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{result.score}</p>
                                <p className="text-xs text-gray-500">points</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No results recorded</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {gameHistory.length === 0 && (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No game history</h3>
                <p className="text-gray-500">Complete some games to see the history!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Join Game Dialog */}
        <Dialog open={joinGameOpen} onOpenChange={setJoinGameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Game</DialogTitle>
              <DialogDescription>Enter your name to join "{selectedGame?.title}"</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  onKeyPress={(e) => e.key === "Enter" && joinGame()}
                />
              </div>
              <Button onClick={joinGame} className="w-full" disabled={!playerName.trim()}>
                Join Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
