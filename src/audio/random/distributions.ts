import { bandUsesGain, bandUsesSlope, FILTER_SLOPES, type EqBand, type EqFilterType, type FilterSlope } from '../engine/eqBands'
import { syncedDelayMs } from '../fx/sync'
import type { NoteDivision, NoteKind } from '../fx/types'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { isAutoRandomizable, isDiscreteRandom, randomMeta } from './metadata'
import { randomUnit } from './rng'

export type RandomFamily =
  | 'frequency'
  | 'gain'
  | 'output'
  | 'q'
  | 'wet'
  | 'pan'
  | 'pitch'
  | 'delay'
  | 'feedback'
  | 'time'
  | 'generic'

const DENY = new Set<ParamId>([
  'start',
  'end',
  'bpm',
  'makeMono',
  'invertPhase',
  'stretchInterpOn',
  'delaySync',
  'delaySyncR',
  'delayLinkLR',
  'delayCorrelate',
  'delayFreeze',
  'delayReverse',
  'reverbSync',
  'reverbCorrelate',
  'reverbFreeze',
  'reverbReverse',
  'reverbGate',
  // Wet-return staging and an unwired safety trim. Not creative Chaos targets.
  'reverbOutput',
  'reverbLimit',
  'msSoloMid',
  'msSoloSide',
  'msMono',
  'msFlipMid',
  'msFlipSide',
  'limiterAutoMakeup',
  'limiterThreshold',
  'limiterCeiling',
  'limiterRelease',
  'limiterAttack',
  'limiterKnee',
  'limiterRatio',
  'limiterMakeup',
  'limiterInput',
  'compressorAutoMakeup',
])

const OUTPUT_IDS = new Set<ParamId>([
  'outputGain',
  'delayOutput',
  'distortionOutput',
  'limiterMakeup',
  'limiterCeiling',
  'compressorMakeup',
])

const PITCH_IDS = new Set<ParamId>(['pitch', 'grainPitch', 'delayPitch', 'reverbShimmerPitch'])

const DELAY_IDS = new Set<ParamId>(['delayTime', 'delayTimeR'])

const FEEDBACK_IDS = new Set<ParamId>(['delayFeedback', 'delayFeedbackR'])

/** Musical intervals relative to the current pitch, in semitones. */
const PITCH_STEPS = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 7, -7, 12, -12]

const DELAY_NOTES: { division: NoteDivision; kind: NoteKind }[] = [
  { division: '1/16', kind: 'straight' },
  { division: '1/16', kind: 'dotted' },
  { division: '1/8', kind: 'triplet' },
  { division: '1/8', kind: 'straight' },
  { division: '1/8', kind: 'dotted' },
  { division: '1/4', kind: 'triplet' },
  { division: '1/4', kind: 'straight' },
  { division: '1/2', kind: 'straight' },
]

export function randomFamily(id: ParamId): RandomFamily {
  if (OUTPUT_IDS.has(id)) return 'output'
  if (PITCH_IDS.has(id)) return 'pitch'
  if (DELAY_IDS.has(id)) return 'delay'
  if (FEEDBACK_IDS.has(id)) return 'feedback'
  if (id === 'mixVolume' || id === 'mixMid' || id === 'mixSide') return 'gain'
  if (id === 'pan' || id.endsWith('Pan') || id === 'msBalance' || id === 'msRotate') return 'pan'
  if (
    id.includes('Freq') ||
    id.includes('Cutoff') ||
    id.endsWith('Hp') ||
    id.endsWith('Lp') ||
    id.includes('Cut') ||
    id.includes('Damping') ||
    id.includes('Hpf')
  ) {
    return 'frequency'
  }
  if (id.endsWith('Q') || id.includes('Reso')) return 'q'
  if (
    id.includes('Wet') ||
    id.includes('Dry') ||
    id.endsWith('Mix') ||
    id === 'filterMix' ||
    id === 'saturationMix' ||
    id === 'reverbSize' ||
    id === 'position' ||
    id === 'scatter'
  ) {
    return 'wet'
  }
  if (id.includes('Gain') || id.endsWith('Makeup') || id === 'gain') return 'gain'
  if (
    id.includes('Time') ||
    id.includes('Attack') ||
    id.includes('Release') ||
    id.includes('Decay') ||
    id.includes('Predelay') ||
    id === 'grainSize' ||
    id === 'reverbDecay'
  ) {
    return 'time'
  }
  return 'generic'
}

/** Shared-registry parameters Random may write. Switches, routing, and identity stay out. */
export function isRandomizable(id: ParamId): boolean {
  if (DENY.has(id)) return false
  const meta = randomMeta(id)
  if (meta?.derived) return false
  if (meta) return true
  const def = PARAMS[id]
  if (!def) return false
  if (def.step === 1 && def.max - def.min <= 8) return false
  return true
}

export { isAutoRandomizable, isDiscreteRandom }

type Window = { lo: number; hi: number; space: 'linear' | 'log'; shape: 'uniform' | 'triangular' | 'low' }

/**
 * Musical spans for reverb. Generic families mis-handle a few of these:
 * Wet-return output used to inherit the dB window and collapse to 0–6%,
 * and Low/High Cut could cross and empty the wet band.
 */
function reverbCreativeWindow(id: ParamId, chaos: boolean): Window | null {
  const def = PARAMS[id]
  const clip = (lo: number, hi: number): { lo: number; hi: number } => ({
    lo: clamp(lo, def.min, def.max),
    hi: clamp(hi, def.min, def.max),
  })
  if (id === 'reverbDecay') {
    return { ...clip(chaos ? 0.15 : 0.3, chaos ? 8 : 4), space: 'log', shape: 'triangular' }
  }
  if (id === 'reverbPredelay') {
    return { ...clip(chaos ? 1 : 8, chaos ? 220 : 70), space: 'log', shape: 'triangular' }
  }
  if (id === 'reverbSize') {
    return { ...clip(chaos ? 8 : 18, chaos ? 92 : 70), space: 'linear', shape: 'triangular' }
  }
  if (id === 'reverbDamping') {
    return { ...clip(chaos ? 900 : 2000, chaos ? 14000 : 11000), space: 'log', shape: 'triangular' }
  }
  if (id === 'reverbWidth') {
    return { ...clip(chaos ? 25 : 70, chaos ? 180 : 150), space: 'linear', shape: 'triangular' }
  }
  if (id === 'reverbLowCut') {
    return { ...clip(chaos ? 30 : 40, chaos ? 800 : 400), space: 'log', shape: 'triangular' }
  }
  if (id === 'reverbHighCut') {
    return { ...clip(chaos ? 2500 : 5000, chaos ? 17000 : 16000), space: 'log', shape: 'triangular' }
  }
  if (id === 'reverbDuck') {
    return { ...clip(0, chaos ? 45 : 24), space: 'linear', shape: 'low' }
  }
  if (id === 'reverbGateThres') {
    return { ...clip(chaos ? -50 : -42, chaos ? -18 : -24), space: 'linear', shape: 'triangular' }
  }
  return null
}

function familyWindow(id: ParamId, chaos: boolean): Window {
  const creative = reverbCreativeWindow(id, chaos)
  if (creative) return creative
  const def = PARAMS[id]
  const family = randomFamily(id)
  const clip = (lo: number, hi: number): { lo: number; hi: number } => ({
    lo: clamp(lo, def.min, def.max),
    hi: clamp(hi, def.min, def.max),
  })
  if (family === 'frequency') {
    const edge = clip(chaos ? 30 : 80, chaos ? 16000 : 8000)
    return { ...edge, space: 'log', shape: 'triangular' }
  }
  if (family === 'output') {
    const edge = clip(chaos ? -18 : -12, chaos ? Math.min(def.max, 6) : Math.min(def.max, 3))
    return { ...edge, space: 'linear', shape: 'triangular' }
  }
  if (family === 'gain') {
    const edge = clip(chaos ? -24 : -18, chaos ? Math.min(def.max, 12) : Math.min(def.max, 6))
    return { ...edge, space: 'linear', shape: 'triangular' }
  }
  if (family === 'q') {
    const edge = clip(chaos ? 0.2 : 0.4, chaos ? Math.min(def.max, 12) : Math.min(def.max, 4))
    return { ...edge, space: 'log', shape: 'triangular' }
  }
  if (family === 'wet') {
    const edge = clip(chaos ? def.min : Math.max(def.min, def.min + (def.max - def.min) * 0.1), chaos ? def.max : def.min + (def.max - def.min) * 0.85)
    return { ...edge, space: 'linear', shape: 'triangular' }
  }
  if (family === 'pan') {
    return { lo: def.min, hi: def.max, space: 'linear', shape: 'triangular' }
  }
  if (family === 'feedback') {
    const edge = clip(0, chaos ? Math.min(def.max, 80) : Math.min(def.max, 55))
    return { ...edge, space: 'linear', shape: 'low' }
  }
  if (family === 'delay') {
    const edge = clip(chaos ? 10 : 40, chaos ? 2000 : 1200)
    return { ...edge, space: 'log', shape: 'triangular' }
  }
  if (family === 'time') {
    const span = def.max - def.min
    const edge = clip(def.min + span * (chaos ? 0.05 : 0.12), def.min + span * (chaos ? 0.9 : 0.7))
    return { ...edge, space: def.mapping === 'log' ? 'log' : 'linear', shape: 'triangular' }
  }
  const span = def.max - def.min
  const edge = clip(def.min + span * (chaos ? 0 : 0.1), def.min + span * (chaos ? 1 : 0.85))
  return { ...edge, space: def.mapping === 'log' ? 'log' : 'linear', shape: 'triangular' }
}

function around(current: number, lo: number, hi: number, intensity: number, space: 'linear' | 'log'): [number, number] {
  const fraction = 0.08 + 0.92 * clamp(intensity, 0, 1)
  if (!(hi > lo)) return [lo, hi]
  if (space === 'log') {
    const safeLo = Math.max(lo, 1e-4)
    const safeHi = Math.max(hi, safeLo * 1.0001)
    const c = Math.log(clamp(Math.max(current, safeLo), safeLo, safeHi))
    const a = Math.log(safeLo)
    const b = Math.log(safeHi)
    const half = (b - a) * fraction * 0.5
    let left = c - half
    let right = c + half
    if (left < a) {
      right += a - left
      left = a
    }
    if (right > b) {
      left -= right - b
      right = b
    }
    return [Math.exp(Math.max(a, left)), Math.exp(Math.min(b, right))]
  }
  const half = (hi - lo) * fraction * 0.5
  let left = current - half
  let right = current + half
  if (left < lo) {
    right += lo - left
    left = lo
  }
  if (right > hi) {
    left -= right - hi
    right = hi
  }
  return [Math.max(lo, left), Math.min(hi, right)]
}

function sampleRange(lo: number, hi: number, space: 'linear' | 'log', shape: Window['shape'], rand: () => number): number {
  if (!(hi > lo)) return lo
  const roll = shape === 'triangular' ? (randomUnit(rand) + randomUnit(rand)) / 2 : shape === 'low' ? randomUnit(rand) ** 1.4 : randomUnit(rand)
  if (space === 'log') {
    const a = Math.log(Math.max(lo, 1e-4))
    const b = Math.log(Math.max(hi, lo * 1.0001))
    return Math.exp(a + roll * (b - a))
  }
  return lo + roll * (hi - lo)
}

function randomPitch(current: number, id: ParamId, intensity: number, chaos: boolean, rand: () => number): number {
  const def = PARAMS[id]
  const reach = chaos ? 2 + 22 * intensity : 1 + 11 * intensity
  const steps = PITCH_STEPS.filter((step) => Math.abs(step) <= reach + 0.01)
  const choice = steps[Math.floor(randomUnit(rand) * steps.length)] ?? 0
  let next = current + choice
  if (chaos && intensity > 0.85 && randomUnit(rand) < 0.15) {
    next = current + (randomUnit(rand) * 2 - 1) * reach
  }
  return applyParamValue(clamp(next, def.min, def.max), def)
}

function randomDelay(
  current: number,
  id: ParamId,
  intensity: number,
  chaos: boolean,
  bpm: number,
  rand: () => number,
): number {
  const window = familyWindow(id, chaos)
  const [lo, hi] = around(current, window.lo, window.hi, intensity, 'log')
  if (intensity > 0.55 && randomUnit(rand) < 0.5) {
    const note = DELAY_NOTES[Math.floor(randomUnit(rand) * DELAY_NOTES.length)] ?? DELAY_NOTES[0]!
    const ms = syncedDelayMs(bpm, note.division, note.kind)
    if (ms >= lo && ms <= hi) return applyParamValue(ms, PARAMS[id])
  }
  return applyParamValue(sampleRange(lo, hi, 'log', 'triangular', rand), PARAMS[id])
}

function weightedIndex(weights: readonly number[] | undefined, count: number, rand: () => number): number {
  if (!weights || weights.length !== count) return Math.floor(randomUnit(rand) * count)
  let sum = 0
  for (const weight of weights) sum += Math.max(0, weight)
  if (!(sum > 0)) return Math.floor(randomUnit(rand) * count)
  let cursor = randomUnit(rand) * sum
  for (let i = 0; i < count; i++) {
    cursor -= Math.max(0, weights[i] ?? 0)
    if (cursor <= 0) return i
  }
  return count - 1
}

function randomDiscrete(id: ParamId, current: number, rand: () => number): number {
  const meta = randomMeta(id)
  const def = PARAMS[id]
  const options = meta?.options?.length
    ? [...meta.options]
    : Array.from({ length: Math.round(def.max - def.min) + 1 }, (_, index) => def.min + index)
  if (options.length === 0) return applyParamValue(current, def)
  const pool = options.length > 1 ? options.filter((value) => value !== Math.round(current)) : options
  const source = pool.length > 0 ? pool : options
  const weights = meta?.weights && meta.options
    ? source.map((value) => {
        const at = meta.options?.indexOf(value) ?? -1
        return at >= 0 ? (meta.weights?.[at] ?? 1) : 1
      })
    : undefined
  const pick = source[weightedIndex(weights, source.length, rand)] ?? source[0]!
  return applyParamValue(pick, def)
}

/**
 * User-facing Mix percent (0–100), not an equal-power coefficient.
 * Normal draws stay near 10–65% wet. Chaos may reach 0% and 100%.
 */
function randomLinkedReverbMix(current: number, intensity: number, chaos: boolean, rand: () => number): number {
  const def = PARAMS.reverbWet
  if (!chaos) {
    const [lo, hi] = around(current, 10, 65, intensity, 'linear')
    return applyParamValue(sampleRange(lo, hi, 'linear', 'triangular', rand), def)
  }
  const roll = randomUnit(rand)
  if (roll < 0.07) return applyParamValue(0, def)
  if (roll < 0.14) return applyParamValue(100, def)
  const [lo, hi] = around(current, 8, 72, Math.max(0.6, intensity), 'linear')
  return applyParamValue(sampleRange(lo, hi, 'linear', 'triangular', rand), def)
}

/** Unlinked Dry or Wet level. The floor keeps the pair from both landing on silence. */
function randomUnlinkedReverbLevel(current: number, intensity: number, chaos: boolean, rand: () => number): number {
  const def = PARAMS.reverbDry
  const [lo, hi] = around(current, chaos ? 18 : 28, chaos ? 100 : 90, intensity, 'linear')
  return applyParamValue(sampleRange(lo, hi, 'linear', 'triangular', rand), def)
}

export function randomParamValue(input: {
  id: ParamId
  current: number
  intensity: number
  chaos: boolean
  rand?: () => number
  bpm?: number
}): number {
  const rand = input.rand ?? Math.random
  const def = PARAMS[input.id]
  if (!Number.isFinite(input.current)) return def.defaultValue
  if (input.id === 'reverbWet') return randomLinkedReverbMix(input.current, input.intensity, input.chaos, rand)
  if (input.id === 'reverbDry') return randomUnlinkedReverbLevel(input.current, input.intensity, input.chaos, rand)
  if (isDiscreteRandom(input.id)) return randomDiscrete(input.id, input.current, rand)
  if (randomFamily(input.id) === 'pitch') {
    return randomPitch(input.current, input.id, input.intensity, input.chaos, rand)
  }
  if (randomFamily(input.id) === 'delay') {
    return randomDelay(input.current, input.id, input.intensity, input.chaos, input.bpm ?? 120, rand)
  }
  const window = familyWindow(input.id, input.chaos)
  const [lo, hi] = around(input.current, window.lo, window.hi, input.intensity, window.space)
  const raw = sampleRange(lo, hi, window.space, window.shape, rand)
  return applyParamValue(raw, def)
}

/** Safe creative window used by tests and the editor. Chaos widens it; DSP min/max still clamp. */
export function randomWindow(id: ParamId, chaos: boolean): { min: number; max: number } {
  if (id === 'reverbWet') return chaos ? { min: 0, max: 100 } : { min: 10, max: 65 }
  if (id === 'reverbDry') return chaos ? { min: 18, max: 100 } : { min: 28, max: 90 }
  const window = familyWindow(id, chaos)
  return { min: window.lo, max: window.hi }
}

type ActiveEqType = Exclude<EqFilterType, 'off'>
const EQ_TYPES: readonly ActiveEqType[] = ['peaking', 'lowshelf', 'highshelf', 'notch', 'lowpass', 'highpass', 'bandpass']

export function randomizeEqBandPatch(
  band: EqBand,
  intensity: number,
  chaos: boolean,
  rand: () => number = Math.random,
  includeType = true,
): Partial<EqBand> {
  if (band.type === 'off') return {}
  let type = band.type
  if (includeType && chaos && intensity >= 0.4 && randomUnit(rand) < 0.4) {
    type = EQ_TYPES[Math.floor(randomUnit(rand) * EQ_TYPES.length)] ?? type
  }
  const patch: Partial<EqBand> = {}
  if (type !== band.type) patch.type = type
  patch.frequency = randomParamValue({
    id: 'eq1Freq',
    current: band.frequency,
    intensity,
    chaos,
    rand,
  })
  if (bandUsesGain(type)) {
    patch.gain = randomParamValue({
      id: 'eq1Gain',
      current: bandUsesGain(band.type) ? band.gain : 0,
      intensity,
      chaos,
      rand,
    })
  } else {
    patch.gain = 0
  }
  patch.q = randomParamValue({
    id: 'eq1Q',
    current: band.q,
    intensity,
    chaos,
    rand,
  })
  if (bandUsesSlope(type)) {
    const slopes = (chaos ? FILTER_SLOPES : FILTER_SLOPES.filter((item) => item.value <= 48)).map((item) => item.value)
    const pick = slopes[Math.floor(randomUnit(rand) * slopes.length)]
    if (pick) patch.slope = pick as FilterSlope
  }
  return patch
}
