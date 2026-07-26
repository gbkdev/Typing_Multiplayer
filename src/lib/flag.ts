/** Convert a 2-letter ISO country code (e.g. "US") into its flag emoji. */
export function countryFlag(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return null
  const codePoints = [...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/** A short list of common countries for the account settings picker. */
export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'PL', name: 'Poland' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'RU', name: 'Russia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'AR', name: 'Argentina' },
]
