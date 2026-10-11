import 'node-web-audio-api/polyfill.js'
import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'
import { maxAdjacentDelta } from './antiClick'
import { renderFadedRegion } from './loopFade'

function stepTone(sampleRate: number, seconds: number): Float32Array {
  const frames = Math.round(seconds * sampleRate)
  const data = new Float32Array(frames)
  const mid = frames / 2
  for (let i = 0; i < frames; i++) data[i] = i < mid ? 0.85 : -0.85
  return data
}

describe('renderFadedRegion', () => {
  it('meets the next pass at silence while the middle stays loud', () => {
    const rate = 8000
    const src = stepTone(rate, 0.5)
    const faded = renderFadedRegion([src], rate, 0.05, 0.45, 0.02, 0.02, 'linear')
    expect(faded).not.toBeNull()
    const pass = faded![0]!
    expect(Math.abs(pass[0] ?? 1)).toBeLessThan(0.001)
    expect(Math.abs(pass[pass.length - 1] ?? 1)).toBeLessThan(0.001)
    expect(Math.abs(pass[Math.floor(pass.length * 0.35)] ?? 0)).toBeGreaterThan(0.7)
    const joined = new Float32Array(pass.length * 2)
    joined.set(pass, 0)
    joined.set(pass, pass.length)
    expect(maxAdjacentDelta(joined, pass.length - 3, pass.length + 3)).toBeLessThan(0.02)
  })

  it('leaves the source alone when both fades are closed', () => {
    const src = stepTone(8000, 0.2)
    expect(renderFadedRegion([src], 8000, 0, 0.2, 0, 0, 'linear')).toBeNull()
  })
})

describe('native loop seam', () => {
  it('does not click when a faded region loops', async () => {
    const rate = 8000
    const src = stepTone(rate, 0.5)
    const faded = renderFadedRegion([src], rate, 0.05, 0.45, 0.02, 0.02, 'linear')!
    const ctx = new OfflineAudioContext(1, rate, rate)
    const buffer = ctx.createBuffer(1, faded[0]!.length, rate)
    buffer.getChannelData(0).set(faded[0]!)
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.loop = true
    node.loopStart = 0
    node.loopEnd = buffer.duration
    node.connect(ctx.destination)
    node.start(0, 0, 0.9)
    const data = (await ctx.startRendering()).getChannelData(0)
    const seam = Math.round(buffer.duration * rate)
    expect(maxAdjacentDelta(data, seam - 4, seam + 4)).toBeLessThan(0.05)
    expect(Math.abs(data[Math.round(rate * 0.08)] ?? 0)).toBeGreaterThan(0.5)
  })

  it('still shows the raw join when the same region is not faded', async () => {
    const rate = 8000
    const src = stepTone(rate, 0.5)
    const start = Math.floor(0.05 * rate)
    const end = Math.ceil(0.45 * rate)
    const ctx = new OfflineAudioContext(1, rate, rate)
    const buffer = ctx.createBuffer(1, end - start, rate)
    buffer.getChannelData(0).set(src.subarray(start, end))
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.loop = true
    node.loopStart = 0
    node.loopEnd = buffer.duration
    node.connect(ctx.destination)
    node.start(0, 0, 0.9)
    const data = (await ctx.startRendering()).getChannelData(0)
    const seam = Math.round(buffer.duration * rate)
    expect(maxAdjacentDelta(data, seam - 2, seam + 2)).toBeGreaterThan(1)
  })
})

describe('loop playback', () => {
  it('publishes the loop flag before the restart finishes', async () => {
    const host = window as Window & { setTimeout?: typeof setTimeout }
    if (typeof host.setTimeout !== 'function') host.setTimeout = ((fn: TimerHandler, ms?: number) => setTimeout(fn, ms)) as typeof setTimeout
    const engine = new AudioEngine()
    const rate = 8000
    const ctx = new OfflineAudioContext(1, rate, rate)
    engine.useOfflineGraph(ctx)
    const id = engine.getSnapshot().tracks[0]!.id
    engine.loadTrackPcm(id, [stepTone(rate, 0.5)], rate, 'step.wav')
    await engine.play()
    engine.setLoop(true)
    expect(engine.getSnapshot().loop).toBe(true)
    expect(engine.getSnapshot().tracks.find((track) => track.id === id)?.loop).toBe(true)
    engine.setLoop(false)
    expect(engine.getSnapshot().loop).toBe(false)
  })

  it('keeps a faded loop free of a full-scale step at the wrap', async () => {
    const host = window as Window & { setTimeout?: typeof setTimeout }
    if (typeof host.setTimeout !== 'function') host.setTimeout = ((fn: TimerHandler, ms?: number) => setTimeout(fn, ms)) as typeof setTimeout
    const engine = new AudioEngine()
    const rate = 8000
    const ctx = new OfflineAudioContext(2, Math.round(rate * 0.7), rate)
    engine.useOfflineGraph(ctx)
    const id = engine.getSnapshot().tracks[0]!.id
    engine.loadTrackPcm(id, [stepTone(rate, 0.5)], rate, 'step.wav')
    engine.setRegion(0.05, 0.45)
    engine.setRegionFades(0.02, 0.02, 'linear')
    engine.setLoop(true)
    await engine.play()
    const data = (await ctx.startRendering()).getChannelData(0)
    const lead = Math.round(0.02 * rate)
    expect(Math.abs(data[lead + Math.round(0.1 * rate)] ?? 0)).toBeGreaterThan(0.4)
    const from = Math.round(0.4 * rate)
    const to = Math.round(0.46 * rate)
    let quiet = 1
    for (let i = from; i < to; i++) quiet = Math.min(quiet, Math.abs(data[i] ?? 1))
    expect(quiet).toBeLessThan(0.05)
    expect(maxAdjacentDelta(data, from, to)).toBeLessThan(0.05)
  })
})
