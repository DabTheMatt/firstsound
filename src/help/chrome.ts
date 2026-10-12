import type { Locale } from '../i18n/locale'

export type HelpChrome = {
  explain: string
  close: string
  basic: string
  technical: string
  level: string
  practical: string
  details: string
  manual: string
  shortcut: string
  range: string
  defaultValue: string
  unit: string
  linear: string
  logarithmic: string
  missing: string
  opened: (title: string, summary: string) => string
  levelChanged: (name: string) => string
}

const en: HelpChrome = {
  explain: 'Explain this',
  close: 'Close explanation',
  basic: 'Basic',
  technical: 'Technical',
  level: 'Explanation level',
  practical: 'Practical use',
  details: 'Technical details',
  manual: 'More in the manual',
  shortcut: 'Shortcut',
  range: 'Range',
  defaultValue: 'Default',
  unit: 'Unit',
  linear: 'Even steps across the range.',
  logarithmic: 'Logarithmic scale: equal travel is a ratio, not a fixed step.',
  missing: 'No explanation for this control.',
  opened: (title, summary) => `${title}. ${summary}`,
  levelChanged: (name) => `Explanation level: ${name}.`,
}

const pl: HelpChrome = {
  explain: 'Wyjaśnij',
  close: 'Zamknij wyjaśnienie',
  basic: 'Podstawowy',
  technical: 'Techniczny',
  level: 'Poziom wyjaśnienia',
  practical: 'Zastosowanie',
  details: 'Szczegóły techniczne',
  manual: 'Więcej w podręczniku',
  shortcut: 'Skrót',
  range: 'Zakres',
  defaultValue: 'Wartość domyślna',
  unit: 'Jednostka',
  linear: 'Równe kroki w całym zakresie.',
  logarithmic: 'Skala logarytmiczna: równy ruch to stosunek, nie stały krok.',
  missing: 'Brak wyjaśnienia dla tej kontrolki.',
  opened: (title, summary) => `${title}. ${summary}`,
  levelChanged: (name) => `Poziom wyjaśnienia: ${name}.`,
}

export function helpChrome(locale: Locale): HelpChrome {
  return locale === 'pl' ? pl : en
}
