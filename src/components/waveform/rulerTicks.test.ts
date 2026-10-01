import { describe, expect, it } from 'vitest'
import { rulerMarks, rulerMinFracGap, rulerStepSeconds, rulerTickTimes } from './rulerTicks'

describe('rulerStepSeconds', () => {
  it('uses 1 s on a short zoomed view', () => {
    expect(rulerStepSeconds(8, 180)).toBe(1)
  })

  it('uses 10 s on a medium view', () => {
    expect(rulerStepSeconds(60, 60)).toBe(10)
  })

  it('uses 30 s on a long fully-zoomed-out sample', () => {
    expect(rulerStepSeconds(400, 400)).toBe(30)
  })
})

describe('rulerTickTimes', () => {
  it('aligns to whole seconds', () => {
    expect(rulerTickTimes(0.4, 3.2, 1)).toEqual([1, 2, 3])
  })
})

describe('rulerMarks', () => {
  it('labels a dense 1 s grid on a short sample', () => {
    const marks = rulerMarks(0, 8, 8, 0)
    expect(marks.length).toBeGreaterThan(5)
    expect(marks.some((m) => m.t === 1)).toBe(true)
  })

  it('spaces labels so they do not overlap a 320px phone ruler', () => {
    const gap = rulerMinFracGap(320, 96)
    expect(gap * 320).toBeGreaterThanOrEqual(96)
    const marks = rulerMarks(0, 12, 12, gap)
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i]!.frac - marks[i - 1]!.frac).toBeGreaterThanOrEqual(gap - 1e-6)
      expect((marks[i]!.frac - marks[i - 1]!.frac) * 430).toBeGreaterThanOrEqual(96)
    }
    expect(marks.length).toBeLessThanOrEqual(5)
  })
})
