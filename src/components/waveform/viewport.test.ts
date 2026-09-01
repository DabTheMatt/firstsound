import { describe, expect, it } from 'vitest'
import {
  clampView,
  fitView,
  fracToTime,
  panView,
  resizeViewEdge,
  timeToFrac,
  verticalGain,
  wheelPanSeconds,
  zoomAround,
  zoomPercent,
  zoomToSelection,
} from './viewport'

describe('viewport', () => {
  it('clamps a view inside the sample and keeps the span', () => {
    const v = clampView({ start: -5, end: 3 }, 10)
    expect(v.start).toBe(0)
    expect(v.end).toBeCloseTo(8)
    const past = clampView({ start: 8, end: 14 }, 10)
    expect(past.end).toBe(10)
    expect(past.start).toBeCloseTo(4)
  })

  it('fits the whole sample across the view', () => {
    expect(fitView(3.76)).toEqual({ start: 0, end: 3.76 })
    expect(zoomPercent(fitView(3.76), 3.76)).toBeCloseTo(100)
  })

  it('maps time to fraction and back', () => {
    const view = { start: 2, end: 6 }
    expect(timeToFrac(4, view)).toBeCloseTo(0.5)
    expect(fracToTime(0.5, view)).toBeCloseTo(4)
  })

  it('keeps the focus point pinned while zooming in', () => {
    const view = { start: 0, end: 10 }
    const focus = 8
    const zoomed = zoomAround(view, 0.5, focus, 10)
    // focus stays at the same fraction (0.8) of the new view
    expect(timeToFrac(focus, zoomed)).toBeCloseTo(0.8, 6)
    expect(zoomed.end - zoomed.start).toBeCloseTo(5)
  })

  it('zoom out is bounded by the full duration', () => {
    const zoomed = zoomAround({ start: 4, end: 6 }, 100, 5, 10)
    expect(zoomed.start).toBe(0)
    expect(zoomed.end).toBe(10)
  })

  it('zoom to selection adds a margin around the selection', () => {
    const v = zoomToSelection(10, 14, 60, 0.1)
    expect(v.start).toBeCloseTo(9.6)
    expect(v.end).toBeCloseTo(14.4)
  })

  it('pans without changing the span and clamps at edges', () => {
    const view = { start: 2, end: 6 }
    expect(panView(view, 1, 10)).toEqual({ start: 3, end: 7 })
    const clamped = panView(view, 100, 10)
    expect(clamped.end).toBe(10)
    expect(clamped.end - clamped.start).toBeCloseTo(4)
  })

  it('shrinks the overview frame by dragging an edge', () => {
    const view = { start: 0, end: 10 }
    const fromLeft = resizeViewEdge(view, 'start', 2, 10)
    expect(fromLeft.start).toBeCloseTo(2)
    expect(fromLeft.end).toBeCloseTo(10)
    const fromRight = resizeViewEdge(view, 'end', 4, 10)
    expect(fromRight.start).toBeCloseTo(0)
    expect(fromRight.end).toBeCloseTo(4)
  })

  it('fitView spans the whole sample', () => {
    expect(fitView(23)).toEqual({ start: 0, end: 23 })
  })

  it('zoomPercent is 100 when the whole file is in view', () => {
    expect(zoomPercent({ start: 0, end: 10 }, 10)).toBeCloseTo(100)
    expect(zoomPercent({ start: 0, end: 5 }, 10)).toBeCloseTo(200)
  })

  it('verticalGain lifts quiet material and never attenuates', () => {
    expect(verticalGain(0.1)).toBeCloseTo(9.2)
    expect(verticalGain(1)).toBe(1)
    expect(verticalGain(0)).toBe(1)
    expect(verticalGain(0.0001)).toBeLessThanOrEqual(24)
  })

  it('wheelPanSeconds pans on horizontal / shift and zooms on vertical', () => {
    expect(wheelPanSeconds(40, 2, false, 10, 200)).toBeCloseTo(2)
    expect(wheelPanSeconds(0, 40, true, 10, 200)).toBeCloseTo(2)
    expect(wheelPanSeconds(0, 40, false, 10, 200)).toBeNull()
  })
})
