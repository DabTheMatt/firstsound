import type { AutomationCurve } from '../../audio/automation/automation'

/** Left to right, and counterclockwise to clockwise on the rotary: step, linear, smooth. */
export const CURVE_SWITCH_ORDER = ['step', 'linear', 'smooth'] as const satisfies readonly AutomationCurve[]

/** Bearing from 12 o'clock, degrees, clockwise. */
export const CURVE_DETENT_BEARING = [-60, 0, 60] as const

export const CURVE_SWITCH_BOX = { width: 40, height: 36, cx: 20, cy: 22 } as const
export const CURVE_ICON_RADIUS = 13

export function clampCurveIndex(index: number): number {
  if (!Number.isFinite(index)) return 1
  return Math.min(CURVE_SWITCH_ORDER.length - 1, Math.max(0, Math.round(index)))
}

export function curveIndexFor(curve: AutomationCurve | null | undefined): number {
  if (curve == null) return 1
  const index = CURVE_SWITCH_ORDER.indexOf(curve)
  return index < 0 ? 1 : index
}

/** Point on the rotary. 0° bearing is up. */
export function curveDetentPoint(index: number, cx: number, cy: number, radius: number): { x: number; y: number } {
  const bearing = (CURVE_DETENT_BEARING[clampCurveIndex(index)]! * Math.PI) / 180
  return {
    x: cx + Math.sin(bearing) * radius,
    y: cy - Math.cos(bearing) * radius,
  }
}

/**
 * Nearest detent for a pointer offset from the rotary center.
 * Null when the pointer is too close to the hub to choose a side.
 */
export function curveIndexFromPointer(dx: number, dy: number, centerSlop = 6): number | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
  if (Math.hypot(dx, dy) < centerSlop) return null
  const bearing = (Math.atan2(dx, -dy) * 180) / Math.PI
  let best = 0
  let bestAbs = Infinity
  for (let i = 0; i < CURVE_DETENT_BEARING.length; i++) {
    let delta = bearing - CURVE_DETENT_BEARING[i]!
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    const abs = Math.abs(delta)
    if (abs < bestAbs) {
      bestAbs = abs
      best = i
    }
  }
  return best
}

/**
 * Discrete drag. Pointer movement upward (negative deltaY) advances toward Smooth,
 * matching the knob convention that drag-up raises the value.
 */
export function curveIndexFromDrag(startIndex: number, deltaY: number, pxPerStep = 14): number {
  if (!Number.isFinite(deltaY)) return clampCurveIndex(startIndex)
  const steps = Math.round(-deltaY / pxPerStep)
  return clampCurveIndex(startIndex + steps)
}
