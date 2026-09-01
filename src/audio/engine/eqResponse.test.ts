import { describe, expect, it } from 'vitest'
import { defaultEqBands } from './eqBands'
import { eqMagnitudeDb } from './eqResponse'

describe('eqMagnitudeDb', () => {
  it('is near 0 dB when every band is off', () => {
    expect(eqMagnitudeDb(defaultEqBands(), 1000, 48000)).toBeCloseTo(0, 5)
  })

  it('peaks near the gain of a bell at its centre frequency', () => {
    const bands = defaultEqBands()
    bands[2] = { type: 'peaking', frequency: 1000, gain: 6, q: 1 }
    expect(eqMagnitudeDb(bands, 1000, 48000)).toBeGreaterThan(5)
    expect(eqMagnitudeDb(bands, 1000, 48000)).toBeLessThan(7)
    expect(eqMagnitudeDb(bands, 100, 48000)).toBeLessThan(2)
  })

  it('cuts high frequencies with a low-pass', () => {
    const bands = defaultEqBands()
    bands[0] = { type: 'lowpass', frequency: 500, gain: 0, q: 0.7 }
    expect(eqMagnitudeDb(bands, 80, 48000)).toBeGreaterThan(eqMagnitudeDb(bands, 8000, 48000))
  })
})
