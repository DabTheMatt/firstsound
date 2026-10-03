import { describe, expect, it } from 'vitest'
import { transportDensity } from './transportDensity'

describe('transportDensity', () => {
  it('keeps full labels at desktop width and collapses only when narrow', () => {
    expect(transportDensity(1400)).toBe(1)
    expect(transportDensity(1000)).toBe(2)
    expect(transportDensity(800)).toBe(3)
    expect(transportDensity(680)).toBe(4)
    expect(transportDensity(480)).toBe(5)
  })
})
