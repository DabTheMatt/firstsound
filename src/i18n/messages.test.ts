import { describe, expect, it } from 'vitest'
import { PARAMS } from '../audio/parameters/definitions'
import type { ParamId } from '../audio/parameters/types'
import { SENSORY_AXIS_IDS } from '../sensory/sensoryParameters'
import { SIMPLE_TONE_IDS } from '../simple/tonePresets'
import { EN, PL, paramLabel } from './messages'
import { PL_PARAMS } from './plParams'

describe('i18n catalogs', () => {
  it('covers every sensory feeling in both locales', () => {
    for (const id of SENSORY_AXIS_IDS) {
      expect(EN.sensory.feelings[id]?.label).toBeTruthy()
      expect(PL.sensory.feelings[id]?.label).toBeTruthy()
    }
  })

  it('covers simple tone names in both locales', () => {
    for (const id of SIMPLE_TONE_IDS) {
      expect(EN.simple.tones[id]?.label).toBeTruthy()
      expect(PL.simple.tones[id]?.label).toBeTruthy()
    }
  })

  it('covers every ParamId in Polish', () => {
    for (const id of Object.keys(PARAMS) as ParamId[]) {
      expect(PL_PARAMS[id]).toBeTruthy()
    }
  })

  it('returns English parameter labels by default', () => {
    expect(paramLabel('en', 'gain')).toBe('Gain')
    expect(paramLabel('pl', 'gain')).toBe('Wzmocnienie')
  })

  it('uses the Polish audio glossary on controls that were easy to mistranslate', () => {
    expect(paramLabel('pl', 'compressorRatio')).toBe('Stopień kompresji')
    expect(paramLabel('pl', 'compressorMakeup')).toBe('Wzmocnienie kompensacyjne')
    expect(paramLabel('pl', 'limiterRelease')).toBe('Zwolnienie')
    expect(paramLabel('pl', 'delayFeedback')).toBe('Sprzężenie zwrotne')
    expect(PL.simple.gain).toBe('Wzmocnienie')
    expect(PL.simple.fadeIn).toBe('Narastanie')
    expect(PL.simple.fadeOut).toBe('Wygaszanie')
    expect(PL.transport.export).toBe('Eksportuj')
    expect(PL.export.checkTitle).toBe('Kontrola eksportu')
    expect(PL.export.checkRange).toBe('Zakres eksportu')
    expect(PL.simple.sampleRate).toBe('Częstotliwość próbkowania')
    expect(PL.simple.bitDepth).toBe('Głębia bitowa')
    expect(PL.simple.channels).toBe('Kanały')
    expect(PL.export.fullAudio).toBe('Całe nagranie')
    expect(PL.export.selection).toBe('Zaznaczenie')
    expect(PL.export.exportProject).toBe('Eksportuj')
    expect(PL.export.cancel).toBe('Anuluj')
    expect(PL.export.warning).toBe('Ostrzeżenie')
    expect(PL.export.error).toBe('Błąd')
    expect(PL.export.settingsValid).toBe('Ustawienia poprawne')
    expect(PL.export.noAudio).toBe('Nie wczytano pliku audio.')
    expect(EN.export.checkTitle).toBe('Export check')
    expect(EN.export.noAudio).toBe('No audio is loaded.')
    expect(EN.export.settingsValid).toBe('Settings valid')
    expect(EN.export.cancel).toBe('Cancel')
    expect(PL.markers.add).toBe('Dodaj')
    expect(PL.markers.remove).toBe('Usuń')
    expect(PL.markers.saveDetected).toBe('Zapisz jako znacznik')
    expect(PL.lang.en).toBe('English')
    expect(PL.lang.pl).toBe('Polski')
    expect(EN.lang.en).toBe('English')
    expect(EN.lang.pl).toBe('Polski')
    expect(PL.focus.wave).toBe('Fala')
    expect(PL.focus.waveFull).toBe('Przebieg')
    expect(PL.mode.technicalShort).toBe('Techn.')
    expect(PL.mode.technical).toBe('Techniczny')
    expect(PL.a11y.highVisibility).toContain('widoczność')
    expect(PL.a11y.dragFree).toBe('Edytowanie bez przeciągania')
    expect(PL.waveform.channelCount(1)).toBe('1 kanał.')
    expect(PL.waveform.channelCount(2)).toBe('2 kanały.')
    expect(PL.waveform.channelCount(5)).toBe('5 kanałów.')
  })
})
