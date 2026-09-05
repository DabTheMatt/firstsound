import type { ParamId } from '../parameters/types'
import {
  equalPowerDryWet,
  makeAbsCurve,
  safeFeedbackGain,
  sideGainFromWidth,
  stereoInputMix,
} from './dryWet'
import { fillReverbImpulse, impulseLengthSec, type ImpulseSpec } from './impulse'
import { delayTimeSeconds } from './spaceModel'
import { syncedDelayMs } from './sync'
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
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  drive: WaveShaperNode
  clip: WaveShaperNode
  duckAmt: GainNode
  pan: StereoPannerNode
  widthSide: GainNode
  out: GainNode
  reverse: ConvolverNode
  reverseMix: GainNode
  reverseDirect: GainNode
  allpass: BiquadFilterNode[]
  lfo: OscillatorNode
  lfoGain: GainNode
  wow: OscillatorNode
  wowGain: GainNode
  flutter: OscillatorNode
  flutterGain: GainNode
  drift: OscillatorNode
  driftGain: GainNode
  pitchDelay: DelayNode
  pitchLfo: OscillatorNode
  pitchDepth: GainNode
  pitchMix: GainNode
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
  conv: ConvolverNode
  tankFb: GainNode
  tankDelayL: DelayNode
  tankDelayR: DelayNode
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  damp: BiquadFilterNode
  tiltLow: BiquadFilterNode
  tiltHigh: BiquadFilterNode
  drive: WaveShaperNode
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

export function makeDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const k = 1 + amount * 14
  const denom = Math.tanh(k)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = denom === 0 ? x : Math.tanh(k * x) / denom
  }
  return curve
}

function connectMidSide(ctx: AudioContext, source: AudioNode, destination: AudioNode): GainNode {
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

export function createDelayGraph(
  ctx: AudioContext,
  wet: GainNode,
  output: GainNode,
  dryTap: AudioNode,
): DelayGraph {
  const freezeIn = ctx.createGain()
  const merge = ctx.createChannelMerger(2)
  const delayL = ctx.createDelay(DELAY_MAX)
  const delayR = ctx.createDelay(DELAY_MAX)
  const tapA = ctx.createDelay(DELAY_MAX)
  const tapB = ctx.createDelay(DELAY_MAX)
  const tapAGain = ctx.createGain()
  const tapBGain = ctx.createGain()
  const fbIn = ctx.createGain()
  const fbL = ctx.createGain()
  const fbR = ctx.createGain()
  const pingToL = ctx.createGain()
  const pingToR = ctx.createGain()
  pingToL.gain.value = 0
  pingToR.gain.value = 0
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 20
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 20000
  const drive = ctx.createWaveShaper()
  drive.curve = makeDriveCurve(0)
  const clip = ctx.createWaveShaper()
  clip.curve = makeDriveCurve(0.45)
  const duckAmt = ctx.createGain()
  duckAmt.gain.value = 0
  const pan = ctx.createStereoPanner()
  const out = ctx.createGain()
  out.gain.value = 1
  const reverse = ctx.createConvolver()
  const reverseMix = ctx.createGain()
  reverseMix.gain.value = 0
  const reverseDirect = ctx.createGain()
  reverseDirect.gain.value = 1
  const allpass: BiquadFilterNode[] = []
  for (let i = 0; i < 3; i++) {
    const ap = ctx.createBiquadFilter()
    ap.type = 'allpass'
    ap.frequency.value = 600 + i * 900
    ap.Q.value = 1
    allpass.push(ap)
  }
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.4
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0
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
  const pitchMix = ctx.createGain()
  pitchMix.gain.value = 0

  // Dry first-repeat path; HP/LP/drive/clip live only in the feedback loop.
  wet.connect(freezeIn)
  freezeIn.connect(delayL)
  freezeIn.connect(delayR)
  delayL.connect(merge, 0, 0)
  delayR.connect(merge, 0, 1)
  delayL.connect(tapA)
  delayR.connect(tapB)
  tapA.connect(tapAGain)
  tapB.connect(tapBGain)
  tapAGain.connect(merge, 0, 0)
  tapBGain.connect(merge, 0, 1)

  delayL.connect(fbIn)
  delayR.connect(fbIn)
  fbIn.connect(hp)
  hp.connect(lp)
  lp.connect(drive)
  drive.connect(clip)
  clip.connect(fbL)
  clip.connect(fbR)
  clip.connect(pingToL)
  clip.connect(pingToR)
  clip.connect(pitchDelay)
  pitchDelay.connect(pitchMix)
  pitchMix.connect(fbL)
  pitchMix.connect(fbR)
  fbL.connect(delayL)
  fbR.connect(delayR)
  pingToL.connect(delayL)
  pingToR.connect(delayR)

  let node: AudioNode = merge
  for (const ap of allpass) {
    node.connect(ap)
    node = ap
  }
  node.connect(reverseDirect)
  freezeIn.connect(reverse)
  reverse.connect(reverseMix)
  reverseDirect.connect(pan)
  reverseMix.connect(pan)
  const duckGain = ctx.createGain()
  duckGain.gain.value = 1
  const widthSide = connectMidSide(ctx, pan, duckGain)
  duckGain.connect(out)
  out.connect(output)

  const abs = ctx.createWaveShaper()
  abs.curve = makeAbsCurve()
  const env = ctx.createBiquadFilter()
  env.type = 'lowpass'
  env.frequency.value = 14
  env.Q.value = 0.7
  dryTap.connect(abs)
  abs.connect(env)
  env.connect(duckAmt)
  duckAmt.connect(duckGain.gain)

  lfo.connect(lfoGain)
  wow.connect(wowGain)
  flutter.connect(flutterGain)
  drift.connect(driftGain)
  pitchLfo.connect(pitchDepth)
  lfoGain.connect(delayL.delayTime)
  lfoGain.connect(delayR.delayTime)
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
    hp,
    lp,
    drive,
    clip,
    duckAmt,
    pan,
    widthSide,
    out,
    reverse,
    reverseMix,
    reverseDirect,
    allpass,
    lfo,
    lfoGain,
    wow,
    wowGain,
    flutter,
    flutterGain,
    drift,
    driftGain,
    pitchDelay,
    pitchLfo,
    pitchDepth,
    pitchMix,
    reverseKey: '',
  }
}

export function applyDelayGraph(
  g: DelayGraph,
  params: Record<ParamId, number>,
  type: DelayType,
  bpm: number,
  now: number,
  smoothing: number,
  ctx: AudioContext,
): void {
  const time = delayTimeSeconds(params, bpm)
  const offset = (params.delayOffset / 100) * time * 0.85
  const pitchRatio = 2 ** (params.delayPitch / 12)
  const tL = Math.min(DELAY_MAX - 0.05, Math.max(0.0008, time - offset))
  const tR = Math.min(
    DELAY_MAX - 0.05,
    Math.max(0.0008, time + offset) * (type === 'pitch' || Math.abs(params.delayPitch) > 0.05 ? pitchRatio : 1),
  )
  g.delayL.delayTime.setTargetAtTime(tL, now, smoothing)
  g.delayR.delayTime.setTargetAtTime(tR, now, smoothing)
  const multi = type === 'multiTap' || type === 'diffuse'
  g.tapA.delayTime.setTargetAtTime(Math.min(DELAY_MAX - 0.05, time * 0.33), now, smoothing)
  g.tapB.delayTime.setTargetAtTime(Math.min(DELAY_MAX - 0.05, time * 0.67), now, smoothing)
  g.tapAGain.gain.setTargetAtTime(multi ? 0.35 : 0, now, smoothing)
  g.tapBGain.gain.setTargetAtTime(multi ? 0.22 : 0, now, smoothing)

  const freeze = params.delayFreeze > 0.5
  g.freezeIn.gain.setTargetAtTime(freeze ? 0.0001 : 1, now, smoothing)
  let fb = freeze ? 0.97 : safeFeedbackGain(params.delayFeedback)
  if (type === 'digital') fb *= 0.98
  const ping = type === 'pingPong'
  g.fbL.gain.setTargetAtTime(ping ? 0 : fb, now, smoothing)
  g.fbR.gain.setTargetAtTime(ping ? 0 : fb, now, smoothing)
  g.pingToL.gain.setTargetAtTime(ping ? fb : 0, now, smoothing)
  g.pingToR.gain.setTargetAtTime(ping ? fb : 0, now, smoothing)

  const analog = type === 'analog' || type === 'tape' || type === 'lofi'
  const hp = analog ? Math.max(params.delayHp, type === 'lofi' ? 180 : 80) : params.delayHp
  const lp = analog
    ? Math.min(params.delayLp, type === 'tape' ? 6500 : type === 'lofi' ? 3400 : 4800)
    : params.delayLp
  g.hp.frequency.setTargetAtTime(hp, now, smoothing)
  g.lp.frequency.setTargetAtTime(lp, now, smoothing)
  const driveAmt =
    (params.delayDrive / 100) * 0.8 + (type === 'tape' ? 0.22 : type === 'analog' ? 0.12 : type === 'lofi' ? 0.35 : 0)
  g.drive.curve = makeDriveCurve(driveAmt)

  g.lfo.frequency.setTargetAtTime(params.delayModRate, now, smoothing)
  g.lfoGain.gain.setTargetAtTime((params.delayModDepth / 100) * time * 0.12, now, smoothing)
  const wow = params.delayWow / 100 + (type === 'tape' ? 0.18 : 0)
  const flutter = params.delayFlutter / 100 + (type === 'tape' ? 0.12 : 0)
  g.wowGain.gain.setTargetAtTime(wow * time * 0.04, now, smoothing)
  g.flutterGain.gain.setTargetAtTime(flutter * time * 0.012, now, smoothing)
  g.driftGain.gain.setTargetAtTime((params.delayDrift / 100) * time * 0.06, now, smoothing)

  g.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, params.delayPan / 100)), now, smoothing)
  g.widthSide.gain.setTargetAtTime(sideGainFromWidth(params.delayWidth), now, smoothing)
  g.duckAmt.gain.setTargetAtTime(-(params.delayDuck / 100) * 0.92, now, smoothing)
  const pitchAmt = type === 'pitch' ? Math.max(Math.abs(params.delayPitch) / 48, 0.25) : Math.abs(params.delayPitch) / 48
  g.pitchMix.gain.setTargetAtTime(Math.min(0.85, pitchAmt), now, smoothing)
  g.pitchLfo.frequency.setTargetAtTime(3 + Math.abs(params.delayPitch) * 0.35, now, smoothing)
  g.pitchDepth.gain.setTargetAtTime(params.delayPitch === 0 && type !== 'pitch' ? 0 : 0.012, now, smoothing)

  g.out.gain.setTargetAtTime(1, now, smoothing)
  const reverseAmt = type === 'reverse' ? Math.max(params.delayReverse / 100, 0.7) : params.delayReverse / 100
  g.reverseMix.gain.setTargetAtTime(reverseAmt * 0.85, now, smoothing)
  g.reverseDirect.gain.setTargetAtTime(1 - reverseAmt * 0.7, now, smoothing)
  if (reverseAmt > 0.05) {
    const key = `${time.toFixed(3)}:${params.delayFeedback.toFixed(0)}`
    if (g.reverseKey !== key) {
      g.reverseKey = key
      const ir = buildDelayReverseIr(ctx, time, params.delayFeedback)
      if (ir) g.reverse.buffer = ir
    }
  }

  const diff = (type === 'diffuse' ? 0.55 : 0) + params.delayDiffusion / 100
  for (let i = 0; i < g.allpass.length; i++) {
    g.allpass[i]!.Q.setTargetAtTime(0.4 + diff * 4, now, smoothing)
    g.allpass[i]!.frequency.setTargetAtTime(400 + i * 700 + diff * 800, now, smoothing)
  }
}

function buildDelayReverseIr(ctx: AudioContext, time: number, feedbackPct: number): AudioBuffer | null {
  const taps = 6
  const sr = ctx.sampleRate
  const seconds = Math.min(4, Math.max(0.2, time * taps * 0.7))
  const n = Math.floor(sr * seconds)
  const buf = ctx.createBuffer(2, n, sr)
  const fb = safeFeedbackGain(feedbackPct)
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
  ctx: AudioContext,
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
  const conv = ctx.createConvolver()
  const tankSplit = ctx.createChannelSplitter(2)
  const tankDelayL = ctx.createDelay(0.45)
  const tankDelayR = ctx.createDelay(0.45)
  const tankMerge = ctx.createChannelMerger(2)
  const tankFb = ctx.createGain()
  tankFb.gain.value = 0
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  const tiltLow = ctx.createBiquadFilter()
  tiltLow.type = 'lowshelf'
  tiltLow.frequency.value = 180
  const tiltHigh = ctx.createBiquadFilter()
  tiltHigh.type = 'highshelf'
  tiltHigh.frequency.value = 4200
  const drive = ctx.createWaveShaper()
  drive.curve = makeDriveCurve(0)
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
  earlyGain.connect(conv)
  preMerge.connect(conv)
  conv.connect(tankSplit)
  tankSplit.connect(tankDelayL, 0)
  tankSplit.connect(tankDelayR, 1)
  tankDelayL.connect(tankMerge, 0, 0)
  tankDelayR.connect(tankMerge, 0, 1)
  tankMerge.connect(tankFb)
  tankFb.connect(conv)
  conv.connect(hp)
  hp.connect(lp)
  lp.connect(damp)
  damp.connect(tiltLow)
  tiltLow.connect(tiltHigh)
  tiltHigh.connect(drive)
  tiltHigh.connect(shimmerDelay)
  shimmerDelay.connect(shimmerMix)
  shimmerMix.connect(conv)
  drive.connect(gate)
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
  ctx: AudioContext,
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
  smoothing: number,
): void {
  const pre =
    params.reverbSync > 0.5
      ? Math.min(1.8, syncedDelayMs(bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)) / 1000)
      : Math.min(1.8, params.reverbPredelay / 1000)
  const dist = params.reverbDistance / 100
  const basePre = Math.max(0.0002, pre + dist * 0.05)
  const offset = (params.reverbOffset / 100) * basePre * 0.9
  g.predelayL.delayTime.setTargetAtTime(Math.max(0.0002, basePre - offset), now, smoothing)
  g.predelayR.delayTime.setTargetAtTime(Math.max(0.0002, Math.min(1.95, basePre + offset)), now, smoothing)
  g.early.delayTime.setTargetAtTime(0.01 + dist * 0.035 + params.reverbSize / 3500, now, smoothing)
  g.earlyGain.gain.setTargetAtTime((params.reverbEarly / 100) * (1.15 - dist * 0.45), now, smoothing)

  const input = stereoInputMix(params.reverbInput)
  g.inKeepL.gain.setTargetAtTime(input.keep, now, smoothing)
  g.inKeepR.gain.setTargetAtTime(input.keep, now, smoothing)
  g.inCrossL.gain.setTargetAtTime(input.cross, now, smoothing)
  g.inCrossR.gain.setTargetAtTime(input.cross, now, smoothing)

  const freeze = params.reverbFreeze > 0.5 || type === 'infinite'
  g.freezeIn.gain.setTargetAtTime(freeze ? 0.12 : 1, now, smoothing)
  const huge = type === 'cathedral' || type === 'largeHall' || type === 'cloud' || type === 'bloom' || type === 'infinite'
  const tank = freeze
    ? 0.9
    : Math.min(0.78, 0.16 + (params.reverbDecay / 22) * 0.48 + params.reverbSize / 380 + (huge ? 0.08 : 0))
  g.tankFb.gain.setTargetAtTime(tank, now, smoothing)
  g.tankDelayL.delayTime.setTargetAtTime(0.062 + params.reverbSize / 420, now, smoothing)
  g.tankDelayR.delayTime.setTargetAtTime(0.089 + params.reverbSize / 310, now, smoothing)

  g.hp.frequency.setTargetAtTime(params.reverbLowCut + dist * 80, now, smoothing)
  g.lp.frequency.setTargetAtTime(params.reverbHighCut * (1 - dist * 0.15), now, smoothing)
  g.damp.frequency.setTargetAtTime(params.reverbDamping, now, smoothing)
  const color = params.reverbColor / 100
  g.tiltLow.gain.setTargetAtTime(-color * 4, now, smoothing)
  g.tiltHigh.gain.setTargetAtTime(color * 5, now, smoothing)
  g.drive.curve = makeDriveCurve(params.reverbDrive / 100)
  g.out.gain.setTargetAtTime(1, now, smoothing)

  g.lfo.frequency.setTargetAtTime(params.reverbModRate, now, smoothing)
  const modSec = (params.reverbModDepth / 100) * (0.006 + basePre * 0.18)
  g.lfoGain.gain.setTargetAtTime(modSec, now, smoothing)
  g.lfoGainR.gain.setTargetAtTime(modSec, now, smoothing)

  g.duckAmt.gain.setTargetAtTime(-(params.reverbDuck / 100) * 0.9, now, smoothing)
  let width = params.reverbWidth
  if (huge) width = Math.min(200, width * 1.06 + 6)
  g.widthSide.gain.setTargetAtTime(sideGainFromWidth(width), now, smoothing)
  g.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, params.reverbPan / 100)), now, smoothing)
  const shimmer = type === 'shimmer' ? Math.max(params.reverbShimmer / 100, 0.35) : params.reverbShimmer / 100
  g.shimmerMix.gain.setTargetAtTime(Math.min(0.55, shimmer * 0.5), now, smoothing)
  g.shimmerLfo.frequency.setTargetAtTime(5 + Math.abs(params.reverbShimmerPitch) * 0.4, now, smoothing)
  g.shimmerDepth.gain.setTargetAtTime(shimmer > 0.02 ? 0.01 : 0, now, smoothing)

  const gateAmt = type === 'gated' ? Math.max(params.reverbGate / 100, 0.55) : params.reverbGate / 100
  if (gateAmt < 0.02) {
    g.gate.threshold.setTargetAtTime(0, now, smoothing)
    g.gate.ratio.setTargetAtTime(1, now, smoothing)
  } else {
    g.gate.threshold.setTargetAtTime(params.reverbGateThres, now, smoothing)
    g.gate.ratio.setTargetAtTime(1 + gateAmt * 18, now, smoothing)
    g.gate.attack.setTargetAtTime(params.reverbGateAttack / 1000, now, smoothing)
    g.gate.release.setTargetAtTime(params.reverbGateRelease / 1000, now, smoothing)
    g.gate.knee.setTargetAtTime(2, now, smoothing)
  }

  // Limit was removed from the reverb UI; keep the brickwall bypassed.
  g.limit.threshold.setTargetAtTime(0, now, smoothing)
  g.limit.ratio.setTargetAtTime(1, now, smoothing)
}

export function wetDryFor(
  type: 'delay' | 'reverb',
  params: Record<ParamId, number>,
): { dry: number; wet: number; out: number } {
  const mix = type === 'delay' ? params.delayWet : params.reverbWet
  const { dry, wet } = equalPowerDryWet(mix / 100)
  return { dry, wet, out: 1 }
}

function instantGain(param: AudioParam, now: number, value = 0): void {
  param.cancelScheduledValues(now)
  param.setValueAtTime(value, now)
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
  instantGain(g.pitchMix.gain, now)
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
