import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'
import { defaultParamValues } from '../parameters/definitions'
import { effectDefaultPatch, paramsMatchDefaults } from './effectDefaults'
import { distortionTypeColorPatch, distortionTypeProfile } from './distortionProfiles'
import {
  findModulePreset,
  matchingModulePresetId,
  modulePresetsFor,
} from './modulePresets'
import { DISTORTION_TYPES } from './types'

describe('distortion preset selection', () => {
  it('does not treat the factory default as a named preset', () => {
    const params = defaultParamValues()
    expect(paramsMatchDefaults(params, 'distortion')).toBe(true)
    expect(matchingModulePresetId('distortion', params, 'saturation')).toBeNull()
  })

  it('matches a preset from its type and listed settings', () => {
    const params = { ...defaultParamValues() }
    const tape = findModulePreset('dst-tape')
    expect(tape?.params).toBeTruthy()
    Object.assign(params, tape!.params)
    expect(matchingModulePresetId('distortion', params, 'saturation')).toBe('dst-tape')
    expect(matchingModulePresetId('distortion', params, 'fuzz')).toBeNull()
  })

  it('keeps preset settings when the model color would overwrite them', () => {
    const engine = new AudioEngine()
    engine.applyModulePreset('dst-crush')
    const snap = engine.getSnapshot()
    expect(snap.distortionType).toBe('bitcrush')
    expect(snap.params.distortionBits).toBe(8)
    expect(snap.params.distortionDownsample).toBe(6)
    expect(snap.params.saturationMix).toBe(70)
    expect(matchingModulePresetId('distortion', snap.params, snap.distortionType)).toBe('dst-crush')
  })

  it('restores saturation and the original parameters from Default', () => {
    const engine = new AudioEngine()
    engine.setDistortionType('vinyl')
    engine.setParam('saturation', 40)
    engine.resetEffect('distortion')
    const snap = engine.getSnapshot()
    expect(snap.distortionType).toBe('saturation')
    expect(snap.distortionNoiseKind).toBe('white')
    expect(snap.distortionNoiseKind).toBe(distortionTypeProfile('saturation').noiseKind)
    expect(paramsMatchDefaults(snap.params, 'distortion')).toBe(true)
    expect(snap.params).toMatchObject(effectDefaultPatch('distortion'))
    expect(matchingModulePresetId('distortion', snap.params, snap.distortionType)).toBeNull()
    const color = distortionTypeColorPatch('saturation')
    for (const id of Object.keys(color) as (keyof typeof color)[]) {
      expect(snap.params[id]).toBe(color[id])
    }
  })

  it('clears the preset match when the type changes and leaves drive alone', () => {
    const engine = new AudioEngine()
    engine.applyModulePreset('dst-fuzz')
    expect(engine.getSnapshot().distortionType).toBe('fuzz')
    expect(matchingModulePresetId('distortion', engine.getSnapshot().params, 'fuzz')).toBe('dst-fuzz')
    engine.setDistortionType('tape')
    const snap = engine.getSnapshot()
    expect(snap.distortionType).toBe('tape')
    expect(snap.params.saturation).toBe(62)
    expect(snap.params.distortionNoise).toBe(distortionTypeColorPatch('tape').distortionNoise)
    expect(matchingModulePresetId('distortion', snap.params, snap.distortionType)).toBeNull()
  })

  it('selects every distortion model without moving drive', () => {
    const engine = new AudioEngine()
    engine.setParam('saturation', 33)
    for (const type of DISTORTION_TYPES) {
      engine.setDistortionType(type.value)
      const snap = engine.getSnapshot()
      const color = distortionTypeColorPatch(type.value)
      expect(snap.distortionType).toBe(type.value)
      expect(snap.distortionNoiseKind).toBe(distortionTypeProfile(type.value).noiseKind)
      expect(snap.params.saturation).toBe(33)
      expect(snap.params.distortionBits).toBe(color.distortionBits)
      expect(snap.params.distortionDownsample).toBe(color.distortionDownsample)
      expect(snap.params.distortionNoise).toBe(color.distortionNoise)
      expect(snap.params.distortionTone).toBe(color.distortionTone)
      expect(snap.params.distortionBias).toBe(color.distortionBias)
    }
    expect(modulePresetsFor('distortion').map((preset) => preset.id)).toEqual([
      'dst-tape',
      'dst-crush',
      'dst-fuzz',
    ])
  })
})
