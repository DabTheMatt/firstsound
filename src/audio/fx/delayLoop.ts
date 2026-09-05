import { delayTypeProfile } from './delayProfiles'
import type { DelayType } from './types'

/** Max regenerative gain. Always < 1 so each repeat is quieter than the last. */
export const DELAY_FB_CEILING = 0.78

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
 * Feedback as used on musical delays: 35% is a handful of fading slaps,
 * 50% is a tail, 95% is long but still decays. Scaled per delay type.
 */
export function delayLoopGain(feedbackPct: number, type: DelayType = 'digital'): number {
  const t = Math.min(1, Math.max(0, feedbackPct / 100))
  return Math.min(DELAY_FB_CEILING, t * delayTypeProfile(type).fbScale)
}

function pitchLoopMix(type: DelayType, delayPitch: number): number {
  if (type === 'pitch') return Math.min(0.7, Math.max(0.18, Math.abs(delayPitch) / 48))
  if (Math.abs(delayPitch) < 0.05) return 0
  return Math.min(0.55, Math.abs(delayPitch) / 48)
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
  feedbackPctR = feedbackPct,
): DelayFeedbackGains {
  const gL = freeze ? Math.min(0.86, DELAY_FB_CEILING + 0.06) : delayLoopGain(feedbackPct, type)
  const gR = freeze ? Math.min(0.86, DELAY_FB_CEILING + 0.06) : delayLoopGain(feedbackPctR, type)
  const pitchMix = freeze ? 0 : pitchLoopMix(type, delayPitch)
  const regenL = gL * (1 - pitchMix)
  const regenR = gR * (1 - pitchMix)
  const pitchAmt = pitchMix * Math.max(gL, gR)
  if (type === 'pingPong') {
    return { fbL: 0, fbR: 0, pingToL: regenR, pingToR: regenL, pitchMix: pitchAmt }
  }
  return { fbL: regenL, fbR: regenR, pingToL: 0, pingToR: 0, pitchMix: pitchAmt }
}

export function delayLoopFilters(
  delayHp: number,
  delayLp: number,
  delayFeedback: number,
  type: DelayType,
): { hp: number; lp: number; q: number } {
  const profile = delayTypeProfile(type)
  const hp = Math.max(delayHp, profile.loopHpMin)
  const fb01 = Math.min(100, Math.max(0, delayFeedback)) / 100
  const damp = profile.loopLpMax * (1 - fb01 * 0.45)
  const lp = Math.min(delayLp, profile.loopLpMax, damp)
  return { hp, lp: Math.max(200, lp), q: profile.filterQ }
}

/** Extra multi-tap / diffuse taps are taken from the input, not the delay output. */
export function delayInputTapGains(type: DelayType): { tapA: number; tapB: number } {
  if (type === 'multiTap') return { tapA: 0.22, tapB: 0.12 }
  if (type === 'diffuse') return { tapA: 0.14, tapB: 0.08 }
  return { tapA: 0, tapB: 0 }
}

/** Delay-time modulation in seconds — small enough to color, not to smear the grid. */
export function delayModSeconds(timeSec: number, depth01: number): number {
  return Math.min(0.005, Math.max(0, timeSec) * 0.018) * Math.min(1, Math.max(0, depth01))
}

export function delayWowSeconds(timeSec: number, wow01: number): number {
  return Math.max(0, timeSec) * 0.01 * Math.min(1, Math.max(0, wow01))
}

export function delayFlutterSeconds(timeSec: number, flutter01: number): number {
  return Math.max(0, timeSec) * 0.003 * Math.min(1, Math.max(0, flutter01))
}

export function successiveRepeatGains(feedbackPct: number, count: number, type: DelayType = 'digital'): number[] {
  const g = delayLoopGain(feedbackPct, type)
  const out: number[] = []
  let level = 1
  for (let i = 0; i < count; i++) {
    level *= g
    out.push(level)
  }
  return out
}

export function loopHopEnergy(feedbackPct: number, type: DelayType, freeze = false, delayPitch = 0): number {
  const g = delayFeedbackGains(feedbackPct, type, freeze, delayPitch)
  return g.fbL + g.pingToR + g.pitchMix
}
