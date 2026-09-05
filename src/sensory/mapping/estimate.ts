import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { SensoryValues } from '../sensoryState'
import { clampSensoryValue, defaultSensoryValues } from '../sensoryState'
import type { DspSnapshot } from './mappingEngine'

/** Heuristic overlay positions. Used only as a hint; never rewritten onto DSP. */
export function estimateSensoryFromDsp(dsp: DspSnapshot): SensoryValues {
  const p = dsp.params
  const high = dsp.eqBands[3]
  const low = dsp.eqBands[0]
  const openAir = high && high.type === 'highshelf' ? high.gain / 6 : 0
  const tightHp = low && low.type === 'highpass' ? -Math.min(1, (low.frequency - 20) / 200) : 0
  return {
    ...defaultSensoryValues(),
    character: clampSensoryValue('character', openAir + tightHp),
    space: clampSensoryValue('space', toNormalized(p.reverbWet, PARAMS.reverbWet)),
    echo: clampSensoryValue('echo', p.delayWet / 56),
    grain: clampSensoryValue('grain', (p.density - 18) / 60),
    dirt: clampSensoryValue('dirt', p.saturation / 34),
    tight: clampSensoryValue('tight', (PARAMS.compressorThreshold.defaultValue - p.compressorThreshold) / 20),
    mod: clampSensoryValue('mod', p.motionDepth / 72),
    drift: clampSensoryValue('drift', (p.delayWidth - 100) / 90 + p.delayModDepth / 80),
    pan: clampSensoryValue('pan', (dsp.fxLfos.input[0]?.target === 'pan' ? (dsp.fxLfos.input[0].depth - 16) / 70 : 0)),
  }
}
