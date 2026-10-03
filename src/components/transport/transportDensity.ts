export type TransportDensity = 1 | 2 | 3 | 4 | 5

/**
 * Progressive compression for the desktop transport.
 * 1 full labels, 2 tighter padding, 3 smaller type,
 * 4 icon labels, 5 secondary actions collapse into More.
 */
export function transportDensity(width: number): TransportDensity {
  if (!Number.isFinite(width) || width >= 1100) return 1
  if (width >= 920) return 2
  if (width >= 760) return 3
  if (width >= 620) return 4
  return 5
}
