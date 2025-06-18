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

export interface Question {
  id: string
  categoryId: string
  points: number
  songName: string
  artist: string
  answer: string
  isAnswered: boolean
}

export interface Category {
  id: string
  name: string
  genre: string
  questions: Question[]
}

export interface GameState {
  players: Player[]
  teams: Team[]
  categories: Category[]
  currentScreen: "lobby" | "questions" | "game" | "history"
}
