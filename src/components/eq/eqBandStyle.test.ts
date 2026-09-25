import { describe, expect, it } from 'vitest'
import { eqBandColorForHz } from '../../audio/engine/spectrumRegions'
import { eqStripAccentVars, eqStripHeading } from './eqBandStyle'

describe('eqStripAccentVars', () => {
  it('uses the instance curve when frequency coloring is off', () => {
    const vars = eqStripAccentVars({
      frequencyHz: 4000,
      instanceCurve: '#112233',
      freqColors: false,
    })
    expect(vars['--accent-primary']).toBe('#112233')
    expect(vars['--eq-band']).toBe('#112233')
  })

  it('matches the FFT node color when frequency coloring is on', () => {
    const hz = 4010
    const vars = eqStripAccentVars({
      frequencyHz: hz,
      instanceCurve: '#112233',
      freqColors: true,
    })
    expect(vars['--accent-primary']).toBe(eqBandColorForHz(hz))
    expect(vars['--eq-band']).toBe(eqBandColorForHz(hz))
  })
})

describe('eqStripHeading', () => {
  it('uses the band number when there is one EQ', () => {
    expect(eqStripHeading(1, 1, 1)).toBe('EQ 1')
    expect(eqStripHeading(1, 1, 3)).toBe('EQ 3')
  })

  it('names the processor and the band when several EQs exist', () => {
    expect(eqStripHeading(2, 2, 1)).toBe('EQ 2 · BAND 1')
    expect(eqStripHeading(3, 1, 4)).toBe('EQ 1 · BAND 4')
  })
})
