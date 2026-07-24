import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signUpWithEmail } from '@/services/auth'
import { formatSupabaseError } from '@/lib/errors'
import { normalizeUsername, usernameValidationError } from '@/lib/username'

export function RegisterForm() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const chosen = normalizeUsername(username)
    const validation = usernameValidationError(chosen)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await signUpWithEmail(email, password, chosen)
      navigate('/', { replace: true })
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not create account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <Input
        id="username"
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
        placeholder="speedtyper"
        required
        minLength={3}
        maxLength={20}
      />
      <p className="text-xs text-ink-500">3–20 characters · letters, numbers, underscores</p>
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-xs text-incorrect">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        Create account
      </Button>
    </form>
  )
}
