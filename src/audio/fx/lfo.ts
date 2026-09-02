import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

export type LfoShape = 'sine' | 'triangle' | 'square' | 'saw' | 'snh'

export type FxLfoKind = 'delay' | 'reverb' | 'limiter' | 'saturation'

export type FxLfo = {
  rateHz: number
  shape: LfoShape
  depth: number
  target: ParamId | null
}

export const LFO_SHAPES: { value: LfoShape; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'square', label: 'Square' },
  { value: 'saw', label: 'Saw' },
  { value: 'snh', label: 'S&H' },
]

export const FX_LFO_KINDS: FxLfoKind[] = ['delay', 'reverb', 'limiter', 'saturation']

export const LFO_RATE_MIN = 0.05
export const LFO_RATE_MAX = 20
export const LFO_RATE_DEFAULT = 0.6
export const LFO_DEPTH_DEFAULT = 35

const DELAY_TARGETS: ParamId[] = [
  'delayDry',
  'delayWet',
  'delayOutput',
  'delayTime',
  'delayFeedback',
  'delayHp',
  'delayLp',
  'delayDrive',
  'delayModRate',
  'delayModDepth',
  'delayWow',
  'delayFlutter',
  'delayDiffusion',
  'delayPitch',
  'delayReverse',
  'delayDuck',
  'delayDrift',
  'delayWidth',
  'delayPan',
  'delayOffset',
]

const REVERB_TARGETS: ParamId[] = [
  'reverbDry',
  'reverbWet',
  'reverbOutput',
  'reverbSize',
  'reverbDecay',
  'reverbLimit',
  'reverbPredelay',
  'reverbEarly',
  'reverbDiffusion',
  'reverbDensity',
  'reverbDamping',
  'reverbLowCut',
  'reverbHighCut',
  'reverbWidth',
  'reverbModRate',
  'reverbModDepth',
  'reverbShimmerPitch',
  'reverbShimmer',
  'reverbDrive',
  'reverbDuck',
  'reverbGate',
  'reverbGateThres',
  'reverbGateAttack',
  'reverbGateHold',
  'reverbGateRelease',
  'reverbReverse',
  'reverbDistance',
  'reverbColor',
]

const LIMITER_TARGETS: ParamId[] = [
  'limiterThreshold',
  'limiterCeiling',
  'limiterRelease',
  'limiterInput',
  'limiterAttack',
  'limiterKnee',
  'limiterRatio',
  'limiterMakeup',
]

const SATURATION_TARGETS: ParamId[] = ['saturation']

export const FX_LFO_TARGETS: Record<FxLfoKind, readonly ParamId[]> = {
  delay: DELAY_TARGETS,
  reverb: REVERB_TARGETS,
  limiter: LIMITER_TARGETS,
  saturation: SATURATION_TARGETS,
}

const TARGET_KIND = (() => {
  const map = new Map<ParamId, FxLfoKind>()
  for (const kind of FX_LFO_KINDS) {
    for (const id of FX_LFO_TARGETS[kind]) map.set(id, kind)
  }
  return map
})()

const SHAPE_SET = new Set<string>(LFO_SHAPES.map((s) => s.value))

export function defaultFxLfo(): FxLfo {
  return {
    rateHz: LFO_RATE_DEFAULT,
    shape: 'sine',
    depth: LFO_DEPTH_DEFAULT,
    target: null,
  }
}

export function defaultFxLfos(): Record<FxLfoKind, FxLfo> {
  return {
    delay: defaultFxLfo(),
    reverb: defaultFxLfo(),
    limiter: defaultFxLfo(),
    saturation: defaultFxLfo(),
  }
}

export function isLfoShape(value: unknown): value is LfoShape {
  return typeof value === 'string' && SHAPE_SET.has(value)
}

export function isFxLfoKind(value: unknown): value is FxLfoKind {
  return value === 'delay' || value === 'reverb' || value === 'limiter' || value === 'saturation'
}

export function fxLfoKindForParam(id: ParamId): FxLfoKind | null {
  return TARGET_KIND.get(id) ?? null
}

export function isFxLfoTarget(kind: FxLfoKind, id: ParamId): boolean {
  return FX_LFO_TARGETS[kind].includes(id)
}

export function clampLfoRate(value: number): number {
  return clamp(value, LFO_RATE_MIN, LFO_RATE_MAX)
}

export function clampLfoDepth(value: number): number {
  return clamp(value, 0, 100)
}

export function parseFxLfo(raw: unknown, kind: FxLfoKind): FxLfo {
  const next = defaultFxLfo()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Partial<FxLfo>
  if (typeof rec.rateHz === 'number' && Number.isFinite(rec.rateHz)) next.rateHz = clampLfoRate(rec.rateHz)
  if (isLfoShape(rec.shape)) next.shape = rec.shape
  if (typeof rec.depth === 'number' && Number.isFinite(rec.depth)) next.depth = clampLfoDepth(rec.depth)
  if (rec.target == null) next.target = null
  else if (typeof rec.target === 'string' && isFxLfoTarget(kind, rec.target as ParamId)) {
    next.target = rec.target as ParamId
  }
  return next
}

export function parseFxLfos(raw: unknown): Record<FxLfoKind, FxLfo> {
  const next = defaultFxLfos()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Partial<Record<FxLfoKind, unknown>>
  for (const kind of FX_LFO_KINDS) next[kind] = parseFxLfo(rec[kind], kind)
  return next
}

/** Bipolar oscillator output in [-1, 1]. `hold` is the current sample-and-hold value. */
export function lfoWave(phase01: number, shape: LfoShape, hold = 0): number {
  const p = phase01 - Math.floor(phase01)
  switch (shape) {
    case 'sine':
      return Math.sin(p * Math.PI * 2)
    case 'triangle':
      return p < 0.5 ? p * 4 - 1 : 3 - p * 4
    case 'square':
      return p < 0.5 ? 1 : -1
    case 'saw':
      return p * 2 - 1
    case 'snh':
      return clamp(hold, -1, 1)
  }
}

export function lfoPhase(timeSec: number, rateHz: number): number {
  const rate = clampLfoRate(rateHz)
  const phase = timeSec * rate
  return phase - Math.floor(phase)
}

export function snhHoldIndex(timeSec: number, rateHz: number): number {
  return Math.floor(Math.max(0, timeSec) * clampLfoRate(rateHz))
}

/** Offset a stored parameter by LFO in normalized space so log params sweep evenly.
 *  The stored value is oscillator zero. Depth is ± that much of the full range. */
export function modulateParam(base: number, id: ParamId, bipolar: number, depthPct: number): number {
  const def = PARAMS[id]
  const depth = clampLfoDepth(depthPct) / 100
  if (depth <= 0) return applyParamValue(base, def)
  const n = clamp(toNormalized(base, def) + bipolar * depth, 0, 1)
  return applyParamValue(fromNormalized(n, def), def)
}

/** Normalized min/max the LFO can reach around a stored (zero) value. */
export function lfoRangeNormalized(baseN: number, depthPct: number): { min: number; max: number } {
  const depth = clampLfoDepth(depthPct) / 100
  const c = clamp(baseN, 0, 1)
  return { min: clamp(c - depth, 0, 1), max: clamp(c + depth, 0, 1) }
}

export type LfoHoldState = Record<FxLfoKind, { index: number; value: number }>

export function defaultLfoHold(): LfoHoldState {
  return {
    delay: { index: -1, value: 0 },
    reverb: { index: -1, value: 0 },
    limiter: { index: -1, value: 0 },
    saturation: { index: -1, value: 0 },
  }
}

export function fxLfoIsActive(lfo: FxLfo): boolean {
  return lfo.target != null && lfo.depth > 0
}

export function anyFxLfoActive(lfos: Record<FxLfoKind, FxLfo>): boolean {
  return FX_LFO_KINDS.some((kind) => fxLfoIsActive(lfos[kind]))
}

export function applyFxLfos(
  params: Record<ParamId, number>,
  lfos: Record<FxLfoKind, FxLfo>,
  timeSec: number,
  hold: LfoHoldState,
  rand: () => number = Math.random,
): Record<ParamId, number> {
  const next = { ...params }
  for (const kind of FX_LFO_KINDS) {
    const lfo = lfos[kind]
    const target = lfo.target
    if (!target || !isFxLfoTarget(kind, target) || lfo.depth <= 0) continue
    if (lfo.shape === 'snh') {
      const index = snhHoldIndex(timeSec, lfo.rateHz)
      const slot = hold[kind]
      if (slot.index !== index) {
        slot.index = index
        slot.value = rand() * 2 - 1
      }
    }
    const wave = lfoWave(lfoPhase(timeSec, lfo.rateHz), lfo.shape, hold[kind].value)
    next[target] = modulateParam(params[target], target, wave, lfo.depth)
  }
  return next
}
