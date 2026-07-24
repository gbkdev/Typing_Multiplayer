import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { resetRoomToLobby } from '@/services/matches'
import type { Room } from '@/types'

interface ResultRow {
  user_id: string
  wpm: number
  accuracy: number
  position: number
  xp: number
  profile?: { username: string }
}

export function PostRaceResults({ room, isHost }: { room: Room; isHost: boolean }) {
  const navigate = useNavigate()
  const [results, setResults] = useState<ResultRow[]>([])
  const [rematchError, setRematchError] = useState<string | null>(null)
  const [rematching, setRematching] = useState(false)
  const matchId = room.settings.currentMatchId

  useEffect(() => {
    if (!matchId) return

    function load() {
      if (!matchId) return
      supabase
        .from('match_results')
        .select('*, profile:profiles(username)')
        .eq('match_id', matchId)
        .order('position', { ascending: true })
        .then(({ data }) => setResults((data ?? []) as unknown as ResultRow[]))
    }

    load()
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [matchId])

  async function handleRematch() {
    setRematchError(null)
    setRematching(true)
    try {
      await resetRoomToLobby(room.id)
    } catch (err) {
      setRematchError(err instanceof Error ? err.message : 'Could not reset room.')
    } finally {
      setRematching(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-mono text-lg text-ink-100">Results</h2>
      <ul className="flex flex-col gap-2">
        {results.length === 0 ? (
          <li className="text-sm text-ink-500">Waiting for results…</li>
        ) : (
          results.map((r) => (
            <li key={r.user_id} className="flex items-center justify-between rounded-lg bg-ink-800/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                {r.position === 1 && <Crown className="size-4 text-caret" />}#{r.position}{' '}
                {r.profile?.username ?? 'player'}
              </span>
              <span className="font-mono text-ink-300">
                {Math.round(r.wpm)} wpm · {Math.round(r.accuracy)}% · +{r.xp} xp
              </span>
            </li>
          ))
        )}
      </ul>

      {rematchError && <p className="text-xs text-incorrect">{rematchError}</p>}

      <div className="flex gap-3">
        {isHost && (
          <Button onClick={handleRematch} disabled={rematching}>
            Rematch
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate('/rooms')}>
          New room
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            navigator.clipboard.writeText(`I just raced at ${Math.round(results[0]?.wpm ?? 0)} WPM on typerace!`)
          }
        >
          <Share2 className="size-4" /> Share
        </Button>
      </div>
    </Card>
  )
}
