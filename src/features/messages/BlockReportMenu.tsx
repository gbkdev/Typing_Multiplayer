import { useEffect, useRef, useState } from 'react'
import { MoreVertical, ShieldOff, Flag } from 'lucide-react'
import { blockUser } from '@/services/blocks'
import { ReportModal } from './ReportModal'

interface BlockReportMenuProps {
  otherUserId: string
  otherUsername: string
  onBlocked: () => void
}

export function BlockReportMenu({ otherUserId, otherUsername, onBlocked }: BlockReportMenuProps) {
  const [open, setOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  async function handleBlock() {
    setBlocking(true)
    setError(null)
    try {
      await blockUser(otherUserId)
      setOpen(false)
      onBlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not block this user.')
    } finally {
      setBlocking(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="rounded-md p-1.5 text-ink-500 hover:text-ink-200">
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 rounded-lg border border-ink-700 bg-ink-900 py-1.5 shadow-xl">
          <button
            onClick={() => {
              setReporting(true)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-300 hover:bg-ink-800/60 hover:text-ink-100"
          >
            <Flag className="size-4" />
            Report {otherUsername}
          </button>
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-incorrect hover:bg-ink-800/60 disabled:opacity-50"
          >
            <ShieldOff className="size-4" />
            {blocking ? 'Blocking…' : `Block ${otherUsername}`}
          </button>
          {error && <p className="px-3 pt-1 text-xs text-incorrect">{error}</p>}
        </div>
      )}

      {reporting && (
        <ReportModal otherUsername={otherUsername} onClose={() => setReporting(false)} otherUserId={otherUserId} />
      )}
    </div>
  )
}
