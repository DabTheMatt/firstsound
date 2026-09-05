import { eqBandColorForHz } from '../../audio/engine/spectrumRegions'
import { colorWithAlpha } from '../../theme/cssColor'

export function eqBandAccentVars(frequencyHz: number): Record<string, string> {
  const color = eqBandColorForHz(frequencyHz)
  return {
    '--eq-band': color,
    '--accent-primary': color,
    '--accent-soft': colorWithAlpha(color, 0.22),
  }
}
