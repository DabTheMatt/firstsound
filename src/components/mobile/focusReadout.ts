import { EQ_FILTER_TYPES, bandUsesGain, type EqBand, type EqFilterType } from '../../audio/engine/eqBands'

export type FocusGesture = 'idle' | 'xy' | 'q'

export function formatFocusHz(hz: number): string {
  const n = Number.isFinite(hz) ? Math.max(0, hz) : 0
  if (n >= 10000) return `${(n / 1000).toFixed(1)} kHz`
  if (n >= 1000) return `${(n / 1000).toFixed(2)} kHz`
  return `${Math.round(n)} Hz`
}

export function formatFocusDb(db: number): string {
  const n = Number.isFinite(db) ? Math.round(db * 10) / 10 : 0
  if (n > 0) return `+${n.toFixed(1)} dB`
  if (n < 0) return `${n.toFixed(1)} dB`
  return '0.0 dB'
}

export function formatFocusQ(q: number): string {
  const n = Number.isFinite(q) ? q : 0
  return `Q ${n.toFixed(2)}`
}

/** Knob face for Q. The label already says Q, so the value stays numeric. */
export function formatFocusQValue(q: number): string {
  const n = Number.isFinite(q) ? q : 0
  return n.toFixed(2)
}

/** Discrete cascade slope, in the units the filter actually uses. */
export function formatFocusSlope(slope: number): string {
  const n = Number.isFinite(slope) ? Math.round(slope) : 12
  return `${n} dB/oct`
}

export function focusEqTypeLabel(type: EqFilterType): string {
  const found = EQ_FILTER_TYPES.find((item) => item.value === type)
  return (found?.short ?? type).toUpperCase()
}

export type FocusEqField = 'freq' | 'gain' | 'q'

export type FocusEqPart = {
  field: FocusEqField
  text: string
}

/** The same readout, split so each value can carry its own modulation affordance. */
export function focusEqParts(band: EqBand, gesture: FocusGesture = 'idle'): FocusEqPart[] {
  if (gesture === 'q') return [{ field: 'q', text: formatFocusQ(band.q) }]
  const parts: FocusEqPart[] = [{ field: 'freq', text: formatFocusHz(band.frequency) }]
  if (bandUsesGain(band.type)) parts.push({ field: 'gain', text: formatFocusDb(band.gain) })
  parts.push({ field: 'q', text: formatFocusQ(band.q) })
  return parts
}

export function focusEqReadout(
  band: EqBand,
  index: number,
  gesture: FocusGesture = 'idle',
): { title: string; values: string } {
  return {
    title: gesture === 'q' ? '' : `${focusEqTypeLabel(band.type)} ${index + 1}`,
    values: focusEqParts(band, gesture)
      .map((part) => part.text)
      .join('  '),
  }
}
