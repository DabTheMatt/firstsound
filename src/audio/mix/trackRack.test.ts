import { describe, expect, it } from 'vitest'
import { defaultChain, insertChainModule } from '../chain/chain'
import { defaultEqBands } from '../engine/eqBands'
import {
  createTrackRack,
  effectInstanceId,
  parseTrackRacks,
  resolveTrackParamKey,
  serializeTrackRack,
  trackFxCount,
  trackParamKey,
} from './trackRack'

describe('per-track effect racks', () => {
  it('keys the same parameter separately for each track and effect', () => {
    const chain = insertChainModule(defaultChain(), 'delay', 0)
    const effectId = effectInstanceId(chain, 'delayWet')
    expect(trackParamKey('track-1', effectId, 'delayWet')).toBe(
      `track:track-1:effect:${effectId}:parameter:delayWet`,
    )
    expect(trackParamKey('track-2', effectId, 'delayWet')).not.toBe(trackParamKey('track-1', effectId, 'delayWet'))
  })

  it('includes the EQ band id in the parameter key', () => {
    const chain = insertChainModule(defaultChain(), 'eq', 0)
    const bands = defaultEqBands()
    const key = resolveTrackParamKey('track-3', chain, 'eq1Freq', bands)
    expect(key).toContain('track:track-3:effect:')
    expect(key).toContain(`band:${bands[0]!.id}`)
    expect(key).toContain('parameter:eq1Freq')
  })

  it('counts inserted effects and round-trips a rack', () => {
    const rack = createTrackRack()
    rack.chain = insertChainModule(insertChainModule(rack.chain, 'eq', 0), 'reverb', 1)
    rack.params.reverbWet = 37
    rack.params.eq1Freq = 200
    const raw = { 'track-b': serializeTrackRack(rack) }
    const parsed = parseTrackRacks(raw)
    expect(parsed?.['track-b']?.params.reverbWet).toBe(37)
    expect(parsed?.['track-b']?.params.eq1Freq).toBe(200)
    expect(trackFxCount(parsed?.['track-b']?.chain ?? [])).toBe(2)
    expect(parsed?.['track-b']?.chain.some((mod) => mod.type === 'output')).toBe(true)
  })
})
