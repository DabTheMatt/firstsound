import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'

export type LimiterSettings = {
  inputGain: number
  threshold: number
  knee: number
  ratio: number
  attack: number
  release: number
  makeupGain: number
  ceiling: number
}

/** Makeup that restores ~0 dBFS peaks after limiting a full-scale hit. */
export function autoMakeupDb(thresholdDb: number, ratio: number): number {
  const overshoot = Math.max(0, -thresholdDb)
  const r = Math.max(1, ratio)
  return overshoot * (1 - 1 / r)
}

export function limiterSettings(params: Record<ParamId, number>): LimiterSettings {
  const threshold = params.limiterThreshold
  const ratio = params.limiterRatio
  const makeupDb =
    params.limiterAutoMakeup > 0.5 ? autoMakeupDb(threshold, ratio) : params.limiterMakeup
  return {
    inputGain: dbToGain(params.limiterInput),
    threshold,
    knee: params.limiterKnee,
    ratio,
    attack: params.limiterAttack / 1000,
    release: params.limiterRelease / 1000,
    makeupGain: dbToGain(makeupDb),
    ceiling: params.limiterCeiling,
  }
}

export type LimiterGraph = {
  inputGain: GainNode
  comp: DynamicsCompressorNode
  makeup: GainNode
  ceiling: DynamicsCompressorNode
  analyserPost: AnalyserNode
}

export function createLimiterGraph(ctx: AudioContext, input: AudioNode, wet: GainNode): LimiterGraph {
  const inputGain = ctx.createGain()
  const comp = ctx.createDynamicsCompressor()
  const makeup = ctx.createGain()
  const ceiling = ctx.createDynamicsCompressor()
  const analyserPost = ctx.createAnalyser()
  analyserPost.fftSize = 2048
  analyserPost.smoothingTimeConstant = 0

  input.connect(inputGain)
  inputGain.connect(comp)
  comp.connect(makeup)
  makeup.connect(ceiling)
  ceiling.connect(analyserPost)
  analyserPost.connect(wet)
  const keepAlive = ctx.createGain()
  keepAlive.gain.value = 0
  analyserPost.connect(keepAlive)
  keepAlive.connect(ctx.destination)

  return { inputGain, comp, makeup, ceiling, analyserPost }
}

export function applyLimiterGraph(
  g: LimiterGraph,
  params: Record<ParamId, number>,
  now: number,
  smoothing: number,
): void {
  const s = limiterSettings(params)
  g.inputGain.gain.setTargetAtTime(s.inputGain, now, smoothing)
  g.comp.threshold.setTargetAtTime(s.threshold, now, smoothing)
  g.comp.knee.setTargetAtTime(s.knee, now, smoothing)
  g.comp.ratio.setTargetAtTime(s.ratio, now, smoothing)
  g.comp.attack.setTargetAtTime(s.attack, now, smoothing)
  g.comp.release.setTargetAtTime(s.release, now, smoothing)
  g.makeup.gain.setTargetAtTime(s.makeupGain, now, smoothing)
  g.ceiling.threshold.setTargetAtTime(s.ceiling, now, smoothing)
  g.ceiling.ratio.setTargetAtTime(20, now, smoothing)
  g.ceiling.knee.setTargetAtTime(0, now, smoothing)
  g.ceiling.attack.setTargetAtTime(0.001, now, smoothing)
  g.ceiling.release.setTargetAtTime(0.05, now, smoothing)
}

export function limiterReductionDb(g: LimiterGraph | null | undefined): number {
  const gr = g?.comp.reduction
  return typeof gr === 'number' && Number.isFinite(gr) ? gr : 0
}

export const LIMITER_PLOT_MIN_DB = -48
export const LIMITER_PLOT_MAX_DB = 6

export function amplitudeToDb(amp: number): number {
  if (!(amp > 0) || !Number.isFinite(amp)) return Number.NEGATIVE_INFINITY
  return 20 * Math.log10(amp)
}

export function peakAmplitude(samples: Float32Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i] ?? 0)
    if (a > peak) peak = a
  }
  return peak
}

/**
 * Soft-knee compressor gain in dB (0 or negative), matching the usual
 * DynamicsCompressor knee shape.
 */
export function compressorGainDb(inputDb: number, threshold: number, ratio: number, knee: number): number {
  if (!Number.isFinite(inputDb)) return 0
  const r = Math.max(1, ratio)
  const k = Math.max(0, knee)
  const half = k / 2
  if (inputDb <= threshold - half) return 0
  if (k > 0 && inputDb < threshold + half) {
    const x = inputDb - threshold + half
    return ((1 / r - 1) * x * x) / (2 * k)
  }
  return (1 / r - 1) * (inputDb - threshold)
}

/** Predicted output level after input drive, compression, makeup, and ceiling. */
export function limiterOutputDb(inputDb: number, s: LimiterSettings): number {
  const driveDb = amplitudeToDb(s.inputGain)
  const driven = inputDb + (Number.isFinite(driveDb) ? driveDb : 0)
  const makeupDb = amplitudeToDb(s.makeupGain)
  const after = driven + compressorGainDb(driven, s.threshold, s.ratio, s.knee) + (Number.isFinite(makeupDb) ? makeupDb : 0)
  return Math.min(s.ceiling, after)
}

/** Display columns in the limiter inspector scope. Coarse enough to stay readable. */
export const LIMITER_SCOPE_POINTS = 48

/** Analyser samples to fold into those columns (~2–3 cycles around mid-band). */
export const LIMITER_SCOPE_WINDOW = 320

/** Keep the signed peak of each bucket so flattened tops stay visible. */
export function downsampleScope(samples: Float32Array, points: number, out: Float32Array): void {
  const n = Math.max(0, Math.min(points, out.length))
  if (n === 0) return
  if (samples.length === 0) {
    out.fill(0, 0, n)
    return
  }
  const window = Math.min(samples.length, Math.max(n, LIMITER_SCOPE_WINDOW))
  const start = samples.length - window
  for (let i = 0; i < n; i++) {
    const a = start + Math.floor((i / n) * window)
    const b = start + Math.floor(((i + 1) / n) * window)
    let peak = 0
    for (let s = a; s < Math.max(a + 1, b); s++) {
      const v = samples[s] ?? 0
      if (Math.abs(v) >= Math.abs(peak)) peak = v
    }
    out[i] = peak
  }
  if (out.length > n) out.fill(0, n)
}

export function dbToAmplitude(db: number): number {
  if (!Number.isFinite(db)) return 0
  return 10 ** (db / 20)
}

/** Soft-flatten samples that exceed the threshold, for the inspector scope. */
export function crushSample(x: number, thresholdAmp: number, ratio: number): number {
  const t = Math.max(1e-6, thresholdAmp)
  const r = Math.max(1, ratio)
  const a = Math.abs(x)
  if (a <= t) return x
  return Math.sign(x) * (t + (a - t) / r)
}
