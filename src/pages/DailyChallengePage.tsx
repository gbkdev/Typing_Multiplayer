import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Crown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { useAuth } from '@/contexts/AuthContext'
import { useTypingEngine } from '@/features/typing/useTypingEngine'
import { TypingDisplay } from '@/features/typing/TypingDisplay'
import { LiveStats } from '@/features/typing/LiveStats'
import {
  getDailyChallenge,
  submitDailyChallengeResult,
  getDailyChallengeLeaderboard,
  type DailyChallenge,
  type DailyChallengeEntry,
} from '@/services/dailyChallenge'
import { formatSupabaseError } from '@/lib/errors'
import type { TypingStats } from '@/types'

export function DailyChallengePage() {
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [leaderboard, setLeaderboard] = useState<DailyChallengeEntry[]>([])
  const [result, setResult] = useState<{ stats: TypingStats; saved: boolean; error: string | null } | null>(null)

  useEffect(() => {
    getDailyChallenge().then(setChallenge).catch(() => setChallenge(null))
  }, [])

  const refreshLeaderboard = useCallback(() => {
    getDailyChallengeLeaderboard().then(setLeaderboard).catch(() => setLeaderboard([]))
  }, [])

  useEffect(refreshLeaderboard, [refreshLeaderboard])

  async function handleFinish(stats: TypingStats) {
    if (!user) {
      setResult({ stats, saved: false, error: null })
      return
    }
    try {
      await submitDailyChallengeResult({
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        mistakes: stats.errors,
      })
      setResult({ stats, saved: true, error: null })
      refreshLeaderboard()
    } catch (err) {
      setResult({ stats, saved: false, error: formatSupabaseError(err, 'Could not save your result.') })
    }
  }

  const engine = useTypingEngine({
    text: challenge?.text ?? '',
    mode: 'words',
    onFinish: handleFinish,
  })

  const myEntry = leaderboard.find((e) => e.user_id === user?.id)

  if (!challenge) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-caret" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-caret" />
        <h1 className="font-mono text-xl text-ink-100">Daily Challenge</h1>
        <span className="text-xs text-ink-500">
          {new Date(challenge.challenge_date).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
      <p className="text-sm text-ink-400">
        Everyone races the exact same text today. Come back tomorrow for a new one.
      </p>

      {result ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-mono text-3xl text-caret">{result.stats.wpm} wpm</p>
          <p className="text-sm text-ink-400">{result.stats.accuracy}% accuracy</p>
          {user ? (
            result.saved ? (
              <p className="text-xs text-correct">Saved to today's leaderboard.</p>
            ) : (
              <p className="text-xs text-incorrect">{result.error ?? 'Could not save your result.'}</p>
            )
          ) : (
            <p className="text-xs text-ink-500">
              <Link to="/login" className="text-caret hover:underline">
                Sign in
              </Link>{' '}
              to save your result to today's leaderboard.
            </p>
          )}
        </Card>
      ) : (
        <Card>
          <div className="mb-6">
            <LiveStats stats={engine.stats} timeRemaining={null} />
          </div>
          <div className="cursor-text" onClick={() => engine.inputRef.current?.focus()}>
            <TypingDisplay text={challenge.text} charStateAt={engine.charStateAt} typedLength={engine.typed.length} />
          </div>
          <input
            ref={engine.inputRef}
            className="absolute opacity-0 pointer-events-none"
            value={engine.typed}
            onChange={(e) => engine.handleInput(e.target.value)}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Daily challenge input"
          />
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <Crown className="size-4 text-caret" />
          <h2 className="font-mono text-sm text-ink-100">Today's leaderboard</h2>
        </div>
        {myEntry && (
          <div className="flex items-center justify-between border-b border-ink-800 bg-caret/5 px-4 py-2 text-sm">
            <span className="text-ink-200">You</span>
            <span className="font-mono text-caret">{Math.round(myEntry.wpm)} wpm</span>
          </div>
        )}
        {leaderboard.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No one has finished today's challenge yet — be the first!</p>
        ) : (
          <div className="flex flex-col">
            {leaderboard.slice(0, 20).map((e, i) => (
              <div
                key={e.user_id}
                className={cn(
                  'flex items-center justify-between px-4 py-2 text-sm',
                  e.user_id === user?.id && 'bg-caret/5'
                )}
              >
                <span className="flex items-center gap-2 text-ink-200">
                  <span className="w-5 font-mono text-ink-500">
                    {i === 0 ? <Crown className="size-4 text-caret" /> : `#${i + 1}`}
                  </span>
                  {e.username}
                </span>
                <span className="font-mono text-ink-100">{Math.round(e.wpm)} wpm</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
