import type { FocusWorkspace } from './phoneWorkspace'

export { focusWorkspaceForViz, type FocusWorkspace } from './phoneWorkspace'

/**
 * Focus Mode hides everything unrelated to the current task and keeps the
 * complete minimal toolset for that task.
 */
export type FocusCapability =
  | 'addBand'
  | 'nodeEdit'
  | 'nodeType'
  | 'nodeDelete'
  | 'liveReadout'
  | 'selection'
  | 'editActions'
  | 'fadeIn'
  | 'fadeOut'
  | 'undoRedo'
  | 'laneSelect'
  | 'addParameter'
  | 'addNode'
  | 'deleteNode'
  | 'segmentInterpolation'
  | 'minimalAnalyzerControls'

const CAPABILITIES: Record<FocusWorkspace, readonly FocusCapability[]> = {
  eq: ['addBand', 'nodeEdit', 'nodeType', 'nodeDelete', 'liveReadout'],
  wave: ['selection', 'editActions', 'fadeIn', 'fadeOut', 'undoRedo'],
  auto: ['laneSelect', 'addParameter', 'addNode', 'deleteNode', 'segmentInterpolation'],
  fft: ['minimalAnalyzerControls'],
  hearing: ['liveReadout'],
}

export function focusCapabilities(workspace: FocusWorkspace): readonly FocusCapability[] {
  return CAPABILITIES[workspace]
}

export function focusHas(workspace: FocusWorkspace, capability: FocusCapability): boolean {
  return CAPABILITIES[workspace].includes(capability)
}

/** A short default fade inside the current selection. */
export function defaultSelectionFadeSeconds(start: number, end: number): number {
  const span = Math.max(0, end - start)
  if (!(span > 0)) return 0
  return Math.min(0.12, Math.max(0.01, span * 0.2))
}

/** Keeps a 0% / 100% automation line inside the focus plot instead of on the clip edge. */
export const FOCUS_LANE_PAD = 0.08

export function focusLaneFraction(value: number): number {
  const v = Math.min(1, Math.max(0, value))
  return FOCUS_LANE_PAD + (1 - v) * (1 - 2 * FOCUS_LANE_PAD)
}

export function focusLaneValue(yFraction: number): number {
  const span = 1 - 2 * FOCUS_LANE_PAD
  const raw = 1 - (yFraction - FOCUS_LANE_PAD) / span
  return Math.min(1, Math.max(0, raw))
}

/** Remap a 0–100 polyline so its values use the focus lane inset. */
export function focusLanePolyline(points: string): string {
  return points.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => {
    const mapped = focusLaneFraction(1 - Number(y) / 100) * 100
    return `${x},${mapped.toFixed(3)}`
  })
}

/** Prefer the playhead when it is on screen. Otherwise use the middle of the view. */
export function automationInsertTime(playhead: number, viewStart: number, viewEnd: number): number {
  if (playhead >= viewStart && playhead <= viewEnd) return playhead
  return (viewStart + viewEnd) / 2
}

/** Segment that contains `time`, or the nearest end segment when the click is outside the span. */
export function segmentAtTime(nodes: readonly { id: string; time: number }[], time: number): string | null {
  if (nodes.length < 2) return null
  const sorted = [...nodes].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (!start || !end) continue
    if (time >= start.time && time <= end.time) return start.id
  }
  return time < (sorted[0]?.time ?? 0) ? (sorted[0]?.id ?? null) : (sorted[sorted.length - 2]?.id ?? null)
}
