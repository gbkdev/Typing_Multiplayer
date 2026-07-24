// Placeholder local corpus. Phase 3 replaces this with the `texts` Supabase table.
const WORD_POOL = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'time', 'space',
  'light', 'dark', 'water', 'fire', 'earth', 'wind', 'code', 'build', 'ship', 'test',
  'run', 'walk', 'think', 'write', 'speak', 'listen', 'learn', 'teach', 'grow', 'change',
  'system', 'process', 'design', 'model', 'signal', 'pattern', 'structure', 'function', 'value', 'state',
  'quiet', 'loud', 'fast', 'slow', 'bright', 'clear', 'sharp', 'soft', 'strong', 'gentle',
  'river', 'mountain', 'ocean', 'forest', 'desert', 'island', 'valley', 'canyon', 'meadow', 'harbor',
]

const QUOTES = [
  'The only way to do great work is to love what you do.',
  'Simplicity is the ultimate sophistication in every design that lasts.',
  'The best time to plant a tree was twenty years ago. The second best time is now.',
  'Practice does not make perfect. Only perfect practice makes perfect.',
  'What we think, we become, one careful choice at a time.',
]

export function generateWords(count: number): string {
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    words.push(WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)])
  }
  return words.join(' ')
}

export function generateTimedText(): string {
  // Generous word count; the timer cuts it short, not the text length.
  return generateWords(200)
}

export function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}
