import { EQ_FILTER_TYPES, bandUsesGain, bandUsesSlope, type EqFilterType } from '../../audio/engine/eqBands'

/** Continuous controls the Focus cluster can show. Each one exists on the band. */
export type FocusEqKnob = 'freq' | 'gain' | 'q' | 'slope'

/**
 * Parameters the shared EQ DSP actually applies for this filter.
 * Gain is peaking and shelves. Q is the resonance / bandwidth control, including
 * notch and band-pass. Slope is the cascade order for passes and shelves.
 */
export function focusEqKnobs(type: EqFilterType): readonly FocusEqKnob[] {
  if (type === 'off') return []
  const knobs: FocusEqKnob[] = ['freq']
  if (bandUsesGain(type)) knobs.push('gain')
  knobs.push('q')
  if (bandUsesSlope(type)) knobs.push('slope')
  return knobs
}

/** Filter types the Focus selector can apply. Off is removal, not a type. */
export function focusEqTypeOptions(): readonly EqFilterType[] {
  return EQ_FILTER_TYPES.filter((item) => item.value !== 'off').map((item) => item.value)
}
