import { describe, expect, it } from 'vitest'
import {
  defaultChain,
  insertChainModule,
  moduleLabel,
  nextInstanceId,
  normalizeChain,
  parseChain,
  removeChainModule,
  reorderChain,
  setBypassed,
  eqColorIndex,
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
    expect(chain.find((m) => m.instanceId === 'delay-1')?.bypassed).toBe(true)
    const on = setBypassed(chain, 'delay-1', false)
    expect(on.find((m) => m.instanceId === 'delay-1')?.bypassed).toBe(false)
    const gain = setBypassed(chain, 'gain-1', true)
    expect(gain[0]?.bypassed).toBe(false)
  })

  it('starts grain and FX bypassed', () => {
    const chain = defaultChain()
    expect(chain.filter((m) => m.type !== 'gain' && m.type !== 'output').every((m) => m.bypassed)).toBe(
      true,
    )
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
  it('injects a limiter before output on older saved chains', () => {
    const next = parseChain([
      { instanceId: 'gain-1', type: 'gain', bypassed: false },
      { instanceId: 'eq-1', type: 'eq', bypassed: true },
      { instanceId: 'output-1', type: 'output', bypassed: false },
    ])
    expect(next?.some((m) => m.type === 'limiter')).toBe(true)
    expect(next?.at(-1)?.type).toBe('output')
    expect(next?.at(-2)?.type).toBe('limiter')
  })
})

describe('insertChainModule', () => {
  it('inserts a second EQ between neighbours', () => {
    const chain = defaultChain()
    const eqIndex = chain.findIndex((m) => m.type === 'eq')
    const next = insertChainModule(chain, 'eq', eqIndex)
    expect(next.filter((m) => m.type === 'eq')).toHaveLength(2)
    expect(next[eqIndex + 1]?.type).toBe('eq')
    expect(next[eqIndex + 1]?.instanceId).toBe('eq-2')
    expect(next[0]?.type).toBe('gain')
    expect(next.at(-1)?.type).toBe('output')
  })

  it('refuses Input/Output and numbers extra labels', () => {
    const chain = insertChainModule(defaultChain(), 'eq', 2)
    expect(insertChainModule(chain, 'gain', 0)).toEqual(chain)
    expect(nextInstanceId('eq', chain)).toBe('eq-3')
    const second = chain.find((m) => m.instanceId === 'eq-2')!
    expect(moduleLabel(second, chain)).toBe('EQ 2')
    expect(moduleLabel(chain[0]!, chain)).toBe('Input')
    expect(eqColorIndex(chain, 'eq-2')).toBe(1)
    expect(eqColorIndex(chain, 'eq-1')).toBe(0)
  })

  it('removes a middle module but keeps endpoints', () => {
    const gone = removeChainModule(defaultChain(), 'eq-1')
    expect(gone.some((m) => m.type === 'eq')).toBe(false)
    expect(gone[0]?.type).toBe('gain')
    expect(removeChainModule(gone, 'gain-1')[0]?.type).toBe('gain')
  })
})
