import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { defaultCombFilter } from '../engine/comb'
import { defaultEqBands } from '../engine/eqBands'
import {
  combMatchesDefault,
  effectDefaultPatch,
  effectParamIds,
  eqBandsMatchDefault,
  paramsMatchDefaults,
} from './effectDefaults'
import { FILTER_PARAM_IDS } from './filter'
import { resetFilterPatch } from './filterPresets'
import { MS_PARAM_IDS } from './midSide'
import { resetMidSidePatch } from './midSidePresets'

describe('effect defaults', () => {
  it('reuses parameter defaults for filter and mid/side resets', () => {
    expect(resetFilterPatch()).toEqual(effectDefaultPatch('filter'))
    expect(resetMidSidePatch()).toEqual(effectDefaultPatch('midside'))
    expect(Object.keys(effectDefaultPatch('filter')).sort()).toEqual([...FILTER_PARAM_IDS].sort())
    expect(Object.keys(effectDefaultPatch('midside')).sort()).toEqual([...MS_PARAM_IDS].sort())
  })

  it('covers every effect parameter and leaves unrelated controls alone', () => {
    const params = defaultParamValues()
    for (const kind of ['grain', 'filter', 'distortion', 'compressor', 'limiter', 'midside', 'delay', 'reverb'] as const) {
      const patch = effectDefaultPatch(kind)
      expect(effectParamIds(kind).length).toBeGreaterThan(0)
      expect(paramsMatchDefaults(params, kind)).toBe(true)
      params.gain = 3
      expect(patch.gain).toBeUndefined()
      expect(paramsMatchDefaults(params, kind)).toBe(true)
    }
  })

  it('recognizes the original EQ bands and comb', () => {
    expect(eqBandsMatchDefault(defaultEqBands())).toBe(true)
    expect(combMatchesDefault(defaultCombFilter())).toBe(true)
    const edited = defaultEqBands()
    edited[0] = { ...edited[0]!, gain: 2, type: 'peaking' }
    expect(eqBandsMatchDefault(edited)).toBe(false)
  })
})
