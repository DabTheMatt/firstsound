import { describe, expect, it } from 'vitest'
import { defaultChain, insertChainModule, moduleLabel } from '../chain/chain'
import {
  clampEqOverlayFocus,
  EQ_OVERLAY_ALL,
  eqInstanceUsesSharedLfo,
  eqOverlayIncludes,
  eqOverlayOptions,
} from './eqOverlayFocus'

describe('eq overlay focus', () => {
  it('lists All plus one option per EQ instance', () => {
    const chain = insertChainModule(defaultChain(), 'eq', 9)
    const opts = eqOverlayOptions(chain)
    const eqs = chain.filter((m) => m.type === 'eq')
    expect(opts[0]?.value).toBe(EQ_OVERLAY_ALL)
    expect(opts.map((o) => o.value).slice(1)).toEqual(eqs.map((m) => m.instanceId))
    expect(opts[1]?.label).toBe(moduleLabel(eqs[0]!, chain))
    expect(opts[2]?.label).toBe(moduleLabel(eqs[1]!, chain))
  })

  it('clamps stale instance ids to All', () => {
    const chain = defaultChain()
    expect(clampEqOverlayFocus('eq-9', chain)).toBe(EQ_OVERLAY_ALL)
    expect(clampEqOverlayFocus('eq-1', chain)).toBe('eq-1')
    expect(clampEqOverlayFocus(EQ_OVERLAY_ALL, chain)).toBe(EQ_OVERLAY_ALL)
  })

  it('only the first EQ uses shared LFO params', () => {
    const chain = insertChainModule(defaultChain(), 'eq', 9)
    const eqs = chain.filter((m) => m.type === 'eq')
    expect(eqInstanceUsesSharedLfo(chain, eqs[0]!.instanceId)).toBe(true)
    expect(eqInstanceUsesSharedLfo(chain, eqs[1]!.instanceId)).toBe(false)
    expect(eqOverlayIncludes(EQ_OVERLAY_ALL, eqs[1]!.instanceId)).toBe(true)
    expect(eqOverlayIncludes(eqs[1]!.instanceId, eqs[0]!.instanceId)).toBe(false)
  })
})
