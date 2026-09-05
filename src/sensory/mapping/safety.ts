import { PARAMS } from '../../audio/parameters/definitions'
import { applyParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'
import type { DspSnapshot } from './mappingEngine'

/** Caps so sensory morphs stay musical: no speaker-busting wet, no sample melt. */
export const SENSORY_SAFETY = {
  eqGain: 7.5,
  reverbWet: 40,
  reverbDecay: 5.5,
  reverbShimmer: 6,
  delayWet: 48,
  delayFeedback: 40,
  delayModDepth: 38,
  saturation: 34,
  density: 46,
  pitchSpread: 11,
  compressorMakeup: 4,
} as const

function cap(params: DspSnapshot['params'], id: ParamId, max: number, min?: number): void {
  const def = PARAMS[id]
  const lo = min ?? def.min
  const hi = Math.min(def.max, max)
  params[id] = applyParamValue(Math.min(hi, Math.max(lo, params[id])), def)
}

export function applySensorySafety(dsp: DspSnapshot): void {
  for (const band of dsp.eqBands) {
    band.gain = Math.min(SENSORY_SAFETY.eqGain, Math.max(-SENSORY_SAFETY.eqGain, band.gain))
  }
  cap(dsp.params, 'reverbWet', SENSORY_SAFETY.reverbWet, 0)
  cap(dsp.params, 'reverbDecay', SENSORY_SAFETY.reverbDecay)
  cap(dsp.params, 'reverbShimmer', SENSORY_SAFETY.reverbShimmer, 0)
  cap(dsp.params, 'delayWet', SENSORY_SAFETY.delayWet, 0)
  cap(dsp.params, 'delayFeedback', SENSORY_SAFETY.delayFeedback, 0)
  dsp.params.delayWetR = dsp.params.delayWet
  dsp.params.delayFeedbackR = dsp.params.delayFeedback
  cap(dsp.params, 'delayWetR', SENSORY_SAFETY.delayWet, 0)
  cap(dsp.params, 'delayFeedbackR', SENSORY_SAFETY.delayFeedback, 0)
  cap(dsp.params, 'delayModDepth', SENSORY_SAFETY.delayModDepth, 0)
  cap(dsp.params, 'saturation', SENSORY_SAFETY.saturation, 0)
  cap(dsp.params, 'density', SENSORY_SAFETY.density)
  cap(dsp.params, 'pitchSpread', SENSORY_SAFETY.pitchSpread, 0)
  cap(dsp.params, 'compressorMakeup', SENSORY_SAFETY.compressorMakeup)
  dsp.params.delayReverse = PARAMS.delayReverse.defaultValue
  dsp.params.reverbReverse = PARAMS.reverbReverse.defaultValue
  dsp.params.delayFreeze = 0
  dsp.params.reverbFreeze = 0
  const high = dsp.eqBands[3]
  if (high) dsp.params.eq4Gain = high.gain
  const low = dsp.eqBands[0]
  if (low) dsp.params.eq1Gain = low.gain
}
