import { describe, expect, it } from 'vitest'
import {
  nextSavedThemeName,
  parseCustomThemeColors,
  parseSavedThemes,
  parseThemePreference,
  resolveTheme,
  THEME_IDS,
  userThemeId,
  userThemePreference,
} from './tokens'
import { customColorsFromComputed } from './theme'
import { colorWithAlpha, mixCssColor, parseCssColor, toCssHex } from './cssColor'

describe('theme tokens', () => {
  it('defaults unknown storage values to studio-dark', () => {
    expect(parseThemePreference(null)).toBe('studio-dark')
    expect(parseThemePreference('')).toBe('studio-dark')
    expect(parseThemePreference('neon')).toBe('studio-dark')
  })

  it('accepts named themes and system', () => {
    expect(parseThemePreference('oled')).toBe('oled')
    expect(parseThemePreference('system')).toBe('system')
    expect(parseThemePreference('custom')).toBe('custom')
    expect(parseThemePreference('user:s12abc')).toBe('user:s12abc')
    expect(THEME_IDS).toContain('light-studio')
    expect(THEME_IDS).toContain('dusk')
    expect(THEME_IDS).toContain('custom')
    expect(parseThemePreference('dusk')).toBe('dusk')
  })

  it('maps system preference to studio-dark or light-studio', () => {
    expect(resolveTheme('system', true)).toBe('studio-dark')
    expect(resolveTheme('system', false)).toBe('light-studio')
    expect(resolveTheme('forest', false)).toBe('forest')
    expect(resolveTheme('user:s1', true)).toBe('custom')
    expect(userThemeId(userThemePreference('abc'))).toBe('abc')
  })

  it('parses saved themes and unique names', () => {
    const parsed = parseSavedThemes([
      { id: 'a', name: '  Moss  ', colors: { accent: '#72b98a' } },
      { id: 'a', name: 'dup' },
      { id: '', name: 'nope' },
      null,
    ])
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.name).toBe('Moss')
    expect(parsed[0]?.colors.accent).toBe('#72b98a')
    expect(nextSavedThemeName([], 'My theme')).toBe('My theme')
    expect(nextSavedThemeName([{ name: 'My theme' }])).toBe('My theme 2')
  })
})

describe('css color helpers', () => {
  it('parses hex and rgb and applies alpha', () => {
    expect(parseCssColor('#E6AD48')).toEqual({ r: 230, g: 173, b: 72, a: 1 })
    expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 })
    expect(colorWithAlpha('#67B36D', 0.2)).toBe('rgba(103, 179, 109, 0.2)')
    expect(colorWithAlpha('rgba(70, 160, 200, 0.5)', 0.18)).toBe('rgba(70, 160, 200, 0.18)')
  })

  it('converts and mixes colors for custom themes', () => {
    expect(toCssHex('rgb(230, 173, 72)')).toBe('#e6ad48')
    expect(mixCssColor('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(parseCustomThemeColors({ accent: '#63b3d1', nope: 1 }).accent).toBe('#63b3d1')
    expect(parseCustomThemeColors({ accent: 'red' }).accent).toBe('#e6ad48')
  })

  it('seeds custom pickers from the active computed theme', () => {
    const next = customColorsFromComputed({
      bgApp: 'rgb(16, 21, 18)',
      textPrimary: '#e8e6df',
      accent: '#72b98a',
      waveform: '#9db5a6',
      spectrum: '#8aa090',
      playhead: '#c4e0c8',
      selectionBorder: '#72b98a',
    })
    expect(next.bgApp).toBe('#101512')
    expect(next.accent).toBe('#72b98a')
    expect(next.selection).toBe('#72b98a')
    expect(next.bgPanel).not.toBe(next.bgApp)
  })
})
