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
  { id: 'intimate', label: 'intimate', values: { character: -0.25, space: 0.08, echo: 0.12, grain: 0.18, dirt: 0.08, tight: 0.42, mod: 0.08, drift: 0.1, pan: 0.12, veil: 0.08, halo: 0.04, well: 0.16, plate: 0.1, tape: 0.06 } },
  { id: 'distant', label: 'distant', values: { character: 0.12, space: 0.72, echo: 0.22, grain: 0.16, dirt: 0, tight: 0.08, mod: 0.18, drift: 0.28, pan: 0.22, veil: 0.48, halo: 0.12, well: 0.1, bloom: 0.22 } },
  { id: 'fragile', label: 'fragile', values: { character: 0.28, space: 0.36, echo: 0.18, grain: 0.42, dirt: 0.04, tight: 0.12, mod: 0.34, drift: 0.16, pan: 0.3, veil: 0.18, halo: 0.36, well: 0.08, shimmer: 0.22, vinyl: 0.08 } },
  { id: 'heavy', label: 'heavy', values: { character: -0.42, space: 0.18, echo: 0.1, grain: 0.22, dirt: 0.28, tight: 0.55, mod: 0.12, drift: 0.08, pan: 0.06, veil: 0.22, halo: 0.04, well: 0.42, fuzz: 0.18, gate: 0.12 } },
  { id: 'dreamlike', label: 'dreamlike', values: { character: 0.38, space: 0.62, echo: 0.4, grain: 0.34, dirt: 0.06, tight: 0.08, mod: 0.42, drift: 0.48, pan: 0.44, veil: 0.16, halo: 0.52, well: 0.12, bloom: 0.4, shimmer: 0.36 } },
  { id: 'raw', label: 'raw', values: { character: -0.32, space: 0.1, echo: 0.08, grain: 0.28, dirt: 0.36, tight: 0.38, mod: 0.22, drift: 0.12, pan: 0.18, veil: 0.1, halo: 0.06, well: 0.2, fuzz: 0.28, crush: 0.16, spring: 0.12 } },
  { id: 'floating', label: 'floating', values: { character: 0.22, space: 0.54, echo: 0.28, grain: 0.48, dirt: 0.04, tight: 0.06, mod: 0.55, drift: 0.4, pan: 0.52, veil: 0.2, halo: 0.44, well: 0.08, bloom: 0.28, reverse: 0.1 } },
  { id: 'restless', label: 'restless', values: { character: 0.08, space: 0.28, echo: 0.46, grain: 0.62, dirt: 0.16, tight: 0.22, mod: 0.7, drift: 0.52, pan: 0.62, veil: 0.14, halo: 0.22, well: 0.18, fold: 0.18, crush: 0.12 } },
  { id: 'tender', label: 'tender', values: { character: 0.18, space: 0.32, echo: 0.16, grain: 0.2, dirt: 0.05, tight: 0.14, mod: 0.2, drift: 0.18, pan: 0.2, veil: 0.12, halo: 0.28, well: 0.1, plate: 0.16, tape: 0.08 } },
  { id: 'broken', label: 'broken', values: { character: -0.18, space: 0.4, echo: 0.52, grain: 0.44, dirt: 0.22, tight: 0.28, mod: 0.48, drift: 0.36, pan: 0.34, veil: 0.32, halo: 0.16, well: 0.28, vinyl: 0.2, reverse: 0.16, crush: 0.14 } },
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
    character: base.character + jitter,
    space: base.space - jitter * 0.3,
    grain: base.grain + jitter * 0.4,
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
