import { useEffect, useState, type FormEvent } from 'react'
import { UserPlus, Check, X } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  listFriends,
  listPendingRequests,
  sendFriendRequest,
  respondToFriendRequest,
} from '@/services/friends'

interface FriendRow {
  id: string
  requester_id: string
  addressee_id: string
  requester?: { id: string; username: string }
  addressee?: { id: string; username: string }
}

export function FriendsPanel({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [pending, setPending] = useState<FriendRow[]>([])
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [f, p] = await Promise.all([listFriends(userId), listPendingRequests(userId)])
    setFriends(f as unknown as FriendRow[])
    setPending(p as unknown as FriendRow[])
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await sendFriendRequest(userId, username.trim())
      setUsername('')
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send request.')
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <Button type="submit" variant="secondary">
          <UserPlus className="size-4" />
        </Button>
      </form>
      {error && <p className="text-xs text-incorrect">{error}</p>}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-ink-500">Pending</span>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-ink-800/50 px-3 py-2 text-sm">
              <span>{p.requester?.username}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => respondToFriendRequest(p.id, true).then(refresh)}
                  className="text-correct hover:opacity-80"
                >
                  <Check className="size-4" />
                </button>
                <button
                  onClick={() => respondToFriendRequest(p.id, false).then(refresh)}
                  className="text-incorrect hover:opacity-80"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest text-ink-500">
          {friends.length} friend{friends.length !== 1 && 's'}
        </span>
        {friends.map((f) => {
          const other = f.requester_id === userId ? f.addressee : f.requester
          return (
            <div key={f.id} className="flex items-center gap-2 rounded-lg bg-ink-800/50 px-3 py-2 text-sm">
              <span className="size-2 rounded-full bg-correct" />
              {other?.username}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
