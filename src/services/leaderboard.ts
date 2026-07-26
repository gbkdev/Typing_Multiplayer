import { supabase } from '@/lib/supabase'

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'
export type LeaderboardMode = 'time' | 'words'

export interface LeaderboardRow {
  user_id: string
  username: string
  avatar_url: string | null
  country: string | null
  level: number
  best_wpm: number
  best_raw_wpm: number
  best_accuracy: number
  races: number
  achieved_at: string
}

export interface LeaderboardParams {
  period: LeaderboardPeriod
  mode: LeaderboardMode
  duration?: number
  wordCount?: number
  limit?: number
}

export async function fetchLeaderboard(params: LeaderboardParams): Promise<LeaderboardRow[]> {
  const { period, mode, duration, wordCount, limit = 200 } = params
  const { data, error } = await supabase.rpc('leaderboard_query', {
    p_period: period,
    p_mode: mode,
    p_duration: mode === 'time' ? (duration ?? 15) : null,
    p_word_count: mode === 'words' ? (wordCount ?? 25) : null,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as LeaderboardRow[]
}
