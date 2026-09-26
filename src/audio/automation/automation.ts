import {
  FX_LFO_KINDS,
  FX_LFO_TARGETS,
  anyFxLfoActive,
  applyFxLfos,
  fxLfoKindForParam,
  type FxLfoKind,
  type FxLfoMap,
  type LfoHoldState,
} from '../fx/lfo'
import { PARAMS } from '../parameters/definitions'
import { applyParamLinks } from '../parameters/links'
import { applyParamValue, clamp, fromNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

/**
 * Playback pipeline for a parameter:
 * stored manual value → automation envelope (transport running) → LFO → clamp.
 * The envelope replaces the manual value only while playing, so a knob edit
 * cannot erase nodes. LFO depth is measured around the automated value, not
 * against a second writer racing the same AudioParam.
 */
export type AutomationNode = {
  id: string
  /** Seconds on the sample timeline. */
  time: number
  /** Normalized parameter position, 0–1, using ParamDef.mapping. */
  value: number
}

export type AutomationLane = {
  paramId: ParamId
  nodes: AutomationNode[]
}

export type AutomationDocument = {
  selectedParamId: ParamId
  lanes: AutomationLane[]
}

const TIME_GAP = 0.0005

export function defaultAutomation(): AutomationDocument {
  return { selectedParamId: 'gain', lanes: [] }
}

export function isAutomatableParam(id: string): id is ParamId {
  return fxLfoKindForParam(id as ParamId) != null
}

export type AutomationEffectGroup = {
  kind: FxLfoKind
  paramIds: readonly ParamId[]
}

/** Continuous targets already accepted by the LFO registry. Discrete params stay out. */
export function automationEffectGroups(): AutomationEffectGroup[] {
  return FX_LFO_KINDS.map((kind) => ({
    kind,
    paramIds: FX_LFO_TARGETS[kind],
  })).filter((group) => group.paramIds.length > 0)
}

export function effectKindForParam(id: ParamId): FxLfoKind | null {
  return fxLfoKindForParam(id)
}

let nodeSeq = 0

export function createAutomationNodeId(): string {
  nodeSeq += 1
  return `auto-${nodeSeq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function cloneAutomation(doc: AutomationDocument): AutomationDocument {
  return {
    selectedParamId: isAutomatableParam(doc.selectedParamId) ? doc.selectedParamId : 'gain',
    lanes: doc.lanes
      .filter((lane) => isAutomatableParam(lane.paramId) && lane.nodes.length > 0)
      .map((lane) => ({
        paramId: lane.paramId,
        nodes: lane.nodes.map((node) => ({ ...node })),
      })),
  }
}

export function automationEqual(a: AutomationDocument, b: AutomationDocument, eps = 1e-5): boolean {
  if (a.selectedParamId !== b.selectedParamId) return false
  if (a.lanes.length !== b.lanes.length) return false
  for (let i = 0; i < a.lanes.length; i++) {
    const left = a.lanes[i]
    const right = b.lanes[i]
    if (!left || !right || left.paramId !== right.paramId || left.nodes.length !== right.nodes.length) return false
    for (let n = 0; n < left.nodes.length; n++) {
      const x = left.nodes[n]
      const y = right.nodes[n]
      if (!x || !y || x.id !== y.id) return false
      if (Math.abs(x.time - y.time) > eps || Math.abs(x.value - y.value) > eps) return false
    }
  }
  return true
}

export function automationHasNodes(doc: AutomationDocument): boolean {
  return doc.lanes.some((lane) => lane.nodes.length > 0)
}

export function laneFor(doc: AutomationDocument, paramId: ParamId): AutomationLane | null {
  return doc.lanes.find((lane) => lane.paramId === paramId) ?? null
}

function sortNodes(nodes: AutomationNode[]): AutomationNode[] {
  return [...nodes].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
}

function separateTime(time: number, nodes: AutomationNode[], selfId: string, duration: number): number {
  let t = clamp(time, 0, Math.max(0, duration))
  const others = nodes.filter((node) => node.id !== selfId)
  for (let guard = 0; guard < others.length + 2; guard++) {
    const hit = others.find((node) => Math.abs(node.time - t) < TIME_GAP)
    if (!hit) break
    const nudged = hit.time + TIME_GAP <= duration ? hit.time + TIME_GAP : hit.time - TIME_GAP
    t = clamp(nudged, 0, Math.max(0, duration))
  }
  return t
}

export function normalizedFromLaneY(y: number, height: number): number {
  if (!(height > 0)) return 0
  return clamp(1 - y / height, 0, 1)
}

/** Linear interpolation in normalized space. Holds the end nodes outside the span. */
export function sampleEnvelope(nodes: readonly AutomationNode[], timeSec: number): number | null {
  if (nodes.length === 0) return null
  const sorted = nodes.length === 1 ? nodes : sortNodes([...nodes])
  const first = sorted[0]
  if (!first) return null
  if (sorted.length === 1 || timeSec <= first.time) return clamp(first.value, 0, 1)
  const last = sorted[sorted.length - 1]
  if (!last || timeSec >= last.time) return clamp(last?.value ?? first.value, 0, 1)
  let lo = first
  let hi = last
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (!a || !b) continue
    if (timeSec >= a.time && timeSec <= b.time) {
      lo = a
      hi = b
      break
    }
  }
  const span = hi.time - lo.time
  const u = span <= TIME_GAP ? 0 : (timeSec - lo.time) / span
  return clamp(lo.value + (hi.value - lo.value) * u, 0, 1)
}

export function envelopeToParam(paramId: ParamId, normalized: number): number {
  return applyParamValue(fromNormalized(normalized, PARAMS[paramId]), PARAMS[paramId])
}

/**
 * Points for an SVG polyline in a 0–100 viewBox.
 * The first and last points sit on the visible edges so the line matches zoom.
 */
export function lanePolyline(
  nodes: readonly AutomationNode[],
  viewStart: number,
  viewEnd: number,
): string {
  if (nodes.length === 0 || !(viewEnd > viewStart)) return ''
  const span = viewEnd - viewStart
  const xOf = (time: number) => ((time - viewStart) / span) * 100
  const yOf = (value: number) => (1 - clamp(value, 0, 1)) * 100
  const push = (parts: string[], time: number, value: number) => {
    parts.push(`${xOf(time).toFixed(3)},${yOf(value).toFixed(3)}`)
  }
  const parts: string[] = []
  const startValue = sampleEnvelope(nodes, viewStart)
  const endValue = sampleEnvelope(nodes, viewEnd)
  if (startValue == null || endValue == null) return ''
  push(parts, viewStart, startValue)
  for (const node of sortNodes([...nodes])) {
    if (node.time > viewStart && node.time < viewEnd) push(parts, node.time, node.value)
  }
  push(parts, viewEnd, endValue)
  return parts.join(' ')
}

export function applyAutomation(
  params: Record<ParamId, number>,
  doc: AutomationDocument,
  timeSec: number,
): Record<ParamId, number> {
  if (!automationHasNodes(doc)) return params
  let next: Record<ParamId, number> | null = null
  for (const lane of doc.lanes) {
    if (!isAutomatableParam(lane.paramId) || lane.nodes.length === 0) continue
    const normalized = sampleEnvelope(lane.nodes, timeSec)
    if (normalized == null) continue
    if (!next) next = { ...params }
    next[lane.paramId] = envelopeToParam(lane.paramId, normalized)
  }
  return next ?? params
}

export function resolvePerformanceParams(
  manual: Record<ParamId, number>,
  automation: AutomationDocument,
  timeSec: number,
  playing: boolean,
  lfos: FxLfoMap,
  lfoTimeSec: number,
  hold: LfoHoldState,
): Record<ParamId, number> {
  const base = playing ? applyAutomation(manual, automation, timeSec) : manual
  const modulated = anyFxLfoActive(lfos) ? applyFxLfos(base, lfos, lfoTimeSec, hold) : base
  // Linked pairs (delay correlate, L/R link) follow the automated or modulated
  // value. Skip when the result is still the stored object so a stopped
  // transport cannot rewrite the manual knobs.
  if (modulated === manual) return modulated
  const changed: ParamId[] = []
  for (const id of Object.keys(modulated) as ParamId[]) {
    if (modulated[id] !== manual[id]) changed.push(id)
  }
  if (changed.length > 0) applyParamLinks(modulated, changed)
  return modulated
}

function withLane(doc: AutomationDocument, paramId: ParamId, nodes: AutomationNode[]): AutomationDocument {
  const lanes = doc.lanes.filter((lane) => lane.paramId !== paramId)
  if (nodes.length > 0) lanes.push({ paramId, nodes: sortNodes(nodes) })
  lanes.sort((a, b) => a.paramId.localeCompare(b.paramId))
  return { selectedParamId: doc.selectedParamId, lanes }
}

export function selectAutomationParam(doc: AutomationDocument, paramId: ParamId): AutomationDocument {
  if (!isAutomatableParam(paramId) || doc.selectedParamId === paramId) return doc
  return { ...doc, selectedParamId: paramId }
}

export function insertAutomationNode(
  doc: AutomationDocument,
  time: number,
  value: number,
  duration: number,
  id = createAutomationNodeId(),
): { doc: AutomationDocument; id: string } | null {
  const paramId = doc.selectedParamId
  if (!isAutomatableParam(paramId) || !(duration > 0)) return null
  const existing = laneFor(doc, paramId)?.nodes ?? []
  const node: AutomationNode = {
    id,
    time: separateTime(time, existing, id, duration),
    value: clamp(value, 0, 1),
  }
  return { doc: withLane(doc, paramId, [...existing, node]), id }
}

export function relocateAutomationNode(
  doc: AutomationDocument,
  id: string,
  time: number,
  value: number,
  duration: number,
): AutomationDocument {
  const paramId = doc.selectedParamId
  const existing = laneFor(doc, paramId)?.nodes
  if (!existing) return doc
  const current = existing.find((node) => node.id === id)
  if (!current) return doc
  const nextTime = separateTime(time, existing, id, duration)
  const nextValue = clamp(value, 0, 1)
  if (Math.abs(current.time - nextTime) < 1e-6 && Math.abs(current.value - nextValue) < 1e-6) return doc
  const nodes = existing.map((node) => (node.id === id ? { ...node, time: nextTime, value: nextValue } : node))
  return withLane(doc, paramId, nodes)
}

export function removeAutomationNode(doc: AutomationDocument, id: string): AutomationDocument {
  const paramId = doc.selectedParamId
  const existing = laneFor(doc, paramId)?.nodes
  if (!existing?.some((node) => node.id === id)) return doc
  return withLane(
    doc,
    paramId,
    existing.filter((node) => node.id !== id),
  )
}

export function parseAutomation(raw: unknown): AutomationDocument {
  const next = defaultAutomation()
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as { selectedParamId?: unknown; lanes?: unknown }
  if (typeof rec.selectedParamId === 'string' && isAutomatableParam(rec.selectedParamId)) {
    next.selectedParamId = rec.selectedParamId
  }
  if (!Array.isArray(rec.lanes)) return next
  const seen = new Set<string>()
  for (const laneRaw of rec.lanes) {
    if (!laneRaw || typeof laneRaw !== 'object') continue
    const lane = laneRaw as { paramId?: unknown; nodes?: unknown }
    if (typeof lane.paramId !== 'string' || !isAutomatableParam(lane.paramId)) continue
    if (!Array.isArray(lane.nodes)) continue
    const nodes: AutomationNode[] = []
    for (const nodeRaw of lane.nodes) {
      if (!nodeRaw || typeof nodeRaw !== 'object') continue
      const node = nodeRaw as { id?: unknown; time?: unknown; value?: unknown }
      if (typeof node.time !== 'number' || !Number.isFinite(node.time)) continue
      if (typeof node.value !== 'number' || !Number.isFinite(node.value)) continue
      let id = typeof node.id === 'string' && node.id.trim() ? node.id : createAutomationNodeId()
      if (seen.has(id)) id = createAutomationNodeId()
      seen.add(id)
      nodes.push({ id, time: Math.max(0, node.time), value: clamp(node.value, 0, 1) })
    }
    if (nodes.length === 0) continue
    next.lanes.push({ paramId: lane.paramId, nodes: sortNodes(nodes) })
  }
  next.lanes.sort((a, b) => a.paramId.localeCompare(b.paramId))
  return next
}
