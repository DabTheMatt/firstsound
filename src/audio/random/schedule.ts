import { envelopeToParam, laneFor, sampleEnvelope, type AutomationDocument } from '../automation/automation'
import type { ParamId } from '../parameters/types'
import { isRandomizable, randomParamValue } from './distributions'
import { applyRandomOffset, automationOwnsCenter, offsetForTarget } from './ownership'
import {
  RANDOM_EVENT_BUDGET_HZ,
  defaultParamRandom,
  divisionBeats,
  nearestFreeRate,
  type ParamRandom,
  type RandomDocument,
  type RandomGlide,
  type RandomRuntime,
} from './types'

export type RandomBaseWrite = { id: ParamId; value: number }

export type RandomStep = {
  runtime: RandomRuntime
  offsets: Partial<Record<ParamId, number>>
  writes: RandomBaseWrite[]
  /** True when the combined generator rate was scaled down to the budget. */
  budgetLimited: boolean
}

function generatorOf(doc: RandomDocument, id: ParamId): ParamRandom {
  return doc.generators[id] ?? defaultParamRandom()
}

export function randomIntervalSec(gen: ParamRandom, bpm: number): number {
  if (gen.sync === 'tempo') {
    const tempo = Math.min(240, Math.max(20, bpm))
    return Math.max(0.02, (60 / tempo) * divisionBeats(gen.division))
  }
  return 1 / nearestFreeRate(gen.rateHz)
}

function activeGenerators(doc: RandomDocument): ParamId[] {
  if (!doc.chaos) return []
  const ids: ParamId[] = []
  for (const id of Object.keys(doc.generators) as ParamId[]) {
    const gen = doc.generators[id]
    if (gen?.auto && isRandomizable(id)) ids.push(id)
  }
  return ids
}

export function randomBudgetScale(doc: RandomDocument, bpm: number): number {
  const ids = activeGenerators(doc)
  let sum = 0
  for (const id of ids) sum += 1 / randomIntervalSec(generatorOf(doc, id), bpm)
  if (sum <= RANDOM_EVENT_BUDGET_HZ) return 1
  return sum / RANDOM_EVENT_BUDGET_HZ
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function automatedCenter(
  id: ParamId,
  automation: AutomationDocument,
  transportSec: number,
  params: Record<ParamId, number>,
): number {
  const lane = laneFor(automation, id)
  if (!lane || lane.nodes.length === 0) return params[id]
  return envelopeToParam(id, sampleEnvelope(lane.nodes, transportSec) ?? 0)
}

function heardCenter(
  id: ParamId,
  params: Record<ParamId, number>,
  automation: AutomationDocument,
  playing: boolean,
  offsets: Partial<Record<ParamId, number>>,
  transportSec: number,
): { center: number; owned: boolean } {
  const nodes = laneFor(automation, id)?.nodes.length ?? 0
  const owned = automationOwnsCenter(nodes, playing)
  if (!owned) return { center: params[id], owned: false }
  const center = automatedCenter(id, automation, transportSec, params)
  return { center: applyRandomOffset(center, id, offsets[id] ?? 0), owned: true }
}

/**
 * Advance every armed generator on the shared transport clock.
 * Pause (playing false) freezes deadlines and glides.
 * A clock jump fires at most one event per generator, then rearms from now.
 */
export function stepRandom(input: {
  doc: RandomDocument
  runtime: RandomRuntime
  offsets: Partial<Record<ParamId, number>>
  params: Record<ParamId, number>
  automation: AutomationDocument
  playing: boolean
  clockSec: number
  transportSec: number
  bpm: number
  rand?: () => number
}): RandomStep {
  const runtime: RandomRuntime = {
    lastSec: { ...input.runtime.lastSec },
    glides: { ...input.runtime.glides },
  }
  const offsets: Partial<Record<ParamId, number>> = { ...input.offsets }
  const writes: RandomBaseWrite[] = []
  if (!input.playing || !input.doc.chaos) {
    return { runtime, offsets, writes, budgetLimited: false }
  }
  const rand = input.rand ?? Math.random
  const scale = randomBudgetScale(input.doc, input.bpm)
  const ids = activeGenerators(input.doc)
  for (const id of ids) {
    const gen = generatorOf(input.doc, id)
    const interval = randomIntervalSec(gen, input.bpm) * scale
    if (runtime.lastSec[id] == null) {
      runtime.lastSec[id] = input.clockSec
      continue
    }
    const next = (runtime.lastSec[id] ?? input.clockSec) + interval
    if (input.clockSec + 1e-6 < next) continue
    runtime.lastSec[id] = input.clockSec
    const heard = heardCenter(id, input.params, input.automation, input.playing, offsets, input.transportSec)
    const target = randomParamValue({
      id,
      current: heard.center,
      intensity: gen.intensity,
      chaos: true,
      rand,
      bpm: input.bpm,
    })
    if (gen.transition === 'smooth') {
      const dur = Math.min(0.4, Math.max(0.02, interval * 0.55))
      const glide: RandomGlide = heard.owned
        ? {
            from: offsets[id] ?? 0,
            to: offsetForTarget(automatedCenter(id, input.automation, input.transportSec, input.params), target, id),
            start: input.clockSec,
            dur,
            mode: 'offset',
          }
        : { from: input.params[id], to: target, start: input.clockSec, dur, mode: 'base' }
      runtime.glides[id] = glide
    } else if (heard.owned) {
      delete runtime.glides[id]
      offsets[id] = offsetForTarget(automatedCenter(id, input.automation, input.transportSec, input.params), target, id)
    } else {
      delete runtime.glides[id]
      delete offsets[id]
      writes.push({ id, value: target })
    }
  }
  for (const id of Object.keys(runtime.glides) as ParamId[]) {
    const glide = runtime.glides[id]
    if (!glide) continue
    const t = glide.dur <= 0 ? 1 : (input.clockSec - glide.start) / glide.dur
    const mixed = glide.from + (glide.to - glide.from) * smoothstep(t)
    if (glide.mode === 'offset') offsets[id] = mixed
    else writes.push({ id, value: mixed })
    if (t >= 1) delete runtime.glides[id]
  }
  return { runtime, offsets, writes, budgetLimited: scale > 1 }
}

export function hasAutoRandom(doc: RandomDocument): boolean {
  return activeGenerators(doc).length > 0
}
