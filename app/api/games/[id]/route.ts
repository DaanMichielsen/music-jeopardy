import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: params.id },
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
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    return NextResponse.json(game)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch game" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, results } = await request.json()

    const updateData: any = {}
    if (status) updateData.status = status

    const game = await prisma.game.update({
      where: { id: params.id },
      data: updateData,
      include: {
        players: true,
        results: {
          include: {
            player: true,
          },
        },
      },
    })

    // If results are provided, create them
    if (results && Array.isArray(results)) {
      await prisma.gameResult.createMany({
        data: results.map((result: any) => ({
          gameId: params.id,
          playerId: result.playerId,
          score: result.score,
          position: result.position,
          isWinner: result.isWinner,
        })),
      })
    }

    return NextResponse.json(game)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 })
  }
}
