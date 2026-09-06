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
  bypassed?: boolean
}

export function bandIsActive(band: EqBand): boolean {
  return band.type !== 'off' && !band.bypassed
}

/** True when this EQ instance is actually changing the signal. */
export function eqModuleIsAudible(
  bypassed: boolean,
  bands: EqBand[],
  combEnabled = false,
): boolean {
  return !bypassed && (combEnabled || bands.some(bandIsActive))
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

export const EQ_MAX_BANDS = 8
export const EQ_DEFAULT_BAND_COUNT = 4
/** Alias used by the biquad pool: always allocate the maximum. */
export const EQ_BAND_COUNT = EQ_MAX_BANDS
export const EQ_MAX_STAGES = 4
export const COMB_MAX_TEETH = 16
export const EQ_MIN_HZ = 10
export const EQ_MAX_HZ = 25000
export const EQ_NODE_COUNT = EQ_MAX_BANDS * EQ_MAX_STAGES + COMB_MAX_TEETH

const EQ_BAND_DEFAULT_HZ = [80, 400, 2500, 12000, 160, 800, 5000, 16000] as const

export function formatEqHz(hz: number): string {
  const n = Number.isFinite(hz) ? hz : EQ_MIN_HZ
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kHz` : `${Math.round(n)} Hz`
}

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

export function defaultEqBandAt(index: number): EqBand {
  const i = Math.max(0, Math.min(EQ_MAX_BANDS - 1, Math.round(index)))
  const q = i === 0 || i === 3 ? 0.7 : 1
  return {
    type: 'off',
    frequency: EQ_BAND_DEFAULT_HZ[i] ?? 1000,
    gain: 0,
    q,
    slope: 12,
    bypassed: false,
  }
}

export function defaultEqBands(): EqBand[] {
  return Array.from({ length: EQ_DEFAULT_BAND_COUNT }, (_, i) => defaultEqBandAt(i))
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
  if (!bandIsActive(band)) return 0
  if (bandUsesSlope(band.type)) return Math.min(EQ_MAX_STAGES, band.slope / 12)
  return 1
}

/** First stage uses the band Q (resonance); extra LP/HP stages stay Butterworth. */
export function stageQ(band: EqBand, stageIndex: number): number {
  if (stageIndex === 0) return band.q
  return 1 / Math.SQRT2
}

export function parseEqBands(raw: unknown): EqBand[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > EQ_MAX_BANDS) return null
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
      bypassed: Boolean(rec.bypassed),
    })
  }
  return bands
}
