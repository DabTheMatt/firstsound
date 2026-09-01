import type { ParamId } from '../parameters/types'
import { equalPowerDryWet, safeFeedbackGain } from './dryWet'
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
  ping: GainNode
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  drive: WaveShaperNode
  clip: WaveShaperNode
  duck: DynamicsCompressorNode
  pan: StereoPannerNode
  width: GainNode
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
  reverseKey: string
}

export type ReverbGraph = {
  freezeIn: GainNode
  predelay: DelayNode
  early: DelayNode
  earlyGain: GainNode
  conv: ConvolverNode
  tankFb: GainNode
  tankDelay: DelayNode
  hp: BiquadFilterNode
  lp: BiquadFilterNode
  damp: BiquadFilterNode
  tiltLow: BiquadFilterNode
  tiltHigh: BiquadFilterNode
  drive: WaveShaperNode
  duck: DynamicsCompressorNode
  gate: DynamicsCompressorNode
  pan: StereoPannerNode
  out: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
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

export function createDelayGraph(ctx: AudioContext, wet: GainNode, output: GainNode): DelayGraph {
  const freezeIn = ctx.createGain()
  const split = ctx.createChannelSplitter(2)
  const merge = ctx.createChannelMerger(2)
  const delayL = ctx.createDelay(DELAY_MAX)
  const delayR = ctx.createDelay(DELAY_MAX)
  const tapA = ctx.createDelay(DELAY_MAX)
  const tapB = ctx.createDelay(DELAY_MAX)
  const tapAGain = ctx.createGain()
  const tapBGain = ctx.createGain()
  const fbL = ctx.createGain()
  const fbR = ctx.createGain()
  const ping = ctx.createGain()
  ping.gain.value = 0
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 20
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 20000
  const drive = ctx.createWaveShaper()
  drive.curve = makeDriveCurve(0)
  const clip = ctx.createWaveShaper()
  clip.curve = makeDriveCurve(0.35)
  const duck = ctx.createDynamicsCompressor()
  duck.threshold.value = 0
  duck.knee.value = 8
  duck.ratio.value = 4
  duck.attack.value = 0.01
  duck.release.value = 0.18
  const pan = ctx.createStereoPanner()
  const width = ctx.createGain()
  width.gain.value = 1
  const out = ctx.createGain()
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

  wet.connect(freezeIn)
  freezeIn.connect(hp)
  hp.connect(lp)
  lp.connect(drive)
  drive.connect(clip)
  clip.connect(split)
  split.connect(delayL, 0)
  split.connect(delayR, 1)
  delayL.connect(fbL)
  delayR.connect(fbR)
  fbL.connect(delayL)
  fbR.connect(delayR)
  delayL.connect(ping)
  ping.connect(delayR)
  delayR.connect(ping)
  ping.connect(delayL)
  delayL.connect(tapA)
  delayR.connect(tapB)
  tapA.connect(tapAGain)
  tapB.connect(tapBGain)
  delayL.connect(merge, 0, 0)
  delayR.connect(merge, 0, 1)
  tapAGain.connect(merge, 0, 0)
  tapBGain.connect(merge, 0, 1)
  let node: AudioNode = merge
  for (const ap of allpass) {
    node.connect(ap)
    node = ap
  }
  node.connect(reverseDirect)
  freezeIn.connect(reverse)
  reverse.connect(reverseMix)
  reverseDirect.connect(duck)
  reverseMix.connect(duck)
  duck.connect(pan)
  pan.connect(out)
  out.connect(output)

  lfo.connect(lfoGain)
  wow.connect(wowGain)
  flutter.connect(flutterGain)
  drift.connect(driftGain)
  lfoGain.connect(delayL.delayTime)
  lfoGain.connect(delayR.delayTime)
  wowGain.connect(delayL.delayTime)
  wowGain.connect(delayR.delayTime)
  flutterGain.connect(delayL.delayTime)
  flutterGain.connect(delayR.delayTime)
  driftGain.connect(delayL.delayTime)
  driftGain.connect(delayR.delayTime)
  try {
    lfo.start()
    wow.start()
    flutter.start()
    drift.start()
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
    ping,
    hp,
    lp,
    drive,
    clip,
    duck,
    pan,
    width,
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
  g.fbL.gain.setTargetAtTime(type === 'pingPong' ? fb * 0.35 : fb, now, smoothing)
  g.fbR.gain.setTargetAtTime(type === 'pingPong' ? fb * 0.35 : fb, now, smoothing)
  g.ping.gain.setTargetAtTime(type === 'pingPong' ? Math.min(0.95, fb) : 0, now, smoothing)

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
  const duck = params.delayDuck / 100
  g.duck.threshold.setTargetAtTime(duck <= 0.01 ? 0 : -8 - duck * 28, now, smoothing)
  g.duck.ratio.setTargetAtTime(1 + duck * 10, now, smoothing)

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

export function createReverbGraph(ctx: AudioContext, wet: GainNode, output: GainNode): ReverbGraph {
  const freezeIn = ctx.createGain()
  const predelay = ctx.createDelay(1.2)
  const early = ctx.createDelay(0.2)
  const earlyGain = ctx.createGain()
  const conv = ctx.createConvolver()
  const tankDelay = ctx.createDelay(0.35)
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
  const duck = ctx.createDynamicsCompressor()
  const gate = ctx.createDynamicsCompressor()
  const pan = ctx.createStereoPanner()
  const out = ctx.createGain()
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.35
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0

  wet.connect(freezeIn)
  freezeIn.connect(predelay)
  predelay.connect(early)
  early.connect(earlyGain)
  earlyGain.connect(conv)
  predelay.connect(conv)
  conv.connect(tankDelay)
  tankDelay.connect(tankFb)
  tankFb.connect(conv)
  conv.connect(hp)
  hp.connect(lp)
  lp.connect(damp)
  damp.connect(tiltLow)
  tiltLow.connect(tiltHigh)
  tiltHigh.connect(drive)
  drive.connect(duck)
  duck.connect(gate)
  gate.connect(pan)
  pan.connect(out)
  out.connect(output)
  lfo.connect(lfoGain)
  lfoGain.connect(predelay.delayTime)
  try {
    lfo.start()
  } catch {
    /* already started */
  }

  return {
    freezeIn,
    predelay,
    early,
    earlyGain,
    conv,
    tankFb,
    tankDelay,
    hp,
    lp,
    damp,
    tiltLow,
    tiltHigh,
    drive,
    duck,
    gate,
    pan,
    out,
    lfo,
    lfoGain,
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
      ? Math.min(1.15, syncedDelayMs(bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)) / 1000)
      : Math.min(1.15, params.reverbPredelay / 1000)
  const dist = params.reverbDistance / 100
  g.predelay.delayTime.setTargetAtTime(Math.max(0.0002, pre + dist * 0.04), now, smoothing)
  g.early.delayTime.setTargetAtTime(0.012 + dist * 0.03 + params.reverbSize / 4000, now, smoothing)
  g.earlyGain.gain.setTargetAtTime((params.reverbEarly / 100) * (1.1 - dist * 0.5), now, smoothing)

  const freeze = params.reverbFreeze > 0.5 || type === 'infinite'
  g.freezeIn.gain.setTargetAtTime(freeze ? 0.12 : 1, now, smoothing)
  const tank = freeze ? 0.86 : Math.min(0.55, (params.reverbDecay / 60) * 0.35)
  g.tankFb.gain.setTargetAtTime(tank, now, smoothing)
  g.tankDelay.delayTime.setTargetAtTime(0.08 + params.reverbSize / 400, now, smoothing)

  g.hp.frequency.setTargetAtTime(params.reverbLowCut + dist * 80, now, smoothing)
  g.lp.frequency.setTargetAtTime(params.reverbHighCut * (1 - dist * 0.15), now, smoothing)
  g.damp.frequency.setTargetAtTime(params.reverbDamping, now, smoothing)
  const color = params.reverbColor / 100
  g.tiltLow.gain.setTargetAtTime(-color * 4, now, smoothing)
  g.tiltHigh.gain.setTargetAtTime(color * 5, now, smoothing)
  g.drive.curve = makeDriveCurve(params.reverbDrive / 100)

  g.lfo.frequency.setTargetAtTime(params.reverbModRate, now, smoothing)
  g.lfoGain.gain.setTargetAtTime((params.reverbModDepth / 100) * 0.012, now, smoothing)

  const duck = params.reverbDuck / 100
  g.duck.threshold.setTargetAtTime(duck <= 0.01 ? 0 : -6 - duck * 30, now, smoothing)
  g.duck.ratio.setTargetAtTime(1 + duck * 8, now, smoothing)
  g.duck.attack.setTargetAtTime(0.008, now, smoothing)
  g.duck.release.setTargetAtTime(0.22, now, smoothing)

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

  g.pan.pan.setTargetAtTime(0, now, smoothing)
}

export function wetDryFor(type: 'delay' | 'reverb', params: Record<ParamId, number>): { dry: number; wet: number } {
  const mix = type === 'delay' ? params.spaceMix / 100 : params.reverb / 100
  return equalPowerDryWet(mix)
}
