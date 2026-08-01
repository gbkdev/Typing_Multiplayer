import { useEffect, useRef, useState } from 'react'
import { Ghost, Loader2 } from 'lucide-react'
import { listGhostCandidates, type GhostCandidate } from '@/services/matches'
import type { EngineMode } from './useTypingEngine'

interface GhostPickerProps {
  mode: EngineMode
  duration: number
  wordCount: number
  active: boolean
  onSelect: (ghost: GhostCandidate) => void
  onClear: () => void
}

export function GhostPicker({ mode, duration, wordCount, active, onSelect, onClear }: GhostPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<GhostCandidate[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  function handleOpen() {
    if (active) {
      onClear()
      return
    }
    setOpen((v) => !v)
    if (!open) {
      setLoading(true)
      listGhostCandidates({ mode, duration, wordCount })
        .then(setCandidates)
        .catch(() => setCandidates([]))
        .finally(() => setLoading(false))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        title={active ? 'Stop racing ghost' : 'Race a ghost of your past run'}
        className={`rounded-md p-1.5 transition-colors ${active ? 'text-caret' : 'text-ink-500 hover:text-ink-300'}`}
      >
        <Ghost className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-ink-700 bg-ink-900 py-1.5 shadow-xl">
          <p className="px-3 pb-1.5 text-[10px] uppercase tracking-widest text-ink-500">Race a past run</p>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-ink-500" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-3 text-xs text-ink-500">
              No saved runs yet for this test — finish a few races here first.
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-100 hover:bg-ink-800/60"
              >
                <span className="font-mono">{Math.round(c.wpm)} wpm</span>
                <span className="text-[10px] text-ink-500">{new Date(c.created_at).toLocaleDateString()}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
