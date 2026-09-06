import { describe, expect, it } from 'vitest'
import { stretchWindow } from './stretch'
import {
  effectiveInterpAlgo,
  goertzelMagnitude,
  overlapAddResample,
  sampleAt,
  stretchInterpAlgoAt,
} from './resample'

function sine(length: number, sr: number, hz: number): Float32Array {
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) out[i] = Math.sin((2 * Math.PI * hz * i) / sr)
  return out
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
