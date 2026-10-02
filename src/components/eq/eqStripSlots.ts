import { bandUsesGain, bandUsesWidth, type EqFilterType } from '../../audio/engine/eqBands'

/** Parameter rows for one filter. Empty rows are omitted by the strip layout. */
export type EqStripSlot = 'freq' | 'gain' | 'slope' | 'width' | 'q' | 'empty'

export const EQ_STRIP_SLOT_COUNT = 3

export function eqStripParamSlots(type: EqFilterType): readonly [EqStripSlot, EqStripSlot, EqStripSlot] {
  const second: EqStripSlot =
    type === 'highpass' || type === 'lowpass'
      ? 'slope'
      : bandUsesGain(type) || type === 'off'
        ? 'gain'
        : 'empty'
  const third: EqStripSlot = bandUsesWidth(type) ? 'width' : 'q'
  return ['freq', second, third]
}

/** Controls that actually render. Empty rows do not take vertical space. */
export function eqStripVisibleSlots(type: EqFilterType): EqStripSlot[] {
  return eqStripParamSlots(type).filter((slot) => slot !== 'empty')
}
