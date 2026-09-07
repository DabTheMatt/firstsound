import { describe, expect, it } from 'vitest'
import { parseSensoryStrings } from './sensoryStrings'

describe('parseSensoryStrings', () => {
  it('stays off until the overlay is stored on', () => {
    expect(parseSensoryStrings(null)).toBe(false)
    expect(parseSensoryStrings(undefined)).toBe(false)
    expect(parseSensoryStrings('0')).toBe(false)
    expect(parseSensoryStrings('1')).toBe(true)
  })
})
