import { describe, expect, it } from 'vitest'
import {
  bandwidthHz,
  bandIsActive,
  defaultEqBands,
  filterStageCount,
  formatEqHz,
  parseEqBands,
  parseFilterSlope,
  qFromBandwidth,
  stageQ,
} from './eqBands'

describe('parseFilterSlope', () => {
  it('accepts 12/24/36/48 and falls back to 12', () => {
    expect(parseFilterSlope(24)).toBe(24)
    expect(parseFilterSlope(48)).toBe(48)
    expect(parseFilterSlope(18)).toBe(12)
    expect(parseFilterSlope(undefined)).toBe(12)
  })
})

describe('parseEqBands', () => {
  it('fills slope on presets saved before slope existed', () => {
    const raw = defaultEqBands().map(({ slope: _slope, ...rest }) => rest)
    const parsed = parseEqBands(raw)
    expect(parsed).not.toBeNull()
    expect(parsed?.every((b) => b.slope === 12)).toBe(true)
  })

  it('keeps a stored 48 dB/oct slope', () => {
    const raw = defaultEqBands()
    raw[0] = { ...raw[0]!, type: 'lowpass', slope: 48 }
    expect(parseEqBands(raw)?.[0]?.slope).toBe(48)
  })

  it('defaults bypassed to false and keeps a stored bypass', () => {
    const raw = defaultEqBands()
    raw[1] = { ...raw[1]!, type: 'peaking', bypassed: true }
    expect(parseEqBands(raw)?.[1]?.bypassed).toBe(true)
    expect(parseEqBands(raw)?.[0]?.bypassed).toBe(false)
  })
})

describe('filterStageCount', () => {
  it('uses one biquad per 12 dB/oct on LP/HP and ignores slope otherwise', () => {
    expect(filterStageCount({ type: 'off', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(0)
    expect(filterStageCount({ type: 'lowpass', frequency: 800, gain: 0, q: 0.7, slope: 12 })).toBe(1)
    expect(filterStageCount({ type: 'highpass', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(4)
    expect(filterStageCount({ type: 'peaking', frequency: 1e3, gain: 3, q: 1, slope: 48 })).toBe(1)
    expect(
      filterStageCount({ type: 'peaking', frequency: 1e3, gain: 3, q: 1, slope: 12, bypassed: true }),
    ).toBe(0)
  })
})

describe('stageQ', () => {
  it('keeps user Q on the first stage and Butterworth on the rest', () => {
    const band = { type: 'lowpass' as const, frequency: 800, gain: 0, q: 4, slope: 24 as const }
    expect(stageQ(band, 0)).toBe(4)
    expect(stageQ(band, 1)).toBeCloseTo(1 / Math.SQRT2)
  })
})

describe('bandIsActive', () => {
  it('treats a typed, non-bypassed band as engaging the module', () => {
    const [off, peaking] = defaultEqBands()
    expect(bandIsActive({ ...off!, type: 'off' })).toBe(false)
    expect(bandIsActive({ ...peaking!, type: 'peaking', bypassed: true })).toBe(false)
    expect(bandIsActive({ ...peaking!, type: 'lowshelf', bypassed: false })).toBe(true)
  })
})

describe('formatEqHz', () => {
  it('uses kHz above 1000 Hz', () => {
    expect(formatEqHz(80)).toBe('80 Hz')
    expect(formatEqHz(1250)).toBe('1.25 kHz')
  })
})

describe('bandwidthHz', () => {
  it('round-trips Q and width at a centre frequency', () => {
    expect(bandwidthHz(1000, 2)).toBeCloseTo(500)
    expect(qFromBandwidth(1000, 500)).toBeCloseTo(2)
  })
})
