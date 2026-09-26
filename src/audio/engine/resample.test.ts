import { describe, expect, it } from 'vitest'
import { stretchWindow } from './stretch'
import {
  effectiveInterpAlgo,
  goertzelMagnitude,
  interpQuality,
  overlapAddResample,
  playbackReadWrap,
  renderGlidedStretch,
  resampleInto,
  sampleAt,
  sincLobes,
  stretchInterpAlgoAt,
} from './resample'

function sine(length: number, sr: number, hz: number): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / sr)
  return out
}

function rms(samples: ArrayLike<number>): number {
  if (samples.length < 1) return 0
  let acc = 0
  for (let i = 0; i < samples.length; i++) acc += (samples[i] ?? 0) ** 2
  return Math.sqrt(acc / samples.length)
}

describe('stretchInterpAlgoAt', () => {
  it('maps stored indices', () => {
    expect(stretchInterpAlgoAt(0)).toBe('nearest')
    expect(stretchInterpAlgoAt(1)).toBe('linear')
    expect(stretchInterpAlgoAt(2)).toBe('cubic')
    expect(stretchInterpAlgoAt(3)).toBe('sinc')
  })

  it('falls back to nearest when interpolation is off', () => {
    expect(effectiveInterpAlgo(0, 3)).toBe('nearest')
    expect(effectiveInterpAlgo(1, 3)).toBe('sinc')
  })
})

describe('resampleInto', () => {
  it('fades unwindowed edges so nearest-neighbor grains do not click', () => {
    const dest = new Float32Array(32)
    dest.fill(1)
    resampleInto(dest, 32, new Float32Array(64).fill(1), 0, 1, 'nearest', false, 1)
    expect(dest[0]).toBeCloseTo(0)
    expect(dest[16]).toBeCloseTo(1)
    expect(dest[31]).toBeCloseTo(0)
  })
})

describe('sampleAt', () => {
  it('hits exact samples for every algorithm', () => {
    const src = new Float32Array([0, 0.5, 1, 0.5, 0])
    for (const algo of ['nearest', 'linear', 'cubic', 'sinc'] as const) {
      expect(sampleAt(src, 2, algo)).toBeCloseTo(1, algo === 'sinc' ? 1 : 5)
    }
  })

  it('linear interpolates halfway', () => {
    const src = new Float32Array([0, 10])
    expect(sampleAt(src, 0.5, 'linear')).toBeCloseTo(5)
  })
})

describe('pitch-down bass', () => {
  it('moves a 200 Hz tone to 100 Hz when the ratio is 1/2', () => {
    const sr = 48000
    const src = sine(sr, sr, 200)
    const out = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const low = goertzelMagnitude(out, sr, 100)
    const orig = goertzelMagnitude(out, sr, 200)
    expect(low).toBeGreaterThan(orig * 4)
    expect(low).toBeGreaterThan(0.003)
  })

  it('adds more low-frequency energy than an unpitched grain train', () => {
    const sr = 48000
    const src = sine(sr, sr, 180)
    const unity = overlapAddResample(src, sr, 4096, 1024, 1, 1, 'cubic', 0)
    const down = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const bassUnity = goertzelMagnitude(unity, sr, 90)
    const bassDown = goertzelMagnitude(down, sr, 90)
    expect(bassDown).toBeGreaterThan(bassUnity * 3)
  })

  it('keeps more 40 Hz energy with pitch-scaled grains than with short ones', () => {
    const sr = 48000
    const src = sine(Math.floor(sr * 1.2), sr, 80)
    const short = stretchWindow(100, 1, 1)
    const long = stretchWindow(100, 1, 0.5)
    const shortN = Math.round(short.grainSec * sr)
    const longN = Math.round(long.grainSec * sr)
    const shortHop = Math.round(short.hopSec * sr)
    const longHop = Math.round(long.hopSec * sr)
    const a = overlapAddResample(src, sr, shortN, shortHop, 1, 0.5, 'cubic', 0)
    const b = overlapAddResample(src, sr, longN, longHop, 1, 0.5, 'cubic', 0)
    expect(goertzelMagnitude(b, sr, 40)).toBeGreaterThan(goertzelMagnitude(a, sr, 40))
    expect(long.grainSec).toBeGreaterThan(short.grainSec * 1.5)
  })

  it('ducks a loop join instead of stepping from the tail to the head', () => {
    const src = new Float32Array(1000)
    for (let i = 0; i < src.length; i++) src[i] = -0.8 + (1.6 * i) / (src.length - 1)
    const wrap = { start: 0, end: 1000, mode: 'loop' as const, seam: 48 }
    const dest = new Float32Array(80)
    resampleInto(dest, 80, src, 970, 1, 'linear', true, 1, 'realtime', wrap)
    let maxJump = 0
    for (let i = 1; i < dest.length; i++) {
      maxJump = Math.max(maxJump, Math.abs((dest[i] ?? 0) - (dest[i - 1] ?? 0)))
    }
    expect(maxJump).toBeLessThan(0.08)
  })

  it('wraps a loop seam so the grain does not fall into silence', () => {
    const src = new Float32Array(200).fill(0.6)
    const dest = new Float32Array(48)
    const wrap = { start: 0, end: 200, mode: 'loop' as const }
    resampleInto(dest, 48, src, 180, 1, 'linear', false, 1, 'realtime', wrap)
    expect(dest[24]).toBeCloseTo(0.6, 2)
    const open = new Float32Array(48)
    resampleInto(open, 48, src, 180, 1, 'linear', false, 1, 'realtime')
    expect(Math.abs(open[24] ?? 0)).toBeLessThan(0.05)
  })

  it('maps a reversed loop into the reversed buffer', () => {
    const wrap = playbackReadWrap(1000, 0.2, 0.8, 1, true, true, false)
    expect(wrap?.mode).toBe('loop')
    expect(wrap?.start).toBeCloseTo(200)
    expect(wrap?.end).toBeCloseTo(800)
    expect(playbackReadWrap(1000, 0, 1, 1, false, false, false)).toBeUndefined()
  })

  it('names realtime and offline interpolation quality', () => {
    expect(interpQuality('nearest', 'realtime')).toBe('fast')
    expect(interpQuality('linear', 'offline')).toBe('fast')
    expect(interpQuality('cubic', 'realtime')).toBe('balanced')
    expect(interpQuality('sinc', 'realtime')).toBe('balanced')
    expect(interpQuality('sinc', 'offline')).toBe('high')
    expect(sincLobes('realtime')).toBeLessThan(sincLobes('offline'))
  })

  it('keeps a glided speed jump free of clicks on a steady tone', () => {
    const sr = 16000
    const src = new Float32Array(sr * 8).fill(0.75)
    const out = renderGlidedStretch(src, sr, sr, 62, 1, 4, 0, 'cubic', 'realtime')
    let maxJump = 0
    for (let i = 800; i < out.length - 800; i++) {
      maxJump = Math.max(maxJump, Math.abs((out[i + 1] ?? 0) - (out[i] ?? 0)))
    }
    expect(maxJump).toBeLessThan(0.08)
    const head = rms(out.subarray(400, 2000))
    const tail = rms(out.subarray(out.length - 2000, out.length - 400))
    expect(head).toBeGreaterThan(0.05)
    expect(tail).toBeGreaterThan(head * 0.7)
    expect(tail).toBeLessThan(head * 1.35)
  })

  it('plays slow, unity, and fast speeds at a steady level', () => {
    const sr = 16000
    const src = new Float32Array(sr * 8).fill(0.8)
    const levels: number[] = []
    for (const speed of [0.5, 1, 2]) {
      const out = renderGlidedStretch(src, Math.floor(sr * 0.7), sr, 62, speed, speed, 0, 'linear', 'realtime')
      const level = rms(out.subarray(Math.floor(sr * 0.12), out.length - 400))
      levels.push(level)
      expect(level).toBeGreaterThan(0.15)
    }
    expect(levels[0]).toBeGreaterThan((levels[1] ?? 0) * 0.7)
    expect(levels[2]).toBeGreaterThan((levels[1] ?? 0) * 0.7)
  })

  it('loops a selection without a silence hole at the seam', () => {
    const sr = 8000
    const src = sine(sr, sr, 220)
    const wrap = playbackReadWrap(sr, 0, 1, 1, false, true, false)
    const out = renderGlidedStretch(src, Math.floor(sr * 1.5), sr, 62, 1.4, 1.4, 0, 'linear', 'realtime', wrap)
    const seam = rms(out.subarray(sr - 200, sr + 200))
    const body = rms(out.subarray(400, 1200))
    expect(seam).toBeGreaterThan(body * 0.35)
  })

  it('spends fewer sinc taps in realtime than offline', () => {
    expect(sincLobes('realtime')).toBe(4)
    expect(sincLobes('offline')).toBe(8)
    expect(sincLobes('realtime')).toBeLessThan(sincLobes('offline'))
  })

  it('cubic and sinc reconstruct more 100 Hz than nearest when pitching down', () => {
    const sr = 48000
    const src = sine(sr, sr, 200)
    const nearest = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'nearest', 0)
    const cubic = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'cubic', 0)
    const sinc = overlapAddResample(src, sr, 8192, 2048, 1, 0.5, 'sinc', 0)
    const n100 = goertzelMagnitude(nearest, sr, 100)
    expect(goertzelMagnitude(cubic, sr, 100)).toBeGreaterThan(n100 * 0.85)
    expect(goertzelMagnitude(sinc, sr, 100)).toBeGreaterThan(n100 * 0.85)
  })
})
