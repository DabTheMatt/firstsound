import { describe, expect, it } from 'vitest'
import { forPaintX, paintIntervalMs, ridgeSampleStep, sensoryPaintIntervalMs } from './frameBudget'

describe('ridgeSampleStep', () => {
  it('skips columns on wide canvases', () => {
    expect(ridgeSampleStep(800)).toBe(1)
    expect(ridgeSampleStep(1200)).toBe(2)
    expect(ridgeSampleStep(2000)).toBe(3)
  })
})

describe('sensoryPaintIntervalMs', () => {
  it('keeps the landscape near 30 fps while knobs ease at rest', () => {
    expect(sensoryPaintIntervalMs()).toBe(33)
    expect(sensoryPaintIntervalMs()).toBeLessThan(paintIntervalMs(false))
  })
})

describe('forPaintX', () => {
  it('always visits the last column', () => {
    const seen: number[] = []
    forPaintX(10, 3, (x) => seen.push(x))
    expect(seen[0]).toBe(0)
    expect(seen[seen.length - 1]).toBe(9)
  })
})
