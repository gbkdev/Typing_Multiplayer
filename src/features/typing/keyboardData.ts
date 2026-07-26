export type Hand = 'left' | 'right'
// 0 = pinky, 1 = ring, 2 = middle, 3 = index, 4 = thumb
export type FingerIndex = 0 | 1 | 2 | 3 | 4

export interface FingerAssignment {
  hand: Hand
  finger: FingerIndex
}

export interface KeyDef {
  /** The character this key produces (lowercase / unshifted). Undefined for keys with no char, e.g. Tab. */
  char?: string
  /** What to render on the keycap. */
  label: string
  /** Relative width, in key units (1 = a normal letter key). */
  width?: number
}

export const KEY_ROWS: KeyDef[][] = [
  [
    { char: '`', label: '`' },
    { char: '1', label: '1' },
    { char: '2', label: '2' },
    { char: '3', label: '3' },
    { char: '4', label: '4' },
    { char: '5', label: '5' },
    { char: '6', label: '6' },
    { char: '7', label: '7' },
    { char: '8', label: '8' },
    { char: '9', label: '9' },
    { char: '0', label: '0' },
    { char: '-', label: '-' },
    { char: '=', label: '=' },
    { label: 'delete', width: 2 },
  ],
  [
    { label: 'tab', width: 1.5 },
    { char: 'q', label: 'q' },
    { char: 'w', label: 'w' },
    { char: 'e', label: 'e' },
    { char: 'r', label: 'r' },
    { char: 't', label: 't' },
    { char: 'y', label: 'y' },
    { char: 'u', label: 'u' },
    { char: 'i', label: 'i' },
    { char: 'o', label: 'o' },
    { char: 'p', label: 'p' },
    { char: '[', label: '[' },
    { char: ']', label: ']' },
    { char: '\\', label: '\\', width: 1.5 },
  ],
  [
    { label: 'caps', width: 1.75 },
    { char: 'a', label: 'a' },
    { char: 's', label: 's' },
    { char: 'd', label: 'd' },
    { char: 'f', label: 'f' },
    { char: 'g', label: 'g' },
    { char: 'h', label: 'h' },
    { char: 'j', label: 'j' },
    { char: 'k', label: 'k' },
    { char: 'l', label: 'l' },
    { char: ';', label: ';' },
    { char: "'", label: "'" },
    { label: 'enter', width: 2.25 },
  ],
  [
    { label: 'shift', width: 2.25 },
    { char: 'z', label: 'z' },
    { char: 'x', label: 'x' },
    { char: 'c', label: 'c' },
    { char: 'v', label: 'v' },
    { char: 'b', label: 'b' },
    { char: 'n', label: 'n' },
    { char: 'm', label: 'm' },
    { char: ',', label: ',' },
    { char: '.', label: '.' },
    { char: '/', label: '/' },
    { label: 'shift', width: 2.75 },
  ],
  [
    { label: 'ctrl', width: 1.5 },
    { label: 'alt', width: 1.25 },
    { char: ' ', label: '', width: 6.25 },
    { label: 'alt', width: 1.25 },
    { label: 'ctrl', width: 1.5 },
  ],
]

const L0: FingerAssignment = { hand: 'left', finger: 0 }
const L1: FingerAssignment = { hand: 'left', finger: 1 }
const L2: FingerAssignment = { hand: 'left', finger: 2 }
const L3: FingerAssignment = { hand: 'left', finger: 3 }
const LT: FingerAssignment = { hand: 'left', finger: 4 }
const R0: FingerAssignment = { hand: 'right', finger: 0 }
const R1: FingerAssignment = { hand: 'right', finger: 1 }
const R2: FingerAssignment = { hand: 'right', finger: 2 }
const R3: FingerAssignment = { hand: 'right', finger: 3 }

/** Standard touch-typing finger assignment per (lowercase, unshifted) key. */
export const FINGER_MAP: Record<string, FingerAssignment> = {
  '`': L0, '1': L0, q: L0, a: L0, z: L0,
  '2': L1, w: L1, s: L1, x: L1,
  '3': L2, e: L2, d: L2, c: L2,
  '4': L3, '5': L3, r: L3, f: L3, t: L3, g: L3, v: L3, b: L3,
  '6': R3, '7': R3, y: R3, h: R3, u: R3, j: R3, n: R3, m: R3,
  '8': R2, i: R2, k: R2, ',': R2,
  '9': R1, o: R1, l: R1, '.': R1,
  '0': R0, '-': R0, '=': R0, p: R0, '[': R0, ']': R0, '\\': R0, ';': R0, "'": R0, '/': R0,
  ' ': LT, // thumbs — handled specially (both light up) in the component
}

/** Shifted symbol -> the base key that must be pressed alongside Shift. */
export const SHIFT_SYMBOL_MAP: Record<string, string> = {
  '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
  '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  _: '-', '+': '=', '{': '[', '}': ']', '|': '\\',
  ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
}

/** Resolve any character the typing text might contain to a base key + whether Shift is needed. */
export function resolveChar(char: string): { base: string; needsShift: boolean } | null {
  if (char === ' ') return { base: ' ', needsShift: false }
  const lower = char.toLowerCase()
  if (/[a-z]/.test(lower)) {
    return { base: lower, needsShift: char !== lower }
  }
  if (char in SHIFT_SYMBOL_MAP) {
    return { base: SHIFT_SYMBOL_MAP[char], needsShift: true }
  }
  if (char in FINGER_MAP) {
    return { base: char, needsShift: false }
  }
  return null
}
