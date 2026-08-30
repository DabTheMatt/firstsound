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
  motion: ['position', 'scatter', 'speed'],
  space: ['gain'],
  filter: ['filterCutoff', 'filterReso'],
  output: ['gain'],
}

export const TAB_NOTES: Record<ModuleTab, string | null> = {
  source: 'Region player — speed also transposes, like tape.',
  grain: 'Cloud of grains inside the selected region.',
  motion: 'Motion macros land in a later milestone. Position and scatter are live.',
  space: 'Delay and reverb land in a later milestone. Gain is live.',
  filter: 'Pick a type to engage the filter, then sweep cutoff and resonance.',
  output: 'Limiter is always on. Recording lands in a later milestone.',
}
