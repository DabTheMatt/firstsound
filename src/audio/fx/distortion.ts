import { equalPowerDryWet } from './dryWet'
import type { DistortionNoiseKind, DistortionType } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function tanhShape(x: number, k: number): number {
  if (k <= 1.001) return x
  return Math.tanh(k * x) / k
}

export function shapeSample(
  x: number,
  type: DistortionType,
  drive01: number,
  bias01: number,
): number {
  const drive = clamp(drive01, 0, 1)
  const bias = (clamp(bias01, 0, 1) - 0.5) * 0.55
  const s = clamp(x + bias, -4, 4)
  const k = 1 + drive * 12
  switch (type) {
    case 'saturation':
      return tanhShape(s, k)
    case 'overdrive': {
      const g = 1 + drive * 18
      return Math.atan(s * g) / Math.atan(g)
    }
    case 'tube': {
      const pos = s >= 0
      const kp = pos ? 1 + drive * 18 : 1 + drive * 5
      return tanhShape(s, kp)
    }
    case 'analog': {
      const g = 1 + drive * 14
      const y = s / (1 + Math.abs(s) * g)
      return y * (1 + 0.12 * s)
    }
    case 'tape': {
      const soft = tanhShape(s, 1 + drive * 7)
      return soft * (1 - 0.08 * drive) + s * s * s * -0.04 * drive
    }
    case 'digital':
    case 'clip': {
      const g = 1 + drive * 24
      return clamp(s * g, -1, 1)
    }
    case 'fuzz': {
      const g = 1 + drive * 30
      const y = Math.sign(s) * Math.pow(Math.min(1, Math.abs(s) * g), 0.35)
      return clamp(y * 1.15, -1, 1)
    }
    case 'fold': {
      const g = 1 + drive * 8
      const folded = Math.sin(s * g * Math.PI * 0.5)
      return folded
    }
    case 'bitcrush':
    case 'downsample':
      return tanhShape(s, 1 + drive * 4)
    case 'noise':
      return s
    case 'vinyl':
      return tanhShape(s, 1 + drive * 6)
  }
}

export function makeDistortionCurve(
  type: DistortionType,
  drive01: number,
  bias01: number,
): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const drive = clamp(drive01, 0, 1)
  const analog =
    type !== 'noise' &&
    type !== 'bitcrush' &&
    type !== 'downsample' &&
    type !== 'vinyl'
  if (analog && drive <= 0.001) {
    for (let i = 0; i < n; i++) curve[i] = (i / (n - 1)) * 2 - 1
    return curve
  }
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = clamp(shapeSample(x, type, drive, bias01), -1, 1)
  }
  return curve
}

/** Waveshaper for the saturation module. Small-signal gain stays near unity. */
export function makeTanhCurve(amount01: number): Float32Array<ArrayBuffer> {
  return makeDistortionCurve('saturation', amount01, 0.5)
}

export function bitReduceSample(x: number, bits: number): number {
  const b = clamp(bits, 1, 16)
  if (b >= 15.95) return x
  const levels = 2 ** (b - 1)
  return Math.round(x * levels) / levels
}

export function distortionNeedsLoFi(type: DistortionType, bits: number, hold: number, noisePct: number): boolean {
  if (type === 'bitcrush' || type === 'downsample' || type === 'noise' || type === 'vinyl') return true
  return bits < 15.5 || hold > 1.05 || noisePct > 0.4
}

export function distortionIsActive(
  type: DistortionType,
  drivePct: number,
  bits: number,
  hold: number,
  noisePct: number,
): boolean {
  if (distortionNeedsLoFi(type, bits, hold, noisePct) && (noisePct > 0.4 || bits < 15.5 || hold > 1.05)) {
    return true
  }
  if (type === 'noise' || type === 'vinyl') return noisePct > 0.4 || drivePct > 0.05
  return drivePct > 0.05
}

/** Drive off is fully dry unless lo-fi / noise is running. Mix is equal-power. */
export function distortionDryWet(
  type: DistortionType,
  drivePct: number,
  mixPct: number,
  bits: number,
  hold: number,
  noisePct: number,
): { dry: number; wet: number } {
  if (!distortionIsActive(type, drivePct, bits, hold, noisePct)) return { dry: 1, wet: 0 }
  return equalPowerDryWet(mixPct / 100)
}

/** Drive off is fully dry. Mix is equal-power when the shaper is running. */
export function saturationDryWet(drivePct: number, mixPct: number): { dry: number; wet: number } {
  return distortionDryWet('saturation', drivePct, mixPct, 16, 1, 0)
}

export type DistortionProcState = {
  bits: number
  hold: number
  count: number
  heldL: number
  heldR: number
  noise: number
  noiseKind: DistortionNoiseKind
  seed: number
  pinkB0: number
  pinkB1: number
  pinkB2: number
  brown: number
}

export function defaultDistortionProcState(): DistortionProcState {
  return {
    bits: 16,
    hold: 1,
    count: 0,
    heldL: 0,
    heldR: 0,
    noise: 0,
    noiseKind: 'white',
    seed: 1,
    pinkB0: 0,
    pinkB1: 0,
    pinkB2: 0,
    brown: 0,
  }
}

function nextWhite(state: DistortionProcState): number {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0
  return (state.seed / 0xffffffff) * 2 - 1
}

function nextNoise(state: DistortionProcState): number {
  const white = nextWhite(state)
  if (state.noiseKind === 'white') return white * 0.22
  if (state.noiseKind === 'brown') {
    state.brown = clamp(state.brown + white * 0.02, -1, 1)
    return state.brown * 0.35
  }
  state.pinkB0 = 0.99765 * state.pinkB0 + white * 0.099046
  state.pinkB1 = 0.963 * state.pinkB1 + white * 0.2965164
  state.pinkB2 = 0.57 * state.pinkB2 + white * 1.052691
  return (state.pinkB0 + state.pinkB1 + state.pinkB2 + white * 0.1848) * 0.05
}

export function processDistortionBuffer(
  inputL: Float32Array,
  inputR: Float32Array,
  outputL: Float32Array,
  outputR: Float32Array,
  state: DistortionProcState,
): void {
  const n = Math.min(inputL.length, outputL.length)
  const hold = Math.max(1, Math.round(state.hold))
  const crush = state.bits < 15.95
  const noisy = state.noise > 0.0004
  if (!crush && hold <= 1 && !noisy) {
    outputL.set(inputL.subarray(0, n))
    outputR.set(inputR.subarray(0, Math.min(n, inputR.length)))
    return
  }
  for (let i = 0; i < n; i++) {
    if (state.count === 0) {
      const l = inputL[i] ?? 0
      const r = inputR[i] ?? l
      state.heldL = crush ? bitReduceSample(l, state.bits) : l
      state.heldR = crush ? bitReduceSample(r, state.bits) : r
    }
    state.count += 1
    if (state.count >= hold) state.count = 0
    let l = state.heldL
    let r = state.heldR
    if (noisy) {
      l += nextNoise(state) * state.noise
      r += nextNoise(state) * state.noise
    }
    outputL[i] = clamp(l, -1, 1)
    outputR[i] = clamp(r, -1, 1)
  }
}

export function toneToFilters(tonePct: number): { hp: number; lp: number } {
  const t = clamp(tonePct, 0, 100) / 100
  return {
    hp: 18 + (1 - t) * (1 - t) * 420,
    lp: 900 + t ** 1.35 * 17200,
  }
}
