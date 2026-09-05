import { eqBandPaletteColor } from '../../audio/engine/spectrumRegions'
import { colorWithAlpha } from '../../theme/cssColor'

export function eqBandAccentVars(bandIndex: number): Record<string, string> {
  const color = eqBandPaletteColor(bandIndex)
  return {
    '--eq-band': color,
    '--accent-primary': color,
    '--accent-soft': colorWithAlpha(color, 0.22),
  }
}
