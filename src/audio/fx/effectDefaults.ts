import { defaultCombFilter, type CombFilterState } from '../engine/comb'
import { defaultEqBands, type EqBand } from '../engine/eqBands'
import { PARAM_IDS, PARAMS } from '../parameters/definitions'
import type { ParamId } from '../parameters/types'
import { FILTER_PARAM_IDS } from './filter'
import { MS_PARAM_IDS } from './midSide'

/** Sentinel id for the shared "restore factory defaults" preset option. */
export const EFFECT_DEFAULT_ID = 'default'

export type EffectDefaultKind =
  | 'grain'
  | 'filter'
  | 'distortion'
  | 'compressor'
  | 'limiter'
  | 'midside'
  | 'delay'
  | 'reverb'
  | 'eq'

const GRAIN_PARAM_IDS: readonly ParamId[] = [
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

function idsWithPrefix(prefix: string): ParamId[] {
  return PARAM_IDS.filter((id) => id.startsWith(prefix))
}

/** Every parameter that belongs to one effect, including advanced controls. */
export function effectParamIds(kind: Exclude<EffectDefaultKind, 'eq'>): readonly ParamId[] {
  switch (kind) {
    case 'grain':
      return GRAIN_PARAM_IDS
    case 'filter':
      return FILTER_PARAM_IDS
    case 'distortion':
      return ['saturation', 'saturationMix', ...idsWithPrefix('distortion')]
    case 'compressor':
      return idsWithPrefix('compressor')
    case 'limiter':
      return idsWithPrefix('limiter')
    case 'midside':
      return MS_PARAM_IDS
    case 'delay':
      return idsWithPrefix('delay')
    case 'reverb':
      return idsWithPrefix('reverb')
  }
}

/** Patch of `PARAMS[id].defaultValue` for the given ids. */
export function defaultParamPatch(ids: readonly ParamId[]): Partial<Record<ParamId, number>> {
  const patch: Partial<Record<ParamId, number>> = {}
  for (const id of ids) patch[id] = PARAMS[id].defaultValue
  return patch
}

export function effectDefaultPatch(kind: Exclude<EffectDefaultKind, 'eq'>): Partial<Record<ParamId, number>> {
  return defaultParamPatch(effectParamIds(kind))
}

export function paramsMatchDefaults(
  params: Record<ParamId, number>,
  kind: Exclude<EffectDefaultKind, 'eq'>,
): boolean {
  const patch = effectDefaultPatch(kind)
  for (const id of Object.keys(patch) as ParamId[]) {
    if (params[id] !== patch[id]) return false
  }
  return true
}

export function eqBandsMatchDefault(bands: readonly EqBand[]): boolean {
  const defaults = defaultEqBands()
  if (bands.length !== defaults.length) return false
  return bands.every((band, index) => {
    const base = defaults[index]
    if (!base) return false
    return (
      band.type === base.type &&
      band.frequency === base.frequency &&
      band.gain === base.gain &&
      band.q === base.q &&
      band.slope === base.slope &&
      Boolean(band.bypassed) === Boolean(base.bypassed)
    )
  })
}

export function combMatchesDefault(comb: CombFilterState): boolean {
  const base = defaultCombFilter()
  return (
    comb.enabled === base.enabled &&
    comb.teeth === base.teeth &&
    comb.gain === base.gain &&
    comb.spacing === base.spacing &&
    comb.spacingMode === base.spacingMode &&
    comb.frequency === base.frequency &&
    comb.q === base.q
  )
}
