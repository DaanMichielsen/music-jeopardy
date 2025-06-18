"use client"

import { useState } from "react"
import type { Player, Team, Category, GameState } from "./types/game"
import LobbyScreen from "./components/lobby-screen"
import QuestionSetup from "./components/question-setup"
import GameBoard from "./components/game-board"

export default function MusicJeopardy() {
  const [gameState, setGameState] = useState<GameState>({
    players: [
      { id: "1", name: "Alex_Music" },
      { id: "2", name: "Sarah_Singer" },
      { id: "3", name: "Mike_Melody" },
      { id: "4", name: "Emma_Echo" },
    ],
    teams: [],
    categories: [],
    currentScreen: "lobby",
  })

  const updatePlayers = (players: Player[]) => {
    setGameState((prev) => ({ ...prev, players }))
  }

  const updateTeams = (teams: Team[]) => {
    setGameState((prev) => ({ ...prev, teams }))
  }

  const updateCategories = (categories: Category[]) => {
    setGameState((prev) => ({ ...prev, categories }))
  }

  const navigateToQuestions = () => {
    setGameState((prev) => ({ ...prev, currentScreen: "questions" }))
  }

  const navigateToLobby = () => {
    setGameState((prev) => ({ ...prev, currentScreen: "lobby" }))
  }

  const startGame = () => {
    setGameState((prev) => ({ ...prev, currentScreen: "game" }))
  }

  switch (gameState.currentScreen) {
    case "lobby":
      return (
        <LobbyScreen
          players={gameState.players}
          teams={gameState.teams}
          onPlayersChange={updatePlayers}
          onTeamsChange={updateTeams}
          onStartQuestionSetup={navigateToQuestions}
        />
      )
    case "questions":
      return (
        <QuestionSetup
          categories={gameState.categories}
          onCategoriesChange={updateCategories}
          onBackToLobby={navigateToLobby}
          onStartGame={startGame}
        />
      )
    case "game":
      return (
        <GameBoard
          categories={gameState.categories}
          teams={gameState.teams}
          onCategoriesChange={updateCategories}
          onTeamsChange={updateTeams}
          onBackToQuestions={navigateToQuestions}
        />
      )
    default:
      return null
  }
}
