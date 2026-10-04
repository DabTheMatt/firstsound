import { scheduledAudioParamTarget, setDynamicsAudioParam, setSmoothedAudioParam } from '../engine/paramSmooth'
import { webAudioBiquadQ } from '../engine/eqBands'
import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { amplitudeToDb, autoMakeupDb, compressorGainDb } from './limiter'

/**
 * DynamicsCompressorNode ranges (Web Audio). UI may expose a musical subset.
 * Attack and release are seconds on the node. FIELD stores milliseconds.
 */
export const COMPRESSOR_THRESHOLD_MIN = -100
export const COMPRESSOR_THRESHOLD_MAX = 0
export const COMPRESSOR_KNEE_MIN = 0
export const COMPRESSOR_KNEE_MAX = 40
export const COMPRESSOR_RATIO_MIN = 1
export const COMPRESSOR_RATIO_MAX = 20
export const COMPRESSOR_ATTACK_MAX_SEC = 1
export const COMPRESSOR_RELEASE_MAX_SEC = 1
/** Minimum is full-band: the split is bypassed and the path matches a compressor with no low cut. */
export const COMPRESSOR_LOW_CUT_MIN = 20
export const COMPRESSOR_LOW_CUT_MAX = 400

export type CompressorSettings = {
  inputGain: number
  threshold: number
  knee: number
  ratio: number
  /** Seconds. */
  attack: number
  /** Seconds. */
  release: number
  makeupGain: number
  makeupDb: number
  autoMakeup: boolean
  /** Hz. At the minimum the detector hears the whole signal. */
  lowCut: number
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Map compressor* params onto DynamicsCompressorNode units.
 * Auto makeup is a fixed estimate from threshold and ratio
 * (`autoMakeupDb`). It is not a live loudness follower.
 * Manual makeup is used when auto makeup is off.
 */
export function compressorSettings(params: Record<ParamId, number>): CompressorSettings {
  const threshold = clamp(params.compressorThreshold, COMPRESSOR_THRESHOLD_MIN, COMPRESSOR_THRESHOLD_MAX)
  const ratio = clamp(params.compressorRatio, COMPRESSOR_RATIO_MIN, COMPRESSOR_RATIO_MAX)
  const autoMakeup = params.compressorAutoMakeup > 0.5
  const makeupDb = autoMakeup ? autoMakeupDb(threshold, ratio) : params.compressorMakeup
  return {
    inputGain: dbToGain(params.compressorInput),
    threshold,
    knee: clamp(params.compressorKnee, COMPRESSOR_KNEE_MIN, COMPRESSOR_KNEE_MAX),
    ratio,
    attack: clamp(params.compressorAttack / 1000, 0, COMPRESSOR_ATTACK_MAX_SEC),
    release: clamp(params.compressorRelease / 1000, 0, COMPRESSOR_RELEASE_MAX_SEC),
    makeupGain: dbToGain(makeupDb),
    makeupDb,
    autoMakeup,
    lowCut: clamp(params.compressorLowCut, COMPRESSOR_LOW_CUT_MIN, COMPRESSOR_LOW_CUT_MAX),
  }
}

/**
 * Static transfer in dB: input drive, soft knee, ratio, makeup.
 * No brickwall ceiling. Attack and release are envelope times on the node
 * and are not part of this curve.
 */
export function compressorCurveDb(
  inputDb: number,
  s: Pick<CompressorSettings, 'inputGain' | 'threshold' | 'knee' | 'ratio' | 'makeupGain'>,
): number {
  if (!Number.isFinite(inputDb)) return inputDb
  const driveDb = amplitudeToDb(s.inputGain)
  const driven = inputDb + (Number.isFinite(driveDb) ? driveDb : 0)
  const makeupDb = amplitudeToDb(s.makeupGain)
  return driven + compressorGainDb(driven, s.threshold, s.ratio, s.knee) + (Number.isFinite(makeupDb) ? makeupDb : 0)
}

/** Gain reduction implied by the static curve, before makeup. Makeup does not change this. */
export function compressorStaticReductionDb(
  inputDb: number,
  s: Pick<CompressorSettings, 'inputGain' | 'threshold' | 'knee' | 'ratio'>,
): number {
  if (!Number.isFinite(inputDb)) return 0
  const driveDb = amplitudeToDb(s.inputGain)
  const driven = inputDb + (Number.isFinite(driveDb) ? driveDb : 0)
  return compressorGainDb(driven, s.threshold, s.ratio, s.knee)
}

/**
 * Stable compressor insert.
 *
 * INPUT → inputGain → inputTap → DynamicsCompressorNode → makeup → analyserPost → wet
 *
 * Low Cut, when raised above its minimum, splits that path:
 * highs go through the compressor, lows sum back in after it.
 * The compressor therefore does not react to, or reduce, sound below the cutoff.
 * At the minimum the split gains are closed and the direct wire is the only input,
 * so the law matches a compressor with no low cut.
 *
 * Meter taps do not alter the signal:
 * - IN: `inputTap`, after the input-gain stage, before the compressor.
 *   The engine's `analyserCompressorPre` is a side-chain from this node.
 * - GR: `DynamicsCompressorNode.reduction` (dB, 0 or negative).
 * - OUT: `analyserPost`, after compression and makeup, before the slot wet gain
 *   (the dry/wet bypass crossfade sits outside this graph).
 *
 * Parameter gestures only write AudioParams. The nodes stay connected.
 */
export type CompressorGraph = {
  inputGain: GainNode
  /** Pass-through after input gain. IN meter side-chain. */
  inputTap: GainNode
  /** Unity when Low Cut is at its minimum. */
  direct: GainNode
  /** Linkwitz-Riley highpass into the compressor. */
  highpass: [BiquadFilterNode, BiquadFilterNode]
  high: GainNode
  /** Linkwitz-Riley lowpass around the compressor. */
  lowpass: [BiquadFilterNode, BiquadFilterNode]
  low: GainNode
  compressor: DynamicsCompressorNode
  /** Compressed band plus the bypassed lows. */
  sum: GainNode
  makeup: GainNode
  /** Pass-through after makeup. OUT meter. */
  analyserPost: AnalyserNode
}

function linkwitzRiley(ctx: BaseAudioContext, type: BiquadFilterType): BiquadFilterNode {
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = COMPRESSOR_LOW_CUT_MIN
  filter.Q.value = webAudioBiquadQ(type, Math.SQRT1_2)
  return filter
}

export function createCompressorGraph(ctx: BaseAudioContext, input: AudioNode, wet: GainNode): CompressorGraph {
  const inputGain = ctx.createGain()
  const inputTap = ctx.createGain()
  inputTap.gain.value = 1
  const direct = ctx.createGain()
  direct.gain.value = 1
  const hp1 = linkwitzRiley(ctx, 'highpass')
  const hp2 = linkwitzRiley(ctx, 'highpass')
  const high = ctx.createGain()
  high.gain.value = 0
  const lp1 = linkwitzRiley(ctx, 'lowpass')
  const lp2 = linkwitzRiley(ctx, 'lowpass')
  const low = ctx.createGain()
  low.gain.value = 0
  const compressor = ctx.createDynamicsCompressor()
  const sum = ctx.createGain()
  const makeup = ctx.createGain()
  const analyserPost = ctx.createAnalyser()
  analyserPost.fftSize = 2048
  analyserPost.smoothingTimeConstant = 0.35

  input.connect(inputGain)
  inputGain.connect(inputTap)
  inputTap.connect(direct)
  direct.connect(compressor)
  inputTap.connect(hp1)
  hp1.connect(hp2)
  hp2.connect(high)
  high.connect(compressor)
  inputTap.connect(lp1)
  lp1.connect(lp2)
  lp2.connect(low)
  compressor.connect(sum)
  low.connect(sum)
  sum.connect(makeup)
  makeup.connect(analyserPost)
  analyserPost.connect(wet)

  return {
    inputGain,
    inputTap,
    direct,
    highpass: [hp1, hp2],
    high,
    lowpass: [lp1, lp2],
    low,
    compressor,
    sum,
    makeup,
    analyserPost,
  }
}

export function applyCompressorGraph(
  g: CompressorGraph,
  params: Record<ParamId, number>,
  now: number,
  _smoothing: number,
): void {
  const s = compressorSettings(params)
  const split = s.lowCut > COMPRESSOR_LOW_CUT_MIN + 0.5
  setSmoothedAudioParam(g.inputGain.gain, s.inputGain, now, 'gain')
  setSmoothedAudioParam(g.direct.gain, split ? 0 : 1, now, 'gain')
  setSmoothedAudioParam(g.high.gain, split ? 1 : 0, now, 'gain')
  setSmoothedAudioParam(g.low.gain, split ? 1 : 0, now, 'gain')
  for (const filter of [...g.highpass, ...g.lowpass]) {
    setSmoothedAudioParam(filter.frequency, s.lowCut, now, 'frequency')
  }
  setDynamicsAudioParam(g.compressor.threshold, s.threshold, now)
  setDynamicsAudioParam(g.compressor.knee, s.knee, now)
  setDynamicsAudioParam(g.compressor.ratio, s.ratio, now)
  setDynamicsAudioParam(g.compressor.attack, s.attack, now)
  setDynamicsAudioParam(g.compressor.release, s.release, now)
  setSmoothedAudioParam(g.makeup.gain, s.makeupGain, now, 'gain')
}

/**
 * Live gain reduction in dB from the node (0 when idle, negative while compressing).
 * Makeup is downstream and does not change this value.
 */
export function compressorReductionDb(g: CompressorGraph | null | undefined): number {
  const raw = g?.compressor?.reduction
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  // Spec: 0 at rest, negative while reducing. A positive reading is treated as unsigned reduction.
  return raw > 0 ? -raw : raw
}

/** Last scheduled makeup linear gain. Tests confirm makeup is a real AudioParam write. */
export function compressorMakeupTarget(g: CompressorGraph): number | undefined {
  return scheduledAudioParamTarget(g.makeup.gain)
}
