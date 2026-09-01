import { describe, expect, it } from 'vitest'
import {
  defaultEqBands,
  filterStageCount,
  parseEqBands,
  parseFilterSlope,
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
})

describe('filterStageCount', () => {
  it('uses one biquad per 12 dB/oct on LP/HP and ignores slope otherwise', () => {
    expect(filterStageCount({ type: 'off', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(0)
    expect(filterStageCount({ type: 'lowpass', frequency: 800, gain: 0, q: 0.7, slope: 12 })).toBe(1)
    expect(filterStageCount({ type: 'highpass', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(4)
    expect(filterStageCount({ type: 'peaking', frequency: 1e3, gain: 3, q: 1, slope: 48 })).toBe(1)
  })
})

describe('stageQ', () => {
  it('keeps user Q on the first stage and Butterworth on the rest', () => {
    const band = { type: 'lowpass' as const, frequency: 800, gain: 0, q: 4, slope: 24 as const }
    expect(stageQ(band, 0)).toBe(4)
    expect(stageQ(band, 1)).toBeCloseTo(1 / Math.SQRT2)
  })
})
