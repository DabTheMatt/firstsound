import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EqBand } from '../../audio/engine/eqBands'
import { defaultEqBands } from '../../audio/engine/eqBands'
import type { ChainModule, ModuleType } from '../../audio/chain/chain'
import { cloneFxLfos, defaultFxLfos, FX_LFO_KINDS, type FxLfo, type FxLfoMap } from '../../audio/fx/lfo'
import type { DistortionType, ReverbType } from '../../audio/fx/types'
import { AXIS_LFOS, resolvedAxisLfo } from './axisLfos'
import { SENSORY_AXIS_IDS, SENSORY_AXES, type SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { defaultSensoryValues } from '../sensoryState'
import { EFFECT_MORPHS } from './effectMorphs'
import { applyMorphStopToBands, interpolateMorphStop, MORPH_GATE, type EffectMorph } from './morph'
import { applySensorySafety } from './safety'
import { applySensoryStacking } from './stacking'

export type DspSnapshot = {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  bypass: Partial<Record<ModuleType, boolean>>
  fxLfos: FxLfoMap
  reverbType?: ReverbType
  distortionType?: DistortionType
}

export type MappedDsp = DspSnapshot

function cloneBands(bands: EqBand[]): EqBand[] {
  return bands.map((b) => ({ ...b }))
}

function cloneParams(params: Record<ParamId, number>): Record<ParamId, number> {
  return { ...params }
}

function lfosEqual(a: FxLfo, b: FxLfo, eps = 1e-3): boolean {
  return (
    a.target === b.target &&
    a.shape === b.shape &&
    Math.abs(a.depth - b.depth) <= eps &&
    Math.abs(a.rateHz - b.rateHz) <= eps
  )
}

export function snapshotFromEngine(input: {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  chain: ChainModule[]
  fxLfos?: FxLfoMap
  reverbType?: ReverbType
  distortionType?: DistortionType
}): DspSnapshot {
  const bypass: DspSnapshot['bypass'] = {}
  for (const mod of input.chain) bypass[mod.type] = mod.bypassed
  return {
    params: cloneParams(input.params),
    eqBands: cloneBands(input.eqBands.length ? input.eqBands : defaultEqBands()),
    bypass,
    fxLfos: cloneFxLfos(input.fxLfos ?? defaultFxLfos()),
    reverbType: input.reverbType,
    distortionType: input.distortionType,
  }
}

export function dspSnapshotsEqual(a: DspSnapshot, b: DspSnapshot, eps = 1e-3): boolean {
  const ids = Object.keys(a.params) as ParamId[]
  for (const id of ids) {
    if (Math.abs((a.params[id] ?? 0) - (b.params[id] ?? 0)) > eps) return false
  }
  if (a.eqBands.length !== b.eqBands.length) return false
  for (let i = 0; i < a.eqBands.length; i++) {
    const x = a.eqBands[i]
    const y = b.eqBands[i]
    if (!x || !y) return false
    if (x.type !== y.type) return false
    if (Math.abs(x.gain - y.gain) > eps) return false
    if (Math.abs(x.frequency - y.frequency) > 0.5) return false
    if (Math.abs(x.q - y.q) > eps) return false
  }
  const keys = new Set([...Object.keys(a.bypass), ...Object.keys(b.bypass)]) as Set<ModuleType>
  for (const key of keys) {
    if (Boolean(a.bypass[key]) !== Boolean(b.bypass[key])) return false
  }
  for (const kind of FX_LFO_KINDS) {
    const bankA = a.fxLfos[kind]
    const bankB = b.fxLfos[kind]
    const n = Math.max(bankA.length, bankB.length)
    for (let i = 0; i < n; i++) {
      const la = bankA[i]
      const lb = bankB[i]
      if (!la || !lb) return false
      if (!lfosEqual(la, lb, eps)) return false
    }
  }
  if (a.reverbType !== b.reverbType || a.distortionType !== b.distortionType) return false
  return true
}

export { AXIS_LFOS }

function morphFor(axis: SensoryAxisId) {
  return EFFECT_MORPHS.find((m) => m.axis === axis)
}

function pickWinningMorph<T extends 'reverbType' | 'distortionType' | 'filterType'>(
  values: SensoryValues,
  field: T,
): EffectMorph | undefined {
  let best = MORPH_GATE
  let picked: EffectMorph | undefined
  for (const morph of EFFECT_MORPHS) {
    const amount = Math.abs(values[morph.axis as SensoryAxisId] ?? 0)
    const color = morph[field]
    if (!color || amount < best) continue
    best = amount
    picked = morph
  }
  return picked
}

function pickMorphColor<T extends 'reverbType' | 'distortionType'>(
  values: SensoryValues,
  field: T,
): NonNullable<EffectMorph[T]> | undefined {
  const color = pickWinningMorph(values, field)?.[field]
  return color ?? undefined
}

function applyAxisLfos(dsp: DspSnapshot, values: SensoryValues) {
  let cloned = false
  for (const bind of AXIS_LFOS) {
    const resolved = resolvedAxisLfo(bind, values[bind.axis])
    if (!resolved) continue
    if (!cloned) {
      dsp.fxLfos = cloneFxLfos(dsp.fxLfos)
      cloned = true
    }
    const slot = dsp.fxLfos[bind.kind][bind.slot] ?? {
      target: null,
      shape: bind.shape,
      depth: 0,
      rateHz: bind.rate0,
    }
    dsp.fxLfos[bind.kind][bind.slot] = {
      ...slot,
      target: bind.target,
      shape: bind.shape,
      depth: resolved.depth,
      rateHz: resolved.rateHz,
    }
  }
}

export function mapSensoryToDsp(base: DspSnapshot, values: SensoryValues): MappedDsp {
  const dsp: DspSnapshot = {
    params: cloneParams(base.params),
    eqBands: cloneBands(base.eqBands),
    bypass: { ...base.bypass },
    fxLfos: cloneFxLfos(base.fxLfos),
    reverbType: base.reverbType,
    distortionType: base.distortionType,
  }
  let touched = false
  for (const id of SENSORY_AXIS_IDS) {
    const t = values[id]
    if (Math.abs(t) < MORPH_GATE) continue
    const morph = morphFor(id)
    if (!morph) continue
    const stop = interpolateMorphStop(morph.stops, t)
    for (const [key, value] of Object.entries(stop.params ?? {})) {
      const param = key as ParamId
      const def = PARAMS[param]
      if (!def || value == null) continue
      dsp.params[param] = applyParamValue(value, def)
    }
    applyMorphStopToBands(dsp.eqBands, stop)
    for (const mod of morph.modules ?? [morph.module]) {
      if (mod === 'gain') continue
      dsp.bypass[mod] = false
    }
    touched = true
  }
  const reverbType = pickMorphColor(values, 'reverbType')
  const distortionType = pickMorphColor(values, 'distortionType')
  if (reverbType) dsp.reverbType = reverbType
  if (distortionType) dsp.distortionType = distortionType
  const filterMorph = pickWinningMorph(values, 'filterType')
  if (filterMorph) {
    const stop = interpolateMorphStop(filterMorph.stops, values[filterMorph.axis as SensoryAxisId] ?? 0)
    for (const [key, value] of Object.entries(stop.params ?? {})) {
      const param = key as ParamId
      const def = PARAMS[param]
      if (!def || value == null) continue
      dsp.params[param] = applyParamValue(value, def)
    }
    dsp.bypass.filter = false
  }
  applyAxisLfos(dsp, values)
  if (touched) {
    applySensoryStacking(dsp, values)
    applySensorySafety(dsp, {
      allowReverse: values.reverse >= MORPH_GATE,
      allowGate: values.gate >= MORPH_GATE,
      allowShimmer: values.shimmer >= MORPH_GATE,
    })
    const protect =
      values.space > 0.05 ||
      values.dirt > 0.35 ||
      values.echo > 0.22 ||
      values.grain > 0.55 ||
      values.veil > 0.28 ||
      values.halo > 0.32 ||
      values.well > 0.32 ||
      values.bloom > 0.28 ||
      values.shimmer > 0.28 ||
      values.reverse > 0.22 ||
      values.gate > 0.28 ||
      values.fuzz > 0.32 ||
      values.crush > 0.28 ||
      values.fold > 0.32 ||
      values.sweep > 0.28 ||
      values.dark > 0.32 ||
      values.phone > 0.28 ||
      values.peak > 0.32 ||
      values.melt > 0.28 ||
      Math.abs(values.character) > 0.85
    if (protect) dsp.bypass.limiter = false
  }
  return dsp
}

export function identityMappingHolds(base: DspSnapshot): boolean {
  return dspSnapshotsEqual(mapSensoryToDsp(base, defaultSensoryValues()), base)
}

export function axisModule(id: SensoryAxisId) {
  return SENSORY_AXES[id].module
}

export function fxLfoSlotChanged(a: FxLfo | undefined, b: FxLfo | undefined): boolean {
  if (!a && !b) return false
  if (!a || !b) return true
  return !lfosEqual(a, b)
}
