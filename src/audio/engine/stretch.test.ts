import { describe, expect, it } from 'vitest'
import {
  hannCurve,
  scaledHannCurve,
  smoothTowardLinear,
  smoothTowardLog,
  stretchLookahead,
  stretchSlew,
  stretchWindow,
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
})
