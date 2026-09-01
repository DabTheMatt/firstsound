import { describe, expect, it } from 'vitest'
import { fillReverbImpulse, impulseLengthSec } from './impulse'

describe('impulse', () => {
  it('writes a decaying stereo IR', () => {
    const spec = {
      type: 'hall' as const,
      sampleRate: 48000,
      decaySec: 1.5,
      size: 0.5,
      diffusion: 0.5,
      density: 0.7,
      early: 0.4,
      damping: 0.3,
      reverse: 0,
      shimmer: 0,
      shimmerPitch: 12,
      color: 0,
      freeze: false,
    }
    const n = Math.floor(48000 * impulseLengthSec(spec))
    const left = new Float32Array(n)
    const right = new Float32Array(n)
    fillReverbImpulse(left, right, spec)
    const energyStart = left.slice(0, 2000).reduce((a, b) => a + b * b, 0)
    const energyEnd = left.slice(-2000).reduce((a, b) => a + b * b, 0)
    expect(energyStart).toBeGreaterThan(energyEnd)
    expect(right.some((v) => v !== 0)).toBe(true)
  })

  it('gated IRs stay short', () => {
    const spec = {
      type: 'gated' as const,
      sampleRate: 48000,
      decaySec: 8,
      size: 0.5,
      diffusion: 0.4,
      density: 0.6,
      early: 0.5,
      damping: 0.2,
      reverse: 0,
      shimmer: 0,
      shimmerPitch: 12,
      color: 0,
      freeze: false,
    }
    expect(impulseLengthSec(spec)).toBeLessThan(2)
  })
})
