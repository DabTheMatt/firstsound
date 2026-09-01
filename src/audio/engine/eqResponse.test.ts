import { describe, expect, it } from 'vitest'
import { defaultEqBands } from './eqBands'
import { eqMagnitudeDb } from './eqResponse'

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
})
