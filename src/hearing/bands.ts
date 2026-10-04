/**
 * Hearing Access frequency regions.
 * Meaning is carried by id, label, vertical position, and hatch — not by hue.
 * Edges are half-open [lo, hi) except AIR, which includes its top.
 */

export const HEARING_BANDS = [
  { id: 'sub', label: 'SUB', lo: 20, hi: 60, hatch: 'solid' },
  { id: 'bass', label: 'BASS', lo: 60, hi: 250, hatch: 'horizontal' },
  { id: 'lowMid', label: 'LOW MID', lo: 250, hi: 500, hatch: 'vertical' },
  { id: 'mid', label: 'MID', lo: 500, hi: 2000, hatch: 'dots' },
  { id: 'highMid', label: 'HIGH MID', lo: 2000, hi: 6000, hatch: 'diagonal' },
  { id: 'high', label: 'HIGH', lo: 6000, hi: 12000, hatch: 'cross' },
  { id: 'air', label: 'AIR', lo: 12000, hi: 20000, hatch: 'sparse' },
] as const

export type HearingBandId = (typeof HEARING_BANDS)[number]['id']

export type HearingBand = (typeof HEARING_BANDS)[number]

export function bandById(id: HearingBandId): HearingBand {
  const found = HEARING_BANDS.find((band) => band.id === id)
  return found ?? HEARING_BANDS[0]
}

/** Region that contains `hz`. Frequencies outside 20 Hz–20 kHz return null. */
export function bandForHz(hz: number): HearingBand | null {
  if (!(hz >= 20) || hz > 20000) return null
  for (const band of HEARING_BANDS) {
    const last = band.id === 'air'
    if (hz >= band.lo && (last ? hz <= band.hi : hz < band.hi)) return band
  }
  return null
}

export function bandIndex(id: HearingBandId): number {
  return HEARING_BANDS.findIndex((band) => band.id === id)
}
