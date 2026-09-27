import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { binFrequencyHz, timeDomainToDb, type SpectrumFftScratch } from './spectrumFft'
import { setSmoothedAudioParam } from './paramSmooth'
import { createClickSafeShaper } from '../fx/shaperCurve'
import { defaultParamValues } from '../parameters/definitions'
import { applyFilterGraph, createFilterGraph } from '../fx/filterGraph'
import { FILTER_TYPE_OPTIONS } from '../fx/filter'

function maxDelta(samples: Float32Array, from: number, to: number): number {
  let max = 0
  const end = Math.min(samples.length, to)
  for (let i = Math.max(1, from); i < end; i++) {
    max = Math.max(max, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)))
  }
  return max
}

function highBandDb(samples: Float32Array, sampleRate: number, atSec: number): number {
  const fft = 2048
  const scratch: SpectrumFftScratch = { window: null, real: null, imag: null }
  const out = new Float32Array(fft / 2)
  const start = Math.max(0, Math.min(samples.length - fft, Math.floor(atSec * sampleRate) - fft / 2))
  timeDomainToDb(samples.subarray(start, start + fft), out, scratch)
  let acc = 0
  let n = 0
  for (let i = 1; i < out.length; i++) {
    if (binFrequencyHz(i, fft, sampleRate) < 4000) continue
    acc += out[i] ?? -120
    n++
  }
  return n ? acc / n : -120
}

async function renderDcGain(
  schedule: (gain: AudioParam) => void,
): Promise<Float32Array> {
  const sr = 48000
  const ctx = new OfflineAudioContext(1, sr, sr)
  const buffer = ctx.createBuffer(1, sr, sr)
  buffer.getChannelData(0).fill(0.8)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const gain = ctx.createGain()
  gain.gain.value = 0.2
  src.connect(gain)
  gain.connect(ctx.destination)
  src.start()
  schedule(gain.gain)
  const rendered = await ctx.startRendering()
  return rendered.getChannelData(0)
}

describe('setSmoothedAudioParam', () => {
  it('ramps a sustained tone through large gain jumps without a step', async () => {
    const smoothed = await renderDcGain((gain) => {
      for (let i = 0; i < 24; i++) {
        const t = 0.12 + i * 0.03
        setSmoothedAudioParam(gain, i % 2 === 0 ? 1 : 0.15, t, 'gain')
      }
    })
    const stepped = await renderDcGain((gain) => {
      gain.setValueAtTime(0.2, 0.2)
      gain.setValueAtTime(1, 0.2)
    })
    expect(maxDelta(smoothed, 4000, 44000)).toBeLessThan(0.01)
    expect(maxDelta(stepped, 4000, 44000)).toBeGreaterThan(0.4)
    expect(smoothed.some((sample) => !Number.isFinite(sample))).toBe(false)
  })

  it('keeps fast automation-sized gain moves free of broadband clicks', async () => {
    const smoothed = await renderDcGain((gain) => {
      for (let i = 0; i < 40; i++) {
        const t = 0.2 + i * 0.012
        setSmoothedAudioParam(gain, 0.15 + (i / 39) * 0.8, t, 'gain')
      }
    })
    const snapped = await renderDcGain((gain) => {
      gain.setValueAtTime(0.15, 0.25)
      gain.setValueAtTime(0.95, 0.25)
    })
    const smoothHf = highBandDb(smoothed, 48000, 0.28)
    const snapHf = highBandDb(snapped, 48000, 0.25)
    expect(smoothHf).toBeLessThan(snapHf - 12)
    expect(maxDelta(smoothed, 2000, 45000)).toBeLessThan(0.01)
  })

  it('glides filter cutoff and filter-type changes on a steady sine', async () => {
    const sr = 48000
    const ctx = new OfflineAudioContext(1, sr, sr)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 440
    const wet = ctx.createGain()
    const output = ctx.createGain()
    wet.gain.value = 1
    const graph = createFilterGraph(ctx, wet, output)
    osc.connect(wet)
    output.connect(ctx.destination)
    osc.start()
    const params = defaultParamValues()
    params.filterKind = FILTER_TYPE_OPTIONS.findIndex((option) => option.value === 'lowpass')
    params.filterCutoff = 600
    params.filterReso = 2
    params.filterDrive = 0
    applyFilterGraph(graph, params, 0, 0.03, sr)
    for (let i = 0; i < 16; i++) {
      const t = 0.15 + i * 0.03
      params.filterCutoff = i % 2 === 0 ? 5000 : 280
      applyFilterGraph(graph, params, t, 0.03, sr)
    }
    params.filterKind = FILTER_TYPE_OPTIONS.findIndex((option) => option.value === 'highpass')
    params.filterCutoff = 900
    applyFilterGraph(graph, params, 0.7, 0.03, sr)
    const rendered = await ctx.startRendering()
    const data = rendered.getChannelData(0)
    expect(data.some((sample) => !Number.isFinite(sample))).toBe(false)
    expect(maxDelta(data, 2000, 46000)).toBeLessThan(0.35)
    let peak = 0
    for (let i = 8000; i < 20000; i++) peak = Math.max(peak, Math.abs(data[i] ?? 0))
    expect(peak).toBeGreaterThan(0.05)
  })

  it('crossfades a waveshaper transfer instead of stepping a sustained level', async () => {
    const sr = 48000
    const ctx = new OfflineAudioContext(1, sr, sr)
    const buffer = ctx.createBuffer(1, sr, sr)
    buffer.getChannelData(0).fill(0.6)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const shaper = createClickSafeShaper(ctx)
    src.connect(shaper.input)
    shaper.output.connect(ctx.destination)
    src.start()
    const linear = new Float32Array(128)
    const quiet = new Float32Array(128)
    for (let i = 0; i < 128; i++) {
      const x = (i / 127) * 2 - 1
      linear[i] = x
      quiet[i] = x * 0.25
    }
    shaper.setCurve('open', linear, 0)
    const quieter = new Float32Array(quiet.length)
    for (let i = 0; i < quiet.length; i++) quieter[i] = (quiet[i] ?? 0) * 0.5
    shaper.setCurve('quiet', quiet, 0.35)
    shaper.setCurve('quieter', quieter, 0.35)
    const data = (await ctx.startRendering()).getChannelData(0)
    expect(maxDelta(data, 1000, 46000)).toBeLessThan(0.02)
    expect(Math.abs((data[1000] ?? 0) - 0.6)).toBeLessThan(0.05)
    expect(Math.abs((data[sr - 2000] ?? 0) - 0.075)).toBeLessThan(0.04)
  })

  it('replaces a same-time ramp so a bypass mute does not leak the previous target', async () => {
    const sr = 22050
    const ctx = new OfflineAudioContext(1, Math.floor(sr * 0.5), sr)
    const buffer = ctx.createBuffer(1, Math.floor(sr * 0.5), sr)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < channel.length; i++) channel[i] = 0.45 * Math.sin((2 * Math.PI * 330 * i) / sr)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const leak = ctx.createGain()
    leak.gain.value = 0
    src.connect(leak)
    leak.connect(ctx.destination)
    src.start()
    for (let t = 0; t < 0.5; t += 0.008) {
      const time = Math.round(t * 1e6) / 1e6
      setSmoothedAudioParam(leak.gain, 0.8, time, 'gain')
      setSmoothedAudioParam(leak.gain, 0, time, 'gain')
    }
    const data = (await ctx.startRendering()).getChannelData(0)
    expect(maxDelta(data, 200, data.length - 200)).toBeLessThan(0.05)
    expect(Math.max(...data.map((sample) => Math.abs(sample)))).toBeLessThan(0.02)
  })

  it('moves delay time and playback rate continuously', async () => {
    const sr = 48000
    const ctx = new OfflineAudioContext(1, sr, sr)
    const osc = ctx.createOscillator()
    osc.frequency.value = 220
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.02
    osc.connect(delay)
    delay.connect(ctx.destination)
    osc.start()
    setSmoothedAudioParam(delay.delayTime, 0.08, 0.3, 'delayTime')
    setSmoothedAudioParam(delay.delayTime, 0.015, 0.55, 'delayTime')
    const delayed = (await ctx.startRendering()).getChannelData(0)
    expect(delayed.some((sample) => !Number.isFinite(sample))).toBe(false)
    expect(maxDelta(delayed, 2000, 45000)).toBeLessThan(0.08)

    const rateCtx = new OfflineAudioContext(1, sr, sr)
    const tone = rateCtx.createBuffer(1, sr, sr)
    const channel = tone.getChannelData(0)
    for (let i = 0; i < channel.length; i++) channel[i] = Math.sin((2 * Math.PI * 220 * i) / sr)
    const src = rateCtx.createBufferSource()
    src.buffer = tone
    src.loop = true
    src.connect(rateCtx.destination)
    src.start()
    setSmoothedAudioParam(src.playbackRate, 1.6, 0.25, 'pitch')
    setSmoothedAudioParam(src.playbackRate, 0.7, 0.55, 'pitch')
    const rated = (await rateCtx.startRendering()).getChannelData(0)
    expect(rated.some((sample) => !Number.isFinite(sample))).toBe(false)
    expect(maxDelta(rated, 2000, 45000)).toBeLessThan(0.12)
  })
})
