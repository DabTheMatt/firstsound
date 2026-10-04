/**
 * Stereo field after output pan and the engaged mid/side and delay.
 * The dry analysis stays the sample. This is the picture of what is heard.
 */

import { equalPowerPanGains } from '../audio/engine/stereoStage'
import { delayFeedbackGains } from '../audio/fx/delayLoop'
import { delayChannelSendLevels, delaySendLevels, sideGainFromWidth } from '../audio/fx/dryWet'
import {
  msBalanceGains,
  msCrossfeedMix,
  msHaasDelayLeft,
  msHaasDelaySec,
  msHaasMix,
  msLevelGain,
  msPolarity,
  msRotateMatrix,
  msSoloGains,
  msWidthGain,
} from '../audio/fx/midSide'
import { delayChannelTimeSeconds, isDelayStereo } from '../audio/fx/spaceModel'
import type { DelayType } from '../audio/fx/types'
import { dbToGain } from '../audio/parameters/mapping'
import type { ParamId } from '../audio/parameters/types'
import type { SpaceBucket } from './analyze'

export type HeardMidSide = {
  widthPct: number
  midDb: number
  sideDb: number
  balance?: number
  soloMid?: number
  soloSide?: number
  flipMid?: number
  flipSide?: number
  rotate?: number
  crossfeed?: number
  haasTime?: number
  haasAmount?: number
  haasDir?: number
  mono?: number
}

/** Channel delay the way the delay graph mixes it, not a list of decorative taps. */
export type HeardDelay = {
  stereo: boolean
  timeL: number
  timeR: number
  fbL: number
  fbR: number
  pingToL: number
  pingToR: number
  dryL: number
  wetL: number
  dryR: number
  wetR: number
  moduleDry: number
  moduleWet: number
  pan: number
  widthGain: number
}

export type HeardSpaceRequest = {
  left: ArrayLike<number>
  right: ArrayLike<number> | null
  sampleRate: number
  originSec: number
  startFrame: number
  frames: number
  panPct: number
  leftDb: number
  rightDb: number
  midSide: HeardMidSide | null
  delay: HeardDelay | null
}

function num(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function sampleAt(channel: ArrayLike<number> | null, index: number): number {
  if (!channel || index < 0 || index >= channel.length) return 0
  return channel[index] ?? 0
}

function clampTime(seconds: number): number {
  if (!(seconds > 0)) return 0.0008
  return Math.min(4, Math.max(0.0008, seconds))
}

/** Same times and dry/wet the delay graph applies, including one-channel stereo delay. */
export function heardDelay(params: Record<ParamId, number>, type: DelayType, bpm: number): HeardDelay {
  const stereo = isDelayStereo(params)
  const timeL = delayChannelTimeSeconds(params, bpm, 'L')
  const offset = stereo ? 0 : (num(params.delayOffset) / 100) * timeL * 0.85
  const timeR = stereo ? delayChannelTimeSeconds(params, bpm, 'R') : timeL + offset
  const loopType = stereo ? type : type === 'pingPong' ? 'digital' : type
  const fb = delayFeedbackGains(
    num(params.delayFeedback),
    loopType,
    num(params.delayFreeze) > 0.5,
    num(params.delayPitch),
    stereo ? num(params.delayFeedbackR) : num(params.delayFeedback),
  )
  const mixL = delayChannelSendLevels(params, 'L', stereo)
  const mixR = delayChannelSendLevels(params, 'R', stereo)
  const module = delaySendLevels(params)
  return {
    stereo,
    timeL: clampTime(timeL - offset),
    timeR: clampTime(timeR),
    fbL: fb.fbL,
    fbR: fb.fbR,
    pingToL: fb.pingToL,
    pingToR: fb.pingToR,
    dryL: stereo ? mixL.dry : 0,
    wetL: stereo ? mixL.wet : 1,
    dryR: stereo ? mixR.dry : 0,
    wetR: stereo ? mixR.wet : 1,
    moduleDry: stereo ? 0 : module.dry,
    moduleWet: stereo ? 1 : module.wet,
    pan: Math.max(-1, Math.min(1, num(params.delayPan) / 100)),
    widthGain: stereo ? sideGainFromWidth(num(params.delayWidth, 100)) : 0,
  }
}

function decodeMidSide(left: number, right: number, ms: HeardMidSide): { left: number; right: number } {
  const bal = msBalanceGains(num(ms.balance))
  const solo = msSoloGains(num(ms.soloMid), num(ms.soloSide))
  const midG = msLevelGain(ms.midDb) * bal.mid * solo.mid * msPolarity(num(ms.flipMid))
  const sideG = msLevelGain(ms.sideDb) * msWidthGain(ms.widthPct) * bal.side * solo.side * msPolarity(num(ms.flipSide))
  const mid = ((left + right) * 0.5) * midG
  const side = ((left - right) * 0.5) * sideG
  const decodedL = mid + side
  const decodedR = mid - side
  const rot = msRotateMatrix(num(ms.rotate))
  const rotatedL = decodedL * rot.ll + decodedR * rot.rl
  const rotatedR = decodedL * rot.lr + decodedR * rot.rr
  const xf = msCrossfeedMix(num(ms.crossfeed))
  return {
    left: rotatedL * xf.keep + rotatedR * xf.cross,
    right: rotatedR * xf.keep + rotatedL * xf.cross,
  }
}

/** Sample after mid/side, before delay. Haas reads this, not the delayed output. */
function spatialAt(index: number, request: HeardSpaceRequest): { left: number; right: number } {
  const dryL = sampleAt(request.left, index)
  const dryR = request.right ? sampleAt(request.right, index) : dryL
  const ms = request.midSide
  if (!ms || !request.right) return { left: dryL, right: dryR }
  const decoded = decodeMidSide(dryL, dryR, ms)
  const mix = msHaasMix(num(ms.haasAmount))
  const delaySec = msHaasDelaySec(num(ms.haasTime))
  let left = decoded.left
  let right = decoded.right
  if (mix.wet > 0 && delaySec > 0) {
    const src = index - Math.round(delaySec * request.sampleRate)
    const past =
      src >= 0
        ? decodeMidSide(sampleAt(request.left, src), request.right ? sampleAt(request.right, src) : 0, ms)
        : { left: 0, right: 0 }
    if (msHaasDelayLeft(num(ms.haasDir))) {
      left = decoded.left * mix.dry + past.left * mix.wet
    } else {
      right = decoded.right * mix.dry + past.right * mix.wet
    }
  }
  if (num(ms.mono) > 0.5) {
    const folded = (left + right) * 0.5
    return { left: folded, right: folded }
  }
  return { left, right }
}

function balanceStereo(left: number, right: number, pan: number): { left: number; right: number } {
  const p = Math.max(-1, Math.min(1, pan))
  if (p < 0) return { left, right: right * (1 + p) }
  if (p > 0) return { left: left * (1 - p), right }
  return { left, right }
}

function delayedWet(index: number, request: HeardSpaceRequest, delay: HeardDelay): { left: number; right: number } {
  const rate = request.sampleRate
  let wetL = 0
  let wetR = 0
  let gL = 1
  let gR = 1
  const ping = delay.pingToL > 0.001 || delay.pingToR > 0.001
  for (let hop = 1; hop <= 8; hop++) {
    const srcL = index - Math.round(delay.timeL * hop * rate)
    const srcR = index - Math.round(delay.timeR * hop * rate)
    const sampleL = srcL >= 0 ? spatialAt(srcL, request).left : 0
    const sampleR = srcR >= 0 ? spatialAt(srcR, request).right : 0
    if (hop === 1 || !ping) {
      wetL += sampleL * gL
      wetR += sampleR * gR
    } else {
      wetL += sampleR * gL
      wetR += sampleL * gR
    }
    if (ping) {
      const nextL = gR * delay.pingToL
      const nextR = gL * delay.pingToR
      gL = nextL
      gR = nextR
    } else {
      gL *= delay.fbL
      gR *= delay.fbR
    }
    if (hop > 1 && gL < 0.02 && gR < 0.02) break
  }
  const panned = balanceStereo(wetL, wetR, delay.pan)
  const mid = (panned.left + panned.right) * 0.5
  const side = (panned.left - panned.right) * 0.5 * delay.widthGain
  return { left: mid + side, right: mid - side }
}

/** Dry frame, then mid/side, then the delay the output actually mixes. */
export function heardFrame(index: number, request: HeardSpaceRequest): { left: number; right: number } {
  const dry = spatialAt(index, request)
  const delay = request.delay
  let left = dry.left
  let right = dry.right
  if (delay) {
    const wet = delayedWet(index, request, delay)
    if (delay.stereo) {
      left = dry.left * delay.dryL + wet.left * delay.wetL
      right = dry.right * delay.dryR + wet.right * delay.wetR
    } else {
      left = dry.left * delay.moduleDry + wet.left * delay.moduleWet
      right = dry.right * delay.moduleDry + wet.right * delay.moduleWet
    }
  }
  const pan = equalPowerPanGains(request.panPct)
  return {
    left: left * pan.left * dbToGain(request.leftDb),
    right: right * pan.right * dbToGain(request.rightDb),
  }
}

export function heardSpaceTimeline(request: HeardSpaceRequest): SpaceBucket[] {
  if (!request.right || request.frames < 8 || !(request.sampleRate > 0)) return []
  const frames = Math.max(1, Math.floor(request.frames))
  const start = Math.max(0, Math.floor(request.startFrame))
  const buckets = Math.max(1, Math.min(64, Math.ceil(frames / 2048)))
  const delay = request.delay
  const out: SpaceBucket[] = []
  for (let b = 0; b < buckets; b++) {
    const a = start + Math.floor((b * frames) / buckets)
    const count = Math.max(1, Math.floor(frames / buckets))
    const stride = count <= 512 ? 1 : delay ? 32 : 64
    let sumLL = 0
    let sumRR = 0
    let sumLR = 0
    let sumMid = 0
    let sumSide = 0
    let n = 0
    for (let i = 0; i < count; i += stride) {
      const heard = heardFrame(a + i, request)
      sumLL += heard.left * heard.left
      sumRR += heard.right * heard.right
      sumLR += heard.left * heard.right
      const mid = (heard.left + heard.right) * 0.5
      const side = (heard.left - heard.right) * 0.5
      sumMid += mid * mid
      sumSide += side * side
      n++
    }
    if (n < 1) continue
    const rmsL = Math.sqrt(sumLL / n)
    const rmsR = Math.sqrt(sumRR / n)
    const denom = rmsL + rmsR
    const balance = denom > 1e-8 ? Math.max(-1, Math.min(1, (rmsR - rmsL) / denom)) : 0
    const corrDenom = Math.sqrt(sumLL * sumRR)
    const correlation = corrDenom > 1e-18 ? Math.max(-1, Math.min(1, sumLR / corrDenom)) : 1
    const energy = sumMid + sumSide
    const width = energy > 0 ? sumSide / energy : 0
    out.push({
      time: request.originSec + (a - start) / request.sampleRate,
      balance,
      width,
      correlation,
    })
  }
  return out
}
