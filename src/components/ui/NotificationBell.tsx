import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listNotifications, markNotificationRead, subscribeToNotifications } from '@/services/notifications'
import { cn } from '@/lib/cn'

interface Notification {
  id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])

  useEffect(() => {
    if (!user) return
    listNotifications(user.id).then((data) => setItems(data as unknown as Notification[]))
    const unsubscribe = subscribeToNotifications(user.id, () => {
      listNotifications(user.id).then((data) => setItems(data as unknown as Notification[]))
    })
    return () => {
      unsubscribe()
    }
  }, [user])

  if (!user) return null
  const unreadCount = items.filter((i) => !i.read).length

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-ink-400 hover:text-ink-100">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-caret text-[9px] font-bold text-ink-950">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 glass-panel p-2 max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-3 text-xs text-ink-500">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id)
                  setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
                }}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-ink-800/60',
                  n.read ? 'text-ink-500' : 'text-ink-100'
                )}
              >
                {describeNotification(n)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function describeNotification(n: Notification) {
  switch (n.type) {
    case 'friend_request':
      return 'You have a new friend request.'
    case 'friend_accepted':
      return 'Your friend request was accepted.'
    case 'room_invite':
      return 'You were invited to a room.'
    case 'achievement':
      return `Achievement unlocked: ${(n.payload?.achievement_id as string) ?? 'new badge'}!`
    default:
      return 'System notification.'
  }
}
