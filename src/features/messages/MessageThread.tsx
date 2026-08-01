import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Loader2, Paperclip, X, Swords } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  fetchConversation,
  markConversationRead,
  sendDirectAttachment,
  sendDirectMessage,
  sendDuelInvite,
  parseDuelInvite,
  subscribeToConversation,
  type DirectMessage,
} from '@/services/messages'
import { createDuelRoom } from '@/services/rooms'
import { formatSupabaseError } from '@/lib/errors'
import { AttachmentBubble } from './AttachmentBubble'
import { DuelInviteBubble } from './DuelInviteBubble'
import { BlockReportMenu } from './BlockReportMenu'

interface MessageThreadProps {
  currentUserId: string
  otherUserId: string
  otherUsername: string
  /** Called after a message is sent/received so the parent can refresh the conversation list. */
  onActivity?: () => void
}

export function MessageThread({ currentUserId, otherUserId, otherUsername, onActivity }: MessageThreadProps) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sendingDuel, setSendingDuel] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!content && !pendingFile) return
    setError(null)

    if (pendingFile) {
      const file = pendingFile
      setPendingFile(null)
      setDraft('')
      setUploading(true)
      try {
        await sendDirectAttachment(otherUserId, file, content)
        onActivity?.()
      } catch (err) {
        setPendingFile(file)
        setDraft(content)
        setError(formatSupabaseError(err, 'Could not send that attachment.'))
      } finally {
        setUploading(false)
      }
      return
    }

    setDraft('')
    try {
      await sendDirectMessage(otherUserId, content)
      onActivity?.()
    } catch (err) {
      setDraft(content)
      setError(formatSupabaseError(err, 'Could not send that message.'))
    }
  }

  async function handleDuel() {
    setSendingDuel(true)
    setError(null)
    try {
      const room = await createDuelRoom(currentUserId)
      await sendDuelInvite(otherUserId, room.id)
      onActivity?.()
      navigate(`/rooms/${room.id}`)
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not start a duel.'))
    } finally {
      setSendingDuel(false)
    }
  }

  function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('That file is too large — attachments are limited to 10 MB.')
      return
    }
    setError(null)
    setPendingFile(file)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3">
        <span className="font-mono text-sm text-ink-100">{otherUsername}</span>
        <div className="flex items-center">
          <button
            onClick={handleDuel}
            disabled={sendingDuel}
            title={`Challenge ${otherUsername} to a duel`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-400 hover:text-caret disabled:opacity-40"
          >
            {sendingDuel ? <Loader2 className="size-3.5 animate-spin" /> : <Swords className="size-3.5" />}
            Duel
          </button>
          <BlockReportMenu
            otherUserId={otherUserId}
            otherUsername={otherUsername}
            onBlocked={() => {
              onActivity?.()
              navigate('/messages')
            }}
          />
        </div>
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
              const duelRoomId = parseDuelInvite(m.content)
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-3 py-2 text-sm flex flex-col gap-1.5',
                      duelRoomId
                        ? 'bg-transparent p-0'
                        : mine
                          ? 'bg-caret text-ink-950'
                          : 'bg-ink-800 text-ink-100',
                      m.attachment_path && !mine && !duelRoomId && 'bg-ink-800/70'
                    )}
                  >
                    {duelRoomId ? (
                      <DuelInviteBubble roomId={duelRoomId} mine={mine} />
                    ) : (
                      <>
                        {m.attachment_path && <AttachmentBubble message={m} />}
                        {m.content && <span>{m.content}</span>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-incorrect">{error}</p>}

      {pendingFile && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-lg bg-ink-800/60 px-3 py-1.5 text-xs text-ink-300">
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{pendingFile.name}</span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="ml-auto text-ink-500 hover:text-ink-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-ink-700/60 p-3">
        <input ref={fileInputRef} type="file" onChange={handlePickFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Attach an image, gif, or file"
          className="rounded-lg px-2 text-ink-400 hover:text-caret disabled:opacity-40"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={pendingFile ? 'Add a caption…' : `Message ${otherUsername}…`}
          maxLength={1000}
          className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
        />
        <button
          type="submit"
          disabled={(!draft.trim() && !pendingFile) || uploading}
          className="rounded-lg px-3 text-caret hover:text-caret-dim disabled:opacity-40"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  )
}
