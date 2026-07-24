import { useCallback, useEffect, useRef, useState } from 'react'
import type { CharState, TypingStats } from '@/types'
import { sounds } from '@/lib/sounds'
import { useAppStore } from '@/store/useAppStore'

export type EngineMode = 'time' | 'words'

interface UseTypingEngineOptions {
  text: string
  mode: EngineMode
  duration?: number // seconds, for 'time' mode
  onFinish?: (stats: TypingStats) => void
  /** Fired every tick while racing, useful for multiplayer progress broadcasts. */
  onProgress?: (stats: TypingStats & { progress: number }) => void
}

interface WpmSample {
  time: number // seconds elapsed
  wpm: number
}

export function useTypingEngine({ text, mode, duration, onFinish, onProgress }: UseTypingEngineOptions) {
  const [typed, setTyped] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [errorLog, setErrorLog] = useState<Set<number>>(new Set())
  const [wpmHistory, setWpmHistory] = useState<WpmSample[]>([])
  const finishedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isRunning = startedAt !== null && finishedAt === null

  // Tick every 100ms while running for live timer/wpm updates.
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [isRunning])

  const elapsedSeconds = startedAt ? ((finishedAt ?? now) - startedAt) / 1000 : 0

  const computeStats = useCallback((): TypingStats => {
    let correctChars = 0
    let incorrectChars = 0
    const extraChars = 0

    for (let i = 0; i < typed.length; i++) {
      if (i >= text.length) break
      if (typed[i] === text[i]) correctChars++
      else incorrectChars++
    }

    const charactersTyped = typed.length
    const minutes = Math.max(elapsedSeconds / 60, 1 / 60)
    const rawWpm = Math.round(charactersTyped / 5 / minutes)
    const wpm = Math.round(correctChars / 5 / minutes)
    const accuracy =
      charactersTyped === 0 ? 100 : Math.round((correctChars / charactersTyped) * 100)

    return {
      wpm: Number.isFinite(wpm) ? Math.max(wpm, 0) : 0,
      rawWpm: Number.isFinite(rawWpm) ? Math.max(rawWpm, 0) : 0,
      accuracy,
      errors: errorLog.size,
      correctChars,
      incorrectChars,
      extraChars,
      charactersTyped,
      elapsedSeconds,
    }
  }, [typed, text, elapsedSeconds, errorLog])

  // Sample WPM roughly once a second for the live graph.
  useEffect(() => {
    if (!isRunning) return
    const stats = computeStats()
    setWpmHistory((prev) => {
      const lastSecond = prev.length ? prev[prev.length - 1].time : -1
      const currentSecond = Math.floor(elapsedSeconds)
      if (currentSecond === lastSecond) return prev
      return [...prev, { time: currentSecond, wpm: stats.wpm }]
    })
    onProgress?.({ ...stats, progress: typed.length / text.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    setFinishedAt(Date.now())
  }, [])

  // Auto-finish for time mode.
  useEffect(() => {
    if (mode === 'time' && duration && isRunning && elapsedSeconds >= duration) {
      finish()
    }
  }, [mode, duration, isRunning, elapsedSeconds, finish])

  useEffect(() => {
    if (finishedAt) {
      if (useAppStore.getState().soundEnabled) sounds.finish()
      onFinish?.(computeStats())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishedAt])

  const handleInput = useCallback(
    (value: string) => {
      if (finishedRef.current) return
      if (startedAt === null && value.length > 0) {
        setStartedAt(Date.now())
      }

      // Track mistakes cumulatively (a char that was ever wrong at that index counts as an error).
      // Loop over all newly added characters (not just the last) so multi-char
      // input deltas — paste, IME composition, or test harnesses setting the
      // full value at once — are still scored correctly.
      let newlyIncorrect = false
      if (value.length > typed.length) {
        setErrorLog((prev) => {
          const next = new Set(prev)
          for (let idx = typed.length; idx < value.length; idx++) {
            if (value[idx] !== text[idx]) {
              next.add(idx)
              newlyIncorrect = true
            }
          }
          return next
        })
        const { soundEnabled, keyboardSoundsEnabled } = useAppStore.getState()
        if (keyboardSoundsEnabled) sounds.keyPress()
        else if (soundEnabled) (newlyIncorrect ? sounds.incorrect : sounds.correct)()
      }

      setTyped(value)

      if (mode === 'words' && value.length >= text.length) {
        finish()
      }
    },
    [startedAt, typed, text, mode, finish]
  )

  const restart = useCallback((newText?: string) => {
    setTyped('')
    setStartedAt(null)
    setFinishedAt(null)
    setErrorLog(new Set())
    setWpmHistory([])
    finishedRef.current = false
    setNow(Date.now())
    inputRef.current?.focus()
    return newText
  }, [])

  function charStateAt(index: number): CharState {
    if (index >= typed.length) {
      return index === typed.length ? 'current' : 'pending'
    }
    return typed[index] === text[index] ? 'correct' : 'incorrect'
  }

  const timeRemaining = mode === 'time' && duration ? Math.max(duration - elapsedSeconds, 0) : null

  return {
    typed,
    handleInput,
    restart,
    charStateAt,
    stats: computeStats(),
    wpmHistory,
    isRunning,
    isFinished: finishedAt !== null,
    timeRemaining,
    elapsedSeconds,
    inputRef,
  }
}
