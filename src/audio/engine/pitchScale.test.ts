import { describe, expect, it } from 'vitest'
import {
  formatFreqTick,
  formatHoverFreq,
  hzFromLogAxis,
  hzToNoteName,
  midiToHz,
  midiToNoteName,
  musicalScaleHz,
} from './pitchScale'

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
    expect(formatFreqTick(25000)).toBe('25k')
  })

  it('inverts a log frequency axis', () => {
    expect(hzFromLogAxis(0, 20, 20000)).toBeCloseTo(20)
    expect(hzFromLogAxis(1, 20, 20000)).toBeCloseTo(20000)
    expect(hzFromLogAxis(0.5, 20, 20000)).toBeCloseTo(Math.sqrt(20 * 20000))
  })

  it('formats a cursor readout with note name', () => {
    expect(formatHoverFreq(440)).toBe('440 Hz · A4')
    expect(formatHoverFreq(2000)).toMatch(/2\.00 kHz/)
  })
})
