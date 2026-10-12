import { AUTOMATION_CURVES } from '../audio/automation/automation'
import {
  SPECTRUM_RESOLUTION_CHOICES,
  SPECTRUM_RESOLUTION_DEFAULT,
} from '../audio/engine/analyserBudget'
import {
  bandUsesGain,
  bandUsesSlope,
  bandUsesWidth,
  FILTER_SLOPES,
} from '../audio/engine/eqBands'
import type { EqFilterType } from '../audio/engine/eqBands'
import { PARAMS } from '../audio/parameters/definitions'
import { formatParamValue } from '../audio/parameters/mapping'
import type { ParamDef, ParamId } from '../audio/parameters/types'
import { EXPORT_BIT_DEPTHS, EXPORT_FORMATS, EXPORT_SAMPLE_RATES } from '../audio/samplePrep/exportCheck'
import { topicById } from '../guide/topics'
import { paramDescription, sensoryDescription } from '../a11y/descriptions'
import { formatCombo, SHORTCUTS, shortcutPlatform } from '../a11y/shortcuts/registry'
import { EN, PL, paramLabel } from '../i18n/messages'
import type { Locale, LocalizedText } from '../i18n/locale'
import { filterTypeCopy } from '../i18n/filterTypes'
import { MANUAL } from '../manual/content'
import { SENSORY_AXES, type SensoryAxisId } from '../sensory/sensoryParameters'
import { helpChrome } from './chrome'
import { FAMILY_NOTES, FILTER_HEARD, PARAM_NOTES, SENSORY_NOTES, TOOL_NOTES, paramFamily, type HelpNote } from './notes'

export type HelpFact = {
  label: string
  value: string
}

export type ResolvedHelp = {
  id: string
  title: string
  summary: string
  practical: string | null
  technical: string | null
  facts: HelpFact[]
  manualId: string | null
  shortcuts: { id: string; label: string; combo: string }[]
}

const PARAM_ID_SET = new Set<string>(Object.keys(PARAMS))

function isParamId(id: string): id is ParamId {
  return PARAM_ID_SET.has(id)
}

function noteFor(id: string): HelpNote | null {
  if (isParamId(id)) {
    const family = paramFamily(id)
    return PARAM_NOTES[id] ?? (family ? FAMILY_NOTES[family] : null)
  }
  if (id.startsWith('filter.')) return FILTER_HEARD[id.slice('filter.'.length)] ?? null
  if (id.startsWith('sensory.')) return SENSORY_NOTES[id.slice('sensory.'.length)] ?? null
  return TOOL_NOTES[id] ?? null
}

function manualIdIfReal(id: string | undefined, locale: Locale): string | null {
  if (!id) return null
  const sections = MANUAL[locale].sections
  return sections.some((section) => section.id === id) ? id : null
}

function shortcutLines(ids: readonly string[] | undefined, locale: Locale): ResolvedHelp['shortcuts'] {
  if (!ids?.length) return []
  const copy = locale === 'pl' ? PL : EN
  const platform = shortcutPlatform()
  const lines: ResolvedHelp['shortcuts'] = []
  for (const id of ids) {
    const def = SHORTCUTS.find((item) => item.id === id)
    const label = copy.keyboard.byId[id]
    if (!def || !label) continue
    lines.push({ id, label, combo: formatCombo(def.combo, platform) })
  }
  return lines
}

function paramFacts(def: ParamDef, locale: Locale): HelpFact[] {
  const chrome = helpChrome(locale)
  const facts: HelpFact[] = [
    { label: chrome.range, value: `${formatParamValue(def.min, def)} – ${formatParamValue(def.max, def)}` },
    { label: chrome.defaultValue, value: formatParamValue(def.defaultValue, def) },
  ]
  if (def.unit) facts.push({ label: chrome.unit, value: def.unit })
  facts.push({
    label: locale === 'pl' ? 'Skala' : 'Scale',
    value: def.mapping === 'log' ? chrome.logarithmic : chrome.linear,
  })
  return facts
}

function filterFacts(type: EqFilterType, locale: Locale): HelpFact[] {
  const gain = bandUsesGain(type)
  const slope = bandUsesSlope(type)
  const width = bandUsesWidth(type)
  const slopes = FILTER_SLOPES.map((item) => item.value)
  const slopeText = slopes.join(', ')
  if (locale === 'pl') {
    return [
      { label: 'Wzmocnienie', value: gain ? 'Używane' : 'Nie używane' },
      { label: 'Dobroć Q', value: width ? 'Szerokość pasma' : 'Dobroć filtra' },
      ...(slope ? [{ label: 'Nachylenie', value: `${slopeText} dB/okt.` }] : []),
    ]
  }
  return [
    { label: 'Gain', value: gain ? 'Used' : 'Not used' },
    { label: 'Q', value: width ? 'Bandwidth' : 'Filter Q' },
    ...(slope ? [{ label: 'Slope', value: `${slopeText} dB/oct` }] : []),
  ]
}

function fftWindowFact(locale: Locale): HelpFact[] {
  const sizes = SPECTRUM_RESOLUTION_CHOICES.join(', ')
  if (locale === 'pl') {
    return [
      { label: 'Długości FFT', value: sizes },
      { label: 'Domyślnie', value: String(SPECTRUM_RESOLUTION_DEFAULT) },
    ]
  }
  return [
    { label: 'FFT lengths', value: sizes },
    { label: 'Default', value: String(SPECTRUM_RESOLUTION_DEFAULT) },
  ]
}

function exportFacts(id: string, locale: Locale): HelpFact[] {
  if (id === 'export.format') {
    return [{ label: locale === 'pl' ? 'Format' : 'Format', value: EXPORT_FORMATS.join(', ').toUpperCase() }]
  }
  if (id === 'export.sampleRate') {
    const rates = EXPORT_SAMPLE_RATES.map((rate) => `${rate / 1000} kHz`).join(', ')
    return [{ label: locale === 'pl' ? 'Częstotliwości' : 'Rates', value: rates }]
  }
  if (id === 'export.bitDepth') {
    return [{ label: locale === 'pl' ? 'Głębie' : 'Depths', value: EXPORT_BIT_DEPTHS.join(', ') }]
  }
  return []
}

function interpolationFact(locale: Locale): HelpFact[] {
  return [
    {
      label: locale === 'pl' ? 'Krzywe' : 'Curves',
      value: AUTOMATION_CURVES.join(', '),
    },
  ]
}

const MODULE_NAME: Record<string, LocalizedText> = {
  eq: { en: 'EQ', pl: 'EQ' },
  reverb: { en: 'reverb', pl: 'pogłos' },
  delay: { en: 'delay', pl: 'delay' },
  grain: { en: 'grain', pl: 'ziarno' },
  distortion: { en: 'distortion', pl: 'zniekształcenie' },
  compressor: { en: 'compressor', pl: 'kompresor' },
  gain: { en: 'gain', pl: 'wzmocnienie' },
  filter: { en: 'filter', pl: 'filtr' },
}

function sensoryFallback(id: SensoryAxisId, locale: Locale): { title: string; summary: string; practical: string; technical: string } {
  const axis = SENSORY_AXES[id]
  const pack = locale === 'pl' ? PL : EN
  const feeling = pack.sensory.feelings[id]
  const moduleName = MODULE_NAME[axis.module]?.[locale] ?? axis.module
  const title = feeling.label
  const summary = sensoryDescription(id, locale)
  const practical =
    locale === 'pl'
      ? `Od „${feeling.from}” do „${feeling.to}”. Słyszysz zmianę modułu: ${moduleName}.`
      : `From “${feeling.from}” to “${feeling.to}”. You hear a change in the ${moduleName} module.`
  const technical =
    locale === 'pl'
      ? `Ta oś należy do modułu ${moduleName}. Ruch zmienia jego parametry w czasie gestu. Nie zastępuje wczytanego sampla.`
      : `This axis owns the ${moduleName} module. Moving it changes that module’s parameters. It does not replace the loaded sample.`
  return { title, summary, practical, technical }
}

function pick(note: LocalizedText | undefined, topic: LocalizedText | undefined, locale: Locale): string | null {
  const value = note?.[locale] ?? topic?.[locale]
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function resolveHelp(id: string, locale: Locale): ResolvedHelp | null {
  if (!id || id.includes(' ')) return null
  const note = noteFor(id)
  const topic = note?.topicId ? topicById(note.topicId) : null

  if (id.startsWith('sensory.')) {
    const axisId = id.slice('sensory.'.length)
    if (!(axisId in SENSORY_AXES)) return null
    const sensoryId = axisId as SensoryAxisId
    const fallback = sensoryFallback(sensoryId, locale)
    const summary = pick(note?.summary, undefined, locale) ?? fallback.summary
    if (!summary) return null
    return {
      id,
      title: pick(note?.title, undefined, locale) ?? fallback.title,
      summary,
      practical: pick(note?.practical, undefined, locale) ?? fallback.practical,
      technical: pick(note?.technical, undefined, locale) ?? fallback.technical,
      facts: [],
      manualId: manualIdIfReal(note?.manualId, locale),
      shortcuts: shortcutLines(note?.shortcutIds, locale),
    }
  }

  if (id.startsWith('filter.')) {
    const type = id.slice('filter.'.length) as EqFilterType
    if (!FILTER_HEARD[type]) return null
    const names = filterTypeCopy(locale, type)
    const summary = pick(note?.summary, undefined, locale)
    if (!summary) return null
    return {
      id,
      title: pick(note?.title, undefined, locale) ?? names.label,
      summary,
      practical: pick(note?.practical, undefined, locale),
      technical: pick(note?.technical, undefined, locale),
      facts: filterFacts(type, locale),
      manualId: manualIdIfReal(note?.manualId ?? 'eq', locale),
      shortcuts: [],
    }
  }

  if (isParamId(id)) {
    const summary = paramDescription(id, locale)
    if (!summary || summary === id) return null
    const facts = paramFacts(PARAMS[id], locale)
    return {
      id,
      title: paramLabel(locale, id),
      summary,
      practical: pick(note?.practical, topic?.practical, locale),
      technical: pick(note?.technical, topic?.technical, locale),
      facts,
      manualId: manualIdIfReal(note?.manualId, locale),
      shortcuts: shortcutLines(note?.shortcutIds, locale),
    }
  }

  const summary = pick(note?.summary, topic?.summary, locale)
  const title = pick(note?.title, topic?.title, locale)
  if (!note || !summary || !title) return null
  const facts = id === 'fft.window' ? fftWindowFact(locale) : id === 'auto.interpolation' ? interpolationFact(locale) : exportFacts(id, locale)
  return {
    id,
    title,
    summary,
    practical: pick(note.practical, topic?.practical, locale),
    technical: pick(note.technical, topic?.technical, locale),
    facts,
    manualId: manualIdIfReal(note.manualId, locale),
    shortcuts: shortcutLines(note.shortcutIds, locale),
  }
}

export function moduleHelpId(type: string): string {
  return `module.${type}`
}

const RAW_KEY = /^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/

export function helpTextLooksTranslated(value: string, id: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed === id) return false
  if (RAW_KEY.test(trimmed)) return false
  return true
}
