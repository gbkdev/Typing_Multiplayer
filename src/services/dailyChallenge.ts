import { supabase } from '@/lib/supabase'

export interface DailyChallenge {
  challenge_date: string
  text: string
  created_at: string
}

export interface DailyChallengeEntry {
  user_id: string
  username: string
  avatar_url: string | null
  wpm: number
  accuracy: number
  created_at: string
}

export async function getDailyChallenge(): Promise<DailyChallenge> {
  const { data, error } = await supabase.rpc('get_daily_challenge')
  if (error) throw error
  return data as unknown as DailyChallenge
}

export async function submitDailyChallengeResult(result: {
  wpm: number
  rawWpm: number
  accuracy: number
  mistakes: number
}) {
  const { error } = await supabase.rpc('submit_daily_challenge_result', {
    p_wpm: result.wpm,
    p_raw_wpm: result.rawWpm,
    p_accuracy: result.accuracy,
    p_mistakes: result.mistakes,
  })
  if (error) throw error
}

export async function getDailyChallengeLeaderboard(limit = 50): Promise<DailyChallengeEntry[]> {
  const { data, error } = await supabase.rpc('daily_challenge_leaderboard', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as DailyChallengeEntry[]
}
