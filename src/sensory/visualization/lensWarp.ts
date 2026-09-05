/** Map a lens-local x in −1…+1 to a source x. Center is strongly magnified. */
export function lensSourceX(nx: number, strength = 0.22): number {
  const n = Math.min(1, Math.max(-1, nx))
  const a = Math.min(0.55, Math.max(0.12, strength))
  const mag = Math.abs(n)
  const src = mag * mag * (a + (1 - a) * mag)
  return n < 0 ? -src : src
}

/** Extra vertical bulge toward the glass rim. */
export function lensEdgeBulge(nx: number, amount = 0.9): number {
  const n = Math.min(1, Math.max(-1, nx))
  return 1 + amount * n * n
}

/** Sphere foreshortening so the wave sits on the glass, not a flat strip. */
export function lensSphereScale(nx: number): number {
  const n = Math.min(1, Math.max(-1, nx))
  return Math.sqrt(Math.max(0, 1 - n * n))
}

/** Inverse of lensSourceX: source x in −1…+1 to display x. */
export function lensDisplayX(source: number, strength = 0.22): number {
  const target = Math.min(1, Math.max(-1, source))
  let lo = -1
  let hi = 1
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    if (lensSourceX(mid, strength) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
