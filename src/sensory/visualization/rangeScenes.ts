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

/** Range mountain sits on the bottom edge and reaches the top of the frame. */
export function rangeLayout(height: number): { base: number; amp: number; dir: -1 } {
  return {
    base: height * 0.985,
    amp: height * 0.94,
    dir: -1,
  }
}

/** Dual-ridge mirror: bases on the top and bottom edges, peaks toward the middle. */
export function mirrorLayout(height: number): {
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
    amp: height * 0.44,
    upperDir: 1,
    lowerDir: -1,
  }
}

export function canyonSliceCount(height: number): number {
  return Math.max(16, Math.min(42, Math.round(height / 24)))
}

/** Perspective map: depth 0 is the near edge of the screen, 1 is the vanishing point. */
export function canyonProject(
  x01: number,
  depth01: number,
  amp01: number,
  width: number,
  height: number,
): { x: number; y: number; floorY: number; scale: number } {
  const t = Math.min(1, Math.max(0, depth01))
  const ease = t * t * (3 - 2 * t)
  const vanishX = width * 0.5
  const vanishY = height * 0.05
  const nearY = height * 0.99
  const scale = 1 - ease * 0.9
  const floorY = nearY + (vanishY - nearY) * ease
  const x = vanishX + (Math.min(1, Math.max(0, x01)) - 0.5) * width * scale
  const lift = Math.min(1, Math.max(0, amp01)) * (floorY - vanishY) * 0.92
  return { x, y: floorY - lift, floorY, scale }
}
