import { describe, expect, it } from 'vitest'
import { fadeSecondsForStep, fadeStepFromSeconds } from './fadeSteps'
import { applyToneToChannels } from './applyToneEq'
import { eqLooksFlat, matchSimpleTone, toneBandsAt } from './tonePresets'

describe('fade steps', () => {
  it('hides millisecond values behind named lengths', () => {
    expect(fadeStepFromSeconds(0)).toBe('none')
    expect(fadeStepFromSeconds(0.04)).toBe('short')
    expect(fadeStepFromSeconds(0.12)).toBe('medium')
    expect(fadeStepFromSeconds(0.3)).toBe('long')
    expect(fadeSecondsForStep('long', 0.4)).toBeLessThan(0.28)
  })
})

describe('simple tone presets', () => {
  it('keeps full-strength moves subtle', () => {
    const bass = toneBandsAt('bass', 1)
    const low = bass[0]
    expect(low?.type).toBe('lowshelf')
    expect(Math.abs(low?.gain ?? 0)).toBeLessThanOrEqual(3)
    const voice = toneBandsAt('voice', 1)
    expect(voice.some((band) => Math.abs(band.gain) > 4)).toBe(false)
  })

  it('matches a written preset and reports custom otherwise', () => {
    expect(matchSimpleTone(toneBandsAt('bright', 0.7), false).id).toBe('bright')
    expect(eqLooksFlat(toneBandsAt('natural', 0), true)).toBe(true)
    const custom = toneBandsAt('bass', 1)
    custom[2] = { ...custom[2]!, type: 'peaking', frequency: 1800, gain: 6, q: 4, slope: 12 }
    expect(matchSimpleTone(custom, false).id).toBe('custom')
  })

  it('applies EQ to PCM without exploding amplitude', () => {
    const sine = new Float32Array(512)
    for (let i = 0; i < sine.length; i++) sine[i] = Math.sin((i / 512) * Math.PI * 8)
    const out = applyToneToChannels([sine], 44100, toneBandsAt('bass', 1), 0)[0]!
    let peak = 0
    for (const sample of out) peak = Math.max(peak, Math.abs(sample))
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThan(4)
  })
})
