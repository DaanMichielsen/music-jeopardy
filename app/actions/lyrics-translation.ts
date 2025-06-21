"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import type { LyricsTranslationCategory, LyricsTranslationQuestion } from "@/types/game"

export async function createLyricsTranslationCategory(
  name: string,
  description: string | null,
  gameId: string
): Promise<LyricsTranslationCategory> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to create categories")
    }

    const category = await prisma.lyricsTranslationCategory.create({
      data: {
        name,
        description,
        Game: {
          connect: { id: gameId }
        }
      },
      include: {
        questions: true
      }
    })

    return category as LyricsTranslationCategory
  } catch (error) {
    console.error("Failed to create lyrics translation category:", error)
    throw new Error("Failed to create category")
  }
}

export async function createLyricsTranslationQuestion(
  categoryId: string,
  originalLyrics: string,
  translatedLyrics: string,
  sourceLanguage: 'en' | 'nl' | 'es' | 'fr',
  targetLanguage: 'en' | 'nl' | 'es' | 'fr',
  songTitle: string | null,
  artist: string | null,
  points: number,
  hint: string | null
): Promise<LyricsTranslationQuestion> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to create questions")
    }

    const question = await prisma.lyricsTranslationQuestion.create({
      data: {
        categoryId,
        originalLyrics,
        translatedLyrics,
        sourceLanguage,
        targetLanguage,
        songTitle,
        artist,
        points,
        hint
      }
    })

    return question as LyricsTranslationQuestion
  } catch (error) {
    console.error("Failed to create lyrics translation question:", error)
    throw new Error("Failed to create question")
  }
}

export async function getLyricsTranslationCategories(gameId: string): Promise<LyricsTranslationCategory[]> {
  try {
    const categories = await prisma.lyricsTranslationCategory.findMany({
      where: {
        Game: {
          some: {
            id: gameId
          }
        }
      },
      include: {
        questions: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    return categories as LyricsTranslationCategory[]
  } catch (error) {
    console.error("Failed to get lyrics translation categories:", error)
    throw new Error("Failed to get categories")
  }
}

export async function getLyricsTranslationCategoriesForGame(gameId: string): Promise<LyricsTranslationCategory[]> {
  try {
    const categories = await prisma.lyricsTranslationCategory.findMany({
      where: {
        Game: {
          some: {
            id: gameId
          }
        }
      },
      include: {
        questions: {
          orderBy: {
            id: 'asc'
          },
          select: {
            id: true,
            categoryId: true,
            points: true,
            isAnswered: true,
            // Don't include songTitle, artist, lyrics, etc. to keep them hidden
          }
        }
      }
    })

    return categories as LyricsTranslationCategory[]
  } catch (error) {
    console.error("Failed to get lyrics translation categories for game:", error)
    throw new Error("Failed to get categories")
  }
}

export async function getLyricsTranslationQuestion(questionId: string): Promise<LyricsTranslationQuestion> {
  try {
    const question = await prisma.lyricsTranslationQuestion.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      throw new Error("Question not found")
    }

    return question as LyricsTranslationQuestion
  } catch (error) {
    console.error("Failed to get lyrics translation question:", error)
    throw new Error("Failed to get question")
  }
}

export async function updateLyricsTranslationQuestion(
  questionId: string,
  data: Partial<{
    originalLyrics: string
    translatedLyrics: string
    sourceLanguage: 'en' | 'nl' | 'es' | 'fr'
    targetLanguage: 'en' | 'nl' | 'es' | 'fr'
    songTitle: string | null
    artist: string | null
    points: number
    hint: string | null
    isAnswered: boolean
  }>
): Promise<LyricsTranslationQuestion> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to update questions")
    }

    const question = await prisma.lyricsTranslationQuestion.update({
      where: { id: questionId },
      data
    })

    return question as LyricsTranslationQuestion
  } catch (error) {
    console.error("Failed to update lyrics translation question:", error)
    throw new Error("Failed to update question")
  }
}

export async function deleteLyricsTranslationCategory(categoryId: string): Promise<void> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to delete categories")
    }

    // Delete all questions in the category first
    await prisma.lyricsTranslationQuestion.deleteMany({
      where: { categoryId }
    })

    // Then delete the category
    await prisma.lyricsTranslationCategory.delete({
      where: { id: categoryId }
    })
  } catch (error) {
    console.error("Failed to delete lyrics translation category:", error)
    throw new Error("Failed to delete category")
  }
}

export async function deleteLyricsTranslationQuestion(questionId: string): Promise<void> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to delete questions")
    }

    await prisma.lyricsTranslationQuestion.delete({
      where: { id: questionId }
    })
  } catch (error) {
    console.error("Failed to delete lyrics translation question:", error)
    throw new Error("Failed to delete question")
  }
}

export async function updateGameType(gameId: string, gameType: 'music-trivia' | 'lyrics-translation'): Promise<void> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to update game type")
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { gameType }
    })
  } catch (error) {
    console.error("Failed to update game type:", error)
    throw new Error("Failed to update game type")
  }
}

export async function updateGameScreen(gameId: string, currentScreen: string): Promise<void> {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error("You must be logged in to update game screen")
    }

    await prisma.game.update({
      where: { id: gameId },
      data: { currentScreen }
    })
  } catch (error) {
    console.error("Failed to update game screen:", error)
    throw new Error("Failed to update game screen")
  }
} 