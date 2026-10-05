import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../audio/parameters/definitions'
import type { ParamId } from '../audio/parameters/types'
import { fadeSecondsForStep, fadeStepFromSeconds } from './fadeSteps'
import { applyToneToChannels } from './applyToneEq'
import {
  delayParamPatch,
  matchSimpleDelay,
  matchSimpleReverb,
  reverbParamPatch,
  REVERB_WET_MAX,
  DELAY_WET_MAX,
  simpleDelayPresets,
  simpleReverbPresets,
} from './fxPresets'
import { bypassSimpleListen, simpleProcessingIsAdvanced } from './simpleMonitor'
import { eqLooksFlat, matchSimpleTone, SIMPLE_TONE_IDS, simpleToneMatchesBands, toneBandsAt } from './tonePresets'
import { defaultEqBands } from '../audio/engine/eqBands'
import type { DspSnapshot } from '../sensory/mapping/mappingEngine'
import { defaultFxLfos } from '../audio/fx/lfo'

describe('fade steps', () => {
  it('hides millisecond values behind named lengths', () => {
    expect(fadeStepFromSeconds(0)).toBe('none')
    expect(fadeStepFromSeconds(0.08)).toBe('short')
    expect(fadeStepFromSeconds(0.18)).toBe('medium')
    expect(fadeStepFromSeconds(0.4)).toBe('long')
    expect(fadeSecondsForStep('long', 0.4)).toBeLessThan(0.2)
  })
})

describe('simple tone presets', () => {
  it('keeps full-strength moves audible without extreme boosts', () => {
    const bass = toneBandsAt('moreBass', 1)
    const low = bass[0]
    expect(low?.type).toBe('lowshelf')
    expect(low?.gain ?? 0).toBeGreaterThan(6)
    expect(Math.abs(low?.gain ?? 0)).toBeLessThanOrEqual(12)
    const clearer = toneBandsAt('clearer', 1)
    expect(clearer.some((band) => Math.abs(band.gain) > 3)).toBe(true)
    expect(clearer.some((band) => Math.abs(band.gain) > 12)).toBe(false)
  })

  it('returns to a flat curve when the character is natural', () => {
    const shaped = toneBandsAt('moreBass', 1)
    expect(eqLooksFlat(shaped, false)).toBe(false)
    const neutral = toneBandsAt('natural', 1)
    expect(eqLooksFlat(neutral, false)).toBe(true)
    expect(toneBandsAt('moreBass', 0.35)[0]?.gain).toBeCloseTo(toneBandsAt('moreBass', 0.35)[0]?.gain ?? 0)
  })

  it('matches a written preset and reports custom otherwise', () => {
    expect(matchSimpleTone(toneBandsAt('brighter', 0.7), false).id).toBe('brighter')
    expect(eqLooksFlat(toneBandsAt('natural', 0), true)).toBe(true)
    const custom = toneBandsAt('moreBass', 1)
    custom[2] = { ...custom[2]!, type: 'peaking', frequency: 1800, gain: 6, q: 4, slope: 12 }
    expect(matchSimpleTone(custom, false).id).toBe('custom')
  })

  it('drops a sticky tone when undo restores a different EQ', () => {
    expect(simpleToneMatchesBands('moreBass', 0.35, toneBandsAt('moreBass', 0.35))).toBe(true)
    expect(simpleToneMatchesBands('moreBass', 0, toneBandsAt('moreBass', 0))).toBe(true)
    expect(simpleToneMatchesBands('moreBass', 0.35, toneBandsAt('natural', 0))).toBe(false)
    expect(matchSimpleTone(toneBandsAt('natural', 0), false).id).toBe('natural')
    expect(matchSimpleTone(toneBandsAt('brighter', 0.55), false).id).toBe('brighter')
  })

  it('keeps every preset identity across the full slider, including below 10%', () => {
    for (const id of SIMPLE_TONE_IDS) {
      for (let amount = 0; amount <= 100; amount += 1) {
        const t = amount / 100
        const bands = toneBandsAt(id, t)
        const matched = matchSimpleTone(bands, false, id)
        expect(matched.id, `${id} at ${amount}%`).toBe(id)
        if (amount > 0 && id !== 'natural') expect(matched.id).not.toBe('custom')
      }
    }
  })

  it('applies EQ to PCM without exploding amplitude', () => {
    const sine = new Float32Array(512)
    for (let i = 0; i < sine.length; i++) sine[i] = Math.sin((i / 512) * Math.PI * 8)
    const out = applyToneToChannels([sine], 44100, toneBandsAt('moreBass', 1), 0)[0]!
    let peak = 0
    for (const sample of out) peak = Math.max(peak, Math.abs(sample))
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThan(4)
  })
})

describe('simple effect presets', () => {
  it('maps reverb and delay onto existing parameter ids inside a conservative range', () => {
    const params = defaultParamValues()
    for (const id of ['small', 'medium', 'large'] as const) {
      const patch = reverbParamPatch(id, 1)
      for (const key of Object.keys(patch) as ParamId[]) expect(params[key]).toEqual(expect.any(Number))
      expect(patch.reverbWet).toBe(REVERB_WET_MAX)
      expect(patch.reverbWet ?? 0).toBeLessThanOrEqual(55)
      expect(patch.reverbDecay ?? 0).toBeLessThanOrEqual(2.4)
      expect(patch.reverbCorrelate).toBe(1)
    }
    for (const id of ['short', 'medium', 'long'] as const) {
      const patch = delayParamPatch(id, 1)
      for (const key of Object.keys(patch) as ParamId[]) expect(params[key]).toEqual(expect.any(Number))
      expect(patch.delayWet).toBe(DELAY_WET_MAX)
      expect(patch.delayFeedback ?? 0).toBeLessThanOrEqual(40)
      expect(patch.delayCorrelate).toBe(1)
    }
    expect(reverbParamPatch('medium', 0).reverbWet).toBe(0)
    expect(simpleReverbPresets.small.decay).toBeLessThan(simpleReverbPresets.large.decay)
    expect(simpleDelayPresets.short.time).toBeLessThan(simpleDelayPresets.long.time)
  })

  it('round-trips a simple reverb or delay and leaves unrelated settings custom', () => {
    const medium = reverbParamPatch('medium', 0.2)
    expect(
      matchSimpleReverb({
        bypassed: false,
        type: 'hall',
        wet: medium.reverbWet ?? 0,
        size: medium.reverbSize ?? 0,
        decay: medium.reverbDecay ?? 0,
        predelay: medium.reverbPredelay ?? 0,
        correlate: 1,
      }),
    ).toMatchObject({ kind: 'preset', id: 'medium' })
    expect(
      matchSimpleReverb({
        bypassed: true,
        type: 'hall',
        wet: 20,
        size: 40,
        decay: 1,
        predelay: 14,
        correlate: 1,
      }).kind,
    ).toBe('off')
    expect(
      matchSimpleReverb({
        bypassed: false,
        type: 'shimmer',
        wet: 20,
        size: 40,
        decay: 1.05,
        predelay: 14,
        correlate: 1,
      }).kind,
    ).toBe('custom')

    const short = delayParamPatch('short', 0.1)
    expect(
      matchSimpleDelay({
        bypassed: false,
        type: 'digital',
        wet: short.delayWet ?? 0,
        wetR: short.delayWetR ?? 0,
        time: short.delayTime ?? 0,
        feedback: short.delayFeedback ?? 0,
        sync: 0,
        correlate: 1,
      }),
    ).toMatchObject({ kind: 'preset', id: 'short' })
    expect(
      matchSimpleDelay({
        bypassed: false,
        type: 'reverse',
        wet: 10,
        wetR: 10,
        time: 90,
        feedback: 16,
        sync: 0,
        correlate: 1,
      }).kind,
    ).toBe('custom')
  })

  it('flags technical processing and does not rewrite it while bypassing for compare', () => {
    const bands = defaultEqBands()
    const base = {
      chain: [
        { type: 'eq' as const, bypassed: true },
        { type: 'reverb' as const, bypassed: true },
        { type: 'delay' as const, bypassed: true },
        { type: 'filter' as const, bypassed: true },
      ],
      eqBands: bands,
      eqBypassed: true,
      reverb: { bypassed: true, type: 'hall' as const, wet: 0, size: 50, decay: 1.6, predelay: 18, correlate: 1 },
      delay: {
        bypassed: true,
        type: 'digital' as const,
        wet: 0,
        wetR: 0,
        time: 300,
        feedback: 28,
        sync: 0,
        correlate: 1,
      },
      automationLaneCount: 0,
      lfoRouted: false,
      chaos: false,
    }
    expect(simpleProcessingIsAdvanced(base)).toBe(false)
    expect(simpleProcessingIsAdvanced({ ...base, chain: base.chain.map((mod) => (mod.type === 'filter' ? { ...mod, bypassed: false } : mod)) })).toBe(true)
    expect(simpleProcessingIsAdvanced({ ...base, chaos: true })).toBe(true)

    const dsp = {
      params: defaultParamValues(),
      eqBands: toneBandsAt('moreBass', 0.35),
      bypass: { eq: false, reverb: false, delay: false, filter: false },
      fxLfos: defaultFxLfos(),
      reverbType: 'hall' as const,
    } satisfies DspSnapshot
    const monitored = bypassSimpleListen(dsp)
    expect(monitored.eqBands[0]?.gain).toBe(dsp.eqBands[0]?.gain)
    expect(monitored.params.reverbSize).toBe(dsp.params.reverbSize)
    expect(monitored.params.reverbWet).toBe(dsp.params.reverbWet)
    expect(monitored.bypass.eq).toBe(true)
    expect(monitored.bypass.reverb).toBe(true)
    expect(monitored.bypass.delay).toBe(true)
    expect(monitored.bypass.filter).toBe(false)
  })
})
