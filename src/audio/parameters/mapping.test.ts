import { describe, expect, it } from 'vitest'
import { PARAMS } from './definitions'
import {
  applyParamValue,
  clampRegion,
  clampScrubTime,
  dbToGain,
  defaultPlayRegion,
  fullPlayRegion,
  formatParamValue,
  fromNormalized,
  parseTypedNumber,
  parseTypedParam,
  parseTypedRange,
  playbackRate,
  sampleOriginSeconds,
  snapPlayheadToRegion,
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

  it('round-trips log filter cutoff', () => {
    const def = PARAMS.filterCutoff
    const n = toNormalized(800, def)
    expect(fromNormalized(n, def)).toBeCloseTo(800, 6)
  })

  it('formats filter cutoff in Hz and kHz', () => {
    expect(formatParamValue(800, PARAMS.filterCutoff)).toBe('800 Hz')
    expect(formatParamValue(4200, PARAMS.filterCutoff)).toBe('4.20 kHz')
  })

  it('parses typed knob values with unit suffixes', () => {
    expect(parseTypedParam('2k', PARAMS.filterCutoff)).toBeCloseTo(2000, 5)
    expect(parseTypedParam('12 st', PARAMS.pitch)).toBe(12)
    expect(parseTypedNumber('80 ms')?.value).toBe(80)
    expect(parseTypedRange('1.5s', 0, 2000, 'ms')).toBe(1500)
  })

  it('formats resonance as Q', () => {
    expect(formatParamValue(0.7, PARAMS.filterReso)).toBe('0.70 Q')
  })

  it('round-trips log delay time', () => {
    const def = PARAMS.delayTime
    expect(fromNormalized(toNormalized(300, def), def)).toBeCloseTo(300, 4)
  })

  it('formats space params', () => {
    expect(formatParamValue(300, PARAMS.delayTime)).toBe('300 ms')
    expect(formatParamValue(35, PARAMS.delayFeedback)).toBe('35 %')
    expect(formatParamValue(0, PARAMS.delayWet)).toBe('0 %')
    expect(formatParamValue(100, PARAMS.delayDry)).toBe('100 %')
    expect(formatParamValue(100, PARAMS.delayOutput)).toBe('100 %')
    expect(formatParamValue(1.6, PARAMS.reverbDecay)).toBe('1.60 s')
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

describe('stop playhead', () => {
  it('parks at the start of the sample', () => {
    expect(sampleOriginSeconds()).toBe(0)
  })

  it('snaps back into the region when play starts from the sample origin', () => {
    expect(snapPlayheadToRegion(0, 18, 65, false)).toBe(18)
    expect(snapPlayheadToRegion(0, 18, 65, true)).toBe(65)
    expect(snapPlayheadToRegion(20, 18, 65, false)).toBe(20)
  })
})

describe('clampScrubTime', () => {
  it('keeps region scrubbing inside the selection', () => {
    expect(clampScrubTime(0.2, 'region', 1, 3, 10)).toBe(1)
    expect(clampScrubTime(2, 'region', 1, 3, 10)).toBe(2)
    expect(clampScrubTime(9, 'region', 1, 3, 10)).toBe(3)
  })

  it('lets sample scrubbing travel the full file', () => {
    expect(clampScrubTime(9, 'sample', 1, 3, 10)).toBe(9)
    expect(clampScrubTime(-1, 'sample', 1, 3, 10)).toBe(0)
  })
})

describe('defaultPlayRegion', () => {
  it('keeps handles inside a long sample', () => {
    const r = defaultPlayRegion(100)
    expect(r.start).toBeCloseTo(18)
    expect(r.end).toBeCloseTo(65)
  })

  it('covers the whole buffer after a trim bake', () => {
    expect(fullPlayRegion(3.76)).toEqual({ start: 0, end: 3.76 })
    expect(fullPlayRegion(0)).toEqual({ start: 0, end: 0 })
  })
})
