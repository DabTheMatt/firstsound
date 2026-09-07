import { describe, expect, it } from 'vitest'
import { PARAMS } from '../audio/parameters/definitions'
import { PARAM_DESCRIPTIONS, SENSORY_DESCRIPTIONS } from './descriptions'
import { applySliderKey, isSpaceKey, isTypingFromTag, isTransportShortcutTarget } from './keyboard'
import { parseA11ySettings } from './settings'
import { formatAccessibleValue } from './valueText'
import { SENSORY_AXIS_IDS } from '../sensory/sensoryParameters'
import { EN, PL } from '../i18n/messages'
import { parseLocale } from '../i18n/locale'
import { parseThemePreference, THEME_IDS } from '../theme/tokens'

describe('accessibility descriptions', () => {
  it('covers every engine parameter in both locales', () => {
    for (const id of Object.keys(PARAMS) as (keyof typeof PARAMS)[]) {
      const entry = PARAM_DESCRIPTIONS[id]
      expect(entry, id).toBeTruthy()
      expect(entry.en.length).toBeGreaterThan(12)
      expect(entry.pl.length).toBeGreaterThan(12)
      expect(entry.en.toLowerCase()).not.toContain('okrągła')
      expect(entry.pl.toLowerCase()).not.toContain('gałka służąca')
    }
  })

  it('covers every sensory axis', () => {
    for (const id of SENSORY_AXIS_IDS) {
      expect(SENSORY_DESCRIPTIONS[id].en).toBeTruthy()
      expect(SENSORY_DESCRIPTIONS[id].pl).toBeTruthy()
    }
  })
})

describe('slider keyboard', () => {
  it('moves, clamps, pages, and resets', () => {
    expect(applySliderKey({ key: 'ArrowUp', shiftKey: false }, 0.5)).toEqual({
      kind: 'value',
      normalized: 0.52,
    })
    expect(applySliderKey({ key: 'ArrowLeft', shiftKey: true }, 0.5)).toEqual({
      kind: 'value',
      normalized: 0.496,
    })
    expect(applySliderKey({ key: 'Home', shiftKey: false }, 0.4)).toEqual({ kind: 'value', normalized: 0 })
    expect(applySliderKey({ key: 'End', shiftKey: false }, 0.4)).toEqual({ kind: 'value', normalized: 1 })
    expect(applySliderKey({ key: 'PageUp', shiftKey: false }, 0.5)?.kind).toBe('value')
    expect(applySliderKey({ key: 'Delete', shiftKey: false }, 0.5)).toEqual({ kind: 'reset' })
    expect(applySliderKey({ key: 'ArrowUp', shiftKey: false }, 0.99)).toEqual({
      kind: 'value',
      normalized: 1,
    })
  })

  it('uses space for transport except while typing text', () => {
    expect(isTransportShortcutTarget(null)).toBe(true)
    expect(isSpaceKey({ code: 'Space', key: 'Unidentified' })).toBe(true)
    expect(isSpaceKey({ key: ' ' })).toBe(true)
    expect(isSpaceKey({ key: 'Spacebar' })).toBe(true)
    expect(isSpaceKey({ key: 'Enter' })).toBe(false)
    expect(isTypingFromTag('BUTTON')).toBe(false)
    expect(isTypingFromTag('A')).toBe(false)
    expect(isTypingFromTag('INPUT', 'file')).toBe(false)
    expect(isTypingFromTag('INPUT', '')).toBe(false)
    expect(isTypingFromTag('INPUT', 'checkbox')).toBe(false)
    expect(isTypingFromTag('INPUT', 'range')).toBe(false)
    expect(isTypingFromTag('SELECT')).toBe(false)
    expect(isTypingFromTag('INPUT', 'text')).toBe(true)
    expect(isTypingFromTag('INPUT', 'search')).toBe(true)
    expect(isTypingFromTag('TEXTAREA')).toBe(true)
    expect(isTypingFromTag('DIV', '', true)).toBe(true)
  })
})

describe('accessible value text', () => {
  it('speaks units instead of raw numbers', () => {
    expect(formatAccessibleValue(-6, PARAMS.gain, 'en')).toContain('decibels')
    expect(formatAccessibleValue(-6, PARAMS.gain, 'pl')).toContain('decybeli')
    expect(formatAccessibleValue(2400, PARAMS.filterCutoff, 'en')).toContain('kilohertz')
    expect(formatAccessibleValue(-30, PARAMS.pan, 'en')).toContain('left')
    expect(formatAccessibleValue(7, PARAMS.pitch, 'en')).toContain('plus')
    expect(formatAccessibleValue(7, PARAMS.pitch, 'pl')).toContain('półtonów')
  })
})

describe('a11y settings and i18n', () => {
  it('parses stored accessibility flags', () => {
    expect(parseA11ySettings({ reduceMotion: true, extra: 1 }).reduceMotion).toBe(true)
    expect(parseA11ySettings(null).shortcutsEnabled).toBe(true)
    expect(parseA11ySettings(null).lowVision).toBe(false)
  })

  it('looks up localized chrome copy', () => {
    expect(PL.a11y.skipToMain).toContain('Przejdź')
    expect(EN.a11y.theme).toContain('Low Vision')
    expect(PL.a11y.theme).toContain('słabowidzący')
    expect(EN.chain.movedBefore('Delay', 'Reverb')).toBe('Delay moved before Reverb.')
  })

  it('keeps Low Vision out of the color theme catalog', () => {
    expect(parseLocale('pl')).toBe('pl')
    expect(parseLocale('de')).toBe(null)
    expect(parseThemePreference('low-vision')).toBe('studio-dark')
    expect(THEME_IDS).not.toContain('low-vision')
    expect(parseA11ySettings({ lowVision: true }).lowVision).toBe(true)
  })
})
