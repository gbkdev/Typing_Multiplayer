import { useEffect, useState, useCallback, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTypingEngine } from './useTypingEngine'
import { TypingDisplay } from './TypingDisplay'
import { LiveStats } from './LiveStats'
import { ResultsPanel } from './ResultsPanel'
import { ModeSelector } from './ModeSelector'
import { Card } from '@/components/ui/Card'
import { generateTimedText, generateWords } from './textBank'
import { useAuth } from '@/contexts/AuthContext'
import { recordPracticeResult } from '@/services/matches'
import { formatSupabaseError } from '@/lib/errors'
import type { EngineMode } from './useTypingEngine'
import type { TypingStats } from '@/types'

export function TypingTest() {
  const { user } = useAuth()
  const [mode, setMode] = useState<EngineMode>('time')
  const [duration, setDuration] = useState<15 | 30 | 60 | 120>(30)
  const [wordCount, setWordCount] = useState<10 | 25 | 50 | 100>(25)
  const [text, setText] = useState(() => generateTimedText())
  const [lastResult, setLastResult] = useState<{
    stats: TypingStats
    history: { time: number; wpm: number }[]
    saved: boolean
    saveError: string | null
  } | null>(null)

  const generateText = useCallback(() => {
    return mode === 'time' ? generateTimedText() : generateWords(wordCount)
  }, [mode, wordCount])

  const handleFinish = useCallback(
    async (stats: TypingStats, history: { time: number; wpm: number }[]) => {
      let saved = false
      let saveError: string | null = null
      if (user) {
        try {
          await recordPracticeResult({
            wpm: stats.wpm,
            rawWpm: stats.rawWpm,
            accuracy: stats.accuracy,
            mistakes: stats.errors,
          })
          saved = true
        } catch (err) {
          saved = false
          saveError = formatSupabaseError(
            err,
            'Could not save result. Run supabase/migrations/0008_fix_rls_recursion.sql in your Supabase SQL editor.'
          )
        }
      }
      setLastResult({ stats, history, saved, saveError })
    },
    [user]
  )

  const engine = useTypingEngine({
    text,
    mode,
    duration: mode === 'time' ? duration : undefined,
    onFinish: (stats) => handleFinish(stats, engine.wpmHistory),
  })

  const newTest = useCallback(() => {
    const t = generateText()
    setText(t)
    setLastResult(null)
    engine.restart(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateText])

  const replaySame = useCallback(() => {
    setLastResult(null)
    engine.restart(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => {
    newTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, duration, wordCount])

  useEffect(() => {
    engine.inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      newTest()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      newTest()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      replaySame()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!lastResult && (
        <ModeSelector
          mode={mode}
          duration={duration}
          wordCount={wordCount}
          onModeChange={setMode}
          onDurationChange={setDuration}
          onWordCountChange={setWordCount}
        />
      )}

      {lastResult ? (
        <>
          <ResultsPanel stats={lastResult.stats} wpmHistory={lastResult.history} onRestart={newTest} />
          {user ? (
            lastResult.saved ? (
              <p className="text-center text-xs text-correct">Result saved to your profile.</p>
            ) : (
              <p className="text-center text-xs text-incorrect">
                {lastResult.saveError ??
                  'Could not save result — check your Supabase connection and run the latest migrations.'}
              </p>
            )
          ) : (
            <p className="text-center text-xs text-ink-500">
              <Link to="/login" className="text-caret hover:underline">
                Sign in
              </Link>{' '}
              to save results to your profile and leaderboard.
            </p>
          )}
        </>
      ) : (
        <Card className="relative">
          <div className="mb-6">
            <LiveStats stats={engine.stats} timeRemaining={engine.timeRemaining} />
          </div>

          <div className="cursor-text" onClick={() => engine.inputRef.current?.focus()}>
            <TypingDisplay text={text} charStateAt={engine.charStateAt} typedLength={engine.typed.length} />
          </div>

          <input
            ref={engine.inputRef}
            className="absolute opacity-0 pointer-events-none"
            value={engine.typed}
            onChange={(e) => engine.handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Typing input"
          />

          <p className="mt-4 text-xs text-ink-500">
            tab or esc — restart with new text · ctrl+enter — replay same text
          </p>
        </Card>
      )}
    </div>
  )
}
