import { equalPowerDryWet } from './dryWet'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { syncedDelayMs } from './sync'
import { noteDivisionAt, noteKindAt } from './types'

export type CreativeFilterType =
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'notch'
  | 'peak'
  | 'comb'
  | 'morph'

export type FilterCharacter = 'clean' | 'analog' | 'warm' | 'aggressive' | 'dirty'

export type FilterSlopeDb = 6 | 12 | 18 | 24 | 36 | 48

export type FilterLfoShape = 'sine' | 'triangle' | 'saw' | 'rsaw' | 'square' | 'snh'

export const FILTER_TYPE_OPTIONS: { value: CreativeFilterType; label: string; short: string }[] = [
  { value: 'lowpass', label: 'Low Pass', short: 'LP' },
  { value: 'highpass', label: 'High Pass', short: 'HP' },
  { value: 'bandpass', label: 'Band Pass', short: 'BP' },
  { value: 'notch', label: 'Notch', short: 'Notch' },
  { value: 'peak', label: 'Peak', short: 'Peak' },
  { value: 'comb', label: 'Comb', short: 'Comb' },
  { value: 'morph', label: 'Morph', short: 'Morph' },
]

export const FILTER_SLOPE_OPTIONS: { value: FilterSlopeDb; label: string }[] = [
  { value: 6, label: '6' },
  { value: 12, label: '12' },
  { value: 18, label: '18' },
  { value: 24, label: '24' },
  { value: 36, label: '36' },
  { value: 48, label: '48' },
]

export const FILTER_CHARACTER_OPTIONS: { value: FilterCharacter; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'analog', label: 'Analog' },
  { value: 'warm', label: 'Warm' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'dirty', label: 'Dirty' },
]

export const FILTER_LFO_SHAPES: { value: FilterLfoShape; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'saw', label: 'Saw' },
  { value: 'rsaw', label: 'Rev Saw' },
  { value: 'square', label: 'Square' },
  { value: 'snh', label: 'S&H' },
]

export const FILTER_CUTOFF_MIN = 20
export const FILTER_CUTOFF_MAX = 20_000
export const FILTER_STAGE_COUNT = 4

export const FILTER_PARAM_IDS: ParamId[] = [
  'filterCutoff',
  'filterReso',
  'filterDrive',
  'filterMix',
  'filterKind',
  'filterSlope',
  'filterCharacter',
  'filterMorph',
  'filterLfoRate',
  'filterLfoDepth',
  'filterLfoShape',
  'filterLfoSync',
  'filterLfoNote',
  'filterLfoNoteKind',
  'filterEnvAmt',
  'filterEnvAttack',
  'filterEnvRelease',
  'filterEnvDir',
  'filterAdsAmt',
  'filterAdsAttack',
  'filterAdsDecay',
  'filterAdsSustain',
  'filterAdsRelease',
  'filterPitchTrack',
]

export function optionAt<T>(options: readonly { value: T }[], index: number): T {
  const i = clamp(Math.round(index), 0, options.length - 1)
  return options[i]!.value
}

export function optionIndex<T>(options: readonly { value: T }[], value: T): number {
  const i = options.findIndex((o) => o.value === value)
  return i < 0 ? 0 : i
}

export function filterTypeAt(index: number): CreativeFilterType {
  return optionAt(FILTER_TYPE_OPTIONS, index)
}

export function filterSlopeAt(index: number): FilterSlopeDb {
  return optionAt(FILTER_SLOPE_OPTIONS, index)
}

export function filterCharacterAt(index: number): FilterCharacter {
  return optionAt(FILTER_CHARACTER_OPTIONS, index)
}

export function filterLfoShapeAt(index: number): FilterLfoShape {
  return optionAt(FILTER_LFO_SHAPES, index)
}

/** Cascaded 2nd-order Q values. 6 dB uses a single soft pole (Q 0.5). */
export function filterStageQs(slope: FilterSlopeDb): number[] {
  switch (slope) {
    case 6:
      return [0.5]
    case 12:
      return [0.7071]
    case 18:
      return [0.54, 0.5]
    case 24:
      return [0.5412, 1.3065]
    case 36:
      return [0.5177, 0.7071, 1.9319]
    case 48:
      return [0.5098, 0.6013, 0.8999, 2.5628]
  }
}

export type FilterCharacterModel = {
  driveBoost: number
  qMul: number
  odd: number
  even: number
  peakGainDb: number
}

export function filterCharacterModel(kind: FilterCharacter): FilterCharacterModel {
  switch (kind) {
    case 'clean':
      return { driveBoost: 0, qMul: 1, odd: 1, even: 0, peakGainDb: 0 }
    case 'analog':
      return { driveBoost: 0.12, qMul: 1.08, odd: 0.85, even: 0.18, peakGainDb: 1.2 }
    case 'warm':
      return { driveBoost: 0.18, qMul: 0.94, odd: 0.55, even: 0.4, peakGainDb: 0.6 }
    case 'aggressive':
      return { driveBoost: 0.32, qMul: 1.22, odd: 1.15, even: 0.08, peakGainDb: 2.4 }
    case 'dirty':
      return { driveBoost: 0.48, qMul: 1.12, odd: 1.35, even: 0.28, peakGainDb: 1.8 }
  }
}

/** Waveshaper for pre-filter drive. Character tilts odd/even harmonics. */
export function makeFilterDriveCurve(drive01: number, character: FilterCharacter): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const model = filterCharacterModel(character)
  const drive = clamp(drive01 + model.driveBoost, 0, 1.4)
  if (drive <= 0.008 && character === 'clean') {
    for (let i = 0; i < n; i++) curve[i] = (i / (n - 1)) * 2 - 1
    return curve
  }
  const k = 1 + drive * 8
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    const odd = Math.tanh(k * x) / k
    const even = x >= 0 ? odd : -odd * 0.72
    const y = odd * model.odd + even * model.even * Math.abs(x)
    curve[i] = clamp(y, -1, 1)
  }
  return curve
}

export function filterDryWet(mixPct: number): { dry: number; wet: number } {
  return equalPowerDryWet(clamp(mixPct, 0, 100) / 100)
}

export function peakGainFromReso(q: number, character: FilterCharacter): number {
  const extra = filterCharacterModel(character).peakGainDb
  return clamp((Math.max(0.1, q) - 0.7) * 2.4 + extra, -6, 18)
}

export function combFeedbackFromReso(q: number): number {
  return clamp(0.15 + (Math.max(0.1, q) / 24) * 0.78, 0.05, 0.92)
}

export function combDelaySeconds(cutoffHz: number): number {
  const f = clamp(cutoffHz, FILTER_CUTOFF_MIN, FILTER_CUTOFF_MAX)
  return clamp(1 / f, 1 / FILTER_CUTOFF_MAX, 1 / FILTER_CUTOFF_MIN)
}

/** Morph 0 = LP, 0.5 = BP, 1 = HP. Equal-power triangular mix. */
export function morphMixGains(morph01: number): { lp: number; bp: number; hp: number } {
  const t = clamp(morph01, 0, 1)
  const lp = t <= 0.5 ? Math.cos((t / 0.5) * (Math.PI / 2)) : 0
  const hp = t >= 0.5 ? Math.sin(((t - 0.5) / 0.5) * (Math.PI / 2)) : 0
  const bp = t <= 0.5 ? Math.sin((t / 0.5) * (Math.PI / 2)) : Math.cos(((t - 0.5) / 0.5) * (Math.PI / 2))
  return { lp, bp, hp }
}

export function filterLfoWave(phase01: number, shape: FilterLfoShape, hold = 0): number {
  const p = phase01 - Math.floor(phase01)
  switch (shape) {
    case 'sine':
      return Math.sin(p * Math.PI * 2)
    case 'triangle':
      return p < 0.5 ? p * 4 - 1 : 3 - p * 4
    case 'saw':
      return p * 2 - 1
    case 'rsaw':
      return 1 - p * 2
    case 'square':
      return p < 0.5 ? 1 : -1
    case 'snh':
      return clamp(hold, -1, 1)
  }
}

export function filterLfoRateHz(params: Record<ParamId, number>): number {
  if (params.filterLfoSync > 0.5) {
    const ms = syncedDelayMs(
      params.bpm,
      noteDivisionAt(params.filterLfoNote),
      noteKindAt(params.filterLfoNoteKind),
    )
    return clamp(1000 / Math.max(1, ms), 0.01, 30)
  }
  return clamp(params.filterLfoRate, PARAMS.filterLfoRate.min, PARAMS.filterLfoRate.max)
}

export function adsEnvelope(
  timeSec: number,
  playing: boolean,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): number {
  if (!playing) {
    const rel = Math.max(0.001, release)
    return Math.exp(-timeSec / rel) * (sustain / 100)
  }
  const a = Math.max(0.001, attack)
  const d = Math.max(0.001, decay)
  const s = clamp(sustain, 0, 100) / 100
  if (timeSec < a) return timeSec / a
  if (timeSec < a + d) return 1 - (1 - s) * ((timeSec - a) / d)
  return s
}

export type FilterModRuntime = {
  timeSec: number
  playing: boolean
  envOriginSec: number
  follower01: number
  snh: { index: number; value: number }
  rand?: () => number
}

export function filterModNeedsClock(params: Record<ParamId, number>): boolean {
  return (
    params.filterLfoDepth > 0.4 ||
    params.filterEnvAmt > 0.4 ||
    Math.abs(params.filterAdsAmt) > 0.4
  )
}

function offsetCutoff(baseHz: number, bipolar: number): number {
  const def = PARAMS.filterCutoff
  const n0 = toNormalized(baseHz, def)
  return applyParamValue(fromNormalized(clamp(n0 + bipolar, 0, 1), def), def)
}

/** Dedicated FILTER modulation applied on top of stored (and generic-LFO) cutoff. */
export function applyFilterModulation(
  params: Record<ParamId, number>,
  runtime: FilterModRuntime,
): Record<ParamId, number> {
  const next = { ...params }
  let cutoff = params.filterCutoff
  const track = clamp(params.filterPitchTrack, 0, 100) / 100
  if (track > 0) cutoff *= 2 ** ((params.pitch * track) / 12)

  const depth = clamp(params.filterLfoDepth, 0, 100) / 100
  if (depth > 0) {
    const rate = filterLfoRateHz(params)
    const shape = filterLfoShapeAt(params.filterLfoShape)
    const phase = runtime.timeSec * rate
    const p = phase - Math.floor(phase)
    if (shape === 'snh') {
      const index = Math.floor(Math.max(0, runtime.timeSec) * rate)
      if (runtime.snh.index !== index) {
        runtime.snh.index = index
        runtime.snh.value = (runtime.rand ?? Math.random)() * 2 - 1
      }
    }
    const wave = filterLfoWave(p, shape, runtime.snh.value)
    cutoff = offsetCutoff(cutoff, wave * depth * 0.5)
  }

  const envAmt = clamp(params.filterEnvAmt, 0, 100) / 100
  if (envAmt > 0) {
    const dir = params.filterEnvDir > 0.5 ? 1 : -1
    cutoff = offsetCutoff(cutoff, dir * envAmt * runtime.follower01 * 0.55)
  }

  const adsAmt = clamp(params.filterAdsAmt, -100, 100) / 100
  if (Math.abs(adsAmt) > 0.004) {
    const envT = Math.max(0, runtime.timeSec - runtime.envOriginSec)
    const env = adsEnvelope(
      envT,
      runtime.playing,
      params.filterAdsAttack / 1000,
      params.filterAdsDecay / 1000,
      params.filterAdsSustain,
      params.filterAdsRelease / 1000,
    )
    cutoff = offsetCutoff(cutoff, adsAmt * env * 0.7)
  }

  next.filterCutoff = applyParamValue(cutoff, PARAMS.filterCutoff)
  const qMul = filterCharacterModel(filterCharacterAt(params.filterCharacter)).qMul
  next.filterReso = applyParamValue(params.filterReso * qMul, PARAMS.filterReso)
  return next
}

export function followerEnvelope(
  prev: number,
  level01: number,
  dtSec: number,
  attackMs: number,
  releaseMs: number,
): number {
  const target = clamp(level01, 0, 1)
  const tc = target > prev ? Math.max(0.0005, attackMs / 1000) : Math.max(0.001, releaseMs / 1000)
  const coeff = 1 - Math.exp(-dtSec / tc)
  return prev + (target - prev) * coeff
}

export function rmsFromTimeDomain(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  let sum = 0
  for (let i = 0; i < bytes.length; i++) {
    const x = (bytes[i]! - 128) / 128
    sum += x * x
  }
  return Math.sqrt(sum / bytes.length)
}
