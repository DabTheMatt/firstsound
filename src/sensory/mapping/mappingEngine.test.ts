import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../../audio/parameters/definitions'
import { defaultEqBands } from '../../audio/engine/eqBands'
import { defaultChain } from '../../audio/chain/chain'
import { defaultSensoryValues, patchSensoryValue } from '../sensoryState'
import { mapSensoryToDsp, snapshotFromEngine } from './mappingEngine'
import { SENSORY_SAFETY } from './safety'
import { interpolateMorphStop } from './morph'
import { EFFECT_MORPHS } from './effectMorphs'

function baseDsp() {
  return snapshotFromEngine({
    params: defaultParamValues(),
    eqBands: defaultEqBands(),
    chain: defaultChain(),
  })
}

describe('interpolateMorphStop', () => {
  it('lerps numeric params between designed stops', () => {
    const space = EFFECT_MORPHS.find((m) => m.axis === 'space')!
    const mid = interpolateMorphStop(space.stops, 0.5)
    expect(mid.params?.reverbWet).toBeGreaterThan(18)
    expect(mid.params?.reverbWet).toBeLessThan(34)
  })
})

describe('mapSensoryToDsp', () => {
  it('is identity at rest', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, defaultSensoryValues())
    expect(mapped.params.eq4Gain).toBeCloseTo(base.params.eq4Gain)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
    expect(mapped.params.saturation).toBeCloseTo(base.params.saturation)
    expect(mapped.eqBands[3]?.gain).toBeCloseTo(0)
    expect(mapped.bypass.eq).toBe(true)
    expect(mapped.params.start).toBe(base.params.start)
  })

  it('character morphs EQ only', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'character', 0.7))
    expect(mapped.eqBands[3]?.type).toBe('highshelf')
    expect(mapped.eqBands[3]?.gain).toBeGreaterThan(2)
    expect(mapped.eqBands[3]?.gain).toBeLessThanOrEqual(SENSORY_SAFETY.eqGain)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
    expect(mapped.params.delayWet).toBeCloseTo(base.params.delayWet)
    expect(mapped.params.saturation).toBeCloseTo(base.params.saturation)
    expect(mapped.bypass.eq).toBe(false)
    expect(mapped.bypass.reverb).toBe(true)
  })

  it('tight character uses a darker, boxed EQ and leaves reverb dry', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'character', -0.8))
    expect(mapped.eqBands[0]?.type).toBe('highpass')
    expect(mapped.eqBands[3]?.gain).toBeLessThan(-3)
    expect(mapped.params.reverbWet).toBe(0)
  })

  it('space morphs reverb only from subtle to vast without 100% wet', () => {
    const base = baseDsp()
    const subtle = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'space', 0.2))
    const vast = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'space', 1))
    expect(subtle.params.reverbWet).toBeGreaterThan(10)
    expect(subtle.params.reverbWet).toBeLessThan(20)
    expect(vast.params.reverbWet).toBeGreaterThan(subtle.params.reverbWet)
    expect(vast.params.reverbWet).toBeLessThanOrEqual(SENSORY_SAFETY.reverbWet)
    expect(vast.params.reverbDecay).toBeGreaterThan(3)
    expect(vast.params.reverbDecay).toBeLessThanOrEqual(SENSORY_SAFETY.reverbDecay)
    expect(vast.params.reverbShimmer).toBeLessThanOrEqual(SENSORY_SAFETY.reverbShimmer)
    expect(vast.params.reverbEarly).toBeGreaterThan(60)
    expect(vast.params.reverbSize).toBeGreaterThan(70)
    expect(vast.bypass.limiter).toBe(false)
    expect(vast.eqBands[3]?.gain).toBeCloseTo(base.eqBands[3]!.gain)
    expect(vast.params.delayWet).toBeCloseTo(base.params.delayWet)
    expect(vast.bypass.reverb).toBe(false)
  })

  it('echo morphs delay only and caps feedback', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'echo', 1))
    expect(mapped.params.delayWet).toBeGreaterThan(40)
    expect(mapped.params.delayWet).toBeLessThanOrEqual(SENSORY_SAFETY.delayWet)
    expect(mapped.params.delayFeedback).toBeLessThanOrEqual(SENSORY_SAFETY.delayFeedback)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
    expect(mapped.bypass.delay).toBe(false)
  })

  it('grain morphs grain params only and leaves motion still', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'grain', 0.8))
    expect(mapped.params.density).toBeGreaterThan(base.params.density)
    expect(mapped.params.density).toBeLessThanOrEqual(SENSORY_SAFETY.density)
    expect(mapped.params.motionDepth).toBeCloseTo(base.params.motionDepth)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
    expect(mapped.bypass.grain).toBe(false)
  })

  it('mod morphs grain motion only', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'mod', 0.8))
    expect(mapped.params.motionDepth).toBeGreaterThan(base.params.motionDepth)
    expect(mapped.params.density).toBeCloseTo(base.params.density)
    expect(mapped.bypass.grain).toBe(false)
  })

  it('drift opens a stereo delay image without eating the echo wet', () => {
    const base = baseDsp()
    const drifted = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'drift', 1))
    expect(drifted.params.delayWidth).toBeGreaterThan(150)
    expect(drifted.params.delayTimeR).toBeGreaterThan(drifted.params.delayTime)
    expect(drifted.params.delayTimeR - drifted.params.delayTime).toBeLessThan(50)
    expect(drifted.params.delayWet).toBeLessThanOrEqual(28)
    expect(drifted.bypass.delay).toBe(false)
    const both = mapSensoryToDsp(
      base,
      patchSensoryValue(patchSensoryValue(defaultSensoryValues(), 'echo', 0.8), 'drift', 1),
    )
    expect(both.params.delayWet).toBeGreaterThan(drifted.params.delayWet)
    expect(both.params.delayWidth).toBeGreaterThan(150)
    expect(Math.abs(both.params.delayTimeR - both.params.delayTime)).toBeLessThan(40)
  })

  it('dirt morphs saturation only', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'dirt', 1))
    expect(mapped.params.saturation).toBeGreaterThan(20)
    expect(mapped.params.saturation).toBeLessThanOrEqual(SENSORY_SAFETY.saturation)
    expect(mapped.eqBands[0]?.type).toBe(base.eqBands[0]?.type)
  })

  it('tight morphs compressor only', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'tight', 0.9))
    expect(mapped.params.compressorThreshold).toBeLessThan(base.params.compressorThreshold)
    expect(mapped.params.compressorMakeup).toBeLessThanOrEqual(SENSORY_SAFETY.compressorMakeup)
    expect(mapped.params.saturation).toBeCloseTo(base.params.saturation)
    expect(mapped.bypass.compressor).toBe(false)
  })

  it('does not rewrite start and end', () => {
    const base = baseDsp()
    base.params.start = 0.4
    base.params.end = 1.2
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'space', 0.5))
    expect(mapped.params.start).toBe(0.4)
    expect(mapped.params.end).toBe(1.2)
  })

  it('protects with the limiter as soon as space opens', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'space', 0.25))
    expect(mapped.bypass.limiter).toBe(false)
  })

  it('pan binds an input LFO to panorama without un-bypassing gain', () => {
    const base = baseDsp()
    const rest = mapSensoryToDsp(base, defaultSensoryValues())
    expect(rest.fxLfos.input[0]?.target).toBeNull()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'pan', 0.8))
    expect(mapped.fxLfos.input[0]?.target).toBe('pan')
    expect(mapped.fxLfos.input[0]?.depth).toBeGreaterThan(40)
    expect(mapped.fxLfos.input[0]?.rateHz).toBeGreaterThan(0.2)
    expect(mapped.bypass.gain).toBe(base.bypass.gain)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
  })
})
