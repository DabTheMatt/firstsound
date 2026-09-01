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
  return params
}
