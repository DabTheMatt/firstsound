import { PARAMS } from '../../audio/parameters/definitions'
import { toNormalized } from '../../audio/parameters/mapping'
import type { SensoryValues } from '../sensoryState'
import { clampSensoryValue, defaultSensoryValues } from '../sensoryState'
import type { DspSnapshot } from './mappingEngine'

/** Heuristic overlay positions. Used only as a hint; never rewritten onto DSP. */
export function estimateSensoryFromDsp(dsp: DspSnapshot): SensoryValues {
  const p = dsp.params
  const high = dsp.eqBands[3]
  const low = dsp.eqBands[0] ?? dsp.eqBands[1]
  const brightGain = high && (high.type === 'highshelf' || high.type === 'peaking') ? high.gain / 8 : 0
  const warmGain = low && low.type === 'lowshelf' ? low.gain / 6 : 0
  return {
    ...defaultSensoryValues(),
    brightness: clampSensoryValue(brightGain + (p.reverbShimmer / 100) * 0.2),
    warmth: clampSensoryValue(warmGain + (p.reverbColor / 100) * 0.4 + (p.saturation / 200)),
    distance: clampSensoryValue(toNormalized(p.reverbWet, PARAMS.reverbWet) * 2 - 0.15),
    hardness: clampSensoryValue((PARAMS.compressorAttack.defaultValue - p.compressorAttack) / 10),
    fullness: clampSensoryValue((p.reverbWidth - 100) / 120 + (low?.gain ?? 0) / 10),
    wildness: clampSensoryValue(p.motionDepth / 80 + p.reverbModDepth / 200),
    motion: clampSensoryValue(p.motionDepth / 70),
    strangeness: clampSensoryValue(p.delayReverse / 80 + p.reverbShimmer / 140 + Math.abs(p.delayPitch) / 24),
  }
}
