/**
 * Per-track effect rack.
 *
 * Signal path (one shared transport, one master output):
 *   source
 *   → mixer input
 *   → track effect chain (Input gain / pan / balance / mono / phase, then
 *     EQ, filter, distortion, delay, reverb, compressor, limiter, mid/side, grain)
 *   → mixer mid/side (stereo) → mixer pan → volume → mute/solo gate
 *   → master sum → master output gain → safety limiter, meters, destination
 *
 * The chain Input module is not the mixer pan. Mixer volume, mute, and solo
 * stay after the inserts. The chain output slot stays at unity.
 * The Output module in the chain UI still edits the single master output gain.
 * The safety limiter is not copied onto tracks.
 *
 * Parameter identity is track + effect instance (+ EQ band when the parameter
 * belongs to a band). Storage is this rack, not a selected-track lookup at
 * DSP time. Identical ParamIds on two tracks are different values.
 */

import { parseAutomation, type AutomationDocument, defaultAutomation, cloneAutomation } from '../automation/automation'
import { isFixedType, parseChain, type ChainModule, type ModuleType, defaultChain } from '../chain/chain'
import { defaultCombFilter, parseCombFilter, type CombFilterState } from '../engine/comb'
import { defaultEqBands, parseEqBands, type EqBand } from '../engine/eqBands'
import type { EqChannelMode } from '../engine/eqGraph'
import { NOISE_CUT_TAU_SEC } from '../fx/distortion'
import {
  EQ_BAND_LFO_IDS,
  cloneFxLfos,
  defaultFxLfos,
  defaultLfoHold,
  defaultLfoShown,
  fxLfoKindForParam,
  parseFxLfos,
  type FxLfoKind,
  type FxLfoMap,
  type LfoHoldState,
} from '../fx/lfo'
import {
  parseDelayType,
  parseDistortionNoiseKind,
  parseDistortionType,
  parseReverbType,
  type DelayType,
  type DistortionNoiseKind,
  type DistortionType,
  type ReverbType,
} from '../fx/types'
import { defaultParamValues } from '../parameters/definitions'
import type { EqListenMode, FilterType, ParamId } from '../parameters/types'
import {
  cloneRandomDocument,
  defaultRandomDocument,
  defaultRandomRuntime,
  type RandomDocument,
  type RandomRuntime,
} from '../random/types'
import { parseRandomDocument } from '../random/persist'

export type RackEqState = {
  bands: EqBand[]
  bandsL: EqBand[]
  bandsR: EqBand[]
  comb: CombFilterState
}

/** Transport and master output. Written through to every rack. */
export const SHARED_PARAM_IDS = [
  'outputGain',
  'bpm',
  'speed',
  'pitch',
  'stretchInterp',
  'stretchInterpOn',
  'stretchInterpAlgo',
] as const

export type SharedParamId = (typeof SHARED_PARAM_IDS)[number]

const FILTER_TYPES: readonly FilterType[] = [
  'off',
  'lowpass',
  'highpass',
  'bandpass',
  'lowshelf',
  'highshelf',
  'peaking',
  'notch',
]

export type TrackRack = {
  chain: ChainModule[]
  params: Record<ParamId, number>
  eqById: Map<string, RackEqState>
  eqBands: EqBand[]
  comb: CombFilterState
  eqListen: EqListenMode
  eqChannelMode: EqChannelMode
  filterType: FilterType
  delayType: DelayType
  reverbType: ReverbType
  distortionType: DistortionType
  distortionNoiseKind: DistortionNoiseKind
  fxLfos: FxLfoMap
  automation: AutomationDocument
  randomDoc: RandomDocument
  randomOffsets: Partial<Record<ParamId, number>>
  randomRuntime: RandomRuntime
  lfoHold: LfoHoldState
  lfoShown: Record<FxLfoKind, number>
  spaceLatched: boolean
  spacePresetId: string | null
  noiseMuted: boolean
  noiseFadeTau: number
  reverbIrKey: string
  reverbIrTimer: number
  filterFollower: number
  filterEnvOrigin: number
  filterSnh: { index: number; value: number }
  filterFollowStamp: number
}

export type SerializedTrackRack = {
  chain: ChainModule[]
  params: Record<string, number>
  eqById: Record<string, RackEqState>
  eqBands: EqBand[]
  comb: CombFilterState
  eqListen: EqListenMode
  eqChannelMode: EqChannelMode
  filterType: FilterType
  delayType: DelayType
  reverbType: ReverbType
  distortionType: DistortionType
  distortionNoiseKind: DistortionNoiseKind
  fxLfos: FxLfoMap
  automation: AutomationDocument
  random: RandomDocument
  spacePresetId: string | null
}

export function isSharedParam(id: string): id is SharedParamId {
  return (SHARED_PARAM_IDS as readonly string[]).includes(id)
}

export function createTrackRack(randomDoc: RandomDocument = defaultRandomDocument()): TrackRack {
  return {
    chain: defaultChain(),
    params: defaultParamValues(),
    eqById: new Map(),
    eqBands: defaultEqBands(),
    comb: defaultCombFilter(),
    eqListen: 'sample',
    eqChannelMode: 'shared',
    filterType: 'off',
    delayType: 'digital',
    reverbType: 'hall',
    distortionType: 'saturation',
    distortionNoiseKind: 'white',
    fxLfos: defaultFxLfos(),
    automation: defaultAutomation(),
    randomDoc: cloneRandomDocument(randomDoc),
    randomOffsets: {},
    randomRuntime: defaultRandomRuntime(),
    lfoHold: defaultLfoHold(),
    lfoShown: defaultLfoShown(),
    spaceLatched: false,
    spacePresetId: null,
    noiseMuted: false,
    noiseFadeTau: NOISE_CUT_TAU_SEC,
    reverbIrKey: '',
    reverbIrTimer: 0,
    filterFollower: 0,
    filterEnvOrigin: 0,
    filterSnh: { index: -1, value: 0 },
    filterFollowStamp: 0,
  }
}

export function cloneRackEq(state: RackEqState): RackEqState {
  return {
    bands: state.bands.map((band) => ({ ...band })),
    bandsL: state.bandsL.map((band) => ({ ...band })),
    bandsR: state.bandsR.map((band) => ({ ...band })),
    comb: { ...state.comb },
  }
}

export function cloneTrackRack(rack: TrackRack): TrackRack {
  const eqById = new Map<string, RackEqState>()
  for (const [id, state] of rack.eqById) eqById.set(id, cloneRackEq(state))
  return {
    ...rack,
    chain: rack.chain.map((mod) => ({ ...mod })),
    params: { ...rack.params },
    eqById,
    eqBands: rack.eqBands.map((band) => ({ ...band })),
    comb: { ...rack.comb },
    fxLfos: cloneFxLfos(rack.fxLfos),
    automation: cloneAutomation(rack.automation),
    randomDoc: cloneRandomDocument(rack.randomDoc),
    randomOffsets: { ...rack.randomOffsets },
    randomRuntime: defaultRandomRuntime(),
    lfoHold: defaultLfoHold(),
    lfoShown: { ...rack.lfoShown },
    filterSnh: { ...rack.filterSnh },
    reverbIrTimer: 0,
    reverbIrKey: '',
  }
}

/** Inserted modules, bypassed or not. Input and Output are not counted. */
export function trackFxCount(chain: readonly ChainModule[]): number {
  return chain.filter((mod) => !isFixedType(mod.type)).length
}

export function trackParamKey(trackId: string, effectId: string, paramId: string, bandId?: string): string {
  if (bandId) return `track:${trackId}:effect:${effectId}:band:${bandId}:parameter:${paramId}`
  return `track:${trackId}:effect:${effectId}:parameter:${paramId}`
}

function moduleTypeForKind(kind: FxLfoKind): ModuleType {
  if (kind === 'input') return 'gain'
  if (
    kind === 'eq1' ||
    kind === 'eq2' ||
    kind === 'eq3' ||
    kind === 'eq4' ||
    kind === 'eq5' ||
    kind === 'eq6' ||
    kind === 'eq7' ||
    kind === 'eq8' ||
    kind === 'eqcf'
  ) {
    return 'eq'
  }
  return kind
}

/** Stable effect instance that owns this parameter on one track. */
export function effectInstanceId(chain: readonly ChainModule[], paramId: ParamId): string {
  const kind = fxLfoKindForParam(paramId)
  if (!kind) {
    if (paramId === 'outputGain') return chain.find((mod) => mod.type === 'output')?.instanceId ?? 'output-1'
    return chain.find((mod) => mod.type === 'gain')?.instanceId ?? 'gain-1'
  }
  const type = moduleTypeForKind(kind)
  return chain.find((mod) => mod.type === type)?.instanceId ?? `${type}-1`
}

export function eqBandIdForParam(paramId: ParamId, bands: readonly EqBand[]): string | undefined {
  const index = EQ_BAND_LFO_IDS.findIndex((ids) => ids.freq === paramId || ids.gain === paramId || ids.q === paramId)
  if (index < 0) return undefined
  const id = bands[index]?.id
  return id || undefined
}

export function resolveTrackParamKey(
  trackId: string,
  chain: readonly ChainModule[],
  paramId: ParamId,
  bands: readonly EqBand[] = [],
): string {
  return trackParamKey(trackId, effectInstanceId(chain, paramId), paramId, eqBandIdForParam(paramId, bands))
}

export function copySharedParams(from: Record<ParamId, number>, to: Record<ParamId, number>): void {
  for (const id of SHARED_PARAM_IDS) to[id] = from[id]
}

function cloneEqRecord(eqById: Map<string, RackEqState>): Record<string, RackEqState> {
  const out: Record<string, RackEqState> = {}
  for (const [id, state] of eqById) out[id] = cloneRackEq(state)
  return out
}

export function serializeTrackRack(rack: TrackRack): SerializedTrackRack {
  return {
    chain: rack.chain.map((mod) => ({ ...mod })),
    params: { ...rack.params },
    eqById: cloneEqRecord(rack.eqById),
    eqBands: rack.eqBands.map((band) => ({ ...band })),
    comb: { ...rack.comb },
    eqListen: rack.eqListen,
    eqChannelMode: rack.eqChannelMode,
    filterType: rack.filterType,
    delayType: rack.delayType,
    reverbType: rack.reverbType,
    distortionType: rack.distortionType,
    distortionNoiseKind: rack.distortionNoiseKind,
    fxLfos: cloneFxLfos(rack.fxLfos),
    automation: cloneAutomation(rack.automation),
    random: cloneRandomDocument(rack.randomDoc),
    spacePresetId: rack.spacePresetId,
  }
}

function parseFilterType(raw: unknown): FilterType {
  return typeof raw === 'string' && (FILTER_TYPES as readonly string[]).includes(raw) ? (raw as FilterType) : 'off'
}

function parseEqRecord(raw: unknown): Map<string, RackEqState> {
  const map = new Map<string, RackEqState>()
  if (!raw || typeof raw !== 'object') return map
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const rec = value as Partial<RackEqState>
    const bands = parseEqBands(rec.bands) ?? defaultEqBands()
    map.set(id, {
      bands,
      bandsL: parseEqBands(rec.bandsL) ?? [],
      bandsR: parseEqBands(rec.bandsR) ?? [],
      comb: parseCombFilter(rec.comb) ?? defaultCombFilter(),
    })
  }
  return map
}

export function parseTrackRack(raw: unknown): TrackRack | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<SerializedTrackRack>
  const chain = parseChain(rec.chain)
  if (!chain) return null
  const rack = createTrackRack()
  rack.chain = chain
  if (rec.params && typeof rec.params === 'object') {
    for (const id of Object.keys(rack.params) as ParamId[]) {
      const value = (rec.params as Record<string, unknown>)[id]
      if (typeof value === 'number' && Number.isFinite(value)) rack.params[id] = value
    }
  }
  rack.eqById = parseEqRecord(rec.eqById)
  const bands = parseEqBands(rec.eqBands)
  if (bands) rack.eqBands = bands
  const comb = parseCombFilter(rec.comb)
  if (comb) rack.comb = comb
  if (rec.eqListen === 'filters' || rec.eqListen === 'sample') rack.eqListen = rec.eqListen
  if (rec.eqChannelMode === 'shared' || rec.eqChannelMode === 'left' || rec.eqChannelMode === 'right') {
    rack.eqChannelMode = rec.eqChannelMode
  }
  rack.filterType = parseFilterType(rec.filterType)
  rack.delayType = parseDelayType(rec.delayType) ?? 'digital'
  rack.reverbType = parseReverbType(rec.reverbType) ?? 'hall'
  rack.distortionType = parseDistortionType(rec.distortionType) ?? 'saturation'
  rack.distortionNoiseKind = parseDistortionNoiseKind(rec.distortionNoiseKind) ?? 'white'
  if (rec.fxLfos) rack.fxLfos = parseFxLfos(rec.fxLfos)
  if (rec.automation) rack.automation = parseAutomation(rec.automation)
  if (rec.random) rack.randomDoc = parseRandomDocument(rec.random)
  rack.lfoShown = defaultLfoShown()
  rack.spacePresetId = typeof rec.spacePresetId === 'string' ? rec.spacePresetId : null
  return rack
}

export function parseTrackRacks(raw: unknown): Record<string, TrackRack> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, TrackRack> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!id) return null
    const rack = parseTrackRack(value)
    if (!rack) return null
    out[id] = rack
  }
  return Object.keys(out).length ? out : null
}
