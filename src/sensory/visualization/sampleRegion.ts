import { clampRegion } from '../../audio/parameters/mapping'

/** Inclusive sample span covering [startSec, endSec] in a buffer of `duration` seconds. */
export function sampleIndexSpan(
  length: number,
  duration: number,
  startSec: number,
  endSec: number,
): { i0: number; i1: number } {
  if (!(length > 0) || !(duration > 0)) return { i0: 0, i1: 0 }
  const a = Math.min(startSec, endSec)
  const b = Math.max(startSec, endSec)
  const i0 = Math.max(0, Math.min(length - 1, Math.floor((a / duration) * length)))
  const i1 = Math.max(i0 + 1, Math.min(length, Math.ceil((b / duration) * length)))
  return { i0, i1 }
}

/** Playhead as 0..1 inside a view window. */
export function playheadInView(head: number, start: number, end: number): number {
  const span = Math.max(1e-9, end - start)
  return Math.min(1, Math.max(0, (head - start) / span))
}

export function lerpTime(start: number, end: number, frac: number): number {
  return start + (end - start) * Math.min(1, Math.max(0, frac))
}

export function regionFromDrag(a: number, b: number, duration: number) {
  return clampRegion(Math.min(a, b), Math.max(a, b), duration)
}

export function workingTimeFromSource(sourceTime: number, windowStart: number, workDur: number): number {
  if (!(workDur > 0)) return 0
  return Math.min(workDur, Math.max(0, sourceTime - windowStart))
}

/** True when the region is the whole sample, so a body drag still draws a selection. */
export function selectionCoversSample(start: number, end: number, duration: number): boolean {
  if (!(duration > 0)) return true
  const a = Math.min(start, end)
  const b = Math.max(start, end)
  const eps = Math.max(0.01, duration * 0.004)
  return a <= eps && b >= duration - eps
}

/**
 * Slide a region without changing its length.
 * Movement stops at the sample edges.
 */
export function slideRegion(
  start: number,
  end: number,
  delta: number,
  duration: number,
): { start: number; end: number } {
  if (!(duration > 0)) return { start: 0, end: 0 }
  const a = Math.min(start, end)
  const b = Math.max(start, end)
  const span = Math.min(duration, Math.max(0, b - a))
  const maxStart = Math.max(0, duration - span)
  const next = Math.min(maxStart, Math.max(0, a + delta))
  return { start: next, end: next + span }
}

/** Move one edge. The other edge stays put, and the region keeps a minimum length. */
export function resizeRegionEdge(
  edge: 'start' | 'end',
  start: number,
  end: number,
  pointer: number,
  duration: number,
  minLen = 0.05,
): { start: number; end: number } {
  if (!(duration > 0)) return { start: 0, end: 0 }
  const a = Math.min(start, end)
  const b = Math.max(start, end)
  const min = Math.min(minLen, duration)
  if (edge === 'start') {
    const next = Math.min(Math.max(0, pointer), b - min)
    return { start: next, end: b }
  }
  const next = Math.max(Math.min(duration, pointer), a + min)
  return { start: a, end: next }
}

export type SensorySelectionGesture = 'move' | 'resize-start' | 'resize-end' | 'create'

/**
 * Hit width for a selection edge. Wide enough for a finger, narrow enough
 * that the middle of the region stays a move target.
 */
export function selectionEdgePx(spanPx: number, widthPx: number, minEdgePx = 28): number {
  const desired = Math.min(48, Math.max(minEdgePx, widthPx * 0.08))
  if (!(spanPx > 0)) return desired
  return Math.max(10, Math.min(desired, spanPx * 0.34))
}

/**
 * Sensory waveform:
 * body of a partial selection moves, edges resize, empty sample creates.
 * A full-sample region still creates, so the first selection has a gesture.
 * Mouse and touch share this hit test — it does not depend on hover.
 */
export function sensorySelectionGesture(opts: {
  frac: number
  startFrac: number
  endFrac: number
  widthPx: number
  coversSample: boolean
  minEdgePx?: number
}): SensorySelectionGesture {
  const width = Math.max(1, opts.widthPx)
  const startFrac = Math.min(opts.startFrac, opts.endFrac)
  const endFrac = Math.max(opts.startFrac, opts.endFrac)
  const startPx = startFrac * width
  const endPx = endFrac * width
  const x = Math.min(width, Math.max(0, opts.frac)) * width
  const edge = selectionEdgePx(Math.max(0, endPx - startPx), width, opts.minEdgePx)
  const distStart = Math.abs(x - startPx)
  const distEnd = Math.abs(x - endPx)
  const nearStart = distStart <= edge
  const nearEnd = distEnd <= edge
  if (nearStart && nearEnd) return distStart <= distEnd ? 'resize-start' : 'resize-end'
  if (nearStart) return 'resize-start'
  if (nearEnd) return 'resize-end'
  const inside = x > startPx && x < endPx
  if (inside && !opts.coversSample) return 'move'
  return 'create'
}
