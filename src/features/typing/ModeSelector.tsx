import { cn } from '@/lib/cn'
import { FIDEL_CHART } from './textBank'
import type { EngineMode } from './useTypingEngine'

export type Language = 'english' | 'amharic'
export type AmharicContent = 'words' | 'fidel'

interface ModeSelectorProps {
  mode: EngineMode
  duration: 15 | 30 | 60 | 120
  wordCount: 10 | 25 | 50 | 100
  language: Language
  amharicContent: AmharicContent
  fidelFamily: string | undefined
  useCode: boolean
  punctuation: boolean
  numbers: boolean
  onModeChange: (mode: EngineMode) => void
  onDurationChange: (d: 15 | 30 | 60 | 120) => void
  onWordCountChange: (w: 10 | 25 | 50 | 100) => void
  onLanguageChange: (lang: Language) => void
  onAmharicContentChange: (content: AmharicContent) => void
  onFidelFamilyChange: (family: string | undefined) => void
  onToggleCode: () => void
  onTogglePunctuation: () => void
  onToggleNumbers: () => void
}

const durations = [15, 30, 60, 120] as const
const wordCounts = [10, 25, 50, 100] as const

export function ModeSelector({
  mode,
  duration,
  wordCount,
  language,
  amharicContent,
  fidelFamily,
  useCode,
  punctuation,
  numbers,
  onModeChange,
  onDurationChange,
  onWordCountChange,
  onLanguageChange,
  onAmharicContentChange,
  onFidelFamilyChange,
  onToggleCode,
  onTogglePunctuation,
  onToggleNumbers,
}: ModeSelectorProps) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-4 px-4 py-2.5 text-sm font-mono">
      <Pill active={language === 'english'} onClick={() => onLanguageChange('english')}>
        english
      </Pill>
      <Pill active={language === 'amharic'} onClick={() => onLanguageChange('amharic')}>
        አማርኛ
      </Pill>

      <div className="h-4 w-px bg-ink-700" />

      {language === 'english' && (
        <>
          <Pill active={punctuation} disabled={useCode} onClick={onTogglePunctuation}>
            @punctuation
          </Pill>
          <Pill active={numbers} disabled={useCode} onClick={onToggleNumbers}>
            #numbers
          </Pill>
          <Pill active={useCode} onClick={onToggleCode}>
            {'</>'} code
          </Pill>

          <div className="h-4 w-px bg-ink-700" />
        </>
      )}

      {language === 'amharic' && (
        <>
          <Pill active={amharicContent === 'words'} onClick={() => onAmharicContentChange('words')}>
            words
          </Pill>
          <Pill active={amharicContent === 'fidel'} onClick={() => onAmharicContentChange('fidel')}>
            ፊደል fidel
          </Pill>

          {amharicContent === 'fidel' && (
            <select
              value={fidelFamily ?? 'all'}
              onChange={(e) => onFidelFamilyChange(e.target.value === 'all' ? undefined : e.target.value)}
              className="rounded-md border border-ink-700 bg-ink-900 px-2 py-0.5 text-xs text-ink-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-caret"
            >
              <option value="all">all forms mixed</option>
              {FIDEL_CHART.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.forms.join(' ')}
                </option>
              ))}
            </select>
          )}

          <div className="h-4 w-px bg-ink-700" />
        </>
      )}

      <Pill active={mode === 'time'} onClick={() => onModeChange('time')}>
        time
      </Pill>
      <Pill active={mode === 'words'} onClick={() => onModeChange('words')}>
        words
      </Pill>

      <div className="h-4 w-px bg-ink-700" />

      {mode === 'time'
        ? durations.map((d) => (
            <Pill key={d} active={duration === d} onClick={() => onDurationChange(d)}>
              {d}
            </Pill>
          ))
        : wordCounts.map((w) => (
            <Pill key={w} active={wordCount === w} onClick={() => onWordCountChange(w)}>
              {w}
            </Pill>
          ))}
    </div>
  )
}

function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-2 py-0.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
        active ? 'text-caret' : 'text-ink-500 hover:text-ink-300'
      )}
    >
      {children}
    </button>
  )
}
