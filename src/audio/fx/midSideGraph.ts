import { forceMonoDiscrete, forceStereoDiscrete } from '../engine/stereoStage'
import { setSmoothedAudioParam } from '../engine/paramSmooth'
import { webAudioBiquadQ } from '../engine/eqBands'
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
  msEqGainDb,
  msEqHz,
  msEqQ,
  MS_EQ_HIGH_HZ,
  MS_EQ_LOW_HZ,
  MS_EQ_PEAK_HZ,
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
  midEqLow: BiquadFilterNode
  midEqPeak: BiquadFilterNode
  midEqHigh: BiquadFilterNode
  sideEqLow: BiquadFilterNode
  sideEqPeak: BiquadFilterNode
  sideEqHigh: BiquadFilterNode
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

function shelf(ctx: BaseAudioContext, type: BiquadFilterType): BiquadFilterNode {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = MS_TILT_HZ
  node.Q.value = 0.5
  node.gain.value = 0
  return node
}

function eqBand(ctx: BaseAudioContext, type: BiquadFilterType, hz: number, q: number): BiquadFilterNode {
  const node = ctx.createBiquadFilter()
  node.type = type
  node.frequency.value = hz
  node.Q.value = q
  node.gain.value = 0
  return node
}

function snap(param: AudioParam, value: number, now: number): void {
  // Solo, polarity, and routing are gains. Ramping them is the click-safe
  // transition; the enum itself is never interpolated.
  setSmoothedAudioParam(param, value, now, 'gain')
}

/** GainNode starts at 1. Neutral M/S is not "all gains open". */
function primeNeutral(g: MidSideGraph): void {
  g.sideHpfDry.gain.value = 1
  g.sideHpfWet.gain.value = 0
  g.midSolo.gain.value = 1
  g.sideSolo.gain.value = 1
  g.midFlip.gain.value = 1
  g.sideFlip.gain.value = 1
  g.rotLL.gain.value = 1
  g.rotLR.gain.value = 0
  g.rotRL.gain.value = 0
  g.rotRR.gain.value = 1
  g.xfKeepL.gain.value = 1
  g.xfKeepR.gain.value = 1
  g.xfCrossL.gain.value = 0
  g.xfCrossR.gain.value = 0
  g.haasDryL.gain.value = 1
  g.haasDryR.gain.value = 1
  g.haasWetL.gain.value = 0
  g.haasWetR.gain.value = 0
  g.monoLL.gain.value = 1
  g.monoLR.gain.value = 0
  g.monoRL.gain.value = 0
  g.monoRR.gain.value = 1
}

export function createMidSideGraph(ctx: BaseAudioContext, wet: GainNode, output: GainNode): MidSideGraph {
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
  sideHpf.Q.value = webAudioBiquadQ('highpass', 0.7)
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

  const midEqLow = eqBand(ctx, 'lowshelf', MS_EQ_LOW_HZ.fallback, 0.7)
  const midEqPeak = eqBand(ctx, 'peaking', MS_EQ_PEAK_HZ.fallback, 1)
  const midEqHigh = eqBand(ctx, 'highshelf', MS_EQ_HIGH_HZ.fallback, 0.7)
  const sideEqLow = eqBand(ctx, 'lowshelf', MS_EQ_LOW_HZ.fallback, 0.7)
  const sideEqPeak = eqBand(ctx, 'peaking', MS_EQ_PEAK_HZ.fallback, 1)
  const sideEqHigh = eqBand(ctx, 'highshelf', MS_EQ_HIGH_HZ.fallback, 0.7)
  for (const tap of [midEqLow, midEqPeak, midEqHigh, sideEqLow, sideEqPeak, sideEqHigh]) {
    forceMonoDiscrete(tap)
  }
  midHigh.connect(midEqLow)
  midEqLow.connect(midEqPeak)
  midEqPeak.connect(midEqHigh)
  sideHigh.connect(sideEqLow)
  sideEqLow.connect(sideEqPeak)
  sideEqPeak.connect(sideEqHigh)

  const midGain = ctx.createGain()
  const sideGain = ctx.createGain()
  const width = ctx.createGain()
  const midBal = ctx.createGain()
  const sideBal = ctx.createGain()
  const midSolo = ctx.createGain()
  const sideSolo = ctx.createGain()
  for (const tap of [midGain, sideGain, width, midBal, sideBal, midSolo, sideSolo]) forceMonoDiscrete(tap)
  midEqHigh.connect(midGain)
  midGain.connect(midBal)
  midBal.connect(midSolo)
  sideEqHigh.connect(sideGain)
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

  const graph: MidSideGraph = {
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
    midEqLow,
    midEqPeak,
    midEqHigh,
    sideEqLow,
    sideEqPeak,
    sideEqHigh,
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
  primeNeutral(graph)
  return graph
}

export function applyMidSideGraph(
  g: MidSideGraph,
  params: Record<ParamId, number>,
  now: number,
  _smoothing: number,
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

  setSmoothedAudioParam(g.midGain.gain, msLevelGain(params.msMidGain), now, 'gain')
  setSmoothedAudioParam(g.sideGain.gain, msLevelGain(params.msSideGain), now, 'gain')
  setSmoothedAudioParam(g.width.gain, msWidthGain(params.msWidth), now, 'gain')
  setSmoothedAudioParam(g.midBal.gain, bal.mid, now, 'gain')
  setSmoothedAudioParam(g.sideBal.gain, bal.side, now, 'gain')
  snap(g.midSolo.gain, solo.mid, now)
  snap(g.sideSolo.gain, solo.side, now)
  snap(g.midFlip.gain, msPolarity(params.msFlipMid), now)
  snap(g.sideFlip.gain, msPolarity(params.msFlipSide), now)

  snap(g.sideHpfDry.gain, hpf == null ? 1 : 0, now)
  snap(g.sideHpfWet.gain, hpf == null ? 0 : 1, now)
  setSmoothedAudioParam(g.sideHpf.frequency, hpf ?? MS_SIDE_HPF_MIN, now, 'frequency')

  setSmoothedAudioParam(g.midLow.gain, midTilt.lowDb, now, 'gain')
  setSmoothedAudioParam(g.midHigh.gain, midTilt.highDb, now, 'gain')
  setSmoothedAudioParam(g.sideLow.gain, sideTilt.lowDb, now, 'gain')
  setSmoothedAudioParam(g.sideHigh.gain, sideTilt.highDb, now, 'gain')

  setSmoothedAudioParam(g.midEqLow.frequency, msEqHz(params.msMidLowFreq, MS_EQ_LOW_HZ), now, 'frequency')
  setSmoothedAudioParam(g.midEqLow.gain, msEqGainDb(params.msMidLowGain), now, 'gain')
  setSmoothedAudioParam(g.midEqPeak.frequency, msEqHz(params.msMidPeakFreq, MS_EQ_PEAK_HZ), now, 'frequency')
  setSmoothedAudioParam(g.midEqPeak.gain, msEqGainDb(params.msMidPeakGain), now, 'gain')
  setSmoothedAudioParam(g.midEqPeak.Q, msEqQ(params.msMidPeakQ), now, 'q')
  setSmoothedAudioParam(g.midEqHigh.frequency, msEqHz(params.msMidHighFreq, MS_EQ_HIGH_HZ), now, 'frequency')
  setSmoothedAudioParam(g.midEqHigh.gain, msEqGainDb(params.msMidHighGain), now, 'gain')

  setSmoothedAudioParam(g.sideEqLow.frequency, msEqHz(params.msSideLowFreq, MS_EQ_LOW_HZ), now, 'frequency')
  setSmoothedAudioParam(g.sideEqLow.gain, msEqGainDb(params.msSideLowGain), now, 'gain')
  setSmoothedAudioParam(g.sideEqPeak.frequency, msEqHz(params.msSidePeakFreq, MS_EQ_PEAK_HZ), now, 'frequency')
  setSmoothedAudioParam(g.sideEqPeak.gain, msEqGainDb(params.msSidePeakGain), now, 'gain')
  setSmoothedAudioParam(g.sideEqPeak.Q, msEqQ(params.msSidePeakQ), now, 'q')
  setSmoothedAudioParam(g.sideEqHigh.frequency, msEqHz(params.msSideHighFreq, MS_EQ_HIGH_HZ), now, 'frequency')
  setSmoothedAudioParam(g.sideEqHigh.gain, msEqGainDb(params.msSideHighGain), now, 'gain')

  setSmoothedAudioParam(g.rotLL.gain, rot.ll, now, 'gain')
  setSmoothedAudioParam(g.rotLR.gain, rot.lr, now, 'gain')
  setSmoothedAudioParam(g.rotRL.gain, rot.rl, now, 'gain')
  setSmoothedAudioParam(g.rotRR.gain, rot.rr, now, 'gain')

  setSmoothedAudioParam(g.xfKeepL.gain, xf.keep, now, 'gain')
  setSmoothedAudioParam(g.xfKeepR.gain, xf.keep, now, 'gain')
  setSmoothedAudioParam(g.xfCrossL.gain, xf.cross, now, 'gain')
  setSmoothedAudioParam(g.xfCrossR.gain, xf.cross, now, 'gain')

  setSmoothedAudioParam(g.delayL.delayTime, delayLeft ? delaySec : 0, now, 'delayTime')
  setSmoothedAudioParam(g.delayR.delayTime, delayLeft ? 0 : delaySec, now, 'delayTime')
  const leftWet = delayLeft ? haas.wet : 0
  const rightWet = delayLeft ? 0 : haas.wet
  setSmoothedAudioParam(g.haasDryL.gain, delayLeft ? haas.dry : 1, now, 'gain')
  setSmoothedAudioParam(g.haasDryR.gain, delayLeft ? 1 : haas.dry, now, 'gain')
  setSmoothedAudioParam(g.haasWetL.gain, leftWet, now, 'gain')
  setSmoothedAudioParam(g.haasWetR.gain, rightWet, now, 'gain')

  snap(g.monoLL.gain, mono ? 0.5 : 1, now)
  snap(g.monoLR.gain, mono ? 0.5 : 0, now)
  snap(g.monoRL.gain, mono ? 0.5 : 0, now)
  snap(g.monoRR.gain, mono ? 0.5 : 1, now)
}
