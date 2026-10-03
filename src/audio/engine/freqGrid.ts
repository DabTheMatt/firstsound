import type { FreqScaleKind } from './freqScale'

/** Presentation-only density of frequency guides. */
export const FREQ_GRID_DENSITIES = [6, 12, 24] as const
export type FreqGridDensity = (typeof FREQ_GRID_DENSITIES)[number]

export const FREQ_GRID_KEY = 'field.freqGrid'

/**
 * Standard log-axis frequencies used by EQ and analyzer graphs.
 * Density 12 is the common 1–2–5 decade series. 6 is the sparse subset.
 * 24 adds the usual in-between round marks (30, 40, 150, 300, …).
 */
const LOG_GUIDES: Record<FreqGridDensity, readonly number[]> = {
  6: [20, 100, 1000, 10000, 20000],
  12: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
  /** The usual analyzer marks: tighter at the bottom, an octave-or-so apart above 100 Hz. */
  24: [20, 30, 40, 50, 60, 80, 100, 200, 300, 400, 500, 800, 1000, 2000, 3000, 4000, 6000, 8000, 10000, 20000],
}

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

function niceStep(rough: number): number {
  if (!(rough > 0) || !Number.isFinite(rough)) return 1
  const exp = Math.floor(Math.log10(rough))
  const base = 10 ** exp
  const n = rough / base
  const mant = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return mant * base
}

/** Evenly spaced round Hertz for a linear axis. */
function linearGuides(minHz: number, maxHz: number, density: FreqGridDensity): number[] {
  const span = maxHz - minHz
  const step = niceStep(span / Math.max(1, density - 1))
  const out: number[] = []
  const push = (hz: number) => {
    const rounded = Math.round(hz)
    if (rounded < minHz - 0.5 || rounded > maxHz + 0.5) return
    if (!out.includes(rounded)) out.push(rounded)
  }
  push(minHz)
  const start = Math.ceil(minHz / step) * step
  for (let hz = start; hz <= maxHz + step * 0.001; hz += step) push(hz)
  push(maxHz)
  return out
}

/**
 * Vertical guide frequencies.
 * Log and mel use the same round Hertz marks; mel only changes where they sit.
 * Linear uses a 1–2–5 step across the range so labels stay whole numbers.
 */
export function frequencyGuideHz(
  minHz: number,
  maxHz: number,
  density: FreqGridDensity,
  scale: FreqScaleKind = 'log',
): number[] {
  const lo = Math.min(minHz, maxHz)
  const hi = Math.max(minHz, maxHz)
  if (!(lo > 0) || !(hi > lo)) return []
  if (scale === 'linear') return linearGuides(lo, hi, density)
  return LOG_GUIDES[density].filter((hz) => hz >= lo - 0.5 && hz <= hi + 0.5)
}

/** How often a guide receives a text label. Every guide is labeled. */
export function frequencyGuideLabelEvery(_density: FreqGridDensity): number {
  return 1
}
