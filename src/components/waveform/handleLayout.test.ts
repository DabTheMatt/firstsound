import { describe, expect, it } from 'vitest'
import { fadeDiamondLayout, fadeHandleAtLoopFrac, fadeLengthFromDiamondTime } from './handleLayout'

describe('fadeHandleAtLoopFrac', () => {
  it('places a zero-length envelope diamond on the loop node', () => {
    expect(fadeHandleAtLoopFrac(0.2)).toBe(0.2)
    expect(fadeHandleAtLoopFrac(0.9)).toBe(0.9)
  })
})

describe('fadeDiamondLayout', () => {
  it('sits at the fade knee, not the midpoint', () => {
    const fadeIn = fadeDiamondLayout({
      side: 'in',
      start: 1,
      end: 5,
      fadeIn: 2,
      fadeOut: 1,
    })
    expect(fadeIn.time).toBeCloseTo(3)
    const fadeOut = fadeDiamondLayout({
      side: 'out',
      start: 1,
      end: 5,
      fadeIn: 2,
      fadeOut: 2,
    })
    expect(fadeOut.time).toBeCloseTo(3)
  })

  it('parks on the loop edge when fade length is 0', () => {
    expect(fadeDiamondLayout({ side: 'in', start: 1, end: 5, fadeIn: 0, fadeOut: 1 }).time).toBe(1)
    expect(fadeDiamondLayout({ side: 'out', start: 1, end: 5, fadeIn: 1, fadeOut: 0 }).time).toBe(5)
  })
})

describe('fadeLengthFromDiamondTime', () => {
  it('maps pointer time 1:1 to fade length', () => {
    expect(fadeLengthFromDiamondTime('in', 1, 5, 3)).toBeCloseTo(2)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 3)).toBeCloseTo(2)
    expect(fadeLengthFromDiamondTime('in', 1, 5, 0)).toBe(0)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 8)).toBe(0)
  })
})
