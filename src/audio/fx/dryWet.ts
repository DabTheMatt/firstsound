/** Equal-power dry/wet so Mix 50% stays near unity loudness. */
export function equalPowerDryWet(mix01: number): { dry: number; wet: number } {
  const t = Math.min(1, Math.max(0, mix01))
  const a = t * (Math.PI / 2)
  return { dry: Math.cos(a), wet: Math.sin(a) }
}

/** Soft-clip feedback so values above 100% can run away without exploding. */
export function safeFeedbackGain(feedbackPct: number): number {
  const raw = feedbackPct / 100
  if (raw <= 1) return Math.max(0, raw)
  const extra = raw - 1
  return 1 + extra / (1 + extra * 2.4)
}
