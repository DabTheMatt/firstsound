import { setSmoothedAudioParam } from './paramSmooth'
import { dbToGain } from '../parameters/mapping'

export type StereoRoute = {
  leftToL: number
  leftToR: number
  rightToL: number
  rightToR: number
}

/**
 * Stereo keeps L/R separate. A 1-channel buffer only occupies splitter
 * channel 0, so copy left onto both speakers. Fold-to-mono always sums L+R
 * equally — even when the last known file was mono, so a later stereo load
 * still collapses if Make mono is on.
 */
export function stereoRouteGains(foldMono: boolean, sourceChannels = 2): StereoRoute {
  if (foldMono) return { leftToL: 0.5, leftToR: 0.5, rightToL: 0.5, rightToR: 0.5 }
  if (sourceChannels < 2) return { leftToL: 1, leftToR: 1, rightToL: 0, rightToR: 0 }
  return { leftToL: 1, leftToR: 0, rightToL: 0, rightToR: 1 }
}

function setChannelConfig(
  node: AudioNode,
  count: number,
  interpretation: ChannelInterpretation,
): void {
  try {
    node.channelCount = count
    node.channelCountMode = 'explicit'
    node.channelInterpretation = interpretation
  } catch {
    /* some node types reject channelCount */
  }
}

/** Upmix a mono bus to stereo so ChannelSplitter(2) is not left-only. */
export function forceStereoUpmix(node: AudioNode): void {
  setChannelConfig(node, 2, 'speakers')
}

/** Keep L/R discrete into a splitter — speakers mixing can fold stereo too early. */
export function forceStereoDiscrete(node: AudioNode): void {
  setChannelConfig(node, 2, 'discrete')
}

/** One-channel taps between splitter and merger so ChannelMerger sums them. */
export function forceMonoDiscrete(node: AudioNode): void {
  setChannelConfig(node, 1, 'discrete')
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

export function createStereoStage(ctx: BaseAudioContext): StereoStage {
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
  // Identity routing. A GainNode defaults to 1, and a mono file is upmixed
  // onto both splitter inputs — leaving the cross terms at 1 sums that copy
  // into the left output until the first ramp finishes.
  leftToR.gain.value = 0
  rightToL.gain.value = 0
  const merge = ctx.createChannelMerger(2)
  const panner = ctx.createStereoPanner()
  const output = ctx.createGain()

  input.connect(makeup)
  forceStereoDiscrete(makeup)
  for (const tap of [leftLevel, rightLevel, leftPol, rightPol, leftToL, leftToR, rightToL, rightToR]) {
    forceMonoDiscrete(tap)
  }
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
  _smoothing: number,
): void {
  const route = stereoRouteGains(params.mono, params.sourceChannels ?? 2)
  const pol = params.invert ? -1 : 1
  setSmoothedAudioParam(stage.makeup.gain, dbToGain(params.gainDb), now, 'gain')
  setSmoothedAudioParam(stage.leftLevel.gain, dbToGain(params.leftDb), now, 'gain')
  setSmoothedAudioParam(stage.rightLevel.gain, dbToGain(params.rightDb), now, 'gain')
  setSmoothedAudioParam(stage.leftPol.gain, pol, now, 'gain')
  setSmoothedAudioParam(stage.rightPol.gain, pol, now, 'gain')
  setSmoothedAudioParam(stage.leftToL.gain, route.leftToL, now, 'gain')
  setSmoothedAudioParam(stage.leftToR.gain, route.leftToR, now, 'gain')
  setSmoothedAudioParam(stage.rightToL.gain, route.rightToL, now, 'gain')
  setSmoothedAudioParam(stage.rightToR.gain, route.rightToR, now, 'gain')
  setSmoothedAudioParam(stage.panner.pan, panNorm(params.pan), now, 'pan')
  setSmoothedAudioParam(stage.output.gain, 1, now, 'gain')
}

/** Equal-power pan used by the stereo stage, as linear lane gains. */
export function equalPowerPanGains(panPct: number): { left: number; right: number } {
  const theta = ((panNorm(panPct) + 1) / 2) * (Math.PI / 2)
  return { left: Math.cos(theta), right: Math.sin(theta) }
}

/**
 * How many waveform lanes to draw, and the amplitude scale for each.
 * Make stereo duplicates a mono file onto L/R; pan and balance scale the lanes.
 */
export function waveformLaneLayout(opts: {
  foldMono: boolean
  stereoLayout: boolean
  sourceChannels: number
  panPct: number
  leftDb: number
  rightDb: number
}): { lanes: 1 | 2; gains: [number, number] } {
  if (opts.foldMono) return { lanes: 1, gains: [1, 1] }
  const stereo = opts.stereoLayout || opts.sourceChannels >= 2
  if (!stereo) return { lanes: 1, gains: [1, 1] }
  const pan = equalPowerPanGains(opts.panPct)
  return {
    lanes: 2,
    gains: [dbToGain(opts.leftDb) * pan.left, dbToGain(opts.rightDb) * pan.right],
  }
}

