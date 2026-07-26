import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  fetchConversation,
  markConversationRead,
  sendDirectMessage,
  subscribeToConversation,
  type DirectMessage,
} from '@/services/messages'
import { formatSupabaseError } from '@/lib/errors'

interface MessageThreadProps {
  currentUserId: string
  otherUserId: string
  otherUsername: string
  /** Called after a message is sent/received so the parent can refresh the conversation list. */
  onActivity?: () => void
}

export function MessageThread({ currentUserId, otherUserId, otherUsername, onActivity }: MessageThreadProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchConversation(otherUserId, currentUserId)
      .then((data) => {
        if (!cancelled) setMessages(data)
      })
      .catch((err) => {
        if (!cancelled) setError(formatSupabaseError(err, 'Could not load this conversation.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    markConversationRead(otherUserId)
      .then(() => onActivity?.())
      .catch(() => {
        /* non-critical: unread badge just won't clear this time */
      })

    const unsubscribe = subscribeToConversation(currentUserId, otherUserId, (message) => {
      setMessages((prev) => [...prev, message])
      if (message.recipient_id === currentUserId) {
        markConversationRead(otherUserId)
          .then(() => onActivity?.())
          .catch(() => {})
      }
      onActivity?.()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return
    setDraft('')
    setError(null)
    try {
      await sendDirectMessage(otherUserId, content)
      onActivity?.()
    } catch (err) {
      setDraft(content)
      setError(formatSupabaseError(err, 'Could not send that message.'))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700/60 px-4 py-3">
        <span className="font-mono text-sm text-ink-100">{otherUsername}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-caret" />
          </div>
        ) : error && messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-incorrect">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-500">
            Say hi to {otherUsername} — this is the start of your conversation.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                      mine ? 'bg-caret text-ink-950' : 'bg-ink-800 text-ink-100'
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-incorrect">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-ink-700/60 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherUsername}…`}
          maxLength={1000}
          className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg px-3 text-caret hover:text-caret-dim disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
