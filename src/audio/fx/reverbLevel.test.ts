import { describe, expect, it } from 'vitest'
import { REVERB_WET_TRIM, reverbWetOutputGain } from './reverbLevel'

describe('reverbWetOutputGain', () => {
  it('follows the Output knob at unity without a second trim', () => {
    expect(reverbWetOutputGain(100)).toBeCloseTo(1)
    expect(reverbWetOutputGain(100)).toBe(REVERB_WET_TRIM)
    expect(reverbWetOutputGain(0)).toBe(0)
    expect(reverbWetOutputGain(200)).toBeCloseTo(2)
  })
})
