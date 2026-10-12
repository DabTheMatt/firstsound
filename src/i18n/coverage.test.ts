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
  ['export.checkTitle', EN.export.checkTitle, PL.export.checkTitle],
  ['export.noAudio', EN.export.noAudio, PL.export.noAudio],
  ['export.settingsValid', EN.export.settingsValid, PL.export.settingsValid],
  ['export.checkRange', EN.export.checkRange, PL.export.checkRange],
  ['export.preview', EN.export.preview, PL.export.preview],
  ['export.previewPreparing', EN.export.previewPreparing, PL.export.previewPreparing],
  ['export.previewFailed', EN.export.previewFailed, PL.export.previewFailed],
  ['export.previewStopPlayback', EN.export.previewStopPlayback, PL.export.previewStopPlayback],
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
