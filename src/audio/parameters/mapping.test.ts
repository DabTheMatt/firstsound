import { describe, expect, it } from 'vitest'
import { PARAMS } from './definitions'
import {
  applyParamValue,
  clampRegion,
  dbToGain,
  defaultPlayRegion,
  fromNormalized,
  playbackRate,
  toNormalized,
} from './mapping'

describe('mapping', () => {
  it('round-trips linear pitch', () => {
    const def = PARAMS.pitch
    const n = toNormalized(12, def)
    expect(fromNormalized(n, def)).toBeCloseTo(12, 8)
  })

  it('round-trips log speed', () => {
    const def = PARAMS.speed
    const n = toNormalized(2, def)
    expect(fromNormalized(n, def)).toBeCloseTo(2, 8)
  })

  it('clamps to def range', () => {
    expect(applyParamValue(99, PARAMS.speed)).toBe(PARAMS.speed.max)
    expect(applyParamValue(-2, PARAMS.speed)).toBe(PARAMS.speed.min)
  })

  it('converts dB to amplitude', () => {
    expect(dbToGain(0)).toBeCloseTo(1)
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2)
  })

  it('combines speed and pitch into playbackRate', () => {
    expect(playbackRate(1, 12)).toBeCloseTo(2)
    expect(playbackRate(0.5, 0)).toBeCloseTo(0.5)
  })
})

describe('clampRegion', () => {
  it('keeps a minimum span inside the buffer', () => {
    const r = clampRegion(1, 1.01, 10, 0.05)
    expect(r.end - r.start).toBeCloseTo(0.05)
  })

  it('handles empty buffers', () => {
    expect(clampRegion(1, 2, 0)).toEqual({ start: 0, end: 0 })
  })

  it('clamps to duration', () => {
    const r = clampRegion(-1, 99, 2)
    expect(r.start).toBe(0)
    expect(r.end).toBe(2)
  })
})

describe('defaultPlayRegion', () => {
  it('keeps handles inside a long sample', () => {
    const r = defaultPlayRegion(100)
    expect(r.start).toBeCloseTo(18)
    expect(r.end).toBeCloseTo(65)
  })
})
