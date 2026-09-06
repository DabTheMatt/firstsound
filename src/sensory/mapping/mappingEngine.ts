import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EqBand } from '../../audio/engine/eqBands'
import { defaultEqBands } from '../../audio/engine/eqBands'
import type { ChainModule, ModuleType } from '../../audio/chain/chain'
import { cloneFxLfos, defaultFxLfos, type FxLfo, type FxLfoMap } from '../../audio/fx/lfo'
import { SENSORY_AXIS_IDS, SENSORY_AXES, type SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { defaultSensoryValues } from '../sensoryState'
import { EFFECT_MORPHS } from './effectMorphs'
import { applyMorphStopToBands, interpolateMorphStop, MORPH_GATE } from './morph'
import { applySensorySafety } from './safety'
import { applySensoryStacking } from './stacking'

export type DspSnapshot = {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  bypass: Partial<Record<ModuleType, boolean>>
  fxLfos: FxLfoMap
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
}): DspSnapshot {
  const bypass: DspSnapshot['bypass'] = {}
  for (const mod of input.chain) bypass[mod.type] = mod.bypassed
  return {
    params: cloneParams(input.params),
    eqBands: cloneBands(input.eqBands.length ? input.eqBands : defaultEqBands()),
    bypass,
    fxLfos: cloneFxLfos(input.fxLfos ?? defaultFxLfos()),
  }
}

export function dspSnapshotsEqual(a: DspSnapshot, b: DspSnapshot, eps = 1e-3): boolean {
  return dspSnapshotsEqualExcept(a, b, emptyIgnore, eps)
}

/** Playhead and region move while the morph base should stay put. */
export const SENSORY_LAYER_TRANSPORT_IDS: readonly ParamId[] = ['position', 'start', 'end']

const sensoryTransportIgnore = new Set<ParamId>(SENSORY_LAYER_TRANSPORT_IDS)
const emptyIgnore = new Set<ParamId>()

export function sensoryLayerBaseEqual(a: DspSnapshot, b: DspSnapshot, eps = 1e-3): boolean {
  return dspSnapshotsEqualExcept(a, b, sensoryTransportIgnore, eps)
}

function dspSnapshotsEqualExcept(
  a: DspSnapshot,
  b: DspSnapshot,
  ignore: ReadonlySet<ParamId>,
  eps: number,
): boolean {
  const ids = Object.keys(a.params) as ParamId[]
  for (const id of ids) {
    if (ignore.has(id)) continue
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
  const bankA = a.fxLfos.input
  const bankB = b.fxLfos.input
  const n = Math.max(bankA.length, bankB.length)
  for (let i = 0; i < n; i++) {
    const la = bankA[i]
    const lb = bankB[i]
    if (!la || !lb) return false
    if (!lfosEqual(la, lb, eps)) return false
  }
  return true
}

export const PAN_LFO = {
  depth0: 38,
  depthSpan: 62,
  rate0: 0.55,
  rateSpan: 1.7,
} as const

function morphFor(axis: SensoryAxisId) {
  return EFFECT_MORPHS.find((m) => m.axis === axis)
}

function applyPanLfo(dsp: DspSnapshot, t: number) {
  dsp.fxLfos = cloneFxLfos(dsp.fxLfos)
  const slot = dsp.fxLfos.input[0] ?? { target: null, shape: 'sine' as const, depth: 0, rateHz: 0.6 }
  const u = Math.min(1, Math.max(0, t))
  dsp.fxLfos.input[0] = {
    ...slot,
    target: 'pan',
    shape: 'sine',
    depth: Math.round(PAN_LFO.depth0 + PAN_LFO.depthSpan * u),
    rateHz: Number((PAN_LFO.rate0 + PAN_LFO.rateSpan * u).toFixed(2)),
  }
}

export function mapSensoryToDsp(base: DspSnapshot, values: SensoryValues): MappedDsp {
  const dsp: DspSnapshot = {
    params: cloneParams(base.params),
    eqBands: cloneBands(base.eqBands),
    bypass: { ...base.bypass },
    fxLfos: cloneFxLfos(base.fxLfos),
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
    if (id !== 'pan') dsp.bypass[morph.module] = false
    if (id === 'pan') applyPanLfo(dsp, t)
    touched = true
  }
  if (touched) {
    applySensoryStacking(dsp, values)
    applySensorySafety(dsp)
    const protect =
      values.space > 0.05 ||
      values.dirt > 0.35 ||
      values.echo > 0.22 ||
      values.grain > 0.55 ||
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
