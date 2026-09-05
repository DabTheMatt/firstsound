import { describe, expect, it } from 'vitest'
import { parseSensoryScene } from './sensoryScene'

describe('parseSensoryScene', () => {
  it('defaults to the range scene', () => {
    expect(parseSensoryScene(null)).toBe('range')
    expect(parseSensoryScene('nope')).toBe('range')
  })

  it('keeps known scenes', () => {
    expect(parseSensoryScene('glass')).toBe('glass')
    expect(parseSensoryScene('range')).toBe('range')
  })
})
