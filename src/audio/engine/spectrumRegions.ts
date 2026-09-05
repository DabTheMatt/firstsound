/** Mixing-oriented FFT band tints. Center frequency picks the region. */

export type SpectrumRegionId =
  | 'sub'
  | 'lowBass'
  | 'midBass'
  | 'highBass'
  | 'lowMid'
  | 'highMid'
  | 'presence'
  | 'air'

export type SpectrumRegion = {
  id: SpectrumRegionId
  label: string
  minHz: number
  maxHz: number
  color: string
}

export const SPECTRUM_REGIONS: SpectrumRegion[] = [
  { id: 'sub', label: 'Sub', minHz: 10, maxHz: 60, color: '#7a5cff' },
  { id: 'lowBass', label: 'Low bass', minHz: 60, maxHz: 120, color: '#3d7dff' },
  { id: 'midBass', label: 'Mid bass', minHz: 120, maxHz: 250, color: '#2eb8d1' },
  { id: 'highBass', label: 'High bass', minHz: 250, maxHz: 500, color: '#3dcc8a' },
  { id: 'lowMid', label: 'Low mids', minHz: 500, maxHz: 2000, color: '#c8d14a' },
  { id: 'highMid', label: 'High mids', minHz: 2000, maxHz: 6000, color: '#e8a23a' },
  { id: 'presence', label: 'Presence', minHz: 6000, maxHz: 12000, color: '#e86b3a' },
  { id: 'air', label: 'Air', minHz: 12000, maxHz: 25000, color: '#e85a7a' },
]

export function regionForHz(hz: number): SpectrumRegion {
  for (const region of SPECTRUM_REGIONS) {
    if (hz >= region.minHz && hz < region.maxHz) return region
  }
  return SPECTRUM_REGIONS[SPECTRUM_REGIONS.length - 1]!
}

export function bandCenterHz(edges: ArrayLike<number>, index: number): number {
  const lo = edges[index] ?? 20
  const hi = edges[index + 1] ?? lo
  return Math.sqrt(lo * hi)
}

/** EQ strip / node color from the stored (base) frequency, using the FFT palette. */
export function eqBandColorForHz(hz: number): string {
  return regionForHz(hz).color
}
