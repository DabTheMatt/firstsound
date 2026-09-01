export type EqFilterType =
  | 'off'
  | 'lowpass'
  | 'highpass'
  | 'lowshelf'
  | 'highshelf'
  | 'peaking'
  | 'notch'
  | 'bandpass'

/** dB/octave for cascaded LP/HP biquads. One biquad is 12 dB/oct. */
export type FilterSlope = 12 | 24 | 36 | 48

export type EqBand = {
  type: EqFilterType
  frequency: number
  gain: number
  q: number
  slope: FilterSlope
}

export const EQ_FILTER_TYPES: { value: EqFilterType; label: string; short: string }[] = [
  { value: 'off', label: 'Off', short: 'Off' },
  { value: 'lowpass', label: 'Low Pass', short: 'LP' },
  { value: 'highpass', label: 'High Pass', short: 'HP' },
  { value: 'lowshelf', label: 'Low Shelf', short: 'LS' },
  { value: 'highshelf', label: 'High Shelf', short: 'HS' },
  { value: 'peaking', label: 'Bell', short: 'Bell' },
  { value: 'notch', label: 'Notch', short: 'Notch' },
  { value: 'bandpass', label: 'Band Pass', short: 'BP' },
]

export const FILTER_SLOPES: { value: FilterSlope; label: string }[] = [
  { value: 12, label: '12' },
  { value: 24, label: '24' },
  { value: 36, label: '36' },
  { value: 48, label: '48' },
]

export const EQ_BAND_COUNT = 4
export const EQ_MAX_STAGES = 4
export const COMB_MAX_TEETH = 16
export const EQ_MIN_HZ = 10
export const EQ_MAX_HZ = 25000
export const EQ_NODE_COUNT = EQ_BAND_COUNT * EQ_MAX_STAGES + COMB_MAX_TEETH

export function bandUsesWidth(type: EqFilterType): boolean {
  return type === 'bandpass' || type === 'notch'
}

/** Constant-Q bandwidth in Hz: f / Q. */
export function bandwidthHz(frequency: number, q: number): number {
  return Math.max(1, frequency / Math.max(0.05, q))
}

export function qFromBandwidth(frequency: number, widthHz: number): number {
  return Math.min(20, Math.max(0.1, frequency / Math.max(1, widthHz)))
}

export function defaultEqBands(): EqBand[] {
  return [
    { type: 'off', frequency: 80, gain: 0, q: 0.7, slope: 12 },
    { type: 'off', frequency: 400, gain: 0, q: 1, slope: 12 },
    { type: 'off', frequency: 2500, gain: 0, q: 1, slope: 12 },
    { type: 'off', frequency: 12000, gain: 0, q: 0.7, slope: 12 },
  ]
}

export function bandUsesGain(type: EqFilterType): boolean {
  return type === 'peaking' || type === 'lowshelf' || type === 'highshelf'
}

export function bandUsesSlope(type: EqFilterType): boolean {
  return type === 'lowpass' || type === 'highpass'
}

export function parseFilterSlope(raw: unknown): FilterSlope {
  if (raw === 12 || raw === 24 || raw === 36 || raw === 48) return raw
  return 12
}

export function filterStageCount(band: EqBand): number {
  if (band.type === 'off') return 0
  if (bandUsesSlope(band.type)) return Math.min(EQ_MAX_STAGES, band.slope / 12)
  return 1
}

/** First stage uses the band Q (resonance); extra LP/HP stages stay Butterworth. */
export function stageQ(band: EqBand, stageIndex: number): number {
  if (stageIndex === 0) return band.q
  return 1 / Math.SQRT2
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
      slope: parseFilterSlope(rec.slope),
    })
  }
  return bands
}
