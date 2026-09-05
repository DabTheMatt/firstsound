import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

/** Lift pre-space-overhaul presets into the current delay/reverb ranges. */
export function migrateSpaceParams(incoming: Record<string, number>): Partial<Record<ParamId, number>> {
  const hasNew = typeof incoming.delayWidth === 'number' || typeof incoming.reverbWidth === 'number'
  const params: Partial<Record<ParamId, number>> = {}
  for (const id of Object.keys(PARAMS) as ParamId[]) {
    const value = incoming[id]
    if (typeof value !== 'number' || Number.isNaN(value)) continue
    params[id] = applyParamValue(value, PARAMS[id])
  }
  if (!hasNew && typeof incoming.reverbDecay === 'number' && incoming.reverbDecay > 1.5) {
    const pct = Math.min(100, Math.max(10, incoming.reverbDecay))
    params.reverbDecay = applyParamValue(0.15 + (pct / 100) * 6.5, PARAMS.reverbDecay)
  }
  if (!hasNew && typeof incoming.reverbPredelay === 'number') {
    params.reverbPredelay = applyParamValue(Math.max(0.1, incoming.reverbPredelay), PARAMS.reverbPredelay)
  }
  // Legacy Mix crossfaded dry away. Map it onto independent Wet, keep Dry at 100%.
  if (typeof incoming.delayWet !== 'number' && typeof incoming.spaceMix === 'number') {
    params.delayDry = PARAMS.delayDry.defaultValue
    params.delayWet = applyParamValue(incoming.spaceMix, PARAMS.delayWet)
    if (typeof incoming.delayOutput !== 'number') params.delayOutput = PARAMS.delayOutput.defaultValue
  }
  if (typeof incoming.delayWetR !== 'number' && typeof incoming.delayWet === 'number') {
    params.delayWetR = applyParamValue(incoming.delayWet, PARAMS.delayWetR)
  }
  if (typeof incoming.delayFeedbackR !== 'number' && typeof incoming.delayFeedback === 'number') {
    params.delayFeedbackR = applyParamValue(incoming.delayFeedback, PARAMS.delayFeedbackR)
  }
  if (typeof incoming.reverbWet !== 'number' && typeof incoming.reverb === 'number') {
    params.reverbDry = PARAMS.reverbDry.defaultValue
    params.reverbWet = applyParamValue(incoming.reverb, PARAMS.reverbWet)
    if (typeof incoming.reverbOutput !== 'number') params.reverbOutput = PARAMS.reverbOutput.defaultValue
  }
  return params
}
