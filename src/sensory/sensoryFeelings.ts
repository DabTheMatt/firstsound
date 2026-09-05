import type { SensoryAxisId } from './sensoryParameters'
import { dialAmount, valueFromDial, type SensoryValues } from './sensoryState'

export type SensoryFeeling = {
  id: string
  label: string
  axis: SensoryAxisId
  pole: 'pos' | 'neg'
  ariaLabel: string
}

/** Right-rail adjectives. Each one writes a sensory axis pole. */
export const SENSORY_FEELINGS: readonly SensoryFeeling[] = [
  { id: 'bigger', label: 'bigger', axis: 'fullness', pole: 'pos', ariaLabel: 'Bigger, more body' },
  { id: 'tighter', label: 'tighter', axis: 'distance', pole: 'neg', ariaLabel: 'Tighter, closer' },
  { id: 'calmer', label: 'calmer', axis: 'wildness', pole: 'neg', ariaLabel: 'Calmer, stiller' },
  { id: 'wilder', label: 'wilder', axis: 'wildness', pole: 'pos', ariaLabel: 'Wilder, more pulse' },
  { id: 'warmer', label: 'warmer', axis: 'warmth', pole: 'pos', ariaLabel: 'Warmer' },
  { id: 'echo', label: 'echo', axis: 'echo', pole: 'pos', ariaLabel: 'Echo' },
]

export function feelingAmount(values: SensoryValues, feeling: SensoryFeeling): number {
  return dialAmount(values[feeling.axis], feeling.pole)
}

export function applyFeelingAmount(values: SensoryValues, feeling: SensoryFeeling, amount: number): SensoryValues {
  return { ...values, [feeling.axis]: valueFromDial(amount, feeling.pole) }
}

/** The feeling whose pole is most open, else the preferred id. */
export function activeFeelingId(
  values: SensoryValues,
  preferred: string | null,
  feelings: readonly SensoryFeeling[] = SENSORY_FEELINGS,
): string {
  if (preferred && feelings.some((f) => f.id === preferred)) return preferred
  let best = feelings[0]?.id ?? 'bigger'
  let mag = -1
  for (const feeling of feelings) {
    const a = feelingAmount(values, feeling)
    if (a > mag) {
      mag = a
      best = feeling.id
    }
  }
  return best
}
