/** Identical window, FFT, and dB conversion for every spectrum tap. */

const SPECTRUM_DB_FLOOR = -100

/**
 * Analysis window: 2048 samples is ~46 ms at 44.1 kHz (~21.5 Hz bins).
 * Long enough for a 100 Hz partial to land on its own bin, short enough that a
 * click is not smeared across a 16k transform and pushed under the display floor.
 * The capture block is longer; overlapped windows of this size are peak-held.
 */
export const SPECTRUM_ANALYSIS_FFT = 2048
/** Hop of the analysis window inside one capture. Half a hop is the worst centering error. */
export const SPECTRUM_ANALYSIS_HOP = 512

/** Blackman window — same family AnalyserNode uses, applied to both taps. */
export function blackmanWindow(length: number): Float32Array {
  const n = Math.max(1, length)
  const out = new Float32Array(n)
  if (n === 1) {
    out[0] = 1
    return out
  }
  const denom = n - 1
  for (let i = 0; i < n; i++) {
    const p = (2 * Math.PI * i) / denom
    out[i] = 0.42 - 0.5 * Math.cos(p) + 0.08 * Math.cos(2 * p)
  }
  return out
}

export type SpectrumFftScratch = {
  window: Float32Array | null
  real: Float32Array | null
  imag: Float32Array | null
  frame?: Float32Array | null
  slice?: Float32Array | null
}

function ensure(scratch: SpectrumFftScratch, n: number): { real: Float32Array; imag: Float32Array; window: Float32Array } {
  if (!scratch.window || scratch.window.length !== n) scratch.window = blackmanWindow(n)
  if (!scratch.real || scratch.real.length !== n) scratch.real = new Float32Array(n)
  if (!scratch.imag || scratch.imag.length !== n) scratch.imag = new Float32Array(n)
  return { real: scratch.real, imag: scratch.imag, window: scratch.window }
}

function reverseBits(n: number, bits: number): number {
  let rev = 0
  for (let i = 0; i < bits; i++) rev = (rev << 1) | ((n >> i) & 1)
  return rev
}

/** In-place radix-2 FFT. `n` must be a power of two. */
function fftRadix2(real: Float32Array, imag: Float32Array, n: number): void {
  let bits = 0
  for (let size = n; size > 1; size >>= 1) bits++
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, bits)
    if (j > i) {
      const tr = real[i]!
      const ti = imag[i]!
      real[i] = real[j]!
      imag[i] = imag[j]!
      real[j] = tr
      imag[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const step = (-2 * Math.PI) / len
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
}

/**
 * Power-of-two time buffer → bin dB (DC at index 0).
 * Magnitude is normalized by the window sum so a full-scale sine reads near 0 dBFS.
 */
export function timeDomainToDb(
  time: ArrayLike<number>,
  out: Float32Array,
  scratch: SpectrumFftScratch,
  floorDb = SPECTRUM_DB_FLOOR,
): void {
  const n = time.length
  const bins = out.length
  if (n < 2 || bins < 1 || (n & (n - 1)) !== 0) {
    out.fill(floorDb)
    return
  }
  const { real, imag, window } = ensure(scratch, n)
  let windowSum = 0
  for (let i = 0; i < n; i++) {
    const w = window[i] ?? 0
    windowSum += w
    real[i] = (time[i] ?? 0) * w
    imag[i] = 0
  }
  fftRadix2(real, imag, n)
  const norm = windowSum > 1e-12 ? 2 / windowSum : 1
  const limit = Math.min(bins, n >> 1)
  for (let i = 0; i < limit; i++) {
    const mag = Math.hypot(real[i] ?? 0, imag[i] ?? 0) * norm
    const db = mag > 1e-10 ? 20 * Math.log10(mag) : floorDb
    out[i] = Math.max(floorDb, db)
  }
  for (let i = limit; i < bins; i++) out[i] = floorDb
}

export function binFrequencyHz(bin: number, fftSize: number, sampleRate: number): number {
  if (!(fftSize > 0) || !(sampleRate > 0)) return 0
  return (bin * sampleRate) / fftSize
}

/** Loudest non-DC bin. DC is excluded so a click's broadband shelf is not reported as 0 Hz. */
export function dominantBin(bins: ArrayLike<number>, floorDb = SPECTRUM_DB_FLOOR): number {
  let peak = 1
  let best = floorDb
  const n = bins.length
  for (let i = 1; i < n; i++) {
    const db = bins[i] ?? floorDb
    if (db > best) {
      best = db
      peak = i
    }
  }
  return peak
}

/**
 * Spectrum of one capture.
 * `out.length * 2` is the analysis FFT size (power of two). When `time` is longer,
 * every hop is transformed and each bin keeps its maximum. A short click then
 * survives even if one Blackman window placed it on an edge — the UI frame rate
 * does not have to land on the sample.
 * This is only the FFT of `time`. Filter curves, EQ gains, and band counts are not inputs.
 */
export function measureSpectrumDb(
  time: ArrayLike<number>,
  out: Float32Array,
  scratch: SpectrumFftScratch,
  hop = SPECTRUM_ANALYSIS_HOP,
): void {
  const fftSize = out.length * 2
  const n = time.length
  if (out.length < 2 || (fftSize & (fftSize - 1)) !== 0 || n < fftSize) {
    out.fill(SPECTRUM_DB_FLOOR)
    return
  }
  if (!scratch.frame || scratch.frame.length !== out.length) scratch.frame = new Float32Array(out.length)
  if (!scratch.slice || scratch.slice.length !== fftSize) scratch.slice = new Float32Array(fftSize)
  const frame = scratch.frame
  const slice = scratch.slice
  const step = Math.max(1, hop)
  let primed = false
  let last = -1
  const analyze = (from: number) => {
    for (let i = 0; i < fftSize; i++) slice[i] = time[from + i] ?? 0
    timeDomainToDb(slice, frame, scratch)
    if (!primed) {
      out.set(frame)
      primed = true
    } else {
      for (let i = 0; i < frame.length; i++) {
        const db = frame[i] ?? SPECTRUM_DB_FLOOR
        if (db > (out[i] ?? SPECTRUM_DB_FLOOR)) out[i] = db
      }
    }
    last = from
  }
  for (let start = 0; start + fftSize <= n; start += step) analyze(start)
  const end = n - fftSize
  if (end !== last && end >= 0) analyze(end)
}
