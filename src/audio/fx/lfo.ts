import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

export type LfoShape = 'sine' | 'triangle' | 'square' | 'saw' | 'snh'

export type FxLfoKind = 'delay' | 'reverb' | 'limiter' | 'saturation' | 'grain' | 'eq' | 'eqcf'

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

export const FX_LFO_KINDS: FxLfoKind[] = ['delay', 'reverb', 'limiter', 'saturation', 'grain', 'eq', 'eqcf']

export const FX_LFO_SLOTS = 3

export const FX_LFO_KIND_LABELS: Record<FxLfoKind, string> = {
  delay: 'Delay',
  reverb: 'Reverb',
  limiter: 'Limiter',
  saturation: 'Saturation',
  grain: 'Grain',
  eq: 'EQ',
  eqcf: 'EQ comb',
}

export const FX_LFO_SLOT_PREFIX: Record<FxLfoKind, string> = {
  delay: 'd',
  reverb: 'r',
  limiter: 'l',
  saturation: 's',
  grain: 'g',
  eq: 'eq',
  eqcf: 'eqcf',
}

export function fxLfoSlotName(kind: FxLfoKind, slot: number): string {
  return `${FX_LFO_SLOT_PREFIX[kind]}${slot + 1}`
}

export function defaultLfoShown(): Record<FxLfoKind, number> {
  return {
    delay: 1,
    reverb: 1,
    limiter: 1,
    saturation: 1,
    grain: 1,
    eq: 1,
    eqcf: 1,
  }
}

export type FxLfoBank = FxLfo[]
export type FxLfoMap = Record<FxLfoKind, FxLfoBank>

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

const GRAIN_TARGETS: ParamId[] = [
  'grainSize',
  'density',
  'position',
  'scatter',
  'grainPitch',
  'pitchSpread',
  'motionDepth',
  'motionRate',
  'motionJitter',
]

export const EQ_BAND_LFO_IDS: { freq: ParamId; gain: ParamId; q: ParamId }[] = [
  { freq: 'eq1Freq', gain: 'eq1Gain', q: 'eq1Q' },
  { freq: 'eq2Freq', gain: 'eq2Gain', q: 'eq2Q' },
  { freq: 'eq3Freq', gain: 'eq3Gain', q: 'eq3Q' },
  { freq: 'eq4Freq', gain: 'eq4Gain', q: 'eq4Q' },
]

const EQ_TARGETS: ParamId[] = EQ_BAND_LFO_IDS.flatMap((ids) => [ids.freq, ids.gain, ids.q])

const EQCF_TARGETS: ParamId[] = ['eqcfTeeth', 'eqcfGain', 'eqcfSpacing', 'eqcfFreq']

export const FX_LFO_TARGETS: Record<FxLfoKind, readonly ParamId[]> = {
  delay: DELAY_TARGETS,
  reverb: REVERB_TARGETS,
  limiter: LIMITER_TARGETS,
  saturation: SATURATION_TARGETS,
  grain: GRAIN_TARGETS,
  eq: EQ_TARGETS,
  eqcf: EQCF_TARGETS,
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

export function defaultFxLfoBank(): FxLfoBank {
  return Array.from({ length: FX_LFO_SLOTS }, () => defaultFxLfo())
}

export function defaultFxLfos(): FxLfoMap {
  return {
    delay: defaultFxLfoBank(),
    reverb: defaultFxLfoBank(),
    limiter: defaultFxLfoBank(),
    saturation: defaultFxLfoBank(),
    grain: defaultFxLfoBank(),
    eq: defaultFxLfoBank(),
    eqcf: defaultFxLfoBank(),
  }
}

export function cloneFxLfos(lfos: FxLfoMap): FxLfoMap {
  const next = defaultFxLfos()
  for (const kind of FX_LFO_KINDS) {
    next[kind] = lfos[kind].map((lfo) => ({ ...lfo }))
  }
  return next
}

export function isLfoShape(value: unknown): value is LfoShape {
  return typeof value === 'string' && SHAPE_SET.has(value)
}

export function isFxLfoKind(value: unknown): value is FxLfoKind {
  return (
    value === 'delay' ||
    value === 'reverb' ||
    value === 'limiter' ||
    value === 'saturation' ||
    value === 'grain' ||
    value === 'eq' ||
    value === 'eqcf'
  )
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

export function parseFxLfoBank(raw: unknown, kind: FxLfoKind): FxLfoBank {
  const bank = defaultFxLfoBank()
  if (Array.isArray(raw)) {
    for (let i = 0; i < FX_LFO_SLOTS; i++) bank[i] = parseFxLfo(raw[i], kind)
    return bank
  }
  if (raw && typeof raw === 'object') bank[0] = parseFxLfo(raw, kind)
  return bank
}

export function parseFxLfos(raw: unknown): FxLfoMap {
  const next = defaultFxLfos()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Partial<Record<FxLfoKind, unknown>>
  for (const kind of FX_LFO_KINDS) next[kind] = parseFxLfoBank(rec[kind], kind)
  return next
}

export function clampLfoSlot(slot: number): number {
  return Math.min(FX_LFO_SLOTS - 1, Math.max(0, Math.round(slot)))
}

export function lfoBinding(
  lfos: FxLfoMap,
  id: ParamId,
): { kind: FxLfoKind; slot: number; lfo: FxLfo } | null {
  const kind = fxLfoKindForParam(id)
  if (!kind) return null
  const slot = lfos[kind].findIndex((lfo) => lfo.target === id)
  if (slot < 0) return null
  return { kind, slot, lfo: lfos[kind][slot]! }
}

export function usedLfoSlots(bank: FxLfoBank): number {
  let last = 0
  for (let i = 0; i < bank.length; i++) {
    if (bank[i]?.target) last = i + 1
  }
  return Math.max(1, last)
}

export function lfoShownFromMap(lfos: FxLfoMap): Record<FxLfoKind, number> {
  const next = defaultLfoShown()
  for (const kind of FX_LFO_KINDS) next[kind] = usedLfoSlots(lfos[kind])
  return next
}

export function nextFreeLfoSlot(bank: FxLfoBank): number | null {
  const idx = bank.findIndex((lfo) => !lfo.target)
  return idx < 0 ? null : idx
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

/** Shrink depth so a sine never parks against 0 or 1. */
export function fittedLfoDepth(baseN: number, depthPct: number): number {
  const want = clampLfoDepth(depthPct) / 100
  const room = Math.min(clamp(baseN, 0, 1), 1 - clamp(baseN, 0, 1))
  return Math.min(want, room)
}

/** Offset a stored parameter by LFO in normalized space so log params sweep evenly.
 *  The stored value is oscillator zero. Depth is ± that much of the full range,
 *  fitted so the waveform never dwells on the rails. */
export function modulateParam(base: number, id: ParamId, bipolar: number, depthPct: number): number {
  const def = PARAMS[id]
  const n0 = toNormalized(base, def)
  const depth = fittedLfoDepth(n0, depthPct)
  if (depth <= 0) return applyParamValue(base, def)
  return applyParamValue(fromNormalized(n0 + bipolar * depth, def), def)
}

/** Normalized min/max the LFO can reach around a stored (zero) value. */
export function lfoRangeNormalized(baseN: number, depthPct: number): { min: number; max: number } {
  const c = clamp(baseN, 0, 1)
  const depth = fittedLfoDepth(c, depthPct)
  return { min: c - depth, max: c + depth }
}

export type LfoHoldSlot = { index: number; value: number }
export type LfoHoldState = Record<FxLfoKind, LfoHoldSlot[]>

function emptyHold(): LfoHoldSlot {
  return { index: -1, value: 0 }
}

export function defaultLfoHold(): LfoHoldState {
  return {
    delay: [emptyHold(), emptyHold(), emptyHold()],
    reverb: [emptyHold(), emptyHold(), emptyHold()],
    limiter: [emptyHold(), emptyHold(), emptyHold()],
    saturation: [emptyHold(), emptyHold(), emptyHold()],
    grain: [emptyHold(), emptyHold(), emptyHold()],
    eq: [emptyHold(), emptyHold(), emptyHold()],
    eqcf: [emptyHold(), emptyHold(), emptyHold()],
  }
}

export function fxLfoIsActive(lfo: FxLfo): boolean {
  return lfo.target != null && lfo.depth > 0
}

export function anyFxLfoActive(lfos: FxLfoMap): boolean {
  return FX_LFO_KINDS.some((kind) => lfos[kind].some(fxLfoIsActive))
}

export function moduleTypeForLfoKind(kind: FxLfoKind): 'delay' | 'reverb' | 'limiter' | 'saturation' | 'grain' | 'eq' {
  return kind === 'eqcf' ? 'eq' : kind
}

export function inspectorPaneForLfo(kind: FxLfoKind, target: ParamId | null): 'main' | 'advanced' {
  if (kind === 'eqcf') return 'advanced'
  if (kind === 'grain' && target && (target === 'motionDepth' || target === 'motionRate' || target === 'motionJitter')) {
    return 'advanced'
  }
  if (kind === 'limiter' && target && target !== 'limiterThreshold' && target !== 'limiterCeiling' && target !== 'limiterRelease') {
    return 'advanced'
  }
  return 'main'
}

export function applyFxLfos(
  params: Record<ParamId, number>,
  lfos: FxLfoMap,
  timeSec: number,
  hold: LfoHoldState,
  rand: () => number = Math.random,
): Record<ParamId, number> {
  const next = { ...params }
  const claimed = new Set<ParamId>()
  for (const kind of FX_LFO_KINDS) {
    for (let i = 0; i < FX_LFO_SLOTS; i++) {
      const lfo = lfos[kind][i]
      const target = lfo?.target
      if (!lfo || !target || !isFxLfoTarget(kind, target) || lfo.depth <= 0) continue
      if (claimed.has(target)) continue
      claimed.add(target)
      const slotHold = hold[kind][i] ?? emptyHold()
      hold[kind][i] = slotHold
      if (lfo.shape === 'snh') {
        const index = snhHoldIndex(timeSec, lfo.rateHz)
        if (slotHold.index !== index) {
          slotHold.index = index
          slotHold.value = rand() * 2 - 1
        }
      }
      const wave = lfoWave(lfoPhase(timeSec, lfo.rateHz), lfo.shape, slotHold.value)
      next[target] = modulateParam(params[target], target, wave, lfo.depth)
    }
  }
  return next
}
