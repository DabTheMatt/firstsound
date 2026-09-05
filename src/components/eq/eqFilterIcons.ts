import type { EqFilterType } from '../../audio/engine/eqBands'

/** Mini EQ-response glyphs used on strips and the type menu. */
export const FILTER_ICON_PATH: Record<EqFilterType, string> = {
  off: 'M3 8h18',
  lowpass: 'M3 5h9c2.5 0 4 8 9 8',
  highpass: 'M3 13c5 0 6.5-8 9-8h9',
  // Square shelves: high plateau on the left vs right (mirrored).
  lowshelf: 'M1 3.5 H13 V12.5 H23',
  highshelf: 'M1 12.5 H11 V3.5 H23',
  // Bell: floor, rounded peak, floor — not a bare bump like BP.
  peaking: 'M1 12.5 H6 C8 12.5 9.2 3.5 12 3.5 S16 12.5 18 12.5 H23',
  notch: 'M2 6 H8 L12 13 L16 6 H22',
  bandpass: 'M3 13 C6 13 8 4 12 4 S18 13 21 13',
}
