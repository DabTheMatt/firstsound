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
  spaceMix: {
    id: 'spaceMix',
    label: 'Mix',
    min: 0,
    max: 100,
    // Off by default so the dry signal is unchanged until Space is dialed in.
    defaultValue: 0,
    unit: '%',
    mapping: 'linear',
  },
  delayTime: {
    id: 'delayTime',
    label: 'Delay',
    min: 20,
    max: 1000,
    defaultValue: 300,
    unit: 'ms',
    mapping: 'log',
  },
  delayFeedback: {
    id: 'delayFeedback',
    label: 'Feedback',
    min: 0,
    max: 95,
    defaultValue: 35,
    unit: '%',
    mapping: 'linear',
  },
  reverb: {
    id: 'reverb',
    label: 'Reverb',
    min: 0,
    max: 100,
    defaultValue: 25,
    unit: '%',
    mapping: 'linear',
  },
  motionDepth: {
    id: 'motionDepth',
    label: 'Depth',
    min: 0,
    max: 100,
    // Off by default so the grain position stays where you set it.
    defaultValue: 0,
    unit: '%',
    mapping: 'linear',
  },
  motionRate: {
    id: 'motionRate',
    label: 'Rate',
    min: 0.02,
    max: 8,
    defaultValue: 0.3,
    unit: 'Hz',
    mapping: 'log',
  },
  motionJitter: {
    id: 'motionJitter',
    label: 'Jitter',
    min: 0,
    max: 100,
    defaultValue: 30,
    unit: '%',
    mapping: 'linear',
  },
  outputGain: {
    id: 'outputGain',
    label: 'Output Gain',
    min: -24,
    max: 6,
    defaultValue: 0,
    unit: 'dB',
    mapping: 'linear',
    step: 0.1,
  },
  saturation: {
    id: 'saturation',
    label: 'Drive',
    min: 0,
    max: 100,
    defaultValue: 0,
    unit: '%',
    mapping: 'linear',
  },
  reverbSize: {
    id: 'reverbSize',
    label: 'Size',
    min: 10,
    max: 100,
    defaultValue: 50,
    unit: '%',
    mapping: 'linear',
  },
  reverbDecay: {
    id: 'reverbDecay',
    label: 'Decay',
    min: 10,
    max: 100,
    defaultValue: 45,
    unit: '%',
    mapping: 'linear',
  },
  reverbPredelay: {
    id: 'reverbPredelay',
    label: 'Predelay',
    min: 0,
    max: 120,
    defaultValue: 18,
    unit: 'ms',
    mapping: 'linear',
  },
  reverbDamping: {
    id: 'reverbDamping',
    label: 'Damping',
    min: 1000,
    max: 18000,
    defaultValue: 7000,
    unit: 'Hz',
    mapping: 'log',
  },
}

/** Filter type options, in UI order. `off` bypasses the filter entirely. */
export const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'lowpass', label: 'Low Pass' },
  { value: 'highpass', label: 'High Pass' },
  { value: 'lowshelf', label: 'Low Shelf' },
  { value: 'highshelf', label: 'High Shelf' },
  { value: 'peaking', label: 'Bell' },
  { value: 'notch', label: 'Notch' },
  { value: 'bandpass', label: 'Band Pass' },
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
export const MOTION_KNOBS: ParamId[] = ['motionDepth', 'motionRate', 'motionJitter', 'position']
export const SPACE_KNOBS: ParamId[] = ['spaceMix', 'delayTime', 'delayFeedback', 'reverb']
export const FILTER_KNOBS: ParamId[] = ['filterCutoff', 'filterReso']
export const OUTPUT_KNOBS: ParamId[] = ['gain']

export function defaultParamValues(): Record<ParamId, number> {
  const values = {} as Record<ParamId, number>
  for (const id of PARAM_IDS) {
    values[id] = PARAMS[id].defaultValue
  }
  return values
}
