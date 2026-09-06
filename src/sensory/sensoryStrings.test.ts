import { describe, expect, it } from 'vitest'
import { parseSensoryStrings } from './sensoryStrings'

describe('parseSensoryStrings', () => {
  it('defaults to showing strings', () => {
    expect(parseSensoryStrings(null)).toBe(true)
    expect(parseSensoryStrings(undefined)).toBe(true)
    expect(parseSensoryStrings('1')).toBe(true)
  })

  it('can turn the overlay off', () => {
    expect(parseSensoryStrings('0')).toBe(false)
    expect(parseSensoryStrings('off')).toBe(false)
    expect(parseSensoryStrings('false')).toBe(false)
  })
})
