import { envelopeToParam } from '../../audio/automation/automation'
import { PARAMS } from '../../audio/parameters/definitions'
import { formatParamValue } from '../../audio/parameters/mapping'
import type { ParamId } from '../../audio/parameters/types'

/** Parameter text for one envelope point. The stored node value stays normalized. */
export function toDisplayAutomationValue(paramId: ParamId, normalized: number): string {
  return formatParamValue(envelopeToParam(paramId, normalized), PARAMS[paramId])
}
