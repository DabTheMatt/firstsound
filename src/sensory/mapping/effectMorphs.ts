import type { EffectMorph } from './morph'

/** Designed absolute stops. Rest (t≈0) leaves the captured DSP untouched. */
export const EFFECT_MORPHS: readonly EffectMorph[] = [
  {
    axis: 'character',
    module: 'eq',
    stops: [
      {
        t: -1,
        eq: [
          { band: 0, type: 'highpass', frequency: 180, gain: 0, q: 0.75 },
          { band: 1, type: 'peaking', frequency: 880, gain: 3.4, q: 1.35 },
          { band: 2, type: 'peaking', frequency: 3100, gain: 2.4, q: 1.5 },
          { band: 3, type: 'highshelf', frequency: 6400, gain: -5.4, q: 0.7 },
        ],
      },
      {
        t: -0.5,
        eq: [
          { band: 0, type: 'highpass', frequency: 95, gain: 0, q: 0.72 },
          { band: 1, type: 'peaking', frequency: 720, gain: 1.8, q: 1.15 },
          { band: 2, type: 'peaking', frequency: 2700, gain: 1.1, q: 1.2 },
          { band: 3, type: 'highshelf', frequency: 7800, gain: -2.6, q: 0.7 },
        ],
      },
      {
        t: 0,
        eq: [
          { band: 0, type: 'off', frequency: 80, gain: 0, q: 0.7 },
          { band: 1, type: 'off', frequency: 400, gain: 0, q: 1 },
          { band: 2, type: 'off', frequency: 2500, gain: 0, q: 1 },
          { band: 3, type: 'off', frequency: 12000, gain: 0, q: 0.7 },
        ],
      },
      {
        t: 0.5,
        eq: [
          { band: 0, type: 'lowshelf', frequency: 90, gain: 1.5, q: 0.7 },
          { band: 1, type: 'peaking', frequency: 420, gain: -0.8, q: 0.9 },
          { band: 2, type: 'peaking', frequency: 3400, gain: 1.3, q: 1.05 },
          { band: 3, type: 'highshelf', frequency: 10200, gain: 2.4, q: 0.7 },
        ],
      },
      {
        t: 1,
        eq: [
          { band: 0, type: 'lowshelf', frequency: 85, gain: 2.4, q: 0.7 },
          { band: 1, type: 'peaking', frequency: 430, gain: -1.4, q: 0.85 },
          { band: 2, type: 'peaking', frequency: 3500, gain: 2.1, q: 1.05 },
          { band: 3, type: 'highshelf', frequency: 11000, gain: 4.6, q: 0.65 },
        ],
      },
    ],
  },
  {
    axis: 'space',
    module: 'reverb',
    stops: [
      {
        t: 0,
        params: {
          reverbWet: 0,
          reverbSize: 50,
          reverbDecay: 1.6,
          reverbPredelay: 18,
          reverbWidth: 100,
          reverbDistance: 35,
          reverbEarly: 40,
          reverbDiffusion: 55,
          reverbShimmer: 0,
          reverbModDepth: 8,
          reverbHighCut: 16000,
          reverbColor: 0,
        },
      },
      {
        t: 0.22,
        params: {
          reverbWet: 12,
          reverbSize: 44,
          reverbDecay: 2.1,
          reverbPredelay: 16,
          reverbWidth: 118,
          reverbDistance: 28,
          reverbEarly: 46,
          reverbDiffusion: 58,
          reverbShimmer: 4,
          reverbModDepth: 12,
          reverbHighCut: 14000,
          reverbColor: 8,
        },
      },
      {
        t: 0.48,
        params: {
          reverbWet: 28,
          reverbSize: 62,
          reverbDecay: 4.2,
          reverbPredelay: 28,
          reverbWidth: 142,
          reverbDistance: 42,
          reverbEarly: 52,
          reverbDiffusion: 68,
          reverbShimmer: 12,
          reverbModDepth: 18,
          reverbHighCut: 12500,
          reverbColor: 16,
        },
      },
      {
        t: 0.74,
        params: {
          reverbWet: 46,
          reverbSize: 76,
          reverbDecay: 7.4,
          reverbPredelay: 40,
          reverbWidth: 168,
          reverbDistance: 54,
          reverbEarly: 58,
          reverbDiffusion: 76,
          reverbShimmer: 20,
          reverbModDepth: 24,
          reverbHighCut: 11000,
          reverbColor: 22,
        },
      },
      {
        t: 1,
        params: {
          reverbWet: 64,
          reverbSize: 88,
          reverbDecay: 11.2,
          reverbPredelay: 52,
          reverbWidth: 186,
          reverbDistance: 64,
          reverbEarly: 64,
          reverbDiffusion: 84,
          reverbShimmer: 28,
          reverbModDepth: 30,
          reverbHighCut: 9800,
          reverbColor: 28,
        },
      },
    ],
  },
  {
    axis: 'echo',
    module: 'delay',
    stops: [
      {
        t: 0,
        params: {
          delayWet: 0,
          delayFeedback: 35,
          delayTime: 300,
          delayWidth: 100,
          delayDiffusion: 0,
          delayOffset: 0,
        },
      },
      {
        t: 0.28,
        params: {
          delayWet: 14,
          delayFeedback: 32,
          delayTime: 240,
          delayWidth: 118,
          delayDiffusion: 10,
          delayOffset: 8,
        },
      },
      {
        t: 0.55,
        params: {
          delayWet: 30,
          delayFeedback: 44,
          delayTime: 390,
          delayWidth: 136,
          delayDiffusion: 18,
          delayOffset: 14,
        },
      },
      {
        t: 0.8,
        params: {
          delayWet: 44,
          delayFeedback: 52,
          delayTime: 520,
          delayWidth: 150,
          delayDiffusion: 24,
          delayOffset: 18,
        },
      },
      {
        t: 1,
        params: {
          delayWet: 56,
          delayFeedback: 60,
          delayTime: 640,
          delayWidth: 164,
          delayDiffusion: 30,
          delayOffset: 22,
        },
      },
    ],
  },
  {
    axis: 'grain',
    module: 'grain',
    stops: [
      {
        t: 0,
        params: {
          density: 18.4,
          scatter: 45,
          grainSize: 120,
          pitchSpread: 7.2,
        },
      },
      {
        t: 0.35,
        params: {
          density: 24,
          scatter: 52,
          grainSize: 150,
          pitchSpread: 5.5,
        },
      },
      {
        t: 0.7,
        params: {
          density: 34,
          scatter: 62,
          grainSize: 88,
          pitchSpread: 8.4,
        },
      },
      {
        t: 1,
        params: {
          density: 44,
          scatter: 72,
          grainSize: 58,
          pitchSpread: 10.5,
        },
      },
    ],
  },
  {
    axis: 'dirt',
    module: 'saturation',
    stops: [
      { t: 0, params: { saturation: 0 } },
      { t: 0.4, params: { saturation: 12 } },
      { t: 0.72, params: { saturation: 22 } },
      { t: 1, params: { saturation: 34 } },
    ],
  },
  {
    axis: 'tight',
    module: 'compressor',
    stops: [
      {
        t: 0,
        params: {
          compressorThreshold: -6,
          compressorRatio: 2.4,
          compressorAttack: 12,
          compressorRelease: 180,
          compressorKnee: 14,
          compressorMakeup: 0,
        },
      },
      {
        t: 0.4,
        params: {
          compressorThreshold: -12,
          compressorRatio: 4.2,
          compressorAttack: 8,
          compressorRelease: 140,
          compressorKnee: 10,
          compressorMakeup: 1.2,
        },
      },
      {
        t: 0.72,
        params: {
          compressorThreshold: -18,
          compressorRatio: 7.5,
          compressorAttack: 3.5,
          compressorRelease: 110,
          compressorKnee: 5,
          compressorMakeup: 2.4,
        },
      },
      {
        t: 1,
        params: {
          compressorThreshold: -24,
          compressorRatio: 11,
          compressorAttack: 1.4,
          compressorRelease: 90,
          compressorKnee: 2.5,
          compressorMakeup: 3.6,
        },
      },
    ],
  },
  {
    axis: 'mod',
    module: 'grain',
    stops: [
      {
        t: 0,
        params: {
          motionDepth: 0,
          motionRate: 0.3,
          motionJitter: 30,
        },
      },
      {
        t: 0.35,
        params: {
          motionDepth: 22,
          motionRate: 0.45,
          motionJitter: 34,
        },
      },
      {
        t: 0.7,
        params: {
          motionDepth: 48,
          motionRate: 0.9,
          motionJitter: 42,
        },
      },
      {
        t: 1,
        params: {
          motionDepth: 72,
          motionRate: 1.6,
          motionJitter: 52,
        },
      },
    ],
  },
  {
    axis: 'drift',
    module: 'delay',
    stops: [
      {
        t: 0,
        params: {
          delayStereo: 1,
          delayWidth: 100,
          delayOffset: 0,
          delayPan: 0,
          delayModDepth: 0,
          delayModRate: 0.4,
          delayTime: 300,
          delayTimeR: 300,
          delayWet: 0,
          delayFeedback: 8,
        },
      },
      {
        t: 0.35,
        params: {
          delayStereo: 1,
          delayWidth: 128,
          delayOffset: 18,
          delayPan: 0,
          delayModDepth: 14,
          delayModRate: 0.55,
          delayTime: 22,
          delayTimeR: 38,
          delayWet: 12,
          delayFeedback: 6,
        },
      },
      {
        t: 0.7,
        params: {
          delayStereo: 1,
          delayWidth: 162,
          delayOffset: 32,
          delayPan: 0,
          delayModDepth: 26,
          delayModRate: 1.1,
          delayTime: 28,
          delayTimeR: 52,
          delayWet: 18,
          delayFeedback: 10,
        },
      },
      {
        t: 1,
        params: {
          delayStereo: 1,
          delayWidth: 188,
          delayOffset: 44,
          delayPan: 0,
          delayModDepth: 36,
          delayModRate: 1.8,
          delayTime: 18,
          delayTimeR: 64,
          delayWet: 22,
          delayFeedback: 12,
        },
      },
    ],
  },
]
