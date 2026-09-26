import { describe, expect, it } from 'vitest'
import { defaultEqBandAt, defaultEqBands, type EqFilterType } from './eqBands'
import { eqMagnitudeDb, logFreqAxis } from './eqResponse'

describe('eqMagnitudeDb', () => {
  it('is near 0 dB when every band is off', () => {
    expect(eqMagnitudeDb(defaultEqBands(), 1000, 48000)).toBeCloseTo(0, 5)
  })

  it('peaks near the gain of a bell at its centre frequency', () => {
    const bands = defaultEqBands()
    bands[2] = { type: 'peaking', frequency: 1000, gain: 6, q: 1, slope: 12 }
    expect(eqMagnitudeDb(bands, 1000, 48000)).toBeGreaterThan(5)
    expect(eqMagnitudeDb(bands, 1000, 48000)).toBeLessThan(7)
    expect(eqMagnitudeDb(bands, 100, 48000)).toBeLessThan(2)
  })

  it('cuts high frequencies with a low-pass', () => {
    const bands = defaultEqBands()
    bands[0] = { type: 'lowpass', frequency: 500, gain: 0, q: 0.7, slope: 12 }
    expect(eqMagnitudeDb(bands, 80, 48000)).toBeGreaterThan(eqMagnitudeDb(bands, 8000, 48000))
  })

  it('a steeper low-pass cuts more above the cutoff', () => {
    const lp12 = defaultEqBands()
    lp12[0] = { type: 'lowpass', frequency: 500, gain: 0, q: 0.7, slope: 12 }
    const lp48 = defaultEqBands()
    lp48[0] = { type: 'lowpass', frequency: 500, gain: 0, q: 0.7, slope: 48 }
    expect(eqMagnitudeDb(lp48, 8000, 48000)).toBeLessThan(eqMagnitudeDb(lp12, 8000, 48000) - 12)
  })

  it('adds comb peaks on top of the main bands', () => {
    const bands = defaultEqBands()
    const withComb = [
      ...bands,
      { type: 'peaking' as const, frequency: 1000, gain: 6, q: 8, slope: 12 as const },
    ]
    expect(eqMagnitudeDb(withComb, 1000, 48000)).toBeGreaterThan(eqMagnitudeDb(bands, 1000, 48000) + 4)
  })

  it('ignores a bypassed peaking band', () => {
    const bands = defaultEqBands()
    bands[2] = { type: 'peaking', frequency: 1000, gain: 6, q: 1, slope: 12, bypassed: true }
    expect(eqMagnitudeDb(bands, 1000, 48000)).toBeCloseTo(0, 5)
  })

  it('a steep high-pass is far below unity at 20 Hz', () => {
    const bands = defaultEqBands()
    bands[1] = { type: 'highpass', frequency: 190, gain: 0, q: 0.7, slope: 48 }
    expect(eqMagnitudeDb(bands, 20, 48000)).toBeLessThan(-80)
    expect(eqMagnitudeDb(bands, 400, 48000)).toBeGreaterThan(-6)
  })

  it('96 dB/oct high-pass is quieter at 20 Hz than 48 dB/oct', () => {
    const hp48 = defaultEqBands()
    hp48[1] = { type: 'highpass', frequency: 79, gain: 0, q: 0.7, slope: 48 }
    const hp96 = defaultEqBands()
    hp96[1] = { type: 'highpass', frequency: 79, gain: 0, q: 0.7, slope: 96 }
    expect(eqMagnitudeDb(hp96, 20, 48000)).toBeLessThan(eqMagnitudeDb(hp48, 20, 48000) - 20)
  })

  it('a 96 dB/oct high-pass at Q ≈ 1 does not boost the cutoff', () => {
    const bands = defaultEqBands()
    bands[0] = { type: 'highpass', frequency: 117, gain: 0, q: 0.99, slope: 96 }
    const cutoff = eqMagnitudeDb(bands, 117, 48000)
    const pass = eqMagnitudeDb(bands, 2000, 48000)
    const near = eqMagnitudeDb(bands, 160, 48000)
    expect(pass).toBeCloseTo(0, 0)
    expect(cutoff).toBeLessThan(0)
    expect(near).toBeLessThan(3)
    expect(eqMagnitudeDb(bands, 20, 48000)).toBeLessThan(-80)
    let peak = -Infinity
    for (const hz of logFreqAxis(256, 20, 20000)) {
      peak = Math.max(peak, eqMagnitudeDb(bands, hz, 48000))
    }
    expect(peak).toBeLessThan(3)
  })

  it('a Butterworth steep high-pass sits near -3 dB at the labelled cutoff', () => {
    const bands = defaultEqBands()
    bands[0] = { type: 'highpass', frequency: 117, gain: 0, q: Math.SQRT1_2, slope: 96 }
    expect(eqMagnitudeDb(bands, 117, 48000)).toBeGreaterThan(-6)
    expect(eqMagnitudeDb(bands, 117, 48000)).toBeLessThan(0)
  })

  it('returns NaN at 0 Hz instead of a fake 0 dB', () => {
    const bands = defaultEqBands()
    bands[0] = { type: 'highpass', frequency: 80, gain: 0, q: 0.7, slope: 48 }
    expect(Number.isNaN(eqMagnitudeDb(bands, 0, 48000))).toBe(true)
    expect(Number.isNaN(eqMagnitudeDb(bands, -10, 48000))).toBe(true)
  })

  it('sums cascaded band magnitudes in dB', () => {
    const bell = { ...defaultEqBandAt(0), type: 'peaking' as const, frequency: 1000, gain: 6, q: 1 }
    const shelf = { ...defaultEqBandAt(1), type: 'highshelf' as const, frequency: 4000, gain: -3, q: 0.7 }
    const sr = 48000
    for (const hz of [100, 1000, 4000, 12000]) {
      const sum = eqMagnitudeDb([bell], hz, sr) + eqMagnitudeDb([shelf], hz, sr)
      expect(eqMagnitudeDb([bell, shelf], hz, sr)).toBeCloseTo(sum, 4)
    }
  })

  it('stays finite across the audible grid for the main filter shapes', () => {
    const shapes: { type: EqFilterType; gain: number; q: number; slope: 12 | 48 }[] = [
      { type: 'highpass', gain: 0, q: 0.707, slope: 48 },
      { type: 'lowpass', gain: 0, q: 0.707, slope: 48 },
      { type: 'peaking', gain: 6, q: 1, slope: 12 },
      { type: 'notch', gain: 0, q: 2, slope: 12 },
      { type: 'lowshelf', gain: -4, q: 0.7, slope: 12 },
      { type: 'highshelf', gain: 5, q: 0.7, slope: 12 },
    ]
    const probes = [20, 30, 50, 100, 500, 1000, 5000, 10000, 20000]
    const grid = logFreqAxis(512, 20, 20000)
    for (const shape of shapes) {
      for (const cutoff of probes) {
        const band = { ...defaultEqBandAt(0), ...shape, frequency: cutoff }
        for (const hz of probes) {
          const db = eqMagnitudeDb([band], hz, 48000)
          expect(Number.isFinite(db)).toBe(true)
        }
        let prev = eqMagnitudeDb([band], grid[0]!, 48000)
        expect(grid[0]).toBeCloseTo(20, 4)
        for (let i = 1; i < grid.length; i++) {
          const db = eqMagnitudeDb([band], grid[i]!, 48000)
          const oct = Math.log2(grid[i]! / grid[i - 1]!)
          expect(Number.isFinite(db)).toBe(true)
          if (shape.type !== 'notch') {
            expect(Math.abs(db - prev) / oct).toBeLessThan(250)
          }
          prev = db
        }
      }
    }
  })

  it('steeper high-shelf keeps the same high-end gain', () => {
    const hs12 = defaultEqBands()
    hs12[3] = { type: 'highshelf', frequency: 4000, gain: 6, q: 0.7, slope: 12 }
    const hs48 = defaultEqBands()
    hs48[3] = { type: 'highshelf', frequency: 4000, gain: 6, q: 0.7, slope: 48 }
    expect(eqMagnitudeDb(hs12, 12000, 48000)).toBeCloseTo(6, 0)
    expect(eqMagnitudeDb(hs48, 12000, 48000)).toBeCloseTo(6, 0)
  })
})
