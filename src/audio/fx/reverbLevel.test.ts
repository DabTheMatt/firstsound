import { describe, expect, it } from 'vitest'
import { REVERB_WET_TRIM, reverbDecayStackTrim, reverbWetOutputGain } from './reverbLevel'

describe('reverbWetOutputGain', () => {
  it('trims unity output so the wet send stays under dry', () => {
    expect(reverbWetOutputGain(100, 0.5)).toBeCloseTo(REVERB_WET_TRIM)
    expect(reverbWetOutputGain(100, 0.5)).toBeLessThan(0.7)
    expect(reverbWetOutputGain(0)).toBe(0)
    expect(reverbWetOutputGain(200, 0.5)).toBeCloseTo(REVERB_WET_TRIM * 2)
  })

  it('lowers the wet send as decay grows so tails do not pile up', () => {
    expect(reverbDecayStackTrim(0.8)).toBe(1)
    expect(reverbWetOutputGain(100, 8)).toBeLessThan(reverbWetOutputGain(100, 1.6))
    expect(reverbDecayStackTrim(8)).toBeLessThan(0.8)
  })
})
