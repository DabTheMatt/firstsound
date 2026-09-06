import { forceMonoDiscrete, forceStereoDiscrete } from '../engine/stereoStage'
import type { ParamId } from '../parameters/types'
import {
  MS_HAAS_MAX_SEC,
  MS_SIDE_HPF_MIN,
  MS_TILT_HZ,
  msBalanceGains,
  msCrossfeedMix,
  msHaasDelayLeft,
  msHaasDelaySec,
  msHaasMix,
  msLevelGain,
  msPolarity,
  msRotateMatrix,
  msSideHpfHz,
  msSoloGains,
  msTiltGains,
  msWidthGain,
} from './midSide'

export type MidSideGraph = {
  analyserL: AnalyserNode
  analyserR: AnalyserNode
  midGain: GainNode
  sideGain: GainNode
  midBal: GainNode
  sideBal: GainNode
  width: GainNode
  midSolo: GainNode
  sideSolo: GainNode
  midFlip: GainNode
  sideFlip: GainNode
  sideHpf: BiquadFilterNode
  sideHpfDry: GainNode
  sideHpfWet: GainNode
  midLow: BiquadFilterNode
  midHigh: BiquadFilterNode
  sideLow: BiquadFilterNode
  sideHigh: BiquadFilterNode
  rotLL: GainNode
  rotLR: GainNode
  rotRL: GainNode
  rotRR: GainNode
  xfKeepL: GainNode
  xfKeepR: GainNode
  xfCrossL: GainNode
  xfCrossR: GainNode
  delayL: DelayNode
  delayR: DelayNode
  haasDryL: GainNode
  haasDryR: GainNode
  haasWetL: GainNode
  haasWetR: GainNode
  monoLL: GainNode
  monoLR: GainNode
  monoRL: GainNode
  monoRR: GainNode
}

function shelf(ctx: AudioContext, type: BiquadFilterType): BiquadFilterNode {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = MS_TILT_HZ
  node.Q.value = 0.5
  node.gain.value = 0
  return node
}

function snap(param: AudioParam, value: number, now: number): void {
  param.cancelScheduledValues(now)
  param.setValueAtTime(value, now)
}

export function createMidSideGraph(ctx: AudioContext, wet: GainNode, output: GainNode): MidSideGraph {
  const split = ctx.createChannelSplitter(2)
  forceStereoDiscrete(wet)
  wet.connect(split)

  const midFromL = ctx.createGain()
  const midFromR = ctx.createGain()
  const sideFromL = ctx.createGain()
  const sideFromR = ctx.createGain()
  midFromL.gain.value = 0.5
  midFromR.gain.value = 0.5
  sideFromL.gain.value = 0.5
  sideFromR.gain.value = -0.5
  for (const tap of [midFromL, midFromR, sideFromL, sideFromR]) forceMonoDiscrete(tap)

  split.connect(midFromL, 0)
  split.connect(midFromR, 1)
  split.connect(sideFromL, 0)
  split.connect(sideFromR, 1)

  const midSum = ctx.createGain()
  const sideSum = ctx.createGain()
  forceMonoDiscrete(midSum)
  forceMonoDiscrete(sideSum)
  midFromL.connect(midSum)
  midFromR.connect(midSum)
  sideFromL.connect(sideSum)
  sideFromR.connect(sideSum)

  const midFlip = ctx.createGain()
  const sideFlip = ctx.createGain()
  forceMonoDiscrete(midFlip)
  forceMonoDiscrete(sideFlip)
  midSum.connect(midFlip)

  const sideHpfDry = ctx.createGain()
  const sideHpfWet = ctx.createGain()
  const sideHpf = ctx.createBiquadFilter()
  sideHpf.type = 'highpass'
  sideHpf.frequency.value = MS_SIDE_HPF_MIN
  sideHpf.Q.value = 0.7
  forceMonoDiscrete(sideHpfDry)
  forceMonoDiscrete(sideHpfWet)
  sideSum.connect(sideHpfDry)
  sideSum.connect(sideHpf)
  sideHpf.connect(sideHpfWet)
  sideHpfDry.connect(sideFlip)
  sideHpfWet.connect(sideFlip)

  const midLow = shelf(ctx, 'lowshelf')
  const midHigh = shelf(ctx, 'highshelf')
  const sideLow = shelf(ctx, 'lowshelf')
  const sideHigh = shelf(ctx, 'highshelf')
  forceMonoDiscrete(midLow)
  forceMonoDiscrete(midHigh)
  forceMonoDiscrete(sideLow)
  forceMonoDiscrete(sideHigh)
  midFlip.connect(midLow)
  midLow.connect(midHigh)
  sideFlip.connect(sideLow)
  sideLow.connect(sideHigh)

  const midGain = ctx.createGain()
  const sideGain = ctx.createGain()
  const width = ctx.createGain()
  const midBal = ctx.createGain()
  const sideBal = ctx.createGain()
  const midSolo = ctx.createGain()
  const sideSolo = ctx.createGain()
  for (const tap of [midGain, sideGain, width, midBal, sideBal, midSolo, sideSolo]) forceMonoDiscrete(tap)
  midHigh.connect(midGain)
  midGain.connect(midBal)
  midBal.connect(midSolo)
  sideHigh.connect(sideGain)
  sideGain.connect(width)
  width.connect(sideBal)
  sideBal.connect(sideSolo)

  const decode = ctx.createChannelMerger(2)
  const sideInv = ctx.createGain()
  sideInv.gain.value = -1
  forceMonoDiscrete(sideInv)
  midSolo.connect(decode, 0, 0)
  midSolo.connect(decode, 0, 1)
  sideSolo.connect(decode, 0, 0)
  sideSolo.connect(sideInv)
  sideInv.connect(decode, 0, 1)

  const rotSplit = ctx.createChannelSplitter(2)
  decode.connect(rotSplit)
  const rotLL = ctx.createGain()
  const rotLR = ctx.createGain()
  const rotRL = ctx.createGain()
  const rotRR = ctx.createGain()
  for (const tap of [rotLL, rotLR, rotRL, rotRR]) forceMonoDiscrete(tap)
  rotSplit.connect(rotLL, 0)
  rotSplit.connect(rotLR, 0)
  rotSplit.connect(rotRL, 1)
  rotSplit.connect(rotRR, 1)
  const rotMerge = ctx.createChannelMerger(2)
  rotLL.connect(rotMerge, 0, 0)
  rotRL.connect(rotMerge, 0, 0)
  rotLR.connect(rotMerge, 0, 1)
  rotRR.connect(rotMerge, 0, 1)

  const xfSplit = ctx.createChannelSplitter(2)
  rotMerge.connect(xfSplit)
  const xfKeepL = ctx.createGain()
  const xfKeepR = ctx.createGain()
  const xfCrossL = ctx.createGain()
  const xfCrossR = ctx.createGain()
  for (const tap of [xfKeepL, xfKeepR, xfCrossL, xfCrossR]) forceMonoDiscrete(tap)
  xfSplit.connect(xfKeepL, 0)
  xfSplit.connect(xfCrossR, 0)
  xfSplit.connect(xfKeepR, 1)
  xfSplit.connect(xfCrossL, 1)
  const xfMerge = ctx.createChannelMerger(2)
  xfKeepL.connect(xfMerge, 0, 0)
  xfCrossL.connect(xfMerge, 0, 0)
  xfKeepR.connect(xfMerge, 0, 1)
  xfCrossR.connect(xfMerge, 0, 1)

  const haasSplit = ctx.createChannelSplitter(2)
  xfMerge.connect(haasSplit)
  const delayL = ctx.createDelay(MS_HAAS_MAX_SEC)
  const delayR = ctx.createDelay(MS_HAAS_MAX_SEC)
  const haasDryL = ctx.createGain()
  const haasDryR = ctx.createGain()
  const haasWetL = ctx.createGain()
  const haasWetR = ctx.createGain()
  for (const tap of [haasDryL, haasDryR, haasWetL, haasWetR, delayL, delayR]) forceMonoDiscrete(tap)
  haasSplit.connect(haasDryL, 0)
  haasSplit.connect(delayL, 0)
  delayL.connect(haasWetL)
  haasSplit.connect(haasDryR, 1)
  haasSplit.connect(delayR, 1)
  delayR.connect(haasWetR)
  const haasMerge = ctx.createChannelMerger(2)
  haasDryL.connect(haasMerge, 0, 0)
  haasWetL.connect(haasMerge, 0, 0)
  haasDryR.connect(haasMerge, 0, 1)
  haasWetR.connect(haasMerge, 0, 1)

  const monoSplit = ctx.createChannelSplitter(2)
  haasMerge.connect(monoSplit)
  const monoLL = ctx.createGain()
  const monoLR = ctx.createGain()
  const monoRL = ctx.createGain()
  const monoRR = ctx.createGain()
  for (const tap of [monoLL, monoLR, monoRL, monoRR]) forceMonoDiscrete(tap)
  monoSplit.connect(monoLL, 0)
  monoSplit.connect(monoLR, 0)
  monoSplit.connect(monoRL, 1)
  monoSplit.connect(monoRR, 1)
  const monoMerge = ctx.createChannelMerger(2)
  monoLL.connect(monoMerge, 0, 0)
  monoRL.connect(monoMerge, 0, 0)
  monoLR.connect(monoMerge, 0, 1)
  monoRR.connect(monoMerge, 0, 1)
  monoMerge.connect(output)

  const analyserSplit = ctx.createChannelSplitter(2)
  const analyserL = ctx.createAnalyser()
  const analyserR = ctx.createAnalyser()
  analyserL.fftSize = 1024
  analyserR.fftSize = 1024
  analyserL.smoothingTimeConstant = 0
  analyserR.smoothingTimeConstant = 0
  output.connect(analyserSplit)
  analyserSplit.connect(analyserL, 0)
  analyserSplit.connect(analyserR, 1)

  return {
    analyserL,
    analyserR,
    midGain,
    sideGain,
    midBal,
    sideBal,
    width,
    midSolo,
    sideSolo,
    midFlip,
    sideFlip,
    sideHpf,
    sideHpfDry,
    sideHpfWet,
    midLow,
    midHigh,
    sideLow,
    sideHigh,
    rotLL,
    rotLR,
    rotRL,
    rotRR,
    xfKeepL,
    xfKeepR,
    xfCrossL,
    xfCrossR,
    delayL,
    delayR,
    haasDryL,
    haasDryR,
    haasWetL,
    haasWetR,
    monoLL,
    monoLR,
    monoRL,
    monoRR,
  }
}

export function applyMidSideGraph(
  g: MidSideGraph,
  params: Record<ParamId, number>,
  now: number,
  smoothing: number,
): void {
  const bal = msBalanceGains(params.msBalance)
  const solo = msSoloGains(params.msSoloMid, params.msSoloSide)
  const hpf = msSideHpfHz(params.msSideHpf)
  const midTilt = msTiltGains(params.msMidTilt)
  const sideTilt = msTiltGains(params.msSideTilt)
  const rot = msRotateMatrix(params.msRotate)
  const xf = msCrossfeedMix(params.msCrossfeed)
  const haas = msHaasMix(params.msHaasAmount)
  const delaySec = msHaasDelaySec(params.msHaasTime)
  const delayLeft = msHaasDelayLeft(params.msHaasDir)
  const mono = params.msMono > 0.5

  g.midGain.gain.setTargetAtTime(msLevelGain(params.msMidGain), now, smoothing)
  g.sideGain.gain.setTargetAtTime(msLevelGain(params.msSideGain), now, smoothing)
  g.width.gain.setTargetAtTime(msWidthGain(params.msWidth), now, smoothing)
  g.midBal.gain.setTargetAtTime(bal.mid, now, smoothing)
  g.sideBal.gain.setTargetAtTime(bal.side, now, smoothing)
  snap(g.midSolo.gain, solo.mid, now)
  snap(g.sideSolo.gain, solo.side, now)
  snap(g.midFlip.gain, msPolarity(params.msFlipMid), now)
  snap(g.sideFlip.gain, msPolarity(params.msFlipSide), now)

  snap(g.sideHpfDry.gain, hpf == null ? 1 : 0, now)
  snap(g.sideHpfWet.gain, hpf == null ? 0 : 1, now)
  g.sideHpf.frequency.setTargetAtTime(hpf ?? MS_SIDE_HPF_MIN, now, smoothing)

  g.midLow.gain.setTargetAtTime(midTilt.lowDb, now, smoothing)
  g.midHigh.gain.setTargetAtTime(midTilt.highDb, now, smoothing)
  g.sideLow.gain.setTargetAtTime(sideTilt.lowDb, now, smoothing)
  g.sideHigh.gain.setTargetAtTime(sideTilt.highDb, now, smoothing)

  g.rotLL.gain.setTargetAtTime(rot.ll, now, smoothing)
  g.rotLR.gain.setTargetAtTime(rot.lr, now, smoothing)
  g.rotRL.gain.setTargetAtTime(rot.rl, now, smoothing)
  g.rotRR.gain.setTargetAtTime(rot.rr, now, smoothing)

  g.xfKeepL.gain.setTargetAtTime(xf.keep, now, smoothing)
  g.xfKeepR.gain.setTargetAtTime(xf.keep, now, smoothing)
  g.xfCrossL.gain.setTargetAtTime(xf.cross, now, smoothing)
  g.xfCrossR.gain.setTargetAtTime(xf.cross, now, smoothing)

  g.delayL.delayTime.setTargetAtTime(delayLeft ? delaySec : 0, now, smoothing)
  g.delayR.delayTime.setTargetAtTime(delayLeft ? 0 : delaySec, now, smoothing)
  const leftWet = delayLeft ? haas.wet : 0
  const rightWet = delayLeft ? 0 : haas.wet
  g.haasDryL.gain.setTargetAtTime(delayLeft ? haas.dry : 1, now, smoothing)
  g.haasDryR.gain.setTargetAtTime(delayLeft ? 1 : haas.dry, now, smoothing)
  g.haasWetL.gain.setTargetAtTime(leftWet, now, smoothing)
  g.haasWetR.gain.setTargetAtTime(rightWet, now, smoothing)

  snap(g.monoLL.gain, mono ? 0.5 : 1, now)
  snap(g.monoLR.gain, mono ? 0.5 : 0, now)
  snap(g.monoRL.gain, mono ? 0.5 : 0, now)
  snap(g.monoRR.gain, mono ? 0.5 : 1, now)
}
