export type EqFilterType =
  | 'off'
  | 'lowpass'
  | 'highpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'
  | 'bandpass'

export type EqBand = {
  type: EqFilterType
  frequency: number
  gain: number
  q: number
}

export const EQ_FILTER_TYPES: { value: EqFilterType; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'lowpass', label: 'Low Pass' },
  { value: 'highpass', label: 'High Pass' },
  { value: 'lowshelf', label: 'Low Shelf' },
  { value: 'highshelf', label: 'High Shelf' },
  { value: 'peaking', label: 'Bell' },
  { value: 'notch', label: 'Notch' },
  { value: 'bandpass', label: 'Band Pass' },
]

export const EQ_BAND_COUNT = 4

export function defaultEqBands(): EqBand[] {
  return [
    { type: 'off', frequency: 80, gain: 0, q: 0.7 },
    { type: 'off', frequency: 400, gain: 0, q: 1 },
    { type: 'off', frequency: 2500, gain: 0, q: 1 },
    { type: 'off', frequency: 12000, gain: 0, q: 0.7 },
  ]
}

export function bandUsesGain(type: EqFilterType): boolean {
  return type === 'peaking' || type === 'lowshelf' || type === 'highshelf'
}

export function parseEqBands(raw: unknown): EqBand[] | null {
  if (!Array.isArray(raw) || raw.length !== EQ_BAND_COUNT) return null
  const bands: EqBand[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Partial<EqBand>
    if (!EQ_FILTER_TYPES.some((t) => t.value === rec.type)) return null
    if (typeof rec.frequency !== 'number' || typeof rec.q !== 'number') return null
    bands.push({
      type: rec.type as EqFilterType,
      frequency: rec.frequency,
      gain: typeof rec.gain === 'number' ? rec.gain : 0,
      q: rec.q,
    })
  }
  return bands
}
