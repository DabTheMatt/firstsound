import { complementaryPct, isCorrelated } from '../fx/dryWet'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import type { ReverbType } from '../fx/types'
import { REVERB_TYPE_OPTIONS, REVERB_TYPE_WEIGHTS, selectRef } from './catalog'
import { isRandomizable, randomParamValue } from './distributions'
import { pickDifferent } from './rng'

/** Wet-return and safety trims. Chaos must not draw them. */
export const REVERB_GAIN_STAGING: readonly ParamId[] = ['reverbOutput', 'reverbLimit']

/**
 * One Randomize Reverb transaction.
 * Linked mode draws Mix (`reverbWet`) and derives Dry.
 * Unlinked mode draws Dry and Wet as levels with a floor so both cannot sit near zero.
 * Equal-power coefficients are not written here.
 */
export function planReverbRandom(input: {
  params: Record<ParamId, number>
  type: ReverbType
  chaos: boolean
  participating: readonly string[]
  intensity: (id: ParamId) => number
  rand: () => number
  bpm: number
}): { patch: Partial<Record<ParamId, number>>; type: ReverbType } {
  const chosen = new Set(input.participating)
  const linked = isCorrelated(input.params.reverbCorrelate)
  const patch: Partial<Record<ParamId, number>> = {}
  for (const id of chosen) {
    if (!isRandomizable(id as ParamId)) continue
    const paramId = id as ParamId
    if (paramId === 'reverbWet' || paramId === 'reverbDry') continue
    if ((REVERB_GAIN_STAGING as readonly string[]).includes(paramId)) continue
    patch[paramId] = draw(paramId, input)
  }
  if (chosen.has('reverbWet')) {
    if (linked) {
      const wet = draw('reverbWet', input)
      patch.reverbWet = wet
      patch.reverbDry = applyParamValue(complementaryPct(wet), PARAMS.reverbDry)
    } else {
      const dry = randomParamValue({
        id: 'reverbDry',
        current: input.params.reverbDry,
        intensity: input.intensity('reverbWet'),
        chaos: input.chaos,
        rand: input.rand,
        bpm: input.bpm,
      })
      const wet = randomParamValue({
        id: 'reverbDry',
        current: input.params.reverbWet,
        intensity: input.intensity('reverbWet'),
        chaos: input.chaos,
        rand: input.rand,
        bpm: input.bpm,
      })
      patch.reverbDry = finiteParam('reverbDry', dry)
      patch.reverbWet = finiteParam('reverbWet', wet)
    }
  }
  keepReverbBandOpen(input.params, patch)
  for (const id of Object.keys(patch) as ParamId[]) {
    patch[id] = finiteParam(id, patch[id] ?? Number.NaN)
  }
  let type = input.type
  if (chosen.has(selectRef('reverbType')) && input.type !== 'custom') {
    type = pickDifferent(REVERB_TYPE_OPTIONS, input.type, REVERB_TYPE_WEIGHTS, input.rand)
  }
  return { patch, type }
}

/** Random Setup name. Linked Mix is one control; the stored id is still `reverbWet`. */
export function reverbRandomSetupLabel(id: ParamId): string | null {
  if (id === 'reverbWet') return 'Mix'
  return null
}

function draw(
  id: ParamId,
  input: {
    params: Record<ParamId, number>
    chaos: boolean
    intensity: (id: ParamId) => number
    rand: () => number
    bpm: number
  },
): number {
  return finiteParam(
    id,
    randomParamValue({
      id,
      current: input.params[id],
      intensity: input.intensity(id),
      chaos: input.chaos,
      rand: input.rand,
      bpm: input.bpm,
    }),
  )
}

function finiteParam(id: ParamId, value: number): number {
  const def = PARAMS[id]
  if (!def) return 0
  if (!Number.isFinite(value)) return def.defaultValue
  return applyParamValue(value, def)
}

/** Low Cut above High Cut empties the wet band. Keep a gap a musical filter can pass. */
function keepReverbBandOpen(params: Record<ParamId, number>, patch: Partial<Record<ParamId, number>>): void {
  if (patch.reverbLowCut == null && patch.reverbHighCut == null) return
  let low = patch.reverbLowCut ?? params.reverbLowCut
  let high = patch.reverbHighCut ?? params.reverbHighCut
  if (!(low + 500 > high)) {
    if (patch.reverbLowCut != null) patch.reverbLowCut = finiteParam('reverbLowCut', low)
    if (patch.reverbHighCut != null) patch.reverbHighCut = finiteParam('reverbHighCut', high)
    return
  }
  high = Math.min(PARAMS.reverbHighCut.max, Math.max(high, low + 1200))
  low = Math.min(low, high - 1200)
  low = Math.max(PARAMS.reverbLowCut.min, low)
  patch.reverbLowCut = finiteParam('reverbLowCut', low)
  patch.reverbHighCut = finiteParam('reverbHighCut', high)
}
