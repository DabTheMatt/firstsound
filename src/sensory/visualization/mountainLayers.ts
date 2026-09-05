export type MountainLayerSpec = {
  scale: number
  blur: number
  alpha: number
  drop: number
}

export function mountainLayerSpecs(mass: number, motion: number, space = 0): readonly MountainLayerSpec[] {
  const m = Math.min(1, Math.max(0, mass))
  const far = motion > 0.28 || space > 0.22
  const vast = space > 0.55
  const layers: MountainLayerSpec[] = [
    { scale: 0.9 + m * 0.14, blur: 1, alpha: 0.28, drop: 0 },
    { scale: 0.68 + m * 0.08, blur: 7 + space * 6, alpha: 0.18, drop: 0.07 },
    { scale: 0.46, blur: 16 + space * 10, alpha: 0.12 + space * 0.04, drop: 0.14 + space * 0.04 },
    { scale: 0.28, blur: 26 + space * 12, alpha: 0.08 + space * 0.05, drop: 0.2 + space * 0.05 },
  ]
  if (far) layers.push({ scale: 0.18, blur: 34 + space * 10, alpha: 0.05 + space * 0.04, drop: 0.26 + space * 0.06 })
  if (vast) layers.push({ scale: 0.12, blur: 44, alpha: 0.04, drop: 0.32 })
  return layers
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
