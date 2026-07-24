import { useRef, useEffect } from 'react'
import { useTypingEngine } from '@/features/typing/useTypingEngine'
import { TypingDisplay } from '@/features/typing/TypingDisplay'
import { LiveStats } from '@/features/typing/LiveStats'
import { PlayerProgressBar } from './PlayerProgressBar'
import { Card } from '@/components/ui/Card'
import { updateProgress } from '@/services/rooms'
import { submitMatchResult, tryFinishRoom } from '@/services/matches'
import type { Room, RoomPlayer, TypingStats } from '@/types'

interface RaceViewProps {
  room: Room
  players: RoomPlayer[]
  userId: string
}

export function RaceView({ room, players, userId }: RaceViewProps) {
  const text = room.settings.currentText ?? 'Waiting for text…'
  const matchId = room.settings.currentMatchId
  const submitted = useRef(false)

  const engine = useTypingEngine({
    text,
    mode: room.settings.textMode === 'time' ? 'time' : 'words',
    duration: room.settings.duration ?? undefined,
    onProgress: (stats) => {
      updateProgress(room.id, userId, {
        progress: stats.progress,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
      }).catch(() => {})
    },
    onFinish: async (stats: TypingStats) => {
      if (submitted.current || !matchId) return
      submitted.current = true
      try {
        const position = await submitMatchResult(matchId, {
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          mistakes: stats.errors,
        })
        await updateProgress(room.id, userId, {
          progress: 1,
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          finished: true,
          position,
        })
        await tryFinishRoom(room.id)
      } catch {
        submitted.current = false
      }
    },
  })

  const self = players.find((p) => p.user_id === userId)
  const isSpectator = self?.finished ?? false

  // Backup: if everyone finished but room status lagged, any member can close the race.
  useEffect(() => {
    if (players.length === 0) return
    const allDone = players.every((p) => p.finished)
    if (allDone) {
      tryFinishRoom(room.id).catch(() => {})
    }
  }, [players, room.id])

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-2">
        {players.map((p) => (
          <PlayerProgressBar key={p.id} player={p} isSelf={p.user_id === userId} />
        ))}
      </Card>

      <Card className="relative">
        <div className="mb-6">
          <LiveStats stats={engine.stats} timeRemaining={engine.timeRemaining} />
        </div>
        {isSpectator ? (
          <p className="text-sm text-ink-400">You finished — spectating the rest of the race.</p>
        ) : (
          <div onClick={() => engine.inputRef.current?.focus()} className="cursor-text">
            <TypingDisplay text={text} charStateAt={engine.charStateAt} typedLength={engine.typed.length} />
          </div>
        )}
        {!isSpectator && (
          <input
            ref={engine.inputRef}
            className="absolute opacity-0 pointer-events-none"
            value={engine.typed}
            onChange={(e) => engine.handleInput(e.target.value)}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Typing input"
          />
        )}
      </Card>
    </div>
  )
}
