import { describe, expect, it } from 'vitest'
import { makeDriveCurve } from './graphs'
import { findSpacePreset, SPACE_PRESETS } from './presets'
import { delayLoopGain } from './delayLoop'

describe('makeDriveCurve', () => {
  it('is a straight wire at zero drive so the loop does not alias', () => {
    const c = makeDriveCurve(0)
    expect(c[0]).toBeCloseTo(-1)
    expect(c[(c.length - 1) / 2] ?? c[Math.floor((c.length - 1) / 2)]).toBeCloseTo(0, 2)
    expect(c[c.length - 1]).toBeCloseTo(1)
    const mid = c[512] ?? 0
    expect(Math.abs(mid)).toBeLessThan(0.02)
  })

  it('stays odd-symmetric when drive is on', () => {
    const c = makeDriveCurve(0.2)
    expect(c[0]).toBeCloseTo(-c[c.length - 1]!)
    expect(Math.abs(c[512] ?? 0)).toBeLessThan(0.02)
  })
})

describe('delay factory presets', () => {
  it('keeps every delay preset under a decaying loop gain', () => {
    const delays = SPACE_PRESETS.filter((p) => p.kind === 'delay')
    expect(delays.length).toBeGreaterThan(8)
    for (const preset of delays) {
      const fb = preset.params.delayFeedback ?? 28
      const type = preset.delayType ?? 'digital'
      expect(delayLoopGain(fb, type), preset.id).toBeLessThan(0.72)
    }
  })

  it('keeps analog and tape factory sounds moderate', () => {
    const analog = findSpacePreset('dly-analog')
    const tape = findSpacePreset('dly-tape')
    expect(analog?.params.delayFeedback).toBeLessThan(45)
    expect(analog?.params.delayDrive).toBeLessThan(15)
    expect(tape?.params.delayFeedback).toBeLessThan(45)
    expect(tape?.params.delayWow).toBeLessThan(20)
  })
})
