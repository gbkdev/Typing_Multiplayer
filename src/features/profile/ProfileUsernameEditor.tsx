import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { setUsername } from '@/services/profile'
import { formatSupabaseError } from '@/lib/errors'
import { normalizeUsername, usernameValidationError } from '@/lib/username'

export function ProfileUsernameEditor({
  currentUsername,
  onUpdated,
}: {
  currentUsername: string
  onUpdated: (username: string) => void
}) {
  const [username, setUsernameInput] = useState(currentUsername)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const value = normalizeUsername(username)
    const validation = usernameValidationError(value)
    if (validation) {
      setError(validation)
      return
    }
    if (value === currentUsername) return
    setError(null)
    setSaved(false)
    setLoading(true)
    try {
      await setUsername(value)
      onUpdated(value)
      setSaved(true)
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not update username.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-ink-500">Username</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          id="profile-username"
          label="Display name"
          value={username}
          onChange={(e) => {
            setSaved(false)
            setUsernameInput(e.target.value.replace(/\s/g, ''))
          }}
          maxLength={20}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleSave} disabled={loading}>
          Save
        </Button>
      </div>
      {saved && <p className="text-xs text-correct">Username updated.</p>}
      {error && <p className="text-xs text-incorrect">{error}</p>}
    </Card>
  )
}
