import { describe, expect, it } from 'vitest'
import { knobAngleDeg, knobValueArc, polar } from './knobGeom'

describe('knobAngleDeg', () => {
  it('puts min at 7:30 and max at 4:30', () => {
    expect(knobAngleDeg(0)).toBe(135)
    expect(knobAngleDeg(1)).toBe(405)
    expect(knobAngleDeg(0.5)).toBe(270)
  })
})

describe('polar', () => {
  it('places the needle on the value tip', () => {
    const min = polar(36, 36, 20, knobAngleDeg(0))
    expect(min.x).toBeLessThan(36)
    expect(min.y).toBeGreaterThan(36)
    const mid = polar(36, 36, 20, knobAngleDeg(0.5))
    expect(mid.x).toBeCloseTo(36, 5)
    expect(mid.y).toBeLessThan(36)
  })
})

describe('knobValueArc', () => {
  it('fills from the start stop to the needle for unipolar knobs', () => {
    const arc = knobValueArc(0.5, false)
    expect(arc.startDeg).toBe(135)
    expect(arc.endDeg).toBe(270)
  })

  it('fills from centre toward the needle for bipolar pan', () => {
    expect(knobValueArc(0.5, true)).toEqual({ startDeg: 270, endDeg: 270 })
    const right = knobValueArc(1, true)
    expect(right.startDeg).toBe(270)
    expect(right.endDeg).toBe(405)
    const left = knobValueArc(0, true)
    expect(left.startDeg).toBe(135)
    expect(left.endDeg).toBe(270)
  })
})
