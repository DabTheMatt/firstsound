import { describe, expect, it } from 'vitest'
import { peakNormalizeGain } from './renderRegion'
import { dbToGain } from '../parameters/mapping'

describe('peakNormalizeGain', () => {
  it('lifts a 0.5 peak to −1 dBFS', () => {
    const g = peakNormalizeGain(0.5, -1)
    expect(0.5 * g).toBeCloseTo(dbToGain(-1), 5)
  })

  it('is 1 when the peak is already silent', () => {
    expect(peakNormalizeGain(0)).toBe(1)
  })
})
