import { useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { getAttachmentUrl, type DirectMessage } from '@/services/messages'

interface AttachmentBubbleProps {
  message: DirectMessage
}

export function AttachmentBubble({ message }: AttachmentBubbleProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!message.attachment_path) return
    let cancelled = false
    getAttachmentUrl(message.attachment_path)
      .then((u) => {
        if (!cancelled) setUrl(u)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [message.attachment_path])

  if (!message.attachment_path) return null

  if (failed) {
    return <p className="text-xs italic text-ink-500">Attachment unavailable.</p>
  }

  if (!url) {
    return (
      <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-ink-900/40">
        <Loader2 className="size-4 animate-spin text-ink-500" />
      </div>
    )
  }

  if (message.attachment_type === 'image' || message.attachment_type === 'gif') {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={message.attachment_name ?? 'attachment'}
          className="max-h-64 max-w-full rounded-lg object-contain"
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={message.attachment_name ?? undefined}
      className="flex items-center gap-2 rounded-lg bg-ink-900/40 px-3 py-2 text-sm hover:bg-ink-900/70"
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{message.attachment_name ?? 'file'}</span>
    </a>
  )
}
