import type { ParamId } from '../parameters/types'
import { parseSelectRef } from './catalog'
import { isRandomizable } from './distributions'
import { LFO_RANDOM_FIELDS } from './lfoRandom'
import {
  cloneRandomDocument,
  defaultEqRandomSettings,
  defaultParamRandom,
  defaultRandomDocument,
  isRandomDivision,
  nearestFreeRate,
  type EqBandRandomField,
  type EqRandomCount,
  type EqRandomScope,
  type LfoRandomField,
  type LfoRandomTarget,
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

const EQ_COUNTS = new Set<EqRandomCount>(['random', 1, 2, 3, 4, 5, 6])
const EQ_FIELDS = new Set<EqBandRandomField>(['frequency', 'gain', 'q', 'type', 'slope'])

function parseEqCount(value: unknown): EqRandomCount {
  if (value === 'random') return 'random'
  if (typeof value === 'number' && EQ_COUNTS.has(value as EqRandomCount)) return value as EqRandomCount
  return 'random'
}

function parseEq(raw: unknown): RandomDocument['eq'] {
  const next = defaultEqRandomSettings()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Partial<RandomDocument['eq']>
  if (rec.scope === 'band' || rec.scope === 'whole') next.scope = rec.scope as EqRandomScope
  next.count = parseEqCount(rec.count)
  if (rec.auto === true) next.auto = true
  const gen = parseGenerator(rec.gen)
  if (gen) next.gen = gen
  if (Array.isArray(rec.bandFields)) {
    next.bandFields = rec.bandFields.filter((field): field is EqBandRandomField => typeof field === 'string' && EQ_FIELDS.has(field as EqBandRandomField))
  }
  if (next.auto && !next.gen.auto) next.gen = { ...next.gen, auto: true }
  return next
}

function parseLfoTarget(raw: unknown): LfoRandomTarget | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<LfoRandomTarget>
  const gen = parseGenerator(rec.gen) ?? defaultParamRandom()
  const fields = Array.isArray(rec.fields)
    ? rec.fields.filter((field): field is LfoRandomField => typeof field === 'string' && (LFO_RANDOM_FIELDS as readonly string[]).includes(field))
    : []
  return { fields, gen }
}

function parseParticipationRef(ref: unknown): string | null {
  if (typeof ref !== 'string') return null
  if (parseSelectRef(ref)) return ref
  return isRandomizable(ref as ParamId) ? ref : null
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
      next.participation[key] = ids.flatMap((id) => {
        const ref = parseParticipationRef(id)
        return ref ? [ref] : []
      })
    }
  }
  next.eq = parseEq(rec.eq)
  if (rec.lfo && typeof rec.lfo === 'object') {
    for (const id of Object.keys(rec.lfo) as ParamId[]) {
      const target = parseLfoTarget(rec.lfo[id])
      if (target) next.lfo[id] = target
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
