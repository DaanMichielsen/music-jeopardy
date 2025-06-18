"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Calendar, Users, Music, Crown } from "lucide-react"

interface GameHistory {
  id: string
  title: string
  date: string
  teams: Array<{
    id: string
    name: string
    score: number
    players: string[]
    color: string
    position: number
  }>
  categories: string[]
  duration: string
}

interface HistoryScreenProps {
  onBackToLobby: () => void
}

export default function HistoryScreen({ onBackToLobby }: HistoryScreenProps) {
  // Mock data - in a real app this would come from a database
  const [gameHistory] = useState<GameHistory[]>([
    {
      id: "1",
      title: "Epic Music Battle",
      date: "2024-01-15",
      duration: "45 minutes",
      categories: ["90s Rock", "Pop Hits", "Classical", "Hip Hop"],
      teams: [
        {
          id: "t1",
          name: "Music Masters",
          score: 2400,
          players: ["Alex_Music", "Sarah_Singer"],
          color: "bg-yellow-500",
          position: 1,
        },
        {
          id: "t2",
          name: "Sound Warriors",
          score: 1800,
          players: ["Mike_Melody", "Emma_Echo"],
          color: "bg-blue-500",
          position: 2,
        },
        {
          id: "t3",
          name: "Beat Hunters",
          score: 1200,
          players: ["DJ_Pro", "Rhythm_King"],
          color: "bg-red-500",
          position: 3,
        },
      ],
    },
    {
      id: "2",
      title: "Retro Music Quiz",
      date: "2024-01-12",
      duration: "32 minutes",
      categories: ["80s Classics", "Disco", "New Wave"],
      teams: [
        {
          id: "t1",
          name: "Retro Rebels",
          score: 1900,
          players: ["Vintage_Vibes", "Classic_Cool"],
          color: "bg-purple-500",
          position: 1,
        },
        {
          id: "t2",
          name: "Time Travelers",
          score: 1600,
          players: ["Past_Perfect", "Nostalgia_Queen"],
          color: "bg-green-500",
          position: 2,
        },
      ],
    },
    {
      id: "3",
      title: "Modern Hits Challenge",
      date: "2024-01-10",
      duration: "38 minutes",
      categories: ["2020s Pop", "Electronic", "Indie Rock", "R&B"],
      teams: [
        {
          id: "t1",
          name: "Chart Toppers",
          score: 2100,
          players: ["Hit_Maker", "Pop_Star"],
          color: "bg-pink-500",
          position: 1,
        },
        {
          id: "t2",
          name: "Beat Droppers",
          score: 1950,
          players: ["Bass_Master", "Synth_Lord"],
          color: "bg-indigo-500",
          position: 2,
        },
        {
          id: "t3",
          name: "Melody Makers",
          score: 1400,
          players: ["Tune_Smith", "Harmony_Hero"],
          color: "bg-orange-500",
          position: 3,
        },
      ],
    },
  ])

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />
      case 3:
        return <Trophy className="h-5 w-5 text-orange-600" />
      default:
        return <Trophy className="h-5 w-5 text-gray-600" />
    }
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500"
      case 2:
        return "bg-gray-400"
      case 3:
        return "bg-orange-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToLobby} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-400" />
                Game History
              </h1>
              <p className="text-slate-300">View past games and results</p>
            </div>
          </div>
        </div>

        {/* Game History List */}
        <div className="space-y-6">
          {gameHistory.map((game) => (
            <Card key={game.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-400" />
                      {game.title}
                    </CardTitle>
                    <CardDescription className="text-slate-400 flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(game.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {game.teams.reduce((total, team) => total + team.players.length, 0)} players
                      </span>
                      <span>Duration: {game.duration}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Categories:</h4>
                  <div className="flex flex-wrap gap-2">
                    {game.categories.map((category, index) => (
                      <Badge key={index} variant="outline" className="text-slate-300 border-slate-600">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Results */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Results:</h4>
                  <div className="grid gap-3">
                    {game.teams
                      .sort((a, b) => a.position - b.position)
                      .map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionColor(
                                team.position,
                              )} text-white`}
                            >
                              {team.position}
                            </div>
                            <div className="flex items-center gap-2">
                              {getPositionIcon(team.position)}
                              <div>
                                <p className="font-medium text-white">{team.name}</p>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                                  <p className="text-sm text-slate-400">{team.players.join(", ")}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{team.score}</p>
                            <p className="text-xs text-slate-400">points</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {gameHistory.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-slate-400">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No games played yet</h3>
                <p className="text-sm">Start playing some games to see your history here!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
