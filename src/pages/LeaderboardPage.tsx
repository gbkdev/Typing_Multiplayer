import { useEffect, useState } from 'react'
import { Crown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { fetchLeaderboard, type LeaderboardPeriod } from '@/services/leaderboard'

const periods: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all_time', label: 'All Time' },
]

interface Row {
  id: string
  username: string
  avatar_url: string | null
  country: string | null
  best_wpm?: number
  highest_wpm?: number
  average_accuracy: number
  races?: number
  wins?: number
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard(period)
      .then((data) => setRows((data ?? []) as unknown as Row[]))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-mono text-xl text-ink-100">Leaderboard</h1>

      <div className="flex gap-1 glass-panel w-fit px-1.5 py-1.5">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-mono transition-colors',
              period === p.key ? 'bg-caret text-ink-950' : 'text-ink-400 hover:text-ink-100'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-500 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-ink-500">No races recorded for this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-widest text-ink-500">
                <th className="px-4 py-3 font-normal">Rank</th>
                <th className="px-4 py-3 font-normal">Player</th>
                <th className="px-4 py-3 font-normal text-right">WPM</th>
                <th className="px-4 py-3 font-normal text-right">Accuracy</th>
                <th className="px-4 py-3 font-normal text-right">
                  {period === 'all_time' ? 'Wins' : 'Races'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-ink-800/50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-ink-400">
                    {i === 0 ? <Crown className="size-4 text-caret" /> : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-2.5 text-ink-100">{r.username}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-caret">
                    {Math.round(r.best_wpm ?? r.highest_wpm ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-300">
                    {Math.round(r.average_accuracy)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-300">
                    {period === 'all_time' ? r.wins : r.races}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  )
}
