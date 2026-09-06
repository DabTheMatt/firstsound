import { complementaryPct, isCorrelated } from './dryWet'
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
  if (typeof incoming.delayWet !== 'number' && typeof incoming.spaceMix === 'number') {
    params.delayWet = applyParamValue(incoming.spaceMix, PARAMS.delayWet)
    if (typeof incoming.delayOutput !== 'number') params.delayOutput = PARAMS.delayOutput.defaultValue
  }
  if (typeof incoming.delayWetR !== 'number' && typeof incoming.delayWet === 'number') {
    params.delayWetR = applyParamValue(incoming.delayWet, PARAMS.delayWetR)
  }
  if (typeof incoming.delayDryR !== 'number' && typeof incoming.delayDry === 'number') {
    params.delayDryR = applyParamValue(incoming.delayDry, PARAMS.delayDryR)
  }
  if (typeof incoming.delayFeedbackR !== 'number' && typeof incoming.delayFeedback === 'number') {
    params.delayFeedbackR = applyParamValue(incoming.delayFeedback, PARAMS.delayFeedbackR)
  }
  const delayWet = params.delayWet
  if (typeof incoming.delayCorrelate !== 'number') {
    params.delayCorrelate = PARAMS.delayCorrelate.defaultValue
  }
  if (isCorrelated(params.delayCorrelate ?? PARAMS.delayCorrelate.defaultValue) && typeof delayWet === 'number') {
    params.delayDry = complementaryPct(delayWet)
  } else if (typeof incoming.delayDry !== 'number' && typeof delayWet === 'number') {
    params.delayDry = PARAMS.delayDry.defaultValue
  }
  const delayWetR = params.delayWetR
  if (isCorrelated(params.delayCorrelate ?? PARAMS.delayCorrelate.defaultValue) && typeof delayWetR === 'number') {
    params.delayDryR = complementaryPct(delayWetR)
  } else if (typeof incoming.delayDryR !== 'number' && typeof delayWetR === 'number') {
    params.delayDryR = PARAMS.delayDryR.defaultValue
  }
  if (typeof incoming.reverbWet !== 'number' && typeof incoming.reverb === 'number') {
    params.reverbWet = applyParamValue(incoming.reverb, PARAMS.reverbWet)
    if (typeof incoming.reverbOutput !== 'number') params.reverbOutput = PARAMS.reverbOutput.defaultValue
  }
  const wet = params.reverbWet
  if (typeof incoming.reverbCorrelate !== 'number') {
    params.reverbCorrelate = PARAMS.reverbCorrelate.defaultValue
  }
  if (isCorrelated(params.reverbCorrelate ?? PARAMS.reverbCorrelate.defaultValue) && typeof wet === 'number') {
    params.reverbDry = complementaryPct(wet)
  } else if (typeof incoming.reverbDry !== 'number' && typeof wet === 'number') {
    params.reverbDry = PARAMS.reverbDry.defaultValue
  }
  return params
}
