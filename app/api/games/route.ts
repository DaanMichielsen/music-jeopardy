import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      include: {
        players: true,
        _count: {
          select: { players: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(games)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, question, maxPlayers } = await request.json()

    const game = await prisma.game.create({
      data: {
        title,
        question,
        maxPlayers: maxPlayers || 4,
        status: "WAITING",
      },
      include: {
        players: true,
      },
    })

    return NextResponse.json(game)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 })
  }
}
