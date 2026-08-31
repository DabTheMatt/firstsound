/**
 * Grain-position drift value in [-depth, depth]. A sine LFO (smooth) is blended
 * with a random-walk value (jitter) so Motion can range from a steady sweep to
 * organic wandering. Kept pure so it is unit-testable and reusable.
 */
export function motionValue(
  depthPct: number,
  rateHz: number,
  jitterPct: number,
  randomWalk: number,
  t: number,
): number {
  const depth = depthPct / 100
  if (depth <= 0) return 0
  const jitter = Math.min(1, Math.max(0, jitterPct / 100))
  const lfo = Math.sin(2 * Math.PI * rateHz * t)
  return depth * ((1 - jitter) * lfo + jitter * randomWalk)
}
