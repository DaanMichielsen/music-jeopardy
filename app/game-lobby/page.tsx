"use client"

import { useState, useEffect, Suspense } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Crown, Gamepad2, ArrowLeft, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { getGameState, createPlayer, createTeam, createGame, updateTeam } from "@/app/actions"
import { Player, Team } from "@prisma/client"
import { useSearchParams, useRouter } from "next/navigation"
import { useSocket } from "@/hooks/use-socket"
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { cn } from "@/lib/utils"

function DraggablePlayer({ player, children }: { player: Player, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
    data: { type: 'player' },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition-all duration-200 cursor-move",
        isDragging && "opacity-50 border-2 border-blue-400 shadow-lg"
      )}
    >
      {children}
    </div>
  );
}

function DroppableTeam({ team, children }: { team: Team, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: team.id,
    data: { type: 'team' },
  });
  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "bg-slate-800/50 border-slate-700 transition-all duration-200",
        isOver && "border-2 border-green-400 bg-green-500/10 shadow-lg scale-105"
      )}
    >
      {children}
    </Card>
  );
}

function DroppableAvailablePlayers({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'available-players',
    data: { type: 'available-players' },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200",
        isOver && "bg-blue-500/10 border-2 border-blue-400 rounded-lg"
      )}
    >
      {children}
    </div>
  );
}

function GameLobbyContent() {
  const searchParams = useSearchParams()
  const gameIdFromUrl = searchParams.get('gameId')
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<(Team & { players: Player[]; maxPlayers?: number })[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamPlayerName, setNewTeamPlayerName] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [gameId, setGameId] = useState<string | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now())
  const [isClient, setIsClient] = useState(false)

  // WebSocket connection - only for avatar updates
  const { isConnected, emitAvatarUpdate, socket } = useSocket(gameId)

  // Drag and drop state
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null)

  // Fix hydration by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  const refreshGameState = async () => {
    if (!gameId) return
    
    try {
      console.log('=== refreshGameState START ===')
      console.log('Fetching game state for gameId:', gameId)
      
      const state = await getGameState(gameId)
      console.log('Raw state from backend:', state)
      console.log('Players from backend:', state.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })))
      console.log('Teams from backend:', state.teams.map(t => ({ 
        id: t.id, 
        name: t.name, 
        players: t.players.map(tp => ({ id: tp.player.id, name: tp.player.name }))
      })))
      
      const processedPlayers = state.players.map(p => ({
        ...p,
        avatar: p.avatar ?? null,
      }))
      
      const processedTeams = state.teams.map(team => ({
        ...team,
        players: team.players.map(tp => ({
          ...tp.player,
          avatar: tp.player.avatar ?? null,
        })),
        maxPlayers: 4,
      }))
      
      console.log('Processed players:', processedPlayers.map(p => ({ id: p.id, name: p.name })))
      console.log('Processed teams:', processedTeams.map(t => ({ id: t.id, name: t.name, players: t.players.map(p => p.id) })))
      
      setPlayers(processedPlayers)
      setTeams(processedTeams)
      setLastRefreshTime(Date.now())
      
      console.log('State updated successfully')
      console.log('=== refreshGameState END ===')
    } catch (error) {
      console.error("Failed to refresh game state:", error)
    }
  }

  useEffect(() => {
    async function fetchData() {
      if (gameIdFromUrl) {
        // Use existing game
        setGameId(gameIdFromUrl)
        const state = await getGameState(gameIdFromUrl)
        setPlayers(
          state.players.map(p => ({
            ...p,
            avatar: p.avatar ?? null,
          }))
        )
        setTeams(
          state.teams.map(team => ({
            ...team,
            players: team.players.map(tp => ({
              ...tp.player,
              avatar: tp.player.avatar ?? null,
            })),
            maxPlayers: 4,
          }))
        )
      } else {
        // Create new game (fallback)
        const game = await createGame()
        setGameId(game.id)
        const state = await getGameState(game.id)
        setPlayers(
          state.players.map(p => ({
            ...p,
            avatar: p.avatar ?? null,
          }))
        )
        setTeams(
          state.teams.map(team => ({
            ...team,
            players: team.players.map(tp => ({
              ...tp.player,
              avatar: tp.player.avatar ?? null,
            })),
            maxPlayers: 4,
          }))
        )
      }
    }
    fetchData()
  }, [gameIdFromUrl])

  // WebSocket event listeners - only for avatar updates
  useEffect(() => {
    if (!socket || !isClient) return

    console.log('Setting up WebSocket event listeners...')

    // Listen for avatar updates only
    socket.on('avatar-updated', (data: { playerId: string, avatarUrl: string }) => {
      console.log('Avatar updated via WebSocket:', data)
      console.log('Current players before update:', players)
      
      setPlayers(prev => {
        const updated = prev.map(player => 
          player.id === data.playerId 
            ? { ...player, avatar: data.avatarUrl }
            : player
        )
        console.log('Players after update:', updated)
        return updated
      })
      
      setTeams(prev => {
        const updated = prev.map(team => ({
          ...team,
          players: team.players.map(player => 
            player.id === data.playerId 
              ? { ...player, avatar: data.avatarUrl }
              : player
          )
        }))
        console.log('Teams after update:', updated)
        return updated
      })
    })

    return () => {
      console.log('Cleaning up WebSocket event listeners...')
      socket.off('avatar-updated')
    }
  }, [socket, players, isClient])

  const addPlayer = async () => {
    if (newPlayerName.trim() && gameId) {
      await createPlayer(newPlayerName.trim(), undefined, gameId)
      await refreshGameState()
      setNewPlayerName("")
    }
  }

  const addTeam = async () => {
    if (newTeamName.trim() && gameId) {
      await createTeam(newTeamName.trim(), "bg-red-500", [], gameId)
      await refreshGameState()
      setNewTeamName("")
    }
  }

  const addPlayerToTeam = (teamId: string) => {
    if (newTeamPlayerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: newTeamPlayerName.trim(),
        avatar: null,
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

  const goBackToLobbies = () => {
    router.push('/lobbies')
  }

  // Handler for assigning a player to a team
  const handleAssignPlayerToTeam = async (playerId: string, teamId: string) => {
    console.log('=== handleAssignPlayerToTeam START ===')
    console.log('Parameters:', { playerId, teamId })
    console.log('Current players state:', players.map(p => ({ id: p.id, name: p.name })))
    console.log('Current teams state:', teams.map(t => ({ id: t.id, name: t.name, players: t.players.map(p => p.id) })))
    
    // Find the team and player
    const team = teams.find((t) => t.id === teamId);
    const player = players.find((p) => p.id === playerId);
    
    if (!team) {
      console.error('Team not found:', teamId)
      return;
    }
    
    if (!player) {
      console.error('Player not found:', playerId)
      return;
    }

    console.log('Found team:', { id: team.id, name: team.name, currentPlayers: team.players.map(p => p.id) })
    console.log('Found player:', { id: player.id, name: player.name })

    // OPTIMISTIC UPDATE: Update local state immediately
    console.log('Applying optimistic update...')
    setTeams(prevTeams => {
      const updated = prevTeams.map(t => 
        t.id === teamId 
          ? { ...t, players: [...t.players, player] }
          : t
      )
      console.log('Teams after optimistic update:', updated.map(t => ({ id: t.id, name: t.name, players: t.players.map(p => p.id) })))
      return updated
    })
    
    // Remove player from available players list
    setPlayers(prevPlayers => {
      const updated = prevPlayers.filter(p => p.id !== playerId)
      console.log('Players after optimistic update:', updated.map(p => ({ id: p.id, name: p.name })))
      return updated
    })

    try {
      // Call the backend to update the team
      const newPlayerIds = [...team.players.map((p) => p.id), playerId];
      console.log('Calling updateTeam with player IDs:', newPlayerIds)
      
      const result = await updateTeam(teamId, team.name, team.color, newPlayerIds);
      console.log('updateTeam result:', result)

      // Refresh the game state from the backend to ensure consistency
      console.log('Calling refreshGameState...')
      await refreshGameState();
      console.log('Game state refreshed successfully')
    } catch (error) {
      console.error('Error in handleAssignPlayerToTeam:', error)
      
      // ROLLBACK: If the backend call fails, revert the optimistic update
      console.log('Rolling back optimistic update...')
      setTeams(prevTeams => 
        prevTeams.map(t => 
          t.id === teamId 
            ? { ...t, players: t.players.filter(p => p.id !== playerId) }
            : t
        )
      )
      
      // Add player back to available players list
      setPlayers(prevPlayers => [...prevPlayers, player])
      console.log('Rollback completed')
    }
    
    console.log('=== handleAssignPlayerToTeam END ===')
  }

  // Handler for removing a player from a team
  const handleRemovePlayerFromTeam = async (playerId: string, teamId: string) => {
    console.log('handleRemovePlayerFromTeam called with:', { playerId, teamId })
    
    const team = teams.find((t) => t.id === teamId);
    const player = team?.players.find((p) => p.id === playerId);
    
    if (!team || !player) {
      console.error('Team or player not found:', { teamId, playerId })
      return;
    }

    // OPTIMISTIC UPDATE: Remove player from team immediately
    setTeams(prevTeams => 
      prevTeams.map(t => 
        t.id === teamId 
          ? { ...t, players: t.players.filter(p => p.id !== playerId) }
          : t
      )
    )
    
    // Add player back to available players list
    setPlayers(prevPlayers => [...prevPlayers, player])

    try {
      // Call the backend to update the team
      const newPlayerIds = team.players.filter(p => p.id !== playerId).map(p => p.id);
      console.log('New player IDs after removal:', newPlayerIds)
      
      await updateTeam(teamId, team.name, team.color, newPlayerIds);
      console.log('Team updated successfully after removal')

      // Refresh the game state from the backend to ensure consistency
      await refreshGameState();
      console.log('Game state refreshed after removal')
    } catch (error) {
      console.error('Error updating team after removal:', error)
      
      // ROLLBACK: If the backend call fails, revert the optimistic update
      setTeams(prevTeams => 
        prevTeams.map(t => 
          t.id === teamId 
            ? { ...t, players: [...t.players, player] }
            : t
        )
      )
      
      // Remove player from available players list
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId))
    }
  }

  // Handler for moving a player from one team to another
  const handleMovePlayerBetweenTeams = async (playerId: string, fromTeamId: string, toTeamId: string) => {
    console.log('handleMovePlayerBetweenTeams called with:', { playerId, fromTeamId, toTeamId })
    
    const fromTeam = teams.find((t) => t.id === fromTeamId);
    const toTeam = teams.find((t) => t.id === toTeamId);
    const player = fromTeam?.players.find((p) => p.id === playerId);
    
    if (!fromTeam || !toTeam || !player) {
      console.error('Team or player not found:', { fromTeamId, toTeamId, playerId })
      return;
    }

    // OPTIMISTIC UPDATE: Move player immediately
    setTeams(prevTeams => 
      prevTeams.map(t => {
        if (t.id === fromTeamId) {
          return { ...t, players: t.players.filter(p => p.id !== playerId) }
        }
        if (t.id === toTeamId) {
          return { ...t, players: [...t.players, player] }
        }
        return t
      })
    )

    try {
      // Update both teams in the backend
      const fromTeamNewPlayerIds = fromTeam.players.filter(p => p.id !== playerId).map(p => p.id);
      const toTeamNewPlayerIds = [...toTeam.players.map(p => p.id), playerId];
      
      console.log('Updating teams:', { 
        fromTeam: { id: fromTeamId, newPlayerIds: fromTeamNewPlayerIds },
        toTeam: { id: toTeamId, newPlayerIds: toTeamNewPlayerIds }
      })
      
      await Promise.all([
        updateTeam(fromTeamId, fromTeam.name, fromTeam.color, fromTeamNewPlayerIds),
        updateTeam(toTeamId, toTeam.name, toTeam.color, toTeamNewPlayerIds)
      ]);
      
      console.log('Teams updated successfully')

      // Refresh the game state from the backend to ensure consistency
      await refreshGameState();
      console.log('Game state refreshed')
    } catch (error) {
      console.error('Error updating teams:', error)
      
      // ROLLBACK: If the backend call fails, revert the optimistic update
      setTeams(prevTeams => 
        prevTeams.map(t => {
          if (t.id === fromTeamId) {
            return { ...t, players: [...t.players, player] }
          }
          if (t.id === toTeamId) {
            return { ...t, players: t.players.filter(p => p.id !== playerId) }
          }
          return t
        })
      )
    }
  }

  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        console.log('Drag end:', { active, over })
        if (active && over && active.id && over.id && active.data.current?.type === 'player') {
          if (over.data.current?.type === 'team') {
            // Check if player is already in a team
            const currentTeam = teams.find(team => 
              team.players.some(player => player.id === active.id)
            )
            
            if (currentTeam && currentTeam.id === over.id) {
              console.log('Player already in this team')
              return
            }
            
            if (currentTeam) {
              // Player is moving from one team to another
              console.log('Moving player', active.id, 'from team', currentTeam.id, 'to team', over.id)
              handleMovePlayerBetweenTeams(active.id as string, currentTeam.id, over.id as string)
            } else {
              // Player is moving from available players to a team
              console.log('Assigning player', active.id, 'to team', over.id)
              handleAssignPlayerToTeam(active.id as string, over.id as string)
            }
          } else if (over.data.current?.type === 'available-players') {
            // Find which team the player is currently in
            const currentTeam = teams.find(team => 
              team.players.some(player => player.id === active.id)
            )
            if (currentTeam) {
              console.log('Removing player', active.id, 'from team', currentTeam.id)
              handleRemovePlayerFromTeam(active.id as string, currentTeam.id)
            }
          }
        }
        setDraggedPlayerId(null)
      }}
      onDragStart={({ active }) => {
        console.log('Drag start:', active.id)
        setDraggedPlayerId(active.id as string)
      }}
      onDragCancel={() => setDraggedPlayerId(null)}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={goBackToLobbies}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lobbies
              </Button>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Gamepad2 className="h-8 w-8 text-purple-400" />
                  <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
                  {isClient && (
                    <div className="flex items-center gap-2 ml-4">
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-green-400" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {isConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-slate-300">Assemble your teams and get ready for battle!</p>
              </div>
            </div>
            <Button
              onClick={refreshGameState}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={!gameId}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
              {isClient && lastRefreshTime && (
                <span className="ml-2 text-xs opacity-70">
                  {new Date(lastRefreshTime).toLocaleTimeString()}
                </span>
              )}
            </Button>
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
              <DroppableAvailablePlayers>
                <CardContent className="space-y-3">
                  {players.map((player) => (
                    <DraggablePlayer key={player.id} player={player}>
                      <Avatar 
                        className="h-10 w-10"
                        gameId={gameId || undefined}
                        playerId={player.id}
                      >
                        <AvatarImage src={player.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-blue-600 text-white">{getPlayerInitials(player.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-white">{player.name}</p>
                      </div>
                    </DraggablePlayer>
                  ))}
                  {!players || (players && players.length === 0) && <p className="text-slate-400 text-center py-4">No available players</p>}
                </CardContent>
              </DroppableAvailablePlayers>
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
                  <DroppableTeam key={team.id} team={team}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            {team.name}
                            <Badge variant="outline" className="text-slate-300 border-slate-600">
                              {team.players && team.players.length}/{team.maxPlayers}
                            </Badge>
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {team.players.map((player: Player, index: number) => (
                          <DraggablePlayer key={player.id} player={player}>
                            <Avatar 
                              className="h-8 w-8"
                              gameId={gameId || undefined}
                              playerId={player.id}
                            >
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
                            </div>
                          </DraggablePlayer>
                        ))}
                        {team.players.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-slate-400">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No players in this team</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </DroppableTeam>
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

      {/* Drag Overlay for smooth animations */}
      <DragOverlay>
        {draggedPlayerId ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/90 border-2 border-blue-400 shadow-lg transform rotate-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={players.find(p => p.id === draggedPlayerId)?.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-blue-600 text-white">
                {getPlayerInitials(players.find(p => p.id === draggedPlayerId)?.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-white">{players.find(p => p.id === draggedPlayerId)?.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default function GameLobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white text-xl">Loading game lobby...</div>}>
      <GameLobbyContent />
    </Suspense>
  );
} 