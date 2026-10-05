import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../audio/engine/AudioEngine'
import { applySimpleDelay, applySimpleReverb, applySimpleTone } from './applySimple'

describe('simple presets open the existing processors', () => {
  it('inserts EQ, reverb, and delay into an empty chain and writes their parameters', () => {
    const engine = new AudioEngine()
    expect(engine.getSnapshot().chain.map((mod) => mod.type)).toEqual(['gain', 'output'])

    applySimpleTone(engine, 'moreBass', 1)
    const tone = engine.getSnapshot()
    expect(tone.chain.find((mod) => mod.type === 'eq')?.bypassed).toBe(false)
    expect(tone.eqBands[0]?.type).toBe('lowshelf')
    expect(tone.eqBands[0]?.gain ?? 0).toBeGreaterThan(3)

    applySimpleTone(engine, 'natural', 0)
    expect(engine.getSnapshot().chain.find((mod) => mod.type === 'eq')?.bypassed).toBe(true)

    applySimpleReverb(engine, 'medium', 0.5)
    const reverb = engine.getSnapshot()
    expect(reverb.chain.find((mod) => mod.type === 'reverb')?.bypassed).toBe(false)
    expect(reverb.params.reverbWet).toBeGreaterThan(10)
    expect(reverb.params.reverbWet).toBeLessThanOrEqual(40)
    expect(reverb.params.reverbDecay).toBeGreaterThan(0.8)

    applySimpleDelay(engine, 'short', 0.4)
    const delay = engine.getSnapshot()
    expect(delay.chain.find((mod) => mod.type === 'delay')?.bypassed).toBe(false)
    expect(delay.params.delayTime).toBe(90)
    expect(delay.params.delayWet).toBeGreaterThan(5)
    expect(delay.params.delayFeedback).toBeLessThanOrEqual(30)

    expect(delay.chain.some((mod) => mod.type === 'eq')).toBe(true)
    expect(delay.chain.some((mod) => mod.type === 'reverb')).toBe(true)
  })
})
