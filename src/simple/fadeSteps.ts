export const FADE_STEP_IDS = ['none', 'short', 'medium', 'long'] as const

export type FadeStepId = (typeof FADE_STEP_IDS)[number]

export const FADE_STEP_SECONDS: Record<FadeStepId, number> = {
  none: 0,
  short: 0.04,
  medium: 0.12,
  long: 0.28,
}

export function fadeSecondsForStep(step: FadeStepId, regionLength: number): number {
  const raw = FADE_STEP_SECONDS[step]
  if (raw <= 0) return 0
  const cap = Math.max(0, regionLength * 0.4)
  return Math.min(raw, cap)
}

export function fadeStepFromSeconds(seconds: number): FadeStepId {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  if (s < 0.02) return 'none'
  if (s < 0.08) return 'short'
  if (s < 0.2) return 'medium'
  return 'long'
}
