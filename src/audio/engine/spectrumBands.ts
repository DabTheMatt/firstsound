/** Log-spaced FFT bands + dual envelope followers for the spectrum view. */

export const SPECTRUM_BAND_COUNT = 32

export const FAST_ATTACK = 0.55
export const FAST_RELEASE = 0.28
export const SLOW_ATTACK = 0.07
export const SLOW_RELEASE = 0.045

export function logBandEdgesHz(minHz: number, maxHz: number, bandCount = SPECTRUM_BAND_COUNT): Float32Array {
  const n = Math.max(1, bandCount)
  const lo = Math.max(1, minHz)
  const hi = Math.max(lo * 1.01, maxHz)
  const edges = new Float32Array(n + 1)
  const ratio = hi / lo
  for (let i = 0; i <= n; i++) {
    edges[i] = lo * ratio ** (i / n)
  }
  return edges
}

/** Peak dB in each log band. `binsDb` is AnalyserNode.getFloatFrequencyData. */
export function bandPeakDb(
  binsDb: ArrayLike<number>,
  sampleRate: number,
  bandCount = SPECTRUM_BAND_COUNT,
  minHz = 20,
): Float32Array {
  const n = binsDb.length
  const out = new Float32Array(bandCount)
  out.fill(-100)
  if (n < 2 || !(sampleRate > 0)) return out
  const fftSize = n * 2
  const nyquist = sampleRate / 2
  const edges = logBandEdgesHz(minHz, nyquist, bandCount)
  for (let b = 0; b < bandCount; b++) {
    const loHz = edges[b] ?? minHz
    const hiHz = edges[b + 1] ?? nyquist
    const i0 = Math.max(1, Math.floor((loHz * fftSize) / sampleRate))
    const i1 = Math.min(n - 1, Math.ceil((hiHz * fftSize) / sampleRate))
    let peak = -100
    for (let i = i0; i <= i1; i++) {
      const db = binsDb[i] ?? -100
      if (db > peak) peak = db
    }
    out[b] = peak
  }
  return out
}

export function followEnvelope(prev: number, target: number, attack: number, release: number): number {
  const coef = target > prev ? attack : release
  return prev + (target - prev) * coef
}

export function followBands(
  prev: Float32Array,
  target: ArrayLike<number>,
  attack: number,
  release: number,
): void {
  const n = Math.min(prev.length, target.length)
  for (let i = 0; i < n; i++) {
    prev[i] = followEnvelope(prev[i] ?? -100, target[i] ?? -100, attack, release)
  }
}
