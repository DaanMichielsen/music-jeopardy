"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Users, ArrowRight, Lock, Globe, Trash2 } from "lucide-react"
import { createGame, getAllGames, deletePlayer, deleteGame } from "@/app/actions"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Game {
  id: string
  name: string | null
  createdAt: Date
  isPrivate: boolean
  host: {
    id: string
    name: string
    avatar: string | null
    userId: string | null
  } | null
  players: {
    id: string
    name: string
    avatar: string | null
    userId: string | null
  }[]
  teams: {
    id: string
    name: string
    color: string
    score: number
    players: {
      id: string
      name: string
      avatar: string | null
    }[]
  }[]
  categories: {
    id: string
    name: string
    genre: string
    questions: any[]
  }[]
}

export default function LobbiesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newGameName, setNewGameName] = useState("")
  const [newHostName, setNewHostName] = useState("")
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        fetchGames()
      } else {
        setLoading(false)
      }
    }
  }, [isSignedIn, isLoaded])

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
      setCreating(true)
      const newGame = await createGame(newGameName || undefined, newHostName || undefined)
      setShowCreateDialog(false)
      setNewGameName("")
      setNewHostName("")
      router.push(`/game-lobby?gameId=${newGame.id}`)
    } catch (error) {
      console.error("Failed to create game:", error)
    } finally {
      setCreating(false)
    }
  }

  const joinLobby = (gameId: string) => {
    router.push(`/game-lobby?gameId=${gameId}`)
  }

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await deletePlayer(playerId)
      await fetchGames() // Refresh the games list
    } catch (error) {
      console.error("Failed to delete player:", error)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Weet je zeker dat je deze lobby wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
      return
    }
    
    try {
      await deleteGame(gameId)
      await fetchGames() // Refresh the games list
    } catch (error) {
      console.error("Failed to delete game:", error)
      alert("Er is een fout opgetreden bij het verwijderen van de lobby.")
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
              <p className="text-slate-400 mb-6">You need to sign in to view and create lobbies.</p>
              <Button 
                onClick={() => router.push('/sign-in')}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <p className="text-slate-300">Maak een nieuwe lobby of neem deel aan een bestaande lobby</p>
        </div>

        {/* Create New Lobby Button */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={creating}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {creating ? 'Creating...' : 'Maak nieuwe lobby'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Maak nieuwe lobby</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Stel de naam van je lobby en je speler naam in.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gameName" className="text-slate-300">
                        Lobby naam (optioneel)
                      </Label>
                      <Input
                        id="gameName"
                        placeholder="Mijn muziek quiz..."
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hostName" className="text-slate-300">
                        Jouw speler naam
                      </Label>
                      <Input
                        id="hostName"
                        placeholder="Jouw naam..."
                        value={newHostName}
                        onChange={(e) => setNewHostName(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => setShowCreateDialog(false)}
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Annuleren
                      </Button>
                      <Button
                        onClick={createNewLobby}
                        disabled={creating}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {creating ? 'Creating...' : 'Maak lobby'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Existing Lobbies */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Lobbies</h2>
          
          {Array.isArray(games) && games.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center py-8 text-slate-400">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Geen lobbies gevonden</h3>
                  <p className="text-sm">Maak een nieuwe lobby om te beginnen!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games && games.map((game) => (
                <Card key={game.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              {game.name || `Lobby #${game.id.slice(0, 8)}`}
                              {game.isPrivate ? (
                                <Lock className="h-4 w-4 text-yellow-400" />
                              ) : (
                                <Globe className="h-4 w-4 text-green-400" />
                              )}
                            </h3>
                            <p className="text-sm text-slate-400">
                              Aangemaakt op {game.createdAt.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                            {game.host && (
                              <p className="text-xs text-slate-500">
                                Host: {game.host.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>{Array.isArray(game.players) ? game.players.length : 0} spelers</span>
                          <span>{Array.isArray(game.teams) ? game.teams.length : 0} teams</span>
                          <span>{Array.isArray(game.categories) ? game.categories.length : 0} categorieën</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => joinLobby(game.id)}
                          variant="outline"
                          className="border-green-500 text-green-400 hover:bg-green-500/10"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Neem deel
                        </Button>
                        <Button
                          onClick={() => handleDeleteGame(game.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Players List with Delete Buttons */}
                    {Array.isArray(game.players) && game.players.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Spelers:</h4>
                        <div className="flex flex-wrap gap-2">
                          {game.players.map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1"
                            >
                              <span className="text-sm text-white">{player.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePlayer(player.id)}
                                className="h-4 w-4 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
