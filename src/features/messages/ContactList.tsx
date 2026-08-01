import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { parseDuelInvite } from '@/services/messages'

export interface ContactRow {
  userId: string
  username: string
  lastContent?: string
  lastAttachmentType?: 'image' | 'gif' | 'file' | null
  lastCreatedAt?: string
  lastSenderId?: string
  unreadCount: number
}

interface ContactListProps {
  contacts: ContactRow[]
  activeUserId?: string
  currentUserId: string
}

function attachmentLabel(type: 'image' | 'gif' | 'file' | null | undefined) {
  if (type === 'image') return '📷 Photo'
  if (type === 'gif') return '🎞️ GIF'
  if (type === 'file') return '📎 File'
  return ''
}

function previewText(content: string | undefined, attachmentType: ContactRow['lastAttachmentType']) {
  if (content && parseDuelInvite(content)) return '⚔️ Duel invite'
  return content || attachmentLabel(attachmentType)
}

export function ContactList({ contacts, activeUserId, currentUserId }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-ink-500">
        No friends yet. Add friends from a profile to start messaging.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {contacts.map((c) => {
        const isMine = c.lastSenderId === currentUserId
        return (
          <Link
            key={c.userId}
            to={`/messages/${c.userId}`}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-ink-800/60',
              activeUserId === c.userId && 'bg-ink-800/60'
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-700 font-mono text-sm text-ink-200">
              {c.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink-100">{c.username}</span>
                {c.unreadCount > 0 && (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-caret text-[9px] font-bold text-ink-950">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </span>
              <span
                className={cn('block truncate text-xs', c.unreadCount > 0 ? 'text-ink-200' : 'text-ink-500')}
              >
                {c.lastContent || c.lastAttachmentType ? (
                  <>
                    {isMine && <span className="text-ink-600">you: </span>}
                    {previewText(c.lastContent, c.lastAttachmentType)}
                  </>
                ) : (
                  'Say hi 👋'
                )}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
