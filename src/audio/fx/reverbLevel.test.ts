import { describe, expect, it } from 'vitest'
import { REVERB_SUM_CEILING, REVERB_WET_TRIM, makeReverbSumCeiling, reverbDecayStackTrim, reverbWetOutputGain } from './reverbLevel'

describe('reverbWetOutputGain', () => {
  it('keeps a unity static trim and still follows the output knob', () => {
    expect(REVERB_WET_TRIM).toBe(1)
    expect(reverbWetOutputGain(100, 0.5)).toBeCloseTo(1)
    expect(reverbWetOutputGain(0)).toBe(0)
    expect(reverbWetOutputGain(200, 0.5)).toBeCloseTo(2)
  })

  it('passes a normal dry peak and stops a sum that would clip', () => {
    const curve = makeReverbSumCeiling()
    const at = (x: number) => {
      const i = Math.round(((x + 1) / 2) * (curve.length - 1))
      return curve[Math.min(curve.length - 1, Math.max(0, i))] ?? 0
    }
    expect(at(0.5)).toBeCloseTo(0.5, 2)
    expect(at(0)).toBeCloseTo(0, 2)
    expect(at(1)).toBeCloseTo(REVERB_SUM_CEILING, 2)
    expect(curve[curve.length - 1] ?? 0).toBeCloseTo(REVERB_SUM_CEILING, 5)
    expect(curve[0] ?? 0).toBeCloseTo(-REVERB_SUM_CEILING, 5)
  })

  it('lowers the wet send as decay grows so tails do not pile up', () => {
    expect(reverbDecayStackTrim(0.8)).toBe(1)
    expect(reverbWetOutputGain(100, 8)).toBeLessThan(reverbWetOutputGain(100, 1.6))
    expect(reverbDecayStackTrim(8)).toBeLessThan(0.8)
  })
})
