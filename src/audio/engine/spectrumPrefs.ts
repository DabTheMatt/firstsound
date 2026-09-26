import {
  clampSpectrumResolution,
  SPECTRUM_RESOLUTION_DEFAULT,
  type SpectrumResolution,
} from './analyserBudget'
import {
  clampSpectrumBandCount,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  clampSpectrumRange,
  SPECTRUM_BAND_COUNT,
  SPECTRUM_RANGE_DEFAULT,
  type SpectrumBandCount,
  type SpectrumFallMode,
  type SpectrumFollowMode,
  type SpectrumRangeDb,
} from './spectrumBands'

export const SPECTRUM_PREF_KEY = 'field.spectrum'

export type SpectrumLayer = 'pre' | 'post' | 'both'

/**
 * Which real analyser taps a layer draws.
 * `post` is the output tap (after the effect chain). It is never the EQ or
 * filter response curve, and never the `'eq'` mid-chain node.
 */
export function spectrumLayerTaps(layer: SpectrumLayer): readonly ('pre' | 'post')[] {
  if (layer === 'pre') return ['pre']
  if (layer === 'post') return ['post']
  return ['pre', 'post']
}

export type SpectrumPrefs = {
  layer: SpectrumLayer
  /** Display columns for the bars. Not the FFT length. */
  bands: SpectrumBandCount
  /** FFT length. Higher resolves lower frequencies and reacts more slowly. */
  resolution: SpectrumResolution
  /** Analyzer window from 0 dB down to `-range`. Independent of the EQ curve. */
  range: SpectrumRangeDb
  regionColors: boolean
  eqFreqColors: boolean
  legendOpen: boolean
  showBars: boolean
  showLine: boolean
  follow: SpectrumFollowMode
  /** Visual spectrum release. Does not freeze, and does not change audio. */
  fall: SpectrumFallMode
}

const DEFAULT_PREFS: SpectrumPrefs = {
  layer: 'both',
  bands: SPECTRUM_BAND_COUNT,
  resolution: SPECTRUM_RESOLUTION_DEFAULT,
  range: SPECTRUM_RANGE_DEFAULT,
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
      resolution: clampSpectrumResolution(raw?.resolution ?? SPECTRUM_RESOLUTION_DEFAULT),
      range: clampSpectrumRange(raw?.range ?? SPECTRUM_RANGE_DEFAULT),
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
