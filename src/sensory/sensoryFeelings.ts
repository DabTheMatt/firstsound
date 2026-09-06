import type { SensoryAxisId } from './sensoryParameters'
import { SENSORY_AXES } from './sensoryParameters'
import { clampSensoryValue, type SensoryValues } from './sensoryState'

export type FeelingVisual = SensoryAxisId

export type SensoryFeeling = {
  id: SensoryAxisId
  label: string
  axis: SensoryAxisId
  kind: 'unipolar' | 'bipolar'
  from: string
  to: string
  visual: FeelingVisual
  ariaLabel: string
}

/** Right-rail controls. Hybrids braid more than one insert. */
export const SENSORY_FEELINGS: readonly SensoryFeeling[] = [
  {
    id: 'character',
    label: 'character',
    axis: 'character',
    kind: 'bipolar',
    from: 'tight',
    to: 'open',
    visual: 'character',
    ariaLabel: 'Character, tight to open. Double-click to rest.',
  },
  {
    id: 'space',
    label: 'space',
    axis: 'space',
    kind: 'unipolar',
    from: 'close',
    to: 'vast',
    visual: 'space',
    ariaLabel: 'Space, close to vast. Double-click to rest.',
  },
  {
    id: 'echo',
    label: 'echo',
    axis: 'echo',
    kind: 'unipolar',
    from: 'dry',
    to: 'echo',
    visual: 'echo',
    ariaLabel: 'Echo, dry to echo. Double-click to rest.',
  },
  {
    id: 'grain',
    label: 'grain',
    axis: 'grain',
    kind: 'unipolar',
    from: 'solid',
    to: 'grain',
    visual: 'grain',
    ariaLabel: 'Grain, solid to layered. Double-click to rest.',
  },
  {
    id: 'dirt',
    label: 'dirt',
    axis: 'dirt',
    kind: 'unipolar',
    from: 'clean',
    to: 'dirt',
    visual: 'dirt',
    ariaLabel: 'Dirt, clean to grit. Double-click to rest.',
  },
  {
    id: 'tight',
    label: 'tight',
    axis: 'tight',
    kind: 'unipolar',
    from: 'open',
    to: 'tight',
    visual: 'tight',
    ariaLabel: 'Tight, open to compressed. Double-click to rest.',
  },
  {
    id: 'mod',
    label: 'mod',
    axis: 'mod',
    kind: 'unipolar',
    from: 'still',
    to: 'mod',
    visual: 'mod',
    ariaLabel: 'Mod, still to modulated. Double-click to rest.',
  },
  {
    id: 'drift',
    label: 'drift',
    axis: 'drift',
    kind: 'unipolar',
    from: 'center',
    to: 'drift',
    visual: 'drift',
    ariaLabel: 'Drift, center to panorama. Double-click to rest.',
  },
  {
    id: 'pan',
    label: 'pan',
    axis: 'pan',
    kind: 'unipolar',
    from: 'still',
    to: 'pan',
    visual: 'pan',
    ariaLabel: 'Pan, still to orbiting. Double-click to rest.',
  },
  {
    id: 'veil',
    label: 'veil',
    axis: 'veil',
    kind: 'unipolar',
    from: 'clear',
    to: 'veil',
    visual: 'veil',
    ariaLabel: 'Veil, clear to distant. Double-click to rest.',
  },
  {
    id: 'halo',
    label: 'halo',
    axis: 'halo',
    kind: 'unipolar',
    from: 'bare',
    to: 'halo',
    visual: 'halo',
    ariaLabel: 'Halo, bare to blooming. Double-click to rest.',
  },
  {
    id: 'well',
    label: 'well',
    axis: 'well',
    kind: 'unipolar',
    from: 'flat',
    to: 'well',
    visual: 'well',
    ariaLabel: 'Well, flat to hollow. Double-click to rest.',
  },
]

export function feelingAmount(values: SensoryValues, feeling: SensoryFeeling): number {
  return values[feeling.axis]
}

export function applyFeelingAmount(values: SensoryValues, feeling: SensoryFeeling, amount: number): SensoryValues {
  return { ...values, [feeling.axis]: clampSensoryValue(feeling.axis, amount) }
}

export function restFeeling(values: SensoryValues, feeling: SensoryFeeling): SensoryValues {
  return { ...values, [feeling.axis]: 0 }
}

/** The control with the largest |amount|, else the preferred id. */
export function activeFeelingId(
  values: SensoryValues,
  preferred: string | null,
  feelings: readonly SensoryFeeling[] = SENSORY_FEELINGS,
): string {
  if (preferred && feelings.some((f) => f.id === preferred)) return preferred
  let best = feelings[0]?.id ?? 'character'
  let mag = -1
  for (const feeling of feelings) {
    const a = Math.abs(feelingAmount(values, feeling))
    if (a > mag) {
      mag = a
      best = feeling.id
    }
  }
  return best
}

export function axisKind(id: SensoryAxisId) {
  return SENSORY_AXES[id].kind
}
