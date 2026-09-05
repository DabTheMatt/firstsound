export type SensorySceneId = 'range' | 'mirror' | 'canyon' | 'gleam'

export function canyonWallInset(depth01: number, width: number): number {
  const t = Math.min(1, Math.max(0, depth01))
  const e = t * t
  return width * (0.045 + e * 0.37)
}

export function canyonDepthY(depth01: number, height: number): number {
  const t = Math.min(1, Math.max(0, depth01))
  const e = t * t * (3 - 2 * t)
  const near = height * 0.9
  const far = height * 0.17
  return near + (far - near) * e
}

export function canyonWallX(
  side: 'left' | 'right',
  depth01: number,
  width: number,
  relief = 0,
): number {
  const inset = canyonWallInset(depth01, width)
  if (side === 'left') return inset + relief
  return width - inset - relief
}

/** Relief toward the corridor center; nearer samples read larger. */
export function canyonRelief(amp01: number, depth01: number, width: number): number {
  const a = Math.min(1, Math.max(0, amp01))
  const near = width * 0.12
  const far = width * 0.03
  return a * (near + (far - near) * Math.min(1, Math.max(0, depth01)))
}

export function gleamRayCount(energy: number): number {
  return Math.max(3, Math.round(5 + Math.min(1, Math.max(0, energy)) * 16))
}

export function chromaticShift(drift: number, dpr: number): { r: number; g: number; b: number } {
  const mag = Math.min(1, Math.max(0, drift)) * 52 * dpr
  return { r: -mag, g: mag * 0.12, b: mag }
}

/** Range mountain grows with space: rest is mid-height, vast fills the frame. */
export function rangeLayout(height: number, space01 = 0): { base: number; amp: number; dir: -1 } {
  const fill = 0.46 + Math.min(1, Math.max(0, space01)) * 0.48
  return {
    base: height * 0.985,
    amp: height * fill,
    dir: -1,
  }
}

/** Dual-ridge mirror: bases on the edges; amp grows with space toward the middle. */
export function mirrorLayout(
  height: number,
  space01 = 0,
): {
  gap: number
  upperBase: number
  lowerBase: number
  amp: number
  upperDir: 1
  lowerDir: -1
} {
  const upperBase = height * 0.02
  const lowerBase = height * 0.98
  return {
    gap: lowerBase - upperBase,
    upperBase,
    lowerBase,
    amp: height * (0.22 + Math.min(1, Math.max(0, space01)) * 0.22),
    upperDir: 1,
    lowerDir: -1,
  }
}

export function canyonSliceCount(height: number): number {
  return Math.max(16, Math.min(42, Math.round(height / 24)))
}

/** Horizontal baseline for a depth slice. Depth 0 is the bottom edge; 1 is near the top. */
export function canyonSliceY(depth01: number, height: number): number {
  const t = Math.min(1, Math.max(0, depth01))
  return height * (0.98 - t * 0.86)
}

/**
 * Axis-aligned canyon: x follows the sample left-to-right, y is depth + amplitude.
 * No vanishing-point scale, so ridges stay parallel to the screen edges.
 */
export function canyonProject(
  x01: number,
  depth01: number,
  amp01: number,
  width: number,
  height: number,
): { x: number; y: number; floorY: number; scale: number } {
  const t = Math.min(1, Math.max(0, depth01))
  const x = Math.min(1, Math.max(0, x01)) * width
  const floorY = canyonSliceY(t, height)
  const lift = Math.min(1, Math.max(0, amp01)) * height * (0.2 - t * 0.08)
  return { x, y: floorY - lift, floorY, scale: 1 }
}
