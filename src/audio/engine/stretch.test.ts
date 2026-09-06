import { describe, expect, it } from 'vitest'
import {
  hannCurve,
  scaledHannCurve,
  scaledWindowCurve,
  smoothTowardLinear,
  smoothTowardLog,
  stretchAlgoFromParam,
  stretchLookahead,
  stretchSlew,
  stretchWindow,
  windowCurve,
} from './stretch'

describe('stretchWindow', () => {
  it('uses denser hops at high interpolation', () => {
    const sparse = stretchWindow(0)
    const dense = stretchWindow(100)
    expect(dense.hopSec).toBeLessThan(sparse.hopSec)
    expect(dense.grainSec).toBeLessThan(sparse.grainSec)
    expect(dense.hopSec / dense.grainSec).toBeLessThan(sparse.hopSec / sparse.grainSec)
  })

  it('keeps hops shorter than the grain', () => {
    for (const interp of [0, 35, 62, 100]) {
      const w = stretchWindow(interp)
      expect(w.hopSec).toBeLessThan(w.grainSec)
      expect(w.peak).toBeGreaterThan(0)
      expect(w.peak).toBeLessThanOrEqual(0.62)
    }
  })

  it('lets density change hop without shrinking the grain', () => {
    const sparse = stretchWindow(62, 0)
    const dense = stretchWindow(62, 100)
    expect(dense.grainSec).toBeCloseTo(sparse.grainSec)
    expect(dense.hopSec).toBeLessThan(sparse.hopSec)
  })
})

describe('stretch smoothing', () => {
  it('eases log speed without overshoot', () => {
    const next = smoothTowardLog(1, 4, 0.25)
    expect(next).toBeGreaterThan(1)
    expect(next).toBeLessThan(4)
  })

  it('eases pitch linearly', () => {
    expect(smoothTowardLinear(0, 12, 0.5)).toBeCloseTo(6)
  })

  it('slows the slew as interpolation densifies', () => {
    expect(stretchSlew(0.01, 100)).toBeLessThan(stretchSlew(0.01, 0))
  })

  it('keeps lookahead at least a couple of hops', () => {
    const hop = stretchWindow(80).hopSec
    expect(stretchLookahead(hop)).toBeGreaterThan(hop * 2)
  })
})

describe('hannCurve', () => {
  it('starts and ends near silence', () => {
    const curve = hannCurve(32)
    expect(curve[0]).toBeCloseTo(0)
    expect(curve[curve.length - 1]).toBeCloseTo(0)
    expect(Math.max(...curve)).toBeCloseTo(1)
  })

  it('scales peak gain', () => {
    const curve = scaledHannCurve(0.4, 16)
    expect(Math.max(...curve)).toBeCloseTo(0.4)
  })

  it('maps algo param to named windows', () => {
    expect(stretchAlgoFromParam(0)).toBe('hann')
    expect(stretchAlgoFromParam(1)).toBe('triangle')
    expect(stretchAlgoFromParam(2)).toBe('blackman')
    const tri = windowCurve('triangle', 33)
    expect(tri[0]).toBeCloseTo(0)
    expect(Math.max(...tri)).toBeCloseTo(1)
    const blk = scaledWindowCurve('blackman', 0.5, 24)
    expect(Math.max(...blk)).toBeLessThanOrEqual(0.5 + 1e-6)
  })
})
