import { describe, expect, it } from 'vitest'
import { fadeDiamondLayout, fadeHandleAtLoopFrac, fadeLengthFromDiamondTime } from './handleLayout'

describe('fadeHandleAtLoopFrac', () => {
  it('places the envelope diamond on the same X as the loop node', () => {
    expect(fadeHandleAtLoopFrac(0.2)).toBe(0.2)
    expect(fadeHandleAtLoopFrac(0.9)).toBe(0.9)
  })
})

describe('fadeDiamondLayout', () => {
  it('sits on the linear envelope at mid-fade', () => {
    const fadeIn = fadeDiamondLayout({
      side: 'in',
      start: 1,
      end: 5,
      fadeIn: 2,
      fadeOut: 1,
      curve: 'linear',
      bend: 0.5,
    })
    expect(fadeIn.time).toBeCloseTo(2)
    expect(fadeIn.y).toBeCloseTo(0.5)
    const fadeOut = fadeDiamondLayout({
      side: 'out',
      start: 1,
      end: 5,
      fadeIn: 2,
      fadeOut: 2,
      curve: 'linear',
      bend: 0.5,
    })
    expect(fadeOut.time).toBeCloseTo(4)
    expect(fadeOut.y).toBeCloseTo(0.5)
  })
})

describe('fadeLengthFromDiamondTime', () => {
  it('doubles the midpoint offset back into fade length', () => {
    expect(fadeLengthFromDiamondTime('in', 1, 5, 2)).toBeCloseTo(2)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 4)).toBeCloseTo(2)
  })
})
