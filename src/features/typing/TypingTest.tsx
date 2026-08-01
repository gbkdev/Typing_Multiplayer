import { useEffect, useState, useCallback, type KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Keyboard, Target, X } from 'lucide-react'
import { useTypingEngine } from './useTypingEngine'
import { TypingDisplay } from './TypingDisplay'
import { LiveStats } from './LiveStats'
import { ResultsPanel } from './ResultsPanel'
import { ModeSelector, type Language, type AmharicContent } from './ModeSelector'
import { VirtualKeyboard } from './VirtualKeyboard'
import { GhostPicker } from './GhostPicker'
import { GhostRaceBar } from './GhostRaceBar'
import { Card } from '@/components/ui/Card'
import {
  generateTimedText,
  generateWords,
  generateCodeText,
  generateWeakKeyText,
  generateAmharicWords,
  generateAmharicTimedText,
  generateFidelDrill,
} from './textBank'
import { useAuth } from '@/contexts/AuthContext'
import { recordPracticeResult, type GhostCandidate } from '@/services/matches'
import { getProfile } from '@/services/profile'
import { formatSupabaseError } from '@/lib/errors'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/cn'
import type { EngineMode } from './useTypingEngine'
import type { TypingStats } from '@/types'

export function TypingTest() {
  const { user } = useAuth()
  const showVirtualKeyboard = useAppStore((s) => s.showVirtualKeyboard)
  const toggleVirtualKeyboard = useAppStore((s) => s.toggleVirtualKeyboard)
  const [searchParams, setSearchParams] = useSearchParams()
  const practicingWeakKeys = searchParams.get('practice') === 'weak'
  const [weakChars, setWeakChars] = useState<string[]>([])
  const [mode, setMode] = useState<EngineMode>('time')
  const [duration, setDuration] = useState<15 | 30 | 60 | 120>(30)
  const [wordCount, setWordCount] = useState<10 | 25 | 50 | 100>(25)
  const [language, setLanguage] = useState<Language>('english')
  const [amharicContent, setAmharicContent] = useState<AmharicContent>('words')
  const [fidelFamily, setFidelFamily] = useState<string | undefined>(undefined)
  const [useCode, setUseCode] = useState(false)
  const [punctuation, setPunctuation] = useState(false)
  const [numbers, setNumbers] = useState(false)
  const [text, setText] = useState(() => generateTimedText())
  const [ghost, setGhost] = useState<GhostCandidate | null>(null)
  const [lastResult, setLastResult] = useState<{
    stats: TypingStats
    history: { time: number; wpm: number }[]
    saved: boolean
    saveError: string | null
    ghostWpm: number | null
  } | null>(null)

  useEffect(() => {
    if (!practicingWeakKeys || !user) return
    getProfile(user.id)
      .then((p) => {
        const top = Object.entries(p.key_mistake_stats ?? {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([k]) => k)
        setWeakChars(top)
      })
      .catch(() => setWeakChars([]))
  }, [practicingWeakKeys, user])

  const generateText = useCallback(() => {
    if (ghost) return ghost.text_snapshot
    if (practicingWeakKeys && weakChars.length > 0) {
      return generateWeakKeyText(weakChars, mode === 'time' ? 200 : wordCount)
    }
    if (language === 'amharic') {
      if (amharicContent === 'fidel') {
        return generateFidelDrill(mode === 'time' ? 500 : wordCount, fidelFamily)
      }
      return mode === 'time' ? generateAmharicTimedText() : generateAmharicWords(wordCount)
    }
    if (useCode) return generateCodeText(mode === 'time' ? 200 : wordCount)
    const opts = { punctuation, numbers }
    return mode === 'time' ? generateTimedText(opts) : generateWords(wordCount, opts)
  }, [
    mode,
    wordCount,
    language,
    amharicContent,
    fidelFamily,
    useCode,
    punctuation,
    numbers,
    practicingWeakKeys,
    weakChars,
    ghost,
  ])

  const handleFinish = useCallback(
    async (
      stats: TypingStats,
      history: { time: number; wpm: number }[],
      keyMistakes: Record<string, number>,
      progressSnapshot: { t: number; progress: number }[]
    ) => {
      let saved = false
      let saveError: string | null = null
      if (user) {
        try {
          await recordPracticeResult({
            wpm: stats.wpm,
            rawWpm: stats.rawWpm,
            accuracy: stats.accuracy,
            mistakes: stats.errors,
            mode,
            duration: mode === 'time' ? duration : undefined,
            wordCount: mode === 'words' ? wordCount : undefined,
            keyMistakes,
            textSnapshot: text,
            progressSnapshot,
          })
          saved = true
        } catch (err) {
          saved = false
          saveError = formatSupabaseError(
            err,
            'Could not save result. Make sure the latest Supabase migrations have been applied.'
          )
        }
      }
      setLastResult({ stats, history, saved, saveError, ghostWpm: ghost ? Math.round(ghost.wpm) : null })
    },
    [user, mode, duration, wordCount, text, ghost]
  )

  const engine = useTypingEngine({
    text,
    mode,
    duration: mode === 'time' ? duration : undefined,
    onFinish: (stats) => handleFinish(stats, engine.wpmHistory, engine.keyMistakes, engine.progressHistory),
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
  }, [mode, duration, wordCount, language, amharicContent, fidelFamily, useCode, punctuation, numbers, weakChars, ghost])

  function handleLanguageChange(lang: Language) {
    setLanguage(lang)
    if (lang === 'amharic') {
      setUseCode(false)
      setPunctuation(false)
      setNumbers(false)
    }
  }

  function handleSelectGhost(g: GhostCandidate) {
    setGhost(g)
    if (mode === 'time' && g.duration) setDuration(g.duration as 15 | 30 | 60 | 120)
    if (mode === 'words' && g.word_count) setWordCount(g.word_count as 10 | 25 | 50 | 100)
  }

  function handleClearGhost() {
    setGhost(null)
  }

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
      {practicingWeakKeys && (
        <div className="glass-panel flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-ink-200">
            <Target className="size-4 text-caret" />
            Practicing your weak keys
            {weakChars.length > 0 && (
              <span className="font-mono text-ink-400">
                {weakChars.map((c) => (c === ' ' ? '␣' : c)).join(' ')}
              </span>
            )}
          </span>
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-200"
          >
            <X className="size-3.5" /> Exit
          </button>
        </div>
      )}

      {!lastResult && (
        <ModeSelector
          mode={mode}
          duration={duration}
          wordCount={wordCount}
          language={language}
          amharicContent={amharicContent}
          fidelFamily={fidelFamily}
          useCode={useCode}
          punctuation={punctuation}
          numbers={numbers}
          onModeChange={setMode}
          onDurationChange={setDuration}
          onWordCountChange={setWordCount}
          onLanguageChange={handleLanguageChange}
          onAmharicContentChange={setAmharicContent}
          onFidelFamilyChange={setFidelFamily}
          onToggleCode={() => setUseCode((v) => !v)}
          onTogglePunctuation={() => setPunctuation((v) => !v)}
          onToggleNumbers={() => setNumbers((v) => !v)}
        />
      )}

      {lastResult ? (
        <>
          <ResultsPanel stats={lastResult.stats} wpmHistory={lastResult.history} onRestart={newTest} />
          {lastResult.ghostWpm !== null && (
            <p
              className={cn(
                'text-center text-sm font-mono',
                lastResult.stats.wpm >= lastResult.ghostWpm ? 'text-correct' : 'text-incorrect'
              )}
            >
              {lastResult.stats.wpm >= lastResult.ghostWpm
                ? `You beat your ghost by ${lastResult.stats.wpm - lastResult.ghostWpm} wpm! 👻`
                : `Your ghost won by ${lastResult.ghostWpm - lastResult.stats.wpm} wpm.`}
            </p>
          )}
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
          <div className="mb-6 flex items-center justify-between">
            <LiveStats stats={engine.stats} timeRemaining={engine.timeRemaining} />
            <div className="flex items-center gap-1">
              <GhostPicker
                mode={mode}
                duration={duration}
                wordCount={wordCount}
                active={!!ghost}
                onSelect={handleSelectGhost}
                onClear={handleClearGhost}
              />
              <button
                type="button"
                onClick={toggleVirtualKeyboard}
                disabled={language === 'amharic'}
                title={
                  language === 'amharic'
                    ? 'On-screen keyboard is unavailable for Amharic — use your device\'s Amharic input method'
                    : showVirtualKeyboard
                      ? 'Hide on-screen keyboard'
                      : 'Show on-screen keyboard'
                }
                className={cn(
                  'rounded-md p-1.5 transition-colors disabled:opacity-30',
                  showVirtualKeyboard && language !== 'amharic' ? 'text-caret' : 'text-ink-500 hover:text-ink-300'
                )}
              >
                <Keyboard className="size-4" />
              </button>
            </div>
          </div>

          {ghost && (
            <div className="mb-4">
              <GhostRaceBar
                yourProgress={text.length ? engine.typed.length / text.length : 0}
                elapsedSeconds={engine.elapsedSeconds}
                ghostSamples={ghost.progress_snapshot}
                ghostWpm={Math.round(ghost.wpm)}
              />
            </div>
          )}

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

          {showVirtualKeyboard && language !== 'amharic' && (
            <div className="mt-6 border-t border-ink-700/60 pt-6">
              <VirtualKeyboard activeChar={engine.typed[engine.typed.length - 1] ?? null} />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
