/** A4 = 440 Hz MIDI 69. Octave numbers follow scientific pitch (C4 = middle C). */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function hzToMidi(hz: number): number {
  if (!(hz > 0)) return Number.NEGATIVE_INFINITY
  return 69 + 12 * Math.log2(hz / 440)
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function midiToNoteName(midi: number): string {
  const m = Math.round(midi)
  const name = NOTE_NAMES[((m % 12) + 12) % 12]
  const octave = Math.floor(m / 12) - 1
  return `${name}${octave}`
}

export function hzToNoteName(hz: number): string {
  return midiToNoteName(hzToMidi(hz))
}

/** C notes across the audible range, plus A4 as a reference. */
export function musicalScaleHz(minHz = 20, maxHz = 20000): { hz: number; label: string }[] {
  const out: { hz: number; label: string }[] = []
  for (let midi = 24; midi <= 108; midi += 12) {
    const hz = midiToHz(midi)
    if (hz >= minHz && hz <= maxHz) out.push({ hz, label: midiToNoteName(midi) })
  }
  const a4 = midiToHz(69)
  if (a4 >= minHz && a4 <= maxHz && !out.some((t) => Math.abs(t.hz - a4) < 1)) {
    out.push({ hz: a4, label: 'A4' })
    out.sort((a, b) => a.hz - b.hz)
  }
  return out
}

export const FREQ_SCALE_HZ = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] as const

export function formatFreqTick(hz: number): string {
  if (hz >= 1000) return `${hz / 1000}k`
  return String(Math.round(hz))
}

export const DB_SCALE = [0, -25, -50, -75, -100] as const
