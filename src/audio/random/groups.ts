import type { ModuleType } from '../chain/chain'
import type { EqBand } from '../engine/eqBands'
import { EQ_BAND_LFO_IDS, FX_LFO_KINDS, FX_LFO_TARGETS, type FxLfoKind } from '../fx/lfo'
import { PARAMS } from '../parameters/definitions'
import type { ParamId } from '../parameters/types'
import { isRandomizable, randomizeEqBandPatch } from './distributions'
import type { RandomDocument } from './types'

export function moduleRandomKind(type: ModuleType): FxLfoKind | null {
  if (type === 'gain') return 'input'
  if (type === 'output' || type === 'eq') return null
  return (FX_LFO_KINDS as string[]).includes(type) ? (type as FxLfoKind) : null
}

export function defaultRandomTargets(kind: FxLfoKind): ParamId[] {
  return FX_LFO_TARGETS[kind].filter((id) => isRandomizable(id))
}

export function participatingTargets(doc: RandomDocument, kind: FxLfoKind): ParamId[] {
  const chosen = doc.participation[kind]
  const allowed = new Set(defaultRandomTargets(kind))
  if (!chosen) return defaultRandomTargets(kind)
  return chosen.filter((id) => allowed.has(id))
}

/** Short integer parameters, such as comb tooth count, stay with selects and modes. */
export function isModeTarget(id: ParamId): boolean {
  const def = PARAMS[id]
  if (!def || def.step !== 1) return false
  return def.max - def.min <= 24
}

export function partitionRandomTargets(ids: readonly ParamId[]): { parameters: ParamId[]; modes: ParamId[] } {
  const parameters: ParamId[] = []
  const modes: ParamId[] = []
  for (const id of ids) {
    if (isModeTarget(id)) modes.push(id)
    else parameters.push(id)
  }
  return { parameters, modes }
}

/**
 * A missing or complete target list keeps the existing whole-band EQ randomizer
 * (frequency, gain, Q, and filter type). A narrower list randomizes only those
 * parameters.
 */
export function eqBandUsesFullRandom(doc: RandomDocument, kind: FxLfoKind): boolean {
  const chosen = doc.participation[kind]
  if (!chosen) return true
  const all = defaultRandomTargets(kind)
  return all.length > 0 && all.every((id) => chosen.includes(id))
}

export function eqParamIndex(id: ParamId): number | null {
  const index = EQ_BAND_LFO_IDS.findIndex((ids) => ids.freq === id || ids.gain === id || ids.q === id)
  return index >= 0 ? index : null
}

export function eqShadowField(id: ParamId): { index: number; field: 'frequency' | 'gain' | 'q' } | null {
  const match = /^eq(\d)(Freq|Gain|Q)$/.exec(id)
  if (!match) return null
  const index = Number(match[1]) - 1
  if (index < 0 || index > 7) return null
  const field = match[2] === 'Freq' ? 'frequency' : match[2] === 'Gain' ? 'gain' : 'q'
  return { index, field }
}

export function eqRandomPatch(
  band: EqBand,
  intensity: number,
  chaos: boolean,
  rand: () => number,
  includeType = true,
): Partial<EqBand> {
  return randomizeEqBandPatch(band, intensity, chaos, rand, includeType)
}
