import { defaultEqBandAt, defaultEqBands, type EqBand } from '../audio/engine/eqBands'

/**
 * Semantic Simple sound characters. Each id replaces the EQ bands.
 * Choosing another character, or Natural, writes that state again.
 * It does not stack on the previous character.
 */
export const SIMPLE_TONE_IDS = [
  'natural',
  'moreBass',
  'lessBass',
  'brighter',
  'warmer',
  'lessHarsh',
  'clearer',
  'softer',
] as const

export type SimpleToneId = (typeof SIMPLE_TONE_IDS)[number]

export const TONE_CHARACTER_IDS = ['natural', 'moreBass', 'lessBass', 'brighter', 'warmer', 'lessHarsh'] as const

export const CLARITY_IDS = ['clearer', 'softer'] as const

/** Conservative default. Full scale stays a gentle shelf or cut, not a mastering move. */
export const DEFAULT_TONE_AMOUNT = 0.35

/** Amounts used when matching live EQ back to a Simple tone preset. */
export const TONE_MATCH_AMOUNTS = [
  0.04, 0.08, 0.1, 0.15, 0.2, 0.25, 0.35, 0.45, 0.55, 0.7, 0.85, 1,
] as const

type ToneStop = Partial<EqBand> & { index: number }

/** Full-strength stops. Amount scales gain from silence up to these values. */
export const simpleSoundPresets: Record<SimpleToneId, readonly ToneStop[]> = {
  natural: [],
  moreBass: [{ index: 0, type: 'lowshelf', frequency: 140, q: 0.7, slope: 12, gain: 12 }],
  lessBass: [{ index: 0, type: 'lowshelf', frequency: 160, q: 0.7, slope: 12, gain: -10 }],
  brighter: [{ index: 3, type: 'highshelf', frequency: 4500, q: 0.7, slope: 12, gain: 9 }],
  warmer: [
    { index: 1, type: 'peaking', frequency: 280, q: 0.75, slope: 12, gain: 6 },
    { index: 3, type: 'highshelf', frequency: 7000, q: 0.7, slope: 12, gain: -6 },
  ],
  lessHarsh: [
    { index: 2, type: 'peaking', frequency: 3200, q: 1.05, slope: 12, gain: -8 },
    { index: 3, type: 'highshelf', frequency: 8000, q: 0.7, slope: 12, gain: -5 },
  ],
  clearer: [
    { index: 1, type: 'peaking', frequency: 280, q: 0.9, slope: 12, gain: -6 },
    { index: 2, type: 'peaking', frequency: 2800, q: 0.85, slope: 12, gain: 5 },
  ],
  softer: [
    { index: 2, type: 'peaking', frequency: 3500, q: 0.8, slope: 12, gain: -4 },
    { index: 3, type: 'highshelf', frequency: 4200, q: 0.7, slope: 12, gain: -10 },
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
  const t = id === 'natural' ? 0 : clampToneAmount(amount)
  const bands = defaultEqBands()
  for (const stop of simpleSoundPresets[id]) {
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
      if (t <= 0) next.type = 'off'
    } else if (t <= 0 || Math.abs(next.gain) < 0.02) {
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

function bestAmountForTone(id: SimpleToneId, bands: EqBand[]): { amount: number; score: number } {
  let amount = DEFAULT_TONE_AMOUNT
  let score = Number.POSITIVE_INFINITY
  for (const candidate of TONE_MATCH_AMOUNTS) {
    const next = bandsDistance(bands, toneBandsAt(id, candidate))
    if (next < score) {
      score = next
      amount = candidate
    }
  }
  return { amount, score }
}

/** True when the stored bands still belong to this tone at this amount. */
export function simpleToneMatchesBands(id: SimpleToneId, amount: number, bands: readonly EqBand[]): boolean {
  return bandsDistance(bands as EqBand[], toneBandsAt(id, amount)) < 3.2
}

export function matchSimpleTone(
  bands: EqBand[],
  eqBypassed: boolean,
  preferred?: SimpleToneId | 'custom',
): MatchedTone {
  const preferId = preferred && preferred !== 'custom' ? preferred : null
  if (eqLooksFlat(bands, eqBypassed)) {
    if (preferId) return { id: preferId, amount: 0 }
    return { id: 'natural', amount: 0 }
  }
  if (preferId) {
    const preferredMatch = bestAmountForTone(preferId, bands)
    if (preferredMatch.score < 3.2) return { id: preferId, amount: preferredMatch.amount }
  }
  let best: MatchedTone = { id: 'custom', amount: DEFAULT_TONE_AMOUNT }
  let bestScore = 2.4
  for (const id of SIMPLE_TONE_IDS) {
    const next = bestAmountForTone(id, bands)
    if (next.score < bestScore) {
      bestScore = next.score
      best = { id, amount: next.amount }
    }
  }
  return best
}
