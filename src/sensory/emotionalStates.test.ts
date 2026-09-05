import { describe, expect, it } from 'vitest'
import { emotionalValues, surpriseLabel, surpriseSensoryValues } from './emotionalStates'

describe('emotional states', () => {
  it('sets several axes at once', () => {
    const intimate = emotionalValues('intimate')
    expect(intimate.space).toBeLessThan(0.2)
    expect(intimate.tight).toBeGreaterThan(0.2)
  })

  it('surprise stays musically labelled', () => {
    const values = surpriseSensoryValues(0.42)
    expect(surpriseLabel(values).length).toBeGreaterThan(2)
    expect(Math.abs(values.space)).toBeLessThanOrEqual(1)
  })
})
