import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as unknown as Profile
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (error) throw error
  return data as unknown as Profile
}

export async function setUsername(username: string) {
  const { error } = await supabase.rpc('set_username', { p_username: username })
  if (error) throw error
  await supabase.auth.updateUser({ data: { username } })
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'username' | 'bio' | 'country' | 'avatar_url'>>) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
  if (error) throw error
  return data as unknown as Profile
}

export async function getUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMatchHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('match_results')
    .select('*, match:matches(started_at, ended_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getDailyActivity(userId: string, days = 90) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}
