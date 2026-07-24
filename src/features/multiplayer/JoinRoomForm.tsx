import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { joinRoomByCode } from '@/services/rooms'

export function JoinRoomForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const room = await joinRoomByCode(code.trim(), user.id)
      navigate(`/rooms/${room.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Room not found.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="INVITE CODE"
        maxLength={6}
        className="font-mono tracking-widest uppercase"
      />
      <Button type="submit" variant="secondary" disabled={loading || code.length < 4}>
        Join
      </Button>
      {error && <p className="text-xs text-incorrect self-center">{error}</p>}
    </form>
  )
}
