import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { createRoom } from '@/services/rooms'
import { formatSupabaseError } from '@/lib/errors'
import type { RoomSettings, RoomVisibility } from '@/types'

const defaultSettings: RoomSettings = {
  textMode: 'time',
  duration: 30,
  wordCount: null,
  difficulty: 'medium',
  maxPlayers: 8,
  countdownSeconds: 3,
}

export function CreateRoomForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visibility, setVisibility] = useState<RoomVisibility>('public')
  const [duration, setDuration] = useState<15 | 30 | 60 | 120>(30)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!user) {
      navigate('/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const room = await createRoom(user.id, visibility, { ...defaultSettings, duration, maxPlayers })
      navigate(`/rooms/${room.id}`)
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not create room.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['public', 'private'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVisibility(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono ${
              visibility === v ? 'bg-caret text-ink-950' : 'bg-ink-800 text-ink-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {([15, 30, 60, 120] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono ${
              duration === d ? 'bg-caret text-ink-950' : 'bg-ink-800 text-ink-300'
            }`}
          >
            {d}s
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-400">
        Max players
        <input
          type="number"
          min={2}
          max={16}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="w-16 rounded-lg bg-ink-800 border border-ink-600 px-2 py-1 text-ink-100"
        />
      </label>

      {error && <p className="text-xs text-incorrect">{error}</p>}
      <Button onClick={handleCreate} disabled={loading}>
        Create room
      </Button>
    </div>
  )
}
