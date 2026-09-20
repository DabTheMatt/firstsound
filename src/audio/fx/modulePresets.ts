import type { ParamId } from '../parameters/types'
import type { DistortionType } from './types'
import type { LfoShape } from './lfo'
import { optionIndex, FILTER_TYPE_OPTIONS, FILTER_SLOPE_OPTIONS, FILTER_CHARACTER_OPTIONS, FILTER_LFO_SHAPES } from './filter'

export type ModulePresetCategory =
  | 'Utility'
  | 'Vocals'
  | 'Drums'
  | 'Bass'
  | 'Guitar'
  | 'Synth'
  | 'Ambient'
  | 'Creative'
  | 'Lo-Fi'

export type ModulePresetKind = 'grain' | 'filter' | 'distortion' | 'compressor' | 'limiter'

export type ModulePreset = {
  id: string
  name: string
  kind: ModulePresetKind
  category: ModulePresetCategory
  hint: string
  params: Partial<Record<ParamId, number>>
  distortionType?: DistortionType
  lfo?: { target: ParamId; depth: number; rateHz: number; shape: LfoShape }
}

export const MODULE_PRESET_CATEGORIES: ModulePresetCategory[] = [
  'Utility',
  'Vocals',
  'Drums',
  'Bass',
  'Guitar',
  'Synth',
  'Ambient',
  'Creative',
  'Lo-Fi',
]

export const MODULE_PRESETS: ModulePreset[] = [
  {
    id: 'gr-cloud',
    name: 'Cloud',
    kind: 'grain',
    category: 'Ambient',
    hint: 'Long overlapping grains, slow drift',
    params: { grainSize: 280, density: 18, scatter: 22, grainPitch: 0, pitchSpread: 4 },
  },
  {
    id: 'gr-stutter',
    name: 'Stutter',
    kind: 'grain',
    category: 'Creative',
    hint: 'Short dense grains for rhythmic chops',
    params: { grainSize: 36, density: 42, scatter: 8, grainPitch: 0, pitchSpread: 0 },
  },
  {
    id: 'gr-spray',
    name: 'Spray',
    kind: 'grain',
    category: 'Creative',
    hint: 'Scattered position and pitch',
    params: { grainSize: 90, density: 24, scatter: 55, grainPitch: 0, pitchSpread: 12 },
  },
  {
    id: 'gr-texture',
    name: 'Texture',
    kind: 'grain',
    category: 'Lo-Fi',
    hint: 'Medium grains, slight pitch smear',
    params: { grainSize: 140, density: 12, scatter: 18, grainPitch: -2, pitchSpread: 6 },
  },
  {
    id: 'cmp-vocal',
    name: 'Vocal glue',
    kind: 'compressor',
    category: 'Vocals',
    hint: 'Medium attack, 4:1, gentle makeup',
    params: {
      compressorThreshold: -18,
      compressorRatio: 4,
      compressorAttack: 12,
      compressorRelease: 120,
      compressorKnee: 6,
      compressorMakeup: 3,
    },
  },
  {
    id: 'cmp-bus',
    name: 'Bus glue',
    kind: 'compressor',
    category: 'Utility',
    hint: 'Slow attack, low ratio',
    params: {
      compressorThreshold: -16,
      compressorRatio: 2,
      compressorAttack: 30,
      compressorRelease: 180,
      compressorKnee: 8,
      compressorMakeup: 2,
    },
  },
  {
    id: 'cmp-drum',
    name: 'Drum punch',
    kind: 'compressor',
    category: 'Drums',
    hint: 'Fast attack/release for transients',
    params: {
      compressorThreshold: -14,
      compressorRatio: 6,
      compressorAttack: 4,
      compressorRelease: 80,
      compressorKnee: 2,
      compressorMakeup: 4,
    },
  },
  {
    id: 'lim-safe',
    name: 'Safe peak',
    kind: 'limiter',
    category: 'Utility',
    hint: 'Transparent ceiling around -1 dB',
    params: { limiterCeiling: -1, limiterRelease: 80, limiterInput: 0 },
  },
  {
    id: 'lim-loud',
    name: 'Loud',
    kind: 'limiter',
    category: 'Creative',
    hint: 'Hotter input into a tight ceiling',
    params: { limiterCeiling: -0.3, limiterRelease: 40, limiterInput: 6 },
  },
  {
    id: 'dst-tape',
    name: 'Tape sat',
    kind: 'distortion',
    category: 'Lo-Fi',
    hint: 'Soft saturation, mostly dry',
    distortionType: 'saturation',
    params: { saturation: 28, saturationMix: 55, distortionNoise: 0 },
  },
  {
    id: 'dst-crush',
    name: 'Bit crush',
    kind: 'distortion',
    category: 'Creative',
    hint: 'Reduced bits and sample rate',
    distortionType: 'bitcrush',
    params: { distortionBits: 8, distortionDownsample: 6, saturationMix: 70 },
  },
  {
    id: 'dst-fuzz',
    name: 'Fuzz',
    kind: 'distortion',
    category: 'Guitar',
    hint: 'Heavy drive',
    distortionType: 'fuzz',
    params: { saturation: 62, saturationMix: 80 },
  },
  {
    id: 'flt-sweep',
    name: 'Slow sweep',
    kind: 'filter',
    category: 'Synth',
    hint: 'LFO on cutoff',
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
    lfo: { target: 'filterCutoff', depth: 0.62, rateHz: 0.18, shape: 'sine' },
  },
  {
    id: 'flt-pulse',
    name: 'Pulse',
    kind: 'filter',
    category: 'Creative',
    hint: 'Square LFO on cutoff',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterCutoff: 1100,
      filterReso: 5.2,
      filterDrive: 16,
      filterMix: 100,
      filterLfoDepth: 70,
      filterLfoSync: 1,
      filterLfoShape: optionIndex(FILTER_LFO_SHAPES, 'square'),
    },
    lfo: { target: 'filterCutoff', depth: 0.7, rateHz: 2, shape: 'square' },
  },
  {
    id: 'flt-dark',
    name: 'Dark LP',
    kind: 'filter',
    category: 'Utility',
    hint: 'Static warm low-pass',
    params: {
      filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'lowpass'),
      filterCutoff: 420,
      filterReso: 0.9,
      filterDrive: 8,
      filterMix: 100,
      filterLfoDepth: 0,
    },
  },
]

export function modulePresetsFor(kind: ModulePresetKind): ModulePreset[] {
  return MODULE_PRESETS.filter((p) => p.kind === kind)
}

export function findModulePreset(id: string): ModulePreset | undefined {
  return MODULE_PRESETS.find((p) => p.id === id)
}
