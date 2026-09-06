import { describe, expect, it } from 'vitest'
import {
  FADE_DIAMOND_SIZE_PX,
  FADE_DIAMOND_TOP_PX,
  LOOP_HANDLE_HEIGHT_PX,
  LOOP_HANDLE_TOP_PX,
  SPACE_HANDLE_TOP_PX,
  clampFadeLengthToLoop,
  fadeDiamondLayout,
  fadeHandleAtLoopFrac,
  fadeKnobMaxSec,
  fadeLengthFromDiamondTime,
  fadeOriginTime,
  fadeShapeHandleLayout,
  hitsLoopNodeY,
} from './handleLayout'

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

describe('fadeShapeHandleLayout', () => {
  it('sits at the midpoint of a non-zero fade', () => {
    const fadeIn = fadeShapeHandleLayout({ side: 'in', start: 1, end: 5, fadeIn: 2, fadeOut: 1 })
    expect(fadeIn?.time).toBeCloseTo(2)
    expect(fadeIn?.progress).toBe(0.5)
    const fadeOut = fadeShapeHandleLayout({ side: 'out', start: 1, end: 5, fadeIn: 2, fadeOut: 2 })
    expect(fadeOut?.time).toBeCloseTo(4)
  })

  it('hides when fade length is zero', () => {
    expect(fadeShapeHandleLayout({ side: 'in', start: 1, end: 5, fadeIn: 0, fadeOut: 1 })).toBeNull()
  })
})

describe('fadeKnobMaxSec', () => {
  it('is at least 8 seconds and grows with the region', () => {
    expect(fadeKnobMaxSec(1)).toBe(8)
    expect(fadeKnobMaxSec(12)).toBe(12)
  })
})

describe('loop and envelope node layout', () => {
  it('parks loop nodes below the track tab band', () => {
    expect(LOOP_HANDLE_TOP_PX).toBeGreaterThanOrEqual(24)
  })

  it('parks envelope diamonds below the loop nodes', () => {
    expect(FADE_DIAMOND_TOP_PX).toBe(LOOP_HANDLE_TOP_PX + LOOP_HANDLE_HEIGHT_PX + 2)
  })

  it('reserves space FX hits below the fade diamonds', () => {
    expect(SPACE_HANDLE_TOP_PX).toBe(FADE_DIAMOND_TOP_PX + FADE_DIAMOND_SIZE_PX + 2)
  })
})

describe('hitsLoopNodeY', () => {
  it('grabs the lowered loop node without taking the rest of the waveform', () => {
    expect(hitsLoopNodeY(LOOP_HANDLE_TOP_PX + 8, 22)).toBe(true)
    expect(hitsLoopNodeY(4, 22)).toBe(false)
    expect(hitsLoopNodeY(120, 22)).toBe(false)
  })
})

describe('fadeLengthFromDiamondTime', () => {
  it('maps pointer time 1:1 to fade length', () => {
    expect(fadeLengthFromDiamondTime('in', 1, 5, 3)).toBeCloseTo(2)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 3)).toBeCloseTo(2)
    expect(fadeLengthFromDiamondTime('in', 1, 5, 0)).toBe(0)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 8)).toBe(0)
  })

  it('pins the fade origin to the loop edge', () => {
    expect(fadeOriginTime('in', 1, 5)).toBe(1)
    expect(fadeOriginTime('out', 1, 5)).toBe(5)
    expect(clampFadeLengthToLoop(9, 1, 5)).toBe(4)
    expect(fadeLengthFromDiamondTime('in', 1, 5, 0.2)).toBe(0)
    expect(fadeLengthFromDiamondTime('out', 1, 5, 6)).toBe(0)
  })
})
