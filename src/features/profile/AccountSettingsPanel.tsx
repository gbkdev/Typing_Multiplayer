import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { updateProfile } from '@/services/profile'
import { formatSupabaseError } from '@/lib/errors'
import { COUNTRY_OPTIONS, countryFlag } from '@/lib/flag'
import type { Profile } from '@/types'

interface AccountSettingsPanelProps {
  profile: Profile
  onUpdated: (updates: Partial<Profile>) => void
}

export function AccountSettingsPanel({ profile, onUpdated }: AccountSettingsPanelProps) {
  const [bio, setBio] = useState(profile.bio ?? '')
  const [country, setCountry] = useState(profile.country ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updates = { bio: bio.trim() || null, country: country || null }
      await updateProfile(profile.id, updates)
      onUpdated(updates)
      setSaved(true)
    } catch (err) {
      setError(formatSupabaseError(err, 'Could not save your settings.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xs uppercase tracking-widest text-ink-500">Account settings</h2>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-400">Bio</span>
        <textarea
          value={bio}
          onChange={(e) => {
            setSaved(false)
            setBio(e.target.value)
          }}
          maxLength={160}
          rows={3}
          placeholder="Say something about yourself…"
          className="resize-none rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-400">Country</span>
        <select
          value={country}
          onChange={(e) => {
            setSaved(false)
            setCountry(e.target.value)
          }}
          className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caret"
        >
          <option value="">No country set</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {countryFlag(c.code)} {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
          Save changes
        </Button>
        {saved && <p className="text-xs text-correct">Saved.</p>}
        {error && <p className="text-xs text-incorrect">{error}</p>}
      </div>
    </Card>
  )
}
