// Lightweight synthesized sound effects using the Web Audio API.
// Avoids shipping/licensing external audio assets.

let ctx: AudioContext | null = null

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return ctx
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.05) {
  try {
    const audioCtx = getContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + duration)
  } catch {
    // Audio not available (e.g. autoplay policy) — fail silently.
  }
}

export const sounds = {
  keyPress: () => beep(420 + Math.random() * 40, 0.04, 'square', 0.03),
  correct: () => beep(660, 0.05, 'sine', 0.04),
  incorrect: () => beep(160, 0.09, 'sawtooth', 0.05),
  finish: () => {
    beep(523, 0.12, 'sine', 0.06)
    setTimeout(() => beep(659, 0.12, 'sine', 0.06), 100)
    setTimeout(() => beep(784, 0.18, 'sine', 0.06), 200)
  },
  countdownTick: () => beep(300, 0.08, 'square', 0.04),
  go: () => beep(880, 0.15, 'square', 0.06),
}
