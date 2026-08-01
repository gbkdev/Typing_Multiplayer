import { useMemo } from 'react'

interface GhostRaceBarProps {
  yourProgress: number // 0-1
  elapsedSeconds: number
  ghostSamples: { t: number; progress: number }[]
  ghostWpm: number
}

/** Linear-interpolate the ghost's progress at a given elapsed time from its recorded samples. */
function ghostProgressAt(samples: { t: number; progress: number }[], t: number): number {
  if (samples.length === 0) return 0
  if (t <= samples[0].t) return samples[0].progress
  const last = samples[samples.length - 1]
  if (t >= last.t) return last.progress

  for (let i = 1; i < samples.length; i++) {
    if (samples[i].t >= t) {
      const prev = samples[i - 1]
      const next = samples[i]
      const span = next.t - prev.t
      const ratio = span === 0 ? 0 : (t - prev.t) / span
      return prev.progress + (next.progress - prev.progress) * ratio
    }
  }
  return last.progress
}

export function GhostRaceBar({ yourProgress, elapsedSeconds, ghostSamples, ghostWpm }: GhostRaceBarProps) {
  const ghostProgress = useMemo(
    () => ghostProgressAt(ghostSamples, elapsedSeconds),
    [ghostSamples, elapsedSeconds]
  )
  const ahead = yourProgress >= ghostProgress

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-500">
        <span className={ahead ? 'text-correct' : 'text-ink-500'}>You</span>
        <span>Ghost · {ghostWpm} wpm</span>
      </div>
      <div className="relative h-2 rounded-full bg-ink-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-caret/80 transition-[width] duration-150"
          style={{ width: `${Math.min(yourProgress, 1) * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-ink-300"
          style={{ left: `${Math.min(ghostProgress, 1) * 100}%` }}
          title="Ghost position"
        />
      </div>
    </div>
  )
}
