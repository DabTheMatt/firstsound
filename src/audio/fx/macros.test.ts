import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { applyDelayMacro, applyReverbMacro, delayMacroNormalized } from './macros'
import { migrateSpaceParams } from './migrate'
import { defaultPresetFor, findSpacePreset, SPACE_PRESETS } from './presets'

describe('macros', () => {
  it('time macro writes delayTime and disables sync', () => {
    const p = defaultParamValues()
    p.delaySync = 1
    const patch = applyDelayMacro('time', 0.5, p)
    expect(patch.delaySync).toBe(0)
    expect(patch.delayTime).toBeGreaterThan(1)
    expect(delayMacroNormalized('mix', { ...p, delayWet: 40 })).toBeCloseTo(0.4)
  })

  it('lets reverb Mix stay complementary when Correlate is on', () => {
    const p = defaultParamValues()
    p.reverbCorrelate = 1
    const mix = applyReverbMacro('mix', 0.3, p)
    expect(mix.reverbWet).toBeCloseTo(30)
    expect(mix.reverbDry).toBeCloseTo(70)
  })
})

describe('migrateSpaceParams', () => {
  it('maps legacy percentage decay into seconds', () => {
    const next = migrateSpaceParams({ reverbDecay: 45, delayTime: 300 })
    expect(next.reverbDecay).toBeGreaterThan(0.5)
    expect(next.reverbDecay).toBeLessThan(10)
    expect(next.delayTime).toBe(300)
  })

  it('maps legacy Mix onto correlated Dry/Wet that sum to 100%', () => {
    const next = migrateSpaceParams({ spaceMix: 40, reverb: 25, delayTime: 300, reverbWidth: 100 })
    expect(next.delayDry).toBe(60)
    expect(next.delayWet).toBe(40)
    expect(next.delayCorrelate).toBe(1)
    expect(next.reverbCorrelate).toBe(1)
    expect(next.reverbWet).toBe(25)
    expect(next.reverbDry).toBe(75)
    expect(next.delayOutput).toBe(100)
  })

  it('keeps new-format decay intact', () => {
    const next = migrateSpaceParams({ reverbDecay: 2.4, reverbWidth: 100 })
    expect(next.reverbDecay).toBeCloseTo(2.4)
  })
})

describe('presets', () => {
  it('covers delay and reverb factory sounds', () => {
    expect(SPACE_PRESETS.some((p) => p.id === 'dly-dot-8')).toBe(true)
    expect(SPACE_PRESETS.some((p) => p.id === 'rv-shimmer')).toBe(true)
    expect(SPACE_PRESETS.some((p) => p.id === 'rv-stereo-spread')).toBe(true)
    expect(findSpacePreset('dly-ping')?.delayType).toBe('pingPong')
    expect(findSpacePreset('rv-mono')?.params.reverbWidth).toBe(0)
    expect(findSpacePreset('rv-mono')?.params.reverbStereo).toBe(0)
    expect(findSpacePreset('rv-stereo-spread')?.params.reverbInput).toBe(0)
    expect(findSpacePreset('rv-haas')?.params.reverbWidth).toBe(160)
    expect(findSpacePreset('rv-bloom')?.reverbType).toBe('bloom')
    expect(findSpacePreset('rv-cinema')?.params.reverbDecay).toBeGreaterThan(3)
    expect(findSpacePreset('rv-big')?.category).toBe('Room')
  })

  it('maps guitar and drums delay categories and room reverb patches', () => {
    const guitarDelay = defaultPresetFor('delay', 'Guitar')
    const drumDelay = defaultPresetFor('delay', 'Drums')
    const roomRev = defaultPresetFor('reverb', 'Room')
    const ambientRev = defaultPresetFor('reverb', 'Ambient')
    expect(guitarDelay?.params.delayTime ?? guitarDelay?.params.delaySync).toBeTruthy()
    expect(drumDelay?.params.delayFeedback).toBeLessThan(20)
    expect(roomRev?.reverbType).toBe('room')
    expect(ambientRev?.category).toBe('Ambient')
  })
})
