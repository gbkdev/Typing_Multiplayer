import { supabase } from '@/lib/supabase'

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  other_user_id: string
  other_username: string
  other_avatar_url: string | null
  last_content: string
  last_created_at: string
  last_sender_id: string
  unread_count: number
}

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc('list_conversations')
  if (error) throw error
  return (data ?? []) as Conversation[]
}

export async function fetchConversation(otherUserId: string, currentUserId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`
    )
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DirectMessage[]
}

export async function sendDirectMessage(recipientId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return
  const { data: userData } = await supabase.auth.getUser()
  const senderId = userData.user?.id
  if (!senderId) throw new Error('Not signed in.')

  const { error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content: trimmed })
  if (error) throw error
}

export async function markConversationRead(otherUserId: string) {
  const { error } = await supabase.rpc('mark_conversation_read', { p_other_user_id: otherUserId })
  if (error) throw error
}

let channelSeq = 0
function uniqueTopic(base: string) {
  channelSeq += 1
  return `${base}:${channelSeq}:${Math.random().toString(36).slice(2)}`
}

/** Live updates for a single open conversation thread. */
export function subscribeToConversation(
  currentUserId: string,
  otherUserId: string,
  onInsert: (message: DirectMessage) => void
) {
  // Each call gets its own uniquely-named channel. Supabase's client reuses
  // an existing channel object for a topic it has already seen, and calling
  // `.on()` on an already-subscribed channel throws — so two independent
  // subscribers (e.g. the navbar and this page, or a StrictMode double-mount)
  // must never share a topic string.
  const channel = supabase
    .channel(uniqueTopic(`dm:${[currentUserId, otherUserId].sort().join(':')}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${otherUserId}` },
      (payload) => {
        const row = payload.new as DirectMessage
        if (row.recipient_id === currentUserId) onInsert(row)
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${currentUserId}` },
      (payload) => {
        const row = payload.new as DirectMessage
        if (row.recipient_id === otherUserId) onInsert(row)
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

/** Live updates for the whole inbox (any new message involving the current user). */
export function subscribeToInbox(currentUserId: string, onChange: () => void) {
  const channel = supabase
    .channel(uniqueTopic(`inbox:${currentUserId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${currentUserId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${currentUserId}` },
      onChange
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
