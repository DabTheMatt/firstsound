/**
 * Complementary linear-phase band split.
 *
 * Each band is a difference of equal-length linear-phase lowpasses
 * (the top band is the delayed identity minus the last lowpass).
 * After the shared group delay is removed, the bands sum to the
 * original sample-for-sample, apart from float rounding.
 * That identity is what keeps the recombined waveform coherent:
 * there is no extra allpass, and every band shares the same latency.
 */

import { convolveAligned, designLinearPhaseLowpass, sharedLowpassTaps } from './fir'

/** Four musical ranges: sub/bass, low-mid, high-mid, air. */
export const DEFAULT_CROSSOVERS_HZ = [120, 1000, 6000] as const

export const DEFAULT_BAND_IDS = ['sub-bass', 'low-mid', 'high-mid', 'high'] as const

export type SpectralBandId = (typeof DEFAULT_BAND_IDS)[number] | string

export type SpectralBand = {
  id: string
  gainDb: number
  mute: boolean
  solo: boolean
}

/**
 * Mixer state for one decomposition.
 * `bands.length === crossoversHz.length + 1`.
 * Later per-band processing can hang off `id` without a second effect rack.
 */
export type SpectralState = {
  enabled: boolean
  /** Live FFT stays on the audible sum unless the user picks a band id. */
  analyser: 'sum' | string
  crossoversHz: number[]
  bands: SpectralBand[]
}

export type SpectralSnapshot = SpectralState & {
  ready: boolean
  computing: boolean
}

export type Decomposition = {
  bands: Float32Array[][]
  /** Samples of group delay removed from every band. */
  compensatedDelaySamples: number
  taps: number
}

export function defaultSpectralBands(ids: readonly string[] = DEFAULT_BAND_IDS): SpectralBand[] {
  return ids.map((id) => ({ id, gainDb: 0, mute: false, solo: false }))
}

export function defaultSpectralState(): SpectralState {
  return {
    enabled: false,
    analyser: 'sum',
    crossoversHz: [...DEFAULT_CROSSOVERS_HZ],
    bands: defaultSpectralBands(),
  }
}

export function cloneSpectralState(state: SpectralState): SpectralState {
  return {
    enabled: state.enabled,
    analyser: state.analyser,
    crossoversHz: state.crossoversHz.slice(),
    bands: state.bands.map((band) => ({ ...band })),
  }
}

export function spectralStatesEqual(a: SpectralState, b: SpectralState): boolean {
  if (a.enabled !== b.enabled || a.analyser !== b.analyser) return false
  if (a.crossoversHz.length !== b.crossoversHz.length || a.bands.length !== b.bands.length) return false
  for (let i = 0; i < a.crossoversHz.length; i++) {
    if (a.crossoversHz[i] !== b.crossoversHz[i]) return false
  }
  for (let i = 0; i < a.bands.length; i++) {
    const x = a.bands[i]!
    const y = b.bands[i]!
    if (x.id !== y.id || x.gainDb !== y.gainDb || x.mute !== y.mute || x.solo !== y.solo) return false
  }
  return true
}

/** Keep splits strictly increasing and inside a usable range. */
export function clampCrossovers(hz: readonly number[], sampleRate: number): number[] {
  const nyquist = Math.max(80, sampleRate * 0.45)
  const gap = 20
  const out: number[] = []
  let prev = 30
  for (let i = 0; i < hz.length; i++) {
    const raw = Number.isFinite(hz[i]) ? (hz[i] as number) : prev + gap
    const next = Math.min(nyquist, Math.max(prev + gap, raw))
    out.push(next)
    prev = next
  }
  return out
}

function subtract(a: ArrayLike<number>, b: ArrayLike<number>): Float32Array {
  const n = Math.max(a.length, b.length)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) - (b[i] ?? 0)
  return out
}

export function decomposeComplementary(
  channels: readonly Float32Array[],
  sampleRate: number,
  crossoversHz: readonly number[],
  forceFft = false,
): Decomposition {
  const crossovers = clampCrossovers(crossoversHz, sampleRate)
  const taps = sharedLowpassTaps(crossovers, sampleRate)
  const delay = (taps - 1) >> 1
  const kernels = crossovers.map((hz) => designLinearPhaseLowpass(hz, sampleRate, taps))
  const bandCount = crossovers.length + 1
  const bands: Float32Array[][] = Array.from({ length: bandCount }, () => [])
  for (const channel of channels) {
    const lows = kernels.map((kernel) => convolveAligned(channel, kernel, delay, forceFft))
    const parts: Float32Array[] = []
    let previous: Float32Array | null = null
    for (const low of lows) {
      parts.push(previous ? subtract(low, previous) : low)
      previous = low
    }
    parts.push(subtract(channel, previous ?? new Float32Array(channel.length)))
    for (let b = 0; b < bandCount; b++) bands[b]!.push(parts[b] ?? new Float32Array(channel.length))
  }
  return { bands, compensatedDelaySamples: delay, taps }
}

export function dbToLinear(db: number): number {
  if (!Number.isFinite(db)) return 0
  return Math.pow(10, Math.min(24, Math.max(-80, db)) / 20)
}

/** Mute wins. Any solo silences the bands that are not soloed. */
export function bandAudibleGains(bands: readonly Pick<SpectralBand, 'gainDb' | 'mute' | 'solo'>[]): number[] {
  const soloing = bands.some((band) => band.solo)
  return bands.map((band) => {
    if (band.mute) return 0
    if (soloing && !band.solo) return 0
    return dbToLinear(band.gainDb)
  })
}

export function mixBandChannels(bands: readonly (readonly Float32Array[])[], gains: readonly number[]): Float32Array[] {
  const channelCount = bands[0]?.length ?? 0
  const length = bands[0]?.[0]?.length ?? 0
  const mixed: Float32Array[] = []
  for (let c = 0; c < channelCount; c++) {
    const acc = new Float32Array(length)
    for (let b = 0; b < bands.length; b++) {
      const gain = gains[b] ?? 0
      if (gain === 0) continue
      const src = bands[b]?.[c]
      if (!src) continue
      const n = Math.min(length, src.length)
      if (gain === 1) {
        for (let i = 0; i < n; i++) acc[i] += src[i] ?? 0
      } else {
        for (let i = 0; i < n; i++) acc[i] += (src[i] ?? 0) * gain
      }
    }
    mixed.push(acc)
  }
  return mixed
}

export type ReconstructionReport = {
  rms: number
  peak: number
  /** 20 log10 of the absolute error RMS. Silence is a large negative number. */
  rmsDb: number
  peakDb: number
  /** Peak of the cross-correlation. 0 means the sum is time-aligned. */
  lag: number
  /** Level of the sum relative to the original, in dB. */
  gainDb: number
}

function rmsOf(data: ArrayLike<number>): number {
  let acc = 0
  const n = data.length
  if (n < 1) return 0
  for (let i = 0; i < n; i++) {
    const v = data[i] ?? 0
    acc += v * v
  }
  return Math.sqrt(acc / n)
}

function toDb(value: number): number {
  return 20 * Math.log10(Math.max(1e-12, value))
}

/** Original minus sum. `lag` searches a few samples so a delay shows up as non-zero. */
export function reconstructionError(original: ArrayLike<number>, sum: ArrayLike<number>, maxLag = 8): ReconstructionReport {
  const n = Math.min(original.length, sum.length)
  let peak = 0
  let acc = 0
  for (let i = 0; i < n; i++) {
    const err = (original[i] ?? 0) - (sum[i] ?? 0)
    const a = Math.abs(err)
    if (a > peak) peak = a
    acc += err * err
  }
  const rms = n > 0 ? Math.sqrt(acc / n) : 0
  let best = 0
  let bestLag = 0
  const span = Math.max(0, Math.min(maxLag, n - 1))
  for (let lag = -span; lag <= span; lag++) {
    let corr = 0
    const from = Math.max(0, -lag)
    const to = Math.min(n, n - lag)
    for (let i = from; i < to; i++) corr += (original[i] ?? 0) * (sum[i + lag] ?? 0)
    if (corr > best) {
      best = corr
      bestLag = lag
    }
  }
  const inRms = rmsOf(original)
  const outRms = rmsOf(sum)
  const gainDb = inRms > 1e-8 ? toDb(outRms) - toDb(inRms) : 0
  return {
    rms,
    peak,
    rmsDb: toDb(rms),
    peakDb: toDb(peak),
    lag: bestLag,
    gainDb,
  }
}

/** Null means the live analyser stays on the audible sum. */
export function spectrumListenId(enabled: boolean, analyser: string): string | null {
  if (!enabled || analyser === 'sum' || analyser.length === 0) return null
  return analyser
}

export function channelRms(data: ArrayLike<number>): number {
  return rmsOf(data)
}

export function mixToMonoChannel(channels: readonly Float32Array[]): Float32Array {
  const length = channels[0]?.length ?? 0
  const out = new Float32Array(length)
  if (channels.length === 0) return out
  const scale = 1 / channels.length
  for (const channel of channels) {
    const n = Math.min(length, channel.length)
    for (let i = 0; i < n; i++) out[i] += (channel[i] ?? 0) * scale
  }
  return out
}

/** Window of `size` samples centered on `center`, zero outside the buffer. */
export function frameAround(channel: ArrayLike<number>, center: number, size: number): Float32Array {
  const out = new Float32Array(Math.max(0, size))
  const start = Math.floor(center - size / 2)
  for (let i = 0; i < out.length; i++) {
    const index = start + i
    out[i] = index >= 0 && index < channel.length ? (channel[index] ?? 0) : 0
  }
  return out
}
