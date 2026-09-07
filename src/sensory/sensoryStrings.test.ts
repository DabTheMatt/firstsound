import { describe, expect, it } from 'vitest'
import { parseSensoryStrings } from './sensoryStrings'

describe('parseSensoryStrings', () => {
  it('keeps the overlay off until a parameter is being edited', () => {
    expect(parseSensoryStrings(null)).toBe(false)
    expect(parseSensoryStrings(undefined)).toBe(false)
    expect(parseSensoryStrings('1')).toBe(false)
    expect(parseSensoryStrings('0')).toBe(false)
  })
})
