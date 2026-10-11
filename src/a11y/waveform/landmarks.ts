import type { AudioLandmark, LandmarkFilter, LandmarkType } from './types'
import type { DetectedLandmark } from './detect'

export type TimelineFacts = {
  duration: number
  selectionStart: number
  selectionEnd: number
  /** True when the highlight is only part of the recording. */
  selectionPartial: boolean
  loopOn: boolean
  loopStart: number
  loopEnd: number
}

const DETAIL_GAP_SEC = 0.05
const COARSE_GAP_SEC = 0.2

function timeline(type: LandmarkType, time: number, index: number): AudioLandmark {
  return { id: `${type}:${index}:${Math.round(time * 1000)}`, type, time, source: 'timeline' }
}

function detected(mark: DetectedLandmark, index: number): AudioLandmark {
  return {
    id: `${mark.type}:${index}:${Math.round(mark.time * 1000)}`,
    type: mark.type,
    time: mark.time,
    source: 'detected',
    confidence: mark.confidence,
  }
}

/** Exact boundaries plus the latest analysis for this recording. Analysis never edits audio. */
export function assembleLandmarks(facts: TimelineFacts, found: readonly DetectedLandmark[]): AudioLandmark[] {
  const duration = facts.duration
  if (!(duration > 0)) return []
  const marks: AudioLandmark[] = [
    timeline('recording-start', 0, 0),
    timeline('recording-end', duration, 1),
  ]
  if (facts.selectionPartial) {
    marks.push(timeline('selection-start', facts.selectionStart, 2))
    marks.push(timeline('selection-end', facts.selectionEnd, 3))
  }
  const loopEnd = facts.loopEnd > facts.loopStart ? facts.loopEnd : duration
  const loopIsWhole = facts.loopStart <= 0.001 && loopEnd >= duration - 0.001
  if (facts.loopOn && !loopIsWhole) {
    marks.push(timeline('loop-start', facts.loopStart, 4))
    marks.push(timeline('loop-end', loopEnd, 5))
  }
  found.forEach((mark, index) => {
    if (mark.time < -0.001 || mark.time > duration + 0.001) return
    marks.push(detected(mark, index))
  })
  marks.sort((a, b) => a.time - b.time || a.type.localeCompare(b.type))
  return marks
}

export function landmarkMatches(mark: AudioLandmark, filter: LandmarkFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'transient':
      return mark.type === 'transient'
    case 'low-level':
      return mark.type === 'low-level-start' || mark.type === 'low-level-end'
    case 'level':
      return mark.type === 'level-change'
    case 'selection':
      return mark.type === 'selection-start' || mark.type === 'selection-end'
    case 'structural':
      return mark.source === 'timeline'
    default:
      return true
  }
}

/**
 * Detected marks closer than `minGapSec` collapse to the earlier one.
 * Recording, selection, and loop boundaries stay.
 */
export function thinLandmarks(marks: readonly AudioLandmark[], detail: boolean): AudioLandmark[] {
  const gap = detail ? DETAIL_GAP_SEC : COARSE_GAP_SEC
  const kept: AudioLandmark[] = []
  const lastDetected = new Map<string, number>()
  for (const mark of marks) {
    if (mark.source === 'timeline') {
      kept.push(mark)
      continue
    }
    const previous = lastDetected.get(mark.type)
    if (previous != null && mark.time - previous < gap) continue
    lastDetected.set(mark.type, mark.time)
    kept.push(mark)
  }
  return kept
}

export function visibleLandmarks(marks: readonly AudioLandmark[], filter: LandmarkFilter, detail: boolean): AudioLandmark[] {
  return thinLandmarks(
    marks.filter((mark) => landmarkMatches(mark, filter)),
    detail,
  )
}

/** The next detected or structural time strictly before or after the playhead. */
export function neighborLandmark(marks: readonly AudioLandmark[], time: number, direction: -1 | 1): AudioLandmark | null {
  const epsilon = 0.0005
  if (direction < 0) {
    let best: AudioLandmark | null = null
    for (const mark of marks) {
      if (mark.time < time - epsilon && (best == null || mark.time > best.time)) best = mark
    }
    return best
  }
  let best: AudioLandmark | null = null
  for (const mark of marks) {
    if (mark.time > time + epsilon && (best == null || mark.time < best.time)) best = mark
  }
  return best
}
