import type { EqFilterType } from '../../audio/engine/eqBands'

/** Mini EQ-response glyphs used on strips and the type menu. */
export const FILTER_ICON_PATH: Record<EqFilterType, string> = {
  off: 'M3 8h18',
  lowpass: 'M3 5h9c2.5 0 4 8 9 8',
  highpass: 'M3 13c5 0 6.5-8 9-8h9',
  lowshelf: 'M2 5 H10 L14 12 H22',
  highshelf: 'M2 12 H10 L14 5 H22',
  peaking: 'M2 12 C7.5 12 9 4 12 4 C15 4 16.5 12 22 12',
  notch: 'M2 7 H8 L12 13 L16 7 H22',
  bandpass: 'M3 13 C6 13 8 4 12 4 S18 13 21 13',
}
