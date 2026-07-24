import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { listPublicRooms } from '@/services/rooms'
import type { Room } from '@/types'

export function PublicRoomsList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    function load() {
      listPublicRooms()
        .then((data) => {
          if (active) setRooms(data as unknown as Room[])
        })
        .catch(() => {
          if (active) setRooms([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    load()
    const interval = setInterval(load, 10_000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading rooms…
      </div>
    )
  }

  if (rooms.length === 0) {
    return <p className="text-sm text-ink-500">No public rooms open right now. Start one!</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className="cursor-pointer hover:border-caret/50 transition-colors p-4"
          onClick={() => navigate(`/rooms/${room.id}`)}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-ink-100">{room.room_code}</span>
            <span className="flex items-center gap-1 text-xs text-ink-500">
              <Users className="size-3.5" /> {room.settings.maxPlayers} max
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1 capitalize">
            {room.settings.textMode} · {room.status}
          </p>
        </Card>
      ))}
    </div>
  )
}
