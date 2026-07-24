import type { TypingStats } from '@/types'

interface LiveStatsProps {
  stats: TypingStats
  timeRemaining: number | null
}

export function LiveStats({ stats, timeRemaining }: LiveStatsProps) {
  return (
    <div className="flex items-center gap-4 sm:gap-8 font-mono text-caret">
      {timeRemaining !== null && (
        <Stat label="time" value={Math.ceil(timeRemaining).toString()} />
      )}
      <Stat label="wpm" value={stats.wpm.toString()} />
      <Stat label="acc" value={`${stats.accuracy}%`} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-2xl sm:text-3xl font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-ink-500">{label}</span>
    </div>
  )
}
