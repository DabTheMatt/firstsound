export type SensorySceneId = 'range' | 'mirror' | 'canyon' | 'gleam'

export function canyonWallInset(depth01: number, width: number): number {
  const t = Math.min(1, Math.max(0, depth01))
  return width * (0.06 + t * t * 0.34)
}

export function gleamRayCount(energy: number): number {
  return Math.max(3, Math.round(5 + Math.min(1, Math.max(0, energy)) * 16))
}

export function chromaticShift(drift: number, dpr: number): { r: number; g: number; b: number } {
  const mag = Math.min(1, Math.max(0, drift)) * 52 * dpr
  return { r: -mag, g: mag * 0.12, b: mag }
}
