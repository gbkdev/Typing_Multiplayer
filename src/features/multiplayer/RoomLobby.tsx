import { useState } from 'react'
import { Check, Crown, Copy, LogOut, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { setReady, startRace, leaveRoom, deleteRoom } from '@/services/rooms'
import { RoomChat } from './RoomChat'
import type { Room, RoomPlayer } from '@/types'

interface RoomLobbyProps {
  room: Room
  players: RoomPlayer[]
  userId: string
}

export function RoomLobby({ room, players, userId }: RoomLobbyProps) {
  const navigate = useNavigate()
  const isHost = room.host_id === userId
  const self = players.find((p) => p.user_id === userId)
  const allReady = players.length >= 1 && players.every((p) => p.ready || p.user_id === room.host_id)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRoom(room.id)
      navigate('/rooms')
    } catch (err) {
      setDeleting(false)
      setConfirmingDelete(false)
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this room.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(room.room_code)}
            className="flex items-center gap-2 rounded-lg bg-ink-800 px-3 py-1.5 font-mono text-sm text-ink-200 hover:text-caret transition-colors"
          >
            {room.room_code} <Copy className="size-3.5" />
          </button>
          <span className="text-xs text-ink-500">
            {room.settings.textMode} · {room.settings.duration ?? room.settings.wordCount} ·{' '}
            {players.length}/{room.settings.maxPlayers}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg bg-ink-800/50 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-ink-100">
                {p.user_id === room.host_id && <Crown className="size-3.5 text-caret" />}
                {p.profile?.username ?? 'player'}
              </span>
              {p.ready || p.user_id === room.host_id ? (
                <span className="flex items-center gap-1 text-xs text-correct">
                  <Check className="size-3.5" /> ready
                </span>
              ) : (
                <span className="text-xs text-ink-500">waiting</span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          {!isHost && (
            <Button
              variant={self?.ready ? 'secondary' : 'primary'}
              onClick={() => setReady(room.id, userId, !self?.ready)}
            >
              {self?.ready ? 'Not ready' : "I'm ready"}
            </Button>
          )}
          {isHost && (
            <Button disabled={!allReady} onClick={() => startRace(room.id)}>
              Start race
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => leaveRoom(room.id, userId).then(() => navigate('/rooms'))}
          >
            <LogOut className="size-4" /> Leave
          </Button>
          {isHost &&
            (confirmingDelete ? (
              <div className="flex items-center gap-2">
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="size-4" /> {deleting ? 'Deleting…' : 'Confirm delete'}
                </Button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="text-xs text-ink-500 hover:text-ink-300"
                >
                  cancel
                </button>
              </div>
            ) : (
              <Button variant="ghost" className="text-ink-500 hover:text-incorrect" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="size-4" /> Delete room
              </Button>
            ))}
        </div>
        {deleteError && <p className="text-xs text-incorrect">{deleteError}</p>}
      </Card>

      <RoomChat roomId={room.id} userId={userId} />
    </div>
  )
}
