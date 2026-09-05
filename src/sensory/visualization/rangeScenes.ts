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

/** Dual-ridge mirror: peaks hang into the gap toward each other, with air left. */
export function mirrorLayout(height: number): {
  gap: number
  upperBase: number
  lowerBase: number
  amp: number
  upperDir: 1
  lowerDir: -1
} {
  const upperBase = height * 0.22
  const lowerBase = height * 0.78
  return {
    gap: lowerBase - upperBase,
    upperBase,
    lowerBase,
    amp: height * 0.2,
    upperDir: 1,
    lowerDir: -1,
  }
}
