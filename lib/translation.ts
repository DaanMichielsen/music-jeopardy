// Translation service using DeepL API
// Sign up at: https://www.deepl.com/pro-api

const DEEPL_API_KEY = process.env.DEEPL_API_KEY
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

export interface TranslationRequest {
  text: string
  sourceLanguage: 'en' | 'nl' | 'es' | 'fr'
  targetLanguage: 'en' | 'nl' | 'es' | 'fr'
}

export interface TranslationResponse {
  success: boolean
  translatedText?: string
  error?: string
}

// DeepL language codes mapping
const DEEPL_LANGUAGE_CODES = {
  en: 'EN',
  nl: 'NL',
  es: 'ES',
  fr: 'FR'
} as const

export class TranslationService {
  private static instance: TranslationService
  private apiKey: string

  constructor() {
    this.apiKey = DEEPL_API_KEY || ''
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService()
    }
    return TranslationService.instance
  }

  async translateLyrics(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.apiKey) {
      throw new Error('DeepL API key not configured. Please set DEEPL_API_KEY environment variable.')
    }

    try {
      const sourceCode = DEEPL_LANGUAGE_CODES[request.sourceLanguage]
      const targetCode = DEEPL_LANGUAGE_CODES[request.targetLanguage]

      const response = await fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: request.text,
          source_lang: sourceCode,
          target_lang: targetCode,
          preserve_formatting: '1', // Preserve line breaks and formatting
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Translation API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (data.translations && data.translations.length > 0) {
        return {
          success: true,
          translatedText: data.translations[0].text,
        }
      }

      throw new Error('No translation received from API')
    } catch (error) {
      console.error('Translation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown translation error'
      }
    }
  }

  // Helper method to detect language and translate accordingly
  async translateLyricsAuto(text: string): Promise<TranslationResponse> {
    // First, try to detect the language
    const detectionResponse = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text.substring(0, 100), // Use first 100 chars for detection
        target_lang: 'EN', // We need a target lang for detection
      }),
    })

    if (!detectionResponse.ok) {
      throw new Error('Failed to detect language')
    }

    const detectionData = await detectionResponse.json()
    const detectedLang = detectionData.translations?.[0]?.detected_source_language

    if (!detectedLang) {
      throw new Error('Could not detect source language')
    }

    // Determine target language based on detected source
    const sourceLanguage = detectedLang.toLowerCase() as 'en' | 'nl' | 'es' | 'fr'
    const targetLanguage = sourceLanguage === 'nl' ? 'en' : sourceLanguage === 'en' ? 'nl' : sourceLanguage === 'es' ? 'fr' : 'es'

    return this.translateLyrics({
      text,
      sourceLanguage,
      targetLanguage,
    })
  }

  // Validate if the service is properly configured
  isConfigured(): boolean {
    return !!this.apiKey
  }
}

// Export singleton instance
export const translationService = TranslationService.getInstance()

export async function translateText(
  text: string,
  sourceLanguage: 'en' | 'nl' | 'es' | 'fr',
  targetLanguage: 'en' | 'nl' | 'es' | 'fr'
): Promise<TranslationResponse> {
  try {
    const apiKey = process.env.DEEPL_API_KEY
    if (!apiKey) {
      return {
        success: false,
        error: 'DeepL API key not configured'
      }
    }

    const sourceCode = DEEPL_LANGUAGE_CODES[sourceLanguage]
    const targetCode = DEEPL_LANGUAGE_CODES[targetLanguage]

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: text,
        source_lang: sourceCode,
        target_lang: targetCode,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepL API error:', errorData)
      return {
        success: false,
        error: `Translation failed: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    
    if (data.translations && data.translations.length > 0) {
      return {
        success: true,
        translatedText: data.translations[0].text
      }
    } else {
      return {
        success: false,
        error: 'No translation returned'
      }
    }
  } catch (error) {
    console.error('Translation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown translation error'
    }
  }
} 