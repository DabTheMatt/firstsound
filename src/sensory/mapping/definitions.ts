import type { SensoryAxisId } from '../sensoryParameters'
import type { BypassHint, InteractionModifier, SensoryMappingRule } from './types'

export const SENSORY_MAPPINGS: Record<SensoryAxisId, readonly SensoryMappingRule[]> = {
  brightness: [
    { kind: 'eq', band: 3, type: 'highshelf', frequency: 8500, gain: 6.5, q: 0.7, curve: 'easeOut', polarity: 'pos' },
    { kind: 'eq', band: 3, type: 'highshelf', frequency: 6500, gain: -7.5, q: 0.7, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'saturation', amount: 14, curve: 'easeIn', polarity: 'pos', gate: 0.42 },
    { kind: 'param', target: 'reverbShimmer', amount: 16, curve: 'exponential', polarity: 'pos', gate: 0.55 },
    { kind: 'param', target: 'compressorAttack', amount: -1.2, curve: 'linear', polarity: 'pos', gate: 0.35 },
    { kind: 'param', target: 'reverbDamping', amount: 3500, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'reverbDamping', amount: -2800, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbHighCut', amount: 2500, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbHighCut', amount: -5000, curve: 'easeOut', polarity: 'neg' },
  ],
  warmth: [
    { kind: 'eq', band: 1, type: 'lowshelf', frequency: 280, gain: 4.8, q: 0.7, curve: 'easeOut', polarity: 'pos' },
    { kind: 'eq', band: 1, type: 'lowshelf', frequency: 320, gain: -3.6, q: 0.7, curve: 'easeOut', polarity: 'neg' },
    { kind: 'eq', band: 3, type: 'highshelf', frequency: 9000, gain: -2.2, q: 0.7, curve: 'linear', polarity: 'pos' },
    { kind: 'eq', band: 3, type: 'highshelf', frequency: 10000, gain: 2.4, q: 0.7, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'saturation', amount: 18, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'saturation', amount: -8, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'reverbColor', amount: 42, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'reverbColor', amount: -38, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbDrive', amount: 10, curve: 'easeIn', polarity: 'pos', gate: 0.4 },
  ],
  distance: [
    { kind: 'param', target: 'reverbWet', amount: 42, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'reverbWet', amount: -28, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbSize', amount: 28, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'reverbDecay', amount: 2.4, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'reverbPredelay', amount: 38, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'reverbDistance', amount: 48, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbDistance', amount: -30, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'reverbWidth', amount: 40, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbWidth', amount: -35, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'reverbEarly', amount: 22, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbDiffusion', amount: 18, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'gain', amount: -4.5, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'gain', amount: 1.8, curve: 'linear', polarity: 'neg' },
    { kind: 'eq', band: 2, type: 'peaking', frequency: 2800, gain: 2.8, q: 1.1, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbDamping', amount: -1800, curve: 'easeOut', polarity: 'pos' },
  ],
  hardness: [
    { kind: 'param', target: 'compressorAttack', amount: -2.2, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'compressorAttack', amount: 8, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'compressorRatio', amount: 4, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'compressorRatio', amount: -4.5, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'compressorKnee', amount: -3, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'compressorKnee', amount: 10, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'compressorThreshold', amount: -8, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'compressorThreshold', amount: 4, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'saturation', amount: 10, curve: 'easeIn', polarity: 'pos', gate: 0.3 },
    { kind: 'param', target: 'saturation', amount: -6, curve: 'linear', polarity: 'neg' },
  ],
  fullness: [
    { kind: 'eq', band: 0, type: 'lowshelf', frequency: 110, gain: 5.2, q: 0.7, curve: 'easeOut', polarity: 'pos' },
    { kind: 'eq', band: 0, type: 'highpass', frequency: 180, gain: 0, q: 0.7, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'compressorMakeup', amount: 3.2, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbDensity', amount: 18, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbWidth', amount: 22, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbWidth', amount: -40, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'delayWidth', amount: 18, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'gain', amount: 1.4, curve: 'linear', polarity: 'pos' },
  ],
  wildness: [
    { kind: 'param', target: 'motionDepth', amount: 42, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'motionJitter', amount: 38, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'reverbModDepth', amount: 36, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'delayModDepth', amount: 28, curve: 'easeIn', polarity: 'pos', gate: 0.25 },
    { kind: 'param', target: 'delayDrift', amount: 22, curve: 'exponential', polarity: 'pos', gate: 0.4 },
    { kind: 'param', target: 'delayWow', amount: 16, curve: 'easeIn', polarity: 'pos', gate: 0.45 },
    { kind: 'param', target: 'saturation', amount: 12, curve: 'easeIn', polarity: 'pos', gate: 0.35 },
    { kind: 'param', target: 'pitchSpread', amount: 4.5, curve: 'easeIn', polarity: 'pos', gate: 0.5 },
    { kind: 'param', target: 'motionDepth', amount: -30, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbModDepth', amount: -20, curve: 'linear', polarity: 'neg' },
    { kind: 'param', target: 'scatter', amount: -18, curve: 'linear', polarity: 'neg' },
  ],
  motion: [
    { kind: 'param', target: 'motionDepth', amount: 55, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'motionRate', amount: 1.6, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'reverbModDepth', amount: 28, curve: 'linear', polarity: 'pos' },
    { kind: 'param', target: 'reverbModRate', amount: 1.1, curve: 'easeIn', polarity: 'pos' },
    { kind: 'param', target: 'delayModDepth', amount: 18, curve: 'easeIn', polarity: 'pos', gate: 0.3 },
    { kind: 'param', target: 'motionDepth', amount: -40, curve: 'easeOut', polarity: 'neg' },
    { kind: 'param', target: 'reverbModDepth', amount: -14, curve: 'linear', polarity: 'neg' },
  ],
  strangeness: [
    { kind: 'param', target: 'delayPitch', amount: 7, curve: 'easeIn', polarity: 'pos', gate: 0.25 },
    { kind: 'param', target: 'delayReverse', amount: 28, curve: 'exponential', polarity: 'pos', gate: 0.4 },
    { kind: 'param', target: 'reverbReverse', amount: 18, curve: 'exponential', polarity: 'pos', gate: 0.5 },
    { kind: 'param', target: 'reverbShimmer', amount: 22, curve: 'easeIn', polarity: 'pos', gate: 0.3 },
    { kind: 'param', target: 'delayFeedback', amount: 18, curve: 'easeOut', polarity: 'pos' },
    { kind: 'param', target: 'delayWet', amount: 16, curve: 'easeIn', polarity: 'pos', gate: 0.2 },
    { kind: 'param', target: 'scatter', amount: 22, curve: 'easeIn', polarity: 'pos', gate: 0.35 },
    { kind: 'param', target: 'filterReso', amount: 4, curve: 'easeIn', polarity: 'pos', gate: 0.45 },
    { kind: 'eq', band: 2, type: 'notch', frequency: 1400, gain: 0, q: 4, curve: 'exponential', polarity: 'pos', gate: 0.62 },
  ],
}

export const SENSORY_INTERACTIONS: readonly InteractionModifier[] = [
  {
    axes: ['brightness', 'wildness'],
    extras: [
      { kind: 'param', target: 'reverbShimmer', amount: 14, curve: 'easeIn', polarity: 'pos', gate: 0.2 },
      { kind: 'param', target: 'reverbModDepth', amount: 10, curve: 'linear', polarity: 'pos' },
    ],
  },
  {
    axes: ['warmth', 'distance'],
    extras: [
      { kind: 'eq', band: 2, type: 'peaking', frequency: 2200, gain: 1.8, q: 1, curve: 'easeOut', polarity: 'neg' },
      { kind: 'param', target: 'reverbWet', amount: -8, curve: 'linear', polarity: 'neg' },
      { kind: 'param', target: 'saturation', amount: 6, curve: 'linear', polarity: 'pos' },
    ],
  },
  {
    axes: ['brightness', 'distance'],
    extras: [
      { kind: 'param', target: 'reverbDamping', amount: -2200, curve: 'easeOut', polarity: 'neg' },
      { kind: 'param', target: 'reverbWet', amount: 8, curve: 'linear', polarity: 'pos' },
    ],
  },
  {
    axes: ['fullness', 'wildness'],
    extras: [
      { kind: 'param', target: 'reverbDiffusion', amount: 16, curve: 'easeIn', polarity: 'pos' },
      { kind: 'param', target: 'delayDiffusion', amount: 14, curve: 'easeIn', polarity: 'pos' },
    ],
  },
]

export const SENSORY_BYPASS_HINTS: readonly BypassHint[] = [
  { module: 'eq', param: 'eq4Gain', threshold: 0.15 },
  { module: 'saturation', param: 'saturation', threshold: 0.8 },
  { module: 'reverb', param: 'reverbWet', threshold: 0.6 },
  { module: 'delay', param: 'delayWet', threshold: 0.6 },
  { module: 'compressor', param: 'compressorThreshold', threshold: 0.4 },
]
