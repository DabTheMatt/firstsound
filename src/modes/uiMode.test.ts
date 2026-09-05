import { describe, expect, it } from 'vitest'
import { parseUiMode } from './uiMode'

describe('parseUiMode', () => {
  it('accepts the two interface layers', () => {
    expect(parseUiMode('sensory')).toBe('sensory')
    expect(parseUiMode('technical')).toBe('technical')
  })

  it('rejects unknown values', () => {
    expect(parseUiMode('beginner')).toBeNull()
    expect(parseUiMode('')).toBeNull()
    expect(parseUiMode(null)).toBeNull()
  })
})
