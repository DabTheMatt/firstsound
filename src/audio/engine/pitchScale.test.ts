import { describe, expect, it } from 'vitest'
import {
  FREQ_SCALE_HZ,
  formatFreqTick,
  formatHoverFreq,
  freqTickIsMajor,
  hzFromLogAxis,
  hzToNoteName,
  midiToHz,
  midiToNoteName,
  musicalScaleHz,
  visibleAxisLabelIndices,
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
    expect(formatFreqTick(22000)).toBe('22k')
  })

  it('marks major ticks on the dense 22 kHz grid', () => {
    expect(FREQ_SCALE_HZ.at(-1)).toBe(22000)
    expect(freqTickIsMajor(100)).toBe(true)
    expect(freqTickIsMajor(30)).toBe(false)
  })

  it('inverts a log frequency axis', () => {
    expect(hzFromLogAxis(0, 20, 20000)).toBeCloseTo(20)
    expect(hzFromLogAxis(1, 20, 20000)).toBeCloseTo(20000)
    expect(hzFromLogAxis(0.5, 20, 20000)).toBeCloseTo(Math.sqrt(20 * 20000))
  })

  it('hides colliding frequency labels and keeps major ticks', () => {
    const labels = [20, 30, 40, 50, 60, 80, 100].map((hz, index) => ({
      x: index * 12,
      width: 18,
      major: hz === 20 || hz === 50 || hz === 100,
    }))
    const visible = visibleAxisLabelIndices(labels, 4)
    expect(visible.has(0)).toBe(true)
    expect(visible.has(3)).toBe(true)
    expect(visible.has(6)).toBe(true)
    expect(visible.has(1)).toBe(false)
    expect(visible.has(2)).toBe(false)
    const boxes = [...visible].map((index) => labels[index]!)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!
        const b = boxes[j]!
        const gap = Math.abs(a.x - b.x) - a.width / 2 - b.width / 2
        expect(gap).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('formats a cursor readout with note name', () => {
    expect(formatHoverFreq(440)).toBe('440 Hz · A4')
    expect(formatHoverFreq(2000)).toMatch(/2\.00 kHz/)
  })
})
