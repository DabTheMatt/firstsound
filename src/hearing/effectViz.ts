/**
 * Effect pictures driven by the same parameter math the DSP uses.
 * Reverb duration is the parameter-derived tail, not a measured RT60.
 */

import type { ParamId } from '../audio/parameters/types'
import { dbToGain } from '../audio/parameters/mapping'
import { equalPowerPanGains } from '../audio/engine/stereoStage'
import { compressorGainDb } from '../audio/fx/limiter'
import { compressorSettings } from '../audio/fx/compressor'
import { delayTaps, reverbTail, type DelayTap, type ReverbTail } from '../audio/fx/spaceModel'
import { sideGainFromWidth } from '../audio/fx/dryWet'
import type { DelayType, ReverbType } from '../audio/fx/types'
import type { BufferAnalysis, StereoMetrics } from './analyze'
import { stereoMetrics } from './analyze'
import { amplitudeToDbfs } from './levels'

export function paramRecord(overrides: Partial<Record<ParamId, number>>): Record<ParamId, number> {
  return new Proxy({} as Record<ParamId, number>, {
    get(_target, key) {
      if (typeof key !== 'string') return 0
      const value = overrides[key as ParamId]
      return typeof value === 'number' && Number.isFinite(value) ? value : 0
    },
  })
}

export function delayPicture(params: Record<ParamId, number>, type: DelayType, bpm = 120): DelayTap[] {
  return delayTaps(params, type, bpm, 0).filter((tap) => tap.gain > 0.02)
}

export type ReverbPicture = ReverbTail & {
  /** Always null until a real RT60 measurement exists. */
  rt60Sec: null
  direct: number
  wet: number
  note: string
}

export function reverbPicture(params: Record<ParamId, number>, type: ReverbType, bpm = 120): ReverbPicture {
  const tail = reverbTail(params, type, bpm)
  return {
    ...tail,
    rt60Sec: null,
    direct: Math.max(0, 1 - tail.mix),
    wet: tail.mix,
    note: 'Decay length follows the reverb parameters. It is not a measured RT60.',
  }
}

export type GainReductionPoint = {
  time: number
  inputDb: number | null
  outputDb: number | null
  reductionDb: number
}

export type CompressorPicture = {
  points: GainReductionPoint[]
  maxReductionDb: number
  averageReductionDb: number
  peaksReduced: boolean
}

export function compressorPicture(
  left: ArrayLike<number>,
  sampleRate: number,
  startFrame: number,
  endFrame: number,
  originSec: number,
  params: Record<ParamId, number>,
): CompressorPicture {
  const settings = compressorSettings(params)
  const rate = sampleRate > 0 ? sampleRate : 44100
  const start = Math.max(0, Math.floor(startFrame))
  const end = Math.max(start, Math.min(left.length, Math.floor(endFrame)))
  const frames = Math.max(1, end - start)
  const buckets = Math.min(96, Math.max(8, Math.floor(frames / 256)))
  const points: GainReductionPoint[] = []
  let maxReduction = 0
  let sumReduction = 0
  let counted = 0
  for (let b = 0; b < buckets; b++) {
    const a = start + Math.floor((b * frames) / buckets)
    const c = start + Math.floor(((b + 1) * frames) / buckets)
    let peak = 0
    for (let i = a; i < c; i++) {
      const amp = Math.abs(left[i] ?? 0) * settings.inputGain
      if (amp > peak) peak = amp
    }
    const inputDb = amplitudeToDbfs(peak)
    const reduction = inputDb === null ? 0 : compressorGainDb(inputDb, settings.threshold, settings.ratio, settings.knee)
    const makeup = amplitudeToDbfs(settings.makeupGain) ?? 0
    const outputDb = inputDb === null ? null : inputDb + reduction + makeup
    points.push({
      time: originSec + (a - start) / rate,
      inputDb,
      outputDb,
      reductionDb: reduction,
    })
    if (reduction < maxReduction) maxReduction = reduction
    sumReduction += reduction
    counted++
  }
  return {
    points,
    maxReductionDb: maxReduction,
    averageReductionDb: counted > 0 ? sumReduction / counted : 0,
    peaksReduced: maxReduction < -0.5,
  }
}

export function gainShift(before: BufferAnalysis, gainDb: number): { peak: number | null; rms: number | null } {
  return {
    peak: before.peakDbfs === null ? null : before.peakDbfs + gainDb,
    rms: before.rmsDbfs === null ? null : before.rmsDbfs + gainDb,
  }
}

/**
 * Stereo balance after the same equal-power pan and channel gains the output stage uses.
 * `balance` is (R − L) / (R + L), from −1 (left) to +1 (right).
 */
export function applyPanToBalance(balance: number, panPct: number, leftDb = 0, rightDb = 0): number {
  const { left, right } = equalPowerPanGains(panPct)
  const b = Math.max(-0.999, Math.min(0.999, Number.isFinite(balance) ? balance : 0))
  const l = left * dbToGain(leftDb)
  const r = ((1 + b) / (1 - b)) * right * dbToGain(rightDb)
  const denom = l + r
  if (!(denom > 1e-9)) return 0
  return Math.max(-1, Math.min(1, (r - l) / denom))
}

export function stereoAfterBalance(
  left: ArrayLike<number>,
  right: ArrayLike<number> | null | undefined,
  startFrame: number,
  frames: number,
  panPct: number,
  leftDb: number,
  rightDb: number,
): StereoMetrics | null {
  if (!right) return null
  const pan = equalPowerPanGains(panPct)
  const gL = dbToGain(leftDb) * pan.left
  const gR = dbToGain(rightDb) * pan.right
  const scaledL = new Float32Array(frames)
  const scaledR = new Float32Array(frames)
  const start = Math.max(0, Math.floor(startFrame))
  for (let i = 0; i < frames; i++) {
    scaledL[i] = (left[start + i] ?? 0) * gL
    scaledR[i] = (right[start + i] ?? 0) * gR
  }
  return stereoMetrics(scaledL, scaledR, 0, frames)
}

export function stereoAfterMidSide(
  left: ArrayLike<number>,
  right: ArrayLike<number> | null | undefined,
  startFrame: number,
  frames: number,
  widthPct: number,
  midDb: number,
  sideDb: number,
): StereoMetrics | null {
  if (!right) return null
  const midG = dbToGain(midDb)
  const sideG = dbToGain(sideDb) * sideGainFromWidth(widthPct)
  const outL = new Float32Array(frames)
  const outR = new Float32Array(frames)
  const start = Math.max(0, Math.floor(startFrame))
  for (let i = 0; i < frames; i++) {
    const l = left[start + i] ?? 0
    const r = right[start + i] ?? 0
    const mid = (l + r) * 0.5 * midG
    const side = (l - r) * 0.5 * sideG
    outL[i] = mid + side
    outR[i] = mid - side
  }
  return stereoMetrics(outL, outR, 0, frames)
}
