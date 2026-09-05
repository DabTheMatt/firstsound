export const LENS_WINDOW_MIN_SEC = 5
export const LENS_WINDOW_MAX_SEC = 120

export function lensWindowRange(duration: number): { min: number; max: number } {
  if (!(duration > 0) || !Number.isFinite(duration)) {
    return { min: LENS_WINDOW_MIN_SEC, max: LENS_WINDOW_MAX_SEC }
  }
  const max = Math.min(LENS_WINDOW_MAX_SEC, duration)
  const min = Math.min(LENS_WINDOW_MIN_SEC, max)
  return { min, max }
}

/** Map 0…1 ring amount to the seconds of sample shown in the lens. */
export function lensWindowSeconds(amount01: number, duration: number): number {
  const { min, max } = lensWindowRange(duration)
  const t = Math.min(1, Math.max(0, amount01))
  return min + t * (max - min)
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/** Smallest signed wrap of a 0…1 ring delta. */
export function wrapUnitDelta(delta: number): number {
  let d = delta
  while (d > 0.5) d -= 1
  while (d < -0.5) d += 1
  return d
}
