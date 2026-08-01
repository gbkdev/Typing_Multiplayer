import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { KEY_ROWS, FINGER_MAP, resolveChar } from './keyboardData'

interface VirtualKeyboardProps {
  /** The character just typed — highlighted as feedback after each keystroke, rather than showing the upcoming key in advance. */
  activeChar: string | null | undefined
}

export function VirtualKeyboard({ activeChar }: VirtualKeyboardProps) {
  const resolved = useMemo(() => (activeChar ? resolveChar(activeChar) : null), [activeChar])

  const activeBase = resolved?.base ?? null
  const assignment = activeBase ? FINGER_MAP[activeBase] : undefined
  const needsShift = !!resolved?.needsShift

  // The Shift key used is always on the hand opposite the letter's finger.
  const shiftHand = needsShift ? (assignment?.hand === 'left' ? 'right' : 'left') : null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-1 select-none" aria-hidden="true">
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {row.map((key, ki) => {
            const isActive = key.char !== undefined && key.char === activeBase
            const isShiftKey = key.label === 'shift'
            const isLeftShiftKey = isShiftKey && ki === 0
            const shiftHighlighted =
              (isLeftShiftKey && shiftHand === 'left') || (isShiftKey && !isLeftShiftKey && shiftHand === 'right')

            return (
              <div
                key={ki}
                style={{ flexGrow: key.width ?? 1, flexBasis: 0 }}
                className={cn(
                  'flex h-8 items-center justify-center rounded-md border font-mono text-[11px] uppercase tracking-wide transition-colors sm:h-9 sm:text-xs',
                  isActive || shiftHighlighted
                    ? 'border-caret bg-caret/20 text-caret'
                    : 'border-ink-700 bg-ink-900/60 text-ink-400'
                )}
              >
                {key.label}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
