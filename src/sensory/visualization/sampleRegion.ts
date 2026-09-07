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
