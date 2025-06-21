export interface Player {
  id: string
  name: string
  avatar?: string
}

export interface Team {
  id: string
  name: string
  players: Player[]
  score: number
  color: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{
    id: string
    name: string
  }>
  album: {
    id: string
    name: string
    images: Array<{
      url: string
      width: number
      height: number
    }>
  }
  preview_url: string | null
  duration_ms: number
  popularity: number
  external_urls: {
    spotify: string
  }
}

export interface AudioSnippet {
  startTime: number // Start time in milliseconds
  endTime: number // End time in milliseconds
  duration: number // Duration in milliseconds
}

export interface Question {
  id: string
  categoryId: string
  points: number
  displayOrder?: number // Custom ordering for questions (optional until migration)
  songName: string
  artist: string
  answer: string
  isAnswered: boolean
  spotifyTrack?: SpotifyTrack
  audioSnippet?: AudioSnippet
  
  // Individual Spotify properties (from database)
  spotifyTrackId?: string | null
  spotifyTrackName?: string | null
  spotifyArtistNames?: string | null // JSON array of artist names
  spotifyAlbumName?: string | null
  spotifyAlbumImage?: string | null // URL to album image
  spotifyPreviewUrl?: string | null // URL to 30-second preview
  spotifyDurationMs?: number | null // Track duration in milliseconds
  spotifyPopularity?: number | null
  spotifyExternalUrl?: string | null // Spotify web URL

  // Audio snippet configuration (from database)
  snippetStartTime?: number | null // Start time in milliseconds
  snippetEndTime?: number | null // End time in milliseconds
  snippetDuration?: number | null // Duration in milliseconds
}

export interface Category {
  id: string
  name: string
  genre: string
  questions: Question[]
}

export interface GameHistory {
  id: string
  title: string
  date: string
  duration: string
  categories: string[]
  teams: {
    id: string
    name: string
    score: number
    players: string[]
    color: string
    position: number
  }[]
}

// New types for lyrics translation game
export interface LyricsTranslationQuestion {
  id: string
  categoryId: string
  originalLyrics: string
  translatedLyrics: string
  sourceLanguage: 'en' | 'nl' | 'es' | 'fr'
  targetLanguage: 'en' | 'nl' | 'es' | 'fr'
  songTitle?: string
  artist?: string
  points: number
  isAnswered: boolean
  hint?: string
}

export interface LyricsTranslationCategory {
  id: string
  name: string
  description?: string
  questions: LyricsTranslationQuestion[]
}

export interface GameState {
  players: Player[]
  teams: Team[]
  categories: Category[]
  lyricsCategories?: LyricsTranslationCategory[]
  currentScreen: "lobby" | "questions" | "game" | "history" | "lyrics-setup" | "lyrics-game"
  gameType: "music-trivia" | "lyrics-translation"
}
