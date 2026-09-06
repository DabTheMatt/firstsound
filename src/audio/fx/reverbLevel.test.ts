import { describe, expect, it } from 'vitest'
import { REVERB_WET_TRIM, reverbWetOutputGain } from './reverbLevel'

describe('reverbWetOutputGain', () => {
  it('trims unity output so the wet send stays under dry', () => {
    expect(reverbWetOutputGain(100)).toBeCloseTo(REVERB_WET_TRIM)
    expect(reverbWetOutputGain(100)).toBeLessThan(0.7)
    expect(reverbWetOutputGain(0)).toBe(0)
    expect(reverbWetOutputGain(200)).toBeCloseTo(REVERB_WET_TRIM * 2)
  })
})
