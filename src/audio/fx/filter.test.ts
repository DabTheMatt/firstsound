import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import {
  adsEnvelope,
  applyFilterModulation,
  combDelaySeconds,
  filterCharacterModel,
  filterDryWet,
  filterLfoRateHz,
  filterLfoWave,
  filterStageQs,
  filterTypeAt,
  morphMixGains,
  optionIndex,
  FILTER_TYPE_OPTIONS,
} from './filter'
import { filterPresetPatch, randomizeFilterPatch } from './filterPresets'
import { filterMagnitudeDb, filterMixMagnitudeDb, filterModuleIsAudible } from './filterResponse'

describe('filter types and slopes', () => {
  it('maps discrete indices onto creative filter types', () => {
    expect(filterTypeAt(0)).toBe('lowpass')
    expect(filterTypeAt(optionIndex(FILTER_TYPE_OPTIONS, 'morph'))).toBe('morph')
  })

  it('uses more stages for steeper slopes', () => {
    expect(filterStageQs(6)).toHaveLength(1)
    expect(filterStageQs(12)).toHaveLength(1)
    expect(filterStageQs(24)).toHaveLength(2)
    expect(filterStageQs(48)).toHaveLength(4)
  })
})

describe('filter LFO', () => {
  it('covers reverse saw and sample-and-hold', () => {
    expect(filterLfoWave(0, 'saw')).toBeCloseTo(-1)
    expect(filterLfoWave(0, 'rsaw')).toBeCloseTo(1)
    expect(filterLfoWave(0.5, 'rsaw')).toBeCloseTo(0)
    expect(filterLfoWave(0.2, 'snh', 0.4)).toBeCloseTo(0.4)
  })

  it('uses tempo-synced rate when sync is on', () => {
    const params = defaultParamValues()
    params.bpm = 120
    params.filterLfoSync = 1
    params.filterLfoNote = 4
    params.filterLfoNoteKind = 0
    expect(filterLfoRateHz(params)).toBeCloseTo(2, 5)
  })
})

describe('filter modulation', () => {
  it('tracks pitch upward at 100% tracking', () => {
    const params = defaultParamValues()
    params.filterCutoff = 1000
    params.filterPitchTrack = 100
    params.pitch = 12
    const next = applyFilterModulation(params, {
      timeSec: 0,
      playing: true,
      envOriginSec: 0,
      follower01: 0,
      snh: { index: -1, value: 0 },
    })
    expect(next.filterCutoff).toBeCloseTo(2000, 0)
  })

  it('opens cutoff with a positive envelope follower', () => {
    const params = defaultParamValues()
    params.filterCutoff = 400
    params.filterEnvAmt = 100
    params.filterEnvDir = 1
    const low = applyFilterModulation(params, {
      timeSec: 0,
      playing: true,
      envOriginSec: 0,
      follower01: 0,
      snh: { index: -1, value: 0 },
    })
    const high = applyFilterModulation(params, {
      timeSec: 0,
      playing: true,
      envOriginSec: 0,
      follower01: 1,
      snh: { index: -1, value: 0 },
    })
    expect(high.filterCutoff).toBeGreaterThan(low.filterCutoff)
  })

  it('sweeps cutoff from dedicated LFO rate and depth', () => {
    const params = defaultParamValues()
    params.filterCutoff = 1000
    params.filterLfoDepth = 80
    params.filterLfoRate = 1
    params.filterLfoShape = 0
    params.filterLfoSync = 0
    const lo = applyFilterModulation(params, {
      timeSec: 0.75,
      playing: true,
      envOriginSec: 0,
      follower01: 0,
      snh: { index: -1, value: 0 },
    })
    const hi = applyFilterModulation(params, {
      timeSec: 0.25,
      playing: true,
      envOriginSec: 0,
      follower01: 0,
      snh: { index: -1, value: 0 },
    })
    expect(hi.filterCutoff).toBeGreaterThan(params.filterCutoff)
    expect(lo.filterCutoff).toBeLessThan(params.filterCutoff)
  })

  it('lets a bipolar ADSR amount close the filter', () => {
    const params = defaultParamValues()
    params.filterCutoff = 2000
    params.filterAdsAmt = -100
    params.filterAdsAttack = 1
    params.filterAdsDecay = 1
    params.filterAdsSustain = 100
    const next = applyFilterModulation(params, {
      timeSec: 1,
      playing: true,
      envOriginSec: 0,
      follower01: 0,
      snh: { index: -1, value: 0 },
    })
    expect(next.filterCutoff).toBeLessThan(2000)
  })
})

describe('ads envelope', () => {
  it('rises through attack then rests on sustain', () => {
    expect(adsEnvelope(0, true, 0.1, 0.1, 40, 0.2)).toBeCloseTo(0)
    expect(adsEnvelope(0.1, true, 0.1, 0.1, 40, 0.2)).toBeCloseTo(1)
    expect(adsEnvelope(0.3, true, 0.1, 0.1, 40, 0.2)).toBeCloseTo(0.4)
  })
})

describe('character and mix', () => {
  it('boosts drive and Q for aggressive vs clean', () => {
    expect(filterCharacterModel('aggressive').qMul).toBeGreaterThan(filterCharacterModel('clean').qMul)
    expect(filterCharacterModel('dirty').driveBoost).toBeGreaterThan(0)
  })

  it('is fully wet at mix 100', () => {
    expect(filterDryWet(100).wet).toBeCloseTo(1)
    expect(filterDryWet(0).dry).toBeCloseTo(1)
  })

  it('morphs LP to HP through BP', () => {
    expect(morphMixGains(0).lp).toBeCloseTo(1)
    expect(morphMixGains(0.5).bp).toBeCloseTo(1)
    expect(morphMixGains(1).hp).toBeCloseTo(1)
  })
})

describe('response and presets', () => {
  it('drops highs for a low-pass and lows for a high-pass', () => {
    const lp = defaultParamValues()
    lp.filterKind = optionIndex(FILTER_TYPE_OPTIONS, 'lowpass')
    lp.filterCutoff = 400
    lp.filterSlope = 3
    const hp = { ...lp, filterKind: optionIndex(FILTER_TYPE_OPTIONS, 'highpass') }
    expect(filterMagnitudeDb(lp, 80, 48000)).toBeGreaterThan(filterMagnitudeDb(lp, 8000, 48000))
    expect(filterMagnitudeDb(hp, 8000, 48000)).toBeGreaterThan(filterMagnitudeDb(hp, 80, 48000))
  })

  it('stays near the floor below a wet high-pass after mix', () => {
    const hp = defaultParamValues()
    hp.filterKind = optionIndex(FILTER_TYPE_OPTIONS, 'highpass')
    hp.filterCutoff = 200
    hp.filterSlope = 3
    hp.filterMix = 100
    const raw = filterMagnitudeDb(hp, 20, 48000)
    expect(filterMixMagnitudeDb(raw, 100)).toBeLessThan(-24)
    expect(filterMixMagnitudeDb(raw, 0)).toBeCloseTo(0, 1)
    expect(filterModuleIsAudible(true, 100)).toBe(false)
    expect(filterModuleIsAudible(false, 100)).toBe(true)
  })

  it('keeps randomize inside a musical recipe family', () => {
    const patch = randomizeFilterPatch(0.2)
    expect(patch.filterCutoff).toBeGreaterThan(20)
    expect(patch.filterCutoff).toBeLessThan(20000)
    expect(filterPresetPatch('telephone').filterKind).toBe(optionIndex(FILTER_TYPE_OPTIONS, 'bandpass'))
  })

  it('maps comb delay from cutoff', () => {
    expect(combDelaySeconds(100)).toBeCloseTo(0.01)
  })
})
