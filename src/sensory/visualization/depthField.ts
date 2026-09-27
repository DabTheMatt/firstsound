/** Forward motion through a perspective field. Pure, so the painter stays cheap. */

export type AudioDepthEnergy = {
  /** 0..1 low-frequency energy. Larger, slower spatial push. */
  bass: number
  /** 0..1 high-frequency energy. Finer strokes. */
  high: number
  /** 0..1 positive level jump. A small forward impulse. */
  transient: number
  /** 0..1 broadband level. Forward-motion intensity. */
  level?: number
}

export const STILL_DEPTH_ENERGY: AudioDepthEnergy = { bass: 0, high: 0, transient: 0, level: 0 }

/** Color-pad bias on the same depth field. Kept gentle. */
export type ColorDepthBias = {
  /** −1 dark / distant, +1 light / forward. */
  light: number
  /** 0 warm / dense, 1 cool / spatial. */
  space: number
}

export const NEUTRAL_DEPTH_BIAS: ColorDepthBias = { light: 0, space: 0 }

export type DepthTraveler = {
  lane: number
  /** 0 = distant, 1 = passing the viewer. */
  phase: number
  /** Same axis as phase: 0 far, 1 near. */
  z: number
  /** Amplitude relative to the main ridge. Far is much smaller. */
  scale: number
  /** Horizontal span as a fraction of the view. Far is narrow; near can pass 1. */
  span: number
  /** Stroke opacity after playback energy. */
  alpha: number
  /** 1 = far (toward the horizon), 0 = beside the main ridge, negative = passing. */
  lift: number
  /** Stroke width in CSS pixels before DPR. */
  weight: number
  /** Extra soft halo, stronger on distant strings. */
  blur: number
  /** 0..1 extra inner contour from high-frequency energy. */
  detail: number
  /** Horizontal lane offset as a fraction of width. Near lanes separate more. */
  parallax: number
  /** Contour spacing. Near layers open up. */
  spread: number
}

export const DEPTH_LANE_COUNT = 6

const LANE_SPEED = [0.46, 0.62, 0.78, 0.96, 1.16, 1.4] as const
const LANE_OFFSET = [0.04, 0.2, 0.37, 0.53, 0.7, 0.86] as const

/** Near-static drift once playback has settled. Not a hard freeze. */
export const MOTION_IDLE = 0.045

const PLAY_TAU_MS = 420
const PAUSE_TAU_MS = 560

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function fract(n: number): number {
  return n - Math.floor(n)
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0
  if (span === 0) return x < edge0 ? 0 : 1
  const t = clamp01((x - edge0) / span)
  return t * t * (3 - 2 * t)
}

export function motionTarget(playing: boolean, reduced: boolean): number {
  if (reduced) return playing ? 0.16 : 0.05
  return playing ? 1 : MOTION_IDLE
}

/** Exponential approach. Pause eases down; resume eases up. No instant jump. */
export function approachMotionGain(current: number, playing: boolean, dtMs: number, reduced: boolean): number {
  const target = motionTarget(playing, reduced)
  const now = Number.isFinite(current) ? current : 0
  const dt = Math.max(0, dtMs)
  const tau = target > now ? PLAY_TAU_MS : PAUSE_TAU_MS
  const k = 1 - Math.exp(-dt / tau)
  return now + (target - now) * k
}

export function approachUnit(current: number, target: number, dtMs: number, tauMs: number): number {
  const dt = Math.max(0, dtMs)
  const tau = Math.max(1, tauMs)
  const k = 1 - Math.exp(-dt / tau)
  return current + (target - current) * k
}

/**
 * Byte-frequency bins (0..255) to bass / high / overall level.
 * Bin 0 is skipped (DC).
 */
export function energyFromFrequency(
  bins: ArrayLike<number>,
  sampleRate: number,
  fftSize: number,
): { bass: number; high: number; level: number } {
  const n = bins.length
  if (n < 2 || !(sampleRate > 0) || !(fftSize > 0)) return { bass: 0, high: 0, level: 0 }
  const binHz = sampleRate / fftSize
  let bassAcc = 0
  let bassN = 0
  let highAcc = 0
  let highN = 0
  let acc = 0
  let count = 0
  for (let i = 1; i < n; i++) {
    const v = clamp01((bins[i] ?? 0) / 255)
    const hz = i * binHz
    acc += v
    count++
    if (hz < 160) {
      bassAcc += v
      bassN++
    } else if (hz >= 5000 && hz <= 14000) {
      highAcc += v
      highN++
    }
  }
  return {
    bass: bassN ? bassAcc / bassN : 0,
    high: highN ? highAcc / highN : 0,
    level: count ? acc / count : 0,
  }
}

/** Positive level jump only, so decays do not kick the field backward. */
export function transientAmount(previousLevel: number, level: number): number {
  const rise = level - previousLevel
  if (rise <= 0) return 0
  return clamp01(rise / 0.16)
}

export function advanceDepthClock(
  clock: number,
  dtSec: number,
  motion: number,
  energy: AudioDepthEnergy = STILL_DEPTH_ENERGY,
  bias: ColorDepthBias = NEUTRAL_DEPTH_BIAS,
): number {
  const dt = Math.max(0, dtSec)
  const drive = clamp01(motion)
  const level = clamp01(energy.level ?? 0)
  const lightRate = 1 + clamp(bias.light, -1, 1) * 0.16
  const spaceRate = 1 - clamp01(bias.space) * 0.1
  const speed =
    (0.078 + level * 0.028 + clamp01(energy.transient) * 0.05) *
    (1 - clamp01(energy.bass) * 0.34) *
    lightRate *
    spaceRate
  const impulse = clamp01(energy.transient) * 0.012
  return clock + (dt * speed + impulse) * drive
}

/**
 * Stable layer frame. far01 is 0 beside the viewer and 1 at the horizon.
 * Near layers keep the full sound body. Far layers shrink toward a vanishing line.
 */
export function perspectiveFrame(far01: number, bias: ColorDepthBias = NEUTRAL_DEPTH_BIAS): {
  span: number
  amplitude: number
  horizon: number
  weight: number
  spread: number
} {
  const far = clamp01(far01)
  const light = clamp(bias.light, -1, 1)
  const space = clamp01(bias.space)
  const pulled = clamp01(far * (1 + space * 0.08) + Math.max(0, -light) * 0.05 * far - Math.max(0, light) * 0.04 * far)
  const span = 1 - pulled * 0.76
  const amplitude = 1 - pulled * 0.84
  const horizon = pulled * 0.9
  const weight = 0.5 + (1 - pulled) * 1.7
  const spread = 0.25 + (1 - pulled) * 0.95
  return { span, amplitude, horizon, weight, spread }
}

function travelerAt(
  lane: number,
  phase: number,
  motion: number,
  energy: AudioDepthEnergy,
  bias: ColorDepthBias,
  parallaxScale: number,
): DepthTraveler {
  const p = fract(phase)
  const z = p
  const light = clamp(bias.light, -1, 1)
  const space = clamp01(bias.space)
  const zView = clamp01(z + light * 0.045)
  const fadeIn = smoothstep(0, 0.08, z)
  const fadeOut = 1 - smoothstep(0.8, 1, z)
  const presence = 0.16 + clamp01(motion) * 0.84
  const laneDim = 1 - lane * 0.04
  const alpha = fadeIn * fadeOut * presence * laneDim * (0.42 + (1 - lane / DEPTH_LANE_COUNT) * 0.4)
  const approach = zView * zView * (3 - 2 * zView)
  const pass = smoothstep(0.78, 1, z)
  const bass = clamp01(energy.bass)
  const span = (0.22 + approach * 0.92 + pass * 0.36) * (1 - (1 - approach) * space * 0.08)
  const amplitude = (0.18 + approach * 0.92 + pass * 0.14) * (1 + bass * 0.16 * smoothstep(0.22, 0.75, zView))
  const lift = (1 - approach) * 0.98 - pass * 0.14
  const weight = 0.4 + approach * 2.6
  const blur = (1 - approach) * 1.25
  const high = clamp01(energy.high)
  const detail = clamp01(high * (0.45 + Math.max(0, light) * 0.35) + Math.max(0, light) * 0.12) * smoothstep(0.18, 0.72, zView)
  const laneShift = (lane - (DEPTH_LANE_COUNT - 1) / 2) / DEPTH_LANE_COUNT
  const parallax = laneShift * (0.01 + approach * 0.1) * parallaxScale * (1 + space * 0.2)
  const spread = 0.2 + approach * 1.15
  return {
    lane,
    phase: p,
    z,
    scale: amplitude,
    span,
    alpha,
    lift,
    weight,
    blur,
    detail,
    parallax,
    spread,
  }
}

export function depthTravelers(
  clock: number,
  motion: number,
  energy: AudioDepthEnergy = STILL_DEPTH_ENERGY,
  bias: ColorDepthBias = NEUTRAL_DEPTH_BIAS,
  reduced = false,
): DepthTraveler[] {
  const parallaxScale = reduced ? 0.28 : 1
  const out: DepthTraveler[] = []
  for (let lane = 0; lane < DEPTH_LANE_COUNT; lane++) {
    const phase = fract(clock * LANE_SPEED[lane]! + LANE_OFFSET[lane]!)
    const traveler = travelerAt(lane, phase, motion, energy, bias, parallaxScale)
    if (traveler.alpha >= 0.02) out.push(traveler)
  }
  out.sort((a, b) => a.phase - b.phase)
  return out
}

/** Held phases for reduced motion before the clock has moved: far, mid, and near together. */
export function stillDepthTravelers(): DepthTraveler[] {
  return [0.08, 0.28, 0.5, 0.72, 0.9].map((phase, lane) =>
    travelerAt(lane, phase, 0.22, STILL_DEPTH_ENERGY, NEUTRAL_DEPTH_BIAS, 0.28),
  )
}
