import type { Locale } from './locale'

export type PolishForms = {
  one: string
  few: string
  many: string
}

/**
 * Polish cardinal nouns.
 * 1 znacznik, 2 znaczniki, 5 znaczników, 22 znaczniki, 12 znaczników.
 */
export function polishCardinal(n: number, forms: PolishForms): string {
  const abs = Math.abs(Math.trunc(n))
  if (abs === 1) return forms.one
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few
  return forms.many
}

export function countNoun(
  locale: Locale,
  n: number,
  en: { one: string; other: string },
  pl: PolishForms,
): string {
  const noun = locale === 'pl' ? polishCardinal(n, pl) : Math.abs(Math.trunc(n)) === 1 ? en.one : en.other
  return `${n} ${noun}`
}
