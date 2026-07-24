export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  country: string | null
  created_at: string
  total_races: number
  wins: number
  average_wpm: number
  highest_wpm: number
  average_accuracy: number
  xp: number
  level: number
}

export type RoomVisibility = 'public' | 'private'
export type RoomStatus = 'lobby' | 'countdown' | 'racing' | 'finished'
export type TextMode = 'words' | 'quote' | 'custom' | 'time'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface RoomSettings {
  textMode: TextMode
  duration: 15 | 30 | 60 | 120 | null
  wordCount: 10 | 25 | 50 | 100 | null
  difficulty: Difficulty
  maxPlayers: number
  countdownSeconds: number
  currentText?: string
  currentMatchId?: string
}

export interface Room {
  id: string
  host_id: string
  status: RoomStatus
  room_code: string
  visibility: RoomVisibility
  settings: RoomSettings
  created_at: string
}

export interface RoomPlayer {
  id: string
  room_id: string
  user_id: string
  progress: number
  accuracy: number
  wpm: number
  finished: boolean
  position: number | null
  ready: boolean
  joined_at: string
  profile?: Profile
}

export interface TypingText {
  id: string
  content: string
  difficulty: Difficulty
  language: string
}

export interface MatchResult {
  id: string
  match_id: string
  user_id: string
  wpm: number
  raw_wpm: number
  accuracy: number
  mistakes: number
  position: number
  xp: number
}

export interface TypingStats {
  wpm: number
  rawWpm: number
  accuracy: number
  errors: number
  correctChars: number
  incorrectChars: number
  extraChars: number
  charactersTyped: number
  elapsedSeconds: number
}

export type CharState = 'pending' | 'current' | 'correct' | 'incorrect' | 'extra'
