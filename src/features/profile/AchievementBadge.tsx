import { Trophy, Zap, Rocket, Target, Flame, Crown, Flag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

const iconMap: Record<string, typeof Trophy> = {
  trophy: Trophy,
  zap: Zap,
  rocket: Rocket,
  target: Target,
  flame: Flame,
  crown: Crown,
  flag: Flag,
}

interface AchievementBadgeProps {
  title: string
  description: string
  icon: string
  earned: boolean
}

export function AchievementBadge({ title, description, icon, earned }: AchievementBadgeProps) {
  const Icon = iconMap[icon] ?? Trophy
  return (
    <Card
      className={cn('flex flex-col items-center gap-2 p-4 text-center', !earned && 'opacity-40 grayscale')}
      title={description}
    >
      <div className={cn('rounded-full p-3', earned ? 'bg-caret/15 text-caret' : 'bg-ink-800 text-ink-500')}>
        <Icon className="size-5" />
      </div>
      <span className="text-xs font-medium text-ink-100">{title}</span>
    </Card>
  )
}
