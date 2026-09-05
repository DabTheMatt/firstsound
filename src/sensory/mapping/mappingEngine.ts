import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { EqBand } from '../../audio/engine/eqBands'
import { defaultEqBands } from '../../audio/engine/eqBands'
import type { ChainModule, ModuleType } from '../../audio/chain/chain'
import { SENSORY_AXIS_IDS, SENSORY_AXES, type SensoryAxisId } from '../sensoryParameters'
import type { SensoryValues } from '../sensoryState'
import { defaultSensoryValues } from '../sensoryState'
import { EFFECT_MORPHS } from './effectMorphs'
import { applyMorphStopToBands, interpolateMorphStop, MORPH_GATE } from './morph'
import { applySensorySafety } from './safety'

export type DspSnapshot = {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  bypass: Partial<Record<ModuleType, boolean>>
}

export type MappedDsp = DspSnapshot

function cloneBands(bands: EqBand[]): EqBand[] {
  return bands.map((b) => ({ ...b }))
}

function cloneParams(params: Record<ParamId, number>): Record<ParamId, number> {
  return { ...params }
}

export function snapshotFromEngine(input: {
  params: Record<ParamId, number>
  eqBands: EqBand[]
  chain: ChainModule[]
}): DspSnapshot {
  const bypass: DspSnapshot['bypass'] = {}
  for (const mod of input.chain) bypass[mod.type] = mod.bypassed
  return {
    params: cloneParams(input.params),
    eqBands: cloneBands(input.eqBands.length ? input.eqBands : defaultEqBands()),
    bypass,
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
  return true
}

function morphFor(axis: SensoryAxisId) {
  return EFFECT_MORPHS.find((m) => m.axis === axis)
}

export function mapSensoryToDsp(base: DspSnapshot, values: SensoryValues): MappedDsp {
  const dsp: DspSnapshot = {
    params: cloneParams(base.params),
    eqBands: cloneBands(base.eqBands),
    bypass: { ...base.bypass },
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
    dsp.bypass[morph.module] = false
    touched = true
  }
  if (touched) {
    applySensorySafety(dsp)
    const protect =
      values.space > 0.55 || values.dirt > 0.45 || values.echo > 0.6 || Math.abs(values.character) > 0.85
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
