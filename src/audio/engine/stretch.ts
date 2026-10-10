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

/**
 * Grain overlap of the time-stretch voice, as a percent of the grain length.
 * This is the overlap-add train used when Speed or Pitch leave unity.
 * It is not a crossfade, and it is not the granular engine's Density.
 *
 * 56% → hop ≈ 44% of the grain (clearer attacks, fewer grains).
 * 88% → hop ≈ 12% of the grain (smoother, softer attacks, more CPU).
 * The floor stays above 50% so Hann windows do not leave gaps or clicks.
 *
 * Speed does not change this ratio. It advances the read head by hop × speed
 * (tempo without pitch). Pitch is the resampling step inside each grain.
 * When Speed or Pitch drop below 1, grains lengthen together so the window
 * still passes bass; the overlap percent stays put.
 *
 * Higher overlap also shortens the grain slightly and slows the Speed/Pitch
 * glide, so neighboring grains do not cancel while the read rate is moving.
 */
export const GRAIN_OVERLAP_MIN = 56
export const GRAIN_OVERLAP_MAX = 88
export const GRAIN_OVERLAP_DEFAULT = 76

/** 0 at 56% overlap, 1 at 88%. */
export function grainOverlapNorm(overlapPercent: number): number {
  return clamp(
    (overlapPercent - GRAIN_OVERLAP_MIN) / (GRAIN_OVERLAP_MAX - GRAIN_OVERLAP_MIN),
    0,
    1,
  )
}

/** Hop as a fraction of the grain. Inverse of the overlap percent. */
export function grainHopRatio(overlapPercent: number): number {
  const overlap = clamp(overlapPercent, GRAIN_OVERLAP_MIN, GRAIN_OVERLAP_MAX)
  return 1 - overlap / 100
}

export function stretchWindow(overlapPercent: number, speed = 1, pitchRatio = 1): StretchWindow {
  const n = grainOverlapNorm(overlapPercent)
  const lf = stretchLfScale(speed, pitchRatio)
  const grainSec = (0.112 - n * 0.058) * lf
  const hopRatio = grainHopRatio(overlapPercent)
  const hopSec = Math.max(0.004, grainSec * hopRatio)
  const peak = clamp((hopSec / grainSec) * 1.08, 0.14, 0.62)
  return { grainSec, hopSec, peak }
}

/**
 * Log time-constant for Speed (and the matching linear constant for Pitch).
 * Sparse overlap stays quicker; dense overlap eases a little longer.
 * Kept well under 200 ms so automation and LFO still read as the gesture.
 */
export function speedSmoothTau(overlapPercent: number): number {
  return 0.022 + grainOverlapNorm(overlapPercent) * 0.16
}

/**
 * Grain geometry follows Speed/Pitch more slowly than the read head.
 * A fast LFO then changes tempo without pumping the window every hop.
 */
export const WINDOW_FOLLOW_TAU = 0.26

/** One-pole mix so hop-sized updates share a stable time constant. */
export function stretchSlew(hopSec: number, overlapPercent: number): number {
  return 1 - Math.exp(-Math.max(hopSec, 0.001) / speedSmoothTau(overlapPercent))
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
  overlapPercent: number,
  windowSpeed: number,
  windowPitchSemitones: number,
  playbackSpeed = windowSpeed,
  targetSpeed = windowSpeed,
  playbackPitch = windowPitchSemitones,
  targetPitch = windowPitchSemitones,
): StretchSchedule {
  const speed = Math.max(1e-4, windowSpeed)
  const ratio = Math.max(1e-4, pitchRatio(windowPitchSemitones))
  const shaped = stretchWindow(overlapPercent, speed, ratio)
  const speedMismatch = Math.abs(
    Math.log(Math.max(1e-4, targetSpeed)) - Math.log(Math.max(1e-4, playbackSpeed)),
  )
  // Overlapping grains with different read rates cancel on a sustained tone.
  // Shrink the window while pitch is still chasing so neighbors agree.
  const pitchMismatch = Math.abs(targetPitch - playbackPitch) / 12
  const mismatch = Math.max(speedMismatch, pitchMismatch)
  const tightness = clamp(mismatch / 0.35, 0, 1)
  // Unity hops already sit under 22 ms, so that floor never tightened a pitch
  // chase at 1×. Neighbors then kept disagreeing read rates and a sustained
  // tone dipped. 8 ms is short enough for those windows and still overlaps.
  const minHop = Math.min(shaped.hopSec, 0.008)
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
  overlapPercent: number,
): StretchControlStep {
  const plan = stretchSchedule(
    overlapPercent,
    state.windowSpeed,
    state.windowPitch,
    state.speed,
    targetSpeed,
    state.pitch,
    targetPitch,
  )
  const tau = speedSmoothTau(overlapPercent)
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
  // A gesture re-renders the UI on the same thread as this scheduler.
  // 80 ms of audio-clock lookahead survives that hitch without dumping
  // several grains onto one sample.
  return Math.max(0.08, hopSec * 2.4)
}

/** One stretch grain already handed to the audio clock. */
export type AudibleStretchGrain = {
  /** AudioContext time when this grain starts. */
  startWhen: number
  grainSec: number
  /** Source playhead at `startWhen`, before the hop advance. */
  origin: number
  /** Transport rate. Pitch lives inside the grain and does not move this. */
  speed: number
  /** +1 forward, −1 reverse. */
  dir: number
}

/** Hann peak. The EQ follows this grain, not the one still in its attack. */
export function stretchGrainPeakWhen(grain: AudibleStretchGrain): number {
  return grain.startWhen + Math.max(0, grain.grainSec) * 0.5
}

function grainTravel(grain: AudibleStretchGrain, intoSec: number): number {
  const into = Math.max(0, intoSec)
  const speed = Math.max(0, grain.speed)
  const dir = grain.dir < 0 ? -1 : 1
  return grain.origin + into * speed * dir
}

/**
 * Source time of the grain the output is actually playing.
 * Lookahead schedules the next slice — including a loop wrap — before it
 * is loud. Pause and the held playhead must stay on the peaking grain,
 * which is the spectrum on the EQ, not that queued slice.
 */
export function audibleStretchTime(
  grains: readonly AudibleStretchGrain[],
  now: number,
  fallback: number,
): number {
  let peaking: AudibleStretchGrain | null = null
  let peakingAt = Number.NEGATIVE_INFINITY
  for (const grain of grains) {
    const peak = stretchGrainPeakWhen(grain)
    if (peak > now + 1e-4) continue
    if (peak < peakingAt) continue
    peaking = grain
    peakingAt = peak
  }
  if (peaking) return grainTravel(peaking, Math.max(0, peaking.grainSec) * 0.5)
  let earliest: AudibleStretchGrain | null = null
  let earliestAt = Number.POSITIVE_INFINITY
  for (const grain of grains) {
    if (grain.startWhen > now + 1e-4) continue
    if (grain.startWhen >= earliestAt) continue
    earliest = grain
    earliestAt = grain.startWhen
  }
  if (!earliest) return fallback
  return grainTravel(earliest, Math.max(0, now - earliest.startWhen))
}

/**
 * Fold a source time into the playing region.
 * Does not touch the scheduler direction — playhead reads must not flip it.
 */
export function containStretchTime(
  time: number,
  start: number,
  end: number,
  loop: boolean,
  pingpong: boolean,
): number {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const span = Math.max(hi - lo, 1e-6)
  if (!Number.isFinite(time)) return lo
  if (pingpong) {
    let h = time
    for (let i = 0; i < 8; i++) {
      if (h > hi) h = hi - (h - hi)
      else if (h < lo) h = lo + (lo - h)
      else break
    }
    return Math.min(hi, Math.max(lo, h))
  }
  if (loop) {
    if (time >= hi) return lo + ((time - lo) % span)
    if (time < lo) {
      const back = (lo - time) % span
      return hi - (back === 0 ? span : back)
    }
    return time
  }
  return Math.min(hi, Math.max(lo, time))
}
