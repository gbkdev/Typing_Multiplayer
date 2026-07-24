import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { CharState } from '@/types'

interface TypingDisplayProps {
  text: string
  charStateAt: (index: number) => CharState
  typedLength: number
}

const stateClasses: Record<CharState, string> = {
  pending: 'text-ink-500',
  current: 'text-ink-100',
  correct: 'text-ink-100',
  incorrect: 'text-incorrect bg-incorrect/10',
  extra: 'text-incorrect',
}

// How many lines of text stay visible at once — matches Monkeytype's
// "scroll" test mode, where completed lines slide up and out of view.
const VISIBLE_LINES = 3

export function TypingDisplay({ text, charStateAt, typedLength }: TypingDisplayProps) {
  const chars = useMemo(() => text.split(''), [text])
  const contentRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const [containerHeight, setContainerHeight] = useState<number>()
  const [offset, setOffset] = useState(0)

  // Recompute the scroll offset (and visible-window height) whenever the
  // caret moves or the text changes. Reading real layout via
  // getComputedStyle/offsetTop means this keeps working across breakpoints
  // and font-size changes without hardcoding line-height math.
  useLayoutEffect(() => {
    function recompute() {
      const content = contentRef.current
      if (!content) return
      const lineHeight = parseFloat(getComputedStyle(content).lineHeight || '') || 32
      setContainerHeight(lineHeight * VISIBLE_LINES)

      const caret = caretRef.current
      if (caret) {
        // Keep the caret's line as the second visible row, so there's
        // always one line of context above it and two below.
        const target = Math.max(caret.offsetTop - lineHeight, 0)
        setOffset(target)
      } else {
        setOffset(0)
      }
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [typedLength, text])

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: containerHeight ? `${containerHeight}px` : undefined }}
    >
      <div
        ref={contentRef}
        className="relative font-mono text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose tracking-wide select-none transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${offset}px)` }}
        aria-hidden
      >
        {chars.map((char, i) => {
          const state = charStateAt(i)
          return (
            <span key={i} className="relative" ref={i === typedLength ? caretRef : undefined}>
              {i === typedLength && (
                <span className="absolute -left-[1px] top-0 h-full w-[2px] bg-caret animate-caret-blink" />
              )}
              {/* A real space, not \u00A0 — this is what lets the browser
                  wrap the paragraph at word boundaries like Monkeytype,
                  instead of one unbreakable line that scrolls sideways. */}
              <span className={cn(stateClasses[state])}>{char}</span>
            </span>
          )
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-ink-900/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-ink-900/80 to-transparent" />
    </div>
  )
}
