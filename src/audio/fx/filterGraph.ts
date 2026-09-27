import type { ParamId } from '../parameters/types'
import { setAudioParamNow, setSmoothedAudioParam } from '../engine/paramSmooth'
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
import { webAudioBiquadQ } from '../engine/eqBands'
import { createClickSafeShaper, type ClickSafeShaper } from './shaperCurve'

export type FilterGraph = {
  analyser: AnalyserNode
  drive: ClickSafeShaper
  series: BiquadFilterNode[]
  seriesB: BiquadFilterNode[]
  hpMorph: BiquadFilterNode[]
  bp: BiquadFilterNode
  combDelay: DelayNode
  combFb: GainNode
  combMix: GainNode
  seriesGain: GainNode
  seriesGainB: GainNode
  bpGain: GainNode
  hpGain: GainNode
  sum: GainNode
  curveKey: string
  seriesLive: 0 | 1
  seriesTopo: string
  seriesMix: number
}

function makeSeries(ctx: BaseAudioContext): BiquadFilterNode[] {
  const series: BiquadFilterNode[] = []
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = ctx.createBiquadFilter()
    node.type = 'lowpass'
    series.push(node)
  }
  return series
}

function connectSeries(from: AudioNode, series: BiquadFilterNode[], gain: GainNode, sum: GainNode): void {
  from.connect(series[0]!)
  for (let i = 0; i < series.length - 1; i++) series[i]!.connect(series[i + 1]!)
  series.at(-1)!.connect(gain)
  gain.connect(sum)
}

function writeBiquad(
  node: BiquadFilterNode,
  type: BiquadFilterType,
  hz: number,
  q: number,
  gainDb: number,
  now: number,
  nyquist: number,
  mode: 'now' | 'smooth',
): void {
  if (node.type !== type) node.type = type
  const freq = Math.min(Math.max(hz, FILTER_CUTOFF_MIN), nyquist * 0.99)
  const qv = type === 'allpass' ? 0.0001 : webAudioBiquadQ(type, Math.min(24, Math.max(0.05, q)))
  const gain = type === 'allpass' ? 0 : gainDb
  if (mode === 'now') {
    setAudioParamNow(node.frequency, type === 'allpass' ? 1000 : freq, now)
    setAudioParamNow(node.Q, qv, now)
    setAudioParamNow(node.gain, gain, now)
    return
  }
  setSmoothedAudioParam(node.frequency, type === 'allpass' ? 1000 : freq, now, 'frequency')
  setSmoothedAudioParam(node.Q, qv, now, 'q')
  setSmoothedAudioParam(node.gain, gain, now, 'db')
}

export function createFilterGraph(ctx: BaseAudioContext, wet: GainNode, output: GainNode): FilterGraph {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  const drive = createClickSafeShaper(ctx)
  drive.oversample = '2x'
  const series = makeSeries(ctx)
  const seriesB = makeSeries(ctx)
  const hpMorph: BiquadFilterNode[] = []
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = ctx.createBiquadFilter()
    node.type = 'highpass'
    hpMorph.push(node)
  }
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  const combDelay = ctx.createDelay(1 / FILTER_CUTOFF_MIN)
  const combFb = ctx.createGain()
  combFb.gain.value = 0
  const combMix = ctx.createGain()
  combMix.gain.value = 0
  const seriesGain = ctx.createGain()
  const seriesGainB = ctx.createGain()
  seriesGainB.gain.value = 0
  const bpGain = ctx.createGain()
  const hpGain = ctx.createGain()
  bpGain.gain.value = 0
  hpGain.gain.value = 0
  const sum = ctx.createGain()

  wet.connect(analyser)
  analyser.connect(drive.input)
  connectSeries(drive.output, series, seriesGain, sum)
  connectSeries(drive.output, seriesB, seriesGainB, sum)

  drive.output.connect(bp)
  bp.connect(bpGain)
  bpGain.connect(sum)

  drive.output.connect(hpMorph[0]!)
  for (let i = 0; i < hpMorph.length - 1; i++) hpMorph[i]!.connect(hpMorph[i + 1]!)
  hpMorph.at(-1)!.connect(hpGain)
  hpGain.connect(sum)

  drive.output.connect(combDelay)
  combDelay.connect(combFb)
  combFb.connect(combDelay)
  combDelay.connect(combMix)
  combMix.connect(sum)

  sum.connect(output)

  return {
    analyser,
    drive,
    series,
    seriesB,
    hpMorph,
    bp,
    combDelay,
    combFb,
    combMix,
    seriesGain,
    seriesGainB,
    bpGain,
    hpGain,
    sum,
    curveKey: '',
    seriesLive: 0,
    seriesTopo: '',
    seriesMix: 1,
  }
}

function seriesTopology(
  kind: ReturnType<typeof filterTypeAt>,
  stages: number,
  seriesType: BiquadFilterType,
): string {
  if (kind === 'comb' || kind === 'bandpass') return 'idle'
  return `${seriesType}:${stages}`
}

function writeSeriesBank(
  nodes: BiquadFilterNode[],
  seriesType: BiquadFilterType,
  cutoff: number,
  q: number,
  peakDb: number,
  stages: number,
  qs: number[],
  kind: ReturnType<typeof filterTypeAt>,
  now: number,
  nyquist: number,
  mode: 'now' | 'smooth',
): void {
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = nodes[i]!
    if (kind === 'comb' || kind === 'bandpass' || i >= stages) {
      writeBiquad(node, 'allpass', 1000, 0.0001, 0, now, nyquist, mode)
      continue
    }
    const stageQ = qs[i] ?? 0.707
    const useQ = kind === 'notch' || kind === 'peak' ? q : q * stageQ
    writeBiquad(node, seriesType, cutoff, useQ, peakDb, now, nyquist, mode)
  }
}

export function applyFilterGraph(
  g: FilterGraph,
  params: Record<ParamId, number>,
  now: number,
  _smoothing: number,
  sampleRate: number,
  commitStatic = true,
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
  if (commitStatic && key !== g.curveKey) {
    g.curveKey = key
    g.drive.oversample = character === 'dirty' || character === 'aggressive' ? '4x' : '2x'
    g.drive.setCurve(key, makeFilterDriveCurve(drive, character), now)
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

  const stages = kind === 'notch' || kind === 'peak' ? 1 : qs.length
  const peakDb = kind === 'peak' ? peakGainFromReso(q, character) : 0
  const seriesType: BiquadFilterType =
    kind === 'highpass' ? 'highpass' : kind === 'notch' ? 'notch' : kind === 'peak' ? 'peaking' : 'lowpass'
  const topo = seriesTopology(kind, stages, seriesType)
  const liveNodes = g.seriesLive === 0 ? g.series : g.seriesB
  const silentNodes = g.seriesLive === 0 ? g.seriesB : g.series
  const liveGain = g.seriesLive === 0 ? g.seriesGain : g.seriesGainB
  const silentGain = g.seriesLive === 0 ? g.seriesGainB : g.seriesGain

  if (g.seriesTopo === '') {
    writeSeriesBank(liveNodes, seriesType, cutoff, q, peakDb, stages, qs, kind, now, nyquist, 'now')
    setAudioParamNow(liveGain.gain, seriesMix, now)
    setAudioParamNow(silentGain.gain, 0, now)
    g.seriesTopo = topo
  } else if (g.seriesTopo !== topo && g.seriesMix > 0.001 && seriesMix > 0.001) {
    // Audible topology change (lowpass ↔ highpass, slope, notch, peak).
    // Coefficients land on the silent bank, then the gains crossfade.
    writeSeriesBank(silentNodes, seriesType, cutoff, q, peakDb, stages, qs, kind, now, nyquist, 'now')
    setSmoothedAudioParam(silentGain.gain, seriesMix, now, 'mix')
    setSmoothedAudioParam(liveGain.gain, 0, now, 'mix')
    g.seriesLive = g.seriesLive === 0 ? 1 : 0
    g.seriesTopo = topo
  } else if (g.seriesTopo !== topo) {
    const bank = g.seriesMix <= 0.001 ? liveNodes : silentNodes
    const bankGain = g.seriesMix <= 0.001 ? liveGain : silentGain
    const otherGain = g.seriesMix <= 0.001 ? silentGain : liveGain
    writeSeriesBank(bank, seriesType, cutoff, q, peakDb, stages, qs, kind, now, nyquist, 'now')
    setSmoothedAudioParam(bankGain.gain, seriesMix, now, 'mix')
    setSmoothedAudioParam(otherGain.gain, 0, now, 'mix')
    if (g.seriesMix > 0.001) g.seriesLive = g.seriesLive === 0 ? 1 : 0
    g.seriesTopo = topo
  } else {
    writeSeriesBank(liveNodes, seriesType, cutoff, q, peakDb, stages, qs, kind, now, nyquist, 'smooth')
    setSmoothedAudioParam(liveGain.gain, seriesMix, now, 'mix')
    setSmoothedAudioParam(silentGain.gain, 0, now, 'mix')
  }
  g.seriesMix = seriesMix

  const hpQs = filterStageQs(slope)
  for (let i = 0; i < FILTER_STAGE_COUNT; i++) {
    const node = g.hpMorph[i]!
    if (kind === 'morph' && i < hpQs.length) {
      writeBiquad(node, 'highpass', cutoff, q * (hpQs[i] ?? 0.707), 0, now, nyquist, 'smooth')
    } else if (node.type !== 'allpass' && hpMix <= 0.001) {
      // Path is silent, so the topology write cannot reach the output.
      writeBiquad(node, 'allpass', 1000, 0.0001, 0, now, nyquist, 'now')
    }
  }
  setSmoothedAudioParam(g.hpGain.gain, hpMix, now, 'mix')

  if (kind === 'bandpass' || kind === 'morph') {
    writeBiquad(g.bp, 'bandpass', cutoff, Math.max(0.3, q * 0.85), 0, now, nyquist, 'smooth')
  }
  setSmoothedAudioParam(g.bpGain.gain, bpMix, now, 'mix')

  setSmoothedAudioParam(g.combDelay.delayTime, combDelaySeconds(cutoff), now, 'delayTime')
  setSmoothedAudioParam(g.combFb.gain, kind === 'comb' ? combFeedbackFromReso(q) : 0, now, 'gain')
  setSmoothedAudioParam(g.combMix.gain, combAmt, now, 'mix')
}

export function filterDryWetGains(mixPct: number): { dry: number; wet: number } {
  return filterDryWet(mixPct)
}
