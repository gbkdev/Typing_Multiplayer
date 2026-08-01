import { Link } from 'react-router-dom'
import { Swords } from 'lucide-react'

interface DuelInviteBubbleProps {
  roomId: string
  mine: boolean
}

export function DuelInviteBubble({ roomId, mine }: DuelInviteBubbleProps) {
  return (
    <Link
      to={`/rooms/${roomId}`}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90 ${
        mine ? 'bg-ink-950/20 text-ink-950' : 'bg-caret/20 text-caret'
      }`}
    >
      <Swords className="size-4 shrink-0" />
      {mine ? 'Duel invite sent — join it' : 'Duel invite — tap to join!'}
    </Link>
  )
}
