import { describe, expect, it } from 'vitest'
import { eqGraphLayers, eqFocusReadout, formatEqFocusGain } from './eqFocusGraph'

describe('eq focus graph', () => {
  it('drops per-band, ghost, and filter curves from the clean graph', () => {
    expect(eqGraphLayers(true)).toEqual(['spectrum', 'combined'])
    expect(eqGraphLayers(true)).not.toContain('perBand')
  })

  it('keeps analysis overlays only outside the clean EQ graph', () => {
    expect(eqGraphLayers(false)).toEqual(['spectrum', 'combined', 'storedGhost', 'filter'])
    expect(eqGraphLayers(false)).not.toContain('perBand')
  })

  it('formats the selected node without a second curve', () => {
    expect(formatEqFocusGain(3)).toBe('+3.0 dB')
    expect(formatEqFocusGain(-1.26)).toBe('-1.3 dB')
    expect(
      eqFocusReadout(1, { type: 'peaking', frequency: 1000, gain: 2, q: 1 }, (type) => type),
    ).toEqual({ title: 'peaking 2', frequency: '1k', detail: '+2.0 dB' })
    expect(eqFocusReadout(0, { type: 'off', frequency: 100, gain: 0, q: 1 }, (type) => type)).toBeNull()
    expect(
      eqFocusReadout(0, { type: 'highpass', frequency: 120, gain: 0, q: 0.7 }, () => 'HP'),
    ).toEqual({ title: 'HP 1', frequency: '120', detail: 'Q 0.70' })
  })
})
