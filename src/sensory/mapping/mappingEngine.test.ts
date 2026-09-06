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
    expect(mapped.fxLfos.input[0]?.depth).toBeGreaterThan(70)
    expect(mapped.fxLfos.input[0]?.rateHz).toBeGreaterThan(1.4)
    expect(mapped.bypass.gain).toBe(base.bypass.gain)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
  })

  it('binds effect parameters to their LFO banks', () => {
    const space = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'space', 0.7))
    expect(space.fxLfos.reverb[0]?.target).toBe('reverbWet')
    expect(space.fxLfos.reverb[0]?.depth).toBeGreaterThan(8)
    const echo = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'echo', 0.8))
    expect(echo.fxLfos.delay[0]?.target).toBe('delayFeedback')
    const dirt = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'dirt', 0.9))
    expect(dirt.fxLfos.distortion[0]?.target).toBe('saturation')
    const both = mapSensoryToDsp(
      baseDsp(),
      patchSensoryValue(patchSensoryValue(defaultSensoryValues(), 'echo', 0.8), 'drift', 1),
    )
    expect(both.fxLfos.delay[0]?.target).toBe('delayFeedback')
    expect(both.fxLfos.delay[1]?.target).toBe('delayPan')
    const grainMod = mapSensoryToDsp(
      baseDsp(),
      patchSensoryValue(patchSensoryValue(defaultSensoryValues(), 'grain', 0.7), 'mod', 0.8),
    )
    expect(grainMod.fxLfos.grain[0]?.target).toBe('scatter')
    expect(grainMod.fxLfos.grain[1]?.target).toBe('motionDepth')
  })

  it('veil braids reverb, delay, and a darker EQ', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'veil', 1))
    expect(mapped.bypass.reverb).toBe(false)
    expect(mapped.bypass.delay).toBe(false)
    expect(mapped.bypass.eq).toBe(false)
    expect(mapped.params.reverbWet).toBeGreaterThan(10)
    expect(mapped.params.delayWet).toBeGreaterThan(8)
    expect(mapped.eqBands[3]?.type).toBe('highshelf')
    expect(mapped.eqBands[3]?.gain).toBeLessThan(-2)
    expect(mapped.fxLfos.reverb[1]?.target).toBe('reverbDamping')
  })

  it('halo braids a bright air around reverb, delay, and EQ', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'halo', 1))
    expect(mapped.bypass.reverb).toBe(false)
    expect(mapped.bypass.delay).toBe(false)
    expect(mapped.bypass.eq).toBe(false)
    expect(mapped.params.reverbEarly).toBeGreaterThan(70)
    expect(mapped.params.delayDiffusion).toBeGreaterThan(30)
    expect(mapped.eqBands[3]?.gain).toBeGreaterThan(2)
    expect(mapped.fxLfos.reverb[2]?.target).toBe('reverbEarly')
  })

  it('well scoops the midrange and opens a cavity of reverb and delay', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'well', 1))
    expect(mapped.bypass.eq).toBe(false)
    expect(mapped.bypass.reverb).toBe(false)
    expect(mapped.bypass.delay).toBe(false)
    expect(mapped.eqBands[1]?.gain).toBeLessThan(-3)
    expect(mapped.params.reverbSize).toBeGreaterThan(70)
    expect(mapped.fxLfos.eq2[0]?.target).toBe('eq2Gain')
  })

  it('un-bypasses each morph module so sensory axes stay audible', () => {
    const base = baseDsp()
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'space', 0.6)).bypass.reverb).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'echo', 0.6)).bypass.delay).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'grain', 0.6)).bypass.grain).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'dirt', 0.6)).bypass.distortion).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'tight', 0.6)).bypass.compressor).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'mod', 0.6)).bypass.grain).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'drift', 0.6)).bypass.delay).toBe(false)
    expect(mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'character', 0.6)).bypass.eq).toBe(false)
  })

  it('correlates reverb Dry and Wet in sensory mode', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'space', 1))
    expect(mapped.params.reverbCorrelate).toBe(1)
    expect(mapped.params.reverbDry + mapped.params.reverbWet).toBeCloseTo(100)
    expect(mapped.reverbType).toBe('hall')
  })

  it('opens plate, bloom, and fuzz as dedicated effect models', () => {
    const plate = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'plate', 1))
    expect(plate.reverbType).toBe('plate')
    expect(plate.bypass.reverb).toBe(false)
    expect(plate.params.reverbDry + plate.params.reverbWet).toBeCloseTo(100)
    const bloom = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'bloom', 1))
    expect(bloom.reverbType).toBe('bloom')
    const fuzz = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'fuzz', 1))
    expect(fuzz.distortionType).toBe('fuzz')
    expect(fuzz.bypass.distortion).toBe(false)
    const reverse = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'reverse', 1))
    expect(reverse.reverbType).toBe('reverse')
    expect(reverse.params.reverbReverse).toBeGreaterThan(80)
  })
})
