/** Deterministic 32-bit generator. Tests pass a seed; the product uses Math.random. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomUnit(rand: () => number = Math.random): number {
  const value = rand()
  if (!Number.isFinite(value)) return 0
  if (value <= 0) return 0
  if (value >= 1) return 0.999999999999
  return value
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[] | undefined, rand: () => number): T {
  const count = items.length
  const fallback = items[0] as T
  if (count === 0) return fallback
  if (!weights || weights.length !== count) return items[Math.floor(randomUnit(rand) * count)] ?? fallback
  let sum = 0
  for (const weight of weights) sum += Math.max(0, weight)
  if (!(sum > 0)) return items[Math.floor(randomUnit(rand) * count)] ?? fallback
  let cursor = randomUnit(rand) * sum
  for (let i = 0; i < count; i++) {
    cursor -= Math.max(0, weights[i] ?? 0)
    if (cursor <= 0) return items[i] ?? fallback
  }
  return items[count - 1] ?? fallback
}

/** Prefer a value other than `current` when the list has more than one choice. */
export function pickDifferent<T>(items: readonly T[], current: T, weights: readonly number[] | undefined, rand: () => number): T {
  if (items.length <= 1) return items[0] as T
  const pool: T[] = []
  const poolWeights: number[] = []
  items.forEach((item, index) => {
    if (item === current) return
    pool.push(item)
    poolWeights.push(weights?.[index] ?? 1)
  })
  if (pool.length === 0) return pickWeighted(items, weights, rand)
  return pickWeighted(pool, weights && weights.length === items.length ? poolWeights : undefined, rand)
}
