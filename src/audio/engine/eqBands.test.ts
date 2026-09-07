import { describe, expect, it } from 'vitest'
import {
  bandwidthHz,
  bandIsActive,
  defaultEqBandAt,
  defaultEqBands,
  eqModuleIsAudible,
  filterStageCount,
  formatEqHz,
  parseEqBands,
  parseFilterSlope,
  butterworthBiquadQs,
  qFromBandwidth,
  slopeFromNormalized,
  slopeToNormalized,
  nearestFilterSlope,
  stageQ,
  webAudioBiquadQ,
} from './eqBands'

describe('parseFilterSlope', () => {
  it('accepts 12–96 dB/oct and falls back to 12', () => {
    expect(parseFilterSlope(24)).toBe(24)
    expect(parseFilterSlope(48)).toBe(48)
    expect(parseFilterSlope(96)).toBe(96)
    expect(parseFilterSlope(18)).toBe(12)
    expect(parseFilterSlope(undefined)).toBe(12)
  })

  it('maps the slope knob across the allowed steps', () => {
    expect(slopeFromNormalized(0)).toBe(12)
    expect(slopeFromNormalized(1)).toBe(96)
    expect(nearestFilterSlope(50)).toBe(48)
    expect(slopeToNormalized(12)).toBe(0)
    expect(slopeFromNormalized(slopeToNormalized(72))).toBe(72)
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

  it('accepts 1–8 bands and rejects an oversized list', () => {
    expect(parseEqBands([defaultEqBandAt(0)])?.length).toBe(1)
    const eight = Array.from({ length: 8 }, (_, i) => defaultEqBandAt(i))
    expect(parseEqBands(eight)?.length).toBe(8)
    expect(parseEqBands([...eight, defaultEqBandAt(0)])).toBeNull()
  })
})

describe('filterStageCount', () => {
  it('uses one biquad per 12 dB/oct on LP/HP and ignores slope otherwise', () => {
    expect(filterStageCount({ type: 'off', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(0)
    expect(filterStageCount({ type: 'lowpass', frequency: 800, gain: 0, q: 0.7, slope: 12 })).toBe(1)
    expect(filterStageCount({ type: 'highpass', frequency: 80, gain: 0, q: 0.7, slope: 48 })).toBe(4)
    expect(filterStageCount({ type: 'highpass', frequency: 80, gain: 0, q: 0.7, slope: 96 })).toBe(8)
    expect(filterStageCount({ type: 'highshelf', frequency: 8e3, gain: 6, q: 0.7, slope: 48 })).toBe(4)
    expect(filterStageCount({ type: 'peaking', frequency: 1e3, gain: 3, q: 1, slope: 48 })).toBe(1)
    expect(
      filterStageCount({ type: 'peaking', frequency: 1e3, gain: 3, q: 1, slope: 12, bypassed: true }),
    ).toBe(0)
  })
})

describe('stageQ', () => {
  it('uses Butterworth section Qs scaled so 0.707 is maximally flat', () => {
    const band = { type: 'lowpass' as const, frequency: 800, gain: 0, q: Math.SQRT1_2, slope: 24 as const }
    expect(stageQ(band, 0)).toBeCloseTo(0.5412, 3)
    expect(stageQ(band, 1)).toBeCloseTo(1.3065, 3)
  })

  it('applies user Q on a 12 dB/oct section', () => {
    const flat = { type: 'highpass' as const, frequency: 120, gain: 0, q: Math.SQRT1_2, slope: 12 as const }
    const peaked = { ...flat, q: 1.4 }
    expect(stageQ(flat, 0)).toBeCloseTo(Math.SQRT1_2, 3)
    expect(stageQ(peaked, 0)).toBeGreaterThan(stageQ(flat, 0) * 1.5)
  })

  it('keeps extra steep-slope sections Butterworth when Q is only slightly above 0.7', () => {
    const band = { type: 'highpass' as const, frequency: 117, gain: 0, q: 0.99, slope: 96 as const }
    expect(stageQ(band, 0)).toBeCloseTo(butterworthBiquadQs(8)[0]!, 4)
    expect(stageQ(band, 7)).toBeGreaterThan(butterworthBiquadQs(8)[7]!)
  })
})

describe('butterworthBiquadQs', () => {
  it('matches classic 4th- and 8th-order tables', () => {
    expect(butterworthBiquadQs(1)[0]).toBeCloseTo(Math.SQRT1_2, 4)
    const fourth = butterworthBiquadQs(2)
    expect(fourth[0]).toBeCloseTo(0.5412, 3)
    expect(fourth[1]).toBeCloseTo(1.3065, 3)
    expect(butterworthBiquadQs(4)).toHaveLength(4)
    expect(butterworthBiquadQs(8)).toHaveLength(8)
  })
})

describe('webAudioBiquadQ', () => {
  it('converts cookbook Q to dB for lowpass and highpass only', () => {
    expect(webAudioBiquadQ('highpass', Math.SQRT1_2)).toBeCloseTo(-3.01, 2)
    expect(webAudioBiquadQ('lowpass', 1)).toBeCloseTo(0, 5)
    expect(webAudioBiquadQ('peaking', 4)).toBe(4)
    expect(webAudioBiquadQ('notch', 8)).toBe(8)
  })
})

describe('eqModuleIsAudible', () => {
  it('is silent when bypassed or every band is off', () => {
    const bands = defaultEqBands()
    expect(eqModuleIsAudible(true, [{ ...bands[0]!, type: 'peaking' }])).toBe(false)
    expect(eqModuleIsAudible(false, bands)).toBe(false)
    expect(eqModuleIsAudible(false, bands, true)).toBe(true)
    expect(eqModuleIsAudible(false, [{ ...bands[0]!, type: 'lowpass' }])).toBe(true)
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
