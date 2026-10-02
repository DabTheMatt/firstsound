import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized, toNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

/**
 * Automation owns the center only while transport is playing and the lane has
 * nodes. Random then contributes a normalized offset on that center.
 * Otherwise Random writes the manual base. LFO always runs after both.
 */
export function automationOwnsCenter(nodeCount: number, playing: boolean): boolean {
  return playing && nodeCount > 0
}

/** Add a normalized offset to an automated center and map it back. */
export function applyRandomOffset(center: number, id: ParamId, offset: number): number {
  if (!Number.isFinite(offset) || offset === 0) return center
  const def = PARAMS[id]
  const next = clamp(toNormalized(center, def) + offset, 0, 1)
  return applyParamValue(fromNormalized(next, def), def)
}

export function offsetForTarget(center: number, target: number, id: ParamId): number {
  const def = PARAMS[id]
  return clamp(toNormalized(target, def) - toNormalized(center, def), -1, 1)
}
