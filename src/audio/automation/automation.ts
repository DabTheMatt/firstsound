import { FX_LFO_KINDS, FX_LFO_TARGETS, fxLfoKindForParam, type FxLfoKind } from '../fx/lfo'
import { PARAMS } from '../parameters/definitions'
import { applyParamValue, clamp, fromNormalized } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

/**
 * Automation lanes are an absolute trajectory in normalized parameter space.
 * Playback evaluation (base → automation center → relative LFO → safe range)
 * lives in `parameters/evaluation.ts`. The envelope replaces the manual value
 * only while the transport is running, so a knob edit cannot erase nodes.
 *
 * Every lane with nodes runs during playback. `selectedParamId` is the lane
 * being edited, not a solo.
 */
export const AUTOMATION_CURVES = ['linear', 'smooth', 'step'] as const
export type AutomationCurve = (typeof AUTOMATION_CURVES)[number]

export type AutomationNode = {
  id: string
  /** Seconds on the sample timeline. */
  time: number
  /** Normalized parameter position, 0–1, using ParamDef.mapping. */
  value: number
  /** Interpolation from this node to the next. Missing means linear. */
  curve?: AutomationCurve
  /** Smooth bias, −1..1. Positive raises the midpoint. Ignored by linear and step. */
  tension?: number
}

export type AutomationLane = {
  paramId: ParamId
  nodes: AutomationNode[]
  /** Index into AUTOMATION_PALETTE. Assigned once and persisted. */
  colorIndex?: number
}

export type AutomationDocument = {
  selectedParamId: ParamId
  lanes: AutomationLane[]
}

/** UI focus for the envelope editor. Not part of the saved document. */
export type AutomationEditFocus = {
  nodeId: string | null
  segmentId: string | null
}

export const EMPTY_AUTOMATION_FOCUS: AutomationEditFocus = { nodeId: null, segmentId: null }

/**
 * Theme tokens, in a fixed order. The same parameter keeps its index for the
 * session and across reload because the index is stored on the lane.
 */
export const AUTOMATION_PALETTE = [
  '--accent-primary',
  '--eq-curve-2',
  '--eq-curve-3',
  '--meter-low',
  '--meter-high',
  '--meter-clip',
  '--meter-mid',
  '--playhead',
  'color-mix(in srgb, var(--accent-primary) 55%, var(--eq-curve-2))',
  'color-mix(in srgb, var(--meter-low) 60%, var(--eq-curve-3))',
  'color-mix(in srgb, var(--meter-clip) 50%, var(--accent-primary))',
  'color-mix(in srgb, var(--eq-curve-2) 50%, var(--meter-mid))',
  'color-mix(in srgb, var(--playhead) 45%, var(--meter-low))',
  'color-mix(in srgb, var(--eq-curve-3) 60%, var(--meter-high))',
  'color-mix(in srgb, var(--meter-mid) 50%, var(--meter-clip))',
  'color-mix(in srgb, var(--accent-secondary) 70%, var(--eq-curve-2))',
] as const

const TIME_GAP = 0.0005
const SMOOTH_STEPS = 24

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

export function automationColor(colorIndex: number | undefined): string {
  const size = AUTOMATION_PALETTE.length
  const index =
    typeof colorIndex === 'number' && Number.isFinite(colorIndex)
      ? ((Math.round(colorIndex) % size) + size) % size
      : 0
  const token = AUTOMATION_PALETTE[index] ?? AUTOMATION_PALETTE[0]
  return token.startsWith('--') ? `var(${token})` : token
}

function preferredColorIndex(paramId: string): number {
  let hash = 2166136261
  for (let i = 0; i < paramId.length; i++) {
    hash ^= paramId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % AUTOMATION_PALETTE.length
}

export function claimColorIndex(paramId: string, used: ReadonlySet<number>, preferred?: number): number {
  const size = AUTOMATION_PALETTE.length
  const start =
    typeof preferred === 'number' && Number.isInteger(preferred) && preferred >= 0 && preferred < size
      ? preferred
      : preferredColorIndex(paramId)
  if (!used.has(start)) return start
  for (let step = 1; step < size; step++) {
    const next = (start + step) % size
    if (!used.has(next)) return next
  }
  return start
}

export function colorIndexForParam(doc: AutomationDocument, paramId: ParamId): number {
  const lane = doc.lanes.find((item) => item.paramId === paramId)
  if (typeof lane?.colorIndex === 'number') return lane.colorIndex
  const used = new Set<number>()
  for (const item of doc.lanes) {
    if (typeof item.colorIndex === 'number') used.add(item.colorIndex)
  }
  return claimColorIndex(paramId, used)
}

/** Lanes that currently hold automation data, in effect-chain order. */
export function automatedLanes(doc: AutomationDocument): AutomationLane[] {
  const order = new Map<string, number>()
  let index = 0
  for (const group of automationEffectGroups()) {
    for (const id of group.paramIds) {
      order.set(id, index)
      index += 1
    }
  }
  return doc.lanes
    .filter((lane) => lane.nodes.length > 0)
    .slice()
    .sort((a, b) => (order.get(a.paramId) ?? 0) - (order.get(b.paramId) ?? 0) || a.paramId.localeCompare(b.paramId))
}

export function nodeCurve(node: AutomationNode | undefined): AutomationCurve {
  return node?.curve === 'smooth' || node?.curve === 'step' ? node.curve : 'linear'
}

export function nodeTension(node: AutomationNode | undefined): number {
  const tension = node?.tension
  return typeof tension === 'number' && Number.isFinite(tension) ? clamp(tension, -1, 1) : 0
}

/**
 * Unit progress through one segment. Linear and smooth are monotonic and stay
 * inside 0..1, so normalized automation cannot leave the parameter range.
 * Step holds the previous node until the next time boundary.
 */
export function curveUnit(progress: number, curve: AutomationCurve, tension = 0): number {
  const u = clamp(progress, 0, 1)
  if (curve === 'step') return u >= 1 ? 1 : 0
  if (curve === 'linear') return u
  const bias = clamp(tension, -1, 1)
  const exponent = 2 ** (-bias * 2)
  const warped = u ** exponent
  const smooth = warped * warped * (3 - 2 * warped)
  return clamp(smooth, 0, 1)
}

let nodeSeq = 0

export function createAutomationNodeId(): string {
  nodeSeq += 1
  return `auto-${nodeSeq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function copyNode(node: AutomationNode): AutomationNode {
  const curve = node.curve === 'linear' || node.curve === 'smooth' || node.curve === 'step' ? node.curve : undefined
  const tension = typeof node.tension === 'number' && Number.isFinite(node.tension) ? clamp(node.tension, -1, 1) : undefined
  return {
    id: node.id,
    time: node.time,
    value: node.value,
    ...(curve ? { curve } : {}),
    ...(tension != null ? { tension } : {}),
  }
}

function resolveColorIndex(paramId: ParamId, stored: number | undefined, used: Set<number>): number {
  const size = AUTOMATION_PALETTE.length
  if (typeof stored === 'number' && Number.isInteger(stored) && stored >= 0 && stored < size) {
    used.add(stored)
    return stored
  }
  const index = claimColorIndex(paramId, used)
  used.add(index)
  return index
}

export function cloneAutomation(doc: AutomationDocument): AutomationDocument {
  const used = new Set<number>()
  return {
    selectedParamId: isAutomatableParam(doc.selectedParamId) ? doc.selectedParamId : 'gain',
    lanes: doc.lanes
      .filter((lane) => isAutomatableParam(lane.paramId) && lane.nodes.length > 0)
      .map((lane) => ({
        paramId: lane.paramId,
        colorIndex: resolveColorIndex(lane.paramId, lane.colorIndex, used),
        nodes: lane.nodes.map(copyNode),
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
    if ((left.colorIndex ?? -1) !== (right.colorIndex ?? -1)) return false
    for (let n = 0; n < left.nodes.length; n++) {
      const x = left.nodes[n]
      const y = right.nodes[n]
      if (!x || !y || x.id !== y.id) return false
      if (Math.abs(x.time - y.time) > eps || Math.abs(x.value - y.value) > eps) return false
      if (nodeCurve(x) !== nodeCurve(y)) return false
      if (Math.abs(nodeTension(x) - nodeTension(y)) > eps) return false
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

function sortNodes(nodes: readonly AutomationNode[]): AutomationNode[] {
  return [...nodes].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
}

/** Segment that starts at this node, or the incoming segment when it is the last node. */
export function segmentIdForNode(nodes: readonly AutomationNode[], nodeId: string | null): string | null {
  if (!nodeId) return null
  const sorted = sortNodes(nodes)
  const index = sorted.findIndex((node) => node.id === nodeId)
  if (index < 0) return null
  if (index < sorted.length - 1) return sorted[index]!.id
  return index > 0 ? sorted[index - 1]!.id : null
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

/** Interpolation in normalized space. Holds the end nodes outside the span. */
export function sampleEnvelope(nodes: readonly AutomationNode[], timeSec: number): number | null {
  if (nodes.length === 0) return null
  const sorted = nodes.length === 1 ? nodes : sortNodes(nodes)
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
  const shaped = curveUnit(u, nodeCurve(lo), nodeTension(lo))
  return clamp(lo.value + (hi.value - lo.value) * shaped, 0, 1)
}

export function envelopeToParam(paramId: ParamId, normalized: number): number {
  return applyParamValue(fromNormalized(normalized, PARAMS[paramId]), PARAMS[paramId])
}

export type EnvelopeSample = { time: number; value: number }

function pushSample(points: EnvelopeSample[], time: number, value: number, viewStart: number, viewEnd: number): void {
  const t = clamp(time, viewStart, viewEnd)
  const v = clamp(value, 0, 1)
  const prev = points[points.length - 1]
  if (prev && Math.abs(prev.time - t) <= 1e-6 && Math.abs(prev.value - v) <= 1e-6) return
  points.push({ time: t, value: v })
}

/**
 * Samples used by both the SVG envelope and any caller that wants the same
 * shape `sampleEnvelope` evaluates. Step corners include the held value and
 * the new value at the boundary so the riser is visible.
 */
export function laneSamples(
  nodes: readonly AutomationNode[],
  viewStart: number,
  viewEnd: number,
): EnvelopeSample[] {
  if (nodes.length === 0 || !(viewEnd > viewStart)) return []
  const sorted = sortNodes(nodes)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) return []
  const points: EnvelopeSample[] = []
  const push = (time: number, value: number) => pushSample(points, time, value, viewStart, viewEnd)

  if (viewEnd <= first.time) {
    push(viewStart, first.value)
    push(viewEnd, first.value)
    return points
  }
  if (viewStart >= last.time) {
    push(viewStart, last.value)
    push(viewEnd, last.value)
    return points
  }

  const startValue = sampleEnvelope(sorted, viewStart)
  if (startValue != null) push(viewStart, startValue)

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (!a || !b || b.time <= viewStart || a.time >= viewEnd) continue
    const curve = nodeCurve(a)
    if (curve === 'step') {
      push(Math.max(a.time, viewStart), a.value)
      push(Math.min(b.time, viewEnd), a.value)
      if (b.time >= viewStart && b.time <= viewEnd) push(b.time, b.value)
      continue
    }
    if (curve === 'linear') {
      if (a.time > viewStart && a.time < viewEnd) push(a.time, a.value)
      if (b.time > viewStart && b.time < viewEnd) push(b.time, b.value)
      continue
    }
    for (let step = 0; step <= SMOOTH_STEPS; step++) {
      const time = a.time + ((b.time - a.time) * step) / SMOOTH_STEPS
      if (time < viewStart || time > viewEnd) continue
      const value = sampleEnvelope(sorted, time)
      if (value != null) push(time, value)
    }
  }

  if (last.time > viewStart && last.time < viewEnd) push(last.time, last.value)
  const endValue = sampleEnvelope(sorted, viewEnd)
  if (endValue != null) push(viewEnd, endValue)
  return points
}

/**
 * Points for an SVG polyline in a 0–100 viewBox.
 * Geometry comes from `laneSamples`, so the line matches playback evaluation.
 */
export function lanePolyline(nodes: readonly AutomationNode[], viewStart: number, viewEnd: number): string {
  if (!(viewEnd > viewStart)) return ''
  const span = viewEnd - viewStart
  return laneSamples(nodes, viewStart, viewEnd)
    .map((point) => {
      const x = ((point.time - viewStart) / span) * 100
      const y = (1 - point.value) * 100
      return `${x.toFixed(3)},${y.toFixed(3)}`
    })
    .join(' ')
}

/** Visible portion of one segment, without the holds outside its nodes. */
export function segmentPolyline(
  from: AutomationNode,
  to: AutomationNode,
  viewStart: number,
  viewEnd: number,
): string {
  const start = Math.max(viewStart, Math.min(from.time, to.time))
  const end = Math.min(viewEnd, Math.max(from.time, to.time))
  if (!(end > start)) return ''
  return lanePolyline([from, to], start, end)
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

function withLane(doc: AutomationDocument, paramId: ParamId, nodes: AutomationNode[]): AutomationDocument {
  const previous = doc.lanes.find((lane) => lane.paramId === paramId)
  const lanes = doc.lanes.filter((lane) => lane.paramId !== paramId)
  if (nodes.length > 0) {
    const used = new Set<number>()
    for (const lane of lanes) {
      if (typeof lane.colorIndex === 'number') used.add(lane.colorIndex)
    }
    lanes.push({
      paramId,
      colorIndex: resolveColorIndex(paramId, previous?.colorIndex, used),
      nodes: sortNodes(nodes),
    })
  }
  lanes.sort((a, b) => a.paramId.localeCompare(b.paramId))
  return { selectedParamId: doc.selectedParamId, lanes }
}

export function selectAutomationParam(doc: AutomationDocument, paramId: ParamId): AutomationDocument {
  if (!isAutomatableParam(paramId) || doc.selectedParamId === paramId) return doc
  return { ...doc, selectedParamId: paramId }
}

/**
 * Selects a parameter and, when it has no envelope yet, plants a flat one at
 * the current normalized value. A second call never creates another lane.
 */
export function ensureAutomationLane(
  doc: AutomationDocument,
  paramId: ParamId,
  normalized: number,
  duration: number,
): AutomationDocument {
  if (!isAutomatableParam(paramId)) return doc
  const selected = selectAutomationParam(doc, paramId)
  if ((laneFor(selected, paramId)?.nodes.length ?? 0) > 0 || !(duration > 0)) return selected
  const value = clamp(normalized, 0, 1)
  const started = insertAutomationNode(selected, 0, value, duration)
  if (!started) return selected
  // Keep the end node inside the waveform so it is not clipped by the region edge.
  const endTime = duration > 0.2 ? duration - Math.min(0.2, duration * 0.08) : duration
  const ended = insertAutomationNode(started.doc, endTime, value, duration)
  return ended?.doc ?? started.doc
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

/** Drops the envelope for one parameter. The effect and its manual value stay. */
export function removeAutomationLane(doc: AutomationDocument, paramId: ParamId): AutomationDocument {
  if (!doc.lanes.some((lane) => lane.paramId === paramId)) return doc
  return { ...doc, lanes: doc.lanes.filter((lane) => lane.paramId !== paramId) }
}

/**
 * Visualization metadata only. Nodes, curves, and playback values stay put.
 * Returns the same document when the index is already applied or invalid.
 */
export function setAutomationLaneColor(
  doc: AutomationDocument,
  paramId: ParamId,
  colorIndex: number,
): AutomationDocument {
  const size = AUTOMATION_PALETTE.length
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex >= size) return doc
  const lane = doc.lanes.find((item) => item.paramId === paramId)
  if (!lane || lane.colorIndex === colorIndex) return doc
  return {
    selectedParamId: doc.selectedParamId,
    lanes: doc.lanes.map((item) => (item.paramId === paramId ? { ...item, colorIndex } : item)),
  }
}

export function updateAutomationCurve(
  doc: AutomationDocument,
  id: string,
  curve: AutomationCurve,
): AutomationDocument {
  const paramId = doc.selectedParamId
  const existing = laneFor(doc, paramId)?.nodes
  const current = existing?.find((node) => node.id === id)
  if (!existing || !current || nodeCurve(current) === curve) return doc
  const nodes = existing.map((node) => (node.id === id ? { ...node, curve } : node))
  return withLane(doc, paramId, nodes)
}

export function updateAutomationTension(doc: AutomationDocument, id: string, tension: number): AutomationDocument {
  const paramId = doc.selectedParamId
  const existing = laneFor(doc, paramId)?.nodes
  const current = existing?.find((node) => node.id === id)
  if (!existing || !current || nodeCurve(current) !== 'smooth') return doc
  const next = clamp(tension, -1, 1)
  if (Math.abs(nodeTension(current) - next) < 1e-6) return doc
  const nodes = existing.map((node) => (node.id === id ? { ...node, tension: next } : node))
  return withLane(doc, paramId, nodes)
}

function parseCurve(raw: unknown): AutomationCurve | undefined {
  return raw === 'linear' || raw === 'smooth' || raw === 'step' ? raw : undefined
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
  const usedColors = new Set<number>()
  for (const laneRaw of rec.lanes) {
    if (!laneRaw || typeof laneRaw !== 'object') continue
    const lane = laneRaw as { paramId?: unknown; nodes?: unknown; colorIndex?: unknown }
    if (typeof lane.paramId !== 'string' || !isAutomatableParam(lane.paramId)) continue
    if (!Array.isArray(lane.nodes)) continue
    const nodes: AutomationNode[] = []
    for (const nodeRaw of lane.nodes) {
      if (!nodeRaw || typeof nodeRaw !== 'object') continue
      const node = nodeRaw as { id?: unknown; time?: unknown; value?: unknown; curve?: unknown; tension?: unknown }
      if (typeof node.time !== 'number' || !Number.isFinite(node.time)) continue
      if (typeof node.value !== 'number' || !Number.isFinite(node.value)) continue
      let id = typeof node.id === 'string' && node.id.trim() ? node.id : createAutomationNodeId()
      if (seen.has(id)) id = createAutomationNodeId()
      seen.add(id)
      const curve = parseCurve(node.curve)
      const tension =
        typeof node.tension === 'number' && Number.isFinite(node.tension) ? clamp(node.tension, -1, 1) : undefined
      nodes.push({
        id,
        time: Math.max(0, node.time),
        value: clamp(node.value, 0, 1),
        ...(curve ? { curve } : {}),
        ...(tension != null ? { tension } : {}),
      })
    }
    if (nodes.length === 0) continue
    const stored = typeof lane.colorIndex === 'number' ? lane.colorIndex : undefined
    next.lanes.push({
      paramId: lane.paramId,
      colorIndex: resolveColorIndex(lane.paramId, stored, usedColors),
      nodes: sortNodes(nodes),
    })
  }
  next.lanes.sort((a, b) => a.paramId.localeCompare(b.paramId))
  return next
}
