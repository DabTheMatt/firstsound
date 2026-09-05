/** Equal-power dry/wet so Mix 50% stays near unity loudness. Ends are exact 0/1 so Mix can mute. */
export function equalPowerDryWet(mix01: number): { dry: number; wet: number } {
  const t = Math.min(1, Math.max(0, mix01))
  if (t <= 0.002) return { dry: 1, wet: 0 }
  if (t >= 0.998) return { dry: 0, wet: 1 }
  const a = t * (Math.PI / 2)
  return { dry: Math.cos(a), wet: Math.sin(a) }
}

/** Parallel send: Dry and Wet are independent; Output is post-sum gain (100% = unity). */
export function fxSendLevels(
  dryPct: number,
  wetPct: number,
  outPct: number,
): { dry: number; wet: number; out: number } {
  return {
    dry: Math.min(1, Math.max(0, dryPct / 100)),
    wet: Math.min(1, Math.max(0, wetPct / 100)),
    out: Math.min(2, Math.max(0, outPct / 100)),
  }
}

/** Feedback gain for delay repeats. Always < 1 so each echo is quieter than the last. */
export function safeFeedbackGain(feedbackPct: number): number {
  return Math.min(0.95, Math.max(0, feedbackPct / 100))
}

/** Mid/side width: 0 = mono, 100 = natural, 200 = extra-wide. */
export function sideGainFromWidth(widthPct: number): number {
  return Math.min(2.2, Math.max(0, widthPct / 100))
}

/**
 * Send stereo image into an effect.
 * 0% sums L/R (mono glue); 100% keeps independent channels.
 */
export function stereoInputMix(stereoPct: number): { keep: number; cross: number } {
  const t = Math.min(1, Math.max(0, stereoPct / 100))
  return { keep: 0.5 + 0.5 * t, cross: 0.5 - 0.5 * t }
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
