import { cn } from '@/lib/cn'

interface ActivityDay {
  date: string
  races: number
}

export function ActivityHeatmap({ data }: { data: ActivityDay[] }) {
  const byDate = new Map(data.map((d) => [d.date, d.races]))
  const days: string[] = []
  const today = new Date()
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  function level(races: number) {
    if (races === 0) return 'bg-ink-800'
    if (races < 3) return 'bg-caret/25'
    if (races < 6) return 'bg-caret/55'
    return 'bg-caret'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((date) => (
        <div
          key={date}
          title={`${date}: ${byDate.get(date) ?? 0} races`}
          className={cn('h-3 w-3 rounded-[2px]', level(byDate.get(date) ?? 0))}
        />
      ))}
    </div>
  )
}
