/** Presentation-only density of logarithmic frequency guides. */
export const FREQ_GRID_DENSITIES = [6, 12, 24] as const
export type FreqGridDensity = (typeof FREQ_GRID_DENSITIES)[number]

export const FREQ_GRID_KEY = 'field.freqGrid'

export function parseFreqGridDensity(raw: string | null | undefined): FreqGridDensity {
  const value = Number(raw)
  if (value === 6 || value === 12 || value === 24) return value
  return 12
}

export function loadFreqGridDensity(): FreqGridDensity {
  try {
    return parseFreqGridDensity(localStorage.getItem(FREQ_GRID_KEY))
  } catch {
    return 12
  }
}

const listeners = new Set<(density: FreqGridDensity) => void>()

export function persistFreqGridDensity(density: FreqGridDensity): void {
  try {
    localStorage.setItem(FREQ_GRID_KEY, String(density))
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener(density)
}

export function subscribeFreqGridDensity(onChange: (density: FreqGridDensity) => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

/** Log-spaced guide frequencies. Count is the density, inclusive of both ends. */
export function frequencyGuideHz(minHz: number, maxHz: number, density: FreqGridDensity): number[] {
  const count = density
  const lo = Math.min(minHz, maxHz)
  const hi = Math.max(minHz, maxHz)
  if (!(lo > 0) || !(hi > lo) || count < 2) return []
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    out.push(lo * (hi / lo) ** t)
  }
  return out
}

/** How often a guide receives a text label. Denser grids label fewer lines. */
export function frequencyGuideLabelEvery(density: FreqGridDensity): number {
  if (density >= 24) return 4
  if (density >= 12) return 2
  return 1
}
