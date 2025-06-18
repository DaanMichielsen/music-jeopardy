// app/actions/createPlayer.ts
"use server"
import { prisma } from "@/lib/prisma"


export async function createGame() {
  try {
    // Create the game with no initial data
    const game = await prisma.game.create({
      data: {}
    })
    return game
  } catch (error) {
    console.error("Failed to create game:", error)
    throw new Error("Failed to create game. Please try again.")
  }
}

export async function createPlayer(name: string, avatar?: string, gameId?: string) {
  try {
    const playerData: any = { name, avatar }
    
    if (gameId) {
      playerData.Game = {
        connect: { id: gameId }
      }
    }
    
    return await prisma.player.create({
      data: playerData
    })
  } catch (error) {
    console.error("Failed to create player:", error)
    throw new Error("Failed to create player")
  }
}

export async function updatePlayer(playerId: string, name: string, avatar?: string) {
  return prisma.player.update({
    where: { id: playerId },
    data: { name, avatar }
  })
}


export async function createTeam(name: string, color: string, playerIds: string[], gameId?: string) {
  try {
    const teamData: any = {
      name,
      color,
      players: {
        create: playerIds.map(playerId => ({
          player: { connect: { id: playerId } }
        }))
      }
    }
    
    if (gameId) {
      teamData.Game = {
        connect: { id: gameId }
      }
    }
    
    const team = await prisma.team.create({
      data: teamData,
      include: { players: true }
    })
    return team
  } catch (error) {
    console.error("Failed to create team:", error)
    throw new Error("Failed to create team")
  }
}

export async function updateTeam(teamId: string, name: string, color: string, playerIds: string[]) {
  try {
    // First, delete all existing team-player relationships for this team
    await prisma.teamPlayer.deleteMany({
      where: { teamId }
    })

    // Then create new relationships for the provided player IDs
    if (playerIds.length > 0) {
      await prisma.teamPlayer.createMany({
        data: playerIds.map(playerId => ({
          teamId,
          playerId
        }))
      })
    }

    // Update the team's basic info
    return await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        color
      }
    })
  } catch (error) {
    console.error("Failed to update team:", error)
    throw new Error("Failed to update team")
  }
}

export async function createCategory(name: string, genre: string, questions: any[], gameId?: string) {
  try {
    const categoryData: any = {
      name,
      genre,
      questions: {
        create: questions
      }
    }
    
    if (gameId) {
      categoryData.Game = {
        connect: { id: gameId }
      }
    }
    
    return await prisma.category.create({
      data: categoryData,
      include: { questions: true }
    })
  } catch (error) {
    console.error("Failed to create category:", error)
    throw new Error("Failed to create category")
  }
}

export async function updateTeamScore(teamId: string, score: number) {
  return prisma.team.update({
    where: { id: teamId },
    data: { score }
  })
}

export async function markQuestionAnswered(questionId: string) {
    return prisma.question.update({
      where: { id: questionId },
      data: { isAnswered: true }
    })
  }

export async function getGameState(gameId: string) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        host: true,
        players: true,
        teams: {
          include: {
            players: {
              include: {
                player: true
              }
            }
          }
        },
        categories: {
          include: {
            questions: true
          }
        }
      }
    })

    if (!game) {
      throw new Error("Game not found")
    }

    return {
      host: game.host,
      players: game.players || [],
      teams: game.teams || [],
      categories: game.categories || []
    }
  } catch (error) {
    console.error("Failed to get game state:", error)
    throw new Error("Failed to get game state")
  }
}

export async function setGameHost(gameId: string, playerId: string) {
  try {
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        hostId: playerId
      }
    })
    return game
  } catch (error) {
    console.error("Failed to set game host:", error)
    throw new Error("Failed to set game host")
  }
}