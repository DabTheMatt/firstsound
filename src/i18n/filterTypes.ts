import type { EqFilterType } from '../audio/engine/eqBands'
import type { Locale } from './locale'

export type FilterTypeCopy = {
  label: string
  short: string
  aria: string
}

const EN: Record<EqFilterType, FilterTypeCopy> = {
  off: { label: 'Off', short: 'Off', aria: 'Filter off' },
  lowpass: { label: 'Low Pass', short: 'LP', aria: 'Low-pass filter' },
  highpass: { label: 'High Pass', short: 'HP', aria: 'High-pass filter' },
  lowshelf: { label: 'Low Shelf', short: 'LS', aria: 'Low shelf filter' },
  highshelf: { label: 'High Shelf', short: 'HS', aria: 'High shelf filter' },
  peaking: { label: 'Bell', short: 'Bell', aria: 'Bell filter' },
  notch: { label: 'Notch', short: 'Notch', aria: 'Notch filter' },
  bandpass: { label: 'Band Pass', short: 'BP', aria: 'Band-pass filter' },
}

const PL: Record<EqFilterType, FilterTypeCopy> = {
  off: { label: 'Wyłączony', short: 'Wył.', aria: 'Filtr wyłączony' },
  lowpass: { label: 'Dolnoprzepustowy', short: 'LP', aria: 'Filtr dolnoprzepustowy' },
  highpass: { label: 'Górnoprzepustowy', short: 'HP', aria: 'Filtr górnoprzepustowy' },
  lowshelf: { label: 'Półka dolna', short: 'LS', aria: 'Filtr półkowy dolny' },
  highshelf: { label: 'Półka górna', short: 'HS', aria: 'Filtr półkowy górny' },
  peaking: { label: 'Dzwonowy', short: 'Bell', aria: 'Filtr dzwonowy' },
  notch: { label: 'Pasmowo-zaporowy', short: 'Notch', aria: 'Filtr pasmowo-zaporowy' },
  bandpass: { label: 'Pasmowoprzepustowy', short: 'BP', aria: 'Filtr pasmowoprzepustowy' },
}

export function filterTypeCopy(locale: Locale, type: EqFilterType): FilterTypeCopy {
  return (locale === 'pl' ? PL : EN)[type]
}

export type EqKnobCopy = {
  freq: string
  freqFull: string
  gain: string
  gainFull: string
  slope: string
  slopeFull: string
  width: string
  widthFull: string
  q: string
  qFull: string
}

const EQ_EN: EqKnobCopy = {
  freq: 'Freq',
  freqFull: 'Frequency',
  gain: 'Gain',
  gainFull: 'Gain',
  slope: 'Slope',
  slopeFull: 'Slope',
  width: 'Width',
  widthFull: 'Bandwidth',
  q: 'Q',
  qFull: 'Q',
}

const EQ_PL: EqKnobCopy = {
  freq: 'Częst.',
  freqFull: 'Częstotliwość',
  gain: 'Wzm.',
  gainFull: 'Wzmocnienie',
  slope: 'Nach.',
  slopeFull: 'Nachylenie',
  width: 'Szer.',
  widthFull: 'Szerokość pasma',
  q: 'Q',
  qFull: 'Dobroć Q',
}

export function eqKnobCopy(locale: Locale): EqKnobCopy {
  return locale === 'pl' ? EQ_PL : EQ_EN
}
