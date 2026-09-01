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
