import { describe, expect, it } from 'vitest'
import { dbToMeterPct, meterDbMin, meterScaleTicks, meterSweetBand } from './editorState'

describe('meter mapping', () => {
  it('puts 0 dB at the top and the range floor at the bottom', () => {
    expect(dbToMeterPct(0, -60)).toBe(100)
    expect(dbToMeterPct(-60, -60)).toBe(0)
    expect(dbToMeterPct(-30, -60)).toBe(50)
  })

  it('highlights −12 to −6 as a band in the upper quarter on a −60 range', () => {
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

  it('includes sweet-spot ticks for every meter range', () => {
    for (const range of ['normal', 'field', 'full'] as const) {
      const ticks = meterScaleTicks(meterDbMin(range))
      expect(ticks).toContain(0)
      expect(ticks).toContain(-6)
      expect(ticks).toContain(-12)
      expect(ticks.at(-1)).toBe(meterDbMin(range))
    }
  })
})
