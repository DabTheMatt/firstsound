import {
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  bandUsesGain,
  bandUsesSlope,
  createEqBandId,
  type EqBand,
  type EqFilterType,
  type FilterSlope,
} from '../engine/eqBands'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp } from '../parameters/mapping'
import { randomUnit } from './rng'
import type { EqBandRandomField, EqRandomCount } from './types'

type ActiveEqType = Exclude<EqFilterType, 'off'>

const TYPE_WEIGHTS: { type: ActiveEqType; weight: number }[] = [
  { type: 'peaking', weight: 42 },
  { type: 'lowshelf', weight: 12 },
  { type: 'highshelf', weight: 12 },
  { type: 'lowpass', weight: 9 },
  { type: 'highpass', weight: 9 },
  { type: 'notch', weight: 8 },
  { type: 'bandpass', weight: 8 },
]

const EQ_TYPES: readonly ActiveEqType[] = TYPE_WEIGHTS.map((item) => item.type)

export function resolveEqFilterCount(count: EqRandomCount, rand: () => number): number {
  if (count === 'random') return 1 + Math.floor(randomUnit(rand) * 6)
  return count
}

function pickType(rand: () => number, used: ReadonlySet<ActiveEqType>, chaos: boolean): ActiveEqType {
  const pool = TYPE_WEIGHTS.filter((item) => {
    if (!chaos && (item.type === 'lowpass' || item.type === 'highpass') && used.has(item.type)) return false
    return true
  })
  const source = pool.length > 0 ? pool : TYPE_WEIGHTS
  let sum = 0
  for (const item of source) sum += item.weight
  let cursor = randomUnit(rand) * sum
  for (const item of source) {
    cursor -= item.weight
    if (cursor <= 0) return item.type
  }
  return source[source.length - 1]?.type ?? 'peaking'
}

function logHz(lo: number, hi: number, rand: () => number): number {
  const a = Math.log(Math.max(EQ_MIN_HZ, lo))
  const b = Math.log(Math.min(EQ_MAX_HZ, Math.max(lo * 1.01, hi)))
  return Math.exp(a + randomUnit(rand) * (b - a))
}

function spreadFrequencies(count: number, chaos: boolean, rand: () => number): number[] {
  const lo = Math.log(chaos ? 35 : 55)
  const hi = Math.log(chaos ? 16000 : 12500)
  const freqs: number[] = []
  for (let i = 0; i < count; i++) {
    const jitter = 0.18 + randomUnit(rand) * 0.64
    const t = count === 1 ? 0.25 + randomUnit(rand) * 0.5 : (i + jitter) / count
    freqs.push(clamp(Math.exp(lo + clamp(t, 0, 1) * (hi - lo)), EQ_MIN_HZ, EQ_MAX_HZ))
  }
  freqs.sort((a, b) => a - b)
  return freqs
}

/** Moderate musical gain. Chaos widens the bell without living on the rails. */
export function randomEqGain(chaos: boolean, intensity: number, rand: () => number): number {
  const reach = chaos ? 5 + 11 * clamp(intensity, 0, 1) : 2.5 + 7 * clamp(intensity, 0, 1)
  const unit = (randomUnit(rand) + randomUnit(rand) + randomUnit(rand)) / 3
  const signed = (unit * 2 - 1) * reach
  const snapped = Math.round(signed * 10) / 10
  return applyParamValue(clamp(snapped, PARAMS.eq1Gain.min, PARAMS.eq1Gain.max), PARAMS.eq1Gain)
}

export function randomEqQ(type: EqFilterType, chaos: boolean, intensity: number, rand: () => number): number {
  const amount = clamp(intensity, 0, 1)
  const narrow = type === 'notch' || type === 'bandpass'
  const lo = narrow ? (chaos ? 0.7 : 1.2) : chaos ? 0.35 : 0.5
  const hi = narrow
    ? chaos
      ? 4 + 12 * amount
      : 2 + 6 * amount
    : chaos
      ? 1.4 + 8 * amount
      : 0.9 + 2.4 * amount
  const unit = (randomUnit(rand) + randomUnit(rand)) / 2
  const a = Math.log(lo)
  const b = Math.log(Math.max(lo * 1.01, hi))
  const q = Math.exp(a + unit * (b - a))
  return applyParamValue(clamp(q, PARAMS.eq1Q.min, PARAMS.eq1Q.max), PARAMS.eq1Q)
}

export function randomEqFrequency(current: number | null, chaos: boolean, rand: () => number): number {
  if (current != null && Number.isFinite(current)) {
    const center = Math.log(clamp(current, 40, 16000))
    const span = chaos ? 1.4 : 0.85
    const next = Math.exp(center + (randomUnit(rand) * 2 - 1) * span)
    return applyParamValue(clamp(next, PARAMS.eq1Freq.min, PARAMS.eq1Freq.max), PARAMS.eq1Freq)
  }
  return applyParamValue(logHz(chaos ? 40 : 80, chaos ? 14000 : 8000, rand), PARAMS.eq1Freq)
}

function randomSlope(chaos: boolean, intensity: number, rand: () => number): FilterSlope {
  const steep = chaos && intensity > 0.65
  const options: FilterSlope[] = steep ? [12, 24, 24, 36, 48, 48, 72, 96] : [12, 12, 24, 24, 48]
  return options[Math.floor(randomUnit(rand) * options.length)] ?? 24
}

function finishBand(band: EqBand): EqBand {
  const next: EqBand = { ...band, frequency: clamp(band.frequency, EQ_MIN_HZ, EQ_MAX_HZ) }
  if (!bandUsesGain(next.type)) next.gain = 0
  if (!bandUsesSlope(next.type)) next.slope = 12
  return next
}

/**
 * Keep a high-pass below a low-pass with audible room between them.
 * Chaos may occasionally ignore the nudge.
 */
export function separateCutFilters(bands: EqBand[], chaos: boolean, rand: () => number): void {
  const hp = bands.find((band) => band.type === 'highpass')
  const lp = bands.find((band) => band.type === 'lowpass')
  if (!hp || !lp) return
  const collapsed = hp.frequency > lp.frequency * 0.7 || hp.frequency > 8000 && lp.frequency < 250
  if (!collapsed) return
  if (chaos && randomUnit(rand) < 0.12) return
  hp.frequency = logHz(45, 480, rand)
  lp.frequency = logHz(2200, 14000, rand)
  if (hp.frequency >= lp.frequency) {
    const swap = hp.frequency
    hp.frequency = Math.min(lp.frequency, 400)
    lp.frequency = Math.max(swap, 2500)
  }
}

export function sortEqBandsByFrequency(bands: readonly EqBand[]): EqBand[] {
  return bands.map((band) => ({ ...band })).sort((a, b) => a.frequency - b.frequency || a.type.localeCompare(b.type))
}

export function defaultEqBandFields(type: EqFilterType): EqBandRandomField[] {
  const fields: EqBandRandomField[] = ['frequency', 'type']
  if (bandUsesGain(type)) fields.push('gain')
  fields.push('q')
  if (bandUsesSlope(type)) fields.push('slope')
  return fields
}

export function randomizeEqBandFields(
  band: EqBand,
  fields: readonly EqBandRandomField[],
  intensity: number,
  chaos: boolean,
  rand: () => number = Math.random,
): Partial<EqBand> {
  if (band.type === 'off' && !fields.includes('type')) return {}
  const wanted = new Set(fields)
  let type = band.type === 'off' ? 'peaking' : band.type
  if (wanted.has('type')) {
    const used = new Set<ActiveEqType>()
    type = pickType(rand, used, chaos)
  }
  const patch: Partial<EqBand> = {}
  if (type !== band.type) patch.type = type
  if (wanted.has('frequency') || wanted.has('type')) {
    patch.frequency = randomEqFrequency(band.frequency, chaos, rand)
  }
  if (bandUsesGain(type) && (wanted.has('gain') || wanted.has('type'))) {
    patch.gain = randomEqGain(chaos, intensity, rand)
  } else if (!bandUsesGain(type)) {
    patch.gain = 0
  }
  if (wanted.has('q') || wanted.has('type')) patch.q = randomEqQ(type, chaos, intensity, rand)
  if (bandUsesSlope(type) && (wanted.has('slope') || wanted.has('type'))) patch.slope = randomSlope(chaos, intensity, rand)
  return patch
}

export function generateRandomEqBands(input: {
  count: number
  chaos: boolean
  intensity?: number
  rand?: () => number
  createId?: () => string
}): EqBand[] {
  const rand = input.rand ?? Math.random
  const createId = input.createId ?? createEqBandId
  const count = clamp(Math.round(input.count), 1, 6)
  const chaos = input.chaos
  const intensity = input.intensity ?? (chaos ? 0.75 : 0.55)
  const frequencies = spreadFrequencies(count, chaos, rand)
  const used = new Set<ActiveEqType>()
  const bands: EqBand[] = []
  for (let i = 0; i < count; i++) {
    const type = pickType(rand, used, chaos)
    used.add(type)
    const band = finishBand({
      id: createId(),
      type,
      frequency: frequencies[i] ?? logHz(80, 8000, rand),
      gain: bandUsesGain(type) ? randomEqGain(chaos, intensity, rand) : 0,
      q: randomEqQ(type, chaos, intensity, rand),
      slope: bandUsesSlope(type) ? randomSlope(chaos, intensity, rand) : 12,
      bypassed: false,
      lfoExpanded: false,
    })
    bands.push(band)
  }
  separateCutFilters(bands, chaos, rand)
  const sorted = sortEqBandsByFrequency(bands.map(finishBand))
  for (const band of sorted) {
    if (!EQ_TYPES.includes(band.type as ActiveEqType) && band.type !== 'off') band.type = 'peaking'
  }
  return sorted
}

/** A generated band near the middle of the audible set, preferring a bell. */
export function preferredGeneratedBand(bands: readonly EqBand[]): number {
  const active = bands
    .map((band, index) => ({ band, index }))
    .filter((item) => item.band.type !== 'off')
  if (active.length === 0) return 0
  const bells = active.filter((item) => item.band.type === 'peaking')
  const pool = bells.length > 0 ? bells : active
  const mid = pool[Math.floor((pool.length - 1) / 2)] ?? pool[0]
  return mid?.index ?? 0
}
