import { dbToGain } from '../parameters/mapping'
import type { ParamId } from '../parameters/types'
import { sideGainFromWidth } from './dryWet'

export const MS_SIDE_HPF_MIN = 20
export const MS_TILT_HZ = 700
export const MS_TILT_RANGE_DB = 6
export const MS_HAAS_MAX_SEC = 0.035
export const MS_MUTE_DB = -59.5

export const MS_PARAM_IDS: ParamId[] = [
  'msWidth',
  'msBalance',
  'msMidGain',
  'msSideGain',
  'msSideHpf',
  'msMidTilt',
  'msSideTilt',
  'msMidLowFreq',
  'msMidLowGain',
  'msMidPeakFreq',
  'msMidPeakGain',
  'msMidPeakQ',
  'msMidHighFreq',
  'msMidHighGain',
  'msSideLowFreq',
  'msSideLowGain',
  'msSidePeakFreq',
  'msSidePeakGain',
  'msSidePeakQ',
  'msSideHighFreq',
  'msSideHighGain',
  'msRotate',
  'msCrossfeed',
  'msHaasTime',
  'msHaasAmount',
  'msHaasDir',
  'msSoloMid',
  'msSoloSide',
  'msMono',
  'msFlipMid',
  'msFlipSide',
]

/** Complementary mid/side mix. 0 = identity, -100 = mid only, +100 = side only. */
export function msBalanceGains(balance: number): { mid: number; side: number } {
  const t = Math.min(1, Math.max(-1, balance / 100))
  return {
    mid: 1 - Math.max(0, t),
    side: 1 - Math.max(0, -t),
  }
}

export function msWidthGain(widthPct: number): number {
  return sideGainFromWidth(widthPct)
}

export function msLevelGain(db: number): number {
  if (!Number.isFinite(db) || db <= MS_MUTE_DB) return 0
  return dbToGain(db)
}

export function msSideHpfHz(value: number): number | null {
  if (!Number.isFinite(value) || value < MS_SIDE_HPF_MIN) return null
  return Math.min(1000, Math.max(MS_SIDE_HPF_MIN, value))
}

export const MS_EQ_GAIN_RANGE = 18
export const MS_EQ_LOW_HZ = { min: 20, max: 500, fallback: 120 }
export const MS_EQ_PEAK_HZ = { min: 200, max: 8000, fallback: 1200 }
export const MS_EQ_HIGH_HZ = { min: 2000, max: 16000, fallback: 8000 }
export const MS_EQ_Q = { min: 0.3, max: 8, fallback: 1 }

export function msEqGainDb(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MS_EQ_GAIN_RANGE, Math.max(-MS_EQ_GAIN_RANGE, value))
}

export function msEqHz(
  value: number,
  range: { min: number; max: number; fallback: number },
): number {
  if (!Number.isFinite(value)) return range.fallback
  return Math.min(range.max, Math.max(range.min, value))
}

export function msEqQ(value: number): number {
  if (!Number.isFinite(value)) return MS_EQ_Q.fallback
  return Math.min(MS_EQ_Q.max, Math.max(MS_EQ_Q.min, value))
}

/** Left = darker (more low / less high). Right = brighter. */
export function msTiltGains(tiltPct: number): { lowDb: number; highDb: number } {
  const t = Math.min(1, Math.max(-1, tiltPct / 100))
  return {
    lowDb: -t * MS_TILT_RANGE_DB,
    highDb: t * MS_TILT_RANGE_DB,
  }
}

/** Rotate the L/R field. ±100 = ±90°. Not equal-power pan. */
export function msRotateMatrix(rotatePct: number): { ll: number; lr: number; rl: number; rr: number } {
  const theta = (Math.min(1, Math.max(-1, rotatePct / 100)) * Math.PI) / 2
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return { ll: c, lr: -s, rl: s, rr: c }
}

/** 100% crossfeed folds to equal L/R mix. */
export function msCrossfeedMix(amountPct: number): { keep: number; cross: number } {
  const t = Math.min(1, Math.max(0, amountPct / 100)) * 0.5
  return { keep: 1 - t, cross: t }
}

export function msHaasDelaySec(timeMs: number): number {
  return Math.min(MS_HAAS_MAX_SEC, Math.max(0, timeMs / 1000))
}

export function msHaasMix(amountPct: number): { dry: number; wet: number } {
  const t = Math.min(1, Math.max(0, amountPct / 100))
  return { dry: 1 - t, wet: t }
}

export function msHaasDelayLeft(dir: number): boolean {
  return dir < 0.5
}

export function msPolarity(flag: number): number {
  return flag > 0.5 ? -1 : 1
}

export function msSoloGains(soloMid: number, soloSide: number): { mid: number; side: number } {
  const m = soloMid > 0.5
  const s = soloSide > 0.5
  if (m && !s) return { mid: 1, side: 0 }
  if (s && !m) return { mid: 0, side: 1 }
  return { mid: 1, side: 1 }
}

export function stereoCorrelation(left: ArrayLike<number>, right: ArrayLike<number>): number {
  const n = Math.min(left.length, right.length)
  if (n === 0) return 1
  let ll = 0
  let rr = 0
  let lr = 0
  for (let i = 0; i < n; i++) {
    const a = left[i] ?? 0
    const b = right[i] ?? 0
    ll += a * a
    rr += b * b
    lr += a * b
  }
  const den = Math.sqrt(ll * rr)
  if (den < 1e-12) return 1
  return Math.min(1, Math.max(-1, lr / den))
}

export function byteToAudio(sample: number): number {
  return (sample - 128) / 128
}
