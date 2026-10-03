import {
  LFO_DEPTH_DEFAULT,
  LFO_RATE_DEFAULT,
  fxLfoKindForParam,
  lfoBinding,
  nextFreeLfoSlot,
  type FxLfo,
  type FxLfoKind,
  type FxLfoMap,
} from '../../audio/fx/lfo'
import type { ParamId } from '../../audio/parameters/types'

export type ModulationHost = {
  getSnapshot(): {
    fxLfos: FxLfoMap
    lfoShown: Record<FxLfoKind, number>
  }
  setFxLfo(kind: FxLfoKind, slot: number, patch: Partial<FxLfo>): void
  addFxLfo(kind: FxLfoKind): number | null
}

/**
 * Bind the shared LFO bank to a parameter.
 * An existing route is reused. This does not allocate a second oscillator
 * or touch automation / the stored parameter value.
 */
export function connectParameterLfo(
  host: ModulationHost,
  id: ParamId,
  scope?: { instanceId?: string; bandId?: string },
): boolean {
  const kind = fxLfoKindForParam(id)
  if (!kind) return false
  const trackLevel = kind === 'input' || kind === 'mixer'
  const instanceId = trackLevel ? undefined : scope?.instanceId
  const bandId = trackLevel ? undefined : scope?.bandId
  const existing = lfoBinding(host.getSnapshot().fxLfos, id)
  if (existing) {
    host.setFxLfo(existing.kind, existing.slot, {
      instanceId,
      bandId,
    })
    return true
  }
  const snap = host.getSnapshot()
  let slot = nextFreeLfoSlot(snap.fxLfos[kind])
  if (slot == null) return false
  const shown = snap.lfoShown[kind] ?? 1
  if (slot >= shown) {
    const added = host.addFxLfo(kind)
    if (added == null) return false
    slot = added
  }
  const current = host.getSnapshot().fxLfos[kind][slot]
  host.setFxLfo(kind, slot, {
    target: id,
    depth: current && current.depth > 0 ? current.depth : LFO_DEPTH_DEFAULT,
    rateHz: current?.rateHz || LFO_RATE_DEFAULT,
    shape: current?.shape ?? 'sine',
    instanceId,
    bandId,
  })
  return true
}

/**
 * Drop this parameter's LFO route.
 * The stored value and any automation lane stay as they are.
 */
export function removeParameterLfo(host: ModulationHost, id: ParamId): void {
  const binding = lfoBinding(host.getSnapshot().fxLfos, id)
  if (!binding) return
  host.setFxLfo(binding.kind, binding.slot, { target: null })
}

/** Write rate, depth, or shape on the slot already routed to this parameter. */
export function setParameterLfoPrimary(
  host: ModulationHost,
  id: ParamId,
  patch: Partial<Pick<FxLfo, 'rateHz' | 'depth' | 'shape'>>,
): void {
  const binding = lfoBinding(host.getSnapshot().fxLfos, id)
  if (!binding) return
  host.setFxLfo(binding.kind, binding.slot, patch)
}

/**
 * Bypass or resume the LFO already routed to this parameter.
 * Rate, depth, shape, target, and phase stay where they are.
 */
export function setParameterLfoEnabled(host: ModulationHost, id: ParamId, enabled: boolean): void {
  const binding = lfoBinding(host.getSnapshot().fxLfos, id)
  if (!binding) return
  host.setFxLfo(binding.kind, binding.slot, { enabled })
}
