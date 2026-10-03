import 'node-web-audio-api/polyfill.js'
import { describe, expect, it } from 'vitest'
import { AudioEngine } from '../engine/AudioEngine'
import { createDefaultEffect } from './effectInstance'
import { isRandomizable } from '../random/distributions'

function engine(): AudioEngine {
  if (typeof window.setTimeout !== 'function') window.setTimeout = setTimeout as typeof window.setTimeout
  return new AudioEngine()
}

describe('effect instance defaults', () => {
  it('clones a fresh parameter object for every instance', () => {
    const a = createDefaultEffect('delay', 'delay-a')
    const b = createDefaultEffect('delay', 'delay-b')
    expect(a && b).toBeTruthy()
    if (!a || !b) return
    a.params.delayTime = 100
    expect(b.params.delayTime).not.toBe(100)
    expect(a.params).not.toBe(b.params)
  })
})

describe('duplicate effect instances', () => {
  it('keeps Delay A, B, and C independent across focus and preset reload', async () => {
    const audio = engine()
    await audio.unlock()
    const a = audio.insertModule('delay', 0)
    const b = audio.insertModule('delay', 1)
    const c = audio.insertModule('delay', 2)
    expect(a && b && c).toBeTruthy()
    if (!a || !b || !c) return

    audio.focusEffect(a)
    audio.setParam('delayTime', 100)
    audio.setParam('delayFeedback', 10)
    audio.setParam('delayWet', 20)
    audio.setFxLfo('delay', 0, { enabled: true, rateHz: 0.25, depth: 20 })
    audio.armAutomation('delayTime')

    audio.focusEffect(b)
    expect(audio.getSnapshot().params.delayTime).not.toBe(100)
    audio.setParam('delayTime', 900)
    audio.setParam('delayFeedback', 70)
    audio.setParam('delayWet', 60)
    audio.setFxLfo('delay', 0, { enabled: true, rateHz: 4, depth: 80 })
    expect(audio.getSnapshot().automation.lanes.some((lane) => lane.paramId === 'delayTime')).toBe(false)

    audio.focusEffect(c)
    audio.setParam('delayTime', 450)
    audio.setParam('delayFeedback', 30)
    audio.setParam('delayWet', 40)

    audio.focusEffect(a)
    expect(audio.getSnapshot().params.delayTime).toBe(100)
    expect(audio.getSnapshot().params.delayFeedback).toBe(10)
    expect(audio.getSnapshot().params.delayWet).toBe(20)
    expect(audio.getSnapshot().fxLfos.delay[0]?.rateHz).toBe(0.25)
    expect(audio.getSnapshot().automation.lanes.some((lane) => lane.paramId === 'delayTime' && lane.effectId === a)).toBe(true)

    audio.focusEffect(b)
    expect(audio.getSnapshot().params.delayTime).toBe(900)
    expect(audio.getSnapshot().params.delayFeedback).toBe(70)
    expect(audio.getSnapshot().params.delayWet).toBe(60)
    expect(audio.getSnapshot().fxLfos.delay[0]?.rateHz).toBe(4)

    const preset = audio.toPreset()
    const restored = engine()
    await restored.unlock()
    restored.applyPreset(preset)
    restored.focusEffect(a)
    expect(restored.getSnapshot().params.delayTime).toBe(100)
    restored.focusEffect(b)
    expect(restored.getSnapshot().params.delayWet).toBe(60)
    restored.focusEffect(a)
    expect(restored.getSnapshot().params.delayTime).toBe(100)
  })

  it('keeps a second EQ, reverb, filter, and compressor on their own values', async () => {
    const audio = engine()
    await audio.unlock()
    const eqA = audio.insertModule('eq', 0)
    const eqB = audio.insertModule('eq', 1)
    const reverbA = audio.insertModule('reverb', 2)
    const reverbB = audio.insertModule('reverb', 3)
    const filterA = audio.insertModule('filter', 4)
    const filterB = audio.insertModule('filter', 5)
    const compA = audio.insertModule('compressor', 6)
    const compB = audio.insertModule('compressor', 7)
    expect([eqA, eqB, reverbA, reverbB, filterA, filterB, compA, compB].every(Boolean)).toBe(true)
    if (!eqA || !eqB || !reverbA || !reverbB || !filterA || !filterB || !compA || !compB) return

    audio.setEqBand(0, { frequency: 120, gain: 3, type: 'peaking' }, eqA)
    audio.setEqBand(0, { frequency: 6400, gain: -4, type: 'peaking' }, eqB)
    expect(audio.getSnapshot().eqById[eqA]?.bands[0]?.frequency).toBe(120)
    expect(audio.getSnapshot().eqById[eqB]?.bands[0]?.frequency).toBe(6400)

    audio.focusEffect(reverbA)
    audio.setParam('reverbWet', 15)
    audio.focusEffect(reverbB)
    audio.setParam('reverbWet', 80)
    audio.focusEffect(reverbA)
    expect(audio.getSnapshot().params.reverbWet).toBe(15)
    audio.focusEffect(reverbB)
    expect(audio.getSnapshot().params.reverbWet).toBe(80)

    audio.focusEffect(filterA)
    audio.setParam('filterCutoff', 400)
    audio.focusEffect(filterB)
    audio.setParam('filterCutoff', 8000)
    audio.focusEffect(filterA)
    expect(audio.getSnapshot().params.filterCutoff).toBe(400)

    audio.focusEffect(compA)
    audio.setParam('compressorThreshold', -24)
    audio.focusEffect(compB)
    audio.setParam('compressorThreshold', -6)
    audio.focusEffect(compA)
    expect(audio.getSnapshot().params.compressorThreshold).toBe(-24)
    audio.focusEffect(compB)
    expect(audio.getSnapshot().params.compressorThreshold).toBe(-6)
  })
})

describe('chaos safety limiter', () => {
  it('enables the existing chain limiter once and does not boost makeup', async () => {
    const audio = engine()
    await audio.unlock()
    expect(audio.getSnapshot().chain.some((mod) => mod.type === 'limiter')).toBe(false)
    audio.setChaos(true)
    const first = audio.getSnapshot().chain.filter((mod) => mod.type === 'limiter')
    expect(first).toHaveLength(1)
    expect(first[0]?.bypassed).toBe(false)
    expect(audio.getSnapshot().params.limiterMakeup).toBe(0)
    const id = first[0]?.instanceId
    expect(id).toBeTruthy()
    if (!id) return
    audio.setModuleBypass(id, true)
    audio.setChaos(true)
    expect(audio.getSnapshot().chain.filter((mod) => mod.type === 'limiter')).toHaveLength(1)
    expect(audio.getSnapshot().chain.find((mod) => mod.instanceId === id)?.bypassed).toBe(true)
    audio.setChaos(false)
    audio.setChaos(true)
    expect(audio.getSnapshot().chain.filter((mod) => mod.type === 'limiter')).toHaveLength(1)
    expect(audio.getSnapshot().chain.find((mod) => mod.type === 'limiter')?.bypassed).toBe(false)
    expect(audio.getSnapshot().params.limiterMakeup).toBe(0)
    expect(isRandomizable('limiterThreshold')).toBe(false)
    expect(isRandomizable('limiterMakeup')).toBe(false)
    expect(isRandomizable('limiterCeiling')).toBe(false)
  })
})
