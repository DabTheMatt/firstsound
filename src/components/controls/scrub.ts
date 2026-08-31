import { clamp } from '../../audio/parameters/mapping'

/** 0 at 12 o'clock, increasing clockwise. */
export function pointerAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  let angle = Math.atan2(dx, -dy)
  if (angle < 0) angle += Math.PI * 2
  return angle
}

export function angleToTime(angle: number, duration: number): number {
  if (duration <= 0) return 0
  return (angle / (Math.PI * 2)) * duration
}

export function timeToFraction(time: number, duration: number): number {
  if (duration <= 0) return 0
  return clamp(time / duration, 0, 1)
}

/** Dash pattern for a circular arc covering [start, end] of the sample. */
export function regionArcDash(
  start: number,
  end: number,
  duration: number,
  circumference: number,
): { dashArray: string; dashOffset: number } {
  if (duration <= 0 || circumference <= 0) {
    return { dashArray: `0 ${circumference}`, dashOffset: 0 }
  }
  const a = clamp(start / duration, 0, 1)
  const b = clamp(end / duration, 0, 1)
  const len = Math.max(0, b - a) * circumference
  return {
    dashArray: `${len} ${circumference}`,
    dashOffset: -a * circumference,
  }
}

/**
 * Wheel → parameter delta in 0..1 normalized space.
 * Wheel up increases. Shift multiplies the step (~5×).
 */
export function wheelToNormalized(deltaY: number, shiftKey: boolean): number {
  const ticks = deltaY / 100
  const step = shiftKey ? 0.08 : 0.016
  return -ticks * step
}

/**
 * Wheel → time delta in seconds across the active scrub span.
 * Wheel up moves the playhead forward.
 */
export function wheelToTimeDelta(
  deltaY: number,
  shiftKey: boolean,
  span: number,
): number {
  const ticks = deltaY / 100
  const frac = shiftKey ? 0.08 : 0.012
  return -ticks * frac * Math.max(span, 0)
}
