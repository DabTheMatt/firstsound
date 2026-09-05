import { describe, expect, it } from 'vitest'
import { emotionalValues, surpriseLabel, surpriseSensoryValues } from './emotionalStates'

describe('emotional states', () => {
  it('sets several axes at once', () => {
    const intimate = emotionalValues('intimate')
    expect(intimate.distance).toBeLessThan(0)
    expect(intimate.warmth).toBeGreaterThan(0)
  })

  it('surprise stays musically labelled', () => {
    const values = surpriseSensoryValues(0.42)
    expect(surpriseLabel(values).length).toBeGreaterThan(2)
    expect(Math.abs(values.distance)).toBeLessThanOrEqual(1)
  })
})
