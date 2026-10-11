import type { Locale } from './locale'

export type PrepCopy = {
  nudgeStartEarlier: string
  nudgeStartLater: string
  nudgeEndEarlier: string
  nudgeEndLater: string
  fadeCurve: string
  curveCharacter: string
  slowStart: string
  fastStart: string
  curveDefault: string
  autoSnap: string
  zeroStart: string
  zeroEnd: string
  playSelection: string
  normalizeAudio: string
  moreTools: string
  normalizeTo: string
  removeDc: string
  detectSilence: string
  silenceLead: (lead: string, tail: string) => string
  noZero: string
  zeroFar: (ms: string) => string
  channels: string
  original: string
  leftOnly: string
  rightOnly: string
  swap: string
  invertL: string
  invertR: string
  clipName: string
  saveVariation: string
  variations: string
}

const en: PrepCopy = {
  nudgeStartEarlier: 'Nudge start earlier',
  nudgeStartLater: 'Nudge start later',
  nudgeEndEarlier: 'Nudge end earlier',
  nudgeEndLater: 'Nudge end later',
  fadeCurve: 'Fade curve',
  curveCharacter: 'Curve character',
  slowStart: 'Slow start',
  fastStart: 'Fast start',
  curveDefault: 'Default',
  autoSnap: 'Auto snap',
  zeroStart: 'Zero start',
  zeroEnd: 'Zero end',
  playSelection: 'Play selection',
  normalizeAudio: 'Normalize audio',
  moreTools: 'More tools',
  normalizeTo: 'Normalize to',
  removeDc: 'Remove DC offset',
  detectSilence: 'Detect silence',
  silenceLead: (lead, tail) => `Trim ${lead}s lead / ${tail}s tail`,
  noZero: 'No clean zero crossing nearby',
  zeroFar: (ms) => `Nearest zero is ${ms} ms away — not moved`,
  channels: 'Channels',
  original: 'Original',
  leftOnly: 'Left only',
  rightOnly: 'Right only',
  swap: 'Swap L/R',
  invertL: 'Invert L',
  invertR: 'Invert R',
  clipName: 'Clip name',
  saveVariation: 'Save variation',
  variations: 'Several clips can share one recording.',
}

const pl: PrepCopy = {
  nudgeStartEarlier: 'Przesuń początek wcześniej',
  nudgeStartLater: 'Przesuń początek później',
  nudgeEndEarlier: 'Przesuń koniec wcześniej',
  nudgeEndLater: 'Przesuń koniec później',
  fadeCurve: 'Krzywa zaniku',
  curveCharacter: 'Charakter krzywej',
  slowStart: 'Wolny początek',
  fastStart: 'Szybki początek',
  curveDefault: 'Domyślnie',
  autoSnap: 'Auto przyciąganie',
  zeroStart: 'Zero na początku',
  zeroEnd: 'Zero na końcu',
  playSelection: 'Odsłuch zaznaczenia',
  normalizeAudio: 'Normalizuj audio',
  moreTools: 'Więcej narzędzi',
  normalizeTo: 'Normalizuj do',
  removeDc: 'Usuń składową stałą',
  detectSilence: 'Wykryj ciszę',
  silenceLead: (lead, tail) => `Przytnij ${lead} s z przodu / ${tail} s z tyłu`,
  noZero: 'Brak czystego przejścia przez zero w pobliżu.',
  zeroFar: (ms) => `Najbliższe przejście przez zero jest ${ms} ms dalej. Nic nie przesunięto.`,
  channels: 'Kanały',
  original: 'Oryginał',
  leftOnly: 'Tylko lewy',
  rightOnly: 'Tylko prawy',
  swap: 'Zamień L/P',
  invertL: 'Odwróć L',
  invertR: 'Odwróć P',
  clipName: 'Nazwa klipu',
  saveVariation: 'Zapisz wariant',
  variations: 'Kilka klipów może dzielić jedno nagranie.',
}

export function prepCopy(locale: Locale): PrepCopy {
  return locale === 'pl' ? pl : en
}

/** Map engine notices without changing how a zero crossing is chosen. */
export function prepNotice(locale: Locale, notice: string | null): string | null {
  if (!notice) return null
  const copy = prepCopy(locale)
  if (notice === 'No clean zero crossing nearby') return copy.noZero
  const far = notice.match(/^Nearest zero is (\d+) ms away — not moved$/)
  if (far) return copy.zeroFar(far[1] ?? '')
  return notice
}
