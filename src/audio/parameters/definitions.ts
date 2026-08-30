import type { ParamDef, ParamId } from './types'

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
}

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
export const OUTPUT_KNOBS: ParamId[] = ['gain']

export function defaultParamValues(): Record<ParamId, number> {
  const values = {} as Record<ParamId, number>
  for (const id of PARAM_IDS) {
    values[id] = PARAMS[id].defaultValue
  }
  return values
}
