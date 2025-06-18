"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Crown, Music, Trash2, Trophy } from "lucide-react"
import type { Player, Team } from "../types/game"
import { useDragDrop } from "../hooks/use-drag-drop"

interface LobbyScreenProps {
  players: Player[]
  teams: Team[]
  onPlayersChange: (players: Player[]) => void
  onTeamsChange: (teams: Team[]) => void
  onStartQuestionSetup: () => void
  onViewHistory: () => void
}

const teamColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"]

export default function LobbyScreen({
  players,
  teams,
  onPlayersChange,
  onTeamsChange,
  onStartQuestionSetup,
  onViewHistory,
}: LobbyScreenProps) {
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")

  const { draggedItem, dragOverTarget, handleDragStart, handleDragOver, handleDragLeave, handleDrop } = useDragDrop()

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newPlayerName.trim(),
      }
      onPlayersChange([...players, newPlayer])
      setNewPlayerName("")
    }
  }

  const addTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: Date.now().toString(),
        name: newTeamName.trim(),
        players: [],
        score: 0,
        color: teamColors[teams.length % teamColors.length],
      }
      onTeamsChange([...teams, newTeam])
      setNewTeamName("")
    }
  }

  const removePlayer = (playerId: string) => {
    onPlayersChange(players.filter((p) => p.id !== playerId))
    // Also remove from teams
    const updatedTeams = teams.map((team) => ({
      ...team,
      players: team.players.filter((p) => p.id !== playerId),
    }))
    onTeamsChange(updatedTeams)
  }

  const removeTeam = (teamId: string) => {
    const teamToRemove = teams.find((t) => t.id === teamId)
    if (teamToRemove) {
      // Move players back to available players
      onPlayersChange([...players, ...teamToRemove.players])
      onTeamsChange(teams.filter((t) => t.id !== teamId))
    }
  }

  const movePlayerToTeam = (player: Player, teamId: string) => {
    // Remove player from current location
    const updatedPlayers = players.filter((p) => p.id !== player.id)
    const updatedTeams = teams.map((team) => ({
      ...team,
      players: team.players.filter((p) => p.id !== player.id),
    }))

    // Add player to new team
    const finalTeams = updatedTeams.map((team) =>
      team.id === teamId ? { ...team, players: [...team.players, player] } : team,
    )

    onPlayersChange(updatedPlayers)
    onTeamsChange(finalTeams)
  }

  const movePlayerToAvailable = (player: Player) => {
    // Remove from teams and add to available
    const updatedTeams = teams.map((team) => ({
      ...team,
      players: team.players.filter((p) => p.id !== player.id),
    }))

    onPlayersChange([...players, player])
    onTeamsChange(updatedTeams)
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(/[\s_]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Music className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Music Jeopardy Lobby</h1>
          </div>
          <p className="text-slate-300">Drag players to teams and get ready for the music challenge!</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Available Players */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-white">Available Players</CardTitle>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Player
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-slate-800 border-slate-700">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Add New Player</h4>
                        <p className="text-sm text-slate-400">Enter the player name to add them to the lobby.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="playerName" className="text-slate-300">
                          Player Name
                        </Label>
                        <Input
                          id="playerName"
                          placeholder="Enter player name..."
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                        />
                      </div>
                      <Button onClick={addPlayer} className="w-full bg-blue-600 hover:bg-blue-700">
                        Add Player
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <CardDescription className="text-slate-400">Drag players to teams</CardDescription>
            </CardHeader>
            <CardContent
              className={`space-y-3 min-h-[200px] transition-colors ${
                dragOverTarget === "available" ? "bg-slate-700/20 border-2 border-dashed border-blue-400" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, "available")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, (player) => movePlayerToAvailable(player))}
            >
              {players.map((player) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={() => handleDragStart(player)}
                  className={`flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition-colors cursor-move group ${
                    draggedItem?.id === player.id ? "opacity-50" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-blue-600 text-white">{getPlayerInitials(player.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePlayer(player.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-slate-400 text-center py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available players</p>
                  <p className="text-sm">Add players or drag them here from teams</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-400" />
                Teams
              </h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-slate-800 border-slate-700">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-white">Create New Team</h4>
                      <p className="text-sm text-slate-400">Enter a name for the new team.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamName" className="text-slate-300">
                        Team Name
                      </Label>
                      <Input
                        id="teamName"
                        placeholder="Enter team name..."
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyDown={(e) => e.key === "Enter" && addTeam()}
                      />
                    </div>
                    <Button onClick={addTeam} className="w-full bg-green-600 hover:bg-green-700">
                      Create Team
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-4">
              {teams.map((team) => (
                <Card
                  key={team.id}
                  className={`bg-slate-800/50 border-slate-700 ${
                    dragOverTarget === team.id ? "ring-2 ring-purple-400" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                        <CardTitle className="text-white flex items-center gap-2">
                          {team.name}
                          <Badge variant="outline" className="text-slate-300 border-slate-600">
                            {team.players.length} players
                          </Badge>
                        </CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTeam(team.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent
                    onDragOver={(e) => handleDragOver(e, team.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, (player) => movePlayerToTeam(player, team.id))}
                    className={`min-h-[100px] transition-colors ${
                      dragOverTarget === team.id ? "bg-slate-700/20 border-2 border-dashed border-purple-400" : ""
                    }`}
                  >
                    <div className="grid sm:grid-cols-2 gap-3">
                      {team.players.map((player, index) => (
                        <div
                          key={player.id}
                          draggable
                          onDragStart={() => handleDragStart(player)}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 cursor-move hover:bg-slate-700/50 transition-colors ${
                            draggedItem?.id === player.id ? "opacity-50" : ""
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar || "/placeholder.svg"} />
                            <AvatarFallback className={`${team.color} text-white text-sm`}>
                              {getPlayerInitials(player.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Crown className="h-3 w-3 text-yellow-400" />}
                              <p className="font-medium text-white text-sm truncate">{player.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {team.players.length === 0 && (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-600 rounded-lg">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Drop players here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-slate-300">
                <p className="font-medium">Ready to set up questions?</p>
                <p className="text-sm text-slate-400">
                  Create your music categories and questions before starting the game.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={onViewHistory}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  View History
                </Button>
                <Button
                  onClick={onStartQuestionSetup}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={teams.length === 0}
                >
                  Set Up Questions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
