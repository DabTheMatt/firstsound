import { defaultEqBandAt, defaultEqBands, type EqBand } from '../audio/engine/eqBands'

export const SIMPLE_TONE_IDS = [
  'natural',
  'voice',
  'bass',
  'rumble',
  'bright',
  'warm',
  'harsh',
  'clean',
] as const

export type SimpleToneId = (typeof SIMPLE_TONE_IDS)[number]

export const FEATURED_TONE_IDS: readonly SimpleToneId[] = ['natural', 'voice', 'bass', 'bright']

export const DEFAULT_TONE_AMOUNT = 0.7

type ToneStop = Partial<EqBand> & { index: number }

const TONE_STOPS: Record<SimpleToneId, readonly ToneStop[]> = {
  natural: [
    { index: 0, type: 'highpass', frequency: 40, q: 0.7, slope: 12, gain: 0 },
    { index: 3, type: 'highshelf', frequency: 11000, q: 0.7, slope: 12, gain: 1.4 },
  ],
  voice: [
    { index: 0, type: 'highpass', frequency: 100, q: 0.7, slope: 12, gain: 0 },
    { index: 1, type: 'peaking', frequency: 260, q: 0.9, slope: 12, gain: -3.6 },
    { index: 2, type: 'peaking', frequency: 3000, q: 1, slope: 12, gain: 4.8 },
    { index: 3, type: 'highshelf', frequency: 8500, q: 0.7, slope: 12, gain: 3.2 },
  ],
  bass: [
    { index: 0, type: 'lowshelf', frequency: 105, q: 0.75, slope: 12, gain: 6.5 },
    { index: 1, type: 'peaking', frequency: 60, q: 0.8, slope: 12, gain: 2.2 },
  ],
  rumble: [
    { index: 0, type: 'highpass', frequency: 90, q: 0.7, slope: 12, gain: 0 },
    { index: 1, type: 'peaking', frequency: 200, q: 1.1, slope: 12, gain: -4.5 },
  ],
  bright: [{ index: 3, type: 'highshelf', frequency: 6500, q: 0.7, slope: 12, gain: 5.8 }],
  warm: [
    { index: 1, type: 'peaking', frequency: 380, q: 0.8, slope: 12, gain: 3.8 },
    { index: 3, type: 'highshelf', frequency: 9000, q: 0.7, slope: 12, gain: -3 },
  ],
  harsh: [
    { index: 2, type: 'peaking', frequency: 4000, q: 1.2, slope: 12, gain: -5.5 },
    { index: 3, type: 'highshelf', frequency: 11000, q: 0.7, slope: 12, gain: -3.2 },
  ],
  clean: [
    { index: 0, type: 'highpass', frequency: 75, q: 0.7, slope: 12, gain: 0 },
    { index: 1, type: 'peaking', frequency: 320, q: 1, slope: 12, gain: -2.8 },
    { index: 3, type: 'highshelf', frequency: 12000, q: 0.7, slope: 12, gain: 1.6 },
  ],
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clampToneAmount(amount: number): number {
  if (!Number.isFinite(amount)) return DEFAULT_TONE_AMOUNT
  return Math.min(1, Math.max(0, amount))
}

export function toneBandsAt(id: SimpleToneId, amount: number): EqBand[] {
  const t = clampToneAmount(amount)
  const bands = defaultEqBands()
  for (const stop of TONE_STOPS[id]) {
    const base = defaultEqBandAt(stop.index)
    const next: EqBand = {
      ...base,
      type: stop.type ?? base.type,
      frequency: stop.frequency ?? base.frequency,
      q: stop.q ?? base.q,
      slope: stop.slope ?? base.slope,
      gain: lerp(0, stop.gain ?? 0, t),
      bypassed: false,
    }
    if (next.type === 'highpass' || next.type === 'lowpass') {
      const restHz = next.type === 'highpass' ? 20 : 18000
      next.frequency = lerp(restHz, stop.frequency ?? next.frequency, t)
      if (t < 0.08) next.type = 'off'
    } else if (Math.abs(next.gain) < 0.05) {
      next.type = 'off'
      next.gain = 0
    }
    bands[stop.index] = next
  }
  return bands
}

function bandDistance(a: EqBand, b: EqBand): number {
  if (a.type === 'off' && b.type === 'off') return 0
  if (a.type !== b.type) return 8
  return (
    Math.abs(a.gain - b.gain) * 1.4 +
    Math.abs(Math.log2(Math.max(20, a.frequency) / Math.max(20, b.frequency))) * 1.2 +
    Math.abs(a.q - b.q) * 0.4
  )
}

function bandsDistance(a: EqBand[], b: EqBand[]): number {
  const n = Math.max(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += bandDistance(a[i] ?? defaultEqBandAt(i), b[i] ?? defaultEqBandAt(i))
  }
  return sum
}

export function eqLooksFlat(bands: readonly EqBand[], bypassed: boolean): boolean {
  if (bypassed) return true
  return bands.every((band) => band.type === 'off' || band.bypassed || Math.abs(band.gain) < 0.08)
}

export type MatchedTone = { id: SimpleToneId | 'custom'; amount: number }

export function matchSimpleTone(bands: EqBand[], eqBypassed: boolean): MatchedTone {
  if (eqLooksFlat(bands, eqBypassed)) return { id: 'natural', amount: 0 }
  let best: MatchedTone = { id: 'custom', amount: DEFAULT_TONE_AMOUNT }
  let bestScore = 2.4
  for (const id of SIMPLE_TONE_IDS) {
    for (const amount of [0.35, 0.5, 0.7, 0.85, 1]) {
      const score = bandsDistance(bands, toneBandsAt(id, amount))
      if (score < bestScore) {
        bestScore = score
        best = { id, amount }
      }
    }
  }
  return best
}
