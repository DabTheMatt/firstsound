import type { FilterType, ParamDef, ParamId, PlaybackDirection } from './types'

export const PARAMS: Record<ParamId, ParamDef> = {
  start: {
    id: 'start',
    label: 'Start',
    min: 0,
    max: 1,
    defaultValue: 0,
    unit: 's',
    mapping: 'linear',
  },
  end: {
    id: 'end',
    label: 'End',
    min: 0,
    max: 1,
    defaultValue: 1,
    unit: 's',
    mapping: 'linear',
  },
  speed: {
    id: 'speed',
    label: 'Speed',
    min: 0.25,
    max: 4,
    defaultValue: 1,
    unit: 'x',
    mapping: 'log',
  },
  pitch: {
    id: 'pitch',
    label: 'Pitch',
    min: -24,
    max: 24,
    defaultValue: 0,
    unit: 'st',
    mapping: 'linear',
    step: 0.01,
  },
  gain: {
    id: 'gain',
    label: 'Gain',
    min: -24,
    max: 6,
    defaultValue: -3,
    unit: 'dB',
    mapping: 'linear',
    step: 0.1,
  },
  grainSize: {
    id: 'grainSize',
    label: 'Grain Size',
    min: 8,
    max: 800,
    defaultValue: 120,
    unit: 'ms',
    mapping: 'log',
  },
  density: {
    id: 'density',
    label: 'Density',
    min: 1,
    max: 80,
    defaultValue: 18.4,
    unit: 'Hz',
    mapping: 'log',
  },
  position: {
    id: 'position',
    label: 'Position',
    min: 0,
    max: 100,
    defaultValue: 32,
    unit: '%',
    mapping: 'linear',
  },
  scatter: {
    id: 'scatter',
    label: 'Scatter',
    min: 0,
    max: 100,
    defaultValue: 45,
    unit: '%',
    mapping: 'linear',
  },
  grainPitch: {
    id: 'grainPitch',
    label: 'Pitch',
    min: -24,
    max: 24,
    defaultValue: 0,
    unit: 'st',
    mapping: 'linear',
    step: 0.01,
  },
  pitchSpread: {
    id: 'pitchSpread',
    label: 'Pitch Spread',
    min: 0,
    max: 24,
    defaultValue: 7.2,
    unit: 'st',
    mapping: 'linear',
    step: 0.01,
  },
  filterCutoff: {
    id: 'filterCutoff',
    label: 'Cutoff',
    min: 20,
    max: 18000,
    // Open by default so engaging the filter starts transparent, then closes.
    defaultValue: 18000,
    unit: 'Hz',
    mapping: 'log',
  },
  filterReso: {
    id: 'filterReso',
    label: 'Resonance',
    min: 0.1,
    max: 18,
    defaultValue: 0.7,
    unit: 'Q',
    mapping: 'log',
    step: 0.01,
  },
}

/** Filter type options, in UI order. `off` bypasses the filter entirely. */
export const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'lowpass', label: 'Low' },
  { value: 'highpass', label: 'High' },
  { value: 'bandpass', label: 'Band' },
]

/** Playback direction options for the region player. */
export const PLAYBACK_DIRECTIONS: { value: PlaybackDirection; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'pingpong', label: 'Ping-Pong' },
]

export const PARAM_IDS = Object.keys(PARAMS) as ParamId[]

export const SOURCE_KNOBS: ParamId[] = ['speed', 'pitch', 'gain']
export const GRAIN_KNOBS: ParamId[] = [
  'grainSize',
  'density',
  'position',
  'scatter',
  'grainPitch',
  'pitchSpread',
]
export const MOTION_KNOBS: ParamId[] = ['position', 'scatter', 'speed']
export const SPACE_KNOBS: ParamId[] = ['gain']
export const FILTER_KNOBS: ParamId[] = ['filterCutoff', 'filterReso']
export const OUTPUT_KNOBS: ParamId[] = ['gain']

export function defaultParamValues(): Record<ParamId, number> {
  const values = {} as Record<ParamId, number>
  for (const id of PARAM_IDS) {
    values[id] = PARAMS[id].defaultValue
  }
  return values
}
