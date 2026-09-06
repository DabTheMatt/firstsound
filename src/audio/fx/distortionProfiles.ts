import type { ParamId } from '../parameters/types'
import {
  DISTORTION_TYPES,
  type DistortionNoiseKind,
  type DistortionType,
} from './types'

export type DistortionTypeProfile = {
  hp: number
  lp: number
  tone: number
  bias: number
  bits: number
  downsample: number
  noise: number
  noiseKind: DistortionNoiseKind
}

export const DISTORTION_TYPE_PROFILES: Record<DistortionType, DistortionTypeProfile> = {
  saturation: {
    hp: 30,
    lp: 14000,
    tone: 58,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  overdrive: {
    hp: 80,
    lp: 9000,
    tone: 48,
    bias: 52,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  tube: {
    hp: 40,
    lp: 11000,
    tone: 52,
    bias: 62,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  analog: {
    hp: 90,
    lp: 6200,
    tone: 38,
    bias: 55,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  tape: {
    hp: 55,
    lp: 4800,
    tone: 32,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 4,
    noiseKind: 'pink',
  },
  digital: {
    hp: 20,
    lp: 18000,
    tone: 78,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  fuzz: {
    hp: 120,
    lp: 4200,
    tone: 28,
    bias: 58,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  clip: {
    hp: 20,
    lp: 18000,
    tone: 82,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  fold: {
    hp: 40,
    lp: 16000,
    tone: 70,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  bitcrush: {
    hp: 40,
    lp: 12000,
    tone: 55,
    bias: 50,
    bits: 8,
    downsample: 1,
    noise: 0,
    noiseKind: 'white',
  },
  downsample: {
    hp: 30,
    lp: 8000,
    tone: 42,
    bias: 50,
    bits: 16,
    downsample: 14,
    noise: 0,
    noiseKind: 'white',
  },
  noise: {
    hp: 60,
    lp: 10000,
    tone: 50,
    bias: 50,
    bits: 16,
    downsample: 1,
    noise: 28,
    noiseKind: 'white',
  },
  vinyl: {
    hp: 70,
    lp: 3600,
    tone: 26,
    bias: 48,
    bits: 12,
    downsample: 2,
    noise: 16,
    noiseKind: 'pink',
  },
}

export function distortionTypeProfile(type: DistortionType): DistortionTypeProfile {
  return DISTORTION_TYPE_PROFILES[type]
}

/** Color knobs for a type. Leaves Drive and Mix alone. */
export function distortionTypeColorPatch(type: DistortionType): Partial<Record<ParamId, number>> {
  const p = distortionTypeProfile(type)
  return {
    distortionTone: p.tone,
    distortionBias: p.bias,
    distortionBits: p.bits,
    distortionDownsample: p.downsample,
    distortionNoise: p.noise,
  }
}

export function allDistortionTypes(): DistortionType[] {
  return DISTORTION_TYPES.map((t) => t.value)
}
