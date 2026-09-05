import { describe, expect, it } from 'vitest'
import { dialAmount, valueFromDial } from './sensoryState'

describe('sensory dials', () => {
  it('shows only the named pole', () => {
    expect(dialAmount(0.6, 'pos')).toBeCloseTo(0.6)
    expect(dialAmount(0.6, 'neg')).toBe(0)
    expect(dialAmount(-0.4, 'neg')).toBeCloseTo(0.4)
  })

  it('writes a signed axis from a one-sided dial', () => {
    expect(valueFromDial(0.5, 'pos')).toBeCloseTo(0.5)
    expect(valueFromDial(0.5, 'neg')).toBeCloseTo(-0.5)
  })
})
