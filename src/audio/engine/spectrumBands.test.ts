import { describe, expect, it } from 'vitest'
import {
  SPECTRUM_BAND_COUNT,
  bandPeakDb,
  capBandByExpected,
  capBandsByEqGain,
  clampSpectrumBandCount,
  clampSpectrumFollowMode,
  fftDbAtHz,
  fftFirstBinHz,
  fftPeakDbInHzRange,
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

  it('does not smear one low FFT bin across the sub-bass log bands', () => {
    const bins = new Float32Array(2048)
    bins.fill(-90)
    bins[1] = -40
    const bands = bandPeakDb(bins, 44100, 256, 10)
    const hot = bands.filter((d) => d > -50)
    expect(hot.length).toBeLessThan(3)
    expect(bands[0]).toBeLessThan(-80)
  })
})

describe('fftDbAtHz', () => {
  it('returns the floor below the first bin', () => {
    const bins = new Float32Array(512)
    bins.fill(-30)
    expect(fftFirstBinHz(44100, 512)).toBeCloseTo(44100 / 1024)
    expect(fftDbAtHz(bins, 44100, 5)).toBe(-100)
  })
})

describe('capBandByExpected', () => {
  it('hides FFT leakage below a steep high-pass', () => {
    expect(capBandByExpected(-40, -10 + -90)).toBe(-100)
    expect(capBandByExpected(-12, -12 + 0)).toBe(-12)
    expect(capBandByExpected(-20, -30 + 6)).toBe(-24)
  })

  it('caps a post band array in place', () => {
    const post = new Float32Array([-40, -12])
    capBandsByEqGain(post, [-8, -12], [-80, 0])
    expect(post[0]).toBe(-88)
    expect(post[1]).toBe(-12)
  })
})

describe('fftPeakDbInHzRange', () => {
  it('reads the peak inside a frequency window', () => {
    const bins = new Float32Array(512)
    bins.fill(-90)
    const sampleRate = 44100
    const fftSize = 1024
    const hz = 1000
    bins[Math.round((hz * fftSize) / sampleRate)] = -8
    expect(fftPeakDbInHzRange(bins, sampleRate, 800, 1200)).toBeCloseTo(-8)
    expect(fftPeakDbInHzRange(bins, sampleRate, 80, 120)).toBeCloseTo(-90)
  })
})

describe('clampSpectrumFollowMode', () => {
  it('keeps peak slow or both and defaults to peak', () => {
    expect(clampSpectrumFollowMode('peak')).toBe('peak')
    expect(clampSpectrumFollowMode('slow')).toBe('slow')
    expect(clampSpectrumFollowMode('both')).toBe('both')
    expect(clampSpectrumFollowMode('fast')).toBe('peak')
    expect(clampSpectrumFollowMode(undefined)).toBe('peak')
  })
})

describe('clampSpectrumBandCount', () => {
  it('snaps to the nearest allowed band count', () => {
    expect(clampSpectrumBandCount(30)).toBe(32)
    expect(clampSpectrumBandCount(8)).toBe(8)
    expect(clampSpectrumBandCount(99)).toBe(96)
    expect(clampSpectrumBandCount(256)).toBe(256)
    expect(clampSpectrumBandCount(200)).toBe(256)
  })
})

describe('followEnvelope', () => {
  it('rises faster than it falls at typical spectrum coefficients', () => {
    const up = followEnvelope(-80, -10, 0.55, 0.28)
    const down = followEnvelope(-10, -80, 0.55, 0.28)
    expect(up + 80).toBeGreaterThan(Math.abs(down + 10))
  })
})
