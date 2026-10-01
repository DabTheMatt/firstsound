import { OfflineAudioContext } from 'node-web-audio-api'
import { describe, expect, it } from 'vitest'
import { setSmoothedAudioParam, SMOOTH_DELAY_MAX_SEC } from './paramSmooth'
import { renderGlidedStretch } from './resample'
import { stretchSchedule } from './stretch'

function sine(length: number, sr: number, hz: number, amp = 0.8): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / sr)
  return out
}

function maxDelta(samples: Float32Array, from: number, to: number): number {
  let max = 0
  const end = Math.min(samples.length, to)
  for (let i = Math.max(1, from); i < end; i++) {
    max = Math.max(max, Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)))
  }
  return max
}

function countAbove(samples: Float32Array, from: number, to: number, limit: number): number {
  let count = 0
  const end = Math.min(samples.length, to)
  for (let i = Math.max(1, from); i < end; i++) {
    if (Math.abs((samples[i] ?? 0) - (samples[i - 1] ?? 0)) > limit) count += 1
  }
  return count
}

describe('delay read-head continuity', () => {
  it('glides a large delay-time jump without a torn read head', async () => {
    const sr = 48000
    const ctx = new OfflineAudioContext(1, sr, sr)
    const osc = ctx.createOscillator()
    osc.frequency.value = 180
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.02
    osc.connect(delay)
    delay.connect(ctx.destination)
    osc.start()
    setSmoothedAudioParam(delay.delayTime, 0.42, 0.2, 'delayTime')
    const data = (await ctx.startRendering()).getChannelData(0)
    const torn = await (async () => {
      const hard = new OfflineAudioContext(1, sr, sr)
      const tone = hard.createOscillator()
      tone.frequency.value = 180
      const line = hard.createDelay(1)
      line.delayTime.value = 0.02
      tone.connect(line)
      line.connect(hard.destination)
      tone.start()
      line.delayTime.setValueAtTime(0.02, 0.2)
      // The previous delay policy capped this 400 ms jump at 30 ms and tore the read head.
      line.delayTime.linearRampToValueAtTime(0.42, 0.2 + SMOOTH_DELAY_MAX_SEC)
      return (await hard.startRendering()).getChannelData(0)
    })()
    const limit = 0.09
    expect(maxDelta(torn, Math.floor(0.18 * sr), Math.floor(0.45 * sr))).toBeGreaterThan(limit)
    expect(maxDelta(data, Math.floor(0.18 * sr), Math.floor(0.7 * sr))).toBeLessThan(limit)
    expect(data.some((sample) => !Number.isFinite(sample))).toBe(false)
  })

  it('survives delay-time reversals at gesture rate', async () => {
    const sr = 48000
    const ctx = new OfflineAudioContext(1, sr, sr)
    const osc = ctx.createOscillator()
    osc.frequency.value = 180
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.04
    osc.connect(delay)
    delay.connect(ctx.destination)
    osc.start()
    for (let i = 0; i < 28; i++) {
      const t = 0.12 + i * 0.016
      setSmoothedAudioParam(delay.delayTime, i % 2 === 0 ? 0.03 : 0.28, t, 'delayTime')
    }
    const data = (await ctx.startRendering()).getChannelData(0)
    expect(countAbove(data, Math.floor(0.1 * sr), data.length - 1000, 0.09)).toBe(0)
  })
})

describe('stretch pitch glide', () => {
  it('shortens the window while pitch is still chasing', () => {
    const settled = stretchSchedule(76, 1, 0, 1, 1, 0, 0)
    const chasing = stretchSchedule(76, 1, 0, 1, 1, 0, 24)
    expect(chasing.hopSec).toBeLessThan(settled.hopSec)
    expect(chasing.hopSec / chasing.grainSec).toBeCloseTo(settled.hopSec / settled.grainSec, 2)
  })

  it('keeps a bass tone continuous while pitch runs the sensory range', () => {
    const sr = 48000
    const src = sine(sr * 6, sr, 80, 0.75)
    const out = renderGlidedStretch(src, Math.floor(sr * 0.9), sr, 76, 1, 1, 19, 'cubic', 'realtime')
    const limit = ((2 * Math.PI * 80 * 0.75) / sr) * 8
    expect(maxDelta(out, 4000, out.length - 4000)).toBeLessThan(Math.max(0.05, limit))
    let body = 0
    const bodyFrom = Math.floor(sr * 0.15)
    const bodyTo = Math.floor(sr * 0.45)
    for (let i = bodyFrom; i < bodyTo; i++) body += (out[i] ?? 0) ** 2
    body = Math.sqrt(body / (bodyTo - bodyFrom))
    const win = 256
    let worst = 1
    for (let i = bodyFrom; i + win < out.length - 2000; i += win) {
      let acc = 0
      for (let k = 0; k < win; k++) acc += (out[i + k] ?? 0) ** 2
      const rms = Math.sqrt(acc / win)
      if (body > 0.02) worst = Math.min(worst, rms / body)
    }
    expect(body).toBeGreaterThan(0.05)
    expect(worst).toBeGreaterThan(0.35)
  })
})
