/** Structural times come from the editor. Detected times are approximate signal events. */

export type TimelineLandmarkType =
  | 'recording-start'
  | 'recording-end'
  | 'selection-start'
  | 'selection-end'
  | 'loop-start'
  | 'loop-end'

export type DetectedLandmarkType = 'transient' | 'low-level-start' | 'low-level-end' | 'level-change'

export type LandmarkType = TimelineLandmarkType | DetectedLandmarkType

export type AudioLandmark = {
  id: string
  type: LandmarkType
  /** Seconds on the same clock as the playhead. */
  time: number
  source: 'timeline' | 'detected'
  /** Set for heuristic events. Exact timeline boundaries omit it. */
  confidence?: number
}

export type LandmarkFilter = 'all' | 'transient' | 'low-level' | 'level' | 'selection' | 'structural'

export type NavStepId = '10s' | '1s' | '100ms' | '10ms' | 'sample'

export const NAV_STEP_IDS: readonly NavStepId[] = ['10s', '1s', '100ms', '10ms', 'sample']
