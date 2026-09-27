/** Rotary knob geometry. 0° is 3 o’clock, clockwise, matching SVG. */

export const KNOB_START_DEG = 135
export const KNOB_SWEEP_DEG = 270

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** Angle of the value tip (leading end of the yellow arc). */
export function knobAngleDeg(normalized: number): number {
  return KNOB_START_DEG + clamp01(normalized) * KNOB_SWEEP_DEG
}

export function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r }
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const delta = endDeg - startDeg
  if (Math.abs(delta) < 0.75) return ''
  const start = polar(cx, cy, r, startDeg)
  const end = polar(cx, cy, r, endDeg)
  const large = Math.abs(delta) > 180 ? 1 : 0
  const sweep = delta >= 0 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

/**
 * Active-LED overlay in the dial's top-right corner.
 * Absolute, so showing it does not change knob layout.
 * Sized to stay outside the value arc, pointer, and LFO ring (viewBox radius 37).
 */
export const KNOB_VIEWBOX = 84
export const KNOB_OUTER_ART_RADIUS = 37
export const ACTIVE_LED_INSET_PX = 2
export const ACTIVE_LED_SIZE_PX = 5

/** True when the LED disk stays outside the outermost painted knob ring. */
export function activeLedClearsOuterArt(
  dialPx: number,
  insetPx = ACTIVE_LED_INSET_PX,
  sizePx = ACTIVE_LED_SIZE_PX,
): boolean {
  if (!(dialPx > 0) || !(sizePx > 0) || insetPx < 0) return false
  if (insetPx + sizePx > dialPx) return false
  const center = dialPx / 2
  const ledCenterX = dialPx - insetPx - sizePx / 2
  const ledCenterY = insetPx + sizePx / 2
  const nearest = Math.hypot(ledCenterX - center, ledCenterY - center) - sizePx / 2
  const outer = (KNOB_OUTER_ART_RADIUS / KNOB_VIEWBOX) * dialPx
  return nearest >= outer + 1
}

/** Yellow value stroke: unipolar from min; bipolar from 12 o’clock toward L or R. */
export function knobValueArc(
  normalized: number,
  bipolar: boolean,
): { startDeg: number; endDeg: number } {
  const tip = knobAngleDeg(normalized)
  if (!bipolar) return { startDeg: KNOB_START_DEG, endDeg: tip }
  const mid = knobAngleDeg(0.5)
  if (clamp01(normalized) >= 0.5) return { startDeg: mid, endDeg: tip }
  return { startDeg: tip, endDeg: mid }
}
