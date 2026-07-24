const AUTO_PREFIXES = ['player_', 'pending_'] as const

export function normalizeUsername(raw: string) {
  return raw.trim()
}

export function isValidUsername(username: string) {
  const u = normalizeUsername(username)
  if (u.length < 3 || u.length > 20) return false
  if (AUTO_PREFIXES.some((p) => u.startsWith(p))) return false
  return /^[a-zA-Z0-9_]+$/.test(u)
}

export function needsUsernameChoice(username: string | null | undefined) {
  if (!username) return true
  return AUTO_PREFIXES.some((p) => username.startsWith(p))
}

export function usernameValidationError(username: string): string | null {
  const u = normalizeUsername(username)
  if (u.length < 3) return 'Username must be at least 3 characters.'
  if (u.length > 20) return 'Username must be at most 20 characters.'
  if (AUTO_PREFIXES.some((p) => u.startsWith(p))) return 'Pick a personal username (not a system placeholder).'
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Use only letters, numbers, and underscores.'
  return null
}
