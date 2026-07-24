import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { setUsername } from '@/services/profile'
import { normalizeUsername, usernameValidationError } from '@/lib/username'
import { formatSupabaseError } from '@/lib/errors'

interface ChooseUsernameFormProps {
  onSuccess: () => void
  submitLabel?: string
}

export function ChooseUsernameForm({ onSuccess, submitLabel = 'Save username' }: ChooseUsernameFormProps) {
  const [username, setUsernameInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = normalizeUsername(username)
    const validation = usernameValidationError(value)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await setUsername(value)
      onSuccess()
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not save username.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <Input
        id="choose-username"
        label="Username"
        value={username}
        onChange={(e) => setUsernameInput(e.target.value)}
        placeholder="speedtyper"
        required
        minLength={3}
        maxLength={20}
        autoComplete="username"
        autoFocus
      />
      <p className="text-xs text-ink-500">3–20 characters · letters, numbers, underscores</p>
      {error && <p className="text-xs text-incorrect">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
