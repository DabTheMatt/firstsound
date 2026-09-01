/** Keep envelope handles inset from loop edges so grab targets never coincide. */
export function insetHandleFrac(
  edgeFrac: number,
  innerFrac: number,
  minFrac: number,
  inward: 1 | -1,
): number {
  const gap = Math.max(0, minFrac)
  if (inward > 0) return Math.max(innerFrac, edgeFrac + gap)
  return Math.min(innerFrac, edgeFrac - gap)
}
