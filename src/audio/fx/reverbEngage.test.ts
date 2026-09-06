import { describe, expect, it } from 'vitest'
import { fillReverbImpulse, impulseLengthSec, IR_EARLY_SEC, IR_TARGET_EARLY_RMS } from './impulse'
import { mixWhenEnablingReverb, REVERB_ENGAGE_MIX, reverbMixEngagesModule } from './reverbEngage'

function hallSpec(type: 'hall' | 'cathedral') {
  return {
    type,
    sampleRate: 48000,
    decaySec: type === 'cathedral' ? 12 : 1.6,
    size: type === 'cathedral' ? 0.95 : 0.5,
    diffusion: 0.6,
    density: 0.7,
    early: 0.4,
    damping: 0.3,
    reverse: 0,
    shimmer: 0,
    shimmerPitch: 12,
    color: 0,
    freeze: false,
  } as const
}

function earlyRms(left: Float32Array, right: Float32Array, sampleRate: number): number {
  const n = Math.min(left.length, right.length, Math.floor(sampleRate * IR_EARLY_SEC))
  let e = 0
  for (let i = 0; i < n; i++) e += left[i]! * left[i]! + right[i]! * right[i]!
  return Math.sqrt(e / (2 * n))
}

describe('reverbEngage', () => {
  it('turns Mix up when the module is enabled dry', () => {
    expect(mixWhenEnablingReverb(0)).toBe(REVERB_ENGAGE_MIX)
    expect(mixWhenEnablingReverb(0.4)).toBe(REVERB_ENGAGE_MIX)
    expect(mixWhenEnablingReverb(22)).toBe(22)
    expect(reverbMixEngagesModule(0)).toBe(false)
    expect(reverbMixEngagesModule(1)).toBe(true)
  })
})

describe('impulse loudness', () => {
  it('keeps long cathedrals as loud as short halls in the early window', () => {
    const hall = hallSpec('hall')
    const cath = hallSpec('cathedral')
    const hL = new Float32Array(Math.floor(hall.sampleRate * impulseLengthSec(hall)))
    const hR = new Float32Array(hL.length)
    const cL = new Float32Array(Math.floor(cath.sampleRate * impulseLengthSec(cath)))
    const cR = new Float32Array(cL.length)
    fillReverbImpulse(hL, hR, hall)
    fillReverbImpulse(cL, cR, cath)
    const hallRms = earlyRms(hL, hR, hall.sampleRate)
    const cathRms = earlyRms(cL, cR, cath.sampleRate)
    expect(hallRms).toBeGreaterThan(IR_TARGET_EARLY_RMS * 0.4)
    expect(cathRms).toBeGreaterThan(IR_TARGET_EARLY_RMS * 0.4)
    expect(Math.abs(hallRms - cathRms)).toBeLessThan(0.08)
  })
})
