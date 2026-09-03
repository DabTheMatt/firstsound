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
  source: ['speed', 'pitch', 'gain'],
  grain: ['grainSize', 'density', 'position', 'scatter', 'grainPitch', 'pitchSpread'],
  motion: ['motionDepth', 'motionRate', 'motionJitter', 'position'],
  space: ['delayWet', 'delayTime', 'delayFeedback', 'reverbWet', 'reverbSize', 'reverbDecay'],
  filter: ['filterCutoff', 'filterReso'],
  output: ['gain', 'outputGain'],
}

export const TAB_NOTES: Record<ModuleTab, string | null> = {
  source: 'Region player — Speed changes tempo without pitch; Pitch transposes without tempo. Reverse and Ping-Pong set direction.',
  grain: 'Cloud of grains inside the selected region.',
  motion: 'Drifts the grain position over time (grain engine). Depth 0 holds still.',
      space: 'Delay + reverb. Mix is a single dry/wet control. Feedback stays below unity so repeats fade.',
  filter: 'Pick a type to engage the filter, then sweep cutoff and resonance.',
  output: 'Safety brickwall sits after Output. The Limiter module in the chain is the musical limiter.',
}
