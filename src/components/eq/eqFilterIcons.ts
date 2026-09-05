import type { EqFilterType } from '../../audio/engine/eqBands'

/** Mini EQ-response glyphs used on strips and the type menu. */
export const FILTER_ICON_PATH: Record<EqFilterType, string> = {
  off: 'M3 8h18',
  // Smooth rolloff — flat, then a rounded knee, no bump.
  lowpass: 'M2 4.8 H11 C16.5 4.8 18.8 12.2 22 12.2',
  highpass: 'M2 12.2 C5.2 12.2 7.5 4.8 13 4.8 H22',
  // Shelves with a rounded slope, mirrored.
  lowshelf: 'M2 4.2 H9 C13.5 4.2 14.5 12.2 19 12.2 H22',
  highshelf: 'M2 12.2 H5 C9.5 12.2 10.5 4.2 15 4.2 H22',
  peaking: 'M1 12.5 H6 C8 12.5 9.2 3.5 12 3.5 S16 12.5 18 12.5 H23',
  notch: 'M2 6 H8 L12 13 L16 6 H22',
  bandpass: 'M3 13 C6 13 8 4 12 4 S18 13 21 13',
}
