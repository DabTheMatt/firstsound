import { describe, expect, it } from 'vitest'
import { SENSORY_PITCH_SPAN, SENSORY_SPEED_FAST, SENSORY_SPEED_SLOW, pitchFromFeel, speedFromFeel } from '../playbackFeel'
import {
  NEUTRAL_PLAYBACK,
  advancePitchPhase,
  approachPlaybackVisual,
  pitchCycles,
  pitchPhaseRate,
  pitchRipple,
  playbackSmoothAmount,
  playbackVisualFromEngine,
  playbackVisualSettled,
  sampleStretchedEnvelope,
  soundBodyAt,
  timeStretchFromFeel,
} from './playbackWarp'

function peaked(length: number): Float32Array {
  const env = new Float32Array(length)
  const center = (length - 1) / 2
  for (let i = 0; i < length; i++) {
    const d = i - center
    env[i] = 0.2 + 0.8 * Math.exp(-(d * d) / (2 * 28 * 28))
  }
  env[Math.round(center) + 20] = 0.65
  return env
}

function zeroCrossings(feel: number, width = 900): number {
  let prev = pitchRipple(0, width, feel, 0)
  let n = 0
  for (let x = 1; x < width; x++) {
    const v = pitchRipple(x, width, feel, 0)
    if ((prev <= 0 && v > 0) || (prev >= 0 && v < 0)) n++
    prev = v
  }
  return n
}

function maxAbs(feel: number, width = 900): number {
  let peak = 0
  for (let x = 0; x < width; x++) peak = Math.max(peak, Math.abs(pitchRipple(x, width, feel, 0)))
  return peak
}

describe('playback visual from the engine', () => {
  it('rests exactly at neutral speed and pitch', () => {
    expect(playbackVisualFromEngine(1, 0)).toEqual(NEUTRAL_PLAYBACK)
    expect(timeStretchFromFeel(0)).toBe(1)
    expect(playbackVisualFromEngine(speedFromFeel(0), pitchFromFeel(0))).toEqual(NEUTRAL_PLAYBACK)
  })

  it('uses the same normalized feels that drive audio', () => {
    const longerLower = playbackVisualFromEngine(speedFromFeel(0.55), pitchFromFeel(-0.4))
    const longerHigher = playbackVisualFromEngine(speedFromFeel(0.55), pitchFromFeel(0.7))
    const shorterHigher = playbackVisualFromEngine(speedFromFeel(-0.35), pitchFromFeel(0.7))
    expect(longerLower.timeStretch).toBeCloseTo(timeStretchFromFeel(0.55))
    expect(longerLower.pitchFeel).toBeCloseTo(-0.4)
    expect(longerHigher.timeStretch).toBe(longerLower.timeStretch)
    expect(longerHigher.pitchFeel).toBeCloseTo(0.7)
    expect(shorterHigher.pitchFeel).toBe(longerHigher.pitchFeel)
    expect(shorterHigher.timeStretch).toBeLessThan(1)
    expect(longerLower.timeStretch).toBeGreaterThan(1)
  })

  it('reaches the shorter and longer poles from the audio speed range', () => {
    const shorter = playbackVisualFromEngine(SENSORY_SPEED_FAST, 0).timeStretch
    const longer = playbackVisualFromEngine(SENSORY_SPEED_SLOW, 0).timeStretch
    expect(shorter).toBeLessThan(0.4)
    expect(longer).toBeGreaterThan(2.5)
    expect(shorter * longer).toBeCloseTo(1)
    expect(playbackVisualFromEngine(1, -SENSORY_PITCH_SPAN).pitchFeel).toBe(-1)
    expect(playbackVisualFromEngine(1, SENSORY_PITCH_SPAN).pitchFeel).toBe(1)
  })
})

describe('time stretch of the sound body', () => {
  const env = peaked(241)
  const center = 120

  it('leaves every column untouched at neutral stretch', () => {
    for (let x = 0; x < env.length; x++) {
      expect(sampleStretchedEnvelope(env, x, 1)).toBe(env[x])
      expect(soundBodyAt(env, x, env.length, NEUTRAL_PLAYBACK, 0.4)).toBe(env[x])
    }
  })

  it('spreads a feature when the sound gets longer and packs it when shorter', () => {
    const sourceOffset = 20
    const longer = playbackVisualFromEngine(SENSORY_SPEED_SLOW, 0).timeStretch
    const shorter = playbackVisualFromEngine(SENSORY_SPEED_FAST, 0).timeStretch
    const xLong = center + sourceOffset * longer
    const xShort = center + sourceOffset * shorter
    expect(sampleStretchedEnvelope(env, xLong, longer)).toBeCloseTo(0.65, 5)
    expect(sampleStretchedEnvelope(env, xShort, shorter)).toBeCloseTo(0.65, 5)
    expect(xLong - center).toBeGreaterThan(sourceOffset * 2)
    expect(xShort - center).toBeLessThan(sourceOffset * 0.5)
  })

  it('keeps a flat body flat, so time does not slide the picture vertically', () => {
    const flat = new Float32Array(80).fill(0.4)
    const longer = playbackVisualFromEngine(SENSORY_SPEED_SLOW, 0)
    for (let x = 0; x < flat.length; x++) {
      expect(sampleStretchedEnvelope(flat, x, longer.timeStretch)).toBeCloseTo(0.4, 5)
    }
  })
})

describe('pitch inside the sound body', () => {
  it('is silent at natural pitch and does not bias the body up or down', () => {
    expect(pitchRipple(10, 400, 0, 0)).toBe(0)
    expect(pitchRipple(10, 400, 0, 1.2)).toBe(0)
    const flat = new Float32Array(480).fill(0.55)
    let lowerSum = 0
    let higherSum = 0
    for (let x = 0; x < flat.length; x++) {
      lowerSum += soundBodyAt(flat, x, flat.length, { timeStretch: 1, pitchFeel: -1 }, 0)
      higherSum += soundBodyAt(flat, x, flat.length, { timeStretch: 1, pitchFeel: 1 }, 0)
    }
    expect(lowerSum / flat.length).toBeCloseTo(0.55, 1)
    expect(higherSum / flat.length).toBeCloseTo(0.55, 1)
  })

  it('makes lower pitch broader and slower, and higher pitch finer', () => {
    expect(pitchCycles(-1)).toBeLessThan(3)
    expect(pitchCycles(1)).toBeGreaterThan(pitchCycles(-1) * 6)
    expect(zeroCrossings(1)).toBeGreaterThan(zeroCrossings(-1) * 4)
    expect(maxAbs(-1)).toBeGreaterThan(maxAbs(1))
    expect(pitchPhaseRate(-1)).toBeGreaterThan(0)
    expect(pitchPhaseRate(-1)).toBeLessThan(pitchPhaseRate(1))
    expect(pitchPhaseRate(0)).toBe(0)
  })

  it('keeps the spatial pattern when motion is reduced', () => {
    expect(advancePitchPhase(1.4, 0.5, -0.8, true)).toBe(0)
    expect(pitchRipple(30, 400, -0.8, 0)).not.toBe(0)
    expect(pitchRipple(30, 400, 0.8, 0)).not.toBe(0)
    const moved = advancePitchPhase(0.2, 0.4, 1, false)
    expect(moved).toBeGreaterThan(0.2)
  })
})

describe('time and pitch together', () => {
  const env = peaked(241)
  const x = 130
  const width = env.length

  it('keeps stretch and pitch as independent factors', () => {
    const longer = playbackVisualFromEngine(SENSORY_SPEED_SLOW, 0).timeStretch
    const shorter = playbackVisualFromEngine(SENSORY_SPEED_FAST, 0).timeStretch
    const stretched = soundBodyAt(env, x, width, { timeStretch: longer, pitchFeel: 0 }, 0)
    const lowered = soundBodyAt(env, x, width, { timeStretch: 1, pitchFeel: -1 }, 0)
    const longerLower = soundBodyAt(env, x, width, { timeStretch: longer, pitchFeel: -1 }, 0)
    const shorterHigher = soundBodyAt(env, x, width, { timeStretch: shorter, pitchFeel: 1 }, 0.3)
    const ripple = pitchRipple(x, width, -1, 0)
    expect(stretched).not.toBeCloseTo(env[x] ?? 0)
    expect(lowered).not.toBeCloseTo(env[x] ?? 0)
    expect(longerLower).toBeCloseTo(stretched * (1 + ripple))
    expect(longerLower).not.toBeCloseTo(stretched)
    expect(longerLower).not.toBeCloseTo(lowered)
    expect(shorterHigher).not.toBeCloseTo(soundBodyAt(env, x, width, { timeStretch: shorter, pitchFeel: 0 }, 0.3))
    expect(shorterHigher).not.toBeCloseTo(soundBodyAt(env, x, width, { timeStretch: 1, pitchFeel: 1 }, 0.3))
  })
})

describe('smooth return to the engine state', () => {
  it('eases toward the live value and lands exactly on it', () => {
    const target = playbackVisualFromEngine(SENSORY_SPEED_SLOW, pitchFromFeel(-1))
    let shown = NEUTRAL_PLAYBACK
    for (let i = 0; i < 40; i++) shown = approachPlaybackVisual(shown, target, playbackSmoothAmount(32))
    expect(shown).toEqual(target)
    expect(playbackVisualSettled(shown, target)).toBe(true)
  })

  it('returns exactly to the neutral picture', () => {
    let shown = playbackVisualFromEngine(SENSORY_SPEED_FAST, pitchFromFeel(1))
    for (let i = 0; i < 48; i++) shown = approachPlaybackVisual(shown, NEUTRAL_PLAYBACK, playbackSmoothAmount(32))
    expect(shown.timeStretch).toBe(1)
    expect(shown.pitchFeel).toBe(0)
    expect(approachPlaybackVisual(shown, NEUTRAL_PLAYBACK, 1)).toEqual(NEUTRAL_PLAYBACK)
  })
})
