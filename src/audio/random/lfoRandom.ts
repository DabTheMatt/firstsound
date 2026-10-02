import {
  LFO_RATE_MAX,
  LFO_RATE_MIN,
  LFO_SHAPES,
  clampLfoDepth,
  clampLfoRate,
  type FxLfo,
  type LfoShape,
} from '../fx/lfo'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { pickDifferent, randomUnit } from './rng'
import type { LfoRandomField } from './types'

export const LFO_RANDOM_FIELDS: readonly LfoRandomField[] = ['rate', 'depth', 'shape', 'phase']

/** Rate, depth, and shape. Phase stays opt-in because it is a start offset, not a musical control. */
export const LFO_RANDOM_DEFAULT_FIELDS: readonly LfoRandomField[] = ['rate', 'depth', 'shape']

const SHAPES: readonly LfoShape[] = LFO_SHAPES.map((item) => item.value)

/**
 * Free-running rate in a musical window.
 * The draw is log-weighted toward a few hertz, not uniform out to the 20 Hz rail.
 */
export function randomLfoRate(chaos: boolean, intensity: number, rand: () => number): number {
  const amount = Math.min(1, Math.max(0, intensity))
  const lo = chaos ? 0.08 : 0.12
  const hi = chaos ? Math.min(LFO_RATE_MAX, 6 + 10 * amount) : Math.min(8, 1.5 + 5 * amount)
  const unit = (randomUnit(rand) + randomUnit(rand)) / 2
  const hz = Math.exp(Math.log(lo) + unit * (Math.log(hi) - Math.log(lo)))
  return clampLfoRate(hz)
}

/**
 * Depth stays inside 0–100. The LFO fitter already refuses to park a waveform
 * on an invalid parameter rail, so this draw only has to stay moderate.
 */
export function randomLfoDepth(chaos: boolean, intensity: number, rand: () => number): number {
  const amount = Math.min(1, Math.max(0, intensity))
  const hi = chaos ? 35 + 60 * amount : 18 + 42 * amount
  const lo = chaos ? 4 : 8
  const unit = (randomUnit(rand) + randomUnit(rand)) / 2
  return clampLfoDepth(lo + unit * (hi - lo))
}

export function randomLfoShape(current: LfoShape, rand: () => number): LfoShape {
  return pickDifferent(SHAPES, current, undefined, rand)
}

export function randomLfoPatch(input: {
  lfo: FxLfo
  fields: readonly LfoRandomField[]
  chaos: boolean
  intensity: number
  rand?: () => number
  /** Clock seconds. Phase is an origin offset on this clock, not a second oscillator. */
  nowSec?: number
}): Partial<FxLfo> {
  const rand = input.rand ?? Math.random
  const wanted = new Set(input.fields)
  const patch: Partial<FxLfo> = {}
  if (wanted.has('rate')) patch.rateHz = randomLfoRate(input.chaos, input.intensity, rand)
  if (wanted.has('depth')) patch.depth = randomLfoDepth(input.chaos, input.intensity, rand)
  if (wanted.has('shape')) patch.shape = randomLfoShape(input.lfo.shape, rand)
  if (wanted.has('phase')) {
    const rate = patch.rateHz ?? input.lfo.rateHz
    const now = input.nowSec ?? 0
    patch.phaseOriginSec = now - randomUnit(rand) / Math.max(LFO_RATE_MIN, rate)
  }
  return patch
}

/** Proves a randomized depth cannot leave the parameter's legal range. */
export function lfoDepthStaysLegal(target: ParamId, depth: number): boolean {
  const def = PARAMS[target]
  const edge = applyParamValue(depth <= 0 ? def.min : def.max, def)
  return edge >= def.min && edge <= def.max && depth >= 0 && depth <= 100
}
