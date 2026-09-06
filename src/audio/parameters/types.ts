export type ParamMapping = 'linear' | 'log'

export type ParamId =
  | 'start'
  | 'end'
  | 'speed'
  | 'pitch'
  | 'stretchInterp'
  | 'gain'
  | 'pan'
  | 'channelGainL'
  | 'channelGainR'
  | 'makeMono'
  | 'invertPhase'
  | 'grainSize'
  | 'density'
  | 'position'
  | 'scatter'
  | 'grainPitch'
  | 'pitchSpread'
  | 'filterCutoff'
  | 'filterReso'
  | 'filterDrive'
  | 'filterMix'
  | 'filterKind'
  | 'filterSlope'
  | 'filterCharacter'
  | 'filterMorph'
  | 'filterLfoRate'
  | 'filterLfoDepth'
  | 'filterLfoShape'
  | 'filterLfoSync'
  | 'filterLfoNote'
  | 'filterLfoNoteKind'
  | 'filterEnvAmt'
  | 'filterEnvAttack'
  | 'filterEnvRelease'
  | 'filterEnvDir'
  | 'filterAdsAmt'
  | 'filterAdsAttack'
  | 'filterAdsDecay'
  | 'filterAdsSustain'
  | 'filterAdsRelease'
  | 'filterPitchTrack'
  | 'delayDry'
  | 'delayWet'
  | 'delayWetR'
  | 'delayOutput'
  | 'delayTime'
  | 'delayTimeR'
  | 'delayFeedback'
  | 'delayFeedbackR'
  | 'delayStereo'
  | 'reverbDry'
  | 'reverbWet'
  | 'reverbCorrelate'
  | 'reverbOutput'
  | 'reverbLimit'
  | 'motionDepth'
  | 'motionRate'
  | 'motionJitter'
  | 'outputGain'
  | 'saturation'
  | 'saturationMix'
  | 'distortionTone'
  | 'distortionBias'
  | 'distortionBits'
  | 'distortionDownsample'
  | 'distortionNoise'
  | 'distortionOutput'
  | 'reverbSize'
  | 'reverbDecay'
  | 'reverbPredelay'
  | 'reverbDamping'
  | 'bpm'
  | 'delaySync'
  | 'delayNote'
  | 'delayNoteKind'
  | 'delaySyncR'
  | 'delayNoteR'
  | 'delayNoteKindR'
  | 'delayWidth'
  | 'delayPan'
  | 'delayOffset'
  | 'delayHp'
  | 'delayLp'
  | 'delayDrive'
  | 'delayModRate'
  | 'delayModDepth'
  | 'delayWow'
  | 'delayFlutter'
  | 'delayDiffusion'
  | 'delayPitch'
  | 'delayReverse'
  | 'delayDuck'
  | 'delayFreeze'
  | 'delayDrift'
  | 'reverbSync'
  | 'reverbNote'
  | 'reverbNoteKind'
  | 'reverbEarly'
  | 'reverbDiffusion'
  | 'reverbDensity'
  | 'reverbLowCut'
  | 'reverbHighCut'
  | 'reverbWidth'
  | 'reverbPan'
  | 'reverbOffset'
  | 'reverbInput'
  | 'reverbStereo'
  | 'reverbModRate'
  | 'reverbModDepth'
  | 'reverbShimmerPitch'
  | 'reverbShimmer'
  | 'reverbDrive'
  | 'reverbDuck'
  | 'reverbGate'
  | 'reverbGateThres'
  | 'reverbGateAttack'
  | 'reverbGateHold'
  | 'reverbGateRelease'
  | 'reverbReverse'
  | 'reverbFreeze'
  | 'reverbColor'
  | 'reverbDistance'
  | 'limiterThreshold'
  | 'limiterCeiling'
  | 'limiterRelease'
  | 'limiterAttack'
  | 'limiterKnee'
  | 'limiterRatio'
  | 'limiterMakeup'
  | 'limiterInput'
  | 'limiterAutoMakeup'
  | 'compressorThreshold'
  | 'compressorRatio'
  | 'compressorKnee'
  | 'compressorAttack'
  | 'compressorRelease'
  | 'compressorMakeup'
  | 'compressorInput'
  | 'compressorAutoMakeup'
  | 'eq1Freq'
  | 'eq1Gain'
  | 'eq1Q'
  | 'eq2Freq'
  | 'eq2Gain'
  | 'eq2Q'
  | 'eq3Freq'
  | 'eq3Gain'
  | 'eq3Q'
  | 'eq4Freq'
  | 'eq4Gain'
  | 'eq4Q'
  | 'eq5Freq'
  | 'eq5Gain'
  | 'eq5Q'
  | 'eq6Freq'
  | 'eq6Gain'
  | 'eq6Q'
  | 'eq7Freq'
  | 'eq7Gain'
  | 'eq7Q'
  | 'eq8Freq'
  | 'eq8Gain'
  | 'eq8Q'
  | 'eqcfTeeth'
  | 'eqcfGain'
  | 'eqcfSpacing'
  | 'eqcfFreq'

export type FilterType =
  | 'off'
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'

export type ParamDef = {
  id: ParamId
  label: string
  min: number
  max: number
  defaultValue: number
  unit: string
  mapping: ParamMapping
  step?: number
}

export type EngineMode = 'playback' | 'grain'

export type PlaybackDirection = 'forward' | 'reverse' | 'pingpong'

/** Where transport scrubbing (ring drag / wheel) is allowed to land. */
export type ScrubMode = 'region' | 'sample'

import type { ChainModule } from '../chain/chain'
import type { CombFilterState } from '../engine/comb'
import type { EqBand } from '../engine/eqBands'
import type { DelayType, DistortionNoiseKind, DistortionType, ReverbType } from '../fx/types'
import type { MixTrack } from '../mix/tracks'

export type EqListenMode = 'sample' | 'filters'

export type PresetV1 = {
  instrument: 'field'
  version: 1
  loop: boolean
  engineMode: EngineMode
  params: Record<string, number>
  // Optional so presets saved before these modules existed still load.
  filterType?: FilterType
  direction?: PlaybackDirection
  // Legacy flag kept for reading presets saved before ping-pong existed.
  reverse?: boolean
  chain?: ChainModule[]
  eqBands?: EqBand[]
  muted?: boolean
  delayType?: DelayType
  reverbType?: ReverbType
  distortionType?: DistortionType
  distortionNoiseKind?: DistortionNoiseKind
  comb?: CombFilterState
  fxLfos?: unknown
  tracks?: MixTrack[]
  /** Legacy parallel mix-layer snapshots; parsed as tracks. */
  mixLayers?: unknown
  masterMix?: number
}
