import { NextRequest, NextResponse } from 'next/server'
import { translateText, translationService } from '@/lib/translation'

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()

    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLanguage, targetLanguage' },
        { status: 400 }
      )
    }

    // Validate language codes
    const validLanguages = ['en', 'nl', 'es', 'fr']
    if (!validLanguages.includes(sourceLanguage) || !validLanguages.includes(targetLanguage)) {
      return NextResponse.json(
        { error: 'Invalid language code. Supported languages: en, nl, es, fr' },
        { status: 400 }
      )
    }

    const result = await translateText(text, sourceLanguage, targetLanguage)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Translation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      translatedText: result.translatedText
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Translation API is available',
    configured: translationService.isConfigured(),
  })
} 