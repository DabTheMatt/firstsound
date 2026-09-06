import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { fillReverbImpulse, IR_PEAK_LIMIT } from './impulse'
import { reverbPresetSafetyIssues } from './reverbPresetSafety'
import { REVERB_PRESET_CATEGORIES, SPACE_PRESETS } from './presets'
import type { ReverbType } from './types'

const REVERBS = SPACE_PRESETS.filter((p) => p.kind === 'reverb')

describe('reverb factory presets', () => {
  it('groups rooms, halls, plates, ambient and experimental in the category select', () => {
    expect(REVERB_PRESET_CATEGORIES).toEqual([
      'Room',
      'Hall',
      'Plate',
      'Spring',
      'Ambient',
      'Experimental',
      'Stereo',
    ])
    for (const cat of REVERB_PRESET_CATEGORIES) {
      expect(REVERBS.some((p) => p.category === cat)).toBe(true)
    }
    expect(REVERBS.some((p) => p.id === 'rv-small' && p.category === 'Room')).toBe(true)
    expect(REVERBS.some((p) => p.id === 'rv-big' && p.category === 'Room')).toBe(true)
    expect(REVERBS.filter((p) => p.category === 'Ambient').length).toBeGreaterThanOrEqual(4)
    expect(REVERBS.filter((p) => p.category === 'Experimental').length).toBeGreaterThanOrEqual(4)
  })

  it('stays below clip on wet, drive, shimmer and unused Color', () => {
    for (const preset of REVERBS) {
      expect(reverbPresetSafetyIssues(preset), preset.id).toEqual([])
    }
  })

  it('builds IRs that stay under the peak limiter', () => {
    const base = defaultParamValues()
    for (const preset of REVERBS) {
      const params = { ...base, ...preset.params }
      const type = (preset.reverbType ?? 'hall') as ReverbType
      const n = 4800
      const left = new Float32Array(n)
      const right = new Float32Array(n)
      fillReverbImpulse(left, right, {
        type,
        sampleRate: 48000,
        decaySec: Math.min(2.2, params.reverbDecay),
        size: params.reverbSize / 100,
        diffusion: params.reverbDiffusion / 100,
        density: params.reverbDensity / 100,
        early: params.reverbEarly / 100,
        damping: 1 - Math.min(1, params.reverbDamping / 18000),
        reverse: params.reverbReverse / 100,
        shimmer: params.reverbShimmer / 100,
        shimmerPitch: params.reverbShimmerPitch,
        color: params.reverbColor / 100,
        freeze: params.reverbFreeze > 0.5,
      })
      let peak = 0
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!))
      expect(peak, preset.id).toBeLessThanOrEqual(IR_PEAK_LIMIT)
    }
  })
})
