import type { ModuleType } from '../audio/chain/chain'
import { PARAMS } from '../audio/parameters/definitions'
import { formatParamValue } from '../audio/parameters/mapping'
import type { ParamId } from '../audio/parameters/types'

/**
 * Presentation-only grouping for the phone context panel.
 * Audio state stays on the shared parameter model.
 */
export type MobileParamPriority = {
  primary: ParamId[]
  secondary: ParamId[]
  advanced: ParamId[]
}

export const MOBILE_PARAM_PRIORITY: Record<ModuleType, MobileParamPriority> = {
  gain: {
    primary: ['gain', 'speed', 'pitch'],
    secondary: ['stretchInterp', 'pan'],
    advanced: ['channelGainL', 'channelGainR', 'makeMono', 'invertPhase'],
  },
  grain: {
    primary: ['grainSize', 'density', 'position'],
    secondary: ['scatter', 'grainPitch'],
    advanced: ['pitchSpread'],
  },
  eq: {
    primary: [],
    secondary: [],
    advanced: [],
  },
  distortion: {
    primary: ['saturation', 'saturationMix'],
    secondary: ['distortionTone', 'distortionOutput'],
    advanced: ['distortionBits', 'distortionDownsample', 'distortionNoise', 'distortionBias'],
  },
  filter: {
    primary: ['filterCutoff', 'filterReso', 'filterMix'],
    secondary: ['filterDrive', 'filterEnvAmt'],
    advanced: ['filterEnvAttack', 'filterEnvRelease', 'filterLfoRate', 'filterLfoDepth'],
  },
  midside: {
    primary: ['msWidth', 'msBalance', 'msMidGain'],
    secondary: ['msSideGain', 'msRotate'],
    advanced: ['msCrossfeed', 'msHaasTime', 'msHaasAmount'],
  },
  delay: {
    primary: ['delayTime', 'delayFeedback', 'delayWet'],
    secondary: ['delayWidth', 'delayDry', 'delayHp'],
    advanced: ['delayLp', 'delayDrive', 'delayModRate', 'delayModDepth'],
  },
  reverb: {
    primary: ['reverbSize', 'reverbDecay', 'reverbWet'],
    secondary: ['reverbPredelay', 'reverbWidth', 'reverbDamping'],
    advanced: ['reverbDry', 'reverbLowCut', 'reverbHighCut', 'reverbEarly', 'reverbDiffusion'],
  },
  compressor: {
    primary: ['compressorThreshold', 'compressorRatio', 'compressorAttack', 'compressorRelease'],
    secondary: ['compressorKnee', 'compressorMakeup', 'compressorLowCut'],
    advanced: ['compressorInput'],
  },
  limiter: {
    primary: ['limiterCeiling', 'limiterRelease'],
    secondary: ['limiterAttack', 'limiterInput'],
    advanced: ['limiterKnee', 'limiterMakeup'],
  },
  output: {
    primary: ['outputGain'],
    secondary: [],
    advanced: [],
  },
}

export function mobilePriority(type: ModuleType): MobileParamPriority {
  return MOBILE_PARAM_PRIORITY[type]
}

export function primarySummary(type: ModuleType, params: Record<ParamId, number>): string {
  return mobilePriority(type)
    .primary.slice(0, 3)
    .map((id) => `${PARAMS[id].label} ${formatParamValue(params[id], PARAMS[id])}`)
    .join(' · ')
}
