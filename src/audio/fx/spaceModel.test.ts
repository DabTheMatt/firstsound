import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { delayChannelTimeSeconds, delayTaps, isDelayStereo, isReverbStereo, reverbTail } from './spaceModel'

describe('delayTaps', () => {
  it('places the first echo at delay time', () => {
    const p = defaultParamValues()
    p.delayWet = 40
    p.delayTime = 250
    p.delaySync = 0
    p.delayFeedback = 40
    const taps = delayTaps(p, 'digital', 120)
    expect(taps[0]?.time).toBeCloseTo(0.25, 3)
    expect(taps.length).toBeGreaterThan(1)
    expect(taps[1]!.gain).toBeLessThan(taps[0]!.gain)
    expect(taps[taps.length - 1]!.gain).toBeLessThan(taps[0]!.gain * 0.2)
  })

  it('ping-pong alternates L/R', () => {
    const p = defaultParamValues()
    p.delayWet = 50
    const taps = delayTaps(p, 'pingPong', 120)
    expect(taps.some((t) => t.channel === 'L')).toBe(true)
    expect(taps.some((t) => t.channel === 'R')).toBe(true)
  })

  it('syncs 1/4 notes to tempo', () => {
    const p = defaultParamValues()
    p.delayWet = 40
    p.delaySync = 1
    p.delayNote = 4
    p.delayNoteKind = 0
    p.bpm = 90
    const taps = delayTaps(p, 'digital', p.bpm)
    expect(taps[0]?.time).toBeCloseTo(60 / 90, 3)
  })
})

describe('delay channel times', () => {
  it('lets L and R sync to different notes in stereo', () => {
    const p = defaultParamValues()
    p.delayStereo = 1
    p.bpm = 120
    p.delaySync = 1
    p.delayNote = 4
    p.delayNoteKind = 0
    p.delaySyncR = 1
    p.delayNoteR = 3
    p.delayNoteKindR = 1
    expect(isDelayStereo(p)).toBe(true)
    expect(delayChannelTimeSeconds(p, 120, 'L')).toBeCloseTo(0.5, 3)
    expect(delayChannelTimeSeconds(p, 120, 'R')).toBeCloseTo(0.375, 3)
  })

  it('uses one time for both channels in mono', () => {
    const p = defaultParamValues()
    p.delayStereo = 0
    p.delaySync = 0
    p.delayTime = 200
    p.delayTimeR = 800
    expect(delayChannelTimeSeconds(p, 120, 'L')).toBeCloseTo(0.2, 3)
    expect(delayChannelTimeSeconds(p, 120, 'R')).toBeCloseTo(0.2, 3)
  })
})

describe('isReverbStereo', () => {
  it('follows the stereo switch', () => {
    const p = defaultParamValues()
    p.reverbStereo = 1
    expect(isReverbStereo(p)).toBe(true)
    p.reverbStereo = 0
    expect(isReverbStereo(p)).toBe(false)
  })
})

describe('reverbTail', () => {
  it('offsets the tail by pre-delay', () => {
    const p = defaultParamValues()
    p.reverbWet = 40
    p.reverbPredelay = 80
    p.reverbSync = 0
    const tail = reverbTail(p, 'hall', 120)
    expect(tail.predelay).toBeCloseTo(0.08, 3)
    expect(tail.duration).toBeGreaterThan(0.2)
    expect(tail.early.length).toBeGreaterThan(0)
  })

  it('freeze and reverse types change the tail', () => {
    const p = defaultParamValues()
    p.reverbWet = 50
    p.reverbFreeze = 1
    expect(reverbTail(p, 'infinite', 120).freeze).toBe(true)
    expect(reverbTail(p, 'reverse', 120).reverse).toBe(true)
  })
})
