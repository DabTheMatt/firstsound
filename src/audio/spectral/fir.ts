/** Linear-phase windowed-sinc lowpass. DC gain is 1. Length is always odd. */

const BESSEL_TERMS = 24

function besselI0(x: number): number {
  let sum = 1
  let term = 1
  const half = x * 0.5
  for (let k = 1; k <= BESSEL_TERMS; k++) {
    term *= (half * half) / (k * k)
    sum += term
  }
  return sum
}

function kaiser(i: number, n: number, beta: number): number {
  const denom = (n - 1) * 0.5
  if (!(denom > 0)) return 1
  const r = (i - denom) / denom
  const inside = Math.max(0, 1 - r * r)
  return besselI0(beta * Math.sqrt(inside)) / besselI0(beta)
}

export function nextOdd(n: number): number {
  const t = Math.max(3, Math.round(n))
  return t % 2 === 0 ? t + 1 : t
}

/**
 * Shared FIR length for every crossover so each lowpass has the same group delay.
 * Sized from the lowest split, where a useful transition is the narrowest in Hz.
 */
export function sharedLowpassTaps(crossoversHz: readonly number[], sampleRate: number): number {
  const lowest = Math.max(30, Math.min(...crossoversHz.filter((hz) => hz > 0)))
  const transition = Math.max(24, lowest * 0.33)
  const df = transition / Math.max(1, sampleRate)
  const taps = Math.ceil(3.3 / Math.max(1e-6, df))
  return Math.min(8191, Math.max(127, nextOdd(taps)))
}

/** Symmetric FIR. Group delay is `(length - 1) / 2` samples. */
export function designLinearPhaseLowpass(cutoffHz: number, sampleRate: number, taps: number): Float32Array {
  const n = nextOdd(taps)
  const h = new Float32Array(n)
  const nyquist = Math.max(1, sampleRate * 0.5)
  const fc = Math.min(0.49, Math.max(1e-5, cutoffHz / nyquist) * 0.5)
  const mid = (n - 1) * 0.5
  const beta = 8
  let sum = 0
  for (let i = 0; i < n; i++) {
    const x = i - mid
    const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x)
    const w = kaiser(i, n, beta)
    const v = sinc * w
    h[i] = v
    sum += v
  }
  const norm = sum !== 0 ? 1 / sum : 1
  for (let i = 0; i < n; i++) h[i] = (h[i] ?? 0) * norm
  return h
}

function reverseBits(n: number, bits: number): number {
  let rev = 0
  for (let i = 0; i < bits; i++) rev = (rev << 1) | ((n >> i) & 1)
  return rev
}

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/** In-place radix-2 FFT. Inverse scales by `1 / n`. */
export function fftRadix2(real: Float64Array, imag: Float64Array, inverse: boolean): void {
  const n = real.length
  if (n < 2 || real.length !== imag.length || (n & (n - 1)) !== 0) return
  let bits = 0
  for (let size = n; size > 1; size >>= 1) bits++
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, bits)
    if (j <= i) continue
    const tr = real[i]!
    const ti = imag[i]!
    real[i] = real[j]!
    imag[i] = imag[j]!
    real[j] = tr
    imag[j] = ti
  }
  const sign = inverse ? 1 : -1
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const step = (sign * 2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const ang = step * k
        const wr = Math.cos(ang)
        const wi = Math.sin(ang)
        const jr = real[i + k + half]!
        const ji = imag[i + k + half]!
        const tr = wr * jr - wi * ji
        const ti = wr * ji + wi * jr
        const ur = real[i + k]!
        const ui = imag[i + k]!
        real[i + k] = ur + tr
        imag[i + k] = ui + ti
        real[i + k + half] = ur - tr
        imag[i + k + half] = ui - ti
      }
    }
  }
  if (!inverse) return
  const scale = 1 / n
  for (let i = 0; i < n; i++) {
    real[i] = (real[i] ?? 0) * scale
    imag[i] = (imag[i] ?? 0) * scale
  }
}

function convolveDirect(signal: Float32Array, kernel: Float32Array, delay: number): Float32Array {
  const n = signal.length
  const k = kernel.length
  const acc = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const s = signal[i] ?? 0
    if (s === 0) continue
    const from = Math.max(0, delay - i)
    const to = Math.min(k, n + delay - i)
    for (let t = from; t < to; t++) acc[i + t - delay] += s * (kernel[t] ?? 0)
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = acc[i] ?? 0
  return out
}

function convolveFft(signal: Float32Array, kernel: Float32Array, delay: number): Float32Array {
  const n = signal.length
  const k = kernel.length
  let size = nextPow2(Math.max(k + 1, 2048))
  while (size < k) size <<= 1
  const hop = size - k + 1
  const kernelReal = new Float64Array(size)
  const kernelImag = new Float64Array(size)
  for (let i = 0; i < k; i++) kernelReal[i] = kernel[i] ?? 0
  fftRadix2(kernelReal, kernelImag, false)
  const full = new Float64Array(n + k)
  const blockReal = new Float64Array(size)
  const blockImag = new Float64Array(size)
  for (let start = 0; start < n; start += hop) {
    blockReal.fill(0)
    blockImag.fill(0)
    const count = Math.min(hop, n - start)
    for (let i = 0; i < count; i++) blockReal[i] = signal[start + i] ?? 0
    fftRadix2(blockReal, blockImag, false)
    for (let i = 0; i < size; i++) {
      const xr = blockReal[i] ?? 0
      const xi = blockImag[i] ?? 0
      const hr = kernelReal[i] ?? 0
      const hi = kernelImag[i] ?? 0
      blockReal[i] = xr * hr - xi * hi
      blockImag[i] = xr * hi + xi * hr
    }
    fftRadix2(blockReal, blockImag, true)
    const limit = Math.min(size, full.length - start)
    for (let i = 0; i < limit; i++) full[start + i] = (full[start + i] ?? 0) + (blockReal[i] ?? 0)
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = full[i + delay] ?? 0
  return out
}

/** Linear convolution, then drop the shared group delay so the result lines up with the input. */
export function convolveAligned(
  signal: Float32Array,
  kernel: Float32Array,
  delay = (kernel.length - 1) >> 1,
  forceFft = false,
): Float32Array {
  if (signal.length === 0 || kernel.length === 0) return new Float32Array(signal.length)
  const products = signal.length * kernel.length
  if (!forceFft && products <= 750_000) return convolveDirect(signal, kernel, delay)
  return convolveFft(signal, kernel, delay)
}
