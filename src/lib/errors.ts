export function formatSupabaseError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    const combined = [e.message, e.details, e.hint].filter(Boolean).join(' ')
    if (combined.includes('profiles_username_key') || combined.includes('Username is already taken')) {
      return 'Username is already taken. Try another one.'
    }
    const parts = [e.message, e.details, e.hint].filter(Boolean)
    if (parts.length > 0) return parts.join(' — ')
  }
  if (err instanceof Error && err.message) {
    if (err.message.includes('profiles_username_key') || err.message.includes('Username is already taken')) {
      return 'Username is already taken. Try another one.'
    }
    return err.message
  }
  return fallback
}
