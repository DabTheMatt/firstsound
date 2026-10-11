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
import { loadFreqGridDensity, parseFreqGridDensity, type FreqGridDensity } from './freqGrid'
import { loadFreqScale, parseFreqScale, type FreqScaleKind } from './freqScale'
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

/** EQ graph and FFT analyzer keep the same kinds of display choices, stored apart. */
export type GraphSurface = 'eq' | 'fft'

export type SurfaceDisplay = {
  layer: SpectrumLayer
  range: SpectrumRangeDb
  scale: FreqScaleKind
  grid: FreqGridDensity
  showBars: boolean
  showLine: boolean
  legendOpen: boolean
  freqGuide: boolean
  /** EQ spectrum columns. FFT uses colorMode instead. */
  regionColors: boolean
  /** EQ handles, filter list, and band name. FFT color does not use this. */
  eqFreqColors: boolean
}

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
  /** Display choices for the EQ graph and the FFT analyzer. Editing one does not write the other. */
  surfaces: Record<GraphSurface, SurfaceDisplay>
}

export function defaultSurfaceDisplay(patch: Partial<SurfaceDisplay> = {}): SurfaceDisplay {
  return {
    layer: 'both',
    range: SPECTRUM_RANGE_DEFAULT,
    scale: 'log',
    grid: 12,
    showBars: true,
    showLine: true,
    legendOpen: true,
    freqGuide: false,
    regionColors: true,
    eqFreqColors: false,
    ...patch,
  }
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
  surfaces: {
    eq: defaultSurfaceDisplay(),
    fft: defaultSurfaceDisplay(),
  },
}

const listeners = new Set<(prefs: SpectrumPrefs) => void>()

export function defaultSpectrumPrefs(): SpectrumPrefs {
  return {
    ...DEFAULT_PREFS,
    surfaces: {
      eq: defaultSurfaceDisplay(),
      fft: defaultSurfaceDisplay(),
    },
  }
}

function readLayer(raw: unknown, fallback: SpectrumLayer): SpectrumLayer {
  return raw === 'pre' || raw === 'post' || raw === 'both' ? raw : fallback
}

function readSurface(raw: unknown, fallback: SurfaceDisplay): SurfaceDisplay {
  if (!raw || typeof raw !== 'object') return { ...fallback }
  const rec = raw as Partial<SurfaceDisplay>
  return {
    layer: readLayer(rec.layer, fallback.layer),
    range: clampSpectrumRange(typeof rec.range === 'number' ? rec.range : fallback.range),
    scale: parseFreqScale(typeof rec.scale === 'string' ? rec.scale : fallback.scale),
    grid: parseFreqGridDensity(rec.grid == null ? String(fallback.grid) : String(rec.grid)),
    showBars: typeof rec.showBars === 'boolean' ? rec.showBars : fallback.showBars,
    showLine: typeof rec.showLine === 'boolean' ? rec.showLine : fallback.showLine,
    legendOpen: typeof rec.legendOpen === 'boolean' ? rec.legendOpen : fallback.legendOpen,
    freqGuide: typeof rec.freqGuide === 'boolean' ? rec.freqGuide : fallback.freqGuide,
    regionColors: typeof rec.regionColors === 'boolean' ? rec.regionColors : fallback.regionColors,
    eqFreqColors: typeof rec.eqFreqColors === 'boolean' ? rec.eqFreqColors : fallback.eqFreqColors,
  }
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
      surfaces: readSurfaces(raw),
    }
  } catch {
    return defaultSpectrumPrefs()
  }
}

function readSurfaces(raw: (Partial<SpectrumPrefs> & { levelColor?: boolean }) | null): Record<GraphSurface, SurfaceDisplay> {
  const legacy = defaultSurfaceDisplay({
    layer: readLayer(raw?.layer, 'both'),
    range: clampSpectrumRange(raw?.range ?? SPECTRUM_RANGE_DEFAULT),
    scale: loadFreqScale(),
    grid: loadFreqGridDensity(),
    showBars: raw?.showBars !== false,
    showLine: raw?.showLine !== false,
    legendOpen: raw?.legendOpen !== false,
    freqGuide: raw?.freqGuide === true,
    regionColors: raw?.regionColors !== false,
    eqFreqColors: raw?.eqFreqColors === true,
  })
  const stored = raw?.surfaces
  if (!stored) return { eq: { ...legacy }, fft: { ...legacy } }
  return {
    eq: readSurface(stored.eq, legacy),
    fft: readSurface(stored.fft, legacy),
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
  const current = loadSpectrumPrefs()
  const next: SpectrumPrefs = { ...current, ...patch, surfaces: patch.surfaces ?? current.surfaces }
  if (!patch.surfaces) {
    const fftPatch: Partial<SurfaceDisplay> = {}
    if (patch.layer) fftPatch.layer = patch.layer
    if (patch.range != null) fftPatch.range = patch.range
    if (patch.showBars != null) fftPatch.showBars = patch.showBars
    if (patch.showLine != null) fftPatch.showLine = patch.showLine
    if (patch.legendOpen != null) fftPatch.legendOpen = patch.legendOpen
    if (patch.freqGuide != null) fftPatch.freqGuide = patch.freqGuide
    if (patch.regionColors != null) fftPatch.regionColors = patch.regionColors
    if (patch.eqFreqColors != null) fftPatch.eqFreqColors = patch.eqFreqColors
    if (Object.keys(fftPatch).length > 0) {
      next.surfaces = { ...next.surfaces, fft: { ...next.surfaces.fft, ...fftPatch } }
    }
  }
  persistSpectrumPrefs(next)
  return next
}

/** Write one graph's display choices. EQ and FFT do not share this record. */
export function patchSurfaceDisplay(surface: GraphSurface, patch: Partial<SurfaceDisplay>): SpectrumPrefs {
  const current = loadSpectrumPrefs()
  const display = { ...current.surfaces[surface], ...patch }
  const next: SpectrumPrefs = {
    ...current,
    surfaces: { ...current.surfaces, [surface]: display },
  }
  if (surface === 'fft') {
    if (patch.layer) {
      next.layer = patch.layer
      next.historyLayer = patch.layer
    }
    if (patch.range != null) next.range = patch.range
    if (patch.showBars != null) next.showBars = patch.showBars
    if (patch.showLine != null) next.showLine = patch.showLine
    if (patch.legendOpen != null) next.legendOpen = patch.legendOpen
    if (patch.freqGuide != null) next.freqGuide = patch.freqGuide
    if (patch.regionColors != null) next.regionColors = patch.regionColors
    if (patch.eqFreqColors != null) next.eqFreqColors = patch.eqFreqColors
  }
  persistSpectrumPrefs(next)
  return next
}

export function surfaceDisplay(prefs: SpectrumPrefs, surface: GraphSurface): SurfaceDisplay {
  return prefs.surfaces?.[surface] ?? defaultSurfaceDisplay()
}

/** EQ graph color and FFT color are stored together and painted apart. */
export type SpectrumColorSurface = 'eq' | 'fft'

/**
 * EQ columns follow Regions. FFT bars, the FFT line, and the 3D ridges follow Color.
 * Changing one does not change the other.
 */
export function spectrumPaintColor(
  prefs: Pick<SpectrumPrefs, 'colorMode' | 'regionColors'>,
  surface: SpectrumColorSurface,
): 'solid' | 'frequency' | 'level' {
  if (surface === 'eq') return prefs.regionColors ? 'frequency' : 'solid'
  if (prefs.colorMode === 'level') return 'level'
  if (prefs.colorMode === 'frequency') return 'frequency'
  return 'solid'
}

export function subscribeSpectrumPrefs(onChange: (prefs: SpectrumPrefs) => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
