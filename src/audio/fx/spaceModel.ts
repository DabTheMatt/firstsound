import type { ParamId } from '../parameters/types'
import { delayLoopGain } from './delayLoop'
import { syncedDelayMs } from './sync'
import { noteDivisionAt, noteKindAt, type DelayType, type ReverbType } from './types'

export type DelayTap = {
  time: number
  gain: number
  pan: number
  reverse: boolean
  degraded: number
  channel: 'L' | 'R' | 'C'
}

export type ReverbTail = {
  predelay: number
  duration: number
  size: number
  width: number
  diffusion: number
  damping: number
  density: number
  reverse: boolean
  freeze: boolean
  early: number[]
  color: number
  distance: number
  shimmer: number
  mix: number
}

export function isDelayStereo(params: Record<ParamId, number>): boolean {
  return params.delayStereo > 0.5
}

export function isReverbStereo(params: Record<ParamId, number>): boolean {
  return params.reverbStereo > 0.5
}

export function delayTimeSeconds(params: Record<ParamId, number>, bpm: number): number {
  return delayChannelTimeSeconds(params, bpm, 'L')
}

export function delayChannelTimeSeconds(
  params: Record<ParamId, number>,
  bpm: number,
  channel: 'L' | 'R',
): number {
  if (channel === 'R' && isDelayStereo(params)) {
    if (params.delaySyncR > 0.5) {
      return syncedDelayMs(bpm, noteDivisionAt(params.delayNoteR), noteKindAt(params.delayNoteKindR)) / 1000
    }
    return params.delayTimeR / 1000
  }
  if (params.delaySync > 0.5) {
    return syncedDelayMs(bpm, noteDivisionAt(params.delayNote), noteKindAt(params.delayNoteKind)) / 1000
  }
  return params.delayTime / 1000
}

function delayChannelMix(params: Record<ParamId, number>, channel: 'L' | 'R'): number {
  const wet = channel === 'R' && isDelayStereo(params) ? params.delayWetR : params.delayWet
  return Math.max(wet / 100, 0.18)
}

function delayChannelFeedback(params: Record<ParamId, number>, channel: 'L' | 'R'): number {
  return channel === 'R' && isDelayStereo(params) ? params.delayFeedbackR : params.delayFeedback
}

function delayTapTrain(
  params: Record<ParamId, number>,
  type: DelayType,
  bpm: number,
  now: number,
  channel: DelayTap['channel'],
): DelayTap[] {
  const side = channel === 'R' ? 'R' : 'L'
  const mix = delayChannelMix(params, side)
  const time = Math.max(0.001, delayChannelTimeSeconds(params, bpm, side))
  const fb = delayLoopGain(delayChannelFeedback(params, side), type)
  const reverseAmt = type === 'reverse' ? Math.max(params.delayReverse / 100, 0.65) : params.delayReverse / 100
  const pan0 = params.delayPan / 100
  const width = params.delayWidth / 100
  const mod = (params.delayModDepth / 100) * 0.035 * Math.sin(now * params.delayModRate * Math.PI * 2)
  const wow = (params.delayWow / 100) * 0.02 * Math.sin(now * 0.7 * Math.PI * 2)
  const flutter = (params.delayFlutter / 100) * 0.008 * Math.sin(now * 13 * Math.PI * 2)
  const drift = (params.delayDrift / 100) * 0.03 * Math.sin(now * 0.13 * Math.PI * 2 + 1.2)
  const jitter = 1 + mod + wow + flutter + drift
  const freeze = params.delayFreeze > 0.5
  const tapCount = freeze
    ? 8
    : type === 'multiTap'
      ? 6
      : type === 'diffuse'
        ? 10
        : Math.min(12, Math.max(2, Math.ceil(Math.log(0.02) / Math.log(Math.max(0.15, Math.min(0.97, fb)))) + 1))
  const taps: DelayTap[] = []
  let gain = mix * (0.85 + params.delayDrive / 400)
  const pan =
    channel === 'L' ? -0.7 * width + pan0 : channel === 'R' ? 0.7 * width + pan0 : pan0 * width
  for (let i = 1; i <= tapCount; i++) {
    const spaced = type === 'multiTap' ? time * (0.28 + i * 0.28) : time * i
    taps.push({
      time: Math.max(0.0005, spaced * jitter),
      gain,
      pan,
      reverse: reverseAmt > 0.4,
      degraded: degrade(params, type, i),
      channel,
    })
    const decay = freeze ? 0.96 : fb * (type === 'diffuse' ? 0.9 : 1)
    gain *= decay
    if (gain < 0.012 && !freeze) break
  }
  return taps
}

export function delayTaps(
  params: Record<ParamId, number>,
  type: DelayType,
  bpm: number,
  now = 0,
): DelayTap[] {
  if (isDelayStereo(params)) {
    return [...delayTapTrain(params, type, bpm, now, 'L'), ...delayTapTrain(params, type, bpm, now, 'R')]
  }
  if (type === 'pingPong') {
    const left = delayTapTrain(params, type, bpm, now, 'C')
    return left.map((tap, i) => ({
      ...tap,
      channel: i % 2 === 0 ? 'L' : 'R',
      pan: (i % 2 === 0 ? -0.85 : 0.85) * (params.delayWidth / 100) + (params.delayPan / 100) * 0.2,
    }))
  }
  return delayTapTrain(params, type, bpm, now, 'C')
}

function degrade(params: Record<ParamId, number>, type: DelayType, i: number): number {
  const base =
    type === 'lofi' || type === 'tape' || type === 'analog'
      ? 0.25 + i * 0.08
      : i * 0.04
  const filter = 1 - params.delayLp / 20000 + params.delayHp / 10000
  return Math.min(1, base + filter * 0.4 + params.delayDrive / 250 + params.delayDiffusion / 300)
}

export function reverbTail(
  params: Record<ParamId, number>,
  type: ReverbType,
  bpm: number,
): ReverbTail {
  const mix = params.reverbWet / 100
  const pre =
    params.reverbSync > 0.5
      ? syncedDelayMs(bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)) / 1000
      : params.reverbPredelay / 1000
  const freeze = params.reverbFreeze > 0.5 || type === 'infinite'
  const reverse = type === 'reverse' || params.reverbReverse > 50
  const size = params.reverbSize / 100
  const decay = freeze ? 12 : params.reverbDecay * (0.7 + size * 1.35)
  const earlyN = 3 + Math.round((params.reverbEarly / 100) * 5)
  const early: number[] = []
  for (let i = 0; i < earlyN; i++) early.push(pre + 0.008 + i * (0.012 + size * 0.02))
  return {
    predelay: pre,
    duration: Math.max(0.05, decay),
    size,
    width: params.reverbWidth / 100,
    diffusion: params.reverbDiffusion / 100,
    damping: 1 - Math.min(1, (Math.log(Math.max(params.reverbDamping, 200)) - Math.log(200)) / (Math.log(18000) - Math.log(200))),
    density: params.reverbDensity / 100,
    reverse,
    freeze,
    early,
    color: params.reverbColor / 100,
    distance: params.reverbDistance / 100,
    shimmer: type === 'shimmer' ? Math.max(params.reverbShimmer / 100, 0.35) : params.reverbShimmer / 100,
    mix,
  }
}
