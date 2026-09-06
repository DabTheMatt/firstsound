import { dbToGain } from '../parameters/mapping'

export type StereoRoute = {
  leftToL: number
  leftToR: number
  rightToL: number
  rightToR: number
}

/**
 * Stereo keeps L/R separate. A 1-channel buffer only occupies splitter
 * channel 0, so copy left onto both speakers. Fold-to-mono sums L+R equally.
 */
export function stereoRouteGains(foldMono: boolean, sourceChannels = 2): StereoRoute {
  if (sourceChannels < 2) return { leftToL: 1, leftToR: 1, rightToL: 0, rightToR: 0 }
  if (foldMono) return { leftToL: 0.5, leftToR: 0.5, rightToL: 0.5, rightToR: 0.5 }
  return { leftToL: 1, leftToR: 0, rightToL: 0, rightToR: 1 }
}

/** Upmix a mono bus to stereo so ChannelSplitter(2) is not left-only. */
export function forceStereoUpmix(node: AudioNode): void {
  try {
    node.channelCount = 2
    node.channelCountMode = 'explicit'
    node.channelInterpretation = 'speakers'
  } catch {
    /* some node types reject channelCount */
  }
}

export function panNorm(panPct: number): number {
  return Math.min(1, Math.max(-1, panPct / 100))
}

export type StereoStage = {
  input: GainNode
  output: GainNode
  makeup: GainNode
  leftLevel: GainNode
  rightLevel: GainNode
  leftPol: GainNode
  rightPol: GainNode
  leftToL: GainNode
  leftToR: GainNode
  rightToL: GainNode
  rightToR: GainNode
  panner: StereoPannerNode
}

export function createStereoStage(ctx: AudioContext): StereoStage {
  const input = ctx.createGain()
  const makeup = ctx.createGain()
  const split = ctx.createChannelSplitter(2)
  const leftLevel = ctx.createGain()
  const rightLevel = ctx.createGain()
  const leftPol = ctx.createGain()
  const rightPol = ctx.createGain()
  const leftToL = ctx.createGain()
  const leftToR = ctx.createGain()
  const rightToL = ctx.createGain()
  const rightToR = ctx.createGain()
  const merge = ctx.createChannelMerger(2)
  const panner = ctx.createStereoPanner()
  const output = ctx.createGain()

  input.connect(makeup)
  forceStereoUpmix(makeup)
  makeup.connect(split)
  split.connect(leftLevel, 0)
  split.connect(rightLevel, 1)
  leftLevel.connect(leftPol)
  rightLevel.connect(rightPol)
  leftPol.connect(leftToL)
  leftPol.connect(leftToR)
  rightPol.connect(rightToL)
  rightPol.connect(rightToR)
  leftToL.connect(merge, 0, 0)
  leftToR.connect(merge, 0, 1)
  rightToL.connect(merge, 0, 0)
  rightToR.connect(merge, 0, 1)
  merge.connect(panner)
  panner.connect(output)

  return {
    input,
    output,
    makeup,
    leftLevel,
    rightLevel,
    leftPol,
    rightPol,
    leftToL,
    leftToR,
    rightToL,
    rightToR,
    panner,
  }
}

export function applyStereoStage(
  stage: StereoStage,
  params: {
    gainDb: number
    pan: number
    leftDb: number
    rightDb: number
    mono: boolean
    invert: boolean
    sourceChannels?: number
  },
  now: number,
  smoothing: number,
): void {
  const route = stereoRouteGains(params.mono, params.sourceChannels ?? 2)
  const pol = params.invert ? -1 : 1
  stage.makeup.gain.setTargetAtTime(dbToGain(params.gainDb), now, smoothing)
  stage.leftLevel.gain.setTargetAtTime(dbToGain(params.leftDb), now, smoothing)
  stage.rightLevel.gain.setTargetAtTime(dbToGain(params.rightDb), now, smoothing)
  stage.leftPol.gain.setTargetAtTime(pol, now, smoothing)
  stage.rightPol.gain.setTargetAtTime(pol, now, smoothing)
  stage.leftToL.gain.setTargetAtTime(route.leftToL, now, smoothing)
  stage.leftToR.gain.setTargetAtTime(route.leftToR, now, smoothing)
  stage.rightToL.gain.setTargetAtTime(route.rightToL, now, smoothing)
  stage.rightToR.gain.setTargetAtTime(route.rightToR, now, smoothing)
  stage.panner.pan.setTargetAtTime(panNorm(params.pan), now, Math.min(smoothing, 0.01))
  stage.output.gain.setTargetAtTime(1, now, smoothing)
}
