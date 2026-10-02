import { describe, expect, it } from 'vitest'
import { EQ_FILTER_TYPES } from '../../audio/engine/eqBands'
import { focusEqKnobs, focusEqTypeOptions } from './eqFocusControls'
import { formatFocusQValue, formatFocusSlope } from './focusReadout'

describe('focus EQ controls', () => {
  it('shows only the parameters the filter actually uses', () => {
    expect(focusEqKnobs('peaking')).toEqual(['freq', 'gain', 'q'])
    expect(focusEqKnobs('lowshelf')).toEqual(['freq', 'gain', 'q', 'slope'])
    expect(focusEqKnobs('highshelf')).toEqual(['freq', 'gain', 'q', 'slope'])
    expect(focusEqKnobs('lowpass')).toEqual(['freq', 'q', 'slope'])
    expect(focusEqKnobs('highpass')).toEqual(['freq', 'q', 'slope'])
    expect(focusEqKnobs('notch')).toEqual(['freq', 'q'])
    expect(focusEqKnobs('bandpass')).toEqual(['freq', 'q'])
    expect(focusEqKnobs('off')).toEqual([])
  })

  it('lists the filter types the DSP implements', () => {
    expect(focusEqTypeOptions()).toEqual(
      EQ_FILTER_TYPES.filter((item) => item.value !== 'off').map((item) => item.value),
    )
    expect(focusEqTypeOptions()).not.toContain('off')
  })

  it('formats knob faces without a repeated unit prefix', () => {
    expect(formatFocusQValue(0.706)).toBe('0.71')
    expect(formatFocusSlope(24)).toBe('24 dB/oct')
    expect(formatFocusSlope(47.6)).toBe('48 dB/oct')
  })
})
