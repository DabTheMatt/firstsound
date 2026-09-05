/** Map a lens-local x in −1…+1 to a source x. Center is magnified; edges compress. */
export function lensSourceX(nx: number, strength = 0.42): number {
  const n = Math.min(1, Math.max(-1, nx))
  const a = Math.min(0.85, Math.max(0.2, strength))
  return n * (a + (1 - a) * n * n)
}

/** Extra vertical bulge toward the glass rim. */
export function lensEdgeBulge(nx: number, amount = 0.4): number {
  const n = Math.min(1, Math.max(-1, nx))
  return 1 + amount * n * n
}
