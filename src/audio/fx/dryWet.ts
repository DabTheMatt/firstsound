/** Equal-power dry/wet so Mix 50% stays near unity loudness. Ends are exact 0/1 so Mix can mute. */
export function equalPowerDryWet(mix01: number): { dry: number; wet: number } {
  const t = Math.min(1, Math.max(0, mix01))
  if (t <= 0.002) return { dry: 1, wet: 0 }
  if (t >= 0.998) return { dry: 0, wet: 1 }
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

/** Mid/side width: 0 = mono, 100 = natural, 200 = extra-wide. */
export function sideGainFromWidth(widthPct: number): number {
  return Math.min(2.2, Math.max(0, widthPct / 100))
}

/** Full-wave rectifier curve for an envelope follower (dry ducking). */
export function makeAbsCurve(n = 1024): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = Math.abs(x)
  }
  return curve
}
