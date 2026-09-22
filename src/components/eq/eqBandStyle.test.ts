import { describe, expect, it } from 'vitest'
import { eqBandColorForHz } from '../../audio/engine/spectrumRegions'
import { eqStripAccentVars } from './eqBandStyle'

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
