import { describe, expect, it } from 'vitest'
import { combAsEqBands, combToothHz, defaultCombFilter, parseCombFilter } from './comb'

describe('combToothHz', () => {
  it('spaces teeth linearly in Hz', () => {
    const comb = { ...defaultCombFilter(), teeth: 4, frequency: 100, spacing: 100, spacingMode: 'linear' as const }
    expect(combToothHz(comb)).toEqual([100, 200, 300, 400])
  })

  it('spaces teeth logarithmically by ratio', () => {
    const comb = { ...defaultCombFilter(), teeth: 4, frequency: 100, spacing: 2, spacingMode: 'log' as const }
    expect(combToothHz(comb)).toEqual([100, 200, 400, 800])
  })

  it('stops before exceeding 25 kHz', () => {
    const comb = { ...defaultCombFilter(), teeth: 16, frequency: 8000, spacing: 8000, spacingMode: 'linear' as const }
    const hz = combToothHz(comb)
    expect(hz.every((f) => f <= 25000)).toBe(true)
    expect(hz.length).toBeLessThan(16)
  })
})

describe('combAsEqBands', () => {
  it('is empty when the comb is disabled', () => {
    expect(combAsEqBands(defaultCombFilter())).toEqual([])
  })

  it('emits peaking bands when enabled', () => {
    const bands = combAsEqBands({ ...defaultCombFilter(), enabled: true, teeth: 3 })
    expect(bands).toHaveLength(3)
    expect(bands.every((b) => b.type === 'peaking')).toBe(true)
  })
})

describe('parseCombFilter', () => {
  it('round-trips a stored comb', () => {
    const src = { ...defaultCombFilter(), enabled: true, teeth: 8 }
    expect(parseCombFilter(src)).toEqual({ ...src, teeth: 8 })
  })

  it('rejects incomplete objects', () => {
    expect(parseCombFilter({ enabled: true })).toBeNull()
  })
})
