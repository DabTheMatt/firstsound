import { describe, expect, it } from 'vitest'
import { envelopeToParam } from '../../audio/automation/automation'
import { PARAMS } from '../../audio/parameters/definitions'
import { automationReadoutKind, formatAutomationNodeValue } from './automationValue'

describe('automation node readouts', () => {
  it('signs bipolar level and pitch around their neutral zero', () => {
    expect(automationReadoutKind(PARAMS.gain)).toBe('signed')
    expect(formatAutomationNodeValue(3.2, PARAMS.gain)).toBe('+3.2 dB')
    expect(formatAutomationNodeValue(-4, PARAMS.gain)).toBe('-4.0 dB')
    expect(formatAutomationNodeValue(0, PARAMS.gain)).toBe('0 dB')

    expect(automationReadoutKind(PARAMS.pitch)).toBe('signed')
    expect(formatAutomationNodeValue(4, PARAMS.pitch)).toBe('+4.00 st')
    expect(formatAutomationNodeValue(-12, PARAMS.pitch)).toBe('-12.00 st')
    expect(formatAutomationNodeValue(0, PARAMS.pitch)).toBe('0 st')

    expect(automationReadoutKind(PARAMS.eq1Gain)).toBe('signed')
    expect(formatAutomationNodeValue(3.2, PARAMS.eq1Gain)).toBe('+3.2 dB')
    expect(formatAutomationNodeValue(-9, PARAMS.eq1Gain)).toBe('-9.0 dB')
    expect(formatAutomationNodeValue(0, PARAMS.eq1Gain)).toBe('0 dB')
  })

  it('keeps absolute parameters in their real units without a relative sign', () => {
    expect(automationReadoutKind(PARAMS.filterCutoff)).toBe('absolute')
    expect(formatAutomationNodeValue(850, PARAMS.filterCutoff)).toBe('850 Hz')
    expect(formatAutomationNodeValue(2400, PARAMS.filterCutoff)).toBe('2.40 kHz')

    expect(automationReadoutKind(PARAMS.delayWet)).toBe('absolute')
    expect(formatAutomationNodeValue(72, PARAMS.delayWet)).toBe('72 %')

    expect(automationReadoutKind(PARAMS.pan)).toBe('absolute')
    expect(formatAutomationNodeValue(-20, PARAMS.pan)).toBe('L 20')
    expect(formatAutomationNodeValue(15, PARAMS.pan)).toBe('R 15')
    expect(formatAutomationNodeValue(0, PARAMS.pan)).toBe('C')

    expect(automationReadoutKind(PARAMS.pitchSpread)).toBe('absolute')
    expect(formatAutomationNodeValue(4, PARAMS.pitchSpread)).toBe('4.00 st')
    expect(automationReadoutKind(PARAMS.limiterThreshold)).toBe('absolute')
    expect(formatAutomationNodeValue(-6, PARAMS.limiterThreshold)).toBe('-6.0 dB')
  })

  it('signs bipolar percent amounts and reads the envelope through the parameter', () => {
    expect(automationReadoutKind(PARAMS.filterAdsAmt)).toBe('signed')
    expect(formatAutomationNodeValue(12, PARAMS.filterAdsAmt)).toBe('+12 %')
    expect(formatAutomationNodeValue(-4, PARAMS.filterAdsAmt)).toBe('-4 %')
    expect(formatAutomationNodeValue(0, PARAMS.filterAdsAmt)).toBe('0 %')

    expect(formatAutomationNodeValue(envelopeToParam('gain', 0.5), PARAMS.gain)).toBe('-6.0 dB')
    expect(formatAutomationNodeValue(envelopeToParam('delayWet', 0.72), PARAMS.delayWet)).toBe('72 %')
    expect(formatAutomationNodeValue(envelopeToParam('pan', 0.5), PARAMS.pan)).toBe('C')
  })
})
