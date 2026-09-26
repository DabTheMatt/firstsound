/**
 * One-line knob captions.
 * Step down tracking, then size, then an established short form.
 * Widths match the shared tokens in styles/a11y.css:
 * normal 9px / 0.045em, tight 9px / 0.01em, compact 8px / 0, snug 7.5px / 0.
 * Budget is the narrow inspector column, not a wider panel.
 */

export type ParamLabelFit = 'normal' | 'tight' | 'compact' | 'snug'

/** Compact inspector track: `minmax(..., 76px)`. */
export const PARAM_LABEL_MIN_PX = 76

const ADVANCE: Record<string, number> = {
  ' ': 0.28,
  '.': 0.28,
  ',': 0.28,
  '/': 0.38,
  '-': 0.38,
  '0': 0.62,
  '1': 0.62,
  '2': 0.62,
  '3': 0.62,
  '4': 0.62,
  '5': 0.62,
  '6': 0.62,
  '7': 0.62,
  '8': 0.62,
  '9': 0.62,
  A: 0.64,
  B: 0.67,
  C: 0.67,
  D: 0.73,
  E: 0.61,
  F: 0.57,
  G: 0.73,
  H: 0.74,
  I: 0.28,
  J: 0.5,
  K: 0.67,
  L: 0.56,
  M: 0.89,
  N: 0.73,
  O: 0.74,
  P: 0.62,
  Q: 0.74,
  R: 0.67,
  S: 0.62,
  T: 0.56,
  U: 0.73,
  V: 0.62,
  W: 0.89,
  X: 0.62,
  Y: 0.62,
  Z: 0.62,
}

/**
 * Established short forms. Empty unless compact type still overflows the slot.
 * Do not invent abbreviations for names that already fit (Resonance stays Resonance).
 */
const SHORT_LABELS: Record<string, string> = {}

export function measureParamLabelPx(label: string, sizePx: number, trackingEm: number): number {
  const chars = [...label.toLocaleUpperCase('en')]
  if (chars.length === 0) return 0
  let em = 0
  for (const ch of chars) {
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '')
    em += ADVANCE[base] ?? ADVANCE[ch] ?? 0.75
  }
  em += trackingEm * Math.max(0, chars.length - 1)
  return em * sizePx
}

const STEPS: { fit: ParamLabelFit; sizePx: number; trackingEm: number }[] = [
  { fit: 'normal', sizePx: 9, trackingEm: 0.045 },
  { fit: 'tight', sizePx: 9, trackingEm: 0.01 },
  { fit: 'compact', sizePx: 8, trackingEm: 0 },
  { fit: 'snug', sizePx: 7.5, trackingEm: 0 },
]

export function presentParamLabel(
  label: string,
  maxPx = PARAM_LABEL_MIN_PX,
): { text: string; fit: ParamLabelFit } {
  const text = label.trim()
  for (const step of STEPS) {
    if (measureParamLabelPx(text, step.sizePx, step.trackingEm) <= maxPx) {
      return { text, fit: step.fit }
    }
  }
  const short = SHORT_LABELS[text.toLocaleUpperCase('en')]
  if (short && measureParamLabelPx(short, 7.5, 0) <= maxPx) {
    return { text: short, fit: 'snug' }
  }
  return { text, fit: 'snug' }
}
