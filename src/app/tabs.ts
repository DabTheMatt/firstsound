import type { ParamId } from '../audio/parameters/types'

export type ModuleTab = 'source' | 'grain' | 'motion' | 'space' | 'filter' | 'output'

export const TABS: { id: ModuleTab; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'grain', label: 'Grain' },
  { id: 'motion', label: 'Motion' },
  { id: 'space', label: 'Space' },
  { id: 'filter', label: 'Filter' },
  { id: 'output', label: 'Output' },
]

export const TAB_KNOBS: Record<ModuleTab, ParamId[]> = {
  source: ['speed', 'pitch', 'stretchInterp', 'gain'],
  grain: ['grainSize', 'density', 'position', 'scatter', 'grainPitch', 'pitchSpread'],
  motion: ['motionDepth', 'motionRate', 'motionJitter', 'position'],
  space: ['delayDry', 'delayWet', 'delayTime', 'delayFeedback', 'reverbDry', 'reverbWet', 'reverbSize', 'reverbDecay'],
  filter: ['filterCutoff', 'filterReso'],
  output: ['gain', 'outputGain'],
}

export const TAB_NOTES: Record<ModuleTab, string | null> = {
  source: 'Region player — Speed changes tempo without pitch; Pitch transposes without tempo. Interpolation reconstructs samples when rate changes (Nearest, Linear, Cubic, Sinc). Overlap densifies the grain train. Reverse and Ping-Pong set direction.',
  grain: 'Cloud of grains inside the selected region.',
  motion: 'Drifts the grain position over time (grain engine). Depth 0 holds still.',
      space: 'Delay + reverb. Dry and Wet are independent unless Correlate is on — then they always sum to 100%. Feedback stays below unity so repeats fade.',
  filter: 'Creative filter — sweeps, resonance, and motion. Independent from EQ.',
  output: 'Safety brickwall sits after Output. The Limiter module in the chain is the musical limiter.',
}
