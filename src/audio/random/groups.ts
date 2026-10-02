import type { ModuleType } from '../chain/chain'
import type { EqBand } from '../engine/eqBands'
import { EQ_BAND_LFO_IDS, FX_LFO_KINDS, type FxLfoKind } from '../fx/lfo'
import type { ParamId } from '../parameters/types'
import { catalogFor, participatingEntries } from './catalog'
import { randomizeEqBandPatch } from './distributions'
import type { RandomDocument } from './types'

export function moduleRandomKind(type: ModuleType): FxLfoKind | null {
  if (type === 'gain') return 'input'
  if (type === 'output' || type === 'eq') return null
  return (FX_LFO_KINDS as string[]).includes(type) ? (type as FxLfoKind) : null
}

export function defaultRandomTargets(kind: FxLfoKind): ParamId[] {
  return catalogFor(kind).flatMap((entry) => (entry.paramId ? [entry.paramId] : []))
}

export function participatingTargets(doc: RandomDocument, kind: FxLfoKind): ParamId[] {
  return participatingEntries(doc, kind).flatMap((entry) => (entry.paramId ? [entry.paramId] : []))
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
