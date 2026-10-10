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
import {
  clampSpectralCameraPreset,
  clampSpectralColorMode,
  clampSpectralDensity,
  clampSpectralDrawStyle,
  clampSpectralHistoryLayer,
  clampSpectralHistorySeconds,
  clampSpectralViewMode,
  type SpectralCameraPreset,
  type SpectralColorMode,
  type SpectralDensity,
  type SpectralDrawStyle,
  type SpectralHistorySeconds,
  type SpectralViewMode,
} from './spectralHistory'

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
  /** Hover text for kick, voice, snare, air, and the other frequency landmarks. */
  freqGuide: boolean
  showBars: boolean
  showLine: boolean
  follow: SpectrumFollowMode
  /** Visual spectrum release. Does not freeze, and does not change audio. */
  fall: SpectrumFallMode
  /** 2D analyzer or 3D spectral history. A view inside FFT, not a workspace. */
  viewMode: SpectralViewMode
  /** Seconds of real playback represented by the depth axis. */
  historySec: SpectralHistorySeconds
  /** 3D tap. Defaults to the output (after the chain) so two meshes are not the first picture. */
  historyLayer: SpectrumLayer
  cameraPreset: SpectralCameraPreset
  density: SpectralDensity
  /** Off, level, or frequency. Position and height stay the readout. */
  colorMode: SpectralColorMode
  drawStyle: SpectralDrawStyle
  /** Max-hold ridge. Off by default. It is not the history itself. */
  peakTrails: boolean
}

const DEFAULT_PREFS: SpectrumPrefs = {
  layer: 'both',
  bands: SPECTRUM_BAND_COUNT,
  resolution: SPECTRUM_RESOLUTION_DEFAULT,
  range: SPECTRUM_RANGE_DEFAULT,
  regionColors: true,
  eqFreqColors: false,
  legendOpen: true,
  freqGuide: false,
  showBars: true,
  showLine: true,
  follow: 'peak',
  fall: 'normal',
  viewMode: '2d',
  historySec: 5,
  historyLayer: 'post',
  cameraPreset: 'angled',
  density: 'auto',
  colorMode: 'off',
  drawStyle: 'lines',
  peakTrails: false,
}

const listeners = new Set<(prefs: SpectrumPrefs) => void>()

export function defaultSpectrumPrefs(): SpectrumPrefs {
  return { ...DEFAULT_PREFS }
}

export function loadSpectrumPrefs(): SpectrumPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(SPECTRUM_PREF_KEY) ?? 'null') as
      | (Partial<SpectrumPrefs> & { levelColor?: boolean })
      | null
    return {
      layer: raw?.layer === 'pre' || raw?.layer === 'post' || raw?.layer === 'both' ? raw.layer : DEFAULT_PREFS.layer,
      bands: clampSpectrumBandCount(raw?.bands ?? SPECTRUM_BAND_COUNT),
      resolution: clampSpectrumResolution(raw?.resolution ?? SPECTRUM_RESOLUTION_DEFAULT),
      range: clampSpectrumRange(raw?.range ?? SPECTRUM_RANGE_DEFAULT),
      regionColors: raw?.regionColors !== false,
      eqFreqColors: raw?.eqFreqColors === true,
      legendOpen: raw?.legendOpen !== false,
      freqGuide: raw?.freqGuide === true,
      showBars: raw?.showBars !== false,
      showLine: raw?.showLine !== false,
      follow: clampSpectrumFollowMode(raw?.follow),
      fall: clampSpectrumFallMode(raw?.fall),
      viewMode: clampSpectralViewMode(raw?.viewMode),
      historySec: clampSpectralHistorySeconds(raw?.historySec),
      historyLayer: clampSpectralHistoryLayer(raw?.historyLayer),
      cameraPreset: clampSpectralCameraPreset(raw?.cameraPreset),
      density: clampSpectralDensity(raw?.density),
      colorMode: clampSpectralColorMode(raw?.colorMode, raw?.levelColor === true),
      drawStyle: clampSpectralDrawStyle(raw?.drawStyle),
      peakTrails: raw?.peakTrails === true,
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

/** Merge onto the latest stored prefs so one control cannot write a stale copy back. */
export function patchSpectrumPrefs(patch: Partial<SpectrumPrefs>): SpectrumPrefs {
  const next = { ...loadSpectrumPrefs(), ...patch }
  persistSpectrumPrefs(next)
  return next
}

/**
 * How the 2D analyzer paints bars, including the EQ workspace graph.
 * That graph is a focus plot, and it still follows Color and Regions.
 */
export function spectrumPaintColor(
  prefs: Pick<SpectrumPrefs, 'colorMode' | 'regionColors'>,
): 'solid' | 'frequency' | 'level' {
  if (prefs.colorMode === 'level') return 'level'
  if (prefs.colorMode === 'frequency' || prefs.regionColors) return 'frequency'
  return 'solid'
}

export function subscribeSpectrumPrefs(onChange: (prefs: SpectrumPrefs) => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
