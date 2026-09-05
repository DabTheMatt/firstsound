import { describe, expect, it } from 'vitest'
import { parseSensoryScene } from './sensoryScene'

describe('parseSensoryScene', () => {
  it('defaults to the range scene', () => {
    expect(parseSensoryScene(null)).toBe('range')
    expect(parseSensoryScene('nope')).toBe('range')
    expect(parseSensoryScene('glass')).toBe('range')
  })

  it('keeps known scenes', () => {
    expect(parseSensoryScene('range')).toBe('range')
    expect(parseSensoryScene('mirror')).toBe('mirror')
    expect(parseSensoryScene('canyon')).toBe('canyon')
    expect(parseSensoryScene('gleam')).toBe('gleam')
  })
})
