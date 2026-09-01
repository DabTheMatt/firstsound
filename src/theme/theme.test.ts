import { describe, expect, it } from 'vitest'
import { parseThemePreference, resolveTheme, THEME_IDS } from './tokens'
import { colorWithAlpha, parseCssColor } from './cssColor'

describe('theme tokens', () => {
  it('defaults unknown storage values to studio-dark', () => {
    expect(parseThemePreference(null)).toBe('studio-dark')
    expect(parseThemePreference('')).toBe('studio-dark')
    expect(parseThemePreference('neon')).toBe('studio-dark')
  })

  it('accepts named themes and system', () => {
    expect(parseThemePreference('oled')).toBe('oled')
    expect(parseThemePreference('system')).toBe('system')
    expect(THEME_IDS).toContain('light-studio')
  })

  it('maps system preference to studio-dark or light-studio', () => {
    expect(resolveTheme('system', true)).toBe('studio-dark')
    expect(resolveTheme('system', false)).toBe('light-studio')
    expect(resolveTheme('forest', false)).toBe('forest')
  })
})

describe('css color helpers', () => {
  it('parses hex and rgb and applies alpha', () => {
    expect(parseCssColor('#E6AD48')).toEqual({ r: 230, g: 173, b: 72, a: 1 })
    expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 })
    expect(colorWithAlpha('#67B36D', 0.2)).toBe('rgba(103, 179, 109, 0.2)')
    expect(colorWithAlpha('rgba(70, 160, 200, 0.5)', 0.18)).toBe('rgba(70, 160, 200, 0.18)')
  })
})
