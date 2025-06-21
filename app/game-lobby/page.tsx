"use client"

import { useState, useEffect, Suspense } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Crown, Gamepad2, ArrowLeft, Wifi, WifiOff, Music, Settings, Grip, Pencil, Trash, Languages } from "lucide-react"
import { getGameState, createPlayer, createTeam, createGame, updateTeam, setGameHost, deleteTeam } from "@/app/actions"
import { getLyricsTranslationCategories, getLyricsTranslationCategoriesForGame } from "@/app/actions/lyrics-translation"
import { Game, Player, Team } from "@prisma/client"
import { useSearchParams, useRouter } from "next/navigation"
import { useSocket } from "@/hooks/use-socket"
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from "@/lib/utils"
import QuestionSetup from "@/components/question-setup"
import GameBoard from "@/components/game-board"
import LyricsTranslationSetup from "@/components/lyrics-translation-setup"
import LyricsTranslationGame from "@/components/lyrics-translation-game"
import { SpotifySDKLoader } from "@/components/spotify-sdk-loader"
import type { Category, LyricsTranslationCategory } from "@/types/game"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@clerk/nextjs"
import { updateGameScreen } from "@/app/actions/lyrics-translation"

function DraggablePlayer({ player, children }: { player: Player, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { type: 'player', player }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600 hover:bg-slate-700/70 transition-all duration-200 group",
        isDragging && "opacity-50 scale-95 z-10"
      )}
    >
      {/* Drag indicator handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing p-1 text-slate-400 hover:text-slate-300 transition-colors flex-shrink-0"
      >
        <Grip className="h-5 w-5 text-white/50" />
      </div>
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

function DroppableHost({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'host',
    data: { type: 'host' },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200",
        isOver && "border-2 border-yellow-400 bg-yellow-500/10 shadow-lg scale-105"
      )}
    >
      {children}
    </div>
  );
}

function GameLobbyContent() {
  const searchParams = useSearchParams()
  const gameId = searchParams.get('gameId')
  const router = useRouter()
  const { userId } = useAuth()
  const [gameName, setGameName] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<(Team & { players: Player[]; maxPlayers?: number })[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState("")
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [currentScreen, setCurrentScreen] = useState<"lobby" | "questions" | "game" | "lyrics-setup" | "lyrics-game">("lobby")
  const [categories, setCategories] = useState<Category[]>([])
  const [lyricsCategories, setLyricsCategories] = useState<LyricsTranslationCategory[]>([])
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null)
  const [host, setHost] = useState<Player | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAttemptedGameCreation, setHasAttemptedGameCreation] = useState(false)
  const [gameType, setGameType] = useState<"music-trivia" | "lyrics-translation">("music-trivia")
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [gameCreated, setGameCreated] = useState(false)

  // WebSocket connection - only for avatar updates
  const { isConnected, emitAvatarUpdate, socket } = useSocket(gameId)

  const refreshGameState = async () => {
    if (!gameId) return
    
    try {
      const gameState = await getGameState(gameId)
      
      // Update host
      setHost(gameState.host)
      
      // Update players - only include players that are not in any team
      const allPlayers = gameState.players || []
      const playersInTeams = new Set<string>()
      
      gameState.teams.forEach(team => {
        team.players.forEach(teamPlayer => {
          playersInTeams.add(teamPlayer.player.id)
        })
      })
      
      const availablePlayers = allPlayers.filter(player => !playersInTeams.has(player.id))
      setPlayers(availablePlayers)
      
      // Update teams with proper player structure
      setTeams(gameState.teams.map(team => ({
        ...team,
        players: team.players.map(tp => tp.player),
        maxPlayers: 4
      })))
      
      // Update categories
      setCategories(gameState.categories || [])
      
      // Load lyrics categories
      try {
        const loadedLyricsCategories = await getLyricsTranslationCategoriesForGame(gameId)
        setLyricsCategories(loadedLyricsCategories)
      } catch (error) {
        console.error('Error loading lyrics categories:', error)
      }
    } catch (error) {
      console.error('Error refreshing game state:', error)
    }
  }

  useEffect(() => {
    async function fetchData() {
      if (gameId) {
        // Use existing game
        try {
          const state = await getGameState(gameId)
          setGameName(state.name)
          
          // Set host
          setHost(state.host)
          
          // Filter available players (those not in teams)
          const allPlayers = state.players || []
          const playersInTeams = new Set<string>()
          
          state.teams.forEach(team => {
            team.players.forEach(teamPlayer => {
              playersInTeams.add(teamPlayer.player.id)
            })
          })
          
          const availablePlayers = allPlayers.filter(player => !playersInTeams.has(player.id))
          setPlayers(availablePlayers)
          
          // Set teams with proper player structure
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
          setCategories(state.categories || [])
          
          // Load lyrics categories
          try {
            const loadedLyricsCategories = await getLyricsTranslationCategoriesForGame(gameId)
            setLyricsCategories(loadedLyricsCategories)
          } catch (error) {
            console.error('Error loading lyrics categories:', error)
          }
        } catch (error) {
          console.error('Error loading game state:', error)
          // If game doesn't exist, redirect to lobbies instead of creating new game
          router.push('/lobbies')
          return
        }
      } else if (!hasAttemptedGameCreation) {
        // Only create a new game if we haven't attempted it before
        // This prevents creating new games during auth redirects
        setHasAttemptedGameCreation(true)
        
        // Check if we're coming from an auth redirect by looking at referrer or session storage
        const isFromAuth = typeof window !== 'undefined' && (
          sessionStorage.getItem('returnToGame') ||
          document.referrer.includes('/sign-in') ||
          document.referrer.includes('/spotify-auth')
        )
        
        if (isFromAuth) {
          // If coming from auth, redirect to lobbies instead of creating new game
          console.log('Detected auth redirect, going to lobbies instead of creating new game')
          router.push('/lobbies')
          return
        }
        
        // Create new game only if this is a genuine new game request
        try {
          const newGame = await createGame()
          router.push(`/game-lobby?gameId=${newGame.id}`)
        } catch (error) {
          console.error('Error creating new game:', error)
          router.push('/lobbies')
        }
      } else {
        // If we've already attempted game creation and still no gameId, redirect to lobbies
        router.push('/lobbies')
      }
      setIsLoading(false)
    }
    fetchData()
  }, [gameId, router, hasAttemptedGameCreation])

  // WebSocket event listeners - only for avatar updates
  useEffect(() => {
    if (!socket) return

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
  }, [socket, players])

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

  // Handler for editing team name
  const handleEditTeam = async (teamId: string, newName: string) => {
    if (!gameId || !newName.trim()) return
    
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    try {
      // Update team with new name
      await updateTeam(teamId, newName.trim(), team.color, team.players.map(p => p.id))
      await refreshGameState()
      setEditingTeamId(null)
      setEditingTeamName("")
    } catch (error) {
      console.error('Error updating team name:', error)
    }
  }

  // Handler for deleting team
  const handleDeleteTeam = async (teamId: string) => {
    if (!gameId) return
    
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    try {
      // Remove team from database
      await deleteTeam(teamId)
      
      // Refresh game state to reflect changes
      await refreshGameState()
      setDeletingTeamId(null)
    } catch (error) {
      console.error('Error deleting team:', error)
    }
  }

  // Handler for confirming team deletion
  const confirmDeleteTeam = (teamId: string) => {
    setDeletingTeamId(teamId)
  }

  // Handler for canceling team deletion
  const cancelDeleteTeam = () => {
    setDeletingTeamId(null)
  }

  // Handler for starting team name edit
  const startEditTeam = (team: Team) => {
    setEditingTeamId(team.id)
    setEditingTeamName(team.name)
  }

  // Handler for canceling team name edit
  const cancelEditTeam = () => {
    setEditingTeamId(null)
    setEditingTeamName("")
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

  const goToQuestionSetup = () => {
    setCurrentScreen("questions")
  }

  const goBackToLobby = () => {
    setCurrentScreen("lobby")
  }

  const startGame = () => {
    setCurrentScreen("game")
  }

  const startLyricsTranslationSetup = () => {
    setGameType("lyrics-translation")
    setCurrentScreen("lyrics-setup")
  }

  const startLyricsTranslationGame = () => {
    setCurrentScreen("lyrics-game")
  }

  const goBackToLyricsSetup = () => {
    setCurrentScreen("lyrics-setup")
  }

  // Helper function to store return URL when going to auth
  const navigateToAuthWithReturn = (authUrl: string) => {
    if (gameId) {
      // Store the current game URL to return to after auth
      sessionStorage.setItem('returnToGame', `/game-lobby?gameId=${gameId}`)
    }
    window.location.href = authUrl
  }

  const startQuestionSetup = async () => {
    try {
      // Load categories from database
      const gameState = await getGameState(gameId!)
      setCategories(gameState.categories || [])
      setCurrentScreen("questions")
    } catch (error) {
      console.error("Failed to load game state:", error)
      // Fallback to empty categories
      setCategories([])
      setCurrentScreen("questions")
    }
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

      // Don't refresh game state here to avoid overwriting our optimistic updates
      // The optimistic update should be sufficient
      console.log('Team assignment completed successfully')
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

      // Don't refresh game state here to avoid overwriting our optimistic updates
      console.log('Player removal completed successfully')
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

      // Don't refresh game state here to avoid overwriting our optimistic updates
      console.log('Player move completed successfully')
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

  // Handler for setting game host
  const handleSetHost = async (playerId: string) => {
    if (!gameId) return
    
    const player = [...players, ...teams.flatMap(t => t.players)].find(p => p.id === playerId)
    if (!player) return

    // Optimistic update
    setHost(player)

    try {
      await setGameHost(gameId, playerId)
      console.log('Host set successfully')
    } catch (error) {
      console.error('Error setting host:', error)
      // Rollback
      setHost(null)
    }
  }

  // Handler for removing host
  const handleRemoveHost = async () => {
    if (!gameId) return

    // Optimistic update
    setHost(null)

    try {
      await setGameHost(gameId, null)
      console.log('Host removed successfully')
    } catch (error) {
      console.error('Error removing host:', error)
      // Rollback - would need to refetch host from database
    }
  }

  // If we're on question setup screen, render that component
  if (currentScreen === "questions") {
    return (
      <QuestionSetup
        gameId={gameId!}
        categories={categories}
        onCategoriesChange={setCategories}
        onBackToLobby={goBackToLobby}
        onStartGame={startGame}
      />
    )
  }

  // If we're on lyrics translation setup screen, render that component
  if (currentScreen === "lyrics-setup") {
    return (
      <LyricsTranslationSetup
        gameId={gameId || ""}
        onBackToLobby={goBackToLobby}
        onStartGame={startLyricsTranslationGame}
      />
    )
  }

  // If we're on lyrics translation game screen, render that component
  if (currentScreen === "lyrics-game") {
    return (
      <LyricsTranslationGame
        gameId={gameId || ""}
        categories={lyricsCategories}
        teams={teams.map(team => ({
          id: team.id,
          name: team.name,
          players: team.players.map(player => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar || undefined
          })),
          score: team.score,
          color: team.color || 'blue'
        }))}
        onCategoriesChange={setLyricsCategories}
        onTeamsChange={(updatedTeams) => {
          setTeams(updatedTeams.map(team => ({
            ...team,
            players: team.players.map(player => ({
              ...player,
              avatar: player.avatar || null,
              userId: null
            })),
            maxPlayers: 4
          })))
        }}
        onBackToSetup={goBackToLyricsSetup}
      />
    )
  }

  // If we're on game screen, render the game board
  if (currentScreen === "game") {
    return (
      <SpotifySDKLoader>
        <GameBoard
          gameId={gameId || undefined}
          categories={categories}
          teams={teams.map(team => ({
            id: team.id,
            name: team.name,
            players: team.players.map(player => ({
              id: player.id,
              name: player.name,
              avatar: player.avatar || undefined
            })),
            score: team.score,
            color: `bg-${team.color || 'blue'}-500`
          }))}
          onCategoriesChange={setCategories}
          onTeamsChange={(updatedTeams) => {
            setTeams(updatedTeams.map(team => ({
              ...team,
              players: team.players.map(player => ({
                ...player,
                avatar: player.avatar || null,
                userId: null
              })),
              maxPlayers: 4
            })))
          }}
          onBackToQuestions={() => setCurrentScreen("questions")}
        />
      </SpotifySDKLoader>
    )
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
          } else if (over.data.current?.type === 'host') {
            // Player is being assigned as host
            console.log('Setting player', active.id, 'as host')
            handleSetHost(active.id as string)
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
                Terug naar spellen
              </Button>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Gamepad2 className="h-8 w-8 text-purple-400" />
                  <h1 className="text-4xl font-bold text-white">{gameName}</h1>
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
                </div>
                <p className="text-slate-300">Stel teams samen om te spelen!</p>
              </div>
            </div>
            {/* <Button
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
            </Button> */}
            <Button
              onClick={() => navigateToAuthWithReturn('/spotify-auth')}
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500/10"
            >
              <Music className="h-4 w-4 mr-2" />
              Spotify
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Available Players */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-white">Beschikbare spelers</CardTitle>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/10">
                        <Plus className="h-4 w-4 mr-1" />
                        Voeg speler toe
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-slate-800 border-slate-700">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-white">Voeg nieuwe speler toe</h4>
                          <p className="text-sm text-slate-400">Voer de naam van de speler in om deze toe te voegen aan de lobby.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="playerName" className="text-slate-300">
                            Speler naam
                          </Label>
                          <Input
                            id="playerName"
                            placeholder="Voer de naam van de speler in..."
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                          />
                        </div>
                        <Button onClick={addPlayer} className="w-full bg-blue-600 hover:bg-blue-700">
                          Voeg speler toe
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <CardDescription className="text-slate-400">Spelers die wachten om teams te maken</CardDescription>
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
                  {(!players || !Array.isArray(players) || players.length === 0) && <p className="text-slate-400 text-center py-4">No available players</p>}
                </CardContent>
              </DroppableAvailablePlayers>
            </Card>

            {/* Teams */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Crown className="h-6 w-6 text-yellow-400" />
                    Teams (4)
                  </h2>
                  
                  {/* Host Section */}
                  <div className="flex items-center gap-3">
                    <DroppableHost>
                      <div className="bg-slate-800/50 rounded-lg p-3 min-w-[120px] min-h-[60px] border-2 border-dashed border-yellow-500/50 flex items-center justify-center">
                        {host ? (
                          <DraggablePlayer player={host}>
                            <div className="flex items-center gap-2">
                              <Avatar 
                                className="h-8 w-8"
                                gameId={gameId || undefined}
                                playerId={host.id}
                              >
                                <AvatarImage src={host.avatar || "/placeholder.svg"} />
                                <AvatarFallback className="bg-yellow-600 text-white text-sm">
                                  {getPlayerInitials(host.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-1">
                                <Crown className="h-3 w-3 text-yellow-400" />
                                <p className="font-medium text-white text-sm truncate">{host.name}</p>
                              </div>
                            </div>
                          </DraggablePlayer>
                        ) : (
                          <div className="text-center text-slate-400">
                            <Crown className="h-4 w-4 mx-auto mb-1" />
                            <p className="text-xs">Drop host here</p>
                          </div>
                        )}
                      </div>
                    </DroppableHost>
                    {host && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRemoveHost}
                        className="text-slate-400 hover:text-red-400"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
                      <Plus className="h-4 w-4 mr-2" />
                      Voeg team toe
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-slate-800 border-slate-700">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-white">Maak nieuw team</h4>
                        <p className="text-sm text-slate-400">Voer een naam in voor het nieuwe team.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamName" className="text-slate-300">
                          Team naam
                        </Label>
                        <Input
                          id="teamName"
                          placeholder="Voer de naam van het team in..."
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          onKeyDown={(e) => e.key === "Enter" && addTeam()}
                        />
                      </div>
                      <Button onClick={addTeam} className="w-full bg-green-600 hover:bg-green-700">
                        Maak team
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
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                          {editingTeamId === team.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingTeamName}
                                onChange={(e) => setEditingTeamName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditTeam(team.id, editingTeamName)
                                  } else if (e.key === 'Escape') {
                                    cancelEditTeam()
                                  }
                                }}
                                className="bg-slate-700 border-slate-600 text-white w-32"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTeam(team.id, editingTeamName)}
                                className="text-green-400 hover:text-green-300"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditTeam}
                                className="text-red-400 hover:text-red-300"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <CardTitle className="text-white flex items-center gap-2">
                              {team.name}
                              <Badge variant="outline" className="text-slate-300 border-slate-600">
                                {Array.isArray(team.players) ? team.players.length : 0}/{team.maxPlayers}
                              </Badge>
                            </CardTitle>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingTeamId !== team.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditTeam(team)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Pencil className="h-4 w-4 mr-2 mx-auto" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirmDeleteTeam(team.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash className="h-4 w-4 mr-2 mx-auto" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {team.players.map((player: Player) => (
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
                                <p className="font-medium text-white text-sm truncate">{player.name}</p>
                              </div>
                            </div>
                          </DraggablePlayer>
                        ))}
                        {Array.isArray(team.players) && team.players.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-slate-400">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Geen spelers in dit team</p>
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
                  <p className="font-medium">Choose your game type</p>
                  <p className="text-sm text-slate-400">Select between music trivia or lyrics translation challenges.</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={startQuestionSetup}
                    className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Music Trivia
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={startLyricsTranslationSetup}
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    Lyrics Translation
                  </Button>
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

      {/* Team Deletion Confirmation Dialog */}
      <Dialog open={deletingTeamId !== null} onOpenChange={() => setDeletingTeamId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Team verwijderen</DialogTitle>
            <DialogDescription className="text-slate-300">
              Weet je zeker dat je het team "{teams.find(t => t.id === deletingTeamId)?.name}" wilt verwijderen? 
              Alle spelers in dit team worden teruggezet naar de beschikbare spelers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={cancelDeleteTeam}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Annuleren
            </Button>
            <Button
              onClick={() => deletingTeamId && handleDeleteTeam(deletingTeamId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}

export default function GameLobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white text-xl">Spel laden...</div>}>
      <GameLobbyContent />
    </Suspense>
  );
}