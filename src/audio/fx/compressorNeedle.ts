/** Needle travel. 0 dB of reduction rests on the right. −24 dB sits on the left. */
export const COMPRESSOR_NEEDLE_SPAN_DB = 24

/**
 * Canvas angle in radians for a gain-reduction needle.
 * 0 is east and negative angles point upward, matching a pivot at the bottom of the arc.
 * The needle does not move when reduction is 0.
 */
export function compressorNeedleRadians(reductionDb: number): number {
  const gr = Math.min(0, Math.max(-COMPRESSOR_NEEDLE_SPAN_DB, Number.isFinite(reductionDb) ? reductionDb : 0))
  const t = -gr / COMPRESSOR_NEEDLE_SPAN_DB
  const half = Math.PI * 0.42
  return -Math.PI / 2 + half * (1 - 2 * t)
}
