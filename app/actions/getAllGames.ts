"use server"
import { prisma } from "@/lib/prisma"

export async function getAllGames() {
  try {
    const games = await prisma.game.findMany({
      include: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return games.map(game => ({
      id: game.id,
      createdAt: game.createdAt,
      players: game.players || [],
      teams: (game.teams || []).map(team => ({
        ...team,
        players: team.players.map(tp => tp.player)
      })),
      categories: game.categories || []
    }))
  } catch (error) {
    console.error("Failed to fetch games:", error)
    throw new Error("Failed to fetch games")
  }
} 