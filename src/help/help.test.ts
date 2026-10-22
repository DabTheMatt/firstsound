import { describe, expect, it } from 'vitest'
import { AUTOMATION_CURVES } from '../audio/automation/automation'
import { SPECTRUM_RESOLUTION_CHOICES, SPECTRUM_RESOLUTION_DEFAULT } from '../audio/engine/analyserBudget'
import { EQ_FILTER_TYPES, FILTER_SLOPES } from '../audio/engine/eqBands'
import { PARAMS } from '../audio/parameters/definitions'
import { formatParamValue } from '../audio/parameters/mapping'
import type { ParamId } from '../audio/parameters/types'
import { EXPORT_BIT_DEPTHS, EXPORT_FORMATS, EXPORT_SAMPLE_RATES } from '../audio/samplePrep/exportCheck'
import { formatCombo, SHORTCUTS, shortcutPlatform } from '../a11y/shortcuts/registry'
import { paramLabel } from '../i18n/messages'
import { MANUAL } from '../manual/content'
import { parseHelpLevel } from './level'
import { parseExplainMarks } from './marks'
import { placeExplainPanel } from './place'
import { helpTextLooksTranslated, resolveHelp } from './resolve'

const PARAM_IDS: ParamId[] = [
  'eq1Freq',
  'eq1Gain',
  'eq1Q',
  'gain',
  'outputGain',
  'mixVolume',
  'compressorThreshold',
  'compressorRatio',
  'compressorKnee',
  'compressorAttack',
  'compressorRelease',
  'compressorMakeup',
  'compressorInput',
  'compressorAutoMakeup',
  'compressorLowCut',
  'reverbSize',
  'reverbDecay',
  'reverbPredelay',
  'reverbDamping',
  'reverbWet',
  'reverbDry',
  'delayTime',
  'delayFeedback',
  'delayWet',
  'delayStereo',
  'delaySync',
  'delayWidth',
  'filterLfoRate',
  'filterLfoDepth',
  'filterLfoShape',
]

const TOOL_IDS = [
  'wave.playhead',
  'wave.selection',
  'wave.trim',
  'wave.fadeIn',
  'wave.fadeOut',
  'wave.loop',
  'wave.zoom',
  'wave.timecode',
  'wave.markers',
  'markers.user',
  'markers.detected',
  'markers.navigate',
  'markers.edit',
  'markers.save',
  'auto.lane',
  'auto.point',
  'auto.interpolation',
  'lfo.rate',
  'lfo.depth',
  'lfo.shape',
  'lfo.target',
  'fft.spectrum',
  'fft.history',
  'fft.freqAxis',
  'fft.levelAxis',
  'fft.window',
  'gain.normalize',
  'gain.clipping',
  'gain.headroom',
  'module.eq',
  'module.compressor',
  'module.reverb',
  'module.delay',
  'export.format',
  'export.sampleRate',
  'export.bitDepth',
  'export.channels',
  'export.range',
  'export.check',
  'export.preview',
  'a11y.highVisibility',
  'a11y.sensoryComfort',
  'a11y.attentionFocus',
  'a11y.predictableLayout',
  'a11y.assisted',
  'a11y.dragFree',
  'a11y.interfaceSize',
  'a11y.textSize',
  'a11y.keyboardFirst',
  'a11y.reduceMotion',
  'a11y.attentionStrength',
  'a11y.attentionHighlight',
  'a11y.attentionReduce',
  'a11y.stablePanels',
  'a11y.rememberLayout',
  'a11y.reduceLayout',
  'a11y.restoreLayout',
  'a11y.visualActivity',
  'a11y.reduceDecorativeMotion',
  'a11y.calmMeters',
  'a11y.calmSpectrum',
  'a11y.reduceVisualEffects',
  'a11y.quietNotifications',
  'a11y.focus',
  'a11y.larger',
  'a11y.waveformNav',
  'a11y.lowVision',
  'a11y.tips',
  'a11y.screenReader',
  'a11y.shortcuts',
  'a11y.restore',
  'sensory.character',
  'sensory.space',
  'sensory.echo',
  ...EQ_FILTER_TYPES.map((item) => `filter.${item.value}`),
]

function fact(id: string, locale: 'en' | 'pl', label: string): string {
  const help = resolveHelp(id, locale)
  const row = help?.facts.find((item) => item.label === label)
  expect(row, `${id} ${locale} ${label}`).toBeTruthy()
  return row?.value ?? ''
}

describe('explain this', () => {
  it('returns nothing for an unknown id and rejects a raw key', () => {
    expect(resolveHelp('not.a.control', 'en')).toBeNull()
    expect(resolveHelp('', 'pl')).toBeNull()
    expect(helpTextLooksTranslated('export.format', 'export.format')).toBe(false)
    expect(helpTextLooksTranslated('compressorThreshold', 'compressorThreshold')).toBe(false)
  })

  it('keeps English and Polish explanations equivalent and translated', () => {
    for (const id of [...PARAM_IDS, ...TOOL_IDS]) {
      const en = resolveHelp(id, 'en')
      const pl = resolveHelp(id, 'pl')
      expect(en, id).toBeTruthy()
      expect(pl, id).toBeTruthy()
      if (!en || !pl) continue
      expect(helpTextLooksTranslated(en.title, id)).toBe(true)
      expect(helpTextLooksTranslated(pl.title, id)).toBe(true)
      expect(helpTextLooksTranslated(en.summary, id)).toBe(true)
      expect(helpTextLooksTranslated(pl.summary, id)).toBe(true)
      expect(Boolean(en.technical)).toBe(Boolean(pl.technical))
      expect(Boolean(en.practical)).toBe(Boolean(pl.practical))
      if (en.manualId) {
        expect(MANUAL.en.sections.some((section) => section.id === en.manualId)).toBe(true)
        expect(MANUAL.pl.sections.some((section) => section.id === en.manualId)).toBe(true)
      }
      expect(pl.manualId).toBe(en.manualId)
    }
  })

  it('reads compressor, delay, and EQ facts from parameter metadata', () => {
    const threshold = PARAMS.compressorThreshold
    expect(fact('compressorThreshold', 'en', 'Range')).toBe(
      `${formatParamValue(threshold.min, threshold)} – ${formatParamValue(threshold.max, threshold)}`,
    )
    expect(fact('compressorThreshold', 'en', 'Default')).toBe(formatParamValue(threshold.defaultValue, threshold))
    expect(fact('compressorRatio', 'en', 'Unit')).toBe(PARAMS.compressorRatio.unit)
    expect(fact('compressorAttack', 'en', 'Unit')).toBe('ms')
    expect(fact('delayFeedback', 'en', 'Range')).toContain(formatParamValue(PARAMS.delayFeedback.max, PARAMS.delayFeedback))
    expect(resolveHelp('compressorThreshold', 'pl')?.title).toBe(paramLabel('pl', 'compressorThreshold'))
    expect(paramLabel('pl', 'compressorThreshold')).toBe('Próg')
    expect(paramLabel('pl', 'compressorRatio')).toBe('Stopień kompresji')
    expect(paramLabel('pl', 'compressorAttack')).toBe('Atak')
    expect(paramLabel('pl', 'compressorRelease')).toBe('Zwolnienie')
    expect(paramLabel('pl', 'compressorMakeup')).toBe('Wzmocnienie kompensacyjne')
    expect(paramLabel('pl', 'delayFeedback')).toBe('Sprzężenie zwrotne')
    expect(resolveHelp('compressorAttack', 'en')?.technical).toContain('1000')
    expect(resolveHelp('delayStereo', 'en')?.technical).toContain('switch')
    expect(resolveHelp('reverbSize', 'en')?.practical).toContain('meters')
  })

  it('describes implemented EQ filters without inventing gain on a low-pass', () => {
    const lowpass = resolveHelp('filter.lowpass', 'en')
    expect(lowpass?.facts.find((item) => item.label === 'Gain')?.value).toBe('Not used')
    expect(lowpass?.facts.find((item) => item.label === 'Slope')?.value).toBe(
      `${FILTER_SLOPES.map((item) => item.value).join(', ')} dB/oct`,
    )
    expect(resolveHelp('filter.lowpass', 'pl')?.facts.find((item) => item.label === 'Wzmocnienie')?.value).toBe('Nie używane')
    expect(resolveHelp('filter.peaking', 'en')?.facts.find((item) => item.label === 'Gain')?.value).toBe('Used')
    expect(resolveHelp('filter.notch', 'pl')?.title.length).toBeGreaterThan(0)
  })

  it('lists FFT lengths, export choices, and automation curves from the live constants', () => {
    expect(fact('fft.window', 'en', 'FFT lengths')).toBe(SPECTRUM_RESOLUTION_CHOICES.join(', '))
    expect(fact('fft.window', 'en', 'Default')).toBe(String(SPECTRUM_RESOLUTION_DEFAULT))
    expect(fact('export.format', 'en', 'Format')).toBe(EXPORT_FORMATS.join(', ').toUpperCase())
    expect(fact('export.sampleRate', 'en', 'Rates')).toContain(String(EXPORT_SAMPLE_RATES[0] / 1000))
    expect(fact('export.bitDepth', 'en', 'Depths')).toBe(EXPORT_BIT_DEPTHS.join(', '))
    expect(`${resolveHelp('export.bitDepth', 'en')?.practical} ${resolveHelp('export.bitDepth', 'en')?.technical}`).toMatch(/float/i)
    expect(resolveHelp('export.preview', 'en')?.technical).toMatch(/audition|before the WAV|not/i)
    expect(fact('auto.interpolation', 'en', 'Curves')).toBe(AUTOMATION_CURVES.join(', '))
    expect(resolveHelp('fft.history', 'en')?.summary).toMatch(/spectrogram|waterfall/i)
    expect(resolveHelp('lfo.shape', 'en')?.technical).toContain('sample-and-hold')
    expect(resolveHelp('sensory.character', 'en')?.technical).toMatch(/EQ/)
    expect(resolveHelp('sensory.character', 'en')?.technical).toMatch(/does not add reverb/)
    expect(resolveHelp('sensory.space', 'pl')?.practical).toMatch(/metrach/)
    expect(resolveHelp('sensory.echo', 'en')?.technical).toMatch(/delay/i)
  })

  it('formats the loop shortcut from the registry', () => {
    const def = SHORTCUTS.find((item) => item.id === 'transport.loop')
    expect(def).toBeTruthy()
    const shown = resolveHelp('wave.loop', 'en')?.shortcuts.find((item) => item.id === 'transport.loop')
    expect(shown?.combo).toBe(formatCombo(def!.combo, shortcutPlatform()))
  })

  it('places a sheet on phone widths and a compact popover on desktop', () => {
    const anchor = { top: 40, left: 20, width: 48, height: 32 }
    for (const width of [320, 375, 390, 430]) {
      const placed = placeExplainPanel(anchor, { width, height: 700 }, 400)
      expect(placed.sheet).toBe(true)
      expect(placed.left + placed.width).toBeLessThanOrEqual(width)
      expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(700 - 72)
    }
    const desktop = placeExplainPanel(anchor, { width: 1280, height: 800 }, 200)
    expect(desktop.sheet).toBe(false)
    expect(desktop.width).toBeGreaterThanOrEqual(280)
    expect(desktop.width).toBeLessThanOrEqual(360)
  })

  it('remembers only the two help levels', () => {
    expect(parseHelpLevel('basic')).toBe('basic')
    expect(parseHelpLevel('technical')).toBe('technical')
    expect(parseHelpLevel('simple')).toBeNull()
    expect(parseHelpLevel(null)).toBeNull()
  })

  it('documents explain this in both manuals', () => {
    for (const locale of ['en', 'pl'] as const) {
      const section = MANUAL[locale].sections.find((item) => item.id === 'explain-this')
      const body = section?.body.join(' ') ?? ''
      expect(body).toMatch(/F1/)
      expect(body).toMatch(/Escape/)
      expect(body).toMatch(locale === 'pl' ? /Ustawienia/ : /Settings/)
      expect(body).not.toMatch(/floating info mark|unoszonym znakiem/)
    }
  })

  it('keeps inspector marks off until the stored choice is on', () => {
    expect(parseExplainMarks(null)).toBe(false)
    expect(parseExplainMarks('off')).toBe(false)
    expect(parseExplainMarks('on')).toBe(true)
  })
})
