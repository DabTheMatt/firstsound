import type { EqBand, EqFilterType } from './eqBands'
import { bandUsesGain } from './eqBands'
import { formatFreqTick } from './pitchScale'

/**
 * Curves the EQ graph is allowed to paint.
 *
 * `perBand` is the old phone-EQ drawing of each filter's own magnitude in
 * that band's color. It is never part of the default graph: color belongs
 * on the nodes. `storedGhost` is the dashed pre-LFO response. `filter` is
 * the separate filter-module overlay.
 */
export type EqGraphLayer = 'spectrum' | 'combined' | 'perBand' | 'storedGhost' | 'filter'

export function eqGraphLayers(clean: boolean): readonly EqGraphLayer[] {
  if (clean) return ['spectrum', 'combined']
  return ['spectrum', 'combined', 'storedGhost', 'filter']
}

export function formatEqFocusGain(db: number): string {
  if (!Number.isFinite(db)) return '—'
  const rounded = Math.round(db * 10) / 10
  const body = rounded.toFixed(1)
  return `${rounded > 0 ? '+' : ''}${body} dB`
}

export function formatEqFocusQ(q: number): string {
  if (!Number.isFinite(q)) return '—'
  return `Q ${q.toFixed(2)}`
}

export type EqFocusReadout = {
  title: string
  frequency: string
  detail: string
}

export function eqFocusReadout(
  index: number,
  band: Pick<EqBand, 'type' | 'frequency' | 'gain' | 'q'> | null,
  typeLabel: (type: EqFilterType) => string,
): EqFocusReadout | null {
  if (!band || band.type === 'off') return null
  return {
    title: `${typeLabel(band.type)} ${index + 1}`,
    frequency: formatFreqTick(band.frequency),
    detail: bandUsesGain(band.type) ? formatEqFocusGain(band.gain) : formatEqFocusQ(band.q),
  }
}
