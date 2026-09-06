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

const MAX_IR_SEC = 6

export function impulseLengthSec(spec: ImpulseSpec): number {
  if (spec.freeze || spec.type === 'infinite') return Math.min(MAX_IR_SEC, 8)
  const sizeMul = 0.55 + spec.size * 2.2
  let seconds = spec.decaySec * sizeMul
  if (spec.type === 'ambience' || spec.type === 'room') seconds *= 0.5
  if (spec.type === 'gated') seconds = Math.min(seconds, 0.55 + spec.size * 0.5)
  if (spec.type === 'spring') seconds *= 0.7
  if (spec.type === 'cloud' || spec.type === 'bloom') seconds *= 1.12
  if (spec.type === 'cathedral' || spec.type === 'largeHall') seconds *= 1.12
  if (spec.type === 'shimmer') seconds *= 1.08
  return Math.min(MAX_IR_SEC, Math.max(0.08, seconds))
}

export function typeStereoSpread(type: ReverbType): number {
  switch (type) {
    case 'room':
    case 'ambience':
      return 0.42
    case 'chamber':
      return 0.55
    case 'plate':
      return 0.64
    case 'spring':
      return 0.36
    case 'hall':
      return 0.8
    case 'largeHall':
    case 'cathedral':
    case 'cloud':
    case 'bloom':
    case 'shimmer':
    case 'infinite':
      return 0.94
    case 'reverse':
    case 'nonlinear':
      return 0.72
    case 'gated':
      return 0.5
  }
}

/** Fill stereo IR buffers. Character first: wide halls, tight rooms, bloom tails. */
export function fillReverbImpulse(
  left: Float32Array,
  right: Float32Array,
  spec: ImpulseSpec,
): void {
  const n = Math.min(left.length, right.length)
  if (n === 0) return
  const reverseAmt = spec.type === 'reverse' ? 1 : spec.reverse
  const gated = spec.type === 'gated'
  const nonlinear = spec.type === 'nonlinear'
  const spring = spec.type === 'spring'
  const plate = spec.type === 'plate'
  const bloom = spec.type === 'bloom'
  const cloud = spec.type === 'cloud' || spec.type === 'infinite' || bloom
  const shimmer = spec.type === 'shimmer' ? Math.max(spec.shimmer, 0.45) : spec.shimmer
  const bright = (1 + spec.color) * 0.5
  const density = 0.28 + spec.density * 0.72
  const diffusion = spec.diffusion
  const earlyAmt = spec.early
  const exp = 1.05 + (1 - Math.min(1, spec.decaySec / 14)) * 2.1
  const spread = typeStereoSpread(spec.type) * (0.4 + diffusion * 0.6)

  for (let i = 0; i < n; i++) {
    left[i] = 0
    right[i] = 0
  }

  const earlyCount = 6 + Math.floor(earlyAmt * 14)
  for (let k = 0; k < earlyCount; k++) {
    const t = (0.003 + k * (0.005 + spec.size * 0.016) + hash(k + 3) * 0.01) * spec.sampleRate
    const idx = Math.min(n - 1, Math.floor(t))
    const g = (0.78 + hash(k + 11) * 0.48) * Math.max(0.45, earlyAmt) * (1 - k / (earlyCount + 1))
    const leftLead = hash(k + 21) > 0.5
    const near = 0.1 + (1 - spread) * 0.35
    left[idx]! += g * (leftLead ? 1 : near)
    right[idx]! += g * (leftLead ? near : 1)
    const echo = Math.min(n - 1, idx + Math.floor((0.0012 + spec.size * 0.004) * spec.sampleRate))
    left[echo]! += g * (leftLead ? 0.18 : 0.55) * spread
    right[echo]! += g * (leftLead ? 0.55 : 0.18) * spread
  }

  const step = Math.max(1, Math.floor((1.02 - density) * 8))
  const noiseAmt = (0.14 + density * 0.2) * (cloud ? 0.85 : 0.62)
  for (let i = 0; i < n; i += step) {
    const t = i / n
    let env = (1 - t) ** exp
    if (gated) env = t < 0.22 + spec.size * 0.15 ? env : env * Math.max(0, 1 - (t - 0.22) * 28)
    if (nonlinear) env = t < 0.45 ? t ** 0.7 : Math.max(0, 1 - (t - 0.45) * 8) ** 2
    if (bloom) {
      const rise = Math.min(1, t / (0.18 + spec.size * 0.22))
      env = rise ** 1.35 * (1 - t) ** (exp * 0.75)
    }
    if (reverseAmt > 0.01) env = env * (1 - reverseAmt) + t ** 0.85 * reverseAmt
    if (cloud) env *= 0.82 + diffusion * 0.38
    const noiseL = (hash(i * 2 + 1) * 2 - 1) * env * noiseAmt
    const noiseR = (hash(i * 2 + 17) * 2 - 1) * env * noiseAmt
    const noiseR2 = (hash(i * 2 + 41) * 2 - 1) * env * noiseAmt
    let l = noiseL
    let r = noiseL * (1 - spread) + (noiseR * 0.55 + noiseR2 * 0.45) * spread
    if (plate) {
      const comb = Math.sin(i * (0.11 + spec.size * 0.04)) * env * 0.22
      l += comb
      r -= comb * 0.9
    }
    if (spring) {
      const chirp = Math.sin(i * 0.031 * (1 + t * 4)) * env * 0.38
      const chirp2 = Math.sin(i * 0.057) * env * 0.18
      l += chirp + chirp2
      r += chirp * 0.35 - chirp2
    }
    if (spec.type === 'hall' || spec.type === 'largeHall' || spec.type === 'cathedral') {
      const wall = Math.sin(i * (0.007 + spec.size * 0.003) + kPhase(i)) * env * 0.12
      l += wall
      r -= wall * 0.92
    }
    const tilt = 1 - t * (0.22 + (1 - bright) * 0.72) * (0.35 + spec.damping)
    l *= tilt
    r *= tilt
    left[i]! += l
    right[i]! += r
  }

  const haas = Math.floor((0.0007 + spec.size * 0.0038) * spec.sampleRate * spread)
  if (haas > 1 && haas < n / 8) {
    const shifted = new Float32Array(n)
    shifted.set(right.subarray(0, n - haas), haas)
    for (let i = 0; i < n; i++) {
      right[i] = right[i]! * (1 - spread * 0.55) + shifted[i]! * spread * 0.55
    }
  }

  if (shimmer > 0.01) {
    const ratio = 2 ** (spec.shimmerPitch / 12)
    const stepSh = Math.max(1, Math.round(Math.abs(ratio)))
    for (let i = 0; i < n; i++) {
      const src = Math.floor(i * ratio)
      if (src < 0 || src >= n) continue
      const g = shimmer * 0.16 * (1 - i / n)
      const hipass = i / n
      left[i]! += (left[src] ?? 0) * g * (0.4 + hipass)
      right[i]! += (right[Math.min(n - 1, src + stepSh)] ?? 0) * g * (0.4 + hipass)
    }
  }

  if (spec.freeze || spec.type === 'infinite') {
    const tail = Math.floor(n * 0.4)
    for (let i = n - tail; i < n; i++) {
      const hold = 0.6 + ((i - (n - tail)) / tail) * 0.22
      left[i]! *= 0.28
      right[i]! *= 0.28
      left[i]! += (hash(i + 99) * 2 - 1) * hold * 0.1
      right[i]! += (hash(i + 77) * 2 - 1) * hold * 0.1
    }
  }

  scaleReverbImpulse(left, right, spec.sampleRate)
}

/** First 80 ms of the IR — the part Mix has to make audible against dry. */
export const IR_EARLY_SEC = 0.08
export const IR_TARGET_EARLY_RMS = 0.042
export const IR_PEAK_LIMIT = 0.38
export const IR_STACK_REF_SEC = 0.4
export const IR_STACK_K = 0.48

/** Longer IRs keep more overlapping grains in the sum — trim so tails do not climb. */
export function irStackTrim(durationSec: number): number {
  return 1 / Math.sqrt(1 + Math.max(0, durationSec - IR_STACK_REF_SEC) * IR_STACK_K)
}

/**
 * ConvolverNode.normalize uses Chrome's 0.00125 GainCalibration, which turns a
 * peak-normalized hall into ~-36 dB wet. We scale ourselves and keep
 * normalize = false. Match early-window RMS so long cathedrals stay as loud as
 * short rooms, then peak-limit so Mix cannot clip the dry path.
 */
export function scaleReverbImpulse(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): void {
  const n = Math.min(left.length, right.length)
  if (n === 0) return
  const earlyN = Math.min(n, Math.max(1, Math.floor(sampleRate * IR_EARLY_SEC)))
  let energy = 0
  let peak = 1e-6
  for (let i = 0; i < n; i++) {
    const l = left[i]!
    const r = right[i]!
    peak = Math.max(peak, Math.abs(l), Math.abs(r))
    if (i < earlyN) energy += l * l + r * r
  }
  const earlyRms = Math.sqrt(energy / (2 * earlyN))
  const rmsGain = IR_TARGET_EARLY_RMS / Math.max(earlyRms, 1e-8)
  const peakGain = IR_PEAK_LIMIT / peak
  const stack = irStackTrim(n / sampleRate)
  const gain = Math.min(rmsGain, peakGain) * stack
  for (let i = 0; i < n; i++) {
    left[i]! *= gain
    right[i]! *= gain
  }
}

function kPhase(i: number): number {
  return hash(i + 200) * Math.PI * 2
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
