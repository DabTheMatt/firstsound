import { describe, expect, it } from 'vitest'
import {
  defaultChain,
  normalizeChain,
  parseChain,
  reorderChain,
  setBypassed,
} from './chain'

describe('reorderChain', () => {
  it('moves a middle module and keeps gain/output pinned', () => {
    const chain = defaultChain()
    const grain = chain[1]!
    const next = reorderChain(chain, 1, 4)
    expect(next[0]?.type).toBe('gain')
    expect(next.at(-1)?.type).toBe('output')
    expect(next[4]?.instanceId).toBe(grain.instanceId)
  })

  it('refuses to move gain or output', () => {
    const chain = defaultChain()
    expect(reorderChain(chain, 0, 3)[0]?.type).toBe('gain')
    expect(reorderChain(chain, chain.length - 1, 2).at(-1)?.type).toBe('output')
  })

  it('clamps destination into the movable window', () => {
    const chain = defaultChain()
    const eq = chain[2]!
    const next = reorderChain(chain, 2, 0)
    expect(next[0]?.type).toBe('gain')
    expect(next[1]?.instanceId).toBe(eq.instanceId)
  })
})

describe('setBypassed', () => {
  it('toggles an effect and ignores gain/output', () => {
    const chain = defaultChain()
    const delayed = setBypassed(chain, 'delay-1', true)
    expect(delayed.find((m) => m.instanceId === 'delay-1')?.bypassed).toBe(true)
    const gain = setBypassed(chain, 'gain-1', true)
    expect(gain[0]?.bypassed).toBe(false)
  })
})

describe('normalizeChain', () => {
  it('restores missing endpoints', () => {
    const next = normalizeChain([{ instanceId: 'eq-1', type: 'eq', bypassed: true }])
    expect(next[0]?.type).toBe('gain')
    expect(next.at(-1)?.type).toBe('output')
    expect(next.some((m) => m.type === 'eq')).toBe(true)
  })
})

describe('parseChain', () => {
  it('reads a saved chain and rejects junk', () => {
    expect(parseChain(defaultChain())?.map((m) => m.type)).toEqual(
      defaultChain().map((m) => m.type),
    )
    expect(parseChain(null)).toBeNull()
    expect(parseChain([{ instanceId: 'x' }])).toBeNull()
  })
})
