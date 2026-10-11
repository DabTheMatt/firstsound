import { describe, expect, it } from 'vitest'
import { paintIntervalMs } from '../app/frameBudget'
import {
  noticeShown,
  presentMeterPercent,
  presentationTokens,
  readVisualActivity,
  resolveSensoryPresentation,
  sensoryCalmFactors,
  tempoNoticePriority,
  type SensoryComfortInput,
} from './sensoryComfort'

const OFF: SensoryComfortInput = {
  reduceMotion: false,
  sensoryComfort: false,
  visualActivity: 'low',
  reduceDecorativeMotion: true,
  calmMeters: true,
  calmSpectrum: true,
  reduceVisualEffects: true,
  quietNotifications: true,
}

describe('sensory comfort presentation', () => {
  it('stays visually standard while the master is off', () => {
    const presentation = resolveSensoryPresentation(OFF, false)
    expect(presentation.active).toBe(false)
    expect(presentation.visualActivity).toBe('standard')
    expect(presentation.calmMeters).toBe(false)
    expect(presentation.calmSpectrum).toBe(false)
    expect(presentation.reduceVisualEffects).toBe(false)
    expect(presentation.quietNotifications).toBe(false)
    expect(presentation.reduceDecorativeMotion).toBe(false)
    expect(presentationTokens(presentation).motionDuration).toBe('180ms')
    expect(sensoryCalmFactors(presentation)).toBeNull()
  })

  it('applies the calm profile when the master is on', () => {
    const presentation = resolveSensoryPresentation({ ...OFF, sensoryComfort: true }, false)
    expect(presentation.visualActivity).toBe('low')
    expect(presentation.reduceDecorativeMotion).toBe(true)
    expect(presentation.calmMeters).toBe(true)
    expect(presentation.calmSpectrum).toBe(true)
    expect(presentation.reduceVisualEffects).toBe(true)
    expect(presentation.quietNotifications).toBe(true)
    expect(presentation.motionReduced).toBe(false)
    const tokens = presentationTokens(presentation)
    expect(tokens.motionDuration).toBe('0ms')
    expect(Number(tokens.glowIntensity)).toBeLessThan(1)
  })

  it('lets a stored choice override one behavior without turning the master off', () => {
    const presentation = resolveSensoryPresentation(
      { ...OFF, sensoryComfort: true, calmMeters: false, visualActivity: 'standard' },
      false,
    )
    expect(presentation.active).toBe(true)
    expect(presentation.calmMeters).toBe(false)
    expect(presentation.visualActivity).toBe('standard')
    expect(presentation.calmSpectrum).toBe(true)
  })

  it('keeps reduced motion independent of sensory comfort', () => {
    const field = resolveSensoryPresentation({ ...OFF, reduceMotion: true }, false)
    const system = resolveSensoryPresentation(OFF, true)
    const both = resolveSensoryPresentation({ ...OFF, sensoryComfort: true, reduceMotion: true }, true)
    expect(field.motionReduced).toBe(true)
    expect(field.active).toBe(false)
    expect(field.reduceDecorativeMotion).toBe(true)
    expect(field.calmMeters).toBe(false)
    expect(system.motionReduced).toBe(true)
    expect(system.active).toBe(false)
    expect(both.motionReduced).toBe(true)
    expect(both.active).toBe(true)
    expect(both.calmSpectrum).toBe(true)
  })

  it('rejects unknown visual activity values', () => {
    expect(readVisualActivity('low')).toBe('low')
    expect(readVisualActivity('standard')).toBe('standard')
    expect(readVisualActivity('ultra')).toBe('low')
    expect(readVisualActivity(2)).toBe('low')
    expect(readVisualActivity(null)).toBe('low')
  })

  it('quantizes only the drawn meter percent', () => {
    expect(presentMeterPercent(47.2, false)).toBe(47.2)
    expect(presentMeterPercent(47.2, true)).toBe(48)
    expect(presentMeterPercent(Number.NaN, true)).toBe(0)
    expect(presentMeterPercent(140, true)).toBe(100)
  })

  it('keeps critical notices and quiets informational ones', () => {
    expect(noticeShown('critical', true)).toBe(true)
    expect(noticeShown('action', true)).toBe(true)
    expect(noticeShown('informational', true)).toBe(false)
    expect(noticeShown('decorative', true)).toBe(false)
    expect(noticeShown('informational', false)).toBe(true)
    expect(tempoNoticePriority('Load a sample first.')).toBe('action')
    expect(tempoNoticePriority('No steady tempo found in this sample.')).toBe('action')
    expect(tempoNoticePriority('Detected 120.0 BPM.')).toBe('informational')
    expect(noticeShown(tempoNoticePriority('Detected 120.0 BPM.'), true)).toBe(false)
    expect(noticeShown(tempoNoticePriority('Load a sample first.'), true)).toBe(true)
  })

  it('slows decorative paint without changing the standard cadence', () => {
    expect(paintIntervalMs(true)).toBe(33)
    expect(paintIntervalMs(false)).toBe(80)
    expect(paintIntervalMs(true, 'low')).toBeGreaterThan(paintIntervalMs(true))
    expect(paintIntervalMs(false, 'low')).toBeGreaterThan(paintIntervalMs(false))
  })
})
