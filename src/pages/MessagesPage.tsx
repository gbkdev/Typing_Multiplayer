import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { ContactList, type ContactRow } from '@/features/messages/ContactList'
import { MessageThread } from '@/features/messages/MessageThread'
import { listConversations, subscribeToInbox, type Conversation } from '@/services/messages'
import { getProfile } from '@/services/profile'
import { listFriends } from '@/services/friends'

interface FriendRow {
  requester_id: string
  addressee_id: string
  requester?: { id: string; username: string }
  addressee?: { id: string; username: string }
}

export function MessagesPage() {
  const { user } = useAuth()
  const { userId: activeUserId } = useParams<{ userId?: string }>()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [friends, setFriends] = useState<{ id: string; username: string }[]>([])
  const [activeUsername, setActiveUsername] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
  }, [])

  useEffect(() => {
    if (!user) return
    refresh()
    const unsubscribe = subscribeToInbox(user.id, refresh)
    return unsubscribe
  }, [user, refresh])

  useEffect(() => {
    if (!user) return
    listFriends(user.id)
      .then((rows) => {
        const options = ((rows ?? []) as unknown as FriendRow[])
          .map((f) => (f.requester_id === user.id ? f.addressee : f.requester))
          .filter((p): p is { id: string; username: string } => !!p?.id && !!p?.username)
        setFriends(options)
      })
      .catch(() => setFriends([]))
  }, [user])

  // Every friend gets a row; conversation data (preview/unread) is merged in where it exists.
  const contacts: ContactRow[] = useMemo(() => {
    const byId = new Map(conversations.map((c) => [c.other_user_id, c]))
    const rows = friends.map((f) => {
      const convo = byId.get(f.id)
      return {
        userId: f.id,
        username: f.username,
        lastContent: convo?.last_content,
        lastAttachmentType: convo?.last_attachment_type,
        lastCreatedAt: convo?.last_created_at,
        lastSenderId: convo?.last_sender_id,
        unreadCount: convo?.unread_count ?? 0,
      }
    })
    return rows.sort((a, b) => {
      if (!a.lastCreatedAt && !b.lastCreatedAt) return a.username.localeCompare(b.username)
      if (!a.lastCreatedAt) return 1
      if (!b.lastCreatedAt) return -1
      return new Date(b.lastCreatedAt).getTime() - new Date(a.lastCreatedAt).getTime()
    })
  }, [friends, conversations])

  // Resolve the username for the open thread — covers friends not yet in the list
  // (e.g. the friends query hasn't resolved yet) or someone messaged directly by link.
  useEffect(() => {
    if (!activeUserId) {
      setActiveUsername(null)
      return
    }
    const known = contacts.find((c) => c.userId === activeUserId)
    if (known) {
      setActiveUsername(known.username)
      return
    }
    let cancelled = false
    getProfile(activeUserId)
      .then((p) => {
        if (!cancelled) setActiveUsername(p.username)
      })
      .catch(() => {
        if (!cancelled) navigate('/messages', { replace: true })
      })
    return () => {
      cancelled = true
    }
  }, [activeUserId, contacts, navigate])

  if (!user) return null

  return (
    <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
      <Card className={`h-[70vh] overflow-y-auto p-2 ${activeUserId ? 'hidden sm:block' : ''}`}>
        <div className="flex items-center gap-2 px-2 py-2">
          <MessageCircle className="size-4 text-caret" />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-400">Messages</span>
        </div>
        <ContactList contacts={contacts} activeUserId={activeUserId} currentUserId={user.id} />
      </Card>

      <Card
        className={`h-[70vh] p-0 sm:p-0 overflow-hidden ${activeUserId ? '' : 'hidden sm:flex sm:items-center sm:justify-center'}`}
      >
        {activeUserId && activeUsername ? (
          <div className="flex h-full flex-col">
            <button
              onClick={() => navigate('/messages')}
              className="flex items-center gap-1.5 border-b border-ink-700/60 px-4 py-2 text-xs text-ink-400 hover:text-ink-100 sm:hidden"
            >
              <ArrowLeft className="size-3.5" />
              All messages
            </button>
            <div className="min-h-0 flex-1">
              <MessageThread
                currentUserId={user.id}
                otherUserId={activeUserId}
                otherUsername={activeUsername}
                onActivity={refresh}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-500">Pick a friend to start chatting.</p>
        )}
      </Card>
    </div>
  )
}
