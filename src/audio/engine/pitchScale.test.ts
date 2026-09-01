import { describe, expect, it } from 'vitest'
import { formatFreqTick, hzToNoteName, midiToHz, midiToNoteName, musicalScaleHz } from './pitchScale'

describe('pitchScale', () => {
  it('names A4 and C4 from frequency', () => {
    expect(hzToNoteName(440)).toBe('A4')
    expect(hzToNoteName(midiToHz(60))).toBe('C4')
    expect(midiToNoteName(60)).toBe('C4')
  })

  it('lists C notes in the audible range', () => {
    const ticks = musicalScaleHz(20, 20000)
    expect(ticks.some((t) => t.label === 'C4')).toBe(true)
    expect(ticks.some((t) => t.label === 'A4')).toBe(true)
    expect(ticks[0]!.hz).toBeLessThan(ticks.at(-1)!.hz)
  })

  it('formats frequency ticks', () => {
    expect(formatFreqTick(20)).toBe('20')
    expect(formatFreqTick(1000)).toBe('1k')
    expect(formatFreqTick(20000)).toBe('20k')
  })
})
