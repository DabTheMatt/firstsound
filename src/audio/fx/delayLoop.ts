import type { DelayType } from './types'

/** Max regenerative gain. Always < 1 so each repeat is quieter than the last. */
export const DELAY_FB_CEILING = 0.92

export type DelayFeedbackGains = {
  /** Processed L → delay L (self). */
  fbL: number
  /** Processed R → delay R (self). */
  fbR: number
  /** Processed R → delay L (ping-pong). */
  pingToL: number
  /** Processed L → delay R (ping-pong). */
  pingToR: number
  /** Share of the loop that goes through the pitch shifter (energy-conserving). */
  pitchMix: number
}

/**
 * Linear feedback with a hard ceiling under unity.
 * 35% ≈ a handful of decaying slaps; 90% is a long tail that still fades.
 */
export function delayLoopGain(feedbackPct: number): number {
  return Math.min(DELAY_FB_CEILING, Math.max(0, feedbackPct / 100))
}

function pitchLoopMix(type: DelayType, delayPitch: number): number {
  if (type === 'pitch') return Math.min(0.85, Math.max(0.2, Math.abs(delayPitch) / 48))
  if (Math.abs(delayPitch) < 0.05) return 0
  return Math.min(0.7, Math.abs(delayPitch) / 48)
}

/**
 * Independent L/R loops, or true cross-feedback ping-pong.
 * Self and cross are never both open, so loop energy is `gain`, not `2 × gain`.
 */
export function delayFeedbackGains(
  feedbackPct: number,
  type: DelayType,
  freeze: boolean,
  delayPitch = 0,
): DelayFeedbackGains {
  const g = freeze ? Math.min(0.96, DELAY_FB_CEILING + 0.04) : delayLoopGain(feedbackPct)
  const pitchMix = freeze ? 0 : pitchLoopMix(type, delayPitch)
  const regen = g * (1 - pitchMix)
  if (type === 'pingPong') {
    return { fbL: 0, fbR: 0, pingToL: regen, pingToR: regen, pitchMix: pitchMix * g }
  }
  return { fbL: regen, fbR: regen, pingToL: 0, pingToR: 0, pitchMix: pitchMix * g }
}

export function delayLoopFilters(
  delayHp: number,
  delayLp: number,
  delayFeedback: number,
  type: DelayType,
): { hp: number; lp: number } {
  const analog = type === 'analog' || type === 'tape' || type === 'lofi'
  const hp = analog ? Math.max(delayHp, type === 'lofi' ? 180 : 80) : delayHp
  let lp = analog
    ? Math.min(delayLp, type === 'tape' ? 6500 : type === 'lofi' ? 3400 : 4800)
    : delayLp
  if (type === 'digital' || type === 'pingPong' || type === 'stereo') {
    lp = Math.min(lp, 14000)
  }
  // Higher feedback → darker loop so stacked repeats recede instead of hissing up.
  const damp = 16000 - (Math.min(100, Math.max(0, delayFeedback)) / 100) * 8000
  lp = Math.min(lp, damp)
  return { hp, lp: Math.max(200, lp) }
}

/** Extra multi-tap / diffuse taps are taken from the input, not the delay output. */
export function delayInputTapGains(type: DelayType): { tapA: number; tapB: number } {
  if (type === 'multiTap') return { tapA: 0.28, tapB: 0.16 }
  if (type === 'diffuse') return { tapA: 0.18, tapB: 0.12 }
  return { tapA: 0, tapB: 0 }
}

/** Delay-time modulation in seconds — small enough to color, not to smear the grid. */
export function delayModSeconds(timeSec: number, depth01: number): number {
  return Math.min(0.007, Math.max(0, timeSec) * 0.025) * Math.min(1, Math.max(0, depth01))
}

export function delayWowSeconds(timeSec: number, wow01: number, type: DelayType): number {
  const bias = type === 'tape' ? 0.05 : 0
  return Math.max(0, timeSec) * 0.012 * Math.min(1, Math.max(0, wow01 + bias))
}

export function delayFlutterSeconds(timeSec: number, flutter01: number, type: DelayType): number {
  const bias = type === 'tape' ? 0.04 : 0
  return Math.max(0, timeSec) * 0.004 * Math.min(1, Math.max(0, flutter01 + bias))
}

export function successiveRepeatGains(feedbackPct: number, count: number): number[] {
  const g = delayLoopGain(feedbackPct)
  const out: number[] = []
  let level = 1
  for (let i = 0; i < count; i++) {
    level *= g
    out.push(level)
  }
  return out
}
