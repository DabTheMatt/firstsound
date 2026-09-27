import { describe, expect, it } from 'vitest'
import {
  CURVE_SWITCH_ORDER,
  clampCurveIndex,
  curveDetentPoint,
  curveIndexFor,
  curveIndexFromDrag,
  curveIndexFromPointer,
} from './curveSwitch'

describe('curve switch detents', () => {
  it('orders the three interpolation positions', () => {
    expect(CURVE_SWITCH_ORDER).toEqual(['step', 'linear', 'smooth'])
    expect(curveIndexFor('step')).toBe(0)
    expect(curveIndexFor('linear')).toBe(1)
    expect(curveIndexFor('smooth')).toBe(2)
    expect(curveIndexFor(null)).toBe(1)
  })

  it('snaps a pointer to the nearest detent and ignores the hub', () => {
    expect(curveIndexFromPointer(0, 0)).toBeNull()
    expect(curveIndexFromPointer(0, -12)).toBe(1)
    expect(curveIndexFromPointer(Math.sin((-60 * Math.PI) / 180) * 12, -Math.cos((-60 * Math.PI) / 180) * 12)).toBe(0)
    expect(curveIndexFromPointer(Math.sin((60 * Math.PI) / 180) * 12, -Math.cos((60 * Math.PI) / 180) * 12)).toBe(2)
  })

  it('places icons around the top arc without leaving the control box', () => {
    const points = [0, 1, 2].map((index) => curveDetentPoint(index, 20, 22, 13))
    expect(points[1]!.x).toBeCloseTo(20)
    expect(points[1]!.y).toBeCloseTo(9)
    expect(points[0]!.x).toBeLessThan(points[1]!.x)
    expect(points[2]!.x).toBeGreaterThan(points[1]!.x)
    for (const point of points) {
      expect(point.x).toBeGreaterThan(4)
      expect(point.x).toBeLessThan(36)
      expect(point.y).toBeGreaterThan(2)
      expect(point.y).toBeLessThan(34)
    }
  })

  it('steps by whole detents while dragging and stops at the ends', () => {
    expect(curveIndexFromDrag(1, -28)).toBe(2)
    expect(curveIndexFromDrag(1, 28)).toBe(0)
    expect(curveIndexFromDrag(0, 40)).toBe(0)
    expect(curveIndexFromDrag(2, -40)).toBe(2)
    expect(clampCurveIndex(Number.NaN)).toBe(1)
  })
})
