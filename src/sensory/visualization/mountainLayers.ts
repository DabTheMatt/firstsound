export type MountainLayerSpec = {
  scale: number
  blur: number
  alpha: number
  drop: number
  /** 0 = near (full size), 1 = far (recedes on Z). */
  z: number
}

export type EchoGhostSpec = {
  /** Small time delay as a horizontal offset, 0…1 of width. */
  xOff: number
  alpha: number
  drop: number
}

export function mountainLayerSpecs(mass: number, motion: number, space = 0): readonly MountainLayerSpec[] {
  const m = Math.min(1, Math.max(0, mass))
  const s = Math.min(1, Math.max(0, space))
  const near = 1 - s
  const far = motion > 0.28 || s > 0.22
  const vast = s > 0.55
  const layers: MountainLayerSpec[] = [
    { scale: 1.02 + near * 0.38 + m * 0.1, blur: 1, alpha: 0.34 + near * 0.16, drop: 0, z: 0 },
    { scale: 0.72 + m * 0.08, blur: 7 + s * 8, alpha: 0.18, drop: 0.07 + s * 0.04, z: 0.22 + s * 0.08 },
    { scale: 0.46, blur: 16 + s * 12, alpha: 0.12 + s * 0.04, drop: 0.14 + s * 0.06, z: 0.4 + s * 0.1 },
    { scale: 0.28, blur: 26 + s * 14, alpha: 0.08 + s * 0.05, drop: 0.2 + s * 0.07, z: 0.58 + s * 0.1 },
  ]
  if (far) layers.push({ scale: 0.16, blur: 34 + s * 12, alpha: 0.05 + s * 0.05, drop: 0.26 + s * 0.08, z: 0.74 })
  if (vast) layers.push({ scale: 0.1, blur: 48, alpha: 0.045, drop: 0.34, z: 0.9 })
  return layers
}

/** Coarse shredded bands. Prefer `grainDustCount` for the stardust field. */
export function grainBandCount(grain: number): number {
  const g = Math.min(1, Math.max(0, grain))
  if (g < 0.04) return 1
  return Math.min(10, 2 + Math.round(g * 8))
}

/** Soft contour count for the topographic landscape. */
export function contourCount(space: number, grain = 0): number {
  const s = Math.min(1, Math.max(0, space))
  const g = Math.min(1, Math.max(0, grain))
  return Math.max(3, Math.round(4 + s * 4 + g * 2))
}

/** Sparse stardust, scaled to canvas width and grain amount. */
export function grainDustCount(grain: number, width = 1000): number {
  const g = Math.min(1, Math.max(0, grain))
  if (g < 0.04) return 0
  const cap = Math.min(80, Math.max(28, Math.round(width * 0.05)))
  return Math.round(24 + g * (cap - 24))
}

/** Delay ghosts: faint delayed copies of the same ridge, not a 3D explosion. */
export function echoGhostSpecs(echo: number): readonly EchoGhostSpec[] {
  const e = Math.min(1, Math.max(0, echo))
  if (e < 0.06) return []
  const n = Math.max(1, Math.round(1 + e * 2))
  const out: EchoGhostSpec[] = []
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 0.35)
    out.push({
      xOff: u * (0.012 + e * 0.02),
      alpha: Math.max(0.04, (0.22 - u * 0.08) * e),
      drop: u * 0.035,
    })
  }
  return out
}

/** Horizontal box blur of an absolute envelope. */
export function blurEnvelope(values: Float32Array, radius: number): Float32Array {
  const n = values.length
  const out = new Float32Array(n)
  const r = Math.max(0, Math.floor(radius))
  if (r === 0 || n === 0) {
    out.set(values)
    return out
  }
  for (let i = 0; i < n; i++) {
    const from = Math.max(0, i - r)
    const to = Math.min(n, i + r + 1)
    let acc = 0
    for (let k = from; k < to; k++) acc += Math.abs(values[k] ?? 0)
    out[i] = acc / (to - from)
  }
  return out
}

export function absEnvelope(min: Float32Array, max: Float32Array): Float32Array {
  const n = Math.min(min.length, max.length)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = Math.max(Math.abs(min[i] ?? 0), Math.abs(max[i] ?? 0))
  }
  return out
}

/** Scale an envelope so the loudest bin reaches 1. */
export function normalizeEnvelopePeak(values: Float32Array): Float32Array {
  let peak = 1e-6
  for (let i = 0; i < values.length; i++) peak = Math.max(peak, values[i]!)
  const out = new Float32Array(values.length)
  const g = 1 / peak
  for (let i = 0; i < values.length; i++) out[i] = (values[i] ?? 0) * g
  return out
}
