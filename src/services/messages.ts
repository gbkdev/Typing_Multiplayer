import { supabase } from '@/lib/supabase'

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  attachment_path: string | null
  attachment_type: 'image' | 'gif' | 'file' | null
  attachment_name: string | null
  read_at: string | null
  created_at: string
}

export interface Conversation {
  other_user_id: string
  other_username: string
  other_avatar_url: string | null
  last_content: string
  last_attachment_type: 'image' | 'gif' | 'file' | null
  last_created_at: string
  last_sender_id: string
  unread_count: number
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB, matches the bucket's server-side limit

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

function attachmentKind(file: File): 'image' | 'gif' | 'file' {
  if (file.type === 'image/gif') return 'gif'
  if (file.type.startsWith('image/')) return 'image'
  return 'file'
}

/** Upload a file/image/gif to the private dm-attachments bucket and send it as a message. */
export const DUEL_INVITE_PREFIX = 'duel:'

/** A duel invite is just a direct message whose content is a sentinel + room id — the UI renders it specially. */
export async function sendDuelInvite(recipientId: string, roomId: string) {
  await sendDirectMessage(recipientId, `${DUEL_INVITE_PREFIX}${roomId}`)
}

export function parseDuelInvite(content: string): string | null {
  return content.startsWith(DUEL_INVITE_PREFIX) ? content.slice(DUEL_INVITE_PREFIX.length) : null
}

export async function sendDirectAttachment(recipientId: string, file: File, caption?: string) {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('That file is too large — attachments are limited to 10 MB.')
  }
  const { data: userData } = await supabase.auth.getUser()
  const senderId = userData.user?.id
  if (!senderId) throw new Error('Not signed in.')

  const folder = [senderId, recipientId].sort().join('_')
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage.from('dm-attachments').upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { error } = await supabase.from('direct_messages').insert({
    sender_id: senderId,
    recipient_id: recipientId,
    content: caption?.trim() ?? '',
    attachment_path: path,
    attachment_type: attachmentKind(file),
    attachment_name: file.name,
  })
  if (error) throw error
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/** Resolve a signed, temporary URL for a private attachment (cached until near expiry). */
export async function getAttachmentUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url

  const { data, error } = await supabase.storage.from('dm-attachments').createSignedUrl(path, 3600)
  if (error) throw error
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 3600 * 1000 })
  return data.signedUrl
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
