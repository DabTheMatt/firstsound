import type { ParamId } from '../parameters/types'
import { equalPowerDryWet, safeFeedbackGain } from './dryWet'
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

export function delayTimeSeconds(params: Record<ParamId, number>, bpm: number): number {
  if (params.delaySync > 0.5) {
    return syncedDelayMs(bpm, noteDivisionAt(params.delayNote), noteKindAt(params.delayNoteKind)) / 1000
  }
  return params.delayTime / 1000
}

export function delayTaps(
  params: Record<ParamId, number>,
  type: DelayType,
  bpm: number,
  now = 0,
): DelayTap[] {
  const mix = equalPowerDryWet(params.spaceMix / 100).wet
  if (mix < 0.004 && params.delayFreeze < 0.5) return []
  const time = Math.max(0.001, delayTimeSeconds(params, bpm))
  const fb = safeFeedbackGain(params.delayFeedback)
  const reverseAmt = type === 'reverse' ? Math.max(params.delayReverse / 100, 0.65) : params.delayReverse / 100
  const ping = type === 'pingPong'
  const stereo = type === 'stereo' || ping
  const offset = (params.delayOffset / 100) * time * 0.9
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
  for (let i = 1; i <= tapCount; i++) {
    const spaced = type === 'multiTap' ? time * (0.28 + i * 0.28) : time * i
    const t = spaced * jitter + (stereo ? (i % 2 === 0 ? offset : -offset) : 0)
    if (ping) {
      const left = i % 2 === 1
      taps.push({
        time: Math.max(0.0005, t),
        gain,
        pan: (left ? -0.85 : 0.85) * width + pan0 * 0.2,
        reverse: reverseAmt > 0.4,
        degraded: degrade(params, type, i),
        channel: left ? 'L' : 'R',
      })
    } else if (stereo) {
      taps.push({
        time: Math.max(0.0005, t - offset),
        gain: gain * 0.9,
        pan: -0.7 * width + pan0,
        reverse: reverseAmt > 0.4,
        degraded: degrade(params, type, i),
        channel: 'L',
      })
      taps.push({
        time: Math.max(0.0005, t + offset),
        gain: gain * 0.9,
        pan: 0.7 * width + pan0,
        reverse: reverseAmt > 0.4,
        degraded: degrade(params, type, i),
        channel: 'R',
      })
    } else {
      taps.push({
        time: Math.max(0.0005, t),
        gain,
        pan: pan0 * width,
        reverse: reverseAmt > 0.4,
        degraded: degrade(params, type, i),
        channel: 'C',
      })
    }
    const decay = freeze ? 0.96 : Math.min(0.98, fb * (type === 'diffuse' ? 0.92 : 0.88))
    gain *= decay
    if (gain < 0.012 && !freeze) break
  }
  return taps
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
  const mix = equalPowerDryWet(params.reverb / 100).wet
  const pre =
    params.reverbSync > 0.5
      ? syncedDelayMs(bpm, noteDivisionAt(params.reverbNote), noteKindAt(params.reverbNoteKind)) / 1000
      : params.reverbPredelay / 1000
  const freeze = params.reverbFreeze > 0.5 || type === 'infinite'
  const reverse = type === 'reverse' || params.reverbReverse > 50
  const size = params.reverbSize / 100
  const decay = freeze ? 8 : params.reverbDecay * (0.6 + size * 1.1)
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
