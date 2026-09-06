import type { ParamId } from '../parameters/types'
import {
  combDelaySeconds,
  combFeedbackFromReso,
  FILTER_CUTOFF_MIN,
  FILTER_STAGE_COUNT,
  filterCharacterAt,
  filterDryWet,
  filterSlopeAt,
  filterStageQs,
  filterTypeAt,
  makeFilterDriveCurve,
  morphMixGains,
  peakGainFromReso,
} from './filter'

export type FilterGraph = {
  analyser: AnalyserNode
  drive: WaveShaperNode
  series: BiquadFilterNode[]
  hpMorph: BiquadFilterNode[]
  bp: BiquadFilterNode
  combDelay: DelayNode
  combFb: GainNode
  combMix: GainNode
  seriesGain: GainNode
  bpGain: GainNode
  hpGain: GainNode
  sum: GainNode
  curveKey: string
}

function allpass(node: BiquadFilterNode, now: number, smoothing: number): void {
  if (node.type !== 'allpass') node.type = 'allpass'
  node.frequency.setTargetAtTime(1000, now, smoothing)
  node.Q.setTargetAtTime(0.0001, now, smoothing)
  node.gain.setTargetAtTime(0, now, smoothing)
}

function writeBiquad(
  node: BiquadFilterNode,
  type: BiquadFilterType,
  hz: number,
  q: number,
  gainDb: number,
  now: number,
  smoothing: number,
  nyquist: number,
): void {
  if (node.type !== type) node.type = type
  node.frequency.setTargetAtTime(Math.min(Math.max(hz, FILTER_CUTOFF_MIN), nyquist * 0.99), now, smoothing)
  node.Q.setTargetAtTime(Math.min(24, Math.max(0.05, q)), now, smoothing)
  node.gain.setTargetAtTime(gainDb, now, smoothing)
}

export function createFilterGraph(ctx: AudioContext, wet: GainNode, output: GainNode): FilterGraph {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  const drive = ctx.createWaveShaper()
  drive.oversample = '2x'
  drive.curve = makeFilterDriveCurve(0, 'clean')
  const series: BiquadFilterNode[] = []
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) series.push(ctx.createBiquadFilter())
  const hpMorph: BiquadFilterNode[] = []
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) hpMorph.push(ctx.createBiquadFilter())
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  const combDelay = ctx.createDelay(1 / FILTER_CUTOFF_MIN)
  const combFb = ctx.createGain()
  combFb.gain.value = 0
  const combMix = ctx.createGain()
  combMix.gain.value = 0
  const seriesGain = ctx.createGain()
  const bpGain = ctx.createGain()
  const hpGain = ctx.createGain()
  bpGain.gain.value = 0
  hpGain.gain.value = 0
  const sum = ctx.createGain()

  wet.connect(analyser)
  analyser.connect(drive)
  drive.connect(series[0]!)
  for (let i = 0; i < series.length - 1; i++) series[i]!.connect(series[i + 1]!)
  series.at(-1)!.connect(seriesGain)
  seriesGain.connect(sum)

  drive.connect(bp)
  bp.connect(bpGain)
  bpGain.connect(sum)

  drive.connect(hpMorph[0]!)
  for (let i = 0; i < hpMorph.length - 1; i++) hpMorph[i]!.connect(hpMorph[i + 1]!)
  hpMorph.at(-1)!.connect(hpGain)
  hpGain.connect(sum)

  drive.connect(combDelay)
  combDelay.connect(combFb)
  combFb.connect(combDelay)
  combDelay.connect(combMix)
  combMix.connect(sum)

  sum.connect(output)

  return {
    analyser,
    drive,
    series,
    hpMorph,
    bp,
    combDelay,
    combFb,
    combMix,
    seriesGain,
    bpGain,
    hpGain,
    sum,
    curveKey: '',
  }
}

export function applyFilterGraph(
  g: FilterGraph,
  params: Record<ParamId, number>,
  now: number,
  smoothing: number,
  sampleRate: number,
): void {
  const kind = filterTypeAt(params.filterKind)
  const slope = filterSlopeAt(params.filterSlope)
  const character = filterCharacterAt(params.filterCharacter)
  const cutoff = params.filterCutoff
  const q = params.filterReso
  const nyquist = sampleRate / 2
  const qs = filterStageQs(slope)
  const drive = params.filterDrive / 100
  const key = `${character}:${drive.toFixed(3)}`
  if (key !== g.curveKey) {
    g.curveKey = key
    g.drive.curve = makeFilterDriveCurve(drive, character)
    g.drive.oversample = character === 'dirty' || character === 'aggressive' ? '4x' : '2x'
  }

  let seriesMix = 1
  let bpMix = 0
  let hpMix = 0
  let combAmt = 0

  if (kind === 'comb') {
    seriesMix = 0
    combAmt = 1
  } else if (kind === 'morph') {
    const m = morphMixGains(params.filterMorph / 100)
    seriesMix = m.lp
    bpMix = m.bp
    hpMix = m.hp
  } else if (kind === 'bandpass') {
    seriesMix = 0
    bpMix = 1
  }

  g.seriesGain.gain.setTargetAtTime(seriesMix, now, smoothing)
  g.bpGain.gain.setTargetAtTime(bpMix, now, smoothing)
  g.hpGain.gain.setTargetAtTime(hpMix, now, smoothing)
  g.combMix.gain.setTargetAtTime(combAmt, now, smoothing)

  const seriesAllpass = kind === 'comb' || kind === 'bandpass'
  const stages = kind === 'notch' || kind === 'peak' ? 1 : qs.length
  const peakDb = kind === 'peak' ? peakGainFromReso(q, character) : 0
  const seriesType: BiquadFilterType =
    kind === 'highpass' ? 'highpass' : kind === 'notch' ? 'notch' : kind === 'peak' ? 'peaking' : 'lowpass'

  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = g.series[i]!
    if (seriesAllpass || i >= stages) {
      allpass(node, now, smoothing)
      continue
    }
    const stageQ = qs[i] ?? 0.707
    const useQ = kind === 'notch' || kind === 'peak' ? q : q * stageQ
    writeBiquad(node, seriesType, cutoff, useQ, peakDb, now, smoothing, nyquist)
  }

  const hpQs = filterStageQs(slope)
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = g.hpMorph[i]!
    if (kind !== 'morph' || i >= hpQs.length) {
      allpass(node, now, smoothing)
      continue
    }
    writeBiquad(node, 'highpass', cutoff, q * (hpQs[i] ?? 0.707), 0, now, smoothing, nyquist)
  }

  if (kind === 'bandpass' || kind === 'morph') {
    writeBiquad(g.bp, 'bandpass', cutoff, Math.max(0.3, q * 0.85), 0, now, smoothing, nyquist)
  } else {
    allpass(g.bp, now, smoothing)
  }

  g.combDelay.delayTime.setTargetAtTime(combDelaySeconds(cutoff), now, smoothing)
  g.combFb.gain.setTargetAtTime(kind === 'comb' ? combFeedbackFromReso(q) : 0, now, smoothing)
}

export function filterDryWetGains(mixPct: number): { dry: number; wet: number } {
  return filterDryWet(mixPct)
}
