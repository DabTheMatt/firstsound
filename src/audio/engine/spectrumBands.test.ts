import { describe, expect, it } from 'vitest'
import {
  SPECTRUM_BAND_COUNT,
  bandPeakDb,
  followEnvelope,
  logBandEdgesHz,
} from './spectrumBands'

describe('logBandEdgesHz', () => {
  it('spans min to max with one extra edge', () => {
    const edges = logBandEdgesHz(20, 20000, 8)
    expect(edges.length).toBe(9)
    expect(edges[0]).toBeCloseTo(20)
    expect(edges[8]).toBeCloseTo(20000)
    expect(edges[4]! / edges[0]!).toBeCloseTo(edges[8]! / edges[4]!, 5)
  })
})

describe('bandPeakDb', () => {
  it('puts energy into the matching log band, not every pixel', () => {
    const bins = new Float32Array(512)
    bins.fill(-90)
    const sampleRate = 44100
    const fftSize = 1024
    const hz = 1000
    const bin = Math.round((hz * fftSize) / sampleRate)
    bins[bin] = -12
    const bands = bandPeakDb(bins, sampleRate, SPECTRUM_BAND_COUNT, 20)
    expect(bands.length).toBe(SPECTRUM_BAND_COUNT)
    const peakBand = [...bands].indexOf(Math.max(...bands))
    expect(bands[peakBand]).toBeCloseTo(-12)
    expect(bands.filter((d) => d > -80).length).toBeLessThan(4)
  })
})

describe('followEnvelope', () => {
  it('rises faster than it falls at typical spectrum coefficients', () => {
    const up = followEnvelope(-80, -10, 0.55, 0.28)
    const down = followEnvelope(-10, -80, 0.55, 0.28)
    expect(up + 80).toBeGreaterThan(Math.abs(down + 10))
  })
})
