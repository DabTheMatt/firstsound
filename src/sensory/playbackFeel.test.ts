import { describe, expect, it } from 'vitest'
import {
  feelFromPitch,
  feelFromSpeed,
  pitchFromFeel,
  SENSORY_PITCH_SPAN,
  SENSORY_SPEED_FAST,
  SENSORY_SPEED_SLOW,
  speedFromFeel,
  withLivePlayback,
} from './playbackFeel'

describe('sensory time feel', () => {
  it('rests at natural speed and reaches shorter and longer poles', () => {
    expect(speedFromFeel(0)).toBeCloseTo(1)
    expect(speedFromFeel(-1)).toBeCloseTo(SENSORY_SPEED_FAST)
    expect(speedFromFeel(1)).toBeCloseTo(SENSORY_SPEED_SLOW)
  })

  it('round-trips through the logarithmic axis', () => {
    for (const feel of [-1, -0.4, 0, 0.35, 1]) {
      expect(feelFromSpeed(speedFromFeel(feel))).toBeCloseTo(feel)
    }
  })
})

describe('sensory pitch feel', () => {
  it('rests at unison and reaches lower and higher poles', () => {
    expect(pitchFromFeel(0)).toBe(0)
    expect(pitchFromFeel(-1)).toBe(-SENSORY_PITCH_SPAN)
    expect(pitchFromFeel(1)).toBe(SENSORY_PITCH_SPAN)
  })

  it('stays independent of the time axis', () => {
    expect(speedFromFeel(1)).toBeCloseTo(SENSORY_SPEED_SLOW)
    expect(pitchFromFeel(1)).toBe(SENSORY_PITCH_SPAN)
    expect(feelFromPitch(pitchFromFeel(-0.5))).toBeCloseTo(-0.5)
    expect(feelFromSpeed(2)).not.toBeCloseTo(feelFromPitch(2))
  })
})

describe('withLivePlayback', () => {
  it('keeps the playing speed and pitch when a feeling remap rewrites DSP', () => {
    const mapped = withLivePlayback(
      { params: { speed: 1, pitch: 0, gain: -3 } },
      { speed: 0.5, pitch: -7 },
    )
    expect(mapped.params.speed).toBe(0.5)
    expect(mapped.params.pitch).toBe(-7)
    expect(mapped.params.gain).toBe(-3)
  })
})
