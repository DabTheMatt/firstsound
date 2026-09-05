import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../../audio/parameters/definitions'
import { defaultEqBands } from '../../audio/engine/eqBands'
import { defaultChain } from '../../audio/chain/chain'
import { defaultSensoryValues } from '../sensoryState'
import { mapSensoryToDsp, snapshotFromEngine } from './mappingEngine'
import { driftHaasMs, stackingEnergy } from './stacking'

function baseDsp() {
  return snapshotFromEngine({
    params: defaultParamValues(),
    eqBands: defaultEqBands(),
    chain: defaultChain(),
  })
}

function mix(patch: Record<string, number>) {
  return mapSensoryToDsp(baseDsp(), { ...defaultSensoryValues(), ...patch })
}

describe('driftHaasMs', () => {
  it('stays in a Haas window, not a second echo', () => {
    expect(driftHaasMs(0)).toBeGreaterThanOrEqual(8)
    expect(driftHaasMs(1)).toBeLessThan(40)
  })
})

describe('stackingEnergy', () => {
  it('is zero at rest and grows with wet axes', () => {
    expect(stackingEnergy(defaultSensoryValues())).toBe(0)
    expect(stackingEnergy({ ...defaultSensoryValues(), space: 1, echo: 1 })).toBeGreaterThan(1.5)
  })
})

describe('applySensoryStacking via mapSensoryToDsp', () => {
  it('keeps echo+drift on one delay with a small Haas offset instead of L/R time smash', () => {
    const echoOnly = mix({ echo: 0.85 })
    const both = mix({ echo: 0.85, drift: 1 })
    const delta = Math.abs(both.params.delayTimeR - both.params.delayTime)
    expect(delta).toBeGreaterThan(8)
    expect(delta).toBeLessThan(40)
    expect(both.params.delayTime).toBeCloseTo(echoOnly.params.delayTime, 0)
    expect(both.params.delayWet).toBeGreaterThan(20)
    expect(both.params.delayFeedback).toBeLessThan(echoOnly.params.delayFeedback)
    expect(both.params.delayWidth).toBeGreaterThan(150)
    expect(both.bypass.limiter).toBe(false)
  })

  it('ducks cathedral wet and shimmer when echo is also open', () => {
    const space = mix({ space: 1 })
    const both = mix({ space: 1, echo: 0.9 })
    expect(both.params.reverbWet).toBeLessThan(space.params.reverbWet)
    expect(both.params.reverbShimmer).toBeLessThan(space.params.reverbShimmer * 0.7)
    expect(both.params.delayWet).toBeLessThan(mix({ echo: 0.9 }).params.delayWet)
    expect(both.bypass.limiter).toBe(false)
  })

  it('thins grain density when it piles into space', () => {
    const grain = mix({ grain: 1 })
    const both = mix({ grain: 1, space: 0.9 })
    expect(both.params.density).toBeLessThan(grain.params.density)
    expect(both.params.pitchSpread).toBeLessThan(grain.params.pitchSpread)
  })

  it('does not change a single axis that is below the pile threshold', () => {
    const echo = mix({ echo: 0.3 })
    expect(echo.params.delayTimeR).toBeCloseTo(baseDsp().params.delayTimeR)
  })
})
