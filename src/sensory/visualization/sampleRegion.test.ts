import { describe, expect, it } from 'vitest'
import { playheadInView, regionFromDrag, sampleIndexSpan, workingTimeFromSource } from './sampleRegion'

describe('sampleIndexSpan', () => {
  it('covers only the selected seconds', () => {
    const span = sampleIndexSpan(1000, 10, 2, 4)
    expect(span.i0).toBe(200)
    expect(span.i1).toBe(400)
  })

  it('keeps at least one sample', () => {
    const span = sampleIndexSpan(100, 1, 0.5, 0.5)
    expect(span.i1).toBeGreaterThan(span.i0)
  })
})

describe('playheadInView', () => {
  it('maps the head onto the selected window', () => {
    expect(playheadInView(3, 2, 6)).toBeCloseTo(0.25)
    expect(playheadInView(1, 2, 6)).toBe(0)
    expect(playheadInView(9, 2, 6)).toBe(1)
  })
})

describe('regionFromDrag', () => {
  it('orders and clamps a dragged span', () => {
    expect(regionFromDrag(4, 1, 10)).toEqual({ start: 1, end: 4 })
  })
})

describe('workingTimeFromSource', () => {
  it('converts source time into the working buffer', () => {
    expect(workingTimeFromSource(3.2, 1, 8)).toBeCloseTo(2.2)
    expect(workingTimeFromSource(0.2, 1, 8)).toBe(0)
  })
})
