import { describe, expect, it } from 'vitest'
import { computeMinMax, computeMinMaxCached, computePeaks, buildPeakMips, mixToMono } from './peaks'

describe('computePeaks', () => {
  it('finds the absolute peak in each bucket', () => {
    const data = new Float32Array([0, 0.2, -0.9, 0.1, 0.4, 0])
    const peaks = computePeaks(data, 2)
    expect(peaks[0]).toBeCloseTo(0.9)
    expect(peaks[1]).toBeCloseTo(0.4)
  })
})

describe('computeMinMax', () => {
  it('captures per-bucket min, max and the overall peak', () => {
    const data = new Float32Array([0, 0.2, -0.9, 0.1, 0.4, 0])
    const { min, max, peak } = computeMinMax(data, 0, data.length, 2)
    expect(min[0]).toBeCloseTo(-0.9)
    expect(max[0]).toBeCloseTo(0.2)
    expect(max[1]).toBeCloseTo(0.4)
    expect(peak).toBeCloseTo(0.9)
  })

  it('honours a sub-range window', () => {
    const data = new Float32Array([1, 1, 0.1, 0.2, 1, 1])
    const { peak } = computeMinMax(data, 2, 4, 1)
    expect(peak).toBeCloseTo(0.2)
  })
})

describe('peak mips', () => {
  it('covers the same peak as a raw scan on a coarse window', () => {
    const data = new Float32Array(4096)
    data[2000] = 0.8
    data[2001] = -0.6
    const mips = buildPeakMips(data, [32, 256])
    expect(mips.length).toBeGreaterThan(0)
    const raw = computeMinMax(data, 0, data.length, 16)
    const cached = computeMinMaxCached(data, mips, 0, data.length, 16)
    expect(cached.peak).toBeCloseTo(raw.peak)
    expect(cached.peak).toBeCloseTo(0.8)
  })
})

describe('mixToMono', () => {
  it('averages channels', () => {
    const buffer = {
      numberOfChannels: 2,
      length: 2,
      getChannelData(ch: number) {
        return ch === 0 ? new Float32Array([1, 0]) : new Float32Array([0, 1])
      },
    }
    const mixed = mixToMono(buffer)
    expect(mixed[0]).toBeCloseTo(0.5)
    expect(mixed[1]).toBeCloseTo(0.5)
  })
})
