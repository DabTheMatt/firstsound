/** Log-spaced FFT bands + dual envelope followers for the spectrum view. */

export const SPECTRUM_FOLLOW_MODES = ['peak', 'slow', 'both'] as const

export type SpectrumFollowMode = (typeof SPECTRUM_FOLLOW_MODES)[number]

export function clampSpectrumFollowMode(value: unknown): SpectrumFollowMode {
  return value === 'slow' || value === 'both' || value === 'peak' ? value : 'peak'
}

/**
 * Visual fall speed of the spectrum bars and envelope.
 * Separate from Follow, which chooses peak / slow / both traces.
 */
export const SPECTRUM_FALL_MODES = ['slow', 'normal', 'fast'] as const

export type SpectrumFallMode = (typeof SPECTRUM_FALL_MODES)[number]

export function clampSpectrumFallMode(value: unknown): SpectrumFallMode {
  return value === 'slow' || value === 'fast' || value === 'normal' ? value : 'normal'
}

export type SpectrumFallRates = {
  /** Per-second rise toward a louder bin. */
  attack: number
  /** Per-second fall toward silence. */
  release: number
}

export type SpectrumFallBallistics = {
  peak: SpectrumFallRates
  slow: SpectrumFallRates
}

/**
 * Time constants for the two visual followers.
 * Peak and slow stay in one family so Follow does not invent a second decay clock.
 * Release times (about 90%): fast ~0.2s, normal ~1s, slow ~5s.
 */
export function spectrumFallBallistics(mode: SpectrumFallMode): SpectrumFallBallistics {
  if (mode === 'fast') {
    return {
      peak: { attack: 30, release: 11 },
      slow: { attack: 8, release: 2.8 },
    }
  }
  if (mode === 'slow') {
    return {
      peak: { attack: 4, release: 0.4 },
      slow: { attack: 1.5, release: 0.16 },
    }
  }
  return {
    peak: { attack: 12, release: 2.2 },
    slow: { attack: 3.5, release: 0.7 },
  }
}

/** One animation step from a per-second rate. Clamped so a stalled frame cannot snap. */
export function envelopeStep(ratePerSec: number, dtSec: number): number {
  const dt = Math.min(0.05, Math.max(0, dtSec))
  if (!(ratePerSec > 0) || dt === 0) return 0
  return 1 - Math.exp(-ratePerSec * dt)
}

/**
 * Bars and the spectrum line share one Follow mode and one fall clock.
 * `both` shows the pair. The line follows each FFT bin; bars stay log bands.
 * Drawing resamples those bins onto the plot; it does not trace bar geometry.
 */
export function spectrumDisplayUses(follow: SpectrumFollowMode): {
  barBody: 'peak' | 'slow'
  barCap: 'peak' | 'slow'
  lines: Array<'peak' | 'slow'>
} {
  if (follow === 'slow') return { barBody: 'slow', barCap: 'slow', lines: ['slow'] }
  if (follow === 'both') return { barBody: 'slow', barCap: 'peak', lines: ['peak', 'slow'] }
  return { barBody: 'peak', barCap: 'peak', lines: ['peak'] }
}

export const SPECTRUM_BAND_CHOICES = [8, 16, 24, 32, 48, 64, 96, 128, 256, 512, 1024] as const

export type SpectrumBandCount = (typeof SPECTRUM_BAND_CHOICES)[number]

export const SPECTRUM_BAND_COUNT: SpectrumBandCount = 32

export function clampSpectrumBandCount(value: number): SpectrumBandCount {
  const allowed = SPECTRUM_BAND_CHOICES
  let best: SpectrumBandCount = 32
  let dist = Infinity
  for (const n of allowed) {
    const d = Math.abs(n - value)
    if (d < dist) {
      dist = d
      best = n
    }
  }
  return best
}

export const FAST_ATTACK = 0.55
export const FAST_RELEASE = 0.28
export const SLOW_ATTACK = 0.07
export const SLOW_RELEASE = 0.045

export const SPECTRUM_FLOOR_DB = -100

/** Lift FFT bins so the displayed peak sits with the loudness meter (bin dB is much lower). */
export const SPECTRUM_METER_ALIGN_MAX_DB = 48

export function maxBandDb(dbs: ArrayLike<number> | null | undefined, floorDb = SPECTRUM_FLOOR_DB): number {
  if (!dbs || dbs.length < 1) return floorDb
  let peak = floorDb
  for (let i = 0; i < dbs.length; i++) {
    const db = dbs[i] ?? floorDb
    if (db > peak) peak = db
  }
  return peak
}

/**
 * dB to add to FFT bands so their peak matches the time-domain meter.
 * Never pulls the plot down — only boosts a quiet spectrum.
 */
export function spectrumMeterAlignDb(
  spectrumPeakDb: number,
  meterPeakDb: number,
  floorDb = SPECTRUM_FLOOR_DB,
  maxBoostDb = SPECTRUM_METER_ALIGN_MAX_DB,
): number {
  if (!Number.isFinite(spectrumPeakDb) || spectrumPeakDb <= floorDb + 1) return 0
  if (!Number.isFinite(meterPeakDb)) return 0
  return Math.min(maxBoostDb, Math.max(0, meterPeakDb - spectrumPeakDb))
}

export function logBandEdgesHz(minHz: number, maxHz: number, bandCount: number = SPECTRUM_BAND_COUNT): Float32Array {
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

/** First non-DC bin frequency. Energy below this is not resolved by the FFT. */
export function fftFirstBinHz(sampleRate: number, binCount: number): number {
  if (!(sampleRate > 0) || binCount < 2) return Infinity
  return sampleRate / (binCount * 2)
}

/**
 * Last AnalyserNode bin is Nyquist-adjacent and often holds window/DC fold
 * energy. Ignore it so the air band does not paint a fake shelf.
 */
export function fftLastUsableBin(binCount: number): number {
  return Math.max(1, binCount - 2)
}

export function fftLastUsableHz(sampleRate: number, binCount: number): number {
  if (!(sampleRate > 0) || binCount < 2) return 0
  return (fftLastUsableBin(binCount) * sampleRate) / (binCount * 2)
}

/** FFT / EQ overlay top of axis (Hz). Nyquist still caps below this. */
export const SPECTRUM_AXIS_MAX_HZ = 22_000

/** Plot / band top: Nyquist, capped to the EQ axis so log bands match the UI. */
export function spectrumMaxHz(sampleRate: number, capHz: number = SPECTRUM_AXIS_MAX_HZ): number {
  if (!(sampleRate > 0)) return Math.max(1, capHz)
  return Math.min(capHz, sampleRate / 2)
}

/** Linear interpolation between FFT bins at `hz`. DC and Nyquist bins → floor. */
export function fftDbAtHz(
  binsDb: ArrayLike<number>,
  sampleRate: number,
  hz: number,
  floorDb = SPECTRUM_FLOOR_DB,
): number {
  const n = binsDb.length
  if (n < 2 || !(sampleRate > 0) || !(hz > 0)) return floorDb
  const fftSize = n * 2
  const pos = (hz * fftSize) / sampleRate
  const last = fftLastUsableBin(n)
  if (pos < 1 || pos > last) return floorDb
  const i0 = Math.min(last, Math.floor(pos))
  if (i0 >= last) return binsDb[last] ?? floorDb
  const frac = pos - i0
  const a = binsDb[i0] ?? floorDb
  const b = binsDb[i0 + 1] ?? floorDb
  return a + (b - a) * frac
}

/** Peak dB in each log band. `binsDb` is AnalyserNode.getFloatFrequencyData. */
export function bandPeakDb(
  binsDb: ArrayLike<number>,
  sampleRate: number,
  bandCount: number = SPECTRUM_BAND_COUNT,
  minHz = 20,
  maxHz?: number,
): Float32Array {
  const n = binsDb.length
  const out = new Float32Array(bandCount)
  out.fill(SPECTRUM_FLOOR_DB)
  if (n < 2 || !(sampleRate > 0)) return out
  const fftSize = n * 2
  const nyquist = sampleRate / 2
  const hiLimit = Math.min(nyquist, maxHz ?? nyquist)
  const firstHz = fftFirstBinHz(sampleRate, n)
  const lastHz = fftLastUsableHz(sampleRate, n)
  const lastBin = fftLastUsableBin(n)
  const edges = logBandEdgesHz(minHz, Math.max(minHz * 1.01, hiLimit), bandCount)
  for (let b = 0; b < bandCount; b++) {
    const loHz = edges[b] ?? minHz
    const hiHz = edges[b + 1] ?? hiLimit
    const center = Math.sqrt(Math.max(1, loHz) * Math.max(loHz, hiHz))
    if (hiHz <= firstHz || center < firstHz || loHz >= lastHz || center > lastHz) {
      out[b] = SPECTRUM_FLOOR_DB
      continue
    }
    // Only bins whose center frequency sits inside the band — avoids painting
    // one coarse LF bin across a wide log-frequency plateau (10–25 Hz shelf).
    const i0 = Math.max(1, Math.ceil((loHz * fftSize) / sampleRate))
    const i1 = Math.min(lastBin, Math.floor((hiHz * fftSize) / sampleRate - 1e-9))
    if (i1 >= i0) {
      let peak = SPECTRUM_FLOOR_DB
      for (let i = i0; i <= i1; i++) {
        const db = binsDb[i] ?? SPECTRUM_FLOOR_DB
        if (db > peak) peak = db
      }
      out[b] = peak
    } else {
      out[b] = SPECTRUM_FLOOR_DB
    }
  }
  return out
}

/** Do not lift analyser-floor bins when matching FFT height to the loudness meter. */
export function alignedBandDb(
  db: number,
  alignDb: number,
  floorDb = SPECTRUM_FLOOR_DB,
): number {
  if (!Number.isFinite(db) || db <= floorDb + 1) return floorDb
  return db + alignDb
}

/** Keep measured post-EQ FFT from exceeding pre + filter gain (kills LF leakage). */
export function capBandByExpected(
  measuredDb: number,
  expectedDb: number,
  floorDb = SPECTRUM_FLOOR_DB,
): number {
  const measured = Number.isFinite(measuredDb) ? measuredDb : floorDb
  const expected = Number.isFinite(expectedDb) ? expectedDb : measured
  return Math.max(floorDb, Math.min(measured, expected))
}

/** dB of a log-spaced curve at `hz`. Used to lay the EQ correction onto FFT bins. */
export function logGridDbAt(hz: number, gridHz: ArrayLike<number>, gridDb: ArrayLike<number>): number {
  const n = Math.min(gridHz.length, gridDb.length)
  if (n < 1 || !Number.isFinite(hz)) return 0
  const firstHz = gridHz[0] ?? hz
  const firstDb = gridDb[0] ?? 0
  if (n === 1 || hz <= firstHz) return firstDb
  const last = n - 1
  const lastHz = gridHz[last] ?? hz
  const lastDb = gridDb[last] ?? firstDb
  if (hz >= lastHz) return lastDb
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if ((gridHz[mid] ?? 0) <= hz) lo = mid
    else hi = mid
  }
  const h0 = gridHz[lo] ?? hz
  const h1 = gridHz[hi] ?? hz
  const span = Math.log(h1 / Math.max(1e-6, h0))
  const t = span > 0 ? Math.log(hz / Math.max(1e-6, h0)) / span : 0
  const a = gridDb[lo] ?? 0
  const b = gridDb[hi] ?? a
  return a + (b - a) * t
}

/**
 * Keep each post-EQ bin from drawing above pre + the correction at that Hz.
 * Same ceiling as the band cap, sampled on the bin's own frequency.
 */
export function capSpectrumBins(
  measured: Float32Array,
  pre: ArrayLike<number>,
  sampleRate: number,
  gainAtHz: (hz: number) => number,
  floorDb = SPECTRUM_FLOOR_DB,
): void {
  const n = measured.length
  if (n < 2 || !(sampleRate > 0) || pre.length < n) return
  const fftSize = n * 2
  const last = Math.min(fftLastUsableBin(n), n - 1)
  for (let i = 1; i <= last; i++) {
    const hz = (i * sampleRate) / fftSize
    measured[i] = capBandByExpected(measured[i] ?? floorDb, (pre[i] ?? floorDb) + gainAtHz(hz), floorDb)
  }
}

export function capBandsByEqGain(
  measured: Float32Array,
  pre: ArrayLike<number>,
  eqGainDb: ArrayLike<number>,
  floorDb = SPECTRUM_FLOOR_DB,
): void {
  const n = measured.length
  for (let i = 0; i < n; i++) {
    measured[i] = capBandByExpected(
      measured[i] ?? floorDb,
      (pre[i] ?? floorDb) + (eqGainDb[i] ?? 0),
      floorDb,
    )
  }
}

/** In a cut, use the most attenuated of center and both edges so a wide log band cannot leak. */
export function eqGainForSpectrumBand(
  centerGainDb: number,
  lowEdgeGainDb: number,
  highEdgeGainDb = centerGainDb,
): number {
  const steepest = Math.min(centerGainDb, lowEdgeGainDb, highEdgeGainDb)
  if (steepest < -1) return steepest
  return centerGainDb
}

/** Peak FFT bin dB between two frequencies (AnalyserNode.getFloatFrequencyData). */
export function fftPeakDbInHzRange(
  binsDb: ArrayLike<number>,
  sampleRate: number,
  loHz: number,
  hiHz: number,
): number {
  const n = binsDb.length
  if (n < 2 || !(sampleRate > 0)) return -100
  const fftSize = n * 2
  const nyquist = sampleRate / 2
  const lo = Math.min(nyquist, Math.max(1, Math.min(loHz, hiHz)))
  const hi = Math.min(nyquist, Math.max(lo * 1.001, Math.max(loHz, hiHz)))
  const i0 = Math.max(1, Math.floor((lo * fftSize) / sampleRate))
  const i1 = Math.min(fftLastUsableBin(n), Math.ceil((hi * fftSize) / sampleRate))
  let peak = -100
  for (let i = i0; i <= i1; i++) {
    const db = binsDb[i] ?? -100
    if (db > peak) peak = db
  }
  return peak
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

/** Frame-rate independent visual fall. Bars and the line share these buffers. */
export function followBandsOverTime(
  prev: Float32Array,
  target: ArrayLike<number>,
  attackPerSec: number,
  releasePerSec: number,
  dtSec: number,
): void {
  followBands(prev, target, envelopeStep(attackPerSec, dtSec), envelopeStep(releasePerSec, dtSec))
}
