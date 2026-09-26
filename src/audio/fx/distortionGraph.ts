import { dbToGain } from '../parameters/mapping'
import { webAudioBiquadQ } from '../engine/eqBands'
import type { ParamId } from '../parameters/types'
import {
  defaultDistortionProcState,
  makeDistortionCurve,
  noiseSlewCoeff,
  processDistortionBuffer,
  toneToFilters,
  type DistortionProcState,
} from './distortion'
import { distortionTypeProfile } from './distortionProfiles'
import { setShaperCurve } from './shaperCurve'
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
  ctx: BaseAudioContext,
  wet: GainNode,
  output: GainNode,
): DistortionGraph {
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 30
  hp.Q.value = webAudioBiquadQ('highpass', 0.5)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 14000
  lp.Q.value = webAudioBiquadQ('lowpass', 0.5)
  const pre = ctx.createGain()
  pre.gain.value = 1
  const shaper = ctx.createWaveShaper()
  shaper.oversample = '2x'
  const proc = ctx.createScriptProcessor(256, 2, 2)
  const post = ctx.createGain()
  post.gain.value = 1
  const state = defaultDistortionProcState()
  proc.onaudioprocess = (event) => {
    const input = event.inputBuffer
    const outputBuf = event.outputBuffer
    const outL = outputBuf.getChannelData(0)
    const outR = outputBuf.numberOfChannels > 1 ? outputBuf.getChannelData(1) : outL
    processDistortionBuffer(
      input.getChannelData(0),
      input.numberOfChannels > 1 ? input.getChannelData(1) : input.getChannelData(0),
      outL,
      outR,
      state,
    )
    // Some offline engines hand out channel copies. copyToChannel commits the block.
    outputBuf.copyToChannel(outL, 0)
    if (outputBuf.numberOfChannels > 1 && outR !== outL) outputBuf.copyToChannel(outR, 1)
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
  sampleRate = 48000,
  noiseMuted = false,
  noiseFadeTauSec = 0.02,
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
    setShaperCurve(g.shaper, key, makeDistortionCurve(type, drive, bias))
    g.shaper.oversample = type === 'digital' || type === 'clip' || type === 'fold' ? '4x' : '2x'
  }
  g.state.bits = params.distortionBits
  g.state.hold = params.distortionDownsample
  g.state.noise = noiseMuted ? 0 : params.distortionNoise / 100
  g.state.noiseSlew = noiseSlewCoeff(sampleRate, noiseFadeTauSec)
  g.state.noiseKind = noiseKind
  const out = dbToGain(params.distortionOutput)
  g.post.gain.setTargetAtTime(out, now, smoothing)
}
