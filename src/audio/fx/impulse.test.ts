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
    let accL = 0
    let accR = 0
    let accLR = 0
    for (let i = 0; i < n; i++) {
      accL += left[i]! * left[i]!
      accR += right[i]! * right[i]!
      accLR += left[i]! * right[i]!
    }
    const corr = accLR / Math.sqrt(accL * accR)
    expect(corr).toBeLessThan(0.65)
    let earlyPeak = 0
    const earlyN = Math.min(n, Math.floor(spec.sampleRate * 0.05))
    for (let i = 0; i < earlyN; i++) earlyPeak = Math.max(earlyPeak, Math.abs(left[i]!))
    const tailStart = Math.max(0, n - Math.floor(n * 0.2))
    let tailAcc = 0
    for (let i = tailStart; i < n; i++) tailAcc += left[i]! * left[i]!
    const tailRms = Math.sqrt(tailAcc / Math.max(1, n - tailStart))
    expect(earlyPeak).toBeGreaterThan(tailRms * 2.5)
    let peak = 0
    let earlyEnergy = 0
    const rmsN = Math.min(n, Math.floor(spec.sampleRate * 0.08))
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!))
    for (let i = 0; i < rmsN; i++) earlyEnergy += left[i]! * left[i]! + right[i]! * right[i]!
    const earlyRms = Math.sqrt(earlyEnergy / (2 * rmsN))
    expect(peak).toBeGreaterThan(0.15)
    expect(peak).toBeLessThanOrEqual(0.92)
    expect(earlyRms).toBeGreaterThan(0.04)
    expect(earlyRms).toBeLessThan(0.2)
  })

  it('cathedral IRs last long enough for huge spaces', () => {
    const spec = {
      type: 'cathedral' as const,
      sampleRate: 48000,
      decaySec: 12,
      size: 0.95,
      diffusion: 0.8,
      density: 0.8,
      early: 0.4,
      damping: 0.3,
      reverse: 0,
      shimmer: 0,
      shimmerPitch: 12,
      color: 0,
      freeze: false,
    }
    expect(impulseLengthSec(spec)).toBeGreaterThan(8)
    expect(impulseLengthSec(spec)).toBeLessThanOrEqual(12)
  })

  it('bloom IRs stay long and write energy', () => {
    const spec = {
      type: 'bloom' as const,
      sampleRate: 48000,
      decaySec: 4,
      size: 0.8,
      diffusion: 0.85,
      density: 0.75,
      early: 0.3,
      damping: 0.2,
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
    expect(n / 48000).toBeGreaterThan(3)
    expect(left.some((v) => v !== 0)).toBe(true)
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
