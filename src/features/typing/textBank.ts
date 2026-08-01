// Placeholder local corpus. Phase 3 replaces this with the `texts` Supabase table.
const WORD_POOL = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'time', 'space',
  'light', 'dark', 'water', 'fire', 'earth', 'wind', 'code', 'build', 'ship', 'test',
  'run', 'walk', 'think', 'write', 'speak', 'listen', 'learn', 'teach', 'grow', 'change',
  'system', 'process', 'design', 'model', 'signal', 'pattern', 'structure', 'function', 'value', 'state',
  'quiet', 'loud', 'fast', 'slow', 'bright', 'clear', 'sharp', 'soft', 'strong', 'gentle',
  'river', 'mountain', 'ocean', 'forest', 'desert', 'island', 'valley', 'canyon', 'meadow', 'harbor',
  'apple', 'orange', 'grape', 'lemon', 'melon', 'cherry', 'peach', 'plum', 'berry', 'mango',
  'table', 'chair', 'window', 'door', 'floor', 'wall', 'roof', 'stair', 'garden', 'fence',
  'happy', 'proud', 'brave', 'kind', 'calm', 'eager', 'lucky', 'wise', 'bold', 'fair',
  'travel', 'journey', 'road', 'bridge', 'tunnel', 'station', 'engine', 'wheel', 'cargo', 'anchor',
  'planet', 'galaxy', 'comet', 'meteor', 'orbit', 'rocket', 'star', 'moon', 'sun', 'cloud',
  'music', 'rhythm', 'melody', 'guitar', 'piano', 'drum', 'violin', 'singer', 'chorus', 'stage',
  'paper', 'pencil', 'letter', 'story', 'novel', 'poem', 'author', 'page', 'chapter', 'plot',
  'silver', 'golden', 'copper', 'bronze', 'marble', 'crystal', 'diamond', 'pearl', 'amber', 'jade',
  'winter', 'summer', 'autumn', 'spring', 'season', 'harvest', 'frost', 'breeze', 'storm', 'rain',
  'castle', 'tower', 'palace', 'temple', 'market', 'street', 'village', 'city', 'harbor', 'square',
  'eagle', 'falcon', 'raven', 'sparrow', 'heron', 'swan', 'owl', 'hawk', 'crane', 'dove',
  'iron', 'steel', 'stone', 'wood', 'glass', 'cloth', 'leather', 'rope', 'thread', 'metal',
  'friend', 'family', 'stranger', 'neighbor', 'partner', 'mentor', 'rival', 'guest', 'host', 'crowd',
  'orchard', 'thicket', 'grove', 'hollow', 'ridge', 'plain', 'marsh', 'delta', 'summit', 'shore',
]

const QUOTES = [
  'The only way to do great work is to love what you do.',
  'Simplicity is the ultimate sophistication in every design that lasts.',
  'The best time to plant a tree was twenty years ago. The second best time is now.',
  'Practice does not make perfect. Only perfect practice makes perfect.',
  'What we think, we become, one careful choice at a time.',
  'Well begun is half done, and a good start carries you far.',
  'A journey of a thousand miles begins with a single step forward.',
  'Fortune favors the bold who keep moving even when the path is unclear.',
  'Small daily improvements are the key to staggering long-term results.',
  'The expert in anything was once a beginner who refused to quit.',
]

/**
 * Draws words without replacement from a shuffled copy of the pool ("shuffle
 * bag"), refilling and reshuffling once exhausted. This guarantees every
 * word in the pool is used before any repeats, and — by checking the
 * boundary between bags — a word can never immediately repeat itself either.
 */
function createWordBag(pool: string[]) {
  let bag: string[] = []

  function refill() {
    bag = [...pool]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
  }

  return function next(previous: string | undefined): string {
    if (bag.length === 0) refill()
    // Avoid an immediate repeat across a bag boundary.
    if (bag[bag.length - 1] === previous && bag.length > 1) {
      const swapWith = Math.floor(Math.random() * (bag.length - 1))
      ;[bag[bag.length - 1], bag[swapWith]] = [bag[swapWith], bag[bag.length - 1]]
    }
    return bag.pop()!
  }
}

const drawWord = createWordBag(WORD_POOL)

// Real, common Amharic (Ge'ez script) words — everyday vocabulary, not
// placeholder text. Grouped loosely by theme for reference.
const AMHARIC_WORD_POOL = [
  // greetings / basics
  'ሰላም', 'እሺ', 'አዎ', 'አይ', 'እባክህ', 'አመሰግናለሁ', 'ይቅርታ', 'ደህና',
  // people / family
  'ሰው', 'ልጅ', 'እናት', 'አባት', 'ወንድም', 'እህት', 'ጓደኛ', 'ቤተሰብ', 'ተማሪ', 'መምህር',
  // places
  'ቤት', 'ከተማ', 'ሀገር', 'መንገድ', 'ትምህርት', 'ገበያ', 'ቤተ', 'ቤተክርስቲያን', 'መስጊድ', 'ጽሕፈት',
  // nature
  'ውሃ', 'እሳት', 'ንፋስ', 'ምድር', 'ሰማይ', 'ፀሐይ', 'ጨረቃ', 'ኮከብ', 'ተራራ', 'ወንዝ',
  'ባህር', 'ዛፍ', 'አበባ', 'ሳር', 'ድንጋይ', 'አሸዋ', 'ጫካ', 'በረሃ',
  // time
  'ጊዜ', 'ቀን', 'ሌሊት', 'ጠዋት', 'ማታ', 'አመት', 'ወር', 'ሳምንት', 'ሰዓት', 'ደቂቃ',
  // food
  'እንጀራ', 'ውሀ', 'ቡና', 'ሻይ', 'ምግብ', 'ዳቦ', 'ወተት', 'ማር', 'ጨው', 'በርበሬ',
  // objects
  'መጽሐፍ', 'ብዕር', 'ወረቀት', 'በር', 'መስኮት', 'መኪና', 'ገንዘብ', 'ስልክ', 'ልብስ', 'ጫማ',
  // animals
  'ውሻ', 'ድመት', 'ፈረስ', 'ላም', 'በግ', 'ዶሮ', 'አንበሳ', 'ዝሆን', 'ወፍ', 'አሳ',
  // colors
  'ቀይ', 'ጥቁር', 'ነጭ', 'ቢጫ', 'አረንጓዴ', 'ሰማያዊ',
  // qualities
  'ትልቅ', 'ትንሽ', 'ጥሩ', 'መልካም', 'ውብ', 'ጠንካራ', 'ደካማ', 'አዲስ', 'አሮጌ', 'ረጅም',
  'አጭር', 'ፈጣን', 'ቀርፋፋ', 'ብዙ', 'ጥቂት', 'ውድ', 'ርካሽ',
  // feelings / abstract
  'ፍቅር', 'ደስታ', 'ተስፋ', 'እውነት', 'ህይወት', 'ስራ', 'እውቀት',
  // numbers
  'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ', 'አስር',
  // body
  'ራስ', 'እጅ', 'እግር', 'አይን', 'ጆሮ', 'አፍ', 'ልብ',
]

const drawAmharicWord = createWordBag(AMHARIC_WORD_POOL)

// The Ethiopic "fidel" chart: each base consonant has 7 orders (forms),
// one per vowel sound. Grouped by family so a learner can drill the full
// set of forms for a sound (e.g. ha/hu/hi/ha/he/h/ho) rather than only
// ever seeing whole words.
export interface FidelFamily {
  name: string
  forms: string[] // order 1-7: ä, u, i, a, e, ɨ/none, o
}

export const FIDEL_CHART: FidelFamily[] = [
  { name: 'h', forms: ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'] },
  { name: 'l', forms: ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'] },
  { name: 'H', forms: ['ሐ', 'ሑ', 'ሒ', 'ሓ', 'ሔ', 'ሕ', 'ሖ'] },
  { name: 'm', forms: ['መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ'] },
  { name: 's2', forms: ['ሠ', 'ሡ', 'ሢ', 'ሣ', 'ሤ', 'ሥ', 'ሦ'] },
  { name: 'r', forms: ['ረ', 'ሩ', 'ሪ', 'ራ', 'ሬ', 'ር', 'ሮ'] },
  { name: 's', forms: ['ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ'] },
  { name: 'sh', forms: ['ሸ', 'ሹ', 'ሺ', 'ሻ', 'ሼ', 'ሽ', 'ሾ'] },
  { name: 'q', forms: ['ቀ', 'ቁ', 'ቂ', 'ቃ', 'ቄ', 'ቅ', 'ቆ'] },
  { name: 'b', forms: ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ'] },
  { name: 'v', forms: ['ቨ', 'ቩ', 'ቪ', 'ቫ', 'ቬ', 'ቭ', 'ቮ'] },
  { name: 't', forms: ['ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ'] },
  { name: 'ch', forms: ['ቸ', 'ቹ', 'ቺ', 'ቻ', 'ቼ', 'ች', 'ቾ'] },
  { name: 'n', forms: ['ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ'] },
  { name: 'ny', forms: ['ኘ', 'ኙ', 'ኚ', 'ኛ', 'ኜ', 'ኝ', 'ኞ'] },
  { name: 'a', forms: ['አ', 'ኡ', 'ኢ', 'ኣ', 'ኤ', 'እ', 'ኦ'] },
  { name: 'k', forms: ['ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ'] },
  { name: 'w', forms: ['ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ'] },
  { name: 'z', forms: ['ዘ', 'ዙ', 'ዚ', 'ዛ', 'ዜ', 'ዝ', 'ዞ'] },
  { name: 'zh', forms: ['ዠ', 'ዡ', 'ዢ', 'ዣ', 'ዤ', 'ዥ', 'ዦ'] },
  { name: 'y', forms: ['የ', 'ዩ', 'ዪ', 'ያ', 'ዬ', 'ይ', 'ዮ'] },
  { name: 'd', forms: ['ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ'] },
  { name: 'j', forms: ['ጀ', 'ጁ', 'ጂ', 'ጃ', 'ጄ', 'ጅ', 'ጆ'] },
  { name: 'g', forms: ['ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ'] },
  { name: 'T', forms: ['ጠ', 'ጡ', 'ጢ', 'ጣ', 'ጤ', 'ጥ', 'ጦ'] },
  { name: 'ch2', forms: ['ጨ', 'ጩ', 'ጪ', 'ጫ', 'ጬ', 'ጭ', 'ጮ'] },
  { name: 'p2', forms: ['ጰ', 'ጱ', 'ጲ', 'ጳ', 'ጴ', 'ጵ', 'ጶ'] },
  { name: 'ts', forms: ['ጸ', 'ጹ', 'ጺ', 'ጻ', 'ጼ', 'ጽ', 'ጾ'] },
  { name: 'f', forms: ['ፈ', 'ፉ', 'ፊ', 'ፋ', 'ፌ', 'ፍ', 'ፎ'] },
  { name: 'p', forms: ['ፐ', 'ፑ', 'ፒ', 'ፓ', 'ፔ', 'ፕ', 'ፖ'] },
]

const FIDEL_ALL_FORMS = FIDEL_CHART.flatMap((f) => f.forms)
const drawFidelForm = createWordBag(FIDEL_ALL_FORMS)

const CODE_TOKENS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class',
  'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'new', 'this', 'null',
  'true', 'false', 'typeof', 'interface', 'type', 'extends', 'implements', 'public', 'private', 'static',
  'x', 'y', 'i', 'j', 'n', 'value', 'result', 'data', 'index', 'item',
  'props', 'state', 'config', 'options', 'params', 'response', 'request', 'error', 'callback', 'handler',
]

const CODE_SYMBOLS = ['()', '{}', '[]', '=>', '===', '!=', '&&', '||', '++', '.length']

const drawCodeToken = createWordBag(CODE_TOKENS)

const PUNCTUATION_END = ['.', '.', '.', ',', ',', '!', '?', ';', ':']

interface WordOptions {
  punctuation?: boolean
  numbers?: boolean
}

function withPunctuationAndNumbers(words: string[], opts: WordOptions): string {
  const out: string[] = []
  let sentenceStart = true

  for (let i = 0; i < words.length; i++) {
    let word = words[i]

    if (opts.numbers && Math.random() < 0.08) {
      word = String(Math.floor(Math.random() * 9000) + 100)
    }

    if (sentenceStart) {
      word = word[0].toUpperCase() + word.slice(1)
      sentenceStart = false
    }

    if (opts.punctuation && i < words.length - 1 && Math.random() < 0.16) {
      const mark = PUNCTUATION_END[Math.floor(Math.random() * PUNCTUATION_END.length)]
      word += mark
      if (mark === '.' || mark === '!' || mark === '?') sentenceStart = true
    }

    out.push(word)
  }

  if (opts.punctuation && !/[.!?]$/.test(out[out.length - 1])) {
    out[out.length - 1] += '.'
  }

  return out.join(' ')
}

export function generateWords(count: number, options: WordOptions = {}): string {
  const words: string[] = []
  let previous: string | undefined
  for (let i = 0; i < count; i++) {
    previous = drawWord(previous)
    words.push(previous)
  }
  if (options.punctuation || options.numbers) {
    return withPunctuationAndNumbers(words, options)
  }
  return words.join(' ')
}

export function generateTimedText(options: WordOptions = {}): string {
  // Generous word count; the timer cuts it short, not the text length.
  return generateWords(200, options)
}

export function generateAmharicWords(count: number): string {
  const words: string[] = []
  let previous: string | undefined
  for (let i = 0; i < count; i++) {
    previous = drawAmharicWord(previous)
    words.push(previous)
  }
  return words.join(' ')
}

export function generateAmharicTimedText(): string {
  return generateAmharicWords(200)
}

/**
 * Character-drill practice: individual fidel forms (ሀ ሁ ሂ ሃ ...) rather
 * than whole words — for learning/practicing the 7 orders of each
 * consonant. Pass a family name to drill just that consonant's forms,
 * or omit it to mix forms from every family.
 */
export function generateFidelDrill(count: number, familyName?: string): string {
  const family = familyName ? FIDEL_CHART.find((f) => f.name === familyName) : undefined
  const bag = family ? createWordBag(family.forms) : drawFidelForm

  const forms: string[] = []
  let previous: string | undefined
  for (let i = 0; i < count; i++) {
    previous = bag(previous)
    forms.push(previous)
  }
  return forms.join(' ')
}

export function generateCodeText(count: number): string {
  const tokens: string[] = []
  let previous: string | undefined
  for (let i = 0; i < count; i++) {
    previous = drawCodeToken(previous)
    tokens.push(previous)
    // Sprinkle in code-ish symbols between keywords, not after every single one.
    if (Math.random() < 0.35) {
      tokens.push(CODE_SYMBOLS[Math.floor(Math.random() * CODE_SYMBOLS.length)])
    }
  }
  return tokens.join(' ')
}

export function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}

/**
 * Builds a practice text biased toward words containing the given
 * characters — used for the "practice your weak keys" drill. Falls back to
 * the regular pool if too few matching words exist.
 */
export function generateWeakKeyText(weakChars: string[], count: number): string {
  const lowerChars = weakChars.map((c) => c.toLowerCase()).filter(Boolean)
  if (lowerChars.length === 0) return generateWords(count)

  const matching = WORD_POOL.filter((w) => lowerChars.some((c) => w.includes(c)))
  const pool = matching.length >= 15 ? matching : WORD_POOL

  const bag = createWordBag(pool)
  const words: string[] = []
  let previous: string | undefined
  for (let i = 0; i < count; i++) {
    previous = bag(previous)
    words.push(previous)
  }
  return words.join(' ')
}
