import type { ParamId } from '../parameters/types'
import { rampAudioParamLinear, setSmoothedAudioParam } from '../engine/paramSmooth'
import { webAudioBiquadQ } from '../engine/eqBands'
import {
  delayFeedbackGains,
  delayFlutterSeconds,
  delayInputTapGains,
  delayLoopFilters,
  delayLoopGain,
  delayModSeconds,
  delayWowSeconds,
} from './delayLoop'
import {
  delayChannelSendLevels,
  delaySendLevels,
  reverbSendLevels,
  makeAbsCurve,
  sideGainFromWidth,
  stereoInputMix,
} from './dryWet'
import { fillReverbImpulse, impulseLengthSec, type ImpulseSpec } from './impulse'
import { delayChannelTimeSeconds, delayTimeSeconds, isDelayStereo, isReverbStereo } from './spaceModel'
import { reverbWetOutputGain } from './reverbLevel'
import { reverbLoopGains } from './reverbLoop'
import { syncedDelayMs } from './sync'
import { createClickSafeShaper, type ClickSafeShaper } from './shaperCurve'
import { createConvolverPair, setConvolverPairBuffer, type ConvolverPair } from '../engine/convolverCrossfade'
import { noteDivisionAt, noteKindAt, type DelayType, type ReverbType } from './types'

const DELAY_MAX = 12

export type DelayGraph = {
  freezeIn: GainNode
  delayL: DelayNode
  delayR: DelayNode
  tapA: DelayNode
  tapB: DelayNode
  tapAGain: GainNode
  tapBGain: GainNode
  fbL: GainNode
  fbR: GainNode
  pingToL: GainNode
  pingToR: GainNode
  hpL: BiquadFilterNode
  hpR: BiquadFilterNode
  lpL: BiquadFilterNode
  lpR: BiquadFilterNode
  driveL: ClickSafeShaper
  driveR: ClickSafeShaper
  duckAmt: GainNode
  pan: StereoPannerNode
  widthSide: GainNode
  out: GainNode
  chanDryL: GainNode
  chanDryR: GainNode
  chanWetL: GainNode
  chanWetR: GainNode
  reverse: ConvolverPair
  reverseMix: GainNode
  reverseDirect: GainNode
  allpass: BiquadFilterNode[]
  diffDry: GainNode
  diffWet: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  lfoInv: GainNode
  wow: OscillatorNode
  wowGain: GainNode
  flutter: OscillatorNode
  flutterGain: GainNode
  drift: OscillatorNode
  driftGain: GainNode
  pitchDelay: DelayNode
  pitchLfo: OscillatorNode
  pitchDepth: GainNode
  pitchMixL: GainNode
  pitchMixR: GainNode
  reverseKey: string
}

export type ReverbGraph = {
  freezeIn: GainNode
  inKeepL: GainNode
  inKeepR: GainNode
  inCrossL: GainNode
  inCrossR: GainNode
  predelayL: DelayNode
  predelayR: DelayNode
  early: DelayNode
  earlyGain: GainNode
  conv: ConvolverPair
  tankFb: GainNode
  tankDelayL: DelayNode
  tankDelayR: DelayNode
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  damp: BiquadFilterNode
  tiltLow: BiquadFilterNode
  tiltHigh: BiquadFilterNode
  drive: ClickSafeShaper
  duckAmt: GainNode
  gate: DynamicsCompressorNode
  limit: DynamicsCompressorNode
  pan: StereoPannerNode
  widthSide: GainNode
  out: GainNode
  lfo: OscillatorNode
  lfoInv: GainNode
  lfoGain: GainNode
  lfoGainR: GainNode
  shimmerDelay: DelayNode
  shimmerMix: GainNode
  shimmerLfo: OscillatorNode
  shimmerDepth: GainNode
}

/** Identity when Drive is off — a tanh at 0 still aliases and hisses in a loop. */
export function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const amt = Math.min(1, Math.max(0, amount))
  if (amt <= 0.008) {
    for (let i = 0; i < n; i++) curve[i] = (i / (n - 1)) * 2 - 1
    return curve
  }
  const k = 1 + amt * 6
  const denom = Math.tanh(k)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = denom === 0 ? x : Math.tanh(k * x) / denom
  }
  return curve
}

function connectMidSide(ctx: BaseAudioContext, source: AudioNode, destination: AudioNode): GainNode {
  const split = ctx.createChannelSplitter(2)
  const merge = ctx.createChannelMerger(2)
  const midL = ctx.createGain()
  const midR = ctx.createGain()
  const sideL = ctx.createGain()
  const sideR = ctx.createGain()
  const mid = ctx.createGain()
  const side = ctx.createGain()
  const sideInv = ctx.createGain()
  midL.gain.value = 0.5
  midR.gain.value = 0.5
  sideL.gain.value = 0.5
  sideR.gain.value = -0.5
  side.gain.value = 1
  sideInv.gain.value = -1
  source.connect(split)
  split.connect(midL, 0)
  split.connect(midR, 1)
  split.connect(sideL, 0)
  split.connect(sideR, 1)
  midL.connect(mid)
  midR.connect(mid)
  sideL.connect(side)
  sideR.connect(side)
  mid.connect(merge, 0, 0)
  mid.connect(merge, 0, 1)
  side.connect(merge, 0, 0)
  side.connect(sideInv)
  sideInv.connect(merge, 0, 1)
  merge.connect(destination)
  return side
}

function makeLoopFilter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = frequency
  f.Q.value = webAudioBiquadQ(type, 0.5)
  return f
}

export function createDelayGraph(
  ctx: BaseAudioContext,
  wet: GainNode,
  output: GainNode,
  dryTap: AudioNode,
): DelayGraph {
  const freezeIn = ctx.createGain()
  freezeIn.channelCount = 2
  freezeIn.channelCountMode = 'explicit'
  freezeIn.channelInterpretation = 'speakers'
  const split = ctx.createChannelSplitter(2)
  const merge = ctx.createChannelMerger(2)
  const delayL = ctx.createDelay(DELAY_MAX)
  const delayR = ctx.createDelay(DELAY_MAX)
  const tapA = ctx.createDelay(DELAY_MAX)
  const tapB = ctx.createDelay(DELAY_MAX)
  const tapAGain = ctx.createGain()
  const tapBGain = ctx.createGain()
  tapAGain.gain.value = 0
  tapBGain.gain.value = 0
  const fbL = ctx.createGain()
  const fbR = ctx.createGain()
  const pingToL = ctx.createGain()
  const pingToR = ctx.createGain()
  pingToL.gain.value = 0
  pingToR.gain.value = 0
  const hpL = makeLoopFilter(ctx, 'highpass', 20)
  const hpR = makeLoopFilter(ctx, 'highpass', 20)
  const lpL = makeLoopFilter(ctx, 'lowpass', 12000)
  const lpR = makeLoopFilter(ctx, 'lowpass', 12000)
  const driveL = createClickSafeShaper(ctx)
  const driveR = createClickSafeShaper(ctx)
  driveL.oversample = '2x'
  driveR.oversample = '2x'
  const duckAmt = ctx.createGain()
  duckAmt.gain.value = 0
  const pan = ctx.createStereoPanner()
  const out = ctx.createGain()
  out.gain.value = 1
  const reverse = createConvolverPair(ctx, false)
  const reverseMix = ctx.createGain()
  reverseMix.gain.value = 0
  const reverseDirect = ctx.createGain()
  reverseDirect.gain.value = 1
  const allpass: BiquadFilterNode[] = []
  for (let i = 0; i < 3; i++) {
    const ap = ctx.createBiquadFilter()
    ap.type = 'allpass'
    ap.frequency.value = 600 + i * 900
    ap.Q.value = 0.4
    allpass.push(ap)
  }
  const diffDry = ctx.createGain()
  const diffWet = ctx.createGain()
  diffDry.gain.value = 1
  diffWet.gain.value = 0
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.4
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0
  const lfoInv = ctx.createGain()
  lfoInv.gain.value = -1
  const wow = ctx.createOscillator()
  wow.frequency.value = 0.55
  const wowGain = ctx.createGain()
  wowGain.gain.value = 0
  const flutter = ctx.createOscillator()
  flutter.frequency.value = 12
  const flutterGain = ctx.createGain()
  flutterGain.gain.value = 0
  const drift = ctx.createOscillator()
  drift.type = 'triangle'
  drift.frequency.value = 0.12
  const driftGain = ctx.createGain()
  driftGain.gain.value = 0
  const pitchDelay = ctx.createDelay(0.09)
  pitchDelay.delayTime.value = 0.03
  const pitchLfo = ctx.createOscillator()
  pitchLfo.type = 'sawtooth'
  pitchLfo.frequency.value = 6
  const pitchDepth = ctx.createGain()
  pitchDepth.gain.value = 0
  const pitchMixL = ctx.createGain()
  const pitchMixR = ctx.createGain()
  pitchMixL.gain.value = 0
  pitchMixR.gain.value = 0

  // Stereo split: each DelayNode is mono, so feeding both from a stereo bus
  // would downmix L+R twice and then sum them again in the loop.
  wet.connect(freezeIn)
  freezeIn.connect(split)
  split.connect(delayL, 0)
  split.connect(delayR, 1)

  // First tap is the delayed dry; loop filters only color later repeats.
  delayL.connect(merge, 0, 0)
  delayR.connect(merge, 0, 1)

  delayL.connect(hpL)
  hpL.connect(lpL)
  lpL.connect(driveL.input)
  delayR.connect(hpR)
  hpR.connect(lpR)
  lpR.connect(driveR.input)

  driveL.output.connect(fbL)
  driveL.output.connect(pingToR)
  driveR.output.connect(fbR)
  driveR.output.connect(pingToL)
  fbL.connect(delayL)
  fbR.connect(delayR)
  pingToL.connect(delayL)
  pingToR.connect(delayR)

  driveL.output.connect(pitchDelay)
  pitchDelay.connect(pitchMixL)
  pitchDelay.connect(pitchMixR)
  pitchMixL.connect(delayL)
  pitchMixR.connect(delayR)

  // Extra taps from the input (not stacked on the delay output).
  freezeIn.connect(tapA)
  freezeIn.connect(tapB)
  tapA.connect(tapAGain)
  tapB.connect(tapBGain)
  tapAGain.connect(merge, 0, 0)
  tapBGain.connect(merge, 0, 1)

  merge.connect(diffDry)
  let node: AudioNode = merge
  for (const ap of allpass) {
    node.connect(ap)
    node = ap
  }
  node.connect(diffWet)
  diffDry.connect(reverseDirect)
  diffWet.connect(reverseDirect)
  freezeIn.connect(reverse.input)
  reverse.output.connect(reverseMix)
  reverseDirect.connect(pan)
  reverseMix.connect(pan)
  const duckGain = ctx.createGain()
  duckGain.gain.value = 1
  const widthSide = connectMidSide(ctx, pan, duckGain)
  duckGain.connect(out)
  const wetSplit = ctx.createChannelSplitter(2)
  const drySplit = ctx.createChannelSplitter(2)
  const chanMerge = ctx.createChannelMerger(2)
  const chanDryL = ctx.createGain()
  const chanDryR = ctx.createGain()
  const chanWetL = ctx.createGain()
  const chanWetR = ctx.createGain()
  chanDryL.gain.value = 0
  chanDryR.gain.value = 0
  chanWetL.gain.value = 1
  chanWetR.gain.value = 1
  out.connect(wetSplit)
  wetSplit.connect(chanWetL, 0)
  wetSplit.connect(chanWetR, 1)
  dryTap.connect(drySplit)
  drySplit.connect(chanDryL, 0)
  drySplit.connect(chanDryR, 1)
  chanWetL.connect(chanMerge, 0, 0)
  chanDryL.connect(chanMerge, 0, 0)
  chanWetR.connect(chanMerge, 0, 1)
  chanDryR.connect(chanMerge, 0, 1)
  chanMerge.connect(output)

  const abs = ctx.createWaveShaper()
  abs.curve = makeAbsCurve()
  const env = ctx.createBiquadFilter()
  env.type = 'lowpass'
  env.frequency.value = 14
  env.Q.value = webAudioBiquadQ('lowpass', 0.7)
  dryTap.connect(abs)
  abs.connect(env)
  env.connect(duckAmt)
  duckAmt.connect(duckGain.gain)

  lfo.connect(lfoGain)
  lfoGain.connect(lfoInv)
  wow.connect(wowGain)
  flutter.connect(flutterGain)
  drift.connect(driftGain)
  pitchLfo.connect(pitchDepth)
  lfoGain.connect(delayL.delayTime)
  lfoInv.connect(delayR.delayTime)
  wowGain.connect(delayL.delayTime)
  wowGain.connect(delayR.delayTime)
  flutterGain.connect(delayL.delayTime)
  flutterGain.connect(delayR.delayTime)
  driftGain.connect(delayL.delayTime)
  driftGain.connect(delayR.delayTime)
  pitchDepth.connect(pitchDelay.delayTime)
  try {
    lfo.start()
    wow.start()
    flutter.start()
    drift.start()
    pitchLfo.start()
  } catch {
    /* already started */
  }

  return {
    freezeIn,
    delayL,
    delayR,
    tapA,
    tapB,
    tapAGain,
    tapBGain,
    fbL,
    fbR,
    pingToL,
    pingToR,
    hpL,
    hpR,
    lpL,
    lpR,
    driveL,
    driveR,
    duckAmt,
    pan,
    widthSide,
    out,
    chanDryL,
    chanDryR,
    chanWetL,
    chanWetR,
    reverse,
    reverseMix,
    reverseDirect,
    allpass,
    diffDry,
    diffWet,
    lfo,
    lfoGain,
    lfoInv,
    wow,
    wowGain,
    flutter,
    flutterGain,
    drift,
    driftGain,
    pitchDelay,
    pitchLfo,
    pitchDepth,
    pitchMixL,
    pitchMixR,
    reverseKey: '',
  }
}

export function applyDelayGraph(
  g: DelayGraph,
  params: Record<ParamId, number>,
  type: DelayType,
  bpm: number,
  now: number,
  _smoothing: number,
  ctx: BaseAudioContext,
  /**
   * WaveShaper curves and the reverse convolver are not AudioParams.
   * Assigning them on every automation step only keeps the last value and,
   * offline, rebuilds those buffers on the main thread. Live updates pass true.
   */
  commitStatic = true,
): void {
  const stereo = isDelayStereo(params)
  const timeL = delayChannelTimeSeconds(params, bpm, 'L')
  const timeR = stereo ? delayChannelTimeSeconds(params, bpm, 'R') : timeL
  const time = delayTimeSeconds(params, bpm)
  const offset = stereo ? 0 : (params.delayOffset / 100) * time * 0.85
  const tL = Math.min(DELAY_MAX - 0.05, Math.max(0.0008, timeL - offset))
  const tR = Math.min(DELAY_MAX - 0.05, Math.max(0.0008, timeR + offset))
  setSmoothedAudioParam(g.delayL.delayTime, tL, now, 'delayTime')
  setSmoothedAudioParam(g.delayR.delayTime, tR, now, 'delayTime')
  setSmoothedAudioParam(g.tapA.delayTime, Math.min(DELAY_MAX - 0.05, time * 0.5), now, 'delayTime')
  setSmoothedAudioParam(g.tapB.delayTime, Math.min(DELAY_MAX - 0.05, time * 0.75), now, 'delayTime')
  const taps = delayInputTapGains(type)
  setSmoothedAudioParam(g.tapAGain.gain, taps.tapA, now, 'gain')
  setSmoothedAudioParam(g.tapBGain.gain, taps.tapB, now, 'gain')

  const freeze = params.delayFreeze > 0.5
  setSmoothedAudioParam(g.freezeIn.gain, freeze ? 0.0001 : 1, now, 'gain')
  const loopType = stereo ? type : type === 'pingPong' ? 'digital' : type
  const fbR = stereo ? params.delayFeedbackR : params.delayFeedback
  const fb = delayFeedbackGains(params.delayFeedback, loopType, freeze, params.delayPitch, fbR)
  const mixL = delayChannelSendLevels(params, 'L', stereo)
  const mixR = delayChannelSendLevels(params, 'R', stereo)
  if (stereo) {
    setSmoothedAudioParam(g.chanDryL.gain, mixL.dry, now, 'gain')
    setSmoothedAudioParam(g.chanDryR.gain, mixR.dry, now, 'gain')
    setSmoothedAudioParam(g.chanWetL.gain, mixL.wet, now, 'gain')
    setSmoothedAudioParam(g.chanWetR.gain, mixR.wet, now, 'gain')
  } else {
    setSmoothedAudioParam(g.chanDryL.gain, 0, now, 'gain')
    setSmoothedAudioParam(g.chanDryR.gain, 0, now, 'gain')
    setSmoothedAudioParam(g.chanWetL.gain, 1, now, 'gain')
    setSmoothedAudioParam(g.chanWetR.gain, 1, now, 'gain')
  }
  setSmoothedAudioParam(g.fbL.gain, fb.fbL, now, 'gain')
  setSmoothedAudioParam(g.fbR.gain, fb.fbR, now, 'gain')
  setSmoothedAudioParam(g.pingToL.gain, fb.pingToL, now, 'gain')
  setSmoothedAudioParam(g.pingToR.gain, fb.pingToR, now, 'gain')
  setSmoothedAudioParam(g.pitchMixL.gain, loopType === 'pingPong' ? 0 : fb.pitchMix, now, 'gain')
  setSmoothedAudioParam(g.pitchMixR.gain, loopType === 'pingPong' ? fb.pitchMix : 0, now, 'gain')

  const loop = delayLoopFilters(params.delayHp, params.delayLp, params.delayFeedback, type)
  setSmoothedAudioParam(g.hpL.frequency, loop.hp, now, 'frequency')
  setSmoothedAudioParam(g.hpR.frequency, loop.hp, now, 'frequency')
  setSmoothedAudioParam(g.lpL.frequency, loop.lp, now, 'frequency')
  setSmoothedAudioParam(g.lpR.frequency, loop.lp, now, 'frequency')
  setSmoothedAudioParam(g.hpL.Q, webAudioBiquadQ('highpass', loop.q), now, 'q')
  setSmoothedAudioParam(g.hpR.Q, webAudioBiquadQ('highpass', loop.q), now, 'q')
  setSmoothedAudioParam(g.lpL.Q, webAudioBiquadQ('lowpass', loop.q), now, 'q')
  setSmoothedAudioParam(g.lpR.Q, webAudioBiquadQ('lowpass', loop.q), now, 'q')
  if (commitStatic) {
    const driveKey = (params.delayDrive / 100).toFixed(4)
    const curve = makeDriveCurve(params.delayDrive / 100)
    g.driveL.setCurve(driveKey, curve, now)
    g.driveR.setCurve(driveKey, curve, now)
  }

  setSmoothedAudioParam(g.lfo.frequency, params.delayModRate, now, 'frequency')
  setSmoothedAudioParam(g.lfoGain.gain, delayModSeconds(time, params.delayModDepth / 100), now, 'gain')
  setSmoothedAudioParam(g.wowGain.gain, delayWowSeconds(time, params.delayWow / 100), now, 'gain')
  setSmoothedAudioParam(g.flutterGain.gain, delayFlutterSeconds(time, params.delayFlutter / 100), now, 'gain')
  setSmoothedAudioParam(g.driftGain.gain, (params.delayDrift / 100) * time * 0.01, now, 'gain')

  setSmoothedAudioParam(g.pan.pan, Math.max(-1, Math.min(1, params.delayPan / 100)), now, 'pan')
  setSmoothedAudioParam(g.widthSide.gain, stereo ? sideGainFromWidth(params.delayWidth) : 0, now, 'gain')
  setSmoothedAudioParam(g.duckAmt.gain, -(params.delayDuck / 100) * 0.92, now, 'gain')
  setSmoothedAudioParam(g.pitchLfo.frequency, 3 + Math.abs(params.delayPitch) * 0.35, now, 'frequency')
  setSmoothedAudioParam(g.pitchDepth.gain, fb.pitchMix > 0.001 ? 0.01 : 0, now, 'gain')

  setSmoothedAudioParam(g.out.gain, 1, now, 'gain')
  const reverseAmt = type === 'reverse' ? Math.max(params.delayReverse / 100, 0.7) : params.delayReverse / 100
  setSmoothedAudioParam(g.reverseMix.gain, reverseAmt * 0.55, now, 'gain')
  setSmoothedAudioParam(g.reverseDirect.gain, 1 - reverseAmt * 0.45, now, 'gain')
  if (commitStatic && reverseAmt > 0.05) {
    const key = `${time.toFixed(3)}:${params.delayFeedback.toFixed(0)}`
    if (g.reverseKey !== key) {
      g.reverseKey = key
      const ir = buildDelayReverseIr(ctx, time, params.delayFeedback)
      if (ir) setConvolverPairBuffer(g.reverse, ir, now)
    }
  }

  const diff = Math.min(1, (type === 'diffuse' ? 0.4 : 0) + params.delayDiffusion / 100)
  setSmoothedAudioParam(g.diffWet.gain, diff * 0.55, now, 'gain')
  setSmoothedAudioParam(g.diffDry.gain, 1 - diff * 0.25, now, 'gain')
  for (let i = 0; i < g.allpass.length; i++) {
    setSmoothedAudioParam(g.allpass[i]!.Q, 0.3 + diff * 2.2, now, 'q')
    setSmoothedAudioParam(g.allpass[i]!.frequency, 400 + i * 700 + diff * 800, now, 'frequency')
  }
}

function buildDelayReverseIr(ctx: BaseAudioContext, time: number, feedbackPct: number): AudioBuffer | null {
  const taps = 6
  const sr = ctx.sampleRate
  const seconds = Math.min(4, Math.max(0.2, time * taps * 0.7))
  const n = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(2, n, sr)
  const fb = delayLoopGain(feedbackPct)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let t = 1; t <= taps; t++) {
      const start = Math.min(n - 2, Math.floor(time * t * sr * 0.85))
      const len = Math.min(n - start, Math.floor(sr * Math.min(0.35, time * 0.5)))
      let g = 0.45 * fb ** (t - 1)
      for (let i = 0; i < len; i++) {
        const env = i / len
        const noise = Math.sin((i + ch * 19 + t * 8) * 12.9898) * 0.0000001
        data[start + i]! += (env * 2 - 1) * g * 0.002 + noise
        data[start + i]! += (Math.random() * 2 - 1) * env * g * 0.15
      }
    }
  }
  return buf
}

export function createReverbGraph(
  ctx: BaseAudioContext,
  wet: GainNode,
  output: GainNode,
  dryTap: AudioNode,
): ReverbGraph {
  const freezeIn = ctx.createGain()
  const inSplit = ctx.createChannelSplitter(2)
  const inKeepL = ctx.createGain()
  const inKeepR = ctx.createGain()
  const inCrossL = ctx.createGain()
  const inCrossR = ctx.createGain()
  const inMerge = ctx.createChannelMerger(2)
  const preSplit = ctx.createChannelSplitter(2)
  const predelayL = ctx.createDelay(2)
  const predelayR = ctx.createDelay(2)
  const preMerge = ctx.createChannelMerger(2)
  const early = ctx.createDelay(0.25)
  const earlyGain = ctx.createGain()
  const conv = createConvolverPair(ctx, false)
  const tankSplit = ctx.createChannelSplitter(2)
  const tankDelayL = ctx.createDelay(0.45)
  const tankDelayR = ctx.createDelay(0.45)
  const tankMerge = ctx.createChannelMerger(2)
  const tankFb = ctx.createGain()
  tankFb.gain.value = 0
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.Q.value = webAudioBiquadQ('highpass', Math.SQRT1_2)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = webAudioBiquadQ('lowpass', Math.SQRT1_2)
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  damp.Q.value = webAudioBiquadQ('lowpass', Math.SQRT1_2)
  const tiltLow = ctx.createBiquadFilter()
  tiltLow.type = 'lowshelf'
  tiltLow.frequency.value = 180
  const tiltHigh = ctx.createBiquadFilter()
  tiltHigh.type = 'highshelf'
  tiltHigh.frequency.value = 4200
  const drive = createClickSafeShaper(ctx)
  drive.oversample = '2x'
  const duckAmt = ctx.createGain()
  duckAmt.gain.value = 0
  const gate = ctx.createDynamicsCompressor()
  const limit = ctx.createDynamicsCompressor()
  const pan = ctx.createStereoPanner()
  const out = ctx.createGain()
  out.gain.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.35
  const lfoInv = ctx.createGain()
  lfoInv.gain.value = -1
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0
  const lfoGainR = ctx.createGain()
  lfoGainR.gain.value = 0
  const shimmerDelay = ctx.createDelay(0.08)
  shimmerDelay.delayTime.value = 0.028
  const shimmerMix = ctx.createGain()
  shimmerMix.gain.value = 0
  const shimmerLfo = ctx.createOscillator()
  shimmerLfo.type = 'sawtooth'
  shimmerLfo.frequency.value = 8
  const shimmerDepth = ctx.createGain()
  shimmerDepth.gain.value = 0

  wet.connect(freezeIn)
  freezeIn.connect(inSplit)
  inSplit.connect(inKeepL, 0)
  inSplit.connect(inCrossR, 0)
  inSplit.connect(inKeepR, 1)
  inSplit.connect(inCrossL, 1)
  inKeepL.connect(inMerge, 0, 0)
  inCrossL.connect(inMerge, 0, 0)
  inKeepR.connect(inMerge, 0, 1)
  inCrossR.connect(inMerge, 0, 1)
  inMerge.connect(preSplit)
  preSplit.connect(predelayL, 0)
  preSplit.connect(predelayR, 1)
  predelayL.connect(preMerge, 0, 0)
  predelayR.connect(preMerge, 0, 1)
  preMerge.connect(early)
  early.connect(earlyGain)
  earlyGain.connect(conv.input)
  preMerge.connect(conv.input)
  conv.output.connect(tankSplit)
  tankSplit.connect(tankDelayL, 0)
  tankSplit.connect(tankDelayR, 1)
  tankDelayL.connect(tankMerge, 0, 0)
  tankDelayR.connect(tankMerge, 0, 1)
  tankMerge.connect(tankFb)
  tankFb.connect(conv.input)
  conv.output.connect(hp)
  hp.connect(lp)
  lp.connect(damp)
  damp.connect(tiltLow)
  tiltLow.connect(tiltHigh)
  tiltHigh.connect(drive.input)
  tiltHigh.connect(shimmerDelay)
  shimmerDelay.connect(shimmerMix)
  shimmerMix.connect(pan)
  drive.output.connect(gate)
  gate.connect(limit)
  limit.connect(pan)
  const duckGain = ctx.createGain()
  duckGain.gain.value = 1
  const widthSide = connectMidSide(ctx, pan, duckGain)
  duckGain.connect(out)
  out.connect(output)
  lfo.connect(lfoGain)
  lfo.connect(lfoInv)
  lfoInv.connect(lfoGainR)
  lfoGain.connect(predelayL.delayTime)
  lfoGainR.connect(predelayR.delayTime)
  shimmerLfo.connect(shimmerDepth)
  shimmerDepth.connect(shimmerDelay.delayTime)

  const abs = ctx.createWaveShaper()
  abs.curve = makeAbsCurve()
  const env = ctx.createBiquadFilter()
  env.type = 'lowpass'
  env.frequency.value = 12
  env.Q.value = webAudioBiquadQ('lowpass', 0.7)
  dryTap.connect(abs)
  abs.connect(env)
  env.connect(duckAmt)
  duckAmt.connect(duckGain.gain)

  try {
    lfo.start()
    shimmerLfo.start()
  } catch {
    /* already started */
  }

  return {
    freezeIn,
    inKeepL,
    inKeepR,
    inCrossL,
    inCrossR,
    predelayL,
    predelayR,
    early,
    earlyGain,
    conv,
    tankFb,
    tankDelayL,
    tankDelayR,
    hp,
    lp,
    damp,
    tiltLow,
    tiltHigh,
    drive,
    duckAmt,
    gate,
    limit,
    pan,
    widthSide,
    out,
    lfo,
    lfoInv,
    lfoGain,
    lfoGainR,
    shimmerDelay,
    shimmerMix,
    shimmerLfo,
    shimmerDepth,
  }
}

export function reverbImpulseKey(
  params: Record<ParamId, number>,
  type: ReverbType,
): string {
  return [
    type,
    params.reverbSize.toFixed(0),
    params.reverbDecay.toFixed(2),
    params.reverbDiffusion.toFixed(0),
    params.reverbDensity.toFixed(0),
    params.reverbEarly.toFixed(0),
    params.reverbReverse.toFixed(0),
    params.reverbShimmer.toFixed(0),
    params.reverbShimmerPitch.toFixed(0),
    params.reverbColor.toFixed(0),
    params.reverbFreeze > 0.5 ? 1 : 0,
  ].join('|')
}

export function buildReverbBuffer(
  ctx: BaseAudioContext,
  params: Record<ParamId, number>,
  type: ReverbType,
): AudioBuffer {
  const spec: ImpulseSpec = {
    type,
    sampleRate: ctx.sampleRate,
    decaySec: params.reverbDecay,
    size: params.reverbSize / 100,
    diffusion: params.reverbDiffusion / 100,
    density: params.reverbDensity / 100,
    early: params.reverbEarly / 100,
    damping: 1 - Math.min(1, params.reverbDamping / 18000),
    reverse: params.reverbReverse / 100,
    shimmer: params.reverbShimmer / 100,
    shimmerPitch: params.reverbShimmerPitch,
    color: params.reverbColor / 100,
    freeze: params.reverbFreeze > 0.5,
  }
  const seconds = impulseLengthSec(spec)
  const n = Math.max(64, Math.floor(ctx.sampleRate * seconds))
  const buf = ctx.createBuffer(2, n, ctx.sampleRate)
  fillReverbImpulse(buf.getChannelData(0), buf.getChannelData(1), spec)
  return buf
}

export function applyReverbGraph(
  g: ReverbGraph,
  params: Record<ParamId, number>,
  type: ReverbType,
  bpm: number,
  now: number,
  _smoothing: number,
  /** See applyDelayGraph. The drive curve is not automated in time. */
  commitStatic = true,
): void {
  const pre =
    params.reverbSync > 0.5
      ? Math.min(1.8, syncedDelayMs(bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)) / 1000)
      : Math.min(1.8, params.reverbPredelay / 1000)
  const dist = params.reverbDistance / 100
  const stereo = isReverbStereo(params)
  const basePre = Math.max(0.0002, pre + dist * 0.05)
  const offset = stereo ? (params.reverbOffset / 100) * basePre * 0.9 : 0
  setSmoothedAudioParam(g.predelayL.delayTime, Math.max(0.0002, basePre - offset), now, 'delayTime')
  setSmoothedAudioParam(g.predelayR.delayTime, Math.max(0.0002, Math.min(1.95, basePre + offset)), now, 'delayTime')
  setSmoothedAudioParam(g.early.delayTime, 0.01 + dist * 0.035 + params.reverbSize / 3500, now, 'delayTime')
  setSmoothedAudioParam(g.earlyGain.gain, (params.reverbEarly / 100) * 0.35 * (1 - dist * 0.3), now, 'gain')

  const input = stereoInputMix(stereo ? params.reverbInput : 0)
  setSmoothedAudioParam(g.inKeepL.gain, input.keep, now, 'gain')
  setSmoothedAudioParam(g.inKeepR.gain, input.keep, now, 'gain')
  setSmoothedAudioParam(g.inCrossL.gain, input.cross, now, 'gain')
  setSmoothedAudioParam(g.inCrossR.gain, input.cross, now, 'gain')

  const freeze = params.reverbFreeze > 0.5 || type === 'infinite'
  setSmoothedAudioParam(g.freezeIn.gain, freeze ? 0.05 : 1, now, 'gain')
  const huge = type === 'cathedral' || type === 'largeHall' || type === 'cloud' || type === 'bloom' || type === 'infinite'
  const shimmerAmt = type === 'shimmer' ? Math.max(params.reverbShimmer / 100, 0.35) : params.reverbShimmer / 100
  const loop = reverbLoopGains({
    decaySec: params.reverbDecay,
    sizePct: params.reverbSize,
    shimmer01: shimmerAmt,
    huge,
    freeze,
  })
  setSmoothedAudioParam(g.tankFb.gain, loop.tank, now, 'gain')
  setSmoothedAudioParam(g.tankDelayL.delayTime, 0.062 + params.reverbSize / 420, now, 'delayTime')
  setSmoothedAudioParam(g.tankDelayR.delayTime, 0.089 + params.reverbSize / 310, now, 'delayTime')

  setSmoothedAudioParam(g.hp.frequency, params.reverbLowCut + dist * 80, now, 'frequency')
  setSmoothedAudioParam(g.lp.frequency, params.reverbHighCut * (1 - dist * 0.15), now, 'frequency')
  setSmoothedAudioParam(g.damp.frequency, params.reverbDamping, now, 'frequency')
  const color = params.reverbColor / 100
  setSmoothedAudioParam(g.tiltLow.gain, -color * 4, now, 'gain')
  setSmoothedAudioParam(g.tiltHigh.gain, color * 5, now, 'gain')
  if (commitStatic) {
    const driveKey = (params.reverbDrive / 100).toFixed(4)
    g.drive.setCurve(driveKey, makeDriveCurve(params.reverbDrive / 100), now)
  }
  setSmoothedAudioParam(g.out.gain, reverbWetOutputGain(params.reverbOutput, params.reverbDecay), now, 'gain')

  setSmoothedAudioParam(g.lfo.frequency, params.reverbModRate, now, 'frequency')
  const modSec = (params.reverbModDepth / 100) * (0.006 + basePre * 0.18)
  setSmoothedAudioParam(g.lfoGain.gain, modSec, now, 'gain')
  setSmoothedAudioParam(g.lfoGainR.gain, modSec, now, 'gain')

  setSmoothedAudioParam(g.duckAmt.gain, -(params.reverbDuck / 100) * 0.9, now, 'gain')
  let width = stereo ? params.reverbWidth : 0
  if (stereo && huge) width = Math.min(200, width * 1.06 + 6)
  setSmoothedAudioParam(g.widthSide.gain, sideGainFromWidth(width), now, 'gain')
  setSmoothedAudioParam(g.pan.pan, Math.max(-1, Math.min(1, params.reverbPan / 100)), now, 'pan')
  const shimmer = shimmerAmt
  setSmoothedAudioParam(g.shimmerMix.gain, loop.shimmer, now, 'gain')
  setSmoothedAudioParam(g.shimmerLfo.frequency, 5 + Math.abs(params.reverbShimmerPitch) * 0.4, now, 'frequency')
  setSmoothedAudioParam(g.shimmerDepth.gain, shimmer > 0.02 ? 0.01 : 0, now, 'gain')

  const gateAmt = type === 'gated' ? Math.max(params.reverbGate / 100, 0.55) : params.reverbGate / 100
  if (gateAmt < 0.02) {
    setSmoothedAudioParam(g.gate.threshold, 0, now, 'db')
    setSmoothedAudioParam(g.gate.ratio, 1, now, 'gain')
  } else {
    setSmoothedAudioParam(g.gate.threshold, params.reverbGateThres, now, 'db')
    setSmoothedAudioParam(g.gate.ratio, 1 + gateAmt * 18, now, 'gain')
    setSmoothedAudioParam(g.gate.attack, params.reverbGateAttack / 1000, now, 'time')
    setSmoothedAudioParam(g.gate.release, params.reverbGateRelease / 1000, now, 'time')
    setSmoothedAudioParam(g.gate.knee, 2, now, 'db')
  }

  setSmoothedAudioParam(g.limit.threshold, -1.5, now, 'db')
  setSmoothedAudioParam(g.limit.knee, 3, now, 'db')
  setSmoothedAudioParam(g.limit.ratio, 16, now, 'gain')
  setSmoothedAudioParam(g.limit.attack, 0.002, now, 'time')
  setSmoothedAudioParam(g.limit.release, 0.08, now, 'time')
}

export function wetDryFor(
  type: 'delay' | 'reverb',
  params: Record<ParamId, number>,
): { dry: number; wet: number; out: number } {
  if (type === 'reverb') {
    const send = reverbSendLevels(params)
    return { dry: send.dry, wet: send.wet, out: 1 }
  }
  const send = delaySendLevels(params)
  return { dry: send.dry, wet: send.wet, out: 1 }
}

function instantGain(param: AudioParam, now: number, value = 0): void {
  rampAudioParamLinear(param, value, now, 0.005)
}

function stopOsc(node: OscillatorNode): void {
  try {
    node.stop()
  } catch {
    /* already stopped */
  }
  try {
    node.disconnect()
  } catch {
    /* already disconnected */
  }
}

/** Cut feedback immediately so tails cannot self-oscillate after stop. */
export function silenceDelayGraph(g: DelayGraph, now: number): void {
  instantGain(g.fbL.gain, now)
  instantGain(g.fbR.gain, now)
  instantGain(g.pingToL.gain, now)
  instantGain(g.pingToR.gain, now)
  instantGain(g.tapAGain.gain, now)
  instantGain(g.tapBGain.gain, now)
  instantGain(g.reverseMix.gain, now)
  instantGain(g.pitchMixL.gain, now)
  instantGain(g.pitchMixR.gain, now)
  instantGain(g.diffWet.gain, now)
  instantGain(g.freezeIn.gain, now)
  instantGain(g.out.gain, now)
}

export function silenceReverbGraph(g: ReverbGraph, now: number): void {
  instantGain(g.tankFb.gain, now)
  instantGain(g.freezeIn.gain, now)
  instantGain(g.earlyGain.gain, now)
  instantGain(g.shimmerMix.gain, now)
  instantGain(g.out.gain, now)
}

export function stopDelayGraph(g: DelayGraph): void {
  silenceDelayGraph(g, 0)
  stopOsc(g.lfo)
  stopOsc(g.wow)
  stopOsc(g.flutter)
  stopOsc(g.drift)
  stopOsc(g.pitchLfo)
  try {
    g.out.disconnect()
  } catch {
    /* already disconnected */
  }
}

export function stopReverbGraph(g: ReverbGraph): void {
  silenceReverbGraph(g, 0)
  stopOsc(g.lfo)
  stopOsc(g.shimmerLfo)
  try {
    g.out.disconnect()
  } catch {
    /* already disconnected */
  }
}
