import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../../audio/parameters/definitions'
import { defaultEqBands } from '../../audio/engine/eqBands'
import { defaultChain } from '../../audio/chain/chain'
import { defaultSensoryValues, patchSensoryValue } from '../sensoryState'
import { mapSensoryToDsp, snapshotFromEngine } from './mappingEngine'

function baseDsp() {
  return snapshotFromEngine({
    params: defaultParamValues(),
    eqBands: defaultEqBands(),
    chain: defaultChain(),
  })
}

describe('mapSensoryToDsp', () => {
  it('is identity at rest', () => {
    const base = baseDsp()
    const mapped = mapSensoryToDsp(base, defaultSensoryValues())
    expect(mapped.params.eq4Gain).toBeCloseTo(base.params.eq4Gain)
    expect(mapped.params.reverbWet).toBeCloseTo(base.params.reverbWet)
    expect(mapped.params.saturation).toBeCloseTo(base.params.saturation)
    expect(mapped.eqBands[3]?.gain).toBeCloseTo(0)
  })

  it('uses mostly EQ at modest brightness', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'brightness', 0.2))
    expect(mapped.eqBands[3]?.type).toBe('highshelf')
    expect(mapped.eqBands[3]?.gain).toBeGreaterThan(1.5)
    expect(mapped.eqBands[3]?.gain).toBeLessThan(6)
    expect(mapped.params.saturation).toBeCloseTo(0)
    expect(mapped.bypass.eq).toBe(false)
    expect(mapped.params.eq4Gain).toBeGreaterThan(1.5)
  })

  it('opens shimmer and saturation at high brightness', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'brightness', 0.75))
    expect(mapped.eqBands[3]?.gain).toBeGreaterThan(6)
    expect(mapped.params.saturation).toBeGreaterThan(2)
    expect(mapped.params.reverbShimmer).toBeGreaterThan(20)
    expect(mapped.bypass.reverb).toBe(false)
    expect(mapped.bypass.saturation).toBe(false)
  })

  it('cuts highs and lifts lows when darker', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'brightness', -0.7))
    expect(mapped.eqBands[3]?.gain).toBeLessThan(-5)
    expect(mapped.eqBands[0]?.gain).toBeGreaterThan(4)
  })

  it('opens space and width when moving further', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'distance', 0.6))
    expect(mapped.params.reverbWet).toBeGreaterThan(40)
    expect(mapped.params.reverbSize).toBeGreaterThan(50)
    expect(mapped.params.reverbWidth).toBeGreaterThan(130)
    expect(mapped.bypass.reverb).toBe(false)
  })

  it('narrows the image when closer', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'distance', -0.7))
    expect(mapped.params.reverbWidth).toBeLessThan(70)
    expect(mapped.params.delayWidth).toBeLessThan(70)
  })

  it('engages grain layers and modulation on pulse', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'wildness', 0.65))
    expect(mapped.params.motionDepth).toBeGreaterThan(30)
    expect(mapped.params.density).toBeGreaterThan(25)
    expect(mapped.params.scatter).toBeGreaterThan(55)
    expect(mapped.bypass.grain).toBe(false)
  })

  it('treats bright+wild as more than bright alone', () => {
    const bright = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'brightness', 0.7))
    const both = mapSensoryToDsp(
      baseDsp(),
      patchSensoryValue(patchSensoryValue(defaultSensoryValues(), 'brightness', 0.7), 'wildness', 0.7),
    )
    expect(both.params.reverbShimmer).toBeGreaterThan(bright.params.reverbShimmer)
    expect(both.params.reverbModDepth).toBeGreaterThan(bright.params.reverbModDepth)
  })

  it('does not rewrite start and end', () => {
    const base = baseDsp()
    base.params.start = 0.4
    base.params.end = 1.2
    const mapped = mapSensoryToDsp(base, patchSensoryValue(defaultSensoryValues(), 'warmth', 0.5))
    expect(mapped.params.start).toBe(0.4)
    expect(mapped.params.end).toBe(1.2)
  })

  it('opens delay echoes when turning toward echo', () => {
    const mapped = mapSensoryToDsp(baseDsp(), patchSensoryValue(defaultSensoryValues(), 'echo', 0.7))
    expect(mapped.params.delayWet).toBeGreaterThan(40)
    expect(mapped.params.delayFeedback).toBeGreaterThan(40)
    expect(mapped.bypass.delay).toBe(false)
  })
})
