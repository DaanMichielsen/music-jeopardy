import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create some sample games
  const game1 = await prisma.game.create({
    data: {
      title: "Geography Quiz",
      question: "What is the capital of France?",
      maxPlayers: 4,
      status: "COMPLETED",
      players: {
        create: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }],
      },
    },
    include: {
      players: true,
    },
  })

  // Add results for completed game
  await prisma.gameResult.createMany({
    data: [
      { gameId: game1.id, playerId: game1.players[0].id, score: 95, position: 1, isWinner: true },
      { gameId: game1.id, playerId: game1.players[1].id, score: 87, position: 2, isWinner: false },
      { gameId: game1.id, playerId: game1.players[2].id, score: 72, position: 3, isWinner: false },
    ],
  })

  const game2 = await prisma.game.create({
    data: {
      title: "Science Trivia",
      question: "What is the chemical symbol for gold?",
      maxPlayers: 6,
      status: "WAITING",
    },
  })

  const game3 = await prisma.game.create({
    data: {
      title: "Movie Night Quiz",
      question: 'Who directed the movie "Inception"?',
      maxPlayers: 4,
      status: "IN_PROGRESS",
      players: {
        create: [{ name: "David" }, { name: "Emma" }],
      },
    },
  })

  console.log("Database seeded successfully!")
  console.log(`Created games: ${game1.id}, ${game2.id}, ${game3.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
