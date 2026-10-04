import { scheduledAudioParamTarget, setSmoothedAudioParam } from '../engine/paramSmooth'
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
  compressor: DynamicsCompressorNode
  makeup: GainNode
  /** Pass-through after makeup. OUT meter. */
  analyserPost: AnalyserNode
}

export function createCompressorGraph(ctx: BaseAudioContext, input: AudioNode, wet: GainNode): CompressorGraph {
  const inputGain = ctx.createGain()
  const inputTap = ctx.createGain()
  inputTap.gain.value = 1
  const compressor = ctx.createDynamicsCompressor()
  const makeup = ctx.createGain()
  const analyserPost = ctx.createAnalyser()
  analyserPost.fftSize = 2048
  analyserPost.smoothingTimeConstant = 0.35

  input.connect(inputGain)
  inputGain.connect(inputTap)
  inputTap.connect(compressor)
  compressor.connect(makeup)
  makeup.connect(analyserPost)
  analyserPost.connect(wet)

  return { inputGain, inputTap, compressor, makeup, analyserPost }
}

/**
 * DynamicsCompressor AudioParams do not survive `cancelAndHoldAtTime`.
 * That call reports the new value and then compresses with a corrupted law
 * (a 1:1 ratio still ducks). Write the value directly at the start of the
 * timeline, and `setValueAtTime` later so automation can move it.
 * The compressor envelope is what keeps the audio click-free.
 * Input and makeup stay on the shared gain ramp — those are GainNodes.
 */
function setDynamicsParam(param: AudioParam, value: number, now: number): void {
  if (!Number.isFinite(value)) return
  const t = Math.max(0, Number.isFinite(now) ? now : 0)
  if (t <= 1e-6) param.value = value
  try {
    param.setValueAtTime(value, t)
  } catch {
    param.value = value
  }
}

export function applyCompressorGraph(
  g: CompressorGraph,
  params: Record<ParamId, number>,
  now: number,
  _smoothing: number,
): void {
  const s = compressorSettings(params)
  setSmoothedAudioParam(g.inputGain.gain, s.inputGain, now, 'gain')
  setDynamicsParam(g.compressor.threshold, s.threshold, now)
  setDynamicsParam(g.compressor.knee, s.knee, now)
  setDynamicsParam(g.compressor.ratio, s.ratio, now)
  setDynamicsParam(g.compressor.attack, s.attack, now)
  setDynamicsParam(g.compressor.release, s.release, now)
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
