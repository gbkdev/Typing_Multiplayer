import { useState } from 'react'
import { X } from 'lucide-react'
import { reportUser, type ReportReason } from '@/services/blocks'

interface ReportModalProps {
  otherUserId: string
  otherUsername: string
  onClose: () => void
}

const reasons: { key: ReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment or abuse' },
  { key: 'inappropriate_content', label: 'Inappropriate content' },
  { key: 'cheating', label: 'Cheating' },
  { key: 'other', label: 'Something else' },
]

export function ReportModal({ otherUserId, otherUsername, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)
    setError(null)
    try {
      await reportUser(otherUserId, reason, details)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm text-ink-100">Report {otherUsername}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-200">
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <p className="text-sm text-correct">Thanks — we've received your report.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-1.5">
              {reasons.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    reason === r.key ? 'bg-caret text-ink-950' : 'bg-ink-800 text-ink-300 hover:bg-ink-800/70'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              maxLength={500}
              rows={3}
              className="mb-3 w-full resize-none rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
            />

            {error && <p className="mb-2 text-xs text-incorrect">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full rounded-lg bg-incorrect/90 py-2 text-sm font-medium text-white hover:bg-incorrect disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
