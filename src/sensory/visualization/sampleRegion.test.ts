import { describe, expect, it } from 'vitest'
import {
  playheadInView,
  regionFromDrag,
  resizeRegionEdge,
  sampleIndexSpan,
  selectionCoversSample,
  selectionEdgePx,
  sensorySelectionGesture,
  slideRegion,
  workingTimeFromSource,
} from './sampleRegion'

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

describe('slideRegion', () => {
  it('moves a selection without changing its length', () => {
    expect(slideRegion(1, 3, 2, 10)).toEqual({ start: 3, end: 5 })
  })

  it('stops at both sample boundaries', () => {
    expect(slideRegion(1, 3, 100, 10)).toEqual({ start: 8, end: 10 })
    expect(slideRegion(1, 3, -100, 10)).toEqual({ start: 0, end: 2 })
  })
})

describe('resizeRegionEdge', () => {
  it('moves one edge and keeps the other', () => {
    expect(resizeRegionEdge('end', 1, 3, 6, 10)).toEqual({ start: 1, end: 6 })
    expect(resizeRegionEdge('start', 1, 3, 0.2, 10)).toEqual({ start: 0.2, end: 3 })
  })

  it('does not let an edge cross the other or leave the sample', () => {
    expect(resizeRegionEdge('start', 1, 3, 9, 10).end).toBe(3)
    expect(resizeRegionEdge('start', 1, 3, 9, 10).start).toBeLessThan(3)
    expect(resizeRegionEdge('end', 1, 3, -4, 10)).toEqual({ start: 1, end: 1.05 })
    expect(resizeRegionEdge('end', 1, 3, 40, 10).end).toBe(10)
  })
})

describe('selectionCoversSample', () => {
  it('treats the initial full region as the whole sample', () => {
    expect(selectionCoversSample(0, 10, 10)).toBe(true)
    expect(selectionCoversSample(0.005, 9.995, 10)).toBe(true)
    expect(selectionCoversSample(1, 4, 10)).toBe(false)
  })
})

describe('sensorySelectionGesture', () => {
  const widthPx = 400

  it('moves the body of an existing selection', () => {
    expect(
      sensorySelectionGesture({
        frac: 0.4,
        startFrac: 0.2,
        endFrac: 0.6,
        widthPx,
        coversSample: false,
      }),
    ).toBe('move')
  })

  it('resizes from either edge', () => {
    expect(
      sensorySelectionGesture({
        frac: 0.2,
        startFrac: 0.2,
        endFrac: 0.6,
        widthPx,
        coversSample: false,
      }),
    ).toBe('resize-start')
    expect(
      sensorySelectionGesture({
        frac: 0.6,
        startFrac: 0.2,
        endFrac: 0.6,
        widthPx,
        coversSample: false,
      }),
    ).toBe('resize-end')
  })

  it('creates a selection from empty sample and from a full-sample body', () => {
    expect(
      sensorySelectionGesture({
        frac: 0.05,
        startFrac: 0.2,
        endFrac: 0.6,
        widthPx,
        coversSample: false,
      }),
    ).toBe('create')
    expect(
      sensorySelectionGesture({
        frac: 0.5,
        startFrac: 0,
        endFrac: 1,
        widthPx,
        coversSample: true,
      }),
    ).toBe('create')
  })

  it('keeps a finger-sized edge on the big waveform and a body on a narrow selection', () => {
    expect(selectionEdgePx(700, 700, 44)).toBeGreaterThanOrEqual(44)
    const narrow = selectionEdgePx(80, 320, 28)
    expect(narrow * 2).toBeLessThan(80)
  })
})
