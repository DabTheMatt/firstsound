import { describe, expect, it } from 'vitest'
import { lensDisplayX, lensEdgeBulge, lensSourceX, lensSphereScale } from './lensWarp'

describe('lensSourceX', () => {
  it('keeps the center pinned', () => {
    expect(lensSourceX(0)).toBe(0)
  })

  it('magnifies the center by sampling a much narrower source span', () => {
    expect(Math.abs(lensSourceX(0.5))).toBeLessThan(0.2)
    expect(Math.abs(lensSourceX(0.5))).toBeLessThan(Math.abs(0.5) * 0.45)
  })

  it('spreads the center on the way back from source to display', () => {
    expect(Math.abs(lensDisplayX(0.2))).toBeGreaterThan(0.2)
    expect(lensDisplayX(0)).toBeCloseTo(0)
    expect(lensDisplayX(1)).toBeCloseTo(1)
  })
})

describe('lensEdgeBulge', () => {
  it('is unity in the center and larger at the rim', () => {
    expect(lensEdgeBulge(0)).toBe(1)
    expect(lensEdgeBulge(1)).toBeGreaterThan(lensEdgeBulge(0.4))
  })
})

describe('lensSphereScale', () => {
  it('is 1 at the equator center and 0 at the rim', () => {
    expect(lensSphereScale(0)).toBe(1)
    expect(lensSphereScale(1)).toBeCloseTo(0)
  })
})
