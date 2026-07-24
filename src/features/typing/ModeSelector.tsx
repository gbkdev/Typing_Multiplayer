import { cn } from '@/lib/cn'
import type { EngineMode } from './useTypingEngine'

interface ModeSelectorProps {
  mode: EngineMode
  duration: 15 | 30 | 60 | 120
  wordCount: 10 | 25 | 50 | 100
  onModeChange: (mode: EngineMode) => void
  onDurationChange: (d: 15 | 30 | 60 | 120) => void
  onWordCountChange: (w: 10 | 25 | 50 | 100) => void
}

const durations = [15, 30, 60, 120] as const
const wordCounts = [10, 25, 50, 100] as const

export function ModeSelector({
  mode,
  duration,
  wordCount,
  onModeChange,
  onDurationChange,
  onWordCountChange,
}: ModeSelectorProps) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-4 px-4 py-2.5 text-sm font-mono">
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

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 rounded-md transition-colors',
        active ? 'text-caret' : 'text-ink-500 hover:text-ink-300'
      )}
    >
      {children}
    </button>
  )
}
