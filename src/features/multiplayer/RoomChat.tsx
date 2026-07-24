import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'

interface ChatMessage {
  id: string
  user_id: string | null
  content: string
  kind: string
  created_at: string
  profile?: { username: string }
}

export function RoomChat({ roomId, userId }: { roomId: string; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('messages')
      .select('*, profile:profiles(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as unknown as ChatMessage[]))

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const row = payload.new as ChatMessage
          const { data: profile } = await supabase.from('profiles').select('username').eq('id', row.user_id!).single()
          setMessages((prev) => [...prev, { ...row, profile: profile ?? undefined }])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    await supabase.from('messages').insert({ room_id: roomId, user_id: userId, content: draft.trim() })
    setDraft('')
  }

  return (
    <Card className="flex flex-col h-80">
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {messages.map((m) => (
          <p key={m.id} className="text-xs">
            <span className="text-caret font-mono">{m.profile?.username ?? 'system'}</span>{' '}
            <span className="text-ink-300">{m.content}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          maxLength={500}
          className="flex-1 rounded-lg bg-ink-800 border border-ink-600 px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
        />
        <button type="submit" className="text-caret hover:text-caret-dim">
          <Send className="size-4" />
        </button>
      </form>
    </Card>
  )
}
