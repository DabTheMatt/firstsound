import { describe, expect, it } from 'vitest'
import { EQ_PRESETS, findEqPreset } from './eqPresets'
import { MODULE_PRESETS, modulePresetsFor } from './modulePresets'

describe('eq factory presets', () => {
  it('covers every listed category with at least one preset', () => {
    const cats = new Set(EQ_PRESETS.map((p) => p.category))
    expect(cats.has('Vocals')).toBe(true)
    expect(cats.has('Master')).toBe(true)
    expect(findEqPreset('eq-telephone')?.bands.length).toBeGreaterThan(0)
  })

  it('keeps gains conservative', () => {
    for (const preset of EQ_PRESETS) {
      for (const band of preset.bands) {
        expect(Math.abs(band.gain)).toBeLessThanOrEqual(8)
      }
    }
  })
})

describe('module factory presets', () => {
  it('lists grain, compressor, limiter, distortion, and filter', () => {
    expect(modulePresetsFor('grain').length).toBeGreaterThan(0)
    expect(modulePresetsFor('compressor').length).toBeGreaterThan(0)
    expect(modulePresetsFor('limiter').length).toBeGreaterThan(0)
    expect(modulePresetsFor('distortion').length).toBeGreaterThan(0)
    expect(modulePresetsFor('filter').some((p) => p.lfo)).toBe(true)
    expect(MODULE_PRESETS.every((p) => p.hint.length > 0)).toBe(true)
  })
})
