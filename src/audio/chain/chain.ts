/**
 * Signal-chain model. GAIN is always first, OUTPUT always last; everything
 * between is reorderable. Identity is `instanceId`, not module type — later
 * we can host EQ 1 / EQ 2 without renaming the UI contract.
 */

export type ModuleType =
  | 'gain'
  | 'grain'
  | 'eq'
  | 'saturation'
  | 'delay'
  | 'reverb'
  | 'output'

export type ChainModule = {
  instanceId: string
  type: ModuleType
  bypassed: boolean
}

export const MODULE_LABELS: Record<ModuleType, string> = {
  gain: 'Gain',
  grain: 'Grain',
  eq: 'EQ',
  saturation: 'Saturation',
  delay: 'Delay',
  reverb: 'Reverb',
  output: 'Output',
}

export function defaultChain(): ChainModule[] {
  return [
    { instanceId: 'gain-1', type: 'gain', bypassed: false },
    { instanceId: 'grain-1', type: 'grain', bypassed: false },
    { instanceId: 'eq-1', type: 'eq', bypassed: false },
    { instanceId: 'saturation-1', type: 'saturation', bypassed: false },
    { instanceId: 'delay-1', type: 'delay', bypassed: false },
    { instanceId: 'reverb-1', type: 'reverb', bypassed: false },
    { instanceId: 'output-1', type: 'output', bypassed: false },
  ]
}

export function isFixedType(type: ModuleType): boolean {
  return type === 'gain' || type === 'output'
}

export function movableRange(chain: readonly ChainModule[]): { from: number; to: number } {
  return { from: 1, to: Math.max(1, chain.length - 1) }
}

/**
 * Move the module at `fromIndex` so it lands at `toIndex` (the index in the
 * array *before* the item is removed). Fixed GAIN/OUTPUT slots refuse the move.
 */
export function reorderChain(
  chain: readonly ChainModule[],
  fromIndex: number,
  toIndex: number,
): ChainModule[] {
  if (fromIndex === toIndex) return chain.slice()
  const item = chain[fromIndex]
  if (!item || isFixedType(item.type)) return chain.slice()
  const { from, to } = movableRange(chain)
  if (fromIndex < from || fromIndex >= to) return chain.slice()
  const dest = Math.min(Math.max(toIndex, from), to - 1)
  const next = chain.slice()
  next.splice(fromIndex, 1)
  next.splice(dest, 0, item)
  return normalizeChain(next)
}

export function setBypassed(
  chain: readonly ChainModule[],
  instanceId: string,
  bypassed: boolean,
): ChainModule[] {
  return chain.map((mod) => {
    if (mod.instanceId !== instanceId) return mod
    if (isFixedType(mod.type)) return mod
    return { ...mod, bypassed }
  })
}

/** Drop illegal orders and restore missing fixed endpoints. */
export function normalizeChain(chain: readonly ChainModule[]): ChainModule[] {
  const gain =
    chain.find((m) => m.type === 'gain') ?? defaultChain()[0]!
  const output =
    chain.find((m) => m.type === 'output') ?? defaultChain().at(-1)!
  const middle = chain.filter((m) => m.type !== 'gain' && m.type !== 'output')
  return [{ ...gain, bypassed: false }, ...middle, { ...output, bypassed: false }]
}

export function parseChain(raw: unknown): ChainModule[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null
  const parsed: ChainModule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<ChainModule>
    if (typeof rec.instanceId !== 'string' || !rec.instanceId) return null
    if (!isModuleType(rec.type)) return null
    parsed.push({
      instanceId: rec.instanceId,
      type: rec.type,
      bypassed: Boolean(rec.bypassed),
    })
  }
  return normalizeChain(parsed)
}

function isModuleType(value: unknown): value is ModuleType {
  return (
    value === 'gain' ||
    value === 'grain' ||
    value === 'eq' ||
    value === 'saturation' ||
    value === 'delay' ||
    value === 'reverb' ||
    value === 'output'
  )
}
