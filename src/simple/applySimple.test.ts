import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../audio/engine/AudioEngine'
import { effectTailBudgetSec } from '../audio/engine/exportTail'
import { renderProcessedPcm, type OfflineContextFactory } from '../audio/engine/offlineRender'
import type { Pcm } from '../audio/samplePrep/types'
import { applySimpleDelay, applySimpleReverb, applySimpleTone } from './applySimple'

const factory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate) as unknown as ReturnType<OfflineContextFactory>

function rms(ch: Float32Array, start: number, end: number): number {
  const a = Math.max(0, start)
  const b = Math.min(ch.length, end)
  let sum = 0
  let n = 0
  for (let i = a; i < b; i++) {
    const x = ch[i] ?? 0
    sum += x * x
    n++
  }
  return n > 0 ? Math.sqrt(sum / n) : 0
}

function bandEnergy(ch: Float32Array, sampleRate: number, freq: number): number {
  const n = ch.length
  let re = 0
  let im = 0
  const w = (2 * Math.PI * freq) / sampleRate
  for (let i = 0; i < n; i++) {
    const x = ch[i] ?? 0
    re += x * Math.cos(w * i)
    im -= x * Math.sin(w * i)
  }
  return Math.hypot(re, im) / n
}

describe('simple presets open the existing processors', () => {
  it('inserts EQ, reverb, and delay into an empty chain and writes their parameters', () => {
    const engine = new AudioEngine()
    expect(engine.getSnapshot().chain.map((mod) => mod.type)).toEqual(['gain', 'output'])

    applySimpleTone(engine, 'moreBass', 1)
    const tone = engine.getSnapshot()
    expect(tone.chain.find((mod) => mod.type === 'eq')?.bypassed).toBe(false)
    expect(tone.eqBands[0]?.type).toBe('lowshelf')
    expect(tone.eqBands[0]?.gain ?? 0).toBeGreaterThan(3)

    applySimpleTone(engine, 'natural', 0)
    expect(engine.getSnapshot().chain.find((mod) => mod.type === 'eq')?.bypassed).toBe(true)

    applySimpleReverb(engine, 'medium', 0.5)
    const reverb = engine.getSnapshot()
    expect(reverb.chain.find((mod) => mod.type === 'reverb')?.bypassed).toBe(false)
    expect(reverb.params.reverbWet).toBeGreaterThan(10)
    expect(reverb.params.reverbWet).toBeLessThanOrEqual(55)
    expect(reverb.params.reverbDecay).toBeGreaterThan(0.8)

    applySimpleDelay(engine, 'short', 0.4)
    const delay = engine.getSnapshot()
    expect(delay.chain.find((mod) => mod.type === 'delay')?.bypassed).toBe(false)
    expect(delay.params.delayTime).toBe(140)
    expect(delay.params.delayWet).toBeGreaterThan(5)
    expect(delay.params.delayFeedback).toBeLessThanOrEqual(40)

    expect(delay.chain.some((mod) => mod.type === 'eq')).toBe(true)
    expect(delay.chain.some((mod) => mod.type === 'reverb')).toBe(true)
  })

  it('renders a louder low tone for more bass and echoes after a delay', async () => {
    const engine = new AudioEngine()
    const sr = 22050
    const seconds = 0.5
    const n = Math.floor(seconds * sr)
    const dry = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      dry[i] =
        0.4 * Math.sin((2 * Math.PI * 40 * i) / sr) + 0.4 * Math.sin((2 * Math.PI * 6000 * i) / sr)
    }
    const source: Pcm = { sampleRate: sr, channels: [dry] }
    const plain = await renderProcessedPcm(source, engine.processingSnapshot(), { factory })
    applySimpleTone(engine, 'moreBass', 1)
    const bass = await renderProcessedPcm(source, engine.processingSnapshot(), { factory })
    const plainCh = plain.channels[0]!
    const bassCh = bass.channels[0]!
    const plainRatio = bandEnergy(plainCh, sr, 40) / bandEnergy(plainCh, sr, 6000)
    const bassRatio = bandEnergy(bassCh, sr, 40) / bandEnergy(bassCh, sr, 6000)
    expect(bassRatio).toBeGreaterThan(plainRatio * 1.4)

    const burstN = Math.floor(1.2 * sr)
    const burst = new Float32Array(burstN)
    const hit = Math.floor(0.04 * sr)
    for (let i = 0; i < hit; i++) burst[i] = 0.8 * Math.sin((2 * Math.PI * 880 * i) / sr)
    const burstPcm: Pcm = { sampleRate: sr, channels: [burst] }
    const dryEngine = new AudioEngine()
    const dryBurst = await renderProcessedPcm(burstPcm, dryEngine.processingSnapshot(), { factory })
    applySimpleDelay(engine, 'medium', 1)
    const echoed = await renderProcessedPcm(burstPcm, engine.processingSnapshot(), { factory })
    const echoStart = Math.floor(0.18 * sr)
    const echoEnd = Math.floor(0.45 * sr)
    expect(rms(echoed.channels[0]!, echoStart, echoEnd)).toBeGreaterThan(
      rms(dryBurst.channels[0]!, echoStart, echoEnd) + 0.01,
    )
  })

  it('omits the effect tail when Simple export asks for a dry end', async () => {
    const engine = new AudioEngine()
    applySimpleDelay(engine, 'short', 1)
    const sr = 22050
    const n = Math.floor(0.18 * sr)
    const ch = new Float32Array(n)
    const hit = Math.floor(0.025 * sr)
    for (let i = 0; i < hit; i++) ch[i] = 0.8 * Math.sin((2 * Math.PI * 440 * i) / sr)
    const source: Pcm = { sampleRate: sr, channels: [ch] }
    const snap = engine.processingSnapshot()
    snap.params.delayTime = 90
    snap.params.delayTimeR = 90
    snap.params.delayWet = 100
    snap.params.delayFeedback = 45
    const withTail = await renderProcessedPcm(source, snap, { factory })
    const dryEnd = await renderProcessedPcm(source, snap, { factory, includeEffectTail: false })
    expect(effectTailBudgetSec(snap.chain, snap.params, snap.reverbType)).toBeGreaterThan(0.05)
    expect(dryEnd.channels[0]!.length).toBeLessThanOrEqual(n + 8)
    expect(withTail.channels[0]!.length).toBeGreaterThan(n + Math.floor(0.05 * sr))
  })

  it('keeps a tone chosen before the context exists', async () => {
    const early = new AudioEngine()
    applySimpleTone(early, 'moreBass', 1)
    const host = globalThis as unknown as { window?: unknown; document?: unknown }
    const previous = { window: host.window, document: host.document }
    class LongOffline extends OfflineAudioContext {
      constructor(channels: number, _length: number, rate: number) {
        super(channels, rate, rate)
      }
    }
    ;(globalThis as unknown as { OfflineAudioContext?: unknown }).OfflineAudioContext = LongOffline
    host.window = {
      OfflineAudioContext: LongOffline,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener() {},
      removeEventListener() {},
    }
    host.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' }
    try {
      await early.unlock()
      const ctx = early.getLiveContext() as unknown as OfflineAudioContext
      const rate = ctx.sampleRate
      const tone = ctx.createBuffer(1, rate, rate)
      const data = tone.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = 0.4 * Math.sin((2 * Math.PI * 40 * i) / rate) + 0.4 * Math.sin((2 * Math.PI * 6000 * i) / rate)
      }
      const src = ctx.createBufferSource()
      src.buffer = tone
      const lead = (early as unknown as { leadInput(): AudioNode | null }).leadInput()
      src.connect(lead!)
      src.start(0)
      const rendered = await ctx.startRendering()
      const left = rendered.getChannelData(0)
      expect(bandEnergy(left, rate, 40) / bandEnergy(left, rate, 6000)).toBeGreaterThan(1.4)
    } finally {
      host.window = previous.window
      host.document = previous.document
    }
  })

  it('writes the live EQ and delay graph when a context already exists', async () => {
    const host = globalThis as unknown as {
      window?: unknown
      document?: unknown
      navigator?: unknown
    }
    const previous = { window: host.window, document: host.document }
    class LongOffline extends OfflineAudioContext {
      constructor(channels: number, _length: number, rate: number) {
        super(channels, rate, rate)
      }
    }
    ;(globalThis as unknown as { OfflineAudioContext?: unknown }).OfflineAudioContext = LongOffline
    host.window = {
      OfflineAudioContext: LongOffline,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      addEventListener() {},
      removeEventListener() {},
    }
    host.document = {
      addEventListener() {},
      removeEventListener() {},
      visibilityState: 'visible',
    }
    const engine = new AudioEngine()
    try {
      await engine.unlock()
      applySimpleTone(engine, 'moreBass', 1)
      applySimpleDelay(engine, 'medium', 1)
      expect(engine.getSnapshot().eqBands[0]?.type).toBe('lowshelf')
      const ctx = engine.getLiveContext() as unknown as OfflineAudioContext
      const rate = ctx.sampleRate
      const tone = ctx.createBuffer(1, rate, rate)
      const data = tone.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = 0.4 * Math.sin((2 * Math.PI * 40 * i) / rate) + 0.4 * Math.sin((2 * Math.PI * 6000 * i) / rate)
      }
      const src = ctx.createBufferSource()
      src.buffer = tone
      const lead = (engine as unknown as { leadInput(): AudioNode | null }).leadInput()
      expect(lead).toBeTruthy()
      src.connect(lead!)
      src.start(0)
      const rendered = await ctx.startRendering()
      const left = rendered.getChannelData(0)
      const low = bandEnergy(left, rate, 40)
      const high = bandEnergy(left, rate, 6000)
      expect(low / high).toBeGreaterThan(1.4)
    } finally {
      host.window = previous.window
      host.document = previous.document
    }
  })
})
