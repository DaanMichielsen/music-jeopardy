import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { playerName } = await request.json()

    // Check if game exists and has space
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        players: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (game.players.length >= game.maxPlayers) {
      return NextResponse.json({ error: "Game is full" }, { status: 400 })
    }

    if (game.status !== "WAITING") {
      return NextResponse.json({ error: "Game is not accepting players" }, { status: 400 })
    }

    // Check if player name is already taken
    const existingPlayer = game.players.find((p) => p.name === playerName)
    if (existingPlayer) {
      return NextResponse.json({ error: "Player name already taken" }, { status: 400 })
    }

    // Add player to game
    const player = await prisma.gamePlayer.create({
      data: {
        gameId: params.id,
        name: playerName,
      },
    })

    // Get updated game
    const updatedGame = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        players: true,
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 })
  }
}
