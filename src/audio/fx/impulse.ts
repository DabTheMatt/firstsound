import type { ReverbType } from './types'

export type ImpulseSpec = {
  type: ReverbType
  sampleRate: number
  decaySec: number
  size: number
  diffusion: number
  density: number
  early: number
  damping: number
  reverse: number
  shimmer: number
  shimmerPitch: number
  color: number
  freeze: boolean
}

const MAX_IR_SEC = 8

export function impulseLengthSec(spec: ImpulseSpec): number {
  if (spec.freeze || spec.type === 'infinite') return Math.min(MAX_IR_SEC, 6)
  const sizeMul = 0.45 + spec.size * 1.8
  let seconds = spec.decaySec * sizeMul
  if (spec.type === 'ambience' || spec.type === 'room') seconds *= 0.55
  if (spec.type === 'gated') seconds = Math.min(seconds, 0.55 + spec.size * 0.5)
  if (spec.type === 'spring') seconds *= 0.7
  if (spec.type === 'cloud') seconds *= 1.15
  if (spec.type === 'cathedral' || spec.type === 'largeHall') seconds *= 1.25
  return Math.min(MAX_IR_SEC, Math.max(0.08, seconds))
}

/** Fill stereo IR buffers. Not a physical room model — character first. */
export function fillReverbImpulse(
  left: Float32Array,
  right: Float32Array,
  spec: ImpulseSpec,
): void {
  const n = Math.min(left.length, right.length)
  if (n === 0) return
  const lenSec = n / spec.sampleRate
  const reverseAmt = spec.type === 'reverse' ? 1 : spec.reverse
  const gated = spec.type === 'gated'
  const nonlinear = spec.type === 'nonlinear'
  const spring = spec.type === 'spring'
  const plate = spec.type === 'plate'
  const cloud = spec.type === 'cloud' || spec.type === 'infinite'
  const shimmer = spec.type === 'shimmer' ? Math.max(spec.shimmer, 0.45) : spec.shimmer
  const color = spec.color
  const bright = (1 + color) * 0.5
  const density = 0.25 + spec.density * 0.75
  const diffusion = spec.diffusion
  const earlyAmt = spec.early
  const exp = 1.2 + (1 - Math.min(1, spec.decaySec / 12)) * 2.4

  for (let i = 0; i < n; i++) {
    left[i] = 0
    right[i] = 0
  }

  const earlyCount = 4 + Math.floor(earlyAmt * 10)
  for (let k = 0; k < earlyCount; k++) {
    const t = (0.004 + k * (0.006 + spec.size * 0.012) + hash(k + 3) * 0.008) * spec.sampleRate
    const idx = Math.min(n - 1, Math.floor(t))
    const g = (0.35 + hash(k + 11) * 0.4) * earlyAmt * (1 - k / (earlyCount + 1))
    const side = hash(k + 21) > 0.5 ? 1 : -1
    left[idx] += g * (side > 0 ? 1 : 0.35)
    right[idx] += g * (side < 0 ? 1 : 0.35)
  }

  const step = Math.max(1, Math.floor((1.2 - density) * 6))
  for (let i = 0; i < n; i += step) {
    const t = i / n
    let env = (1 - t) ** exp
    if (gated) env = t < 0.22 + spec.size * 0.15 ? env : env * Math.max(0, 1 - (t - 0.22) * 28)
    if (nonlinear) env = t < 0.45 ? t ** 0.7 : Math.max(0, 1 - (t - 0.45) * 8) ** 2
    if (reverseAmt > 0.01) env = env * (1 - reverseAmt) + t ** 0.85 * reverseAmt
    if (cloud) env *= 0.75 + diffusion * 0.4
    const noiseL = (hash(i * 2 + 1) * 2 - 1) * env
    const noiseR = (hash(i * 2 + 17) * 2 - 1) * env
    const decor = 0.15 + diffusion * 0.7
    let l = noiseL
    let r = noiseL * (1 - decor) + noiseR * decor
    if (plate) {
      const comb = Math.sin(i * (0.11 + spec.size * 0.04)) * env * 0.22
      l += comb
      r -= comb * 0.85
    }
    if (spring) {
      const chirp = Math.sin(i * 0.031 * (1 + t * 4)) * env * 0.38
      const chirp2 = Math.sin(i * 0.057) * env * 0.18
      l += chirp + chirp2
      r += chirp * 0.4 - chirp2
    }
    const tilt = 1 - t * (0.25 + (1 - bright) * 0.7) * (0.4 + spec.damping)
    l *= tilt
    r *= tilt
    left[i] += l
    right[i] += r
  }

  if (shimmer > 0.01) {
    const ratio = 2 ** (spec.shimmerPitch / 12)
    const stepSh = Math.max(1, Math.round(ratio))
    for (let i = 0; i < n; i++) {
      const src = Math.floor(i * ratio)
      if (src >= n) break
      const g = shimmer * 0.45 * (1 - i / n)
      const hipass = i / n
      left[i] += (left[src] ?? 0) * g * (0.4 + hipass)
      right[i] += (right[Math.min(n - 1, src + stepSh)] ?? 0) * g * (0.4 + hipass)
    }
  }

  if (spec.freeze || spec.type === 'infinite') {
    const tail = Math.floor(n * 0.35)
    for (let i = n - tail; i < n; i++) {
      const hold = 0.55 + ((i - (n - tail)) / tail) * 0.2
      left[i] *= 0.3
      right[i] *= 0.3
      left[i] += (hash(i + 99) * 2 - 1) * hold * 0.08
      right[i] += (hash(i + 77) * 2 - 1) * hold * 0.08
    }
  }

  let peak = 1e-6
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!))
  }
  const norm = 0.72 / peak
  for (let i = 0; i < n; i++) {
    left[i]! *= norm
    right[i]! *= norm
  }

  void lenSec
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
