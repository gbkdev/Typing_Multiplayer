import { supabase } from '@/lib/supabase'

export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'cheating' | 'other'

export interface BlockedUser {
  id: string
  blocked_id: string
  created_at: string
  blocked: { id: string; username: string } | null
}

export async function blockUser(blockedId: string) {
  const { data: userData } = await supabase.auth.getUser()
  const blockerId = userData.user?.id
  if (!blockerId) throw new Error('Not signed in.')

  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId })
  if (error) throw error
}

export async function unblockUser(blockedId: string) {
  const { data: userData } = await supabase.auth.getUser()
  const blockerId = userData.user?.id
  if (!blockerId) throw new Error('Not signed in.')

  const { error } = await supabase.from('blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId)
  if (error) throw error
}

export async function listBlockedUsers(userId: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, username)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as BlockedUser[]
}

export async function reportUser(reportedId: string, reason: ReportReason, details?: string) {
  const { data: userData } = await supabase.auth.getUser()
  const reporterId = userData.user?.id
  if (!reporterId) throw new Error('Not signed in.')

  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() || null,
  })
  if (error) throw error
}
