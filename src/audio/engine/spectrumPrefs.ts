import {
  clampSpectrumBandCount,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  SPECTRUM_BAND_COUNT,
  type SpectrumBandCount,
  type SpectrumFallMode,
  type SpectrumFollowMode,
} from './spectrumBands'

export const SPECTRUM_PREF_KEY = 'field.spectrum'

export type SpectrumLayer = 'pre' | 'post' | 'both'

export type SpectrumPrefs = {
  layer: SpectrumLayer
  bands: SpectrumBandCount
  regionColors: boolean
  eqFreqColors: boolean
  legendOpen: boolean
  showBars: boolean
  showLine: boolean
  follow: SpectrumFollowMode
  /** Visual spectrum decay. Does not change audio. */
  fall: SpectrumFallMode
}

const DEFAULT_PREFS: SpectrumPrefs = {
  layer: 'both',
  bands: SPECTRUM_BAND_COUNT,
  regionColors: true,
  eqFreqColors: false,
  legendOpen: true,
  showBars: true,
  showLine: true,
  follow: 'peak',
  fall: 'normal',
}

const listeners = new Set<(prefs: SpectrumPrefs) => void>()

export function defaultSpectrumPrefs(): SpectrumPrefs {
  return { ...DEFAULT_PREFS }
}

export function loadSpectrumPrefs(): SpectrumPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(SPECTRUM_PREF_KEY) ?? 'null') as Partial<SpectrumPrefs> | null
    return {
      layer: raw?.layer === 'pre' || raw?.layer === 'post' || raw?.layer === 'both' ? raw.layer : DEFAULT_PREFS.layer,
      bands: clampSpectrumBandCount(raw?.bands ?? SPECTRUM_BAND_COUNT),
      regionColors: raw?.regionColors !== false,
      eqFreqColors: raw?.eqFreqColors === true,
      legendOpen: raw?.legendOpen !== false,
      showBars: raw?.showBars !== false,
      showLine: raw?.showLine !== false,
      follow: clampSpectrumFollowMode(raw?.follow),
      fall: clampSpectrumFallMode(raw?.fall),
    }
  } catch {
    return defaultSpectrumPrefs()
  }
}

export function persistSpectrumPrefs(prefs: SpectrumPrefs): void {
  try {
    localStorage.setItem(SPECTRUM_PREF_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener(prefs)
}

export function subscribeSpectrumPrefs(onChange: (prefs: SpectrumPrefs) => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
