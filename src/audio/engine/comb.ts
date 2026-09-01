import { COMB_MAX_TEETH, EQ_MAX_HZ, EQ_MIN_HZ, type EqBand } from './eqBands'

export type CombSpacingMode = 'linear' | 'log'

export type CombFilterState = {
  enabled: boolean
  teeth: number
  gain: number
  spacing: number
  spacingMode: CombSpacingMode
  frequency: number
  q: number
}

export const COMB_MIN_TEETH = 2

export function defaultCombFilter(): CombFilterState {
  return {
    enabled: false,
    teeth: 5,
    gain: 6,
    spacing: 200,
    spacingMode: 'linear',
    frequency: 110,
    q: 8,
  }
}

export function parseCombFilter(raw: unknown): CombFilterState | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Partial<CombFilterState>
  if (typeof rec.teeth !== 'number' || typeof rec.gain !== 'number') return null
  if (typeof rec.spacing !== 'number' || typeof rec.frequency !== 'number') return null
  if (rec.spacingMode !== 'linear' && rec.spacingMode !== 'log') return null
  const teeth = Math.min(COMB_MAX_TEETH, Math.max(COMB_MIN_TEETH, Math.round(rec.teeth)))
  return {
    enabled: Boolean(rec.enabled),
    teeth,
    gain: rec.gain,
    spacing: rec.spacing,
    spacingMode: rec.spacingMode,
    frequency: rec.frequency,
    q: typeof rec.q === 'number' ? rec.q : 8,
  }
}

export function defaultSpacingForMode(mode: CombSpacingMode): number {
  return mode === 'log' ? 2 : 200
}

export function clampCombSpacing(mode: CombSpacingMode, spacing: number): number {
  if (mode === 'log') return Math.min(4, Math.max(1.05, spacing))
  return Math.min(4000, Math.max(10, spacing))
}

/** Centre frequencies of comb teeth, clipped to the audible EQ axis. */
export function combToothHz(comb: CombFilterState): number[] {
  const n = Math.min(COMB_MAX_TEETH, Math.max(COMB_MIN_TEETH, Math.round(comb.teeth)))
  const f0 = Math.min(EQ_MAX_HZ, Math.max(EQ_MIN_HZ, comb.frequency))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const f =
      comb.spacingMode === 'log'
        ? f0 * clampCombSpacing('log', comb.spacing) ** i
        : f0 + i * clampCombSpacing('linear', comb.spacing)
    if (f > EQ_MAX_HZ) break
    out.push(f)
  }
  return out
}

export function combAsEqBands(comb: CombFilterState): EqBand[] {
  if (!comb.enabled) return []
  return combToothHz(comb).map((frequency) => ({
    type: 'peaking' as const,
    frequency,
    gain: comb.gain,
    q: Math.min(20, Math.max(0.3, comb.q)),
    slope: 12 as const,
  }))
}
