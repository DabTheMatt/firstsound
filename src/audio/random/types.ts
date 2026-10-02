import type { ParamId } from '../parameters/types'

/**
 * Random is a control-rate event source. It is not an LFO and it is not an
 * automation curve.
 *
 * Ownership, evaluated inside resolvePerformanceParams before LFO:
 * - No active automation center (stopped, or the lane has no nodes): a Random
 *   event writes the manual base. One-shot uses the same setParam path as a
 *   knob. Auto Random writes that base without an undo entry.
 * - Active automation center (transport playing and the lane has nodes):
 *   Random stores a normalized offset. The automation curve stays the absolute
 *   trajectory. The offset is added to that center, then LFO modulates around
 *   the result. Nothing else writes the AudioParam.
 */
export const RANDOM_EVENT_BUDGET_HZ = 40

export const RANDOM_FREE_RATES = [0.25, 0.5, 1, 2, 4] as const
export type RandomFreeRate = (typeof RANDOM_FREE_RATES)[number]

export const RANDOM_DIVISIONS = [
  { id: '4bars', beats: 16, label: '4 bars' },
  { id: '2bars', beats: 8, label: '2 bars' },
  { id: '1bar', beats: 4, label: '1 bar' },
  { id: '1/2', beats: 2, label: '1/2' },
  { id: '1/4', beats: 1, label: '1/4' },
  { id: '1/8', beats: 0.5, label: '1/8' },
  { id: '1/16', beats: 0.25, label: '1/16' },
  { id: '1/8d', beats: 0.75, label: '1/8.' },
  { id: '1/8t', beats: 1 / 3, label: '1/8T' },
  { id: '1/16d', beats: 0.375, label: '1/16.' },
  { id: '1/16t', beats: 1 / 6, label: '1/16T' },
] as const

export type RandomDivisionId = (typeof RANDOM_DIVISIONS)[number]['id']
export type RandomSync = 'free' | 'tempo'
export type RandomTransition = 'step' | 'smooth'

export type ParamRandom = {
  auto: boolean
  sync: RandomSync
  rateHz: number
  division: RandomDivisionId
  /** 0..1. Low stays near the current center. High opens the safe window. */
  intensity: number
  transition: RandomTransition
}

export type RandomDocument = {
  chaos: boolean
  generators: Partial<Record<ParamId, ParamRandom>>
  /** Missing entry means the default meaningful set for that effect. */
  participation: Partial<Record<string, ParamId[]>>
}

export type RandomGlide = {
  from: number
  to: number
  start: number
  dur: number
  mode: 'base' | 'offset'
}

export type RandomRuntime = {
  /** Transport time of the previous auto event. Absent until the generator is armed. */
  lastSec: Partial<Record<ParamId, number>>
  glides: Partial<Record<ParamId, RandomGlide>>
}

export function defaultParamRandom(): ParamRandom {
  return {
    auto: false,
    sync: 'free',
    rateHz: 1,
    division: '1/4',
    intensity: 0.45,
    transition: 'step',
  }
}

export function defaultRandomDocument(): RandomDocument {
  return { chaos: false, generators: {}, participation: {} }
}

export function defaultRandomRuntime(): RandomRuntime {
  return { lastSec: {}, glides: {} }
}

export function cloneRandomDocument(doc: RandomDocument): RandomDocument {
  const generators: RandomDocument['generators'] = {}
  for (const id of Object.keys(doc.generators) as ParamId[]) {
    const gen = doc.generators[id]
    if (gen) generators[id] = { ...gen }
  }
  const participation: RandomDocument['participation'] = {}
  for (const key of Object.keys(doc.participation)) {
    const ids = doc.participation[key]
    if (ids) participation[key] = ids.slice()
  }
  return { chaos: doc.chaos, generators, participation }
}

export function nearestFreeRate(hz: number): RandomFreeRate {
  let best: RandomFreeRate = 1
  let err = Infinity
  for (const rate of RANDOM_FREE_RATES) {
    const next = Math.abs(Math.log(rate) - Math.log(Math.max(0.01, hz)))
    if (next < err) {
      err = next
      best = rate
    }
  }
  return best
}

export function divisionBeats(id: RandomDivisionId): number {
  return RANDOM_DIVISIONS.find((item) => item.id === id)?.beats ?? 1
}

export function isRandomDivision(value: unknown): value is RandomDivisionId {
  return typeof value === 'string' && RANDOM_DIVISIONS.some((item) => item.id === value)
}
