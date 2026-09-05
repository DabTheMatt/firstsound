import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

export type LfoShape = 'sine' | 'triangle' | 'square' | 'saw' | 'snh'

/** Per-EQ-band LFO banks use eq1…eq4 so slot names read eq1b1, eq2b3, etc. */
export type FxLfoKind =
  | 'delay'
  | 'reverb'
  | 'compressor'
  | 'limiter'
  | 'saturation'
  | 'grain'
  | 'eq1'
  | 'eq2'
  | 'eq3'
  | 'eq4'
  | 'eqcf'
  | 'input'

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

export const EQ_BAND_LFO_KINDS: FxLfoKind[] = ['eq1', 'eq2', 'eq3', 'eq4']

export const FX_LFO_KINDS: FxLfoKind[] = [
  'delay',
  'reverb',
  'compressor',
  'limiter',
  'saturation',
  'grain',
  'eq1',
  'eq2',
  'eq3',
  'eq4',
  'eqcf',
  'input',
]

export const FX_LFO_SLOTS = 3

export const FX_LFO_KIND_LABELS: Record<FxLfoKind, string> = {
  delay: 'Delay',
  reverb: 'Reverb',
  compressor: 'Compressor',
  limiter: 'Limiter',
  saturation: 'Saturation',
  grain: 'Grain',
  eq1: 'EQ band 1',
  eq2: 'EQ band 2',
  eq3: 'EQ band 3',
  eq4: 'EQ band 4',
  eqcf: 'EQ comb',
  input: 'Input',
}

export const FX_LFO_SLOT_PREFIX: Record<FxLfoKind, string> = {
  delay: 'd',
  reverb: 'r',
  compressor: 'c',
  limiter: 'l',
  saturation: 's',
  grain: 'g',
  eq1: 'eq1b',
  eq2: 'eq2b',
  eq3: 'eq3b',
  eq4: 'eq4b',
  eqcf: 'eqcf',
  input: 'i',
}

export function fxLfoSlotName(kind: FxLfoKind, slot: number): string {
  return `${FX_LFO_SLOT_PREFIX[kind]}${slot + 1}`
}

export function eqBandLfoKind(bandIndex: number): FxLfoKind {
  return EQ_BAND_LFO_KINDS[clamp(Math.round(bandIndex), 0, 3)] ?? 'eq1'
}

export function defaultLfoShown(): Record<FxLfoKind, number> {
  return {
    delay: 1,
    reverb: 1,
    compressor: 1,
    limiter: 1,
    saturation: 1,
    grain: 1,
    eq1: 1,
    eq2: 1,
    eq3: 1,
    eq4: 1,
    eqcf: 1,
    input: 1,
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
  'delayTimeR',
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

const COMPRESSOR_TARGETS: ParamId[] = [
  'compressorThreshold',
  'compressorRatio',
  'compressorKnee',
  'compressorAttack',
  'compressorRelease',
  'compressorMakeup',
  'compressorInput',
]

const LIMITER_TARGETS: ParamId[] = [
  'limiterCeiling',
  'limiterRelease',
  'limiterInput',
  'limiterAttack',
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

const EQCF_TARGETS: ParamId[] = ['eqcfTeeth', 'eqcfGain', 'eqcfSpacing', 'eqcfFreq']

const INPUT_TARGETS: ParamId[] = [
  'gain',
  'speed',
  'pitch',
  'stretchInterp',
  'pan',
  'channelGainL',
  'channelGainR',
]

export const FX_LFO_TARGETS: Record<FxLfoKind, readonly ParamId[]> = {
  delay: DELAY_TARGETS,
  reverb: REVERB_TARGETS,
  compressor: COMPRESSOR_TARGETS,
  limiter: LIMITER_TARGETS,
  saturation: SATURATION_TARGETS,
  grain: GRAIN_TARGETS,
  eq1: [EQ_BAND_LFO_IDS[0]!.freq, EQ_BAND_LFO_IDS[0]!.gain, EQ_BAND_LFO_IDS[0]!.q],
  eq2: [EQ_BAND_LFO_IDS[1]!.freq, EQ_BAND_LFO_IDS[1]!.gain, EQ_BAND_LFO_IDS[1]!.q],
  eq3: [EQ_BAND_LFO_IDS[2]!.freq, EQ_BAND_LFO_IDS[2]!.gain, EQ_BAND_LFO_IDS[2]!.q],
  eq4: [EQ_BAND_LFO_IDS[3]!.freq, EQ_BAND_LFO_IDS[3]!.gain, EQ_BAND_LFO_IDS[3]!.q],
  eqcf: EQCF_TARGETS,
  input: INPUT_TARGETS,
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
    compressor: defaultFxLfoBank(),
    limiter: defaultFxLfoBank(),
    saturation: defaultFxLfoBank(),
    grain: defaultFxLfoBank(),
    eq1: defaultFxLfoBank(),
    eq2: defaultFxLfoBank(),
    eq3: defaultFxLfoBank(),
    eq4: defaultFxLfoBank(),
    eqcf: defaultFxLfoBank(),
    input: defaultFxLfoBank(),
  }
}

export function cloneFxLfos(lfos: FxLfoMap): FxLfoMap {
  const next = defaultFxLfos()
  for (const kind of FX_LFO_KINDS) {
    next[kind] = (lfos[kind] ?? defaultFxLfoBank()).map((lfo) => ({ ...lfo }))
  }
  return next
}

export function isLfoShape(value: unknown): value is LfoShape {
  return typeof value === 'string' && SHAPE_SET.has(value)
}

export function isFxLfoKind(value: unknown): value is FxLfoKind {
  return typeof value === 'string' && (FX_LFO_KINDS as string[]).includes(value)
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
  const rec = raw as Partial<Record<FxLfoKind | 'eq', unknown>>
  for (const kind of FX_LFO_KINDS) next[kind] = parseFxLfoBank(rec[kind], kind)
  // Migrate legacy single `eq` bank onto band 1 (and redistribute targets when possible).
  if (rec.eq != null) {
    const legacy = parseFxLfoBank(rec.eq, 'eq1')
    for (let i = 0; i < FX_LFO_SLOTS; i++) {
      const lfo = legacy[i]
      if (!lfo?.target) {
        if (!next.eq1[i]?.target) next.eq1[i] = lfo ?? defaultFxLfo()
        continue
      }
      const kind = fxLfoKindForParam(lfo.target) ?? 'eq1'
      if (EQ_BAND_LFO_KINDS.includes(kind)) {
        const slot = next[kind].findIndex((s) => !s.target)
        const at = slot >= 0 ? slot : 0
        next[kind][at] = { ...lfo }
      }
    }
  }
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
    compressor: [emptyHold(), emptyHold(), emptyHold()],
    limiter: [emptyHold(), emptyHold(), emptyHold()],
    saturation: [emptyHold(), emptyHold(), emptyHold()],
    grain: [emptyHold(), emptyHold(), emptyHold()],
    eq1: [emptyHold(), emptyHold(), emptyHold()],
    eq2: [emptyHold(), emptyHold(), emptyHold()],
    eq3: [emptyHold(), emptyHold(), emptyHold()],
    eq4: [emptyHold(), emptyHold(), emptyHold()],
    eqcf: [emptyHold(), emptyHold(), emptyHold()],
    input: [emptyHold(), emptyHold(), emptyHold()],
  }
}

export function fxLfoIsActive(lfo: FxLfo): boolean {
  return lfo.target != null && lfo.depth > 0
}

export function anyFxLfoActive(lfos: FxLfoMap): boolean {
  return FX_LFO_KINDS.some((kind) => lfos[kind].some(fxLfoIsActive))
}

export function moduleTypeForLfoKind(
  kind: FxLfoKind,
): 'delay' | 'reverb' | 'compressor' | 'limiter' | 'saturation' | 'grain' | 'eq' | 'gain' {
  if (kind === 'eqcf' || kind === 'eq1' || kind === 'eq2' || kind === 'eq3' || kind === 'eq4') return 'eq'
  if (kind === 'input') return 'gain'
  return kind
}

export function inspectorPaneForLfo(kind: FxLfoKind, target: ParamId | null): 'main' | 'advanced' {
  if (kind === 'eqcf') return 'advanced'
  if (kind === 'input' && target && (target === 'pan' || target === 'channelGainL' || target === 'channelGainR')) {
    return 'advanced'
  }
  if (kind === 'grain' && target && (target === 'motionDepth' || target === 'motionRate' || target === 'motionJitter')) {
    return 'advanced'
  }
  if (
    kind === 'compressor' &&
    target &&
    (target === 'compressorAttack' || target === 'compressorInput' || target === 'compressorMakeup')
  ) {
    return 'advanced'
  }
  if (
    kind === 'limiter' &&
    target &&
    (target === 'limiterInput' || target === 'limiterAttack')
  ) {
    return 'advanced'
  }
  return 'main'
}

export function lfoConnectCopy(connecting: boolean, targetLabel: string | null): {
  label: string
  detail: string | null
} {
  if (connecting) return { label: 'Click a parameter', detail: null }
  if (targetLabel) return { label: 'Connected', detail: targetLabel }
  return { label: 'Connect', detail: null }
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

/** Overlay live (LFO-modulated) freq/gain/Q onto stored EQ bands for plots. */
export function liveEqBandsFromParams<T extends { frequency: number; gain: number; q: number }>(
  bands: T[],
  live: Record<ParamId, number>,
): T[] {
  return bands.map((band, index) => {
    const ids = EQ_BAND_LFO_IDS[index]
    if (!ids) return band
    return {
      ...band,
      frequency: live[ids.freq] ?? band.frequency,
      gain: live[ids.gain] ?? band.gain,
      q: live[ids.q] ?? band.q,
    }
  })
}

export function eqBandHasLfo(lfos: FxLfoMap, bandIndex: number): boolean {
  const ids = EQ_BAND_LFO_IDS[bandIndex]
  if (!ids) return false
  return Boolean(lfoBinding(lfos, ids.freq) || lfoBinding(lfos, ids.gain) || lfoBinding(lfos, ids.q))
}

export function eqCombHasLfo(lfos: FxLfoMap): boolean {
  return EQCF_TARGETS.some((id) => lfoBinding(lfos, id))
}

/** True when the EQ plot should overlay the animated LFO curve. */
export function eqModuleHasLiveCurve(lfos: FxLfoMap, combEnabled: boolean): boolean {
  if (EQ_BAND_LFO_IDS.some((_, index) => eqBandHasLfo(lfos, index))) return true
  return combEnabled && eqCombHasLfo(lfos)
}
