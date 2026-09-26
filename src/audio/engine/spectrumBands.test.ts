import { describe, expect, it } from 'vitest'
import {
  SPECTRUM_BAND_COUNT,
  bandPeakDb,
  capBandByExpected,
  capBandsByEqGain,
  capSpectrumBins,
  clampSpectrumBandCount,
  eqGainForSpectrumBand,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  fftDbAtHz,
  fftFirstBinHz,
  fftPeakDbInHzRange,
  followBandsOverTime,
  followEnvelope,
  logBandEdgesHz,
  logGridDbAt,
  maxBandDb,
  alignedBandDb,
  spectrumDisplayUses,
  spectrumFallBallistics,
  spectrumMeterAlignDb,
  spectrumMaxHz,
  SPECTRUM_AXIS_MAX_HZ,
} from './spectrumBands'
import { spectrumEnvelopePoints } from './spectrumEnvelope'

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

  it('ignores DC and Nyquist bins so the plot edges stay empty', () => {
    const bins = new Float32Array(512)
    bins.fill(-90)
    bins[0] = -6
    bins[511] = -6
    const bands = bandPeakDb(bins, 48000, 32, 10, 24000)
    expect(Math.max(...bands)).toBeLessThan(-80)
  })
})

describe('fftDbAtHz', () => {
  it('returns the floor below the first bin', () => {
    const bins = new Float32Array(512)
    bins.fill(-30)
    expect(fftFirstBinHz(44100, 512)).toBeCloseTo(44100 / 1024)
    expect(fftDbAtHz(bins, 44100, 5)).toBe(-100)
  })

  it('returns the floor at Nyquist instead of the last bin', () => {
    const bins = new Float32Array(512)
    bins.fill(-80)
    bins[511] = -12
    expect(fftDbAtHz(bins, 48000, 24000)).toBe(-100)
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

describe('eqGainForSpectrumBand', () => {
  it('in a cut uses the more attenuated band edge', () => {
    expect(eqGainForSpectrumBand(-12, -40)).toBe(-40)
    expect(eqGainForSpectrumBand(6, 0)).toBe(6)
    expect(eqGainForSpectrumBand(-12, -12, -40)).toBe(-40)
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

describe('spectrum fall', () => {
  it('defaults to normal and keeps slow, normal, and fast', () => {
    expect(clampSpectrumFallMode('slow')).toBe('slow')
    expect(clampSpectrumFallMode('normal')).toBe('normal')
    expect(clampSpectrumFallMode('fast')).toBe('fast')
    expect(clampSpectrumFallMode('peak')).toBe('normal')
    expect(clampSpectrumFallMode(undefined)).toBe('normal')
  })

  it('orders release so slow lingers, normal is balanced, and fast drops', () => {
    const slow = spectrumFallBallistics('slow')
    const normal = spectrumFallBallistics('normal')
    const fast = spectrumFallBallistics('fast')
    expect(slow.peak.release).toBeLessThan(normal.peak.release)
    expect(normal.peak.release).toBeLessThan(fast.peak.release)
    expect(slow.slow.release).toBeLessThan(normal.slow.release)
    expect(normal.slow.release).toBeLessThan(fast.slow.release)
    for (const mode of ['slow', 'normal', 'fast'] as const) {
      const rates = spectrumFallBallistics(mode)
      expect(rates.peak.attack).toBeGreaterThan(rates.peak.release)
      expect(rates.slow.release).toBeLessThan(rates.peak.release)
    }
  })

  it('uses one fall clock for the bars and the envelope line', () => {
    for (const follow of ['peak', 'slow', 'both'] as const) {
      const uses = spectrumDisplayUses(follow)
      const bars = new Set([uses.barBody, uses.barCap])
      expect(new Set(uses.lines)).toEqual(bars)
    }
  })

  it('decays quiet bins toward the floor without dropping them', () => {
    const prev = new Float32Array([-12, -70])
    const floor = new Float32Array([-100, -100])
    const release = spectrumFallBallistics('slow').peak.release
    for (let i = 0; i < 10; i++) followBandsOverTime(prev, floor, 4, release, 0.05)
    expect(prev[0]!).toBeLessThan(-12)
    expect(prev[0]!).toBeGreaterThan(-50)
    expect(prev[1]!).toBeLessThan(-70)
    expect(prev[1]!).toBeGreaterThan(-90)
    const edges = logBandEdgesHz(20, 20000, 2)
    const pts = spectrumEnvelopePoints([...prev], edges, 20, 20000, {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    })
    expect(pts).toHaveLength(4)
    expect(pts[2]!.y).toBeGreaterThan(pts[0]!.y)
    expect(pts[2]!.y).toBeLessThan(100)
  })

  it('falls farther on fast than normal than slow over the same interval', () => {
    const dropped = (mode: 'slow' | 'normal' | 'fast') => {
      const level = new Float32Array([0])
      const release = spectrumFallBallistics(mode).peak.release
      for (let i = 0; i < 10; i++) followBandsOverTime(level, new Float32Array([-80]), 20, release, 0.05)
      return level[0]!
    }
    const slow = dropped('slow')
    const normal = dropped('normal')
    const fast = dropped('fast')
    expect(fast).toBeLessThan(normal)
    expect(normal).toBeLessThan(slow)
    expect(slow).toBeGreaterThan(-40)
    expect(fast).toBeLessThan(-60)
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
    expect(clampSpectrumBandCount(1024)).toBe(1024)
    expect(clampSpectrumBandCount(200)).toBe(256)
    expect(clampSpectrumBandCount(800)).toBe(1024)
  })
})

describe('followEnvelope', () => {
  it('rises faster than it falls at typical spectrum coefficients', () => {
    const up = followEnvelope(-80, -10, 0.55, 0.28)
    const down = followEnvelope(-10, -80, 0.55, 0.28)
    expect(up + 80).toBeGreaterThan(Math.abs(down + 10))
  })
})

describe('spectrumMeterAlignDb', () => {
  it('boosts a quiet FFT peak up to the loudness meter', () => {
    expect(spectrumMeterAlignDb(-48, -9)).toBeCloseTo(39)
    expect(maxBandDb([-90, -48, -70])).toBe(-48)
  })

  it('does not pull a matching or louder spectrum down', () => {
    expect(spectrumMeterAlignDb(-9, -9)).toBe(0)
    expect(spectrumMeterAlignDb(-3, -9)).toBe(0)
  })

  it('stays put when the meter or spectrum is silent', () => {
    expect(spectrumMeterAlignDb(-100, -9)).toBe(0)
    expect(spectrumMeterAlignDb(-48, Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe('alignedBandDb', () => {
  it('does not lift analyser-floor bins with the meter offset', () => {
    expect(alignedBandDb(-100, 39)).toBe(-100)
    expect(alignedBandDb(-48, 39)).toBeCloseTo(-9)
  })
})

describe('spectrumMaxHz', () => {
  it('caps the FFT axis at 22 kHz below Nyquist', () => {
    expect(SPECTRUM_AXIS_MAX_HZ).toBe(22000)
    expect(spectrumMaxHz(48000)).toBe(22000)
    expect(spectrumMaxHz(44100)).toBe(22000)
    expect(spectrumMaxHz(32000)).toBe(16000)
  })
})

describe('logGridDbAt', () => {
  it('interpolates the correction curve in log frequency', () => {
    const hz = [100, 1000, 10000]
    const db = [0, -12, 6]
    expect(logGridDbAt(100, hz, db)).toBeCloseTo(0)
    expect(logGridDbAt(10000, hz, db)).toBeCloseTo(6)
    expect(logGridDbAt(Math.sqrt(100 * 1000), hz, db)).toBeCloseTo(-6)
    expect(logGridDbAt(20, hz, db)).toBeCloseTo(0)
  })
})

describe('capSpectrumBins', () => {
  it('holds each bin to pre plus the correction at that frequency', () => {
    const measured = new Float32Array(8).fill(-10)
    const pre = new Float32Array(8).fill(-30)
    measured[2] = -80
    capSpectrumBins(measured, pre, 1600, (hz) => (hz < 250 ? -6 : 3))
    expect(measured[1]).toBeCloseTo(-36)
    expect(measured[2]).toBeCloseTo(-80)
    expect(measured[4]).toBeCloseTo(-27)
    expect(measured[0]).toBeCloseTo(-10)
  })
})
