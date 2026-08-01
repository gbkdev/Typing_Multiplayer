import { useEffect, useState } from 'react'
import { ShieldOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { listBlockedUsers, unblockUser, type BlockedUser } from '@/services/blocks'

interface BlockedUsersPanelProps {
  userId: string
}

export function BlockedUsersPanel({ userId }: BlockedUsersPanelProps) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  function refresh() {
    setLoading(true)
    listBlockedUsers(userId)
      .then(setBlocked)
      .catch(() => setBlocked([]))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [userId])

  async function handleUnblock(blockedId: string) {
    setUnblockingId(blockedId)
    try {
      await unblockUser(blockedId)
      setBlocked((prev) => prev.filter((b) => b.blocked_id !== blockedId))
    } catch {
      // leave the row in place; the user can try again
    } finally {
      setUnblockingId(null)
    }
  }

  if (loading) return null

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-ink-500">Blocked users</h2>
      {blocked.length === 0 ? (
        <p className="text-sm text-ink-500">You haven't blocked anyone.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-lg bg-ink-800/50 px-3 py-2 text-sm">
              <ShieldOff className="size-3.5 shrink-0 text-ink-500" />
              <span className="flex-1 text-ink-200">{b.blocked?.username ?? 'Unknown user'}</span>
              <button
                onClick={() => handleUnblock(b.blocked_id)}
                disabled={unblockingId === b.blocked_id}
                className="text-xs text-caret hover:underline disabled:opacity-50"
              >
                {unblockingId === b.blocked_id ? 'Unblocking…' : 'Unblock'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
