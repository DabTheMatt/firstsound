import { clamp } from '../../audio/parameters/mapping'
import { feelFromPitch, feelFromSpeed } from '../playbackFeel'

/**
 * How far the sound body stretches at either pole of the sensory time axis.
 * Neutral speed is exactly 1. Longer playback is above 1, shorter is below 1.
 * Milder than the 4× audio poles so the silhouette stays readable.
 */
const TIME_STRETCH_POLE = 2.75

/** Spatial cycles across the view at the lower and higher pitch poles. */
const PITCH_CYCLES_LOWER = 2.2
const PITCH_CYCLES_HIGHER = 18

const STRETCH_SNAP = 0.0015
const FEEL_SNAP = 0.002

export type PlaybackVisual = {
  /** 1 = natural. Above 1 stretches the sound (longer). Below 1 compresses it (shorter). */
  timeStretch: number
  /** Engine pitch feel: −1 lower, 0 natural, +1 higher. */
  pitchFeel: number
}

export const NEUTRAL_PLAYBACK: PlaybackVisual = { timeStretch: 1, pitchFeel: 0 }

export function timeStretchFromFeel(timeFeel: number): number {
  const feel = clamp(timeFeel, -1, 1)
  if (feel === 0) return 1
  return Math.pow(TIME_STRETCH_POLE, feel)
}

/** Visual warp taken from the same speed and pitch that drive the voice. */
export function playbackVisualFromEngine(speed: number, pitch: number): PlaybackVisual {
  const timeFeel = feelFromSpeed(speed)
  const pitchFeel = feelFromPitch(pitch)
  return {
    timeStretch: Math.abs(timeFeel) < 1e-9 ? 1 : timeStretchFromFeel(timeFeel),
    pitchFeel: Math.abs(pitchFeel) < 1e-9 ? 0 : pitchFeel,
  }
}

/** Frame-rate independent blend toward the live engine value. */
export function playbackSmoothAmount(dtMs: number): number {
  const dt = Math.min(120, Math.max(0, dtMs))
  return 1 - Math.exp(-dt / 85)
}

export function approachPlaybackVisual(
  shown: PlaybackVisual,
  target: PlaybackVisual,
  amount: number,
): PlaybackVisual {
  const t = clamp(amount, 0, 1)
  let timeStretch = shown.timeStretch + (target.timeStretch - shown.timeStretch) * t
  let pitchFeel = shown.pitchFeel + (target.pitchFeel - shown.pitchFeel) * t
  if (Math.abs(timeStretch - target.timeStretch) <= STRETCH_SNAP) timeStretch = target.timeStretch
  if (Math.abs(pitchFeel - target.pitchFeel) <= FEEL_SNAP) pitchFeel = target.pitchFeel
  return { timeStretch, pitchFeel }
}

export function playbackVisualSettled(shown: PlaybackVisual, target: PlaybackVisual): boolean {
  return shown.timeStretch === target.timeStretch && shown.pitchFeel === target.pitchFeel
}

/**
 * Display column → cached envelope index.
 * Longer stretch reads the center more slowly (features widen).
 * Shorter stretch reads faster and folds back in, so the body gets denser.
 * Neutral stretch is the column itself.
 */
export function stretchedEnvelopeIndex(x: number, length: number, timeStretch: number): number {
  if (length <= 1) return 0
  const last = length - 1
  if (timeStretch === 1) return clamp(x, 0, last)
  const stretch = Math.max(0.05, timeStretch)
  const center = last / 2
  const src = center + (x - center) / stretch
  return mirrorIndex(src, length)
}

function mirrorIndex(src: number, length: number): number {
  const last = length - 1
  const span = last * 2
  if (span <= 0) return 0
  let m = src % span
  if (m < 0) m += span
  if (m > last) m = span - m
  return m
}

export function sampleStretchedEnvelope(env: Float32Array, x: number, timeStretch: number): number {
  const n = env.length
  if (n === 0) return 0
  if (n === 1) return env[0] ?? 0
  const src = stretchedEnvelopeIndex(x, n, timeStretch)
  const i0 = Math.floor(src)
  const i1 = Math.min(n - 1, i0 + 1)
  const frac = src - i0
  if (frac === 0 || i0 === i1) return env[i0] ?? 0
  const a = env[i0] ?? 0
  const b = env[i1] ?? 0
  return a + (b - a) * frac
}

/** Cycles of internal pitch motion across the view. Lower is broader, higher is finer. */
export function pitchCycles(pitchFeel: number): number {
  const feel = clamp(pitchFeel, -1, 1)
  const towardHigh = (feel + 1) / 2
  return PITCH_CYCLES_LOWER * Math.pow(PITCH_CYCLES_HIGHER / PITCH_CYCLES_LOWER, towardHigh)
}

/**
 * Amplitude modulation of the sound body.
 * Zero at natural pitch, so the resting picture is unchanged.
 * The mean is ~0: the body oscillates instead of sliding up or down.
 */
export function pitchRipple(x: number, width: number, pitchFeel: number, phase: number): number {
  const feel = clamp(pitchFeel, -1, 1)
  const depth = Math.abs(feel)
  if (depth < 1e-8 || width <= 1) return 0
  const cycles = pitchCycles(feel)
  const theta = (x / width) * cycles * Math.PI * 2 + phase
  const fundamental = Math.sin(theta)
  const partial = feel < 0 ? Math.sin(theta * 0.5) : Math.sin(theta * 3)
  const partialMix = feel < 0 ? 0.48 : 0.4
  const shaped = fundamental * (1 - partialMix) + partial * partialMix
  const gain = feel < 0 ? 0.3 : 0.17
  return shaped * gain * depth
}

/** Envelope sample after time stretch, with pitch living inside the body. */
export function soundBodyAt(
  env: Float32Array,
  x: number,
  width: number,
  playback: PlaybackVisual,
  phase: number,
): number {
  const body = sampleStretchedEnvelope(env, x, playback.timeStretch)
  return body * (1 + pitchRipple(x, width, playback.pitchFeel, phase))
}

/** Radians per second. Lower pitch drifts slower. Natural pitch is still. */
export function pitchPhaseRate(pitchFeel: number): number {
  const feel = clamp(pitchFeel, -1, 1)
  if (Math.abs(feel) < 1e-8) return 0
  return 0.12 * Math.pow(2, feel * 1.7) * Math.PI * 2
}

/**
 * Reduced motion freezes the phase at 0.
 * The spatial frequency remains, so pitch is still visible in a still frame.
 */
export function advancePitchPhase(phase: number, dtSec: number, pitchFeel: number, reduced: boolean): number {
  if (reduced) return 0
  if (Math.abs(pitchFeel) < 1e-8) return phase
  const tau = Math.PI * 2
  const next = phase + Math.max(0, dtSec) * pitchPhaseRate(pitchFeel)
  return ((next % tau) + tau) % tau
}
