import { describe, expect, it } from 'vitest'
import { sensoryDistortionType, sensoryReverbType } from './applySensory'
import { defaultSensoryValues, patchSensoryValue } from './sensoryState'

describe('sensoryReverbType', () => {
  it('stays on a hall IR at rest and for Space', () => {
    expect(sensoryReverbType(defaultSensoryValues())).toBe('hall')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'space', 1))).toBe('hall')
  })

  it('follows dedicated reverb feelings', () => {
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'bloom', 1))).toBe('bloom')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'plate', 0.8))).toBe('plate')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'spring', 0.7))).toBe('spring')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'shimmer', 0.9))).toBe('shimmer')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'reverse', 0.8))).toBe('reverse')
    expect(sensoryReverbType(patchSensoryValue(defaultSensoryValues(), 'gate', 0.8))).toBe('gated')
  })
})

describe('sensoryDistortionType', () => {
  it('picks a distortion model from the strongest grit feeling', () => {
    expect(sensoryDistortionType(defaultSensoryValues())).toBeUndefined()
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'dirt', 0.8))).toBe('saturation')
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'fuzz', 0.9))).toBe('fuzz')
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'crush', 1))).toBe('bitcrush')
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'fold', 0.7))).toBe('fold')
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'vinyl', 0.6))).toBe('vinyl')
    expect(sensoryDistortionType(patchSensoryValue(defaultSensoryValues(), 'tape', 0.8))).toBe('tape')
  })
})
