import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import {
  applyLimiterSettingsGraph,
  autoMakeupDb,
  createLimiterGraph,
  limiterReductionDb,
  type LimiterGraph,
  type LimiterSettings,
} from './limiter'

/** Map compressor* params into the shared WaveShaper curve (no brickwall). */
export function compressorSettings(params: Record<ParamId, number>): LimiterSettings {
  const threshold = params.compressorThreshold
  const ratio = params.compressorRatio
  const makeupDb =
    params.compressorAutoMakeup > 0.5 ? autoMakeupDb(threshold, ratio) : params.compressorMakeup
  return {
    inputGain: dbToGain(params.compressorInput),
    threshold,
    knee: params.compressorKnee,
    ratio,
    attack: params.compressorAttack / 1000,
    release: params.compressorRelease / 1000,
    makeupGain: dbToGain(makeupDb),
    ceiling: 0,
  }
}

export type CompressorGraph = LimiterGraph

export const createCompressorGraph = createLimiterGraph

export function applyCompressorGraph(
  g: CompressorGraph,
  params: Record<ParamId, number>,
  _now: number,
  _smoothing: number,
): void {
  applyLimiterSettingsGraph(g, compressorSettings(params))
}

export const compressorReductionDb = limiterReductionDb
