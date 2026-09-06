import { describe, expect, it } from 'vitest'
import {
  dbToMeterPct,
  fallHoldDb,
  isMeterSweetMark,
  meterSweetBand,
  meterDbMin,
  meterScaleMarks,
  meterScaleTicks,
  SPECTRUM_DB_FLOOR,
  spectrumDbScaleMarks,
} from './editorState'

describe('meter mapping', () => {
  it('puts 0 dB at the top and the range floor at the bottom', () => {
    expect(dbToMeterPct(0, -60)).toBe(100)
    expect(dbToMeterPct(-60, -60)).toBe(0)
    expect(dbToMeterPct(-30, -60)).toBe(50)
  })

  it('marks −12 through −6 on the scale, including −9', () => {
    expect(isMeterSweetMark(-6)).toBe(true)
    expect(isMeterSweetMark(-9)).toBe(true)
    expect(isMeterSweetMark(-12)).toBe(true)
    expect(isMeterSweetMark(-3)).toBe(false)
    expect(isMeterSweetMark(-15)).toBe(false)
  })

  it('places the −12…−6 dB bracket in the upper quarter on a −60 range', () => {
    const band = meterSweetBand(-60)
    expect(band.bottom).toBeCloseTo(80)
    expect(band.height).toBeCloseTo(10)
  })

  it('uses a denser 3 dB grid in the top of the meter', () => {
    const ticks = meterScaleTicks(-60)
    expect(ticks).toContain(-3)
    expect(ticks).toContain(-9)
    expect(ticks).toContain(-18)
    expect(ticks).toContain(-30)
  })

  it('places an unlabeled 1 dB mark between labeled ticks', () => {
    const marks = meterScaleMarks(-60)
    expect(marks.some((m) => m.db === -1 && !m.label)).toBe(true)
    expect(marks.some((m) => m.db === -6 && m.label)).toBe(true)
    expect(marks.filter((m) => m.db > -12).length).toBe(12)
  })

  it('includes sweet-spot ticks for every meter range', () => {
    for (const range of ['normal', 'field', 'full'] as const) {
      const ticks = meterScaleTicks(meterDbMin(range))
      expect(ticks).toContain(0)
      expect(ticks).toContain(-6)
      expect(ticks).toContain(-12)
      expect(ticks.at(-1)).toBe(meterDbMin(range))
    }
  })

  it('thins FFT dB labels like the meter while keeping the sweet band', () => {
    const marks = spectrumDbScaleMarks(SPECTRUM_DB_FLOOR, 120)
    expect(marks[0]).toBe(0)
    expect(marks).toContain(-6)
    expect(marks).toContain(-12)
    expect(marks.at(-1)).toBe(SPECTRUM_DB_FLOOR)
    expect(marks.length).toBeLessThan(meterScaleTicks(SPECTRUM_DB_FLOOR).length)
    expect(marks).not.toContain(-3)
  })

  it('keeps meter-style 3 dB labels on a taller FFT', () => {
    const marks = spectrumDbScaleMarks(-60, 200)
    expect(marks).toContain(-3)
    expect(marks).toContain(-9)
    expect(marks).toContain(-24)
    expect(marks.at(-1)).toBe(-60)
  })
})

describe('fallHoldDb', () => {
  it('jumps up with a new peak and falls slower than the peak', () => {
    expect(fallHoldDb(-20, -6, 0.05)).toBe(-6)
    expect(fallHoldDb(-6, -20, 0.2, 10)).toBeCloseTo(-8)
  })
})
