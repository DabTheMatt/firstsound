import { describe, expect, it } from 'vitest'
import { computePeaks, mixToMono } from './peaks'

describe('computePeaks', () => {
  it('finds the absolute peak in each bucket', () => {
    const data = new Float32Array([0, 0.2, -0.9, 0.1, 0.4, 0])
    const peaks = computePeaks(data, 2)
    expect(peaks[0]).toBeCloseTo(0.9)
    expect(peaks[1]).toBeCloseTo(0.4)
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
