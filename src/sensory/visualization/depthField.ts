/** Forward motion through the sound field. Pure, so the painter stays cheap. */

export type AudioDepthEnergy = {
  /** 0..1 low-frequency energy. Larger, slower spatial push. */
  bass: number
  /** 0..1 high-frequency energy. Finer strokes. */
  high: number
  /** 0..1 positive level jump. A small forward impulse. */
  transient: number
}

export const STILL_DEPTH_ENERGY: AudioDepthEnergy = { bass: 0, high: 0, transient: 0 }

export type DepthTraveler = {
  lane: number
  /** 0 = distant, 1 = passing the viewer. */
  phase: number
  /** Amplitude relative to the main ridge. Far is smaller. */
  scale: number
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
}

export const DEPTH_LANE_COUNT = 4

const LANE_SPEED = [0.78, 1, 1.16, 1.4] as const
const LANE_OFFSET = [0.04, 0.29, 0.53, 0.77] as const

/** Near-static drift once playback has settled. Not a hard freeze. */
export const MOTION_IDLE = 0.045

const PLAY_TAU_MS = 420
const PAUSE_TAU_MS = 560

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
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
  if (reduced) return 0
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
): number {
  const dt = Math.max(0, dtSec)
  const drive = clamp01(motion)
  const speed = (0.07 + clamp01(energy.transient) * 0.045) * (1 - clamp01(energy.bass) * 0.3)
  const impulse = clamp01(energy.transient) * 0.012
  return clock + (dt * speed + impulse) * drive
}

function travelerAt(lane: number, phase: number, motion: number, energy: AudioDepthEnergy): DepthTraveler {
  const p = fract(phase)
  const fadeIn = smoothstep(0, 0.12, p)
  const fadeOut = 1 - smoothstep(0.74, 1, p)
  const presence = 0.07 + clamp01(motion) * 0.93
  const laneDim = 1 - lane * 0.08
  const alpha = fadeIn * fadeOut * presence * laneDim * (0.34 + (1 - lane / DEPTH_LANE_COUNT) * 0.5)
  const grow = smoothstep(0, 1, p)
  const pass = smoothstep(0.78, 1, p)
  const bass = clamp01(energy.bass)
  const near = p > 0.32 ? 1 : 0.35
  const scale = (0.16 + grow * 0.92 + pass * 0.22) * (1 + bass * 0.14 * near)
  const lift = (1 - p) * 0.92 - pass * 0.18
  const weight = 0.55 + p * 1.15
  const blur = (1 - p) * 0.85
  const detail = clamp01(energy.high) * smoothstep(0.28, 0.7, p)
  return { lane, phase: p, scale, alpha, lift, weight, blur, detail }
}

export function depthTravelers(
  clock: number,
  motion: number,
  energy: AudioDepthEnergy = STILL_DEPTH_ENERGY,
): DepthTraveler[] {
  const out: DepthTraveler[] = []
  for (let lane = 0; lane < DEPTH_LANE_COUNT; lane++) {
    const phase = fract(clock * LANE_SPEED[lane]! + LANE_OFFSET[lane]!)
    const traveler = travelerAt(lane, phase, motion, energy)
    if (traveler.alpha >= 0.02) out.push(traveler)
  }
  out.sort((a, b) => a.phase - b.phase)
  return out
}

/** Frozen phases for reduced motion: depth without travel. */
export function stillDepthTravelers(): DepthTraveler[] {
  return [0.22, 0.4, 0.58].map((phase, lane) => travelerAt(lane, phase, 0.22, STILL_DEPTH_ENERGY))
}
