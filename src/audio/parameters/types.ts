export type ParamMapping = 'linear' | 'log'

export type ParamId =
  | 'start'
  | 'end'
  | 'speed'
  | 'pitch'
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
  | 'delayDry'
  | 'delayWet'
  | 'delayOutput'
  | 'delayTime'
  | 'delayFeedback'
  | 'reverbDry'
  | 'reverbWet'
  | 'reverbOutput'
  | 'reverbLimit'
  | 'motionDepth'
  | 'motionRate'
  | 'motionJitter'
  | 'outputGain'
  | 'saturation'
  | 'reverbSize'
  | 'reverbDecay'
  | 'reverbPredelay'
  | 'reverbDamping'
  | 'bpm'
  | 'delaySync'
  | 'delayNote'
  | 'delayNoteKind'
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
import type { DelayType, ReverbType } from '../fx/types'

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
  comb?: CombFilterState
  fxLfos?: unknown
}
