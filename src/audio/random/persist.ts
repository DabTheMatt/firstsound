import type { ParamId } from '../parameters/types'
import { isRandomizable } from './distributions'
import {
  cloneRandomDocument,
  defaultParamRandom,
  defaultRandomDocument,
  isRandomDivision,
  nearestFreeRate,
  type ParamRandom,
  type RandomDocument,
  type RandomSync,
  type RandomTransition,
} from './types'

const STORAGE_KEY = 'field.random.v1'

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function parseGenerator(raw: unknown): ParamRandom | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<ParamRandom>
  const next = defaultParamRandom()
  if (rec.auto === true) next.auto = true
  if (rec.sync === 'tempo' || rec.sync === 'free') next.sync = rec.sync as RandomSync
  if (typeof rec.rateHz === 'number') next.rateHz = nearestFreeRate(rec.rateHz)
  if (isRandomDivision(rec.division)) next.division = rec.division
  if (typeof rec.intensity === 'number') next.intensity = clamp01(rec.intensity)
  if (rec.transition === 'smooth' || rec.transition === 'step') next.transition = rec.transition as RandomTransition
  return next
}

export function parseRandomDocument(raw: unknown): RandomDocument {
  const next = defaultRandomDocument()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Partial<RandomDocument>
  next.chaos = rec.chaos === true
  if (rec.generators && typeof rec.generators === 'object') {
    for (const id of Object.keys(rec.generators) as ParamId[]) {
      if (!isRandomizable(id)) continue
      const gen = parseGenerator(rec.generators[id])
      if (gen) next.generators[id] = gen
    }
  }
  if (rec.participation && typeof rec.participation === 'object') {
    for (const key of Object.keys(rec.participation)) {
      const ids = rec.participation[key]
      if (!Array.isArray(ids)) continue
      next.participation[key] = ids.filter((id): id is ParamId => typeof id === 'string' && isRandomizable(id as ParamId))
    }
  }
  return next
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function loadRandomDocument(): RandomDocument {
  const store = storage()
  if (!store) return defaultRandomDocument()
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultRandomDocument()
    return parseRandomDocument(JSON.parse(raw) as unknown)
  } catch {
    return defaultRandomDocument()
  }
}

export function saveRandomDocument(doc: RandomDocument): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(cloneRandomDocument(doc)))
  } catch {
    /* private mode or a full quota must not break the instrument */
  }
}
