import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { applyDelayMacro, delayMacroNormalized } from './macros'
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

  it('lets Color reach 0%', () => {
    const p = defaultParamValues()
    const dark = applyDelayMacro('color', 0, p)
    expect(delayMacroNormalized('color', { ...p, ...dark })).toBeCloseTo(0)
    const bright = applyDelayMacro('color', 1, p)
    expect(delayMacroNormalized('color', { ...p, ...bright })).toBeCloseTo(1)
  })
})

describe('migrateSpaceParams', () => {
  it('maps legacy percentage decay into seconds', () => {
    const next = migrateSpaceParams({ reverbDecay: 45, delayTime: 300 })
    expect(next.reverbDecay).toBeGreaterThan(0.5)
    expect(next.reverbDecay).toBeLessThan(10)
    expect(next.delayTime).toBe(300)
  })

  it('maps legacy Mix onto Wet and leaves Dry at 100%', () => {
    const next = migrateSpaceParams({ spaceMix: 40, reverb: 25, delayTime: 300, reverbWidth: 100 })
    expect(next.delayDry).toBe(100)
    expect(next.delayWet).toBe(40)
    expect(next.reverbDry).toBe(100)
    expect(next.reverbWet).toBe(25)
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
    expect(findSpacePreset('dly-ping')?.delayType).toBe('pingPong')
  })

  it('maps guitar and drums categories to real patches', () => {
    const guitarDelay = defaultPresetFor('delay', 'Guitar')
    const drumDelay = defaultPresetFor('delay', 'Drums')
    const guitarRev = defaultPresetFor('reverb', 'Guitar')
    const drumRev = defaultPresetFor('reverb', 'Drums')
    expect(guitarDelay?.params.delayTime ?? guitarDelay?.params.delaySync).toBeTruthy()
    expect(drumDelay?.params.delayFeedback).toBeLessThan(20)
    expect(guitarRev?.reverbType).toBe('room')
    expect(drumRev?.category).toBe('Drums')
  })
})
