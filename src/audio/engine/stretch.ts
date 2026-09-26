import { clamp, pitchRatio } from '../parameters/mapping'

export type StretchWindow = {
  grainSec: number
  hopSec: number
  peak: number
}

/**
 * How much to lengthen grains so pitched-down / slowed audio keeps bass.
 * Short Hann grains high-pass near 1/grainSec; lowering pitch moves energy there.
 */
export function stretchLfScale(speed: number, pitchRatio: number): number {
  const slow = 1 / Math.max(speed, 1 / 8)
  const down = 1 / Math.max(pitchRatio, 1 / 8)
  return clamp(Math.max(slow, down, 1), 1, 8)
}

/** Sparse (0) → longer grains, wider hops. Dense (100) → tighter overlap-add. */
export function stretchWindow(interp: number, speed = 1, pitchRatio = 1): StretchWindow {
  const n = clamp(interp / 100, 0, 1)
  const lf = stretchLfScale(speed, pitchRatio)
  const grainSec = (0.112 - n * 0.058) * lf
  const hopRatio = 0.44 - n * 0.32
  const hopSec = Math.max(0.004, grainSec * hopRatio)
  const peak = clamp((hopSec / grainSec) * 1.08, 0.14, 0.62)
  return { grainSec, hopSec, peak }
}

/**
 * Log time-constant for Speed (and the matching linear constant for Pitch).
 * Sparse overlap stays quicker; dense overlap eases a little longer.
 * Kept well under 200 ms so automation and LFO still read as the gesture.
 */
export function speedSmoothTau(interp: number): number {
  const n = clamp(interp / 100, 0, 1)
  return 0.022 + n * 0.16
}

/**
 * Grain geometry follows Speed/Pitch more slowly than the read head.
 * A fast LFO then changes tempo without pumping the window every hop.
 */
export const WINDOW_FOLLOW_TAU = 0.26

/** One-pole mix so hop-sized updates share a stable time constant. */
export function stretchSlew(hopSec: number, interp: number): number {
  return 1 - Math.exp(-Math.max(hopSec, 0.001) / speedSmoothTau(interp))
}

export type StretchSchedule = {
  grainSec: number
  hopSec: number
  peak: number
}

/**
 * Steady playback uses the full stretch window, including the longer grains
 * that keep bass when Speed or Pitch drop. While Speed is still chasing its
 * target, hop and grain shrink together so the overlap ratio (and level) stay
 * put and the glide can update faster than a slowed-down hop.
 */
export function stretchSchedule(
  interp: number,
  windowSpeed: number,
  windowPitchSemitones: number,
  playbackSpeed = windowSpeed,
  targetSpeed = windowSpeed,
): StretchSchedule {
  const speed = Math.max(1e-4, windowSpeed)
  const ratio = Math.max(1e-4, pitchRatio(windowPitchSemitones))
  const shaped = stretchWindow(interp, speed, ratio)
  const mismatch = Math.abs(
    Math.log(Math.max(1e-4, targetSpeed)) - Math.log(Math.max(1e-4, playbackSpeed)),
  )
  const tightness = clamp(mismatch / 0.35, 0, 1)
  const minHop = Math.min(shaped.hopSec, 0.022)
  const hopSec = shaped.hopSec + (minHop - shaped.hopSec) * tightness
  const scale = hopSec / shaped.hopSec
  return { grainSec: shaped.grainSec * scale, hopSec, peak: shaped.peak }
}

export type StretchControl = {
  speed: number
  pitch: number
  windowSpeed: number
  windowPitch: number
}

export type StretchControlStep = StretchControl & {
  grainSec: number
  hopSec: number
  peak: number
  /** Source seconds advanced during this output hop (integral of Speed). */
  sourceAdvance: number
  /** Pitch ratio for the grain read. Independent of Speed. */
  readPitch: number
}

function glideSubsteps(dtSec: number): number {
  if (dtSec <= 0.012) return 1
  if (dtSec <= 0.03) return 2
  return 4
}

/** Log-domain one-pole. `mean` is the trapezoidal average over `dtSec` (no overshoot). */
export function glideTowardLog(
  current: number,
  target: number,
  dtSec: number,
  tauSec: number,
): { next: number; mean: number } {
  const dt = Math.max(0, dtSec)
  const c0 = Math.max(1e-6, current)
  if (!(dt > 0)) return { next: c0, mean: c0 }
  const goal = Math.max(1e-6, target)
  const tau = Math.max(tauSec, 1e-4)
  const steps = glideSubsteps(dt)
  const h = dt / steps
  const a = 1 - Math.exp(-h / tau)
  let s = c0
  let area = 0
  for (let i = 0; i < steps; i++) {
    const prev = s
    s = Math.exp(Math.log(prev) + (Math.log(goal) - Math.log(prev)) * a)
    area += (prev + s) * 0.5 * h
  }
  return { next: s, mean: area / dt }
}

/** Linear one-pole used for pitch in semitones. */
export function glideTowardLinear(
  current: number,
  target: number,
  dtSec: number,
  tauSec: number,
): { next: number; mean: number } {
  const dt = Math.max(0, dtSec)
  if (!(dt > 0) || !Number.isFinite(current)) return { next: current, mean: current }
  const goal = Number.isFinite(target) ? target : current
  const tau = Math.max(tauSec, 1e-4)
  const steps = glideSubsteps(dt)
  const h = dt / steps
  const a = 1 - Math.exp(-h / tau)
  let s = current
  let area = 0
  for (let i = 0; i < steps; i++) {
    const prev = s
    s = prev + (goal - prev) * a
    area += (prev + s) * 0.5 * h
  }
  return { next: s, mean: area / dt }
}

export function smoothTowardLogDt(current: number, target: number, dtSec: number, tauSec: number): number {
  return glideTowardLog(current, target, dtSec, tauSec).next
}

export function smoothTowardLinearDt(
  current: number,
  target: number,
  dtSec: number,
  tauSec: number,
): number {
  return glideTowardLinear(current, target, dtSec, tauSec).next
}

/**
 * One scheduled grain of the stretch voice.
 * Speed and pitch ease toward the live target; the window eases more slowly
 * so the overlap grid does not jump when the knob, an LFO, or automation moves.
 */
export function advanceStretchControl(
  state: StretchControl,
  targetSpeed: number,
  targetPitch: number,
  interp: number,
): StretchControlStep {
  const plan = stretchSchedule(interp, state.windowSpeed, state.windowPitch, state.speed, targetSpeed)
  const tau = speedSmoothTau(interp)
  const speed = glideTowardLog(state.speed, Math.max(1e-4, targetSpeed), plan.hopSec, tau)
  const pitch = glideTowardLinear(state.pitch, targetPitch, plan.hopSec, tau)
  const windowSpeed = smoothTowardLogDt(
    Math.max(1e-4, state.windowSpeed),
    Math.max(1e-4, targetSpeed),
    plan.hopSec,
    WINDOW_FOLLOW_TAU,
  )
  const windowPitch = smoothTowardLinearDt(state.windowPitch, targetPitch, plan.hopSec, WINDOW_FOLLOW_TAU)
  return {
    speed: speed.next,
    pitch: pitch.next,
    windowSpeed,
    windowPitch,
    grainSec: plan.grainSec,
    hopSec: plan.hopSec,
    peak: plan.peak,
    sourceAdvance: plan.hopSec * speed.mean,
    readPitch: Math.max(1e-4, pitchRatio(pitch.mean)),
  }
}

export function smoothTowardLog(current: number, target: number, amount: number): number {
  const c = Math.max(1e-6, current)
  const t = Math.max(1e-6, target)
  const a = clamp(amount, 0, 1)
  return Math.exp(Math.log(c) + (Math.log(t) - Math.log(c)) * a)
}

export function smoothTowardLinear(current: number, target: number, amount: number): number {
  const a = clamp(amount, 0, 1)
  return current + (target - current) * a
}

export function hannCurve(length = 64): Float32Array {
  const n = Math.max(8, Math.floor(length))
  const out = new Float32Array(n)
  const den = n - 1
  for (let i = 0; i < n; i++) {
    out[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / den))
  }
  return out
}

export function scaledHannCurve(peak: number, length = 64): Float32Array {
  const curve = hannCurve(length)
  const g = Math.max(0, peak)
  for (let i = 0; i < curve.length; i++) curve[i]! *= g
  return curve
}

export function stretchLookahead(hopSec: number): number {
  return Math.max(0.028, hopSec * 2.4)
}
