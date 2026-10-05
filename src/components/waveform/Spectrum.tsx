import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { onPointerReset } from '../../app/pointerSession'
import { EnterFocusButton } from '../focus/EnterFocusButton'
import { eqColorIndex, moduleLabel } from '../../audio/chain/chain'
import { combAsEqBands } from '../../audio/engine/comb'
import {
  bellFromPlotPoint,
  displayFrequencies,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  freqToX,
  spectrumEqOverlayY,
  layoutMagnitudeCurve,
  responseSampleCount,
  SPECTRUM_EQ_MAX_DB,
  SPECTRUM_EQ_MIN_DB,
  strokeMagnitudeVertices,
  xToFreq,
  yToDb as eqYToDb,
} from '../../audio/engine/eqPlot'
import { eqGraphLayers } from '../../audio/engine/eqFocusGraph'
import { eqMagnitudeDb } from '../../audio/engine/eqResponse'
import { bandIsActive, EQ_FILTER_TYPES, eqStripKey } from '../../audio/engine/eqBands'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import {
  formatFreqTick,
  formatHoverFreq,
  musicalScaleHz,
  visibleAxisLabelIndices,
} from '../../audio/engine/pitchScale'
import {
  frequencyGuideHz,
  loadFreqGridDensity,
  persistFreqGridDensity,
  subscribeFreqGridDensity,
  type FreqGridDensity,
} from '../../audio/engine/freqGrid'
import {
  SPECTRUM_AXIS_MIN_HZ,
  SPECTRUM_BAND_CHOICES,
  SPECTRUM_FALL_MODES,
  SPECTRUM_FLOOR_DB,
  SPECTRUM_FOLLOW_MODES,
  SPECTRUM_RANGE_CHOICES,
  alignedBandDb,
  bandPeakDb,
  clampSpectrumBandCount,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  clampSpectrumRange,
  followBandsOverTime,
  logBandEdgesHz,
  spectrumDisplayFloorDb,
  spectrumDisplayUses,
  spectrumFallBallistics,
  type SpectrumFallRates,
  type SpectrumReleaseHold,
  spectrumMaxHz,
  SPECTRUM_AXIS_MAX_HZ,
} from '../../audio/engine/spectrumBands'
import { bandCenterHz, eqBandColorForHz, SPECTRUM_REGIONS } from '../../audio/engine/spectrumRegions'
import { placeEqBell } from '../eq/placeEqBell'
import {
  clampEqOverlayFocus,
  eqInstanceUsesSharedLfo,
  eqOverlayIncludes,
  eqOverlayOptions,
  loadEqOverlayFocus,
  persistEqOverlayFocus,
  subscribeEqOverlayFocus,
} from '../../audio/engine/eqOverlayFocus'
import { fillSpectrumXY, spectrumCurvePointCount, strokeSpectrumXY, writeSpectrumCurve } from '../../audio/engine/spectrumEnvelope'
import {
  formatSpectralReadout,
  spectralHistoryAriaLabel,
  spectralHistorySession,
  subscribeSpectralHistorySession,
} from '../../audio/engine/spectralHistory'
import { filterCurveColor, processorCurveStyle, shouldShowResponseLegend } from '../../audio/engine/spectrumResponse'
import { measureSpectrumDb, type SpectrumFftScratch } from '../../audio/engine/spectrumFft'
import { frameAround, spectrumListenId } from '../../audio/spectral/bands'
import { spectralBandsEnabled } from '../../audio/spectral/ui'
import {
  ANALYSER_FFT_IDLE,
  clampSpectrumResolution,
  SPECTRUM_RESOLUTION_CHOICES,
} from '../../audio/engine/analyserBudget'
import { isDocumentHidden } from '../../app/frameBudget'
import { spectrumDbScaleMarks } from '../../app/editorState'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { colorWithAlpha, eqBandTone, eqTone, readThemeColors } from '../../theme'
import { hzToX as mapHzToX, xToHz, loadFreqScale, persistFreqScale, subscribeFreqScale, FREQ_SCALE_OPTIONS, type FreqScaleKind } from '../../audio/engine/freqScale'
import { EQ_CHANNEL_MODES } from '../../audio/engine/eqGraph'
import {
  eqCurveBands,
  eqNodeAnchorBands,
  eqNodeMotion,
} from '../modulation/modulationModel'
import { filterMagnitudeDb, filterMixMagnitudeDb, filterModuleIsAudible } from '../../audio/fx/filterResponse'
import { isPrimaryPointerDown, isPrimaryPointerHeld } from '../../audio/engine/pointerDrag'
import { loadSpectrumPrefs, persistSpectrumPrefs, spectrumLayerTaps, subscribeSpectrumPrefs, type SpectrumLayer, type SpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import {
  SPECTRUM_FOCUS_HZ_LABEL_OFFSET,
  SPECTRUM_HZ_LABEL_OFFSET,
  compactDbMarks,
  spectrumPlotPad,
} from '../../audio/engine/spectrumPlotLayout'
import {
  EQ_FOCUS_LONG_PRESS_MS,
  EQ_FOCUS_TAP_PX,
  eqDragMode,
  focusEqTypePatch,
  nextQArmed,
  nudgeFocusEq,
  qFromVertical,
  type EqDragMode,
} from '../mobile/eqFocusGesture'
import { focusEqTypeLabel } from '../mobile/focusReadout'
import { SpectrumDisplaySettings } from '../workspace/SpectrumDisplaySettings'
import { VizBackground } from './VizBackground'
import { FftViewToggle, SpectralHistoryControls } from './SpectralHistoryControls'
import {
  createSpectralHistoryRuntime,
  inspectSpectralHistory,
  paintSpectralHistory,
  readAnalyserSpectrumBins,
  readTimeDomainSpectrumBins,
  type SpectralHistoryRuntime,
} from './spectralHistoryDraw'
import historyStyles from './SpectralHistory.module.css'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
  compact?: boolean
  /** Phone EQ workspace: real spectrum, response, and nodes. Analyzer chrome stays closed. */
  phoneEq?: boolean
  /** Focused EQ editing. Presentation only: same canvas, tighter plot, no analyzer chrome. */
  phoneFocus?: boolean
  /** FFT Focus owns the analyzer controls in the shared header. */
  suppressAnalyzerChrome?: boolean
  /** Workspace FFT keeps display settings in the inspector, so the graph menu stays closed. */
  hideGraphMenu?: boolean
  /** Experimental FFT workspace keeps the plot clear of the legend. */
  hideLegend?: boolean
  analyzerOpen?: boolean
  onAnalyzerClose?: () => void
  onGraphEdit?: () => void
  onEnterFocus?: () => void
  /** Name on the graph’s focus control. The EQ view asks for EQ Focus. */
  focusLabel?: string
}

function emptyBands(n: number): Float32Array {
  return new Float32Array(n).fill(SPECTRUM_FLOOR_DB)
}

/** Per-bin attack/release. A new FFT size snaps to the current frame. */
function followSpectrumLine(
  prev: Float32Array | null,
  target: Float32Array,
  attackPerSec: number,
  releasePerSec: number,
  dtSec: number,
  hold?: SpectrumReleaseHold | null,
): Float32Array {
  if (!prev || prev.length !== target.length) {
    const next = new Float32Array(target.length)
    next.set(target)
    return next
  }
  followBandsOverTime(prev, target, attackPerSec, releasePerSec, dtSec, hold)
  return prev
}

function dbToY(db: number, top: number, bottom: number, minDb: number): number {
  const span = 0 - minDb
  const t = Math.min(1, Math.max(0, span > 0 ? (0 - db) / span : 1))
  return top + t * (bottom - top)
}

function hzToX(
  hz: number,
  minHz: number,
  maxHz: number,
  left: number,
  right: number,
  scale: FreqScaleKind = 'log',
): number {
  return mapHzToX(hz, minHz, maxHz, left, right, scale)
}

function readAnalyserPeaks(
  analyser: AnalyserNode | null,
  sampleRate: number,
  bandCount: number,
  minHz: number,
  scratch: { bins: Float32Array | null; time: Float32Array | null; fft: SpectrumFftScratch },
): Float32Array | null {
  if (!analyser) return null
  const fftSize = analyser.fftSize
  const binCount = fftSize >> 1
  if (binCount < 2) return null
  if (!scratch.time || scratch.time.length !== fftSize) scratch.time = new Float32Array(fftSize)
  if (!scratch.bins || scratch.bins.length !== binCount) scratch.bins = new Float32Array(binCount)
  analyser.getFloatTimeDomainData(scratch.time as Float32Array<ArrayBuffer>)
  measureSpectrumDb(scratch.time, scratch.bins, scratch.fft)
  return bandPeakDb(scratch.bins, sampleRate, bandCount, minHz, spectrumMaxHz(sampleRate, SPECTRUM_AXIS_MAX_HZ))
}

function readTimePeaks(
  time: Float32Array,
  sampleRate: number,
  bandCount: number,
  minHz: number,
  scratch: { bins: Float32Array | null; fft: SpectrumFftScratch },
): Float32Array | null {
  const fftSize = time.length
  const binCount = fftSize >> 1
  if (binCount < 2 || (fftSize & (fftSize - 1)) !== 0) return null
  if (!scratch.bins || scratch.bins.length !== binCount) scratch.bins = new Float32Array(binCount)
  measureSpectrumDb(time, scratch.bins, scratch.fft)
  return bandPeakDb(scratch.bins, sampleRate, bandCount, minHz, spectrumMaxHz(sampleRate, SPECTRUM_AXIS_MAX_HZ))
}

/** Banded FFT observer — never sits in the processing chain. */
export function Spectrum({ active, compact = false, phoneEq = false, phoneFocus = false, suppressAnalyzerChrome = false, hideGraphMenu = false, hideLegend = false, analyzerOpen = false, onAnalyzerClose, onGraphEdit, onEnterFocus, focusLabel = 'FFT' }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const listenBand = spectrumListenId(snap.spectral.enabled, snap.spectral.analyser)
  const eqMods = snap.chain.filter((m) => m.type === 'eq')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<SpectralHistoryRuntime | null>(null)
  const spatialGesture = useRef<{
    pointerId: number
    x: number
    y: number
    yaw: number
    pitch: number
    zoom: number
    pinch: number
    moved: boolean
  } | null>(null)
  const spatialPointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const compactRef = useRef(compact)
  const phoneEqRef = useRef(phoneEq)
  const phoneFocusRef = useRef(phoneFocus)
  useEffect(() => {
    compactRef.current = compact
    phoneEqRef.current = phoneEq
    phoneFocusRef.current = phoneFocus
  }, [compact, phoneEq, phoneFocus])
  const plotRef = useRef<HTMLDivElement>(null)
  const [freqScale, setFreqScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const freqScaleRef = useRef(freqScale)
  const [gridDensity, setGridDensity] = useState<FreqGridDensity>(() => loadFreqGridDensity())
  const gridDensityRef = useRef(gridDensity)
  const [gridOpen, setGridOpen] = useState(false)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [historyFrozen, setHistoryFrozen] = useState(() => spectralHistorySession().frozen)
  const [eqFocusRaw, setEqFocusRaw] = useState<string>(() => loadEqOverlayFocus())
  const eqFocus = clampEqOverlayFocus(eqFocusRaw, snap.chain)
  const [hover, setHover] = useState<{ x: number; y: number; label: string; flip: boolean; low: boolean } | null>(null)
  const [selectedBand, setSelectedBand] = useState<EqBandSelection | null>(null)
  const [bandMenu, setBandMenu] = useState<{ instanceId: string; index: number } | null>(null)
  const [dragNode, setDragNode] = useState<{ instanceId: string; index: number } | null>(null)
  const qArmedRef = useRef(false)
  const lastGraphTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const graphDown = useRef<{ id: number; x: number; y: number; t: number } | null>(null)
  const prefsRef = useRef(prefs)
  const spatialRef = useRef(false)
  const eqFocusRef = useRef(eqFocus)
  const preFast = useRef(emptyBands(prefs.bands))
  const preSlow = useRef(emptyBands(prefs.bands))
  const postFast = useRef(emptyBands(prefs.bands))
  const postSlow = useRef(emptyBands(prefs.bands))
  const drag = useRef<{
    index: number
    instanceId: string
    pointerId: number
    q0: number
    y0: number
    x0: number
    moved: number
    mode: EqDragMode
    alreadySelected: boolean
    menuOpened: boolean
    timer: number
  } | null>(null)

  useEffect(() => {
    return onPointerReset(() => {
      const active = drag.current
      if (active?.timer) window.clearTimeout(active.timer)
      drag.current = null
      setDragNode(null)
    })
  }, [])

  useEffect(() => {
    freqScaleRef.current = freqScale
    persistFreqScale(freqScale)
  }, [freqScale])

  useEffect(() => {
    gridDensityRef.current = gridDensity
  }, [gridDensity])

  useEffect(
    () =>
      subscribeFreqGridDensity((density) => {
        setGridDensity((current) => (current === density ? current : density))
      }),
    [],
  )

  useEffect(
    () =>
      subscribeFreqScale((kind) => {
        setFreqScale((current) => (current === kind ? current : kind))
      }),
    [],
  )

  useEffect(() => subscribeEqOverlayFocus(setEqFocusRaw), [])
  useEffect(() => subscribeEqBandSelection(setSelectedBand), [])

  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])
  useEffect(
    () =>
      subscribeSpectralHistorySession(() => {
        setHistoryFrozen(spectralHistorySession().frozen)
      }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return
    const onWheel = (event: WheelEvent) => {
      if (!spatialRef.current) return
      event.preventDefault()
      if (!historyRef.current) historyRef.current = createSpectralHistoryRuntime()
      const camera = historyRef.current.camera
      const next = camera.zoom * (event.deltaY > 0 ? 0.96 : 1.04)
      camera.zoom = Math.min(1.4, Math.max(0.75, next))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [active])

  useEffect(() => {
    eqFocusRef.current = eqFocus
  }, [eqFocus])

  useEffect(() => {
    prefsRef.current = prefs
    spatialRef.current = prefs.viewMode === '3d' && !phoneEq && !phoneFocus
    persistSpectrumPrefs(prefs)
  }, [prefs, phoneEq, phoneFocus])

  useEffect(() => {
    preFast.current = emptyBands(prefs.bands)
    preSlow.current = emptyBands(prefs.bands)
    postFast.current = emptyBands(prefs.bands)
    postSlow.current = emptyBands(prefs.bands)
  }, [prefs.bands])

  useEffect(() => {
    if (!active) {
      engine.setSpectrumFftSize(ANALYSER_FFT_IDLE)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    engine.setSpectrumFftSize(prefsRef.current.resolution)
    let frame = 0
    const preScratch = { bins: null as Float32Array | null, time: null as Float32Array | null, fft: { window: null, real: null, imag: null } }
    const postScratch = { bins: null as Float32Array | null, time: null as Float32Array | null, fft: { window: null, real: null, imag: null } }
    let preLineFast: Float32Array | null = null
    let preLineSlow: Float32Array | null = null
    let postLineFast: Float32Array | null = null
    let postLineSlow: Float32Array | null = null
    const holds: Record<string, Float32Array | null> = {
      preFast: null,
      preSlow: null,
      postFast: null,
      postSlow: null,
      preLineFast: null,
      preLineSlow: null,
      postLineFast: null,
      postLineSlow: null,
    }
    const releaseHold = (key: string, length: number, rates: SpectrumFallRates): SpectrumReleaseHold => {
      const current = holds[key]
      if (!current || current.length !== length) holds[key] = new Float32Array(length)
      return { holdSec: rates.holdSec, settleDb: rates.settleDb, elapsed: holds[key]! }
    }
    let lineXY = new Float32Array(4096)
    let lastTs = 0
    const tick = (now: number) => {
      const elapsed = lastTs === 0 ? 1 / 60 : Math.max(0, (now - lastTs) / 1000)
      const dt = Math.min(0.05, elapsed)
      lastTs = now
      if (isDocumentHidden()) {
        lastTs = 0
        frame = requestAnimationFrame(tick)
        return
      }
      const live = engine.getSnapshot()
      const scale = freqScaleRef.current
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (ctx) {
        try {
        const colors = readThemeColors()
        const prefsNow = prefsRef.current
        const focusPlot = phoneFocusRef.current
        if (prefsNow.viewMode === '3d' && !phoneEqRef.current && !focusPlot) {
          if (!historyRef.current) historyRef.current = createSpectralHistoryRuntime()
          engine.setSpectrumFftSize(prefsNow.resolution)
          const sr = live.sampleRate || 44100
          const taps = spectrumLayerTaps(prefsNow.historyLayer)
          const showPre = taps.includes('pre')
          const showPost = taps.includes('post')
          const listenId = spectrumListenId(live.spectral.enabled, live.spectral.analyser)
          let preBins: Float32Array | null = null
          let postBins: Float32Array | null = null
          if (listenId) {
            const mono = engine.spectralBandMono(listenId)
            const fftSize = engine.getAnalyser('post')?.fftSize ?? prefsNow.resolution
            if (mono) {
              const frame = frameAround(mono, engine.getSourcePlayheadSeconds() * sr, fftSize)
              postBins = readTimeDomainSpectrumBins(frame, postScratch)
            }
          } else {
            if (showPre) preBins = readAnalyserSpectrumBins(engine.getAnalyser('pre'), preScratch)
            if (showPost) postBins = readAnalyserSpectrumBins(engine.getAnalyser('post'), postScratch)
          }
          const cssW = rect.width
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          paintSpectralHistory(ctx, width, height, historyRef.current, {
            dt: Math.min(1, elapsed),
            dpr,
            cssWidth: cssW,
            cssHeight: rect.height,
            playing: live.playing,
            sampleRate: sr,
            preBins,
            postBins,
            showPre: listenId ? false : showPre,
            showPost: listenId ? true : showPost,
            historySec: prefsNow.historySec,
            density: prefsNow.density,
            drawStyle: prefsNow.drawStyle,
            colorMode: prefsNow.colorMode,
            peakTrails: prefsNow.peakTrails,
            cameraPreset: prefsNow.cameraPreset,
            fall: prefsNow.fall,
            range: prefsNow.range,
            scale,
            colors,
            mobile: compactRef.current || cssW < 720,
            reducedMotion: reduced,
            layer: listenId ? 'post' : prefsNow.historyLayer,
          })
          frame = requestAnimationFrame(tick)
          return
        }
        const layer = prefsNow.layer
        const follow = focusPlot ? 'peak' : prefsNow.follow
        const regionColors = focusPlot ? false : prefsNow.regionColors
        const showBars = focusPlot ? prefsNow.showBars || !prefsNow.showLine : prefsNow.showBars
        const showLine = focusPlot ? prefsNow.showLine || !prefsNow.showBars : prefsNow.showLine
        const { bands, fall, range, resolution } = prefsNow
        engine.setSpectrumFftSize(resolution)
        const ballistics = spectrumFallBallistics(fall)
        const display = spectrumDisplayUses(follow)
        ctx.clearRect(0, 0, width, height)
        const sr = live.sampleRate || 44100
        const maxHz = spectrumMaxHz(sr, SPECTRUM_AXIS_MAX_HZ)
        const minHz = SPECTRUM_AXIS_MIN_HZ
        const phoneScale = phoneEqRef.current && !focusPlot
        const plotPad = spectrumPlotPad({ compact: compactRef.current, focus: focusPlot, phoneEq: phoneScale })
        const padL = plotPad.left * dpr
        const padR = plotPad.right * dpr
        const padT = plotPad.top * dpr
        const padB = plotPad.bottom * dpr
        const left = padL
        const right = width - padR
        const top = padT
        const bottom = height - padB
        const plotW = Math.max(1, right - left)

        const plotH = Math.max(1, bottom - top)
        const dbFloor = spectrumDisplayFloorDb(range)
        const tight = compactRef.current || focusPlot
        const dbMarks = tight ? compactDbMarks(dbFloor) : spectrumDbScaleMarks(dbFloor, plotH / dpr)

        const eqZeroY = spectrumEqOverlayY(0, top, bottom, SPECTRUM_EQ_MIN_DB, SPECTRUM_EQ_MAX_DB)
        const fadeAboveZero = (y: number) => {
          if (!focusPlot || y >= eqZeroY) return 1
          const span = Math.max(1, eqZeroY - top)
          const t = Math.min(1, Math.max(0, (eqZeroY - y) / span))
          const smooth = t * t * (3 - 2 * t)
          return 1 - smooth
        }
        ctx.fillStyle = colors.textMuted
        ctx.font = `${8 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = tight || phoneScale ? 'left' : 'right'
        ctx.textBaseline = 'middle'
        for (const db of dbMarks) {
          const y = dbToY(db, top, bottom, dbFloor)
          const fade = fadeAboveZero(y)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, (db === 0 || db === -6 || db === -12 ? 1 : 0.75) * fade)
          ctx.lineWidth = dpr * (db === 0 || db === -6 || db === -12 ? 0.7 : 0.45)
          ctx.beginPath()
          ctx.moveTo(left, y)
          ctx.lineTo(right, y)
          ctx.stroke()
          ctx.fillStyle = colorWithAlpha(colors.textMuted, (tight ? 0.55 : 1) * fade)
          ctx.fillText(`${db}`, tight ? left + 4 * dpr : phoneScale ? 2 * dpr : left - 5 * dpr, y)
        }
        if (!tight && !phoneScale) {
          ctx.textAlign = 'left'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.9)
          ctx.font = `${7 * dpr}px ui-sans-serif, system-ui, sans-serif`
          ctx.fillText('dB', 4 * dpr, top - 3 * dpr)
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const density = gridDensityRef.current
        const hzSource = frequencyGuideHz(minHz, maxHz, density, scale)
        const hzTicks = hzSource.map((hz) => {
          ctx.font = `${9 * dpr}px ui-sans-serif, system-ui, sans-serif`
          const label = formatFreqTick(hz)
          return {
            hz,
            major: true,
            x: hzToX(hz, minHz, maxHz, left, right, scale),
            width: ctx.measureText(label).width,
            label,
          }
        })
        for (let i = 0; i < hzTicks.length; i++) {
          const tick = hzTicks[i]!
          const ink = colorWithAlpha(colors.textMuted, 0.72)
          if (focusPlot) {
            const grad = ctx.createLinearGradient(0, top, 0, eqZeroY)
            grad.addColorStop(0, colorWithAlpha(colors.textMuted, 0))
            grad.addColorStop(0.35, colorWithAlpha(colors.textMuted, 0.05))
            grad.addColorStop(0.72, colorWithAlpha(colors.textMuted, 0.28))
            grad.addColorStop(1, ink)
            ctx.strokeStyle = grad
          } else {
            ctx.strokeStyle = ink
          }
          ctx.lineWidth = dpr * 1.05
          ctx.beginPath()
          ctx.moveTo(tick.x, top)
          ctx.lineTo(tick.x, bottom)
          ctx.stroke()
        }
        if (focusPlot) {
          ctx.strokeStyle = colorWithAlpha(colors.textMuted, 0.72)
          ctx.lineWidth = dpr
          ctx.beginPath()
          ctx.moveTo(left, bottom)
          ctx.lineTo(right, bottom)
          ctx.stroke()
        }

        ctx.textBaseline = 'bottom'
        ctx.fillStyle = colorWithAlpha(colors.textPrimary, 0.82)
        ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`
        const noteTicks = musicalScaleHz(minHz, maxHz).map((tick) => {
          const label = tick.label
          return {
            ...tick,
            x: hzToX(tick.hz, minHz, maxHz, left, right, scale),
            width: ctx.measureText(label).width,
            label,
          }
        })
        const noteLabelOn = visibleAxisLabelIndices(noteTicks, 8 * dpr)

        const drawLayer = (
          peaks: Float32Array | null,
          fast: Float32Array,
          slow: Float32Array,
          style: 'pre' | 'post',
        ) => {
          if (!peaks) return
          const barKey = style === 'pre' ? 'pre' : 'post'
          followBandsOverTime(
            fast,
            peaks,
            ballistics.peak.attack,
            ballistics.peak.release,
            dt,
            releaseHold(`${barKey}Fast`, fast.length, ballistics.peak),
          )
          followBandsOverTime(
            slow,
            peaks,
            ballistics.slow.attack,
            ballistics.slow.release,
            dt,
            releaseHold(`${barKey}Slow`, slow.length, ballistics.slow),
          )
          const edges = logBandEdgesHz(minHz, maxHz, bands)
          const gap = Math.max(1, Math.floor((plotW / bands) * 0.12))
          const plotBox = { left, right, top, bottom }
          const wantPeak = display.lines.includes('peak')
          const wantSlow = display.lines.includes('slow')
          const bodySrc = display.barBody === 'slow' ? slow : fast
          const capSrc = display.barCap === 'slow' ? slow : fast
          const phoneDim = phoneEqRef.current ? 0.62 : 1
          const alpha = (style === 'pre' ? (layer === 'both' ? 0.22 : 0.42) : layer === 'both' ? 0.55 : 0.42) * phoneDim
          const lineAlpha = (style === 'pre' ? (layer === 'both' ? 0.55 : 0.85) : 0.95) * phoneDim
          const fill = regionColors ? undefined : colors.spectrum
          const line = regionColors ? undefined : colors.spectrumLine
          const dashed = style === 'pre' && layer === 'both'
          const peakStroke = colorWithAlpha(style === 'pre' ? colors.textMuted : colors.spectrumLine, lineAlpha)
          const slowStroke =
            follow === 'both'
              ? colorWithAlpha(colors.spectrumLine, style === 'pre' ? 0.55 : 0.85)
              : peakStroke
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          if (showBars) {
            for (let i = 0; i < bands; i++) {
              const x0 = hzToX(edges[i] ?? minHz, minHz, maxHz, left, right, scale)
              const x1 = hzToX(edges[i + 1] ?? maxHz, minHz, maxHz, left, right, scale)
              const bandW = Math.max(1, x1 - x0)
              const center = bandCenterHz(edges, i)
              const regionColor = eqBandColorForHz(center)
              const barFill = fill ?? regionColor
              const barLine = line ?? regionColor
              const bodyDb = alignedBandDb(bodySrc[i] ?? SPECTRUM_FLOOR_DB, 0)
              const capDb = alignedBandDb(capSrc[i] ?? SPECTRUM_FLOOR_DB, 0)
              const bodyY = dbToY(bodyDb, top, bottom, dbFloor)
              const capY = dbToY(capDb, top, bottom, dbFloor)
              const bodyH = bottom - bodyY
              const capH = bottom - capY
              ctx.fillStyle = colorWithAlpha(barFill, alpha)
              ctx.fillRect(x0 + gap / 2, bottom - bodyH, Math.max(1, bandW - gap), bodyH)
              if (style === 'post' || layer !== 'both') {
                ctx.fillStyle = barLine
                ctx.fillRect(x0 + gap / 2, capY, Math.max(1, bandW - gap), Math.max(2, dpr))
                ctx.fillStyle = colorWithAlpha(barLine, 0.35)
                ctx.fillRect(x0 + gap / 2, capY, Math.max(1, bandW - gap), Math.min(capH, 8 * dpr))
              }
            }
          }
          const lineFast = style === 'pre' ? preLineFast : postLineFast
          const lineSlow = style === 'pre' ? preLineSlow : postLineSlow
          const paintLine = (
            src: Float32Array | null,
            color: string,
            width: number,
            dash: boolean,
            fill: boolean,
            stroke: boolean,
          ) => {
            if (!src || (!fill && !stroke)) return
            const curvePoints = spectrumCurvePointCount(plotW)
            if (curvePoints < 2) return
            if (lineXY.length < curvePoints * 2) lineXY = new Float32Array(curvePoints * 2)
            const count = writeSpectrumCurve(
              src,
              sr,
              minHz,
              maxHz,
              plotBox,
              lineXY,
              0,
              dbFloor,
              0,
              scale,
              curvePoints,
            )
            if (fill) {
              const area = style === 'pre' ? colors.spectrum : colors.spectrumLine
              ctx.fillStyle = colorWithAlpha(area, style === 'pre' ? (layer === 'both' ? 0.08 : 0.16) : 0.18)
              fillSpectrumXY(ctx, lineXY, count, bottom)
            }
            if (!stroke) return
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            ctx.strokeStyle = color
            ctx.lineWidth = width
            ctx.setLineDash(dash ? [4 * dpr, 3 * dpr] : [])
            strokeSpectrumXY(ctx, lineXY, count)
            ctx.setLineDash([])
          }
          const bodyLine = display.barBody === 'peak' ? lineFast : lineSlow
          if (!showBars) paintLine(bodyLine, peakStroke, 1, false, true, false)
          if (showLine && wantPeak) {
            paintLine(lineFast, peakStroke, Math.max(1, dpr * 1.15), dashed, false, true)
          }
          if (showLine && wantSlow) {
            paintLine(
              lineSlow,
              slowStroke,
              Math.max(1, dpr * (follow === 'both' ? 1 : 1.15)),
              dashed || follow === 'both',
              false,
              true,
            )
          }
          ctx.restore()
        }

        const taps = spectrumLayerTaps(layer)
        const showPre = taps.includes('pre')
        const showPost = taps.includes('post')
        const listenId = spectrumListenId(engine.getSnapshot().spectral.enabled, engine.getSnapshot().spectral.analyser)
        let bandPeaks: Float32Array | null = null
        if (listenId) {
          const mono = engine.spectralBandMono(listenId)
          const fftSize = engine.getAnalyser('post')?.fftSize ?? 2048
          if (mono) {
            const rate = engine.getSnapshot().sampleRate || sr
            const frame = frameAround(mono, engine.getSourcePlayheadSeconds() * rate, fftSize)
            bandPeaks = readTimePeaks(frame, sr, bands, minHz, postScratch)
          }
        }
        const prePeaks = listenId ? null : showPre ? readAnalyserPeaks(engine.getAnalyser('pre'), sr, bands, minHz, preScratch) : null
        const postPeaks = listenId ? bandPeaks : showPost ? readAnalyserPeaks(engine.getAnalyser('post'), sr, bands, minHz, postScratch) : null
        const lineAttack = ballistics.peak.attack
        const lineRelease = ballistics.peak.release
        const slowAttack = ballistics.slow.attack
        const slowRelease = ballistics.slow.release
        if (!listenId && showPre && preScratch.bins) {
          preLineFast = followSpectrumLine(
            preLineFast,
            preScratch.bins,
            lineAttack,
            lineRelease,
            dt,
            releaseHold('preLineFast', preScratch.bins.length, ballistics.peak),
          )
          preLineSlow = followSpectrumLine(
            preLineSlow,
            preScratch.bins,
            slowAttack,
            slowRelease,
            dt,
            releaseHold('preLineSlow', preScratch.bins.length, ballistics.slow),
          )
        }
        if (!listenId && showPost && postScratch.bins) {
          const followedFast = followSpectrumLine(
            postLineFast,
            postScratch.bins,
            lineAttack,
            lineRelease,
            dt,
            releaseHold('postLineFast', postScratch.bins.length, ballistics.peak),
          )
          const followedSlow = followSpectrumLine(
            postLineSlow,
            postScratch.bins,
            slowAttack,
            slowRelease,
            dt,
            releaseHold('postLineSlow', postScratch.bins.length, ballistics.slow),
          )
          postLineFast = followedFast
          postLineSlow = followedSlow
        }
        if (!listenId && showPre) {
          drawLayer(prePeaks, preFast.current, preSlow.current, 'pre')
        }
        if (listenId || showPost) {
          drawLayer(postPeaks, postFast.current, postSlow.current, 'post')
        }

        const combinedBands: (typeof live.eqBands) = []
        const eqs = live.chain.filter((m) => m.type === 'eq')
        const overlayFocus = eqFocusRef.current
        const freqs = displayFrequencies(responseSampleCount(plotW), minHz, maxHz, scale)
        const responsePlot = { left, right, top, bottom }
        for (let ei = 0; ei < eqs.length; ei++) {
          const mod = eqs[ei]
          if (!mod) continue
          const st = live.eqById[mod.instanceId]
          if (!st) continue
          const hasShape = st.bands.some((b) => b.type !== 'off') || st.comb.enabled
          if (!hasShape) continue
          const instanceLive = live.liveByInstance[mod.instanceId]
          const curveLive = instanceLive ?? live.liveParams
          const modulateCurve = Boolean(instanceLive) || eqInstanceUsesSharedLfo(live.chain, mod.instanceId)
          const dragNow = drag.current
          const shaped = eqCurveBands(
            st.bands,
            {
              lfos: live.fxLfos,
              automation: live.automation,
              live: curveLive,
              timeSec: live.transportSec,
              playing: live.playing,
              modulate: modulateCurve,
            },
            dragNow?.instanceId === mod.instanceId ? dragNow.index : null,
          )
          const storedBands = [...shaped, ...combAsEqBands(st.comb)]
          const tone = eqTone(ei, colors)
          const focused = eqOverlayIncludes(overlayFocus, mod.instanceId)
          const processing = storedBands
          const layers = eqGraphLayers(focusPlot)
          if (!layers.includes('perBand') && focusPlot) {
            if (focused) combinedBands.push(...processing)
            continue
          }
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          const storedStyle = eqResponseCurveStyle('stored', mod.bypassed, dpr)
          const eqVerts = layoutMagnitudeCurve(
            freqs,
            (hz) => eqMagnitudeDb(processing, hz, sr),
            responsePlot,
            minHz,
            maxHz,
            SPECTRUM_EQ_MIN_DB,
            SPECTRUM_EQ_MAX_DB,
            scale,
          )
          const responseInk = phoneEqRef.current ? colors.textPrimary : tone.curve
          ctx.setLineDash(mod.bypassed ? [5 * dpr, 4 * dpr] : [])
          ctx.strokeStyle = colorWithAlpha(responseInk, storedStyle.alpha * (focused ? 1 : 0.28))
          ctx.lineWidth = storedStyle.width * (phoneEqRef.current ? 1.45 : 1) * (focused ? 1 : 0.85)
          strokeMagnitudeVertices(ctx, eqVerts)
          ctx.restore()
        }
        if (focusPlot && combinedBands.some((band) => bandIsActive(band))) {
          const storedStyle = eqResponseCurveStyle('stored', false, dpr)
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          const eqVerts = layoutMagnitudeCurve(
            freqs,
            (hz) => eqMagnitudeDb(combinedBands, hz, sr),
            responsePlot,
            minHz,
            maxHz,
            SPECTRUM_EQ_MIN_DB,
            SPECTRUM_EQ_MAX_DB,
            scale,
          )
          ctx.setLineDash([])
          ctx.strokeStyle = colorWithAlpha(colors.textPrimary, storedStyle.alpha)
          ctx.lineWidth = storedStyle.width * 1.45
          strokeMagnitudeVertices(ctx, eqVerts)
          ctx.restore()
        }
        const filterMod = live.chain.find((m) => m.type === 'filter')
        if (eqGraphLayers(focusPlot).includes('filter') && filterMod && filterModuleIsAudible(filterMod.bypassed, live.liveParams.filterMix)) {
          const filterVerts = layoutMagnitudeCurve(
            freqs,
            (hz) =>
              filterMixMagnitudeDb(filterMagnitudeDb(live.liveParams, hz, sr), live.liveParams.filterMix),
            responsePlot,
            minHz,
            maxHz,
            SPECTRUM_EQ_MIN_DB,
            SPECTRUM_EQ_MAX_DB,
            scale,
          )
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          const filterStyle = processorCurveStyle('filter', filterMod.bypassed, dpr)
          const filterInk = filterCurveColor(colors.accentSecondary, colors.textPrimary)
          ctx.lineCap = 'butt'
          ctx.lineJoin = 'round'
          ctx.setLineDash([])
          ctx.strokeStyle = colorWithAlpha(filterInk, 0.22)
          ctx.lineWidth = Math.max(1, dpr)
          strokeMagnitudeVertices(ctx, filterVerts)
          ctx.setLineDash(filterStyle.dash)
          ctx.strokeStyle = colorWithAlpha(filterInk, filterStyle.alpha)
          ctx.lineWidth = filterStyle.width
          strokeMagnitudeVertices(ctx, filterVerts)
          ctx.setLineDash([])
          ctx.restore()
        }

        if (!tight) {
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = colorWithAlpha(colors.textPrimary, 0.82)
          ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`
          for (let i = 0; i < noteTicks.length; i++) {
            if (!noteLabelOn.has(i)) continue
            const tick = noteTicks[i]!
            ctx.fillText(tick.label, tick.x, top - 6 * dpr)
          }
        }
        ctx.textAlign = 'center'
        ctx.textBaseline = tight && !focusPlot ? 'bottom' : 'top'
        ctx.fillStyle = colorWithAlpha(colors.textMuted, tight ? 0.9 : 1)
          for (let i = 0; i < hzTicks.length; i++) {
          const tick = hzTicks[i]!
          ctx.font = `${(tick.major ? 9 : 8) * dpr}px ui-sans-serif, system-ui, sans-serif`
          const labelY = focusPlot
            ? bottom + SPECTRUM_FOCUS_HZ_LABEL_OFFSET * dpr
            : tight
              ? bottom - 4 * dpr
              : bottom + SPECTRUM_HZ_LABEL_OFFSET * dpr
          ctx.fillText(tick.label, tick.x, labelY)
        }
        } catch {
          /* A bad frame must not stop the analyzer loop. */
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      engine.setSpectrumFftSize(ANALYSER_FFT_IDLE)
    }
  }, [active])

  const endNodePointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (d?.pointerId === event.pointerId) {
      if (d.timer) window.clearTimeout(d.timer)
      if (phoneFocusRef.current) {
        const armed = nextQArmed({
          mode: d.mode,
          alreadySelected: d.alreadySelected,
          movedPx: d.moved,
          menuOpened: d.menuOpened,
        })
        qArmedRef.current = armed
      }
      drag.current = null
      setDragNode(null)
      if (event.pointerType !== 'mouse') setHover(null)
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const onNodePointerDown = (
    instanceId: string,
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!isPrimaryPointerDown(event)) return
    event.preventDefault()
    event.stopPropagation()
    const alreadySelected = selectedBand?.instanceId === instanceId && selectedBand.index === index
    const mode = phoneFocus ? eqDragMode(alreadySelected, qArmedRef.current) : 'xy'
    selectEqBand({ instanceId, index })
    if (!phoneEq) onGraphEdit?.()
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)
    const bands = snap.eqById[instanceId]?.bands ?? snap.eqBands
    const timer = phoneFocus
      ? window.setTimeout(() => {
          const current = drag.current
          if (!current || current.pointerId !== pointerId || current.moved > EQ_FOCUS_TAP_PX) return
          current.menuOpened = true
          window.clearTimeout(current.timer)
          drag.current = null
          qArmedRef.current = false
          setBandMenu({ instanceId, index })
        }, EQ_FOCUS_LONG_PRESS_MS)
      : 0
    setDragNode({ instanceId, index })
    drag.current = {
      index,
      instanceId,
      pointerId: event.pointerId,
      q0: bands[index]?.q ?? 1,
      y0: event.clientY,
      x0: event.clientX,
      moved: 0,
      mode,
      alreadySelected,
      menuOpened: false,
      timer,
    }
  }

  const onNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    const plot = plotRef.current
    if (!d || d.pointerId !== event.pointerId || !plot) return
    if (!isPrimaryPointerHeld(event)) {
      if (d.timer) window.clearTimeout(d.timer)
      drag.current = null
      setDragNode(null)
      return
    }
    d.moved = Math.hypot(event.clientX - d.x0, event.clientY - d.y0)
    if (d.timer && d.moved > EQ_FOCUS_TAP_PX) {
      window.clearTimeout(d.timer)
      d.timer = 0
    }
    const rect = plot.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const band = (snap.eqById[d.instanceId]?.bands ?? snap.eqBands)[d.index]
    if (!band) return
    const canvas = canvasRef.current
    if (canvas) {
      const crect = canvas.getBoundingClientRect()
      const hx = event.clientX - crect.left
      const hy = event.clientY - crect.top
      const pad = spectrumPlotPad({
        compact: compactRef.current,
        focus: phoneFocusRef.current,
        phoneEq: phoneEqRef.current && !phoneFocusRef.current,
      })
      const plotMax = spectrumMaxHz(snap.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
      const hz = xToHz(hx, SPECTRUM_AXIS_MIN_HZ, plotMax, pad.left, crect.width - pad.right, freqScaleRef.current)
      setHover({ x: hx, y: hy, label: formatHoverFreq(hz), flip: hx > crect.width * 0.68, low: hy < 28 })
    }
    if (phoneFocusRef.current && d.mode === 'q') {
      engine.setEqBand(d.index, { q: qFromVertical(d.q0, d.y0 - event.clientY) }, d.instanceId)
      return
    }
    const plotMaxHz = spectrumMaxHz(snap.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
    const frequency = xToFreq(x, rect.width, plotMaxHz, SPECTRUM_AXIS_MIN_HZ, freqScaleRef.current)
    const db = eqYToDb(y, rect.height, SPECTRUM_EQ_MIN_DB, SPECTRUM_EQ_MAX_DB)
    engine.setEqBand(d.index, eqBandDragPatch(band, frequency, db, d.q0, d.y0 - event.clientY), d.instanceId)
  }

  const placeBellAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || drag.current) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const pad = spectrumPlotPad({ compact, focus: phoneFocusRef.current, phoneEq: phoneEqRef.current && !phoneFocusRef.current })
    const left = pad.left
    const right = rect.width - pad.right
    const top = pad.top
    const bottom = rect.height - pad.bottom
    if (x < left || x > right || y < top || y > bottom) return
    const live = engine.getSnapshot()
    const plotMax = spectrumMaxHz(live.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
    const bell = bellFromPlotPoint(
      x - left,
      y - top,
      Math.max(1, right - left),
      Math.max(1, bottom - top),
      plotMax,
      SPECTRUM_AXIS_MIN_HZ,
      freqScaleRef.current,
    )
    const focusId = eqFocusRef.current
    const target =
      focusId !== 'all' && eqMods.some((mod) => mod.instanceId === focusId)
        ? focusId
        : (eqMods[0]?.instanceId ?? null)
    placeEqBell(target, live.chain.length, bell)
  }

  useEffect(() => {
    if (!bandMenu) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setBandMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bandMenu])

  useEffect(
    () => () => {
      if (drag.current?.timer) window.clearTimeout(drag.current.timer)
    },
    [],
  )

  const inspectSpatial = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const runtime = historyRef.current
    if (!canvas || !runtime) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setHover(null)
      return
    }
    const dpr = canvas.width / Math.max(1, rect.width)
    const hit = inspectSpectralHistory(runtime, x * dpr, y * dpr, 18 * dpr)
    if (!hit) {
      setHover(null)
      return
    }
    setHover({
      x,
      y,
      label: formatSpectralReadout(hit.hz, hit.db, hit.ageSec).join('\n'),
      flip: x > rect.width * 0.62,
      low: y < 48,
    })
  }

  if (!active) return null
  const plotPad = spectrumPlotPad({ compact, focus: phoneFocus, phoneEq: phoneEq && !phoneFocus })
  const menuBand =
    bandMenu ? (snap.eqById[bandMenu.instanceId]?.bands ?? [])[bandMenu.index] : undefined
  const eqCurveOn = eqMods.some((mod) => {
    const st = snap.eqById[mod.instanceId]
    if (!st) return false
    return st.bands.some((band) => band.type !== 'off') || st.comb.enabled
  })
  const filterCurveOn = snap.chain.some(
    (mod) => mod.type === 'filter' && filterModuleIsAudible(mod.bypassed, snap.liveParams.filterMix),
  )
  const showResponseKey = !phoneFocus && shouldShowResponseLegend(eqCurveOn, filterCurveOn)
  const spatial = prefs.viewMode === '3d' && !phoneEq && !phoneFocus
  return (
    <div
      className={`${styles.wrap} ${compact ? styles.compact : ''} ${phoneEq ? styles.phoneEq : ''} ${phoneFocus ? styles.eqFocus : ''} ${analyzerOpen && !phoneEq && !phoneFocus ? styles.analyzerOpen : ''}`}
      role="region"
      aria-label={
        prefs.viewMode === '3d' && !phoneEq && !phoneFocus
          ? spectralHistoryAriaLabel(prefs.historySec, historyFrozen)
          : 'Spectrum analyzer'
      }
    >
      {onEnterFocus && (compact || phoneEq) && !phoneFocus && !suppressAnalyzerChrome ? (
        <EnterFocusButton corner label={focusLabel} onClick={onEnterFocus} />
      ) : null}
      {suppressAnalyzerChrome ? null : (
      <div
        className={styles.chrome}
      >
        <div className={styles.chromeLeft}>
          {spatial ? <SpectralHistoryControls /> : (
          <>
          {compact ? (
            <button type="button" className={styles.analyzerClose} onClick={onAnalyzerClose}>
              ×
            </button>
          ) : null}
          {spectralBandsEnabled && listenBand ? (
            <span className={styles.bands}>
              {t.waveform.spectral.analyseBand}: {t.waveform.spectral[listenBand === 'sub-bass' ? 'subBass' : listenBand === 'low-mid' ? 'lowMid' : listenBand === 'high-mid' ? 'highMid' : listenBand === 'high' ? 'high' : 'analyseSum']}
            </span>
          ) : null}
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Layer
            <select
              aria-label="EQ spectrum layer"
              value={prefs.layer}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, layer: event.target.value as SpectrumLayer }))
              }
            >
              <option value="pre">Before</option>
              <option value="post">After</option>
              <option value="both">Both</option>
            </select>
          </label>
          {eqMods.length > 1 ? (
            <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
              EQ
              <select
                aria-label="EQ overlay"
                value={eqFocus}
                onChange={(event) => {
                  const next = clampEqOverlayFocus(event.target.value, snap.chain)
                  setEqFocusRaw(next)
                  persistEqOverlayFocus(next)
                }}
              >
                {eqOverlayOptions(snap.chain).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Scale
            <select
              aria-label="Frequency scale"
              title="Change how Hertz are spaced across the FFT"
              value={freqScale}
              onChange={(event) => setFreqScale(event.target.value as FreqScaleKind)}
            >
              {FREQ_SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} title={opt.title}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            EQ ch
            <select
              aria-label="EQ channel"
              title="Shared EQ, or independent left / right curves"
              value={snap.eqChannelMode}
              onChange={(event) => engine.setEqChannelMode(event.target.value as (typeof EQ_CHANNEL_MODES)[number]['value'])}
            >
              {EQ_CHANNEL_MODES.map((opt) => (
                <option key={opt.value} value={opt.value} title={opt.title}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Columns
            <select
              aria-label="Spectrum display columns"
              title="How many columns the bars use. Does not change FFT resolution."
              value={prefs.bands}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, bands: clampSpectrumBandCount(Number(event.target.value)) }))
              }
            >
              {SPECTRUM_BAND_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Range
            <select
              aria-label="Analyzer range"
              title="Spectrum scale from 0 dB down. Quiet bins stay measured; this does not stretch them. The EQ curve keeps its own scale."
              value={prefs.range}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, range: clampSpectrumRange(Number(event.target.value)) }))
              }
            >
              {SPECTRUM_RANGE_CHOICES.map((db) => (
                <option key={db} value={db}>
                  {db} dB
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            FFT
            <select
              aria-label="Analyzer resolution"
              title="FFT length. 8192 resolves lower frequencies and reacts more slowly than 1024. Separate from display columns."
              value={prefs.resolution}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, resolution: clampSpectrumResolution(Number(event.target.value)) }))
              }
            >
              {SPECTRUM_RESOLUTION_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Fall
            <select
              aria-label="Spectrum fall speed"
              title="Time-based release of the spectrum. Fast, Normal, and Slow all reach the floor. Slow is a longer release, not a freeze."
              value={prefs.fall}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, fall: clampSpectrumFallMode(event.target.value) }))
              }
            >
              {SPECTRUM_FALL_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'slow' ? 'Slow' : mode === 'fast' ? 'Fast' : 'Normal'}
                </option>
              ))}
            </select>
          </label>
          <label
            className={styles.bands}
            onMouseDown={(event) => {
              const sel = event.currentTarget.querySelector('select')
              if (sel && 'showPicker' in sel && typeof sel.showPicker === 'function' && event.target !== sel) {
                event.preventDefault()
                sel.showPicker()
              }
            }}
          >
            Follow
            <select
              aria-label="Spectrum envelope follow"
              title="Peak trace, slow trace, or both. Fall sets how quickly they drop."
              value={prefs.follow}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, follow: clampSpectrumFollowMode(event.target.value) }))
              }
            >
              {SPECTRUM_FOLLOW_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'peak' ? 'Peak' : mode === 'slow' ? 'Slow' : 'Both'}
                </option>
              ))}
            </select>
          </label>
          </>
          )}
        </div>
        <div className={styles.chromeRight}>
          {spatial ? null : showResponseKey ? (
            <ul className={styles.curveKey} aria-label="Response curves">
              <li>
                <i className={styles.eqSwatch} />
                EQ
              </li>
              <li>
                <i className={styles.filterSwatch} />
                Filter
              </li>
            </ul>
          ) : null}
          {spatial ? null : <>
          <button
            type="button"
            className={`${styles.iconTap} ${prefs.eqFreqColors ? styles.on : ''}`}
            aria-pressed={prefs.eqFreqColors}
            aria-label={prefs.eqFreqColors ? 'Frequency colors on' : 'Frequency colors off'}
            title={prefs.eqFreqColors ? 'Frequency colors on' : 'Color EQ nodes by frequency'}
            onClick={() => setPrefs((p) => ({ ...p, eqFreqColors: !p.eqFreqColors }))}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="4" cy="8" r="2.2" fill="#d97706" />
              <circle cx="8" cy="8" r="2.2" fill="#16a34a" />
              <circle cx="12" cy="8" r="2.2" fill="#7c3aed" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconTap} ${prefs.regionColors ? styles.on : ''}`}
            aria-pressed={prefs.regionColors}
            aria-label={prefs.regionColors ? 'Use solid band color' : 'Use region band colors'}
            title="Band colors"
            onClick={() => setPrefs((p) => ({ ...p, regionColors: !p.regionColors }))}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="5" cy="6" r="3" fill="currentColor" opacity="0.85" />
              <circle cx="11" cy="6" r="3" fill="currentColor" opacity="0.55" />
              <circle cx="8" cy="11" r="3" fill="currentColor" opacity="0.7" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconTap} ${prefs.showBars ? styles.on : ''}`}
            aria-pressed={prefs.showBars}
            aria-label={prefs.showBars ? 'Hide FFT bars' : 'Show FFT bars'}
            title={prefs.showBars ? 'Hide bars' : 'Show bars'}
            onClick={() => setPrefs((p) => ({ ...p, showBars: !p.showBars }))}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="2" y="8" width="3" height="6" rx="0.6" fill="currentColor" />
              <rect x="6.5" y="3" width="3" height="11" rx="0.6" fill="currentColor" />
              <rect x="11" y="6" width="3" height="8" rx="0.6" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconTap} ${prefs.showLine ? styles.on : ''}`}
            aria-pressed={prefs.showLine}
            aria-label={prefs.showLine ? 'Hide spectrum line' : 'Show spectrum line'}
            title={prefs.showLine ? 'Hide line' : 'Show line'}
            onClick={() => setPrefs((p) => ({ ...p, showLine: !p.showLine }))}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M1.5 11.5 L4.5 6.5 L7.2 9.2 L10.5 3.5 L14.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.iconTap} ${prefs.legendOpen ? styles.on : ''}`}
            aria-pressed={prefs.legendOpen}
            aria-label={prefs.legendOpen ? 'Hide spectrum legend' : 'Show spectrum legend'}
            title={prefs.legendOpen ? 'Hide legend' : 'Show legend'}
            onClick={() => setPrefs((p) => ({ ...p, legendOpen: !p.legendOpen }))}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="1.5" y="2" width="3" height="3" rx="1" fill="currentColor" />
              <rect x="6.5" y="2.5" width="8" height="2" rx="1" fill="currentColor" />
              <rect x="1.5" y="6.5" width="3" height="3" rx="1" fill="currentColor" />
              <rect x="6.5" y="7" width="8" height="2" rx="1" fill="currentColor" />
              <rect x="1.5" y="11" width="3" height="3" rx="1" fill="currentColor" />
              <rect x="6.5" y="11.5" width="8" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          </>}
        </div>
        <div className={styles.viewAnchor}>
          <FftViewToggle
            mode={prefs.viewMode}
            onChange={(viewMode) => persistSpectrumPrefs({ ...prefs, viewMode })}
          />
          {onEnterFocus && !compact && !phoneEq ? <EnterFocusButton label={focusLabel} onClick={onEnterFocus} /> : null}
        </div>
      </div>
      )}
      <div className={styles.stage}>
        <VizBackground inset="fill" />
        {prefs.legendOpen && !hideLegend && !spatial && (!compact || analyzerOpen) ? (
          <div className={styles.legendDock}>
            {prefs.regionColors ? (
              <ul className={styles.regions}>
                {SPECTRUM_REGIONS.map((region) => (
                  <li key={region.id}>
                    <i style={{ background: region.color }} />
                    {region.label}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={styles.regions}>
                <li>{prefs.showBars ? 'Slow bars' : 'Fill'}</li>
                {prefs.showLine && prefs.follow !== 'slow' ? <li>Peak line</li> : null}
                {prefs.showLine && prefs.follow !== 'peak' ? (
                  <li>Slow line</li>
                ) : null}
                {prefs.layer === 'both' ? <li>Before / after</li> : null}
              </ul>
            )}
          </div>
        ) : null}
        {compact && !analyzerOpen && !phoneEq && !phoneFocus && !suppressAnalyzerChrome ? (
          <div className={historyStyles.dock}>
            <FftViewToggle
              mode={prefs.viewMode}
              onChange={(viewMode) => persistSpectrumPrefs({ ...prefs, viewMode })}
            />
            {spatial ? <SpectralHistoryControls /> : null}
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${spatial ? styles.canvasSpatial : ''}`}
          aria-hidden="true"
          onDoubleClick={(event) => {
            if (phoneEq || spatial) return
            placeBellAt(event.clientX, event.clientY)
          }}
          onPointerDown={(event) => {
            if (spatial && isPrimaryPointerDown(event)) {
              spatialPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
              if (!historyRef.current) historyRef.current = createSpectralHistoryRuntime()
              spatialGesture.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                yaw: historyRef.current.camera.yaw,
                pitch: historyRef.current.camera.pitch,
                zoom: historyRef.current.camera.zoom,
                pinch: 0,
                moved: false,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
              return
            }
            if (!phoneEq || !isPrimaryPointerDown(event)) return
            graphDown.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now() }
          }}
          onPointerUp={(event) => {
            if (spatial) {
              const gesture = spatialGesture.current
              spatialPointers.current.delete(event.pointerId)
              if (gesture?.pointerId === event.pointerId) {
                if (!gesture.moved) inspectSpatial(event.clientX, event.clientY)
                spatialGesture.current = null
              }
              if (event.pointerType !== 'mouse') setHover(null)
              return
            }
            if (event.pointerType !== 'mouse') setHover(null)
            const start = graphDown.current
            graphDown.current = null
            if (!phoneEq || !start || start.id !== event.pointerId || drag.current) return
            if (performance.now() - start.t > 400) return
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
              lastGraphTap.current = null
              return
            }
            const prev = lastGraphTap.current
            const now = performance.now()
            if (prev && prev.t > 0 && now - prev.t < 320 && Math.hypot(event.clientX - prev.x, event.clientY - prev.y) < 28) {
              lastGraphTap.current = null
              placeBellAt(event.clientX, event.clientY)
            } else {
              lastGraphTap.current = { t: now, x: event.clientX, y: event.clientY }
            }
          }}
          onPointerMove={(event) => {
            if (spatial) {
              spatialPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
              const points = [...spatialPointers.current.values()]
              if (points.length >= 2 && historyRef.current) {
                const dist = Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
                const gesture = spatialGesture.current
                if (gesture) {
                  if (gesture.pinch <= 0) {
                    gesture.pinch = dist
                    gesture.zoom = historyRef.current.camera.zoom
                  }
                  gesture.moved = true
                  const scale = dist / Math.max(24, gesture.pinch)
                  historyRef.current.camera.zoom = Math.min(1.4, Math.max(0.75, gesture.zoom * scale))
                  historyRef.current.displayZoom = historyRef.current.camera.zoom
                }
                return
              }
              const gesture = spatialGesture.current
              if (gesture && gesture.pointerId === event.pointerId && (event.buttons & 1) === 1) {
                const dx = event.clientX - gesture.x
                const dy = event.clientY - gesture.y
                if (!gesture.moved && Math.hypot(dx, dy) < 6) return
                gesture.moved = true
                if (!historyRef.current) historyRef.current = createSpectralHistoryRuntime()
                const width = Math.max(1, canvasRef.current?.clientWidth ?? 1)
                const height = Math.max(1, canvasRef.current?.clientHeight ?? 1)
                historyRef.current.camera.yaw = Math.min(1, Math.max(-1, gesture.yaw + (dx / width) * 1.4))
                historyRef.current.camera.pitch = Math.min(1, Math.max(-1, gesture.pitch + (dy / height) * 1.2))
                historyRef.current.displayYaw = historyRef.current.camera.yaw
                historyRef.current.displayPitch = historyRef.current.camera.pitch
                return
              }
              if (event.pointerType !== 'touch') inspectSpatial(event.clientX, event.clientY)
              return
            }
            if (drag.current) return
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            const sr = engine.getSnapshot().sampleRate || 44100
            const maxHz = spectrumMaxHz(sr, SPECTRUM_AXIS_MAX_HZ)
            const left = plotPad.left
            const right = rect.width - plotPad.right
            const top = plotPad.top
            const bottom = rect.height - plotPad.bottom
            if (x < left || x > right || y < top || y > bottom) {
              setHover(null)
              return
            }
            const hz = xToHz(x, SPECTRUM_AXIS_MIN_HZ, maxHz, left, right, freqScaleRef.current)
            setHover({ x, y, label: formatHoverFreq(hz), flip: x > rect.width * 0.68, low: y < 28 })
          }}
          onPointerCancel={() => {
            spatialGesture.current = null
            spatialPointers.current.clear()
            setHover(null)
          }}
          onPointerLeave={() => {
            if (!spatialGesture.current) setHover(null)
          }}
        />
        <div
          ref={plotRef}
          className={styles.plot}
          style={{
            left: plotPad.left,
            right: plotPad.right,
            top: plotPad.top,
            bottom: plotPad.bottom,
          }}
        >
          {spatial || (compact && !phoneEq)
            ? null
            : eqMods.flatMap((mod) => {
            if (!eqOverlayIncludes(eqFocus, mod.instanceId)) return []
            const bands = snap.eqById[mod.instanceId]?.bands ?? []
            const modulate = eqInstanceUsesSharedLfo(snap.chain, mod.instanceId)
            const eqName = eqMods.length > 1 ? moduleLabel(mod, snap.chain) : 'EQ'
            return bands.map((band, index) => {
            if (band.type === 'off') return null
            const plotMaxHz = spectrumMaxHz(snap.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
            const sr = snap.sampleRate || 44100
            const dragging = dragNode?.instanceId === mod.instanceId && dragNode.index === index
            const instanceLive = snap.liveByInstance[mod.instanceId]
            const motionLive = instanceLive ?? snap.liveParams
            const motionInput = {
              lfos: snap.fxLfos,
              automation: snap.automation,
              live: motionLive,
              timeSec: snap.transportSec,
              playing: snap.playing,
              modulate: Boolean(instanceLive) || modulate,
            }
            const motion = eqNodeMotion({ ...motionInput, band, index, dragging })
            const liveBands = eqCurveBands(bands, motionInput, dragging ? index : null)
            const anchor = eqNodeAnchorBands(liveBands, index, motion.frequencyHz, motion.gainDb, motion.q)
            const xPct = freqToX(motion.frequencyHz, 1, plotMaxHz, SPECTRUM_AXIS_MIN_HZ, freqScale) * 100
            const yPct = spectrumEqOverlayY(eqNodePlotDb(anchor, motion.frequencyHz, sr), 0, 100)
            const selected =
              selectedBand?.instanceId === mod.instanceId && selectedBand.index === index
            const dim = mod.bypassed || band.bypassed
            const moduleTone = eqTone(eqColorIndex(snap.chain, mod.instanceId), readThemeColors())
            const bandTone = eqBandTone(index, readThemeColors())
            const freqColor = eqBandColorForHz(motion.frequencyHz)
            const tone = phoneEq || phoneFocus ? bandTone : moduleTone
            const freqTint = prefs.eqFreqColors && !phoneEq
            const nodeColor = freqTint ? freqColor : tone.node
            const curveColor = freqTint ? freqColor : tone.curve
            const nodeY = Math.min(100, Math.max(0, yPct))
            return (
              <Fragment key={eqStripKey(mod.instanceId, band)}>
              <button
                type="button"
                data-eq-node=""
                data-q-live={motion.qLive ? 'true' : 'false'}
                className={`${styles.node} ${selected ? styles.nodeOn : ''} ${dim ? styles.nodeOff : ''}`}
                style={
                  {
                    left: `${xPct}%`,
                    top: `${nodeY}%`,
                    background: dim ? undefined : nodeColor,
                    borderColor: curveColor,
                    '--eq-curve': curveColor,
                    '--eq-node-selected': nodeColor,
                    zIndex: selected ? 4 : 2,
                  } as CSSProperties
                }
                title={`${eqName} band ${index + 1} ${band.type}`}
                aria-label={`${eqName} band ${index + 1} ${focusEqTypeLabel(band.type)}`}
                onPointerDown={(event) => onNodePointerDown(mod.instanceId, index, event)}
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerMove={onNodePointerMove}
                onPointerUp={endNodePointer}
                onPointerCancel={endNodePointer}
                onLostPointerCapture={endNodePointer}
                onKeyDown={(event) => {
                  if (!phoneFocus) return
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setBandMenu({ instanceId: mod.instanceId, index })
                    return
                  }
                  const patch = nudgeFocusEq(band, event.key, event.shiftKey)
                  if (!patch) return
                  event.preventDefault()
                  engine.setEqBand(index, patch, mod.instanceId)
                }}
              >
                {eqMods.length > 1 ? `${eqColorIndex(snap.chain, mod.instanceId) + 1}.${index + 1}` : index + 1}
              </button>
              </Fragment>
            )
          })
          })}
        </div>
        {phoneFocus && bandMenu && menuBand && menuBand.type !== 'off' ? (
          <div
            className={styles.focusMenu}
            data-focus-popover=""
            role="menu"
            aria-label={t.mobile.type}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {EQ_FILTER_TYPES.filter((item) => item.value !== 'off').map((item) => (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={item.value === menuBand.type}
                className={item.value === menuBand.type ? styles.focusMenuOn : undefined}
                onClick={() => {
                  engine.setEqBand(bandMenu.index, focusEqTypePatch(menuBand, item.value), bandMenu.instanceId)
                  setBandMenu(null)
                }}
              >
                {focusEqTypeLabel(item.value)}
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className={styles.focusDelete}
              onClick={() => {
                engine.setEqBand(bandMenu.index, { type: 'off' }, bandMenu.instanceId)
                setBandMenu(null)
              }}
            >
              {t.mobile.deleteBand}
            </button>
          </div>
        ) : null}
        {hover ? (
          <div
            className={`${styles.cursorReadout} ${hover.flip ? styles.cursorReadoutFlip : ''} ${hover.low ? styles.cursorReadoutLow : ''}`}
            style={{ left: hover.x, top: hover.y }}
          >
            {hover.label}
          </div>
        ) : null}
        {spatial || hideGraphMenu ? null : (
        <div className={styles.graphMenu}>
          <button
            type="button"
            className={styles.graphMenuButton}
            aria-expanded={gridOpen}
            aria-label="Graph settings"
            onClick={(event) => {
              setGridOpen((open) => !open)
              event.currentTarget.blur()
            }}
          >
            •••
          </button>
          {gridOpen ? (
            <div className={styles.graphMenuPanel} role="group" aria-label="Graph">
              {phoneFocus ? (
                <SpectrumDisplaySettings showLayer />
              ) : (
              <>
              <div className={styles.graphMenuRow}>
                <span>Grid</span>
                {([6, 12, 24] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    aria-pressed={gridDensity === density}
                    onClick={(event) => {
                      setGridDensity(density)
                      persistFreqGridDensity(density)
                      event.currentTarget.blur()
                    }}
                  >
                    {density}
                  </button>
                ))}
              </div>
              <div className={styles.graphMenuRow}>
                <span>Scale</span>
                {FREQ_SCALE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={freqScale === opt.value}
                    title={opt.title}
                    onClick={(event) => {
                      setFreqScale(opt.value)
                      event.currentTarget.blur()
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              </>
              )}
            </div>
          ) : null}
        </div>
        )}
      </div>
    </div>
  )
}
