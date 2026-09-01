import { describe, expect, it } from 'vitest'
import { defaultParamValues } from '../parameters/definitions'
import { delayTaps, reverbTail } from './spaceModel'

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
    p.bpm = 120
    const taps = delayTaps(p, 'digital', 120)
    expect(taps[0]?.time).toBeCloseTo(0.5, 3)
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
