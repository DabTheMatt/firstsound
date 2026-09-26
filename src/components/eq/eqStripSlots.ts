import { bandUsesGain, bandUsesWidth, type EqFilterType } from '../../audio/engine/eqBands'

/** Fixed parameter rows on every EQ strip. Fewer controls leave an empty row. */
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
