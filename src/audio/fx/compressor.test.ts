import { describe, expect, it } from 'vitest'
import { OfflineAudioContext } from 'node-web-audio-api'
import { defaultParamValues } from '../parameters/definitions'
import {
  applyCompressorGraph,
  compressorCurveDb,
  compressorReductionDb,
  compressorSettings,
  compressorStaticReductionDb,
  createCompressorGraph,
} from './compressor'
import { autoMakeupDb } from './limiter'

describe('compressorSettings', () => {
  it('maps defaults onto DynamicsCompressor units', () => {
    const s = compressorSettings(defaultParamValues())
    expect(s.threshold).toBe(-6)
    expect(s.ratio).toBe(12)
    expect(s.knee).toBe(6)
    expect(s.attack).toBeCloseTo(0.003)
    expect(s.release).toBeCloseTo(0.12)
    expect(s.inputGain).toBeCloseTo(1)
    expect(s.makeupGain).toBeCloseTo(1)
    expect(s.lowCut).toBe(20)
  })

  it('converts milliseconds to seconds and stays inside the node range', () => {
    const params = defaultParamValues()
    params.compressorAttack = 500
    params.compressorRelease = 1000
    const s = compressorSettings(params)
    expect(s.attack).toBeCloseTo(0.5)
    expect(s.release).toBeCloseTo(1)
    params.compressorRelease = 5000
    expect(compressorSettings(params).release).toBeLessThanOrEqual(1)
    params.compressorAttack = 0.1
    expect(compressorSettings(params).attack).toBeCloseTo(0.0001)
  })

  it('uses auto makeup when the toggle is on', () => {
    const params = defaultParamValues()
    params.compressorAutoMakeup = 1
    params.compressorThreshold = -12
    params.compressorRatio = 20
    params.compressorMakeup = 0
    const s = compressorSettings(params)
    expect(s.makeupGain).toBeGreaterThan(1)
    expect(autoMakeupDb(-12, 20)).toBeGreaterThan(0)
  })

  it('ignores legacy limiter compressor params', () => {
    const params = defaultParamValues()
    params.limiterThreshold = -24
    params.limiterRatio = 2
    params.compressorThreshold = -9
    params.compressorRatio = 8
    const s = compressorSettings(params)
    expect(s.threshold).toBe(-9)
    expect(s.ratio).toBe(8)
  })
})

describe('compressor curve', () => {
  const base = {
    inputGain: 1,
    threshold: -30,
    knee: 6,
    ratio: 10,
  }

  it('follows threshold, ratio, and knee, and leaves makeup out of the reduction', () => {
    const quiet = compressorStaticReductionDb(-80, base)
    const over = compressorStaticReductionDb(-3, base)
    expect(quiet).toBeCloseTo(0, 5)
    expect(over).toBeLessThan(-10)
    expect(compressorStaticReductionDb(-3, { ...base, ratio: 1 })).toBeCloseTo(0, 5)
    expect(compressorStaticReductionDb(-3, { ...base, makeupGain: 4 } as never)).toBeCloseTo(over, 5)
    const plain = compressorCurveDb(-3, { ...base, makeupGain: 1 })
    const madeUp = compressorCurveDb(-3, { ...base, makeupGain: 10 ** (12 / 20) })
    expect(madeUp - plain).toBeCloseTo(12, 5)
    const hard = compressorCurveDb(-8, { ...base, threshold: -12, knee: 0, ratio: 4, makeupGain: 1 })
    const soft = compressorCurveDb(-8, { ...base, threshold: -12, knee: 40, ratio: 4, makeupGain: 1 })
    expect(hard).not.toBeCloseTo(soft, 1)
  })

  it('reads node reduction as zero or negative and does not rebuild the graph', () => {
    expect(compressorReductionDb(null)).toBe(0)
    expect(compressorReductionDb({ compressor: { reduction: 0 } } as never)).toBe(0)
    expect(compressorReductionDb({ compressor: { reduction: -7.5 } } as never)).toBeCloseTo(-7.5)
    expect(compressorReductionDb({ compressor: { reduction: 4 } } as never)).toBeCloseTo(-4)
    const ctx = new OfflineAudioContext(1, 128, 22050)
    const input = ctx.createGain()
    const wet = ctx.createGain()
    const graph = createCompressorGraph(ctx as unknown as BaseAudioContext, input, wet)
    const node = graph.compressor
    const params = defaultParamValues()
    params.compressorThreshold = -30
    params.compressorRatio = 10
    params.compressorAttack = 5
    params.compressorRelease = 150
    applyCompressorGraph(graph, params, 0, 0.02)
    params.compressorMakeup = 6
    applyCompressorGraph(graph, params, 0.05, 0.02)
    expect(graph.compressor).toBe(node)
    expect(graph.inputGain).toBeTruthy()
    expect(graph.analyserPost).toBeTruthy()
    expect(graph.direct.gain.value).toBeCloseTo(1)
    expect(graph.low.gain.value).toBeCloseTo(0)
  })
})

function toneRms(ch: Float32Array, start: number): number {
  let sum = 0
  let n = 0
  for (let i = start; i < ch.length; i++) {
    const x = ch[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

async function renderCompressed(freq: number, lowCut: number): Promise<number> {
  const sr = 22050
  const length = Math.floor(0.28 * sr)
  const ctx = new OfflineAudioContext(2, length, sr)
  const osc = ctx.createOscillator()
  osc.frequency.value = freq
  const amp = ctx.createGain()
  amp.gain.value = 0.9
  const wet = ctx.createGain()
  osc.connect(amp)
  const graph = createCompressorGraph(ctx as unknown as BaseAudioContext, amp, wet)
  wet.connect(ctx.destination)
  const params = defaultParamValues()
  params.compressorThreshold = -30
  params.compressorRatio = 12
  params.compressorKnee = 0
  params.compressorAttack = 1
  params.compressorRelease = 80
  params.compressorMakeup = 0
  params.compressorAutoMakeup = 0
  params.compressorLowCut = lowCut
  applyCompressorGraph(graph, params, 0, 0)
  osc.start()
  const rendered = await ctx.startRendering()
  return toneRms(rendered.getChannelData(0), Math.floor(0.08 * sr))
}

describe('compressor low cut', () => {
  it('leaves bass under the cutoff uncompressed and still compresses highs', async () => {
    const bassFull = await renderCompressed(80, 20)
    const bassSplit = await renderCompressed(80, 300)
    const highFull = await renderCompressed(2000, 20)
    const highSplit = await renderCompressed(2000, 300)
    expect(bassSplit).toBeGreaterThan(bassFull * 1.4)
    expect(highSplit).toBeLessThan(bassSplit * 0.75)
    expect(Math.abs(highSplit - highFull) / highFull).toBeLessThan(0.2)
  }, 20000)
})
