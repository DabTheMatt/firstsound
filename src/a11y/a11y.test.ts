import { describe, expect, it, vi } from 'vitest'
import { PARAMS } from '../audio/parameters/definitions'
import { PARAM_DESCRIPTIONS, SENSORY_DESCRIPTIONS } from './descriptions'
import { applySliderKey, isImeEvent, isSpaceKey, isTypingFromTag, isTransportShortcutTarget, transportSpaceSuppressed } from './keyboard'
import {
  A11Y_STORAGE_KEY,
  A11Y_STORAGE_KEY_V1,
  applyA11yDom,
  DEFAULT_A11Y_SETTINGS,
  effectiveMotionReduced,
  motionReduced,
  parseA11ySettings,
  persistA11ySettings,
  readStoredA11ySettings,
} from './settings'
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

  it('keeps Space for checkboxes, radios, and dialogs', () => {
    expect(transportSpaceSuppressed({ tagName: 'BUTTON' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'slider' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'menuitem' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'checkbox' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'radio' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'INPUT', inputType: 'text' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'DIV', role: 'switch' })).toBe(true)
    expect(transportSpaceSuppressed({ tagName: 'BUTTON', inDialog: true })).toBe(true)
    expect(isTransportShortcutTarget(null)).toBe(true)
  })

  it('ignores keys while an IME composition is active', () => {
    expect(isImeEvent({ isComposing: true, key: 'a' })).toBe(true)
    expect(isImeEvent({ key: 'Process' })).toBe(true)
    expect(isImeEvent({ isComposing: false, key: 'a' })).toBe(false)
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
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true })
    expect(effectiveMotionReduced()).toBe(true)
    applyA11yDom({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false })
    expect(effectiveMotionReduced()).toBe(false)
    expect(parseA11ySettings(null).shortcutsEnabled).toBe(true)
    expect(parseA11ySettings(null).dragFreeEditing).toBe(false)
    expect(parseA11ySettings(null).keyboardFirst).toBe(false)
    expect(parseA11ySettings({ keyboardFirst: true }).keyboardFirst).toBe(true)
    expect(parseA11ySettings(null).accessibleWaveform).toBe(false)
    expect(parseA11ySettings({ accessibleWaveform: true }).accessibleWaveform).toBe(true)
    expect(parseA11ySettings(null).lowVision).toBe(false)
  })

  it('looks up localized chrome copy', () => {
    expect(PL.a11y.skipToMain).toContain('Przejdź')
    expect(EN.a11y.theme).toContain('Low Vision')
    expect(PL.a11y.theme).toContain('słabowidzący')
    expect(EN.a11y.accessTitle).toBe('FIELD ACCESS')
    expect(PL.a11y.accessTitle).toBe('FIELD ACCESS')
    expect(PL.a11y.reduceMotion).toContain('Ogranicz ruch')
    expect(PL.a11y.focus).toContain('fokus')
    expect(PL.a11y.larger).toContain('Większe')
    expect(PL.a11y.restore).toContain('dostępności')
    expect(EN.a11y.reducedMotionSystem.toLowerCase()).toContain('device')
    expect(EN.a11y.dragFree).toBe('Drag-Free Editing')
    expect(EN.a11y.dragFreeHelp).toContain('buttons and exact values')
    expect(PL.a11y.dragFree).toBe('Edytowanie bez przeciągania')
    expect(PL.a11y.dragFreeHelp).toContain('bez przeciągania')
    expect(EN.a11y.keyboardFirst).toBe('Keyboard-First')
    expect(EN.a11y.keyboardFirstHelp).toContain('without a mouse')
    expect(PL.a11y.keyboardFirst).toBe('Obsługa klawiaturą')
    expect(PL.a11y.keyboardFirstHelp).toBe('Nawiguj i edytuj dźwięk bez używania myszy.')
    expect(EN.a11y.waveformNav).toBe('Accessible Waveform Navigation')
    expect(EN.a11y.waveformNavHelp).toBe('Navigate recordings using time, keyboard controls and audio landmarks.')
    expect(PL.a11y.waveformNav).toBe('Dostępna nawigacja po nagraniu')
    expect(PL.a11y.waveformNavHelp).toBe('Poruszaj się po nagraniu za pomocą czasu, klawiatury i punktów charakterystycznych.')
    expect(EN.chain.moveBefore('Reverb', 'Delay')).toBe('Move Reverb before Delay')
    expect(EN.chain.movedBefore('Delay', 'Reverb')).toBe('Delay moved before Reverb.')
  })

  it('keeps Low Vision out of the color theme catalog', () => {
    expect(parseLocale('pl')).toBe('en')
    expect(parseLocale('de')).toBe(null)
    expect(parseThemePreference('low-vision')).toBe('studio-dark')
    expect(THEME_IDS).not.toContain('low-vision')
    expect(parseA11ySettings({ lowVision: true }).lowVision).toBe(true)
  })

  it('ignores invalid values and unknown keys', () => {
    const parsed = parseA11ySettings({
      reduceMotion: 'yes',
      enhancedFocus: true,
      largerInterface: 1,
      extra: true,
      version: 1,
    })
    expect(parsed.reduceMotion).toBe(false)
    expect(parsed.enhancedFocus).toBe(true)
    expect(parsed.largerInterface).toBe(false)
    expect(parsed.shortcutsEnabled).toBe(true)
    expect('extra' in parsed).toBe(false)
  })

  it('treats system reduced motion as effective even when the toggle is off', () => {
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false }, true)).toBe(true)
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: false }, false)).toBe(false)
    expect(motionReduced({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true }, false)).toBe(true)
  })

  it('stores a versioned payload and falls back from corrupt JSON', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    })
    persistA11ySettings({ ...DEFAULT_A11Y_SETTINGS, reduceMotion: true })
    const raw = store.get(A11Y_STORAGE_KEY_V1)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw ?? '{}').version).toBe(1)
    expect(readStoredA11ySettings().reduceMotion).toBe(true)
    store.set(A11Y_STORAGE_KEY_V1, '{')
    expect(readStoredA11ySettings().reduceMotion).toBe(false)
    store.delete(A11Y_STORAGE_KEY_V1)
    store.set(A11Y_STORAGE_KEY, JSON.stringify({ largerInterface: true, nope: 4 }))
    expect(readStoredA11ySettings().largerInterface).toBe(true)
    vi.unstubAllGlobals()
  })
})
