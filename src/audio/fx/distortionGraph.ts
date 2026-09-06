import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import {
  defaultDistortionProcState,
  makeDistortionCurve,
  processDistortionBuffer,
  toneToFilters,
  type DistortionProcState,
} from './distortion'
import { distortionTypeProfile } from './distortionProfiles'
import type { DistortionNoiseKind, DistortionType } from './types'

export type DistortionGraph = {
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  pre: GainNode
  shaper: WaveShaperNode
  proc: ScriptProcessorNode
  post: GainNode
  state: DistortionProcState
  curveKey: string
}

export function createDistortionGraph(
  ctx: AudioContext,
  wet: GainNode,
  output: GainNode,
): DistortionGraph {
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 30
  hp.Q.value = 0.5
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 14000
  lp.Q.value = 0.5
  const pre = ctx.createGain()
  pre.gain.value = 1
  const shaper = ctx.createWaveShaper()
  shaper.oversample = '2x'
  shaper.curve = makeDistortionCurve('saturation', 0, 0.5)
  const proc = ctx.createScriptProcessor(256, 2, 2)
  const post = ctx.createGain()
  post.gain.value = 1
  const state = defaultDistortionProcState()
  proc.onaudioprocess = (event) => {
    const input = event.inputBuffer
    const outputBuf = event.outputBuffer
    processDistortionBuffer(
      input.getChannelData(0),
      input.numberOfChannels > 1 ? input.getChannelData(1) : input.getChannelData(0),
      outputBuf.getChannelData(0),
      outputBuf.numberOfChannels > 1 ? outputBuf.getChannelData(1) : outputBuf.getChannelData(0),
      state,
    )
  }
  wet.connect(hp)
  hp.connect(lp)
  lp.connect(pre)
  pre.connect(shaper)
  shaper.connect(proc)
  proc.connect(post)
  post.connect(output)
  return { hp, lp, pre, shaper, proc, post, state, curveKey: '' }
}

export function stopDistortionGraph(g: DistortionGraph): void {
  g.proc.onaudioprocess = null
  try {
    g.proc.disconnect()
  } catch {
    /* already disconnected */
  }
}

export function applyDistortionGraph(
  g: DistortionGraph,
  params: Record<ParamId, number>,
  type: DistortionType,
  noiseKind: DistortionNoiseKind,
  now: number,
  smoothing: number,
): void {
  const profile = distortionTypeProfile(type)
  const tone = toneToFilters(params.distortionTone)
  const hp = Math.max(profile.hp * 0.35, tone.hp)
  const lp = Math.min(profile.lp * 1.15, tone.lp)
  g.hp.frequency.setTargetAtTime(hp, now, smoothing)
  g.lp.frequency.setTargetAtTime(lp, now, smoothing)
  const drive = params.saturation / 100
  const bias = params.distortionBias / 100
  const key = `${type}:${drive.toFixed(3)}:${bias.toFixed(3)}`
  if (key !== g.curveKey) {
    g.curveKey = key
    g.shaper.curve = makeDistortionCurve(type, drive, bias)
    g.shaper.oversample = type === 'digital' || type === 'clip' || type === 'fold' ? '4x' : '2x'
  }
  g.state.bits = params.distortionBits
  g.state.hold = params.distortionDownsample
  g.state.noise = params.distortionNoise / 100
  g.state.noiseKind = noiseKind
  const out = dbToGain(params.distortionOutput)
  g.post.gain.setTargetAtTime(out, now, smoothing)
}
