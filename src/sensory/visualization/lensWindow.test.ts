import { describe, expect, it } from 'vitest'
import { lensWindowRange, lensWindowSeconds, wrapUnitDelta } from './lensWindow'

describe('lensWindowRange', () => {
  it('uses 5s to 2min when the sample is long', () => {
    expect(lensWindowRange(400)).toEqual({ min: 5, max: 120 })
  })

  it('caps to the sample when it is shorter than 2 minutes', () => {
    expect(lensWindowRange(40)).toEqual({ min: 5, max: 40 })
  })

  it('collapses to the whole sample when shorter than 5s', () => {
    expect(lensWindowRange(3)).toEqual({ min: 3, max: 3 })
  })
})

describe('lensWindowSeconds', () => {
  it('returns the short end at 0 and the long end at 1', () => {
    expect(lensWindowSeconds(0, 400)).toBe(5)
    expect(lensWindowSeconds(1, 400)).toBe(120)
    expect(lensWindowSeconds(0.5, 40)).toBeCloseTo(22.5)
  })
})

describe('wrapUnitDelta', () => {
  it('takes the short way around the ring', () => {
    expect(wrapUnitDelta(0.9)).toBeCloseTo(-0.1)
    expect(wrapUnitDelta(-0.9)).toBeCloseTo(0.1)
  })
})
