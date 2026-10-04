/**
 * Hearing Access preferences. Stored beside other FIELD settings.
 * Transient analysis results are not persisted.
 */

import { HEARING_BANDS } from './bands'

export const HEARING_STORAGE_KEY = 'field.hearingAccess'

export const HEARING_PROFILES = ['assisted', 'visual', 'visual-haptic'] as const

export type HearingProfile = (typeof HEARING_PROFILES)[number]

export const HEARING_SECTIONS = ['sound', 'events', 'space', 'dynamics', 'compare', 'haptics'] as const

export type HearingSection = (typeof HEARING_SECTIONS)[number]

export const HAPTIC_INTENSITIES = ['off', 'low', 'medium', 'high'] as const

export type HapticIntensity = (typeof HAPTIC_INTENSITIES)[number]

export const EVENT_KINDS = [
  'transient',
  'silence',
  'loud',
  'lowFrequency',
  'tonal',
  'possibleClick',
  'possibleClip',
] as const

export type EventKind = (typeof EVENT_KINDS)[number]

export type HearingLayers = {
  soundMap: boolean
  fingerprint: boolean
  descriptors: boolean
  events: boolean
  dynamicsMap: boolean
  space: boolean
  compare: boolean
  assistant: boolean
  voiceEstimate: boolean
}

export type HearingAccessSettings = {
  enabled: boolean
  profile: HearingProfile
  layers: HearingLayers
  eventFilters: Record<EventKind, boolean>
  hapticIntensity: HapticIntensity
  /** Experimental frequency-to-pattern mapping. Off unless the user enables it. */
  frequencyHaptics: boolean
  monitorEnabled: boolean
  /** Shelf/peak emphasis in dB. Bounded again at the audio tap. */
  monitorLow: number
  monitorMid: number
  monitorHigh: number
  simpleDetails: boolean
  panelOpen: boolean
  section: HearingSection
  /** Desktop panel size in pixels. The sheet on a narrow screen uses the height only. */
  panelWidth: number
  panelHeight: number
  /** Null docks the panel at the corner. A pair of numbers detaches it. */
  panelLeft: number | null
  panelTop: number | null
  /** 0 marks only strong onsets. 1 also marks quieter ones. Shared with Mark transients. */
  transientSensitivity: number
  /** 0 lists the loudest partial. 1 also lists quieter partials. */
  toneSensitivity: number
  /** Triangles, clip marks, and event glyphs on the waveform strip. */
  showWaveSymbols: boolean
}

export const PROFILE_LAYERS: Record<HearingProfile, HearingLayers> = {
  assisted: {
    soundMap: false,
    fingerprint: true,
    descriptors: true,
    events: true,
    dynamicsMap: false,
    space: true,
    compare: true,
    assistant: false,
    voiceEstimate: false,
  },
  visual: {
    soundMap: true,
    fingerprint: true,
    descriptors: true,
    events: true,
    dynamicsMap: true,
    space: true,
    compare: true,
    assistant: true,
    voiceEstimate: false,
  },
  'visual-haptic': {
    soundMap: true,
    fingerprint: true,
    descriptors: true,
    events: true,
    dynamicsMap: true,
    space: true,
    compare: true,
    assistant: true,
    voiceEstimate: false,
  },
}

function allEventFilters(on: boolean): Record<EventKind, boolean> {
  const filters = {} as Record<EventKind, boolean>
  for (const kind of EVENT_KINDS) filters[kind] = on
  return filters
}

export const DEFAULT_HEARING_SETTINGS: HearingAccessSettings = {
  enabled: false,
  profile: 'assisted',
  layers: { ...PROFILE_LAYERS.assisted },
  eventFilters: allEventFilters(true),
  hapticIntensity: 'off',
  frequencyHaptics: false,
  monitorEnabled: false,
  monitorLow: 0,
  monitorMid: 0,
  monitorHigh: 0,
  simpleDetails: false,
  panelOpen: false,
  section: 'sound',
  panelWidth: 420,
  panelHeight: 560,
  panelLeft: null,
  panelTop: null,
  transientSensitivity: 0.5,
  toneSensitivity: 0.5,
  showWaveSymbols: true,
}

export const PANEL_WIDTH_MIN = 320
export const PANEL_WIDTH_MAX = 960
export const PANEL_HEIGHT_MIN = 360
export const PANEL_HEIGHT_MAX = 1100

const PANEL_POS_MAX = 8000

/** A stored corner offset. Null, and anything that is not a finite number, stays docked. */
export function clampPanelPosition(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(Math.min(PANEL_POS_MAX, Math.max(0, n)))
}

export function clampPanelSize(width: unknown, height: unknown): { panelWidth: number; panelHeight: number } {
  const w = typeof width === 'number' && Number.isFinite(width) ? width : DEFAULT_HEARING_SETTINGS.panelWidth
  const h = typeof height === 'number' && Number.isFinite(height) ? height : DEFAULT_HEARING_SETTINGS.panelHeight
  return {
    panelWidth: Math.round(Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, w))),
    panelHeight: Math.round(Math.min(PANEL_HEIGHT_MAX, Math.max(PANEL_HEIGHT_MIN, h))),
  }
}

function clampSensitivity(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100))
}

function clampDb(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(-12, Math.min(12, Math.round(n * 10) / 10))
}

function parseProfile(value: unknown): HearingProfile {
  return value === 'visual' || value === 'visual-haptic' || value === 'assisted' ? value : 'assisted'
}

function parseSection(value: unknown): HearingSection {
  return HEARING_SECTIONS.includes(value as HearingSection) ? (value as HearingSection) : 'sound'
}

function parseIntensity(value: unknown): HapticIntensity {
  return HAPTIC_INTENSITIES.includes(value as HapticIntensity) ? (value as HapticIntensity) : 'off'
}

export function layersForProfile(profile: HearingProfile): HearingLayers {
  return { ...PROFILE_LAYERS[profile] }
}

export function parseHearingSettings(raw: unknown): HearingAccessSettings {
  const next: HearingAccessSettings = {
    ...DEFAULT_HEARING_SETTINGS,
    layers: { ...DEFAULT_HEARING_SETTINGS.layers },
    eventFilters: { ...DEFAULT_HEARING_SETTINGS.eventFilters },
  }
  if (!raw || typeof raw !== 'object') return next
  const rec = raw as Record<string, unknown>
  if (typeof rec.enabled === 'boolean') next.enabled = rec.enabled
  next.profile = parseProfile(rec.profile)
  next.section = parseSection(rec.section)
  next.hapticIntensity = parseIntensity(rec.hapticIntensity)
  if (typeof rec.frequencyHaptics === 'boolean') next.frequencyHaptics = rec.frequencyHaptics
  if (typeof rec.monitorEnabled === 'boolean') next.monitorEnabled = rec.monitorEnabled
  next.monitorLow = clampDb(rec.monitorLow)
  next.monitorMid = clampDb(rec.monitorMid)
  next.monitorHigh = clampDb(rec.monitorHigh)
  if (typeof rec.simpleDetails === 'boolean') next.simpleDetails = rec.simpleDetails
  if (typeof rec.panelOpen === 'boolean') next.panelOpen = rec.panelOpen
  const size = clampPanelSize(rec.panelWidth, rec.panelHeight)
  next.panelWidth = size.panelWidth
  next.panelHeight = size.panelHeight
  next.panelLeft = clampPanelPosition(rec.panelLeft)
  next.panelTop = clampPanelPosition(rec.panelTop)
  next.transientSensitivity = clampSensitivity(rec.transientSensitivity)
  next.toneSensitivity = clampSensitivity(rec.toneSensitivity)
  if (typeof rec.showWaveSymbols === 'boolean') next.showWaveSymbols = rec.showWaveSymbols
  if (rec.layers && typeof rec.layers === 'object') {
    const layers = rec.layers as Record<string, unknown>
    for (const key of Object.keys(next.layers) as (keyof HearingLayers)[]) {
      if (typeof layers[key] === 'boolean') next.layers[key] = layers[key]
    }
  }
  if (rec.eventFilters && typeof rec.eventFilters === 'object') {
    const filters = rec.eventFilters as Record<string, unknown>
    for (const kind of EVENT_KINDS) {
      if (typeof filters[kind] === 'boolean') next.eventFilters[kind] = filters[kind]
    }
  }
  return next
}

function loadHearingSettings(): HearingAccessSettings {
  try {
    const raw = localStorage.getItem(HEARING_STORAGE_KEY)
    return parseHearingSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return parseHearingSettings(null)
  }
}

/**
 * Stable snapshot for useSyncExternalStore.
 * A fresh object on every read makes React treat the store as changed and loop.
 */
let hearingSnapshot: HearingAccessSettings = loadHearingSettings()

export function readStoredHearingSettings(): HearingAccessSettings {
  return hearingSnapshot
}

const hearingListeners = new Set<() => void>()

export function persistHearingSettings(settings: HearingAccessSettings): void {
  hearingSnapshot = settings
  try {
    localStorage.setItem(HEARING_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* private mode */
  }
  applyHearingDom(settings)
  for (const listener of hearingListeners) listener()
}

export function subscribeHearingSettings(listener: () => void): () => void {
  hearingListeners.add(listener)
  return () => hearingListeners.delete(listener)
}

export function applyHearingDom(settings: HearingAccessSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.hearingAccess = settings.enabled ? 'on' : 'off'
  root.dataset.hearingProfile = settings.profile
}

/** Band ids are part of the public measurement vocabulary. */
export const HEARING_BAND_COUNT = HEARING_BANDS.length
