/**
 * One effect insert owns its parameters, model, LFO bank, automation lanes,
 * and random offsets. Identity is `id`, never the module type or array index.
 *
 * When a user-facing effect, control, or shortcut changes, update the Manual
 * in the same task. See src/manual/content.ts.
 */

import type { AutomationLane } from '../automation/automation'
import type { ModuleType } from '../chain/chain'
import { effectDefaultPatch, effectParamIds, type EffectDefaultKind } from './effectDefaults'
import { defaultFxLfoBank, type FxLfo, type FxLfoKind } from './lfo'
import type { ParamId } from '../parameters/types'
import {
  parseDelayType,
  parseDistortionNoiseKind,
  parseDistortionType,
  parseReverbType,
  type DelayType,
  type DistortionNoiseKind,
  type DistortionType,
  type ReverbType,
} from './types'

export const EFFECT_INSTANCE_TYPES = [
  'grain',
  'eq',
  'filter',
  'midside',
  'distortion',
  'delay',
  'reverb',
  'compressor',
  'limiter',
] as const

export type EffectInstanceType = (typeof EFFECT_INSTANCE_TYPES)[number]

export type EffectInstanceState = {
  id: string
  type: EffectInstanceType
  /** Fresh numeric parameters. Never a shared mutable default object. */
  params: Partial<Record<ParamId, number>>
  delayType: DelayType
  reverbType: ReverbType
  distortionType: DistortionType
  distortionNoiseKind: DistortionNoiseKind
  lfos: FxLfo[]
  lanes: AutomationLane[]
  randomOffsets: Partial<Record<ParamId, number>>
}

const TYPE_SET = new Set<string>(EFFECT_INSTANCE_TYPES)

export function isEffectInstanceType(type: ModuleType | string): type is EffectInstanceType {
  return TYPE_SET.has(type)
}

export function lfoKindForModule(type: EffectInstanceType): FxLfoKind | null {
  if (type === 'eq') return null
  return type
}

export function effectKind(type: EffectInstanceType): Exclude<EffectDefaultKind, 'eq'> | null {
  if (type === 'eq') return null
  return type
}

export function ownedParamIds(type: EffectInstanceType): readonly ParamId[] {
  const kind = effectKind(type)
  return kind ? effectParamIds(kind) : []
}

function cloneLfos(lfos: readonly FxLfo[]): FxLfo[] {
  return (lfos.length ? lfos : defaultFxLfoBank()).map((lfo) => ({ ...lfo }))
}

function cloneLanes(lanes: readonly AutomationLane[], effectId: string): AutomationLane[] {
  return lanes.map((lane) => ({
    paramId: lane.paramId,
    colorIndex: lane.colorIndex,
    effectId,
    nodes: lane.nodes.map((node) => ({ ...node })),
  }))
}

/** Independent factory. Mutating the result cannot change another instance or the defaults table. */
export function createDefaultEffect(type: ModuleType, id: string): EffectInstanceState | null {
  if (!isEffectInstanceType(type)) return null
  const kind = effectKind(type)
  return {
    id,
    type,
    params: kind ? { ...effectDefaultPatch(kind) } : {},
    delayType: 'digital',
    reverbType: 'hall',
    distortionType: 'saturation',
    distortionNoiseKind: 'white',
    lfos: defaultFxLfoBank().map((lfo) => ({ ...lfo })),
    lanes: [],
    randomOffsets: {},
  }
}

export function cloneEffectInstance(state: EffectInstanceState): EffectInstanceState {
  return {
    ...state,
    params: { ...state.params },
    lfos: cloneLfos(state.lfos),
    lanes: cloneLanes(state.lanes, state.id),
    randomOffsets: { ...state.randomOffsets },
  }
}

export function captureEffectParams(
  type: EffectInstanceType,
  id: string,
  source: Record<ParamId, number>,
  model: {
    delayType: DelayType
    reverbType: ReverbType
    distortionType: DistortionType
    distortionNoiseKind: DistortionNoiseKind
  },
  lfos: readonly FxLfo[],
  lanes: readonly AutomationLane[],
  randomOffsets: Partial<Record<ParamId, number>>,
): EffectInstanceState {
  const params: Partial<Record<ParamId, number>> = {}
  for (const paramId of ownedParamIds(type)) params[paramId] = source[paramId]
  const owned = new Set(ownedParamIds(type))
  const offsets: Partial<Record<ParamId, number>> = {}
  for (const paramId of owned) {
    const value = randomOffsets[paramId]
    if (typeof value === 'number') offsets[paramId] = value
  }
  return {
    id,
    type,
    params,
    delayType: model.delayType,
    reverbType: model.reverbType,
    distortionType: model.distortionType,
    distortionNoiseKind: model.distortionNoiseKind,
    lfos: cloneLfos(lfos),
    lanes: cloneLanes(
      lanes.filter((lane) => owned.has(lane.paramId)),
      id,
    ),
    randomOffsets: offsets,
  }
}

export function writeEffectParams(target: Record<ParamId, number>, state: EffectInstanceState): void {
  for (const paramId of ownedParamIds(state.type)) {
    const value = state.params[paramId]
    if (typeof value === 'number') target[paramId] = value
  }
}

export type EffectOwnerMap = Partial<Record<EffectInstanceType, string>>

export function cloneEffectMap(map: ReadonlyMap<string, EffectInstanceState>): Map<string, EffectInstanceState> {
  const next = new Map<string, EffectInstanceState>()
  for (const [id, state] of map) next.set(id, cloneEffectInstance(state))
  return next
}

export function serializeEffects(map: ReadonlyMap<string, EffectInstanceState>): EffectInstanceState[] {
  return [...map.values()].map((state) => cloneEffectInstance(state))
}

function parseLanes(raw: unknown, effectId: string): AutomationLane[] {
  if (!Array.isArray(raw)) return []
  const lanes: AutomationLane[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<AutomationLane>
    if (typeof rec.paramId !== 'string' || !Array.isArray(rec.nodes)) continue
    lanes.push({
      paramId: rec.paramId as ParamId,
      colorIndex: typeof rec.colorIndex === 'number' ? rec.colorIndex : undefined,
      effectId,
      nodes: rec.nodes
        .filter((node) => node && typeof node.id === 'string' && typeof node.time === 'number' && typeof node.value === 'number')
        .map((node) => ({ ...node })),
    })
  }
  return lanes
}

export function parseEffects(raw: unknown): Map<string, EffectInstanceState> {
  const map = new Map<string, EffectInstanceState>()
  if (!Array.isArray(raw)) return map
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Partial<EffectInstanceState>
    if (typeof rec.id !== 'string' || !rec.id || typeof rec.type !== 'string' || !isEffectInstanceType(rec.type)) continue
    const fresh = createDefaultEffect(rec.type, rec.id)
    if (!fresh) continue
    const params = { ...fresh.params }
    if (rec.params && typeof rec.params === 'object') {
      for (const [key, value] of Object.entries(rec.params)) {
        if (typeof value === 'number' && Number.isFinite(value)) params[key as ParamId] = value
      }
    }
    map.set(rec.id, {
      ...fresh,
      params,
      delayType: parseDelayType(rec.delayType) ?? fresh.delayType,
      reverbType: parseReverbType(rec.reverbType) ?? fresh.reverbType,
      distortionType: parseDistortionType(rec.distortionType) ?? fresh.distortionType,
      distortionNoiseKind: parseDistortionNoiseKind(rec.distortionNoiseKind) ?? fresh.distortionNoiseKind,
      lfos: Array.isArray(rec.lfos) ? cloneLfos(rec.lfos as FxLfo[]) : fresh.lfos,
      lanes: parseLanes(rec.lanes, rec.id),
      randomOffsets:
        rec.randomOffsets && typeof rec.randomOffsets === 'object'
          ? Object.fromEntries(
              Object.entries(rec.randomOffsets).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
            )
          : {},
    })
  }
  return map
}
