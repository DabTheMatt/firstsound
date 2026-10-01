import type { VizMode } from './editorState'

/**
 * Focus Mode hides everything unrelated to the current task and keeps the
 * complete minimal toolset for that task.
 */
export type FocusWorkspace = 'wave' | 'eq' | 'auto' | 'fft'

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
}

export function focusWorkspaceForViz(viz: VizMode): FocusWorkspace {
  if (viz === 'automation') return 'auto'
  if (viz === 'eq-split') return 'eq'
  if (viz === 'spectrum') return 'fft'
  return 'wave'
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
