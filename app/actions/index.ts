// app/actions/createPlayer.ts
"use server"
import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"

export async function createGame(name?: string, hostName?: string) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      throw new Error("You must be logged in to create a game")
    }

    // Try to create the game with new schema fields, but fall back if they don't exist yet
    let game;
    try {
      game = await prisma.game.create({
        data: {
          name: name || `Game by ${user.fullName || user.firstName || 'Host'}`,
          createdByUserId: userId,
          isPrivate: false
        }
      })
    } catch (schemaError) {
      // Fallback to creating game without new fields if they don't exist yet
      console.log("New schema fields not available yet, creating game without user link")
      game = await prisma.game.create({
        data: {}
      })
    }

    // Create a host player for the current user
    let hostPlayer;
    try {
      hostPlayer = await prisma.player.create({
        data: {
          name: hostName || user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Host',
          avatar: user.imageUrl || '',
          userId: userId, // Link player to the user account
          Game: {
            connect: { id: game.id }
          }
        }
      })
    } catch (schemaError) {
      // Fallback to creating player without userId if the field doesn't exist yet
      console.log("userId field not available yet, creating player without user link")
      hostPlayer = await prisma.player.create({
        data: {
          name: hostName || user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Host',
          avatar: user.imageUrl || '',
          Game: {
            connect: { id: game.id }
          }
        }
      })
    }

    // Update the game to set the host
    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        hostId: hostPlayer.id
      },
      include: {
        host: true,
        players: true
      }
    })

    return updatedGame
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

export async function deletePlayer(playerId: string) {
  try {
    // First remove player from all teams
    await prisma.teamPlayer.deleteMany({
      where: { playerId }
    })
    
    // Then delete the player
    return await prisma.player.delete({
      where: { id: playerId }
    })
  } catch (error) {
    console.error("Failed to delete player:", error)
    throw new Error("Failed to delete player")
  }
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
    if (Array.isArray(playerIds) && playerIds.length > 0) {
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

export async function deleteTeam(teamId: string) {
  try {
    // First, delete all team-player relationships for this team
    await prisma.teamPlayer.deleteMany({
      where: { teamId }
    })

    // Then delete the team itself
    return await prisma.team.delete({
      where: { id: teamId }
    })
  } catch (error) {
    console.error("Failed to delete team:", error)
    throw new Error("Failed to delete team")
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

export async function deleteCategory(categoryId: string) {
  try {
    // First delete all questions in the category
    await prisma.question.deleteMany({
      where: { categoryId }
    })
    
    // Then delete the category
    return await prisma.category.delete({
      where: { id: categoryId }
    })
  } catch (error) {
    console.error("Failed to delete category:", error)
    throw new Error("Failed to delete category")
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

export async function createQuestion(questionId: string, questionData: any) {
  try {
    const updateData: any = {
      songName: questionData.songName,
      artist: questionData.artist,
      answer: questionData.answer,
    }

    // Map Spotify track data to individual fields
    if (questionData.spotifyTrack) {
      const track = questionData.spotifyTrack
      updateData.spotifyTrackId = track.id
      updateData.spotifyTrackName = track.name
      updateData.spotifyArtistNames = JSON.stringify(track.artists.map((a: any) => a.name))
      updateData.spotifyAlbumName = track.album.name
      updateData.spotifyAlbumImage = track.album.images[0]?.url
      updateData.spotifyPreviewUrl = track.preview_url
      updateData.spotifyDurationMs = track.duration_ms
      updateData.spotifyPopularity = track.popularity
      updateData.spotifyExternalUrl = track.external_urls?.spotify
    }

    // Map audio snippet data
    if (questionData.audioSnippet) {
      const snippet = questionData.audioSnippet
      updateData.snippetStartTime = snippet.startTime
      updateData.snippetEndTime = snippet.endTime
      updateData.snippetDuration = snippet.duration
    }

    return await prisma.question.update({
      where: { id: questionId },
      data: updateData
    })
  } catch (error) {
    console.error("Failed to update question:", error)
    throw new Error("Failed to update question")
  }
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
      categories: game.categories || [],
      name: game.name || ''
    }
  } catch (error) {
    console.error("Failed to get game state:", error)
    throw new Error("Failed to get game state")
  }
}

export async function setGameHost(gameId: string, playerId: string | null) {
  try {
    // If playerId is empty string or null, set hostId to null (remove host)
    const hostId = playerId && playerId.trim() !== '' ? playerId : null
    
    // If we're setting a host, validate that the player exists
    if (hostId) {
      const player = await prisma.player.findUnique({
        where: { id: hostId }
      })
      
      if (!player) {
        throw new Error("Player not found")
      }
    }
    
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        hostId: hostId
      }
    })
    return game
  } catch (error) {
    console.error("Failed to set game host:", error)
    throw new Error("Failed to set game host")
  }
}

export async function updateQuestionOrder(questionId: string, newOrder: number) {
  try {
    return await prisma.question.update({
      where: { id: questionId },
      data: { displayOrder: newOrder }
    })
  } catch (error) {
    console.error("Failed to update question order:", error)
    throw new Error("Failed to update question order")
  }
}

export async function reorderQuestions(categoryId: string, questionOrders: { id: string, displayOrder: number }[]) {
  try {
    // Update all questions in the category with their new orders and corresponding points
    const updates = questionOrders.map(({ id, displayOrder }, index) => {
      const newPoints = (index + 1) * 100 // 100, 200, 300, 400, 500
      return prisma.question.update({
        where: { id },
        data: { 
          displayOrder,
          points: newPoints
        }
      })
    })
    
    await prisma.$transaction(updates)
    return true
  } catch (error) {
    console.error("Failed to reorder questions:", error)
    throw new Error("Failed to reorder questions")
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    await prisma.question.delete({
      where: { id: questionId }
    })
    return true
  } catch (error) {
    console.error("Failed to delete question:", error)
    throw new Error("Failed to delete question")
  }
}

export async function updateCategory(categoryId: string, name: string, genre: string) {
  try {
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: { name, genre }
    })
    return updatedCategory
  } catch (error) {
    console.error("Failed to update category:", error)
    throw new Error("Failed to update category")
  }
}

export async function deleteGame(gameId: string) {
  try {
    // First, get the game to check if user has permission
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to delete a game")
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      throw new Error("Game not found")
    }

    // Check if user is the creator of the game (if schema supports it)
    try {
      if (game.createdByUserId && game.createdByUserId !== userId) {
        throw new Error("You can only delete games you created")
      }
    } catch (schemaError) {
      // If createdByUserId doesn't exist yet, allow deletion (fallback)
      console.log("createdByUserId field not available, allowing deletion")
    }

    // Delete in the correct order to handle foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete all questions in all categories
      await tx.question.deleteMany({
        where: {
          category: {
            Game: {
              some: { id: gameId }
            }
          }
        }
      })

      // 2. Delete all categories
      await tx.category.deleteMany({
        where: {
          Game: {
            some: { id: gameId }
          }
        }
      })

      // 3. Delete all team-player relationships
      await tx.teamPlayer.deleteMany({
        where: {
          team: {
            Game: {
              some: { id: gameId }
            }
          }
        }
      })

      // 4. Delete all teams
      await tx.team.deleteMany({
        where: {
          Game: {
            some: { id: gameId }
          }
        }
      })

      // 5. Delete all players (this will also remove them from teams)
      await tx.player.deleteMany({
        where: {
          Game: {
            some: { id: gameId }
          }
        }
      })

      // 6. Finally, delete the game itself
      await tx.game.delete({
        where: { id: gameId }
      })
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to delete game:", error)
    throw new Error("Failed to delete game")
  }
}

export async function getAllGames() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      throw new Error("You must be logged in to view games")
    }

    // Try to use the new schema fields, but fall back to getting all games if they don't exist yet
    let games;
    try {
      games = await prisma.game.findMany({
        where: {
          OR: [
            { createdByUserId: userId }, // Games created by the current user
            { 
              players: {
                some: {
                  userId: userId // Games where the user is a player
                }
              }
            }
          ]
        },
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } catch (schemaError) {
      // Fallback to getting all games if the new fields don't exist yet
      console.log("New schema fields not available yet, falling back to all games")
      games = await prisma.game.findMany({
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }
    
    return games.map(game => ({
      id: game.id,
      name: game.name || null,
      createdAt: game.createdAt,
      isPrivate: game.isPrivate || false,
      host: game.host,
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