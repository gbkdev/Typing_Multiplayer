import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRoomState } from '@/features/multiplayer/useRoomState'
import { RoomLobby } from '@/features/multiplayer/RoomLobby'
import { Countdown } from '@/features/multiplayer/Countdown'
import { RaceView } from '@/features/multiplayer/RaceView'
import { PostRaceResults } from '@/features/multiplayer/PostRaceResults'
import { joinRoom } from '@/services/rooms'
import { beginRaceForRoom } from '@/services/matches'

export function RoomPage() {
  const { roomId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { room, players, loading, error } = useRoomState(roomId)
  const [countdownDone, setCountdownDone] = useState(false)
  const [raceError, setRaceError] = useState<string | null>(null)

  useEffect(() => {
    if (room && user && !players.some((p) => p.user_id === user.id)) {
      joinRoom(room.id, user.id).catch(() => {})
    }
  }, [room, user, players])

  useEffect(() => {
    if (room?.status === 'countdown' && countdownDone && room.host_id === user?.id) {
      setRaceError(null)
      beginRaceForRoom(room.id).catch((err) => {
        setRaceError(err instanceof Error ? err.message : 'Could not start the race.')
      })
    }
  }, [room?.status, countdownDone, room, user])

  useEffect(() => {
    if (room?.status !== 'countdown') setCountdownDone(false)
  }, [room?.status])

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-caret" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (error || !room) return <p className="text-sm text-incorrect">This room no longer exists — it may have been closed by the host.</p>

  if (room.status === 'lobby') {
    return <RoomLobby room={room} players={players} userId={user.id} />
  }

  if (room.status === 'countdown') {
    return (
      <div className="flex flex-col items-center gap-4">
        <Countdown seconds={room.settings.countdownSeconds} onComplete={() => setCountdownDone(true)} />
        {raceError && <p className="text-sm text-incorrect">{raceError}</p>}
      </div>
    )
  }

  if (room.status === 'racing') {
    return <RaceView room={room} players={players} userId={user.id} />
  }

  return <PostRaceResults room={room} isHost={room.host_id === user.id} />
}
