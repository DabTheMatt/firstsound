import { FX_LFO_TARGETS, type FxLfoKind } from '../fx/lfo'
import { PARAMS } from '../parameters/definitions'
import type { ParamId } from '../parameters/types'
import { DELAY_TYPES, DISTORTION_TYPES, REVERB_TYPES } from '../fx/types'
import { isRandomizable } from './distributions'
import { isAutoRandomizable, randomMeta } from './metadata'
import type { RandomDocument } from './types'

export type EngineSelectId = 'playbackDirection' | 'delayType' | 'reverbType' | 'distortionType'

export type RandomGroup = 'parameter' | 'select'

export type RandomCatalogEntry = {
  ref: string
  group: RandomGroup
  paramId?: ParamId
  selectId?: EngineSelectId
  /** One-shot only. Auto Random leaves the value alone. */
  auto: boolean
}

const SELECT_PREFIX = 'sel:'

export function selectRef(id: EngineSelectId): string {
  return `${SELECT_PREFIX}${id}`
}

export function parseSelectRef(ref: string): EngineSelectId | null {
  if (!ref.startsWith(SELECT_PREFIX)) return null
  const id = ref.slice(SELECT_PREFIX.length)
  if (id === 'playbackDirection' || id === 'delayType' || id === 'reverbType' || id === 'distortionType') return id
  return null
}

function paramEntry(id: ParamId): RandomCatalogEntry | null {
  if (!isRandomizable(id)) return null
  const meta = randomMeta(id)
  const discrete = meta != null && meta.kind !== 'continuous' && meta.kind !== 'integer'
  return {
    ref: id,
    group: discrete ? 'select' : 'parameter',
    paramId: id,
    auto: isAutoRandomizable(id),
  }
}

function selectEntry(id: EngineSelectId, auto: boolean): RandomCatalogEntry {
  return { ref: selectRef(id), group: 'select', selectId: id, auto }
}

const EXTRA_PARAMS: Partial<Record<FxLfoKind, readonly ParamId[]>> = {
  input: ['stretchInterpAlgo'],
  filter: ['filterKind', 'filterSlope', 'filterCharacter', 'filterEnvDir', 'filterLfoShape', 'filterLfoSync', 'filterLfoNote', 'filterLfoNoteKind'],
  delay: ['delayNote', 'delayNoteKind', 'delayNoteR', 'delayNoteKindR'],
  reverb: ['reverbNote', 'reverbNoteKind'],
  midside: ['msHaasDir'],
}

const ENGINE_SELECTS: Partial<Record<FxLfoKind, RandomCatalogEntry[]>> = {
  input: [selectEntry('playbackDirection', true)],
  delay: [selectEntry('delayType', false)],
  reverb: [selectEntry('reverbType', false)],
  distortion: [selectEntry('distortionType', false)],
}

export function catalogFor(kind: FxLfoKind): RandomCatalogEntry[] {
  const seen = new Set<string>()
  const out: RandomCatalogEntry[] = []
  const push = (entry: RandomCatalogEntry | null) => {
    if (!entry || seen.has(entry.ref)) return
    seen.add(entry.ref)
    out.push(entry)
  }
  for (const id of FX_LFO_TARGETS[kind]) push(paramEntry(id))
  for (const id of EXTRA_PARAMS[kind] ?? []) push(paramEntry(id))
  for (const entry of ENGINE_SELECTS[kind] ?? []) push(entry)
  return out
}

export function defaultRandomRefs(kind: FxLfoKind): string[] {
  return catalogFor(kind).map((entry) => entry.ref)
}

export function participatingRefs(doc: RandomDocument, kind: FxLfoKind): string[] {
  const catalog = catalogFor(kind)
  const allowed = new Set(catalog.map((entry) => entry.ref))
  const chosen = doc.participation[kind]
  if (!chosen) return catalog.map((entry) => entry.ref)
  return chosen.filter((ref) => allowed.has(ref))
}

export function participatingEntries(doc: RandomDocument, kind: FxLfoKind): RandomCatalogEntry[] {
  const chosen = new Set(participatingRefs(doc, kind))
  return catalogFor(kind).filter((entry) => chosen.has(entry.ref))
}

export function catalogLabel(entry: RandomCatalogEntry): string {
  if (entry.paramId) return PARAMS[entry.paramId].label
  if (entry.selectId === 'playbackDirection') return 'Direction'
  if (entry.selectId === 'delayType') return 'Delay type'
  if (entry.selectId === 'reverbType') return 'Reverb type'
  if (entry.selectId === 'distortionType') return 'Distortion type'
  return entry.ref
}

export const DELAY_TYPE_OPTIONS = DELAY_TYPES.map((item) => item.value)
export const REVERB_TYPE_OPTIONS = REVERB_TYPES.map((item) => item.value).filter((value) => value !== 'custom')
export const DISTORTION_TYPE_OPTIONS = DISTORTION_TYPES.map((item) => item.value)

/** Creative bias. Every listed type stays reachable. */
export const DELAY_TYPE_WEIGHTS = [8, 8, 8, 6, 5, 4, 3, 3, 3, 3]
export const REVERB_TYPE_WEIGHTS = [6, 5, 8, 5, 6, 4, 3, 4, 3, 2, 2, 2, 2, 2, 2, 1]
export const DISTORTION_TYPE_WEIGHTS = [8, 6, 5, 4, 5, 3, 4, 3, 2, 2, 2, 2, 2]
