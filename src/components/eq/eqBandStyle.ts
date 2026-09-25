import { eqBandColorForHz } from '../../audio/engine/spectrumRegions'
import { colorWithAlpha } from '../../theme/cssColor'

export function eqBandAccentVars(frequencyHz: number): Record<string, string> {
  return eqAccentFromColor(eqBandColorForHz(frequencyHz))
}

export function eqAccentFromColor(color: string): Record<string, string> {
  return {
    '--eq-band': color,
    '--eq-instance': color,
    '--accent-primary': color,
    '--accent-soft': colorWithAlpha(color, 0.22),
  }
}

/** Compact strip title: one EQ uses the band number; several EQs name processor and band. */
export function eqStripHeading(eqCount: number, eqNumber: number, bandNumber: number): string {
  const band = Math.max(1, Math.round(bandNumber))
  if (eqCount <= 1) return `EQ ${band}`
  const eq = Math.max(1, Math.round(eqNumber))
  return `EQ ${eq} · BAND ${band}`
}

/** When frequency coloring is on, the mixer strip matches the FFT node color. */
export function eqStripAccentVars(opts: {
  frequencyHz: number
  instanceCurve: string
  freqColors: boolean
}): Record<string, string> {
  if (opts.freqColors) return eqBandAccentVars(opts.frequencyHz)
  return eqAccentFromColor(opts.instanceCurve)
}
