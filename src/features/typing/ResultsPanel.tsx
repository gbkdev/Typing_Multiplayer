import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { TypingStats } from '@/types'

interface ResultsPanelProps {
  stats: TypingStats
  wpmHistory: { time: number; wpm: number }[]
  onRestart: () => void
}

export function ResultsPanel({ stats, wpmHistory, onRestart }: ResultsPanelProps) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <ResultStat label="wpm" value={stats.wpm} accent />
        <ResultStat label="raw wpm" value={stats.rawWpm} />
        <ResultStat label="accuracy" value={`${stats.accuracy}%`} />
        <ResultStat label="errors" value={stats.errors} />
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={wpmHistory}>
            <CartesianGrid stroke="#212838" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#6b7690', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7690', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#171c28', border: '1px solid #2d3648', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a0b8' }}
            />
            <Line type="monotone" dataKey="wpm" stroke="#e8c14a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3">
        <Button onClick={onRestart}>
          <RotateCcw className="size-4" /> Next test
        </Button>
        <span className="self-center text-xs text-ink-500">tab or ctrl+enter to redo</span>
      </div>
    </Card>
  )
}

function ResultStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`font-mono text-3xl font-semibold tabular-nums ${accent ? 'text-caret' : 'text-ink-100'}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-ink-500">{label}</span>
    </div>
  )
}
