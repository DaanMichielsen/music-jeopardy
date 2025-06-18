"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Users, Calendar, ArrowRight } from "lucide-react"
import { getGameState, createGame } from "@/app/actions"
import { useRouter } from "next/navigation"
import { getAllGames } from "@/app/actions/getAllGames"

interface Game {
  id: string
  createdAt: Date
  players: any[]
  teams: any[]
  categories: any[]
}

export default function LobbiesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const games = await getAllGames()
      setGames(games)
    } catch (error) {
      console.error("Failed to fetch games:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewLobby = async () => {
    try {
      const newGame = await createGame()
      router.push(`/game-lobby?gameId=${newGame.id}`)
    } catch (error) {
      console.error("Failed to create game:", error)
    }
  }

  const joinLobby = (gameId: string) => {
    router.push(`/game-lobby?gameId=${gameId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading lobbies...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Music Jeopardy Lobbies</h1>
          <p className="text-slate-300">Create a new lobby or join an existing one</p>
        </div>

        {/* Create New Lobby Button */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <Button
                onClick={createNewLobby}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Lobby
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Lobbies */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Active Lobbies</h2>
          
          {games.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No active lobbies</h3>
                  <p className="text-sm">Create a new lobby to get started!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <Card key={game.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Lobby #{game.id}</h3>
                            <p className="text-sm text-slate-400">
                              Created {game.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>{game.players.length} players</span>
                          <span>{game.teams.length} teams</span>
                          <span>{game.categories.length} categories</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => joinLobby(game.id)}
                        variant="outline"
                        className="border-green-500 text-green-400 hover:bg-green-500/10"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Join Lobby
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 