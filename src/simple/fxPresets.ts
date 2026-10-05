import type { DelayType, ReverbType } from '../audio/fx/types'
import type { ParamId } from '../audio/parameters/types'

/**
 * Simple reverb and delay are macros over the existing FIELD processors.
 * Amount is the authoritative mix (reverbWet / delayWet), kept inside a
 * conservative range so a recording stays intelligible.
 */

export const SIMPLE_REVERB_IDS = ['small', 'medium', 'large'] as const
export type SimpleReverbId = (typeof SIMPLE_REVERB_IDS)[number]

export const SIMPLE_DELAY_IDS = ['short', 'medium', 'long'] as const
export type SimpleDelayId = (typeof SIMPLE_DELAY_IDS)[number]

/** Full Simple amount maps to this wet percent, not 100%. */
export const REVERB_WET_MAX = 40
export const DELAY_WET_MAX = 30

export const DEFAULT_REVERB_AMOUNT = 0.4
export const DEFAULT_DELAY_AMOUNT = 0.3

const REVERB_FAMILY: ReadonlySet<ReverbType> = new Set(['room', 'chamber', 'hall', 'ambience', 'largeHall'])
const DELAY_FAMILY: ReadonlySet<DelayType> = new Set(['digital', 'analog', 'tape', 'stereo'])

type ReverbBody = {
  size: number
  decay: number
  predelay: number
  damping: number
  early: number
}

type DelayBody = {
  time: number
  feedback: number
}

export const simpleReverbPresets: Record<SimpleReverbId, ReverbBody> = {
  small: { size: 18, decay: 0.42, predelay: 6, damping: 9000, early: 28 },
  medium: { size: 40, decay: 1.05, predelay: 14, damping: 7000, early: 40 },
  large: { size: 64, decay: 2.05, predelay: 24, damping: 5200, early: 46 },
}

export const simpleDelayPresets: Record<SimpleDelayId, DelayBody> = {
  short: { time: 90, feedback: 16 },
  medium: { time: 220, feedback: 24 },
  long: { time: 380, feedback: 30 },
}

export function clampFxAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Math.min(1, Math.max(0, amount))
}

export function reverbWetForAmount(amount: number): number {
  return Math.round(clampFxAmount(amount) * REVERB_WET_MAX)
}

export function delayWetForAmount(amount: number): number {
  return Math.round(clampFxAmount(amount) * DELAY_WET_MAX)
}

export function reverbParamPatch(id: SimpleReverbId, amount: number): Partial<Record<ParamId, number>> {
  const body = simpleReverbPresets[id]
  return {
    reverbSize: body.size,
    reverbDecay: body.decay,
    reverbPredelay: body.predelay,
    reverbDamping: body.damping,
    reverbEarly: body.early,
    reverbWet: reverbWetForAmount(amount),
    reverbCorrelate: 1,
    reverbOutput: 100,
  }
}

export function delayParamPatch(id: SimpleDelayId, amount: number): Partial<Record<ParamId, number>> {
  const body = simpleDelayPresets[id]
  const wet = delayWetForAmount(amount)
  return {
    delayTime: body.time,
    delayTimeR: body.time,
    delayFeedback: body.feedback,
    delayFeedbackR: body.feedback,
    delayWet: wet,
    delayWetR: wet,
    delayCorrelate: 1,
    delayLinkLR: 1,
    delaySync: 0,
    delaySyncR: 0,
    delayOutput: 100,
    delayStereo: 0,
  }
}

export function reverbAmountPatch(amount: number): Partial<Record<ParamId, number>> {
  return { reverbWet: reverbWetForAmount(amount), reverbCorrelate: 1 }
}

export function delayAmountPatch(amount: number): Partial<Record<ParamId, number>> {
  const wet = delayWetForAmount(amount)
  return { delayWet: wet, delayWetR: wet, delayCorrelate: 1 }
}

export type FxMatch<T extends string> =
  | { kind: 'off' }
  | { kind: 'custom' }
  | { kind: 'preset'; id: T; amount: number }

function reverbDistance(id: SimpleReverbId, size: number, decay: number, predelay: number): number {
  const body = simpleReverbPresets[id]
  return Math.abs(size - body.size) / 4 + Math.abs(decay - body.decay) / 0.12 + Math.abs(predelay - body.predelay) / 4
}

function delayDistance(id: SimpleDelayId, time: number, feedback: number): number {
  const body = simpleDelayPresets[id]
  return Math.abs(time - body.time) / 18 + Math.abs(feedback - body.feedback) / 5
}

export function matchSimpleReverb(input: {
  bypassed: boolean
  type: ReverbType
  wet: number
  size: number
  decay: number
  predelay: number
  correlate: number
}): FxMatch<SimpleReverbId> {
  if (input.bypassed || input.wet < 1) return { kind: 'off' }
  if (input.correlate < 0.5 || !REVERB_FAMILY.has(input.type) || input.wet > REVERB_WET_MAX + 1) {
    return { kind: 'custom' }
  }
  let best: SimpleReverbId = 'medium'
  let score = Number.POSITIVE_INFINITY
  for (const id of SIMPLE_REVERB_IDS) {
    const next = reverbDistance(id, input.size, input.decay, input.predelay)
    if (next < score) {
      score = next
      best = id
    }
  }
  if (score > 1.6) return { kind: 'custom' }
  return { kind: 'preset', id: best, amount: clampFxAmount(input.wet / REVERB_WET_MAX) }
}

export function matchSimpleDelay(input: {
  bypassed: boolean
  type: DelayType
  wet: number
  wetR: number
  time: number
  feedback: number
  sync: number
  correlate: number
}): FxMatch<SimpleDelayId> {
  if (input.bypassed || (input.wet < 1 && input.wetR < 1)) return { kind: 'off' }
  if (
    input.sync >= 0.5 ||
    input.correlate < 0.5 ||
    !DELAY_FAMILY.has(input.type) ||
    Math.abs(input.wet - input.wetR) > 8 ||
    input.wet > DELAY_WET_MAX + 1 ||
    input.feedback > 40
  ) {
    return { kind: 'custom' }
  }
  let best: SimpleDelayId = 'medium'
  let score = Number.POSITIVE_INFINITY
  for (const id of SIMPLE_DELAY_IDS) {
    const next = delayDistance(id, input.time, input.feedback)
    if (next < score) {
      score = next
      best = id
    }
  }
  if (score > 1.6) return { kind: 'custom' }
  return { kind: 'preset', id: best, amount: clampFxAmount(input.wet / DELAY_WET_MAX) }
}

export function reverbTypeIsSimple(type: ReverbType): boolean {
  return REVERB_FAMILY.has(type)
}

export function delayTypeIsSimple(type: DelayType): boolean {
  return DELAY_FAMILY.has(type)
}
