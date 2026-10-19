export type Rng = {
  next(): number
  range(min: number, max: number): number
  /** Inclusive integer range. */
  int(min: number, max: number): number
  chance(probability: number): boolean
  pick<T>(items: readonly T[]): T
}

/** FNV-1a. Stable across reloads and independent of object key order. */
export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function clampSeed(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1_000_000_000, Math.max(0, Math.round(value)))
}

/**
 * Mulberry32. `seed` 0 is remapped so an empty seed still advances.
 * The same seed always yields the same sequence.
 */
export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || 1
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range(min, max) {
      return min + (max - min) * next()
    },
    int(min, max) {
      const span = max - min + 1
      return min + Math.min(span - 1, Math.floor(next() * span))
    },
    chance(probability) {
      return next() < probability
    },
    pick(items) {
      return items[Math.min(items.length - 1, Math.floor(next() * items.length))] ?? items[0]!
    },
  }
}

/** A labeled stream so one layer can change without shifting the others. */
export function forkRng(seed: number, label: string): Rng {
  return createRng(hashString(`${seed >>> 0}:${label}`))
}
