import { motion } from 'framer-motion'
import type { RoomPlayer } from '@/types'
import { cn } from '@/lib/cn'

export function PlayerProgressBar({ player, isSelf }: { player: RoomPlayer; isSelf: boolean }) {
  const pct = Math.min(Math.round(player.progress * 100), 100)
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-24 shrink-0 truncate text-xs font-mono', isSelf ? 'text-caret' : 'text-ink-400')}>
        {player.profile?.username ?? 'player'}
      </span>
      <div className="relative h-2 flex-1 rounded-full bg-ink-800 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', isSelf ? 'bg-caret' : 'bg-info')}
          animate={{ width: `${pct}%` }}
          transition={{ ease: 'linear', duration: 0.15 }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-mono text-ink-500 tabular-nums">
        {player.finished ? `#${player.position}` : `${Math.round(player.wpm)} wpm`}
      </span>
    </div>
  )
}
