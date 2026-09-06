/**
 * Signal-chain model. GAIN is always first, OUTPUT always last; everything
 * between is reorderable. Identity is `instanceId`, not module type — later
 * we can host EQ 1 / EQ 2 without renaming the UI contract.
 */

export type ModuleType =
  | 'gain'
  | 'grain'
  | 'eq'
  | 'distortion'
  | 'filter'
  | 'midside'
  | 'delay'
  | 'reverb'
  | 'compressor'
  | 'limiter'
  | 'output'

export type ChainModule = {
  instanceId: string
  type: ModuleType
  bypassed: boolean
}

export const MODULE_LABELS: Record<ModuleType, string> = {
  gain: 'Input',
  grain: 'Grain',
  eq: 'EQ',
  distortion: 'Distortion',
  filter: 'Filter',
  midside: 'Mid/Side',
  delay: 'Delay',
  reverb: 'Reverb',
  compressor: 'Compressor',
  limiter: 'Limiter',
  output: 'Output',
}

/** Modules that can be inserted between Input and Output. */
export const INSERTABLE_TYPES: ModuleType[] = [
  'grain',
  'eq',
  'filter',
  'midside',
  'distortion',
  'delay',
  'reverb',
  'compressor',
  'limiter',
]

export const MAX_CHAIN_MIDDLE = 12

export function defaultChain(): ChainModule[] {
  return [
    { instanceId: 'gain-1', type: 'gain', bypassed: false },
    { instanceId: 'grain-1', type: 'grain', bypassed: true },
    { instanceId: 'eq-1', type: 'eq', bypassed: true },
    { instanceId: 'filter-1', type: 'filter', bypassed: true },
    { instanceId: 'midside-1', type: 'midside', bypassed: true },
    { instanceId: 'distortion-1', type: 'distortion', bypassed: true },
    { instanceId: 'delay-1', type: 'delay', bypassed: true },
    { instanceId: 'reverb-1', type: 'reverb', bypassed: true },
    { instanceId: 'compressor-1', type: 'compressor', bypassed: true },
    { instanceId: 'limiter-1', type: 'limiter', bypassed: true },
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
  const defaults = defaultChain()
  const gain = chain.find((m) => m.type === 'gain') ?? defaults[0]!
  const output = chain.find((m) => m.type === 'output') ?? defaults.at(-1)!
  const middle = chain.filter((m) => m.type !== 'gain' && m.type !== 'output')
  return [{ ...gain, bypassed: false }, ...middle, { ...output, bypassed: false }]
}

export function nextInstanceId(type: ModuleType, chain: readonly ChainModule[]): string {
  const used = new Set(chain.map((m) => m.instanceId))
  let n = 1
  while (used.has(`${type}-${n}`)) n++
  return `${type}-${n}`
}

export function moduleLabel(mod: ChainModule, chain: readonly ChainModule[]): string {
  const base = MODULE_LABELS[mod.type]
  const same = chain.filter((m) => m.type === mod.type)
  if (same.length <= 1) return base
  const n = same.findIndex((m) => m.instanceId === mod.instanceId) + 1
  return `${base} ${n}`
}

/** 0-based index among EQ modules, used to pick a distinct curve color. */
export function eqColorIndex(chain: readonly ChainModule[], instanceId: string): number {
  return Math.max(
    0,
    chain.filter((m) => m.type === 'eq').findIndex((m) => m.instanceId === instanceId),
  )
}

/** Insert `type` after `afterIndex` (the module to the left of the +). */
export function insertChainModule(
  chain: readonly ChainModule[],
  type: ModuleType,
  afterIndex: number,
): ChainModule[] {
  if (isFixedType(type)) return chain.slice()
  if (!INSERTABLE_TYPES.includes(type)) return chain.slice()
  const middleCount = chain.filter((m) => !isFixedType(m.type)).length
  if (middleCount >= MAX_CHAIN_MIDDLE) return chain.slice()
  const item: ChainModule = {
    instanceId: nextInstanceId(type, chain),
    type,
    bypassed: false,
  }
  const dest = Math.min(Math.max(afterIndex + 1, 1), Math.max(1, chain.length - 1))
  const next = chain.slice()
  next.splice(dest, 0, item)
  return normalizeChain(next)
}

export function removeChainModule(chain: readonly ChainModule[], instanceId: string): ChainModule[] {
  const item = chain.find((m) => m.instanceId === instanceId)
  if (!item || isFixedType(item.type)) return chain.slice()
  return normalizeChain(chain.filter((m) => m.instanceId !== instanceId))
}

export function parseChain(raw: unknown): ChainModule[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null
  const parsed: ChainModule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<ChainModule>
    if (typeof rec.instanceId !== 'string' || !rec.instanceId) return null
    const migrated = migrateModule(rec.type, rec.instanceId)
    if (!migrated) return null
    parsed.push({
      instanceId: migrated.instanceId,
      type: migrated.type,
      bypassed: Boolean(rec.bypassed),
    })
  }
  return normalizeChain(parsed)
}

function migrateModule(
  type: unknown,
  instanceId: string,
): { type: ModuleType; instanceId: string } | null {
  if (type === 'saturation') {
    return {
      type: 'distortion',
      instanceId: instanceId.replace(/^saturation/, 'distortion'),
    }
  }
  if (!isModuleType(type)) return null
  return { type, instanceId }
}

function isModuleType(value: unknown): value is ModuleType {
  return (
    value === 'gain' ||
    value === 'grain' ||
    value === 'eq' ||
    value === 'filter' ||
    value === 'midside' ||
    value === 'distortion' ||
    value === 'delay' ||
    value === 'reverb' ||
    value === 'compressor' ||
    value === 'limiter' ||
    value === 'output'
  )
}
