import type { SensoryValues } from './sensoryState'
import { clampSensoryValues } from './sensoryState'

export type EmotionalStateId =
  | 'intimate'
  | 'distant'
  | 'fragile'
  | 'heavy'
  | 'dreamlike'
  | 'raw'
  | 'floating'
  | 'restless'
  | 'tender'
  | 'broken'

export type EmotionalState = {
  id: EmotionalStateId
  label: string
  values: Partial<SensoryValues>
}

export const EMOTIONAL_STATES: readonly EmotionalState[] = [
  { id: 'intimate', label: 'intimate', values: { warmth: 0.45, distance: -0.55, wildness: -0.28, brightness: -0.12, hardness: -0.3 } },
  { id: 'distant', label: 'distant', values: { distance: 0.72, brightness: -0.18, motion: 0.12, wildness: -0.08 } },
  { id: 'fragile', label: 'fragile', values: { fullness: -0.48, hardness: -0.52, wildness: 0.14, brightness: 0.22 } },
  { id: 'heavy', label: 'heavy', values: { fullness: 0.7, warmth: 0.42, hardness: 0.34, brightness: -0.28 } },
  { id: 'dreamlike', label: 'dreamlike', values: { distance: 0.46, motion: 0.36, strangeness: 0.26, warmth: 0.22, brightness: 0.16 } },
  { id: 'raw', label: 'raw', values: { hardness: 0.42, strangeness: 0.12, distance: -0.18, fullness: 0.2 } },
  { id: 'floating', label: 'floating', values: { distance: 0.34, motion: 0.42, fullness: -0.22, wildness: 0.16 } },
  { id: 'restless', label: 'restless', values: { wildness: 0.56, motion: 0.62, strangeness: 0.32 } },
  { id: 'tender', label: 'tender', values: { warmth: 0.52, hardness: -0.46, brightness: -0.1, distance: -0.22 } },
  { id: 'broken', label: 'broken', values: { strangeness: 0.56, wildness: 0.26, fullness: -0.18, hardness: 0.22 } },
]

export function emotionalValues(id: EmotionalStateId): SensoryValues {
  const found = EMOTIONAL_STATES.find((s) => s.id === id)
  return clampSensoryValues(found?.values ?? {})
}

export function surpriseSensoryValues(seed = Math.random()): SensoryValues {
  const index = Math.floor(seed * EMOTIONAL_STATES.length) % EMOTIONAL_STATES.length
  const base = emotionalValues(EMOTIONAL_STATES[index]!.id)
  const jitter = ((seed * 17) % 1) * 0.16 - 0.08
  return clampSensoryValues({
    ...base,
    warmth: base.warmth + jitter,
    distance: base.distance - jitter * 0.5,
    wildness: base.wildness + jitter * 0.4,
  })
}

export function surpriseLabel(values: SensoryValues): string {
  let best = EMOTIONAL_STATES[0]!
  let score = -Infinity
  for (const state of EMOTIONAL_STATES) {
    const target = emotionalValues(state.id)
    let s = 0
    for (const key of Object.keys(target) as (keyof SensoryValues)[]) {
      s -= Math.abs(target[key] - values[key])
    }
    if (s > score) {
      score = s
      best = state
    }
  }
  return best.label
}
