import { supabase } from '@/lib/supabase'

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'

const viewByPeriod: Record<LeaderboardPeriod, 'leaderboard_daily' | 'leaderboard_weekly' | 'leaderboard_monthly' | 'leaderboard_all_time'> = {
  daily: 'leaderboard_daily',
  weekly: 'leaderboard_weekly',
  monthly: 'leaderboard_monthly',
  all_time: 'leaderboard_all_time',
}

const PAGE_SIZE = 1000

export async function fetchLeaderboard(period: LeaderboardPeriod, limit?: number) {
  const view = viewByPeriod[period]
  const orderKey = period === 'all_time' ? 'highest_wpm' : 'best_wpm'

  // If a caller wants a specific top-N slice, keep the simple single query.
  if (limit) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .order(orderKey, { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  }

  // Otherwise page through the view so every player shows up — PostgREST
  // silently caps a single unbounded request at its configured max-rows
  // (commonly 1000), so a plain `.select('*')` would quietly truncate the
  // leaderboard once the player base grows past that.
  const rows: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .order(orderKey, { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}
