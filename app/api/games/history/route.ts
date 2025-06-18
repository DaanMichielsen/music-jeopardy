import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const completedGames = await prisma.game.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        players: true,
        results: {
          include: {
            player: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(completedGames)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch game history" }, { status: 500 })
  }
}
