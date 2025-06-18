"use server"
import { prisma } from "@/lib/prisma"

export async function removePlayerFromTeam(gameId: string, playerId: string) {
  // Find all teams in this game
  const teams = await prisma.team.findMany({
    where: {
      Game: {
        some: {
          id: gameId
        }
      }
    },
    select: { id: true }
  })
  const teamIds = teams.map(t => t.id)
  // Delete all TeamPlayer entries for this player in these teams
  await prisma.teamPlayer.deleteMany({
    where: {
      playerId,
      teamId: { in: teamIds }
    }
  })
  return true
} 