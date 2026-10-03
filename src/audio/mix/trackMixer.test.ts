import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { msLevelGain } from '../fx/midSide'
import {
  TRACK_MIXER_STAGES,
  applyTrackMixerParams,
  createTrackMixerStrip,
  enableTrackMidSide,
  reconstructMidSide,
} from './trackMixer'

function buffer(
  ctx: BaseAudioContext,
  channels: Float32Array[],
  sampleRate: number,
): AudioBuffer {
  const audio = ctx.createBuffer(channels.length, channels[0]!.length, sampleRate)
  channels.forEach((data, index) => audio.getChannelData(index).set(data))
  return audio
}

function tone(frames: number, sampleRate: number, hz: number, phase = 0): Float32Array {
  const data = new Float32Array(frames)
  for (let i = 0; i < frames; i++) data[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate + phase)
  return data
}

async function render(ctx: OfflineAudioContext): Promise<AudioBuffer> {
  return ctx.startRendering()
}

function peak(data: Float32Array, from: number, to: number): number {
  let max = 0
  const end = Math.min(data.length, to)
  for (let i = from; i < end; i++) max = Math.max(max, Math.abs(data[i] ?? 0))
  return max
}

function maxStep(data: Float32Array, from: number, to: number): number {
  let max = 0
  const end = Math.min(data.length, to)
  for (let i = from + 1; i < end; i++) {
    max = Math.max(max, Math.abs((data[i] ?? 0) - (data[i - 1] ?? 0)))
  }
  return max
}

describe('mid/side reconstruction', () => {
  it('rebuilds the stereo sample at unity and narrows when side gain falls', () => {
    const unity = reconstructMidSide(0.4, -0.25, 1, 1)
    expect(unity.left).toBeCloseTo(0.4, 6)
    expect(unity.right).toBeCloseTo(-0.25, 6)
    const mid = reconstructMidSide(0.4, -0.2, 1, 0)
    expect(mid.left).toBeCloseTo(0.1, 6)
    expect(mid.right).toBeCloseTo(0.1, 6)
    const wider = reconstructMidSide(0.2, -0.2, 1, msLevelGain(6))
    expect(Math.abs(wider.left - wider.right)).toBeGreaterThan(Math.abs(0.2 - -0.2))
  })

  it('documents the mixer stage order and the FX insertion point', () => {
    expect(TRACK_MIXER_STAGES).toEqual(['source', 'fxInsert', 'midSide', 'pan', 'level', 'muteSolo', 'master'])
  })
})

describe('track mixer graph', () => {
  it('nulls a stereo buffer at unity pan, level, mid, and side', async () => {
    const rate = 44100
    const frames = 2048
    const left = tone(frames, rate, 440)
    const right = tone(frames, rate, 440, Math.PI / 2)
    const ctx = new OfflineAudioContext(2, frames, rate)
    const src = ctx.createBufferSource()
    src.buffer = buffer(ctx, [left, right], rate)
    const strip = createTrackMixerStrip(ctx)
    enableTrackMidSide(ctx, strip)
    applyTrackMixerParams(strip, { pan: 0, level: 1, gate: 1, midDb: 0, sideDb: 0 }, 0)
    src.connect(strip.input)
    strip.output.connect(ctx.destination)
    src.start(0)
    const out = await render(ctx)
    let err = 0
    const a = out.getChannelData(0)
    const b = out.getChannelData(1)
    for (let i = 64; i < frames - 64; i++) {
      err = Math.max(err, Math.abs((a[i] ?? 0) - (left[i] ?? 0)), Math.abs((b[i] ?? 0) - (right[i] ?? 0)))
    }
    expect(err).toBeLessThan(1e-4)
  })

  it('keeps the impulse on the same sample when side returns to unity', async () => {
    const rate = 44100
    const frames = 1024
    const left = new Float32Array(frames)
    const right = new Float32Array(frames)
    left[200] = 0.8
    right[200] = -0.4
    const ctx = new OfflineAudioContext(2, frames, rate)
    const src = ctx.createBufferSource()
    src.buffer = buffer(ctx, [left, right], rate)
    const strip = createTrackMixerStrip(ctx)
    enableTrackMidSide(ctx, strip)
    applyTrackMixerParams(strip, { pan: 0, level: 1, gate: 1, midDb: 0, sideDb: 0 }, 0)
    src.connect(strip.input)
    strip.output.connect(ctx.destination)
    src.start(0)
    const out = await render(ctx)
    expect(out.getChannelData(0)[200]).toBeCloseTo(0.8, 3)
    expect(out.getChannelData(1)[200]).toBeCloseTo(-0.4, 3)
    expect(peak(out.getChannelData(0), 0, 190)).toBeLessThan(0.02)
  })

  it('approaches mid-only when side is at the floor', async () => {
    const rate = 44100
    const frames = 2048
    const left = tone(frames, rate, 220)
    const right = tone(frames, rate, 330)
    const ctx = new OfflineAudioContext(2, frames, rate)
    const src = ctx.createBufferSource()
    src.buffer = buffer(ctx, [left, right], rate)
    const strip = createTrackMixerStrip(ctx)
    enableTrackMidSide(ctx, strip)
    applyTrackMixerParams(strip, { pan: 0, level: 1, gate: 1, midDb: 0, sideDb: -60 }, 0)
    src.connect(strip.input)
    strip.output.connect(ctx.destination)
    src.start(0)
    const out = await render(ctx)
    let diff = 0
    const a = out.getChannelData(0)
    const b = out.getChannelData(1)
    for (let i = 400; i < frames - 100; i++) diff = Math.max(diff, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
    expect(diff).toBeLessThan(0.01)
    expect(peak(a, 400, frames - 100)).toBeGreaterThan(0.05)
  })

  it('pans a mono buffer to the left and keeps center equal', async () => {
    const rate = 44100
    const frames = 2048
    const mono = tone(frames, rate, 440)
    const renderPan = async (pan: number) => {
      const ctx = new OfflineAudioContext(2, frames, rate)
      const src = ctx.createBufferSource()
      src.buffer = buffer(ctx, [mono], rate)
      const strip = createTrackMixerStrip(ctx)
      applyTrackMixerParams(strip, { pan, level: 1, gate: 1, midDb: 0, sideDb: 0 }, 0)
      src.connect(strip.input)
      strip.output.connect(ctx.destination)
      src.start(0)
      return render(ctx)
    }
    const center = await renderPan(0)
    const leftPeak = peak(center.getChannelData(0), 400, 1800)
    const rightPeak = peak(center.getChannelData(1), 400, 1800)
    expect(leftPeak).toBeGreaterThan(0.4)
    expect(Math.abs(leftPeak - rightPeak)).toBeLessThan(0.05)
    const hard = await renderPan(-100)
    expect(peak(hard.getChannelData(0), 400, 1800)).toBeGreaterThan(0.5)
    expect(peak(hard.getChannelData(1), 400, 1800)).toBeLessThan(0.05)
  })

  it('balances a stereo buffer without moving the center image', async () => {
    const rate = 44100
    const frames = 2048
    const left = tone(frames, rate, 440)
    const right = tone(frames, rate, 660)
    const renderPan = async (pan: number) => {
      const ctx = new OfflineAudioContext(2, frames, rate)
      const src = ctx.createBufferSource()
      src.buffer = buffer(ctx, [left, right], rate)
      const strip = createTrackMixerStrip(ctx)
      enableTrackMidSide(ctx, strip)
      applyTrackMixerParams(strip, { pan, level: 1, gate: 1, midDb: 0, sideDb: 0 }, 0)
      src.connect(strip.input)
      strip.output.connect(ctx.destination)
      src.start(0)
      return render(ctx)
    }
    const center = await renderPan(0)
    let err = 0
    for (let i = 200; i < 1800; i++) {
      err = Math.max(
        err,
        Math.abs((center.getChannelData(0)[i] ?? 0) - (left[i] ?? 0)),
        Math.abs((center.getChannelData(1)[i] ?? 0) - (right[i] ?? 0)),
      )
    }
    expect(err).toBeLessThan(1e-3)
    const leaned = await renderPan(-100)
    expect(peak(leaned.getChannelData(1), 400, 1800)).toBeLessThan(peak(leaned.getChannelData(0), 400, 1800) * 0.25)
  })

  it('sums tracks without dividing by the track count', async () => {
    const rate = 44100
    const frames = 1024
    const a = new Float32Array(frames).fill(0.3)
    const b = new Float32Array(frames).fill(0.2)
    const ctx = new OfflineAudioContext(2, frames, rate)
    const sum = ctx.createGain()
    sum.gain.value = 1
    for (const data of [a, b]) {
      const src = ctx.createBufferSource()
      src.buffer = buffer(ctx, [data, data], rate)
      const strip = createTrackMixerStrip(ctx)
      enableTrackMidSide(ctx, strip)
      applyTrackMixerParams(strip, { pan: 0, level: 1, gate: 1, midDb: 0, sideDb: 0 }, 0)
      src.connect(strip.input)
      strip.output.connect(sum)
      src.start(0)
    }
    sum.connect(ctx.destination)
    const out = await render(ctx)
    const sample = out.getChannelData(0)[700] ?? 0
    expect(sample).toBeCloseTo(0.5, 2)
    expect(sample).toBeGreaterThan(0.4)
  })

  it('ramps mute instead of stepping, and keeps the same nodes', async () => {
    const rate = 44100
    const frames = 2048
    const left = new Float32Array(frames).fill(0.6)
    const right = new Float32Array(frames).fill(0.6)
    const ctx = new OfflineAudioContext(2, frames, rate)
    const src = ctx.createBufferSource()
    src.buffer = buffer(ctx, [left, right], rate)
    const strip = createTrackMixerStrip(ctx)
    const panner = strip.panner
    const level = strip.level
    const gate = strip.gate
    enableTrackMidSide(ctx, strip)
    const mid = strip.ms?.mid
    const side = strip.ms?.side
    applyTrackMixerParams(strip, { pan: -40, level: 0.5, gate: 0, midDb: -3, sideDb: -6 }, 0)
    applyTrackMixerParams(strip, { pan: 20, level: 0.8, gate: 0, midDb: 1, sideDb: 2 }, 0)
    expect(strip.panner).toBe(panner)
    expect(strip.level).toBe(level)
    expect(strip.gate).toBe(gate)
    expect(strip.ms?.mid).toBe(mid)
    expect(strip.ms?.side).toBe(side)
    src.connect(strip.input)
    strip.output.connect(ctx.destination)
    src.start(0)
    const out = await render(ctx)
    const data = out.getChannelData(0)
    expect(Math.abs(data[0] ?? 0)).toBeGreaterThan(0.2)
    expect(maxStep(data, 0, 800)).toBeLessThan(0.05)
    expect(Math.abs(data[1200] ?? 1)).toBeLessThan(0.02)
  })

  it('silences a muted strip and a strip excluded by solo', async () => {
    const rate = 44100
    const frames = 1500
    const data = new Float32Array(frames).fill(0.5)
    const run = async (gate: number) => {
      const ctx = new OfflineAudioContext(1, frames, rate)
      const src = ctx.createBufferSource()
      src.buffer = buffer(ctx, [data], rate)
      const strip = createTrackMixerStrip(ctx)
      applyTrackMixerParams(strip, { pan: 0, level: 1, gate, midDb: 0, sideDb: 0 }, 0)
      src.connect(strip.input)
      strip.output.connect(ctx.destination)
      src.start(0)
      const out = await render(ctx)
      return peak(out.getChannelData(0), 400, 1400)
    }
    expect(await run(1)).toBeGreaterThan(0.2)
    expect(await run(0)).toBeLessThan(0.01)
  })
})
