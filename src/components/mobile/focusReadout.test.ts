import { describe, expect, it } from 'vitest'
import type { EqBand } from '../../audio/engine/eqBands'
import { focusEqParts, focusEqReadout, formatFocusDb, formatFocusHz, formatFocusQ } from './focusReadout'

function band(patch: Partial<EqBand> = {}): EqBand {
  return {
    id: 'b',
    type: 'peaking',
    frequency: 2430,
    gain: 3.2,
    q: 0.71,
    slope: 12,
    bypassed: false,
    lfoExpanded: false,
    ...patch,
  }
}

describe('focus EQ readout', () => {
  it('formats frequency, gain, and Q without extra precision', () => {
    expect(formatFocusHz(47)).toBe('47 Hz')
    expect(formatFocusHz(289)).toBe('289 Hz')
    expect(formatFocusHz(2430)).toBe('2.43 kHz')
    expect(formatFocusHz(18200)).toBe('18.2 kHz')
    expect(formatFocusDb(3.24)).toBe('+3.2 dB')
    expect(formatFocusDb(-18)).toBe('-18.0 dB')
    expect(formatFocusDb(0)).toBe('0.0 dB')
    expect(formatFocusQ(0.706)).toBe('Q 0.71')
  })

  it('keeps the selected band to one line of information', () => {
    expect(focusEqReadout(band(), 0)).toEqual({
      title: 'BELL 1',
      values: '2.43 kHz  +3.2 dB  Q 0.71',
    })
  })

  it('drops gain for filters that have no gain', () => {
    expect(focusEqReadout(band({ type: 'notch', gain: 4 }), 2).values).toBe('2.43 kHz  Q 0.71')
  })

  it('shows only Q while that gesture is active', () => {
    expect(focusEqReadout(band(), 0, 'q')).toEqual({ title: '', values: 'Q 0.71' })
  })

  it('shows the center and the current modulated value on one line', () => {
    expect(
      focusEqReadout(band(), 0, 'idle', {
        frequencyHz: 1480,
        gainDb: 3.2,
        q: 0.71,
        centerHz: 1330,
        centerGainDb: 3.2,
        centerQ: 0.71,
        freqOffset: true,
        gainOffset: false,
        qLive: false,
      }).values,
    ).toBe('1.33 kHz → 1.48 kHz  +3.2 dB  Q 0.71')
  })

  it('splits the same line into fields a modulation affordance can attach to', () => {
    const parts = focusEqParts(band())
    expect(parts.map((part) => part.field)).toEqual(['freq', 'gain', 'q'])
    expect(parts.map((part) => part.text).join('  ')).toBe(focusEqReadout(band(), 0).values)
    expect(focusEqParts(band({ type: 'notch' }), 'q')).toEqual([{ field: 'q', text: 'Q 0.71' }])
  })
})
