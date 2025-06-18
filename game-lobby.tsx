"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Crown, Gamepad2 } from "lucide-react"

interface Player {
  id: string
  name: string
  avatar?: string
  isReady: boolean
}

interface Team {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
}

export default function Component() {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([
    { id: "1", name: "Alex_Gamer", isReady: true },
    { id: "2", name: "Sarah_Pro", isReady: false },
    { id: "3", name: "Mike_Legend", isReady: true },
    { id: "4", name: "Emma_Striker", isReady: true },
  ])

  const [teams, setTeams] = useState<Team[]>([
    {
      id: "team1",
      name: "Red Dragons",
      maxPlayers: 4,
      players: [
        { id: "t1p1", name: "Captain_Red", isReady: true },
        { id: "t1p2", name: "Fire_Warrior", isReady: false },
      ],
    },
    {
      id: "team2",
      name: "Blue Wolves",
      maxPlayers: 4,
      players: [{ id: "t2p1", name: "Wolf_Leader", isReady: true }],
    },
  ])

  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamPlayerName, setNewTeamPlayerName] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newPlayerName.trim(),
        isReady: false,
      }
      setAvailablePlayers([...availablePlayers, newPlayer])
      setNewPlayerName("")
    }
  }

  const addTeam = () => {
    if (newTeamName.trim()) {
      const newTeam: Team = {
        id: Date.now().toString(),
        name: newTeamName.trim(),
        players: [],
        maxPlayers: 4,
      }
      setTeams([...teams, newTeam])
      setNewTeamName("")
    }
  }

  const addPlayerToTeam = (teamId: string) => {
    if (newTeamPlayerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newTeamPlayerName.trim(),
        isReady: false,
      }
      setTeams(teams.map((team) => (team.id === teamId ? { ...team, players: [...team.players, newPlayer] } : team)))
      setNewTeamPlayerName("")
    }
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split("_")
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
            <Gamepad2 className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
          </div>
          <p className="text-slate-300">Assemble your teams and get ready for battle!</p>
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
              <CardDescription className="text-slate-400">Players waiting to join teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availablePlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-blue-600 text-white">{getPlayerInitials(player.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.name}</p>
                    <Badge variant={player.isReady ? "default" : "secondary"} className="text-xs">
                      {player.isReady ? "Ready" : "Not Ready"}
                    </Badge>
                  </div>
                </div>
              ))}
              {availablePlayers.length === 0 && <p className="text-slate-400 text-center py-4">No available players</p>}
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
                <Card key={team.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          {team.name}
                          <Badge variant="outline" className="text-slate-300 border-slate-600">
                            {team.players.length}/{team.maxPlayers}
                          </Badge>
                        </CardTitle>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                            disabled={team.players.length >= team.maxPlayers}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Player
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-slate-800 border-slate-700">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-white">Add Player to {team.name}</h4>
                              <p className="text-sm text-slate-400">Enter the player name to add them to this team.</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="teamPlayerName" className="text-slate-300">
                                Player Name
                              </Label>
                              <Input
                                id="teamPlayerName"
                                placeholder="Enter player name..."
                                value={newTeamPlayerName}
                                onChange={(e) => setNewTeamPlayerName(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white"
                                onKeyDown={(e) => e.key === "Enter" && addPlayerToTeam(team.id)}
                              />
                            </div>
                            <Button
                              onClick={() => addPlayerToTeam(team.id)}
                              className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                              Add to Team
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {team.players.map((player, index) => (
                        <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-purple-600 text-white text-sm">
                              {getPlayerInitials(player.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Crown className="h-3 w-3 text-yellow-400" />}
                              <p className="font-medium text-white text-sm truncate">{player.name}</p>
                            </div>
                            <Badge variant={player.isReady ? "default" : "secondary"} className="text-xs mt-1">
                              {player.isReady ? "Ready" : "Not Ready"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {team.players.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-slate-400">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No players in this team</p>
                        </div>
                      )}
                    </div>
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
                <p className="font-medium">Ready to start the game?</p>
                <p className="text-sm text-slate-400">Make sure all players are ready before starting.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Shuffle Teams
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">Start Game</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
