import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import {
  FILTER_CHARACTER_OPTIONS,
  FILTER_LFO_SHAPES,
  FILTER_PARAM_IDS,
  FILTER_SLOPE_OPTIONS,
  FILTER_TYPE_OPTIONS,
  optionIndex,
  type CreativeFilterType,
} from './filter'

export type FilterPresetId =
  | 'dark'
  | 'bright'
  | 'telephone'
  | 'resonant'
  | 'sweep'
  | 'pulse'
  | 'autoWah'
  | 'dirtyLp'
  | 'movingBandpass'

export const FILTER_PRESETS: {
  id: FilterPresetId
  label: string
  params: Partial<Record<ParamId, number>>
}[] = [
  {
    id: 'dark',
    label: 'Dark',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 24),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'warm'),
      filterCutoff: 420,
      filterReso: 0.9,
      filterDrive: 8,
      filterMix: 100,
      filterLfoDepth: 0,
      filterEnvAmt: 0,
      filterAdsAmt: 0,
    },
  },
  {
    id: 'bright',
    label: 'Bright',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'highpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 12),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'clean'),
      filterCutoff: 280,
      filterReso: 0.7,
      filterDrive: 0,
      filterMix: 100,
      filterLfoDepth: 0,
      filterEnvAmt: 0,
    },
  },
  {
    id: 'telephone',
    label: 'Telephone',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'bandpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 12),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'aggressive'),
      filterCutoff: 1800,
      filterReso: 4.2,
      filterDrive: 18,
      filterMix: 100,
      filterLfoDepth: 0,
    },
  },
  {
    id: 'resonant',
    label: 'Resonant',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 24),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'analog'),
      filterCutoff: 900,
      filterReso: 8.5,
      filterDrive: 12,
      filterMix: 100,
      filterLfoDepth: 0,
    },
  },
  {
    id: 'sweep',
    label: 'Sweep',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 24),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'analog'),
      filterCutoff: 1600,
      filterReso: 6.4,
      filterDrive: 10,
      filterMix: 100,
      filterLfoRate: 0.18,
      filterLfoDepth: 62,
      filterLfoShape: optionIndex(FILTER_LFO_SHAPES, 'sine'),
      filterLfoSync: 0,
    },
  },
  {
    id: 'pulse',
    label: 'Pulse',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 18),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'aggressive'),
      filterCutoff: 1100,
      filterReso: 5.2,
      filterDrive: 16,
      filterMix: 100,
      filterLfoDepth: 70,
      filterLfoSync: 1,
      filterLfoNote: 4,
      filterLfoNoteKind: 0,
      filterLfoShape: optionIndex(FILTER_LFO_SHAPES, 'square'),
    },
  },
  {
    id: 'autoWah',
    label: 'Auto Wah',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'bandpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 12),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'analog'),
      filterCutoff: 700,
      filterReso: 5.8,
      filterDrive: 14,
      filterMix: 100,
      filterEnvAmt: 72,
      filterEnvAttack: 8,
      filterEnvRelease: 160,
      filterEnvDir: 1,
      filterLfoDepth: 0,
    },
  },
  {
    id: 'dirtyLp',
    label: 'Dirty LP',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 12),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'dirty'),
      filterCutoff: 640,
      filterReso: 3.4,
      filterDrive: 42,
      filterMix: 100,
      filterLfoDepth: 0,
    },
  },
  {
    id: 'movingBandpass',
    label: 'Moving Bandpass',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'bandpass'),
      filterSlope: optionIndex(FILTER_SLOPE_OPTIONS, 12),
      filterCharacter: optionIndex(FILTER_CHARACTER_OPTIONS, 'warm'),
      filterCutoff: 1400,
      filterReso: 3.8,
      filterDrive: 6,
      filterMix: 100,
      filterLfoRate: 0.35,
      filterLfoDepth: 48,
      filterLfoShape: optionIndex(FILTER_LFO_SHAPES, 'triangle'),
      filterLfoSync: 0,
    },
  },
]

const RANDOM_RECIPES: FilterPresetId[] = [
  'dark',
  'resonant',
  'sweep',
  'telephone',
  'bright',
  'dirtyLp',
  'pulse',
  'autoWah',
  'movingBandpass',
]

export function filterPresetPatch(id: FilterPresetId): Partial<Record<ParamId, number>> {
  const found = FILTER_PRESETS.find((p) => p.id === id)
  return found ? { ...found.params } : {}
}

export function resetFilterPatch(): Partial<Record<ParamId, number>> {
  const patch: Partial<Record<ParamId, number>> = {}
  for (const id of FILTER_PARAM_IDS) patch[id] = PARAMS[id].defaultValue
  return patch
}

/** Musical randomization: start from a recipe, then nudge cutoff / Q / rate. */
export function randomizeFilterPatch(seed = Math.random()): Partial<Record<ParamId, number>> {
  const recipe = RANDOM_RECIPES[Math.floor(seed * RANDOM_RECIPES.length) % RANDOM_RECIPES.length]!
  const base = filterPresetPatch(recipe)
  const jitter = (seed * 13) % 1
  const cutoff = base.filterCutoff ?? 1200
  const reso = base.filterReso ?? 1
  return {
    ...base,
    filterCutoff: applyParamValue(cutoff * (0.72 + jitter * 0.7), PARAMS.filterCutoff),
    filterReso: applyParamValue(reso * (0.75 + jitter * 0.55), PARAMS.filterReso),
    filterDrive: applyParamValue((base.filterDrive ?? 0) + jitter * 10, PARAMS.filterDrive),
  }
}

export function isFilterPresetId(value: string): value is FilterPresetId {
  return FILTER_PRESETS.some((p) => p.id === value)
}

export function musicalTypeForRecipe(id: FilterPresetId): CreativeFilterType {
  if (id === 'bright') return 'highpass'
  if (id === 'telephone' || id === 'autoWah' || id === 'movingBandpass') return 'bandpass'
  return 'lowpass'
}
