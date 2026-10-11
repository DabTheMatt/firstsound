import { describe, expect, it } from 'vitest'
import providerSource from './I18nProvider.tsx?raw'
import { EN, PL } from './messages'

const CRITICAL = [
  ['simple.gain', EN.simple.gain, PL.simple.gain],
  ['simple.fadeIn', EN.simple.fadeIn, PL.simple.fadeIn],
  ['markers.open', EN.markers.open, PL.markers.open],
  ['markers.needAudio', EN.markers.needAudio, PL.markers.needAudio],
  ['a11y.title', EN.a11y.title, PL.a11y.title],
  ['header.settings', EN.header.settings, PL.header.settings],
  ['transport.export', EN.transport.export, PL.transport.export],
  ['dragFree.errFormat', EN.dragFree.errFormat, PL.dragFree.errFormat],
] as const

describe('Polish coverage', () => {
  it('translates critical user-facing strings', () => {
    for (const [id, en, pl] of CRITICAL) {
      expect(pl.length, id).toBeGreaterThan(0)
      expect(pl, id).not.toBe(en)
    }
  })

  it('does not rebuild audio when the locale changes', () => {
    expect(providerSource).not.toContain('AudioContext')
    expect(providerSource).not.toContain('AudioEngine')
  })
})
