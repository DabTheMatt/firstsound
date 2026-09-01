import { describe, expect, it } from 'vitest'
import { applyFades, fadeBendFromMidGain, fadeGain, pingPongFadeCurve, pingPongRegionRel, regionFadeGain } from './fades'

describe('fadeGain', () => {
  it('starts at 0 and ends at 1 for fade-in', () => {
    for (const curve of ['linear', 'equalPower', 'exponential', 'sCurve'] as const) {
      expect(fadeGain(0, curve)).toBeCloseTo(0)
      expect(fadeGain(1, curve)).toBeCloseTo(1)
    }
  })

  it('equal-power is 1/sqrt(2) at the midpoint', () => {
    expect(fadeGain(0.5, 'equalPower')).toBeCloseTo(Math.SQRT1_2, 5)
  })

  it('raising the midpoint bend increases gain at t=0.5', () => {
    expect(fadeGain(0.5, 'linear', 0.8)).toBeGreaterThan(fadeGain(0.5, 'linear', 0.5))
    expect(fadeGain(0.5, 'linear', 0.2)).toBeLessThan(fadeGain(0.5, 'linear', 0.5))
  })

  it('inverts midpoint gain back to a matching bend', () => {
    const bend = 0.72
    const g = fadeGain(0.5, 'linear', bend)
    expect(fadeGain(0.5, 'linear', fadeBendFromMidGain(g, 'linear'))).toBeCloseTo(g, 3)
  })
})

describe('regionFadeGain', () => {
  it('is 0 at the start of a fade-in and 1 in the middle', () => {
    expect(regionFadeGain(0, 1, 0.2, 0.2, 'linear')).toBeCloseTo(0)
    expect(regionFadeGain(0.5, 1, 0.2, 0.2, 'linear')).toBeCloseTo(1)
    expect(regionFadeGain(1, 1, 0.2, 0.2, 'linear')).toBeCloseTo(0)
  })
})

describe('pingPongFadeCurve', () => {
  it('puts fade-out at the turnaround, matching fade-in at the start', () => {
    const curve = pingPongFadeCurve(1, 0.2, 0.2, 'linear', 21)
    expect(curve[0]).toBeCloseTo(0.0001)
    expect(curve[10]).toBeCloseTo(0.0001)
    expect(curve[5]).toBeCloseTo(1)
    expect(curve[15]).toBeCloseTo(1)
    expect(curve[20]).toBeCloseTo(0.0001)
  })

  it('maps ping-pong time back into the original region', () => {
    expect(pingPongRegionRel(0.25, 1)).toBeCloseTo(0.25)
    expect(pingPongRegionRel(1, 1)).toBeCloseTo(1)
    expect(pingPongRegionRel(1.25, 1)).toBeCloseTo(0.75)
    expect(pingPongRegionRel(2, 1)).toBeCloseTo(0)
  })
})

describe('applyFades', () => {
  it('silences the first and last samples of a 1s block with 10ms fades', () => {
    const sr = 1000
    const data = new Float32Array(sr)
    data.fill(1)
    applyFades(data, sr, 0.01, 0.01, 'linear')
    expect(data[0]).toBeCloseTo(0)
    expect(data[9]).toBeCloseTo(1)
    expect(data[sr - 1]).toBeCloseTo(0)
    expect(data[500]).toBe(1)
  })
})
