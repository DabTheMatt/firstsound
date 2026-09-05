import { describe, expect, it } from 'vitest'
import { applyCurve, shapedAmount } from './curves'

describe('applyCurve', () => {
  it('keeps linear as identity', () => {
    expect(applyCurve(0.4, 'linear')).toBeCloseTo(0.4)
  })

  it('eases in below the diagonal', () => {
    expect(applyCurve(0.5, 'easeIn')).toBeLessThan(0.5)
  })

  it('eases out above the diagonal', () => {
    expect(applyCurve(0.5, 'easeOut')).toBeGreaterThan(0.5)
  })
})

describe('shapedAmount', () => {
  it('ignores the opposite polarity', () => {
    expect(shapedAmount(-0.8, 'linear', 'pos')).toBe(0)
    expect(shapedAmount(0.8, 'linear', 'neg')).toBe(0)
  })

  it('gates small values to zero', () => {
    expect(shapedAmount(0.3, 'linear', 'pos', 0.4)).toBe(0)
    expect(shapedAmount(0.8, 'linear', 'pos', 0.4)).toBeGreaterThan(0.5)
  })
})
