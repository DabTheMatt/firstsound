import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { eqColorIndex, moduleLabel } from '../../audio/chain/chain'
import { combAsEqBands } from '../../audio/engine/comb'
import {
  bellFromPlotPoint,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  eqResponsesDiverge,
  freqToX,
  SPECTRUM_EQ_MAX_DB,
  SPECTRUM_EQ_MIN_DB,
  spectrumEqOverlayY,
  strokeEqMagnitude,
  xToFreq,
  yToDb as eqYToDb,
} from '../../audio/engine/eqPlot'
import { EQ_MIN_HZ, bandIsActive, eqModuleIsAudible } from '../../audio/engine/eqBands'
import { selectEqBand, subscribeEqBandSelection, type EqBandSelection } from '../../audio/engine/eqBandSelection'
import {
  FREQ_SCALE_HZ,
  formatFreqTick,
  formatHoverFreq,
  musicalScaleHz,
  freqTickIsMajor,
  visibleAxisLabelIndices,
} from '../../audio/engine/pitchScale'
import {
  SPECTRUM_BAND_CHOICES,
  SPECTRUM_FALL_MODES,
  SPECTRUM_FOLLOW_MODES,
  alignedBandDb,
  bandPeakDb,
  capBandsByEqGain,
  capSpectrumBins,
  eqGainForSpectrumBand,
  logGridDbAt,
  clampSpectrumBandCount,
  clampSpectrumFallMode,
  clampSpectrumFollowMode,
  followBandsOverTime,
  followEnvelope,
  logBandEdgesHz,
  maxBandDb,
  spectrumDisplayUses,
  spectrumFallBallistics,
  spectrumMaxHz,
  SPECTRUM_AXIS_MAX_HZ,
  spectrumMeterAlignDb,
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
import { fillSpectrumXY, strokeSpectrumXY, writeSpectrumBinLine } from '../../audio/engine/spectrumEnvelope'
import { filterCurveColor, processorCurveStyle, shouldShowResponseLegend } from '../../audio/engine/spectrumResponse'
import { timeDomainToDb, type SpectrumFftScratch } from '../../audio/engine/spectrumFft'
import { ANALYSER_FFT_IDLE, spectrumFftSizeForBands } from '../../audio/engine/analyserBudget'
import { timeDomainPeakDb, louderPeakDb } from '../../audio/engine/timePeak'
import { isDocumentHidden } from '../../app/frameBudget'
import { meterDbMin, spectrumDbScaleMarks, type MeterRange } from '../../app/editorState'
import { engine, useEngine } from '../../hooks/useEngine'
import { colorWithAlpha, eqTone, readThemeColors } from '../../theme'
import { eqMagnitudeDb } from '../../audio/engine/eqResponse'
import { hzToX as mapHzToX, xToHz, loadFreqScale, persistFreqScale, FREQ_SCALE_OPTIONS, type FreqScaleKind } from '../../audio/engine/freqScale'
import { EQ_CHANNEL_MODES } from '../../audio/engine/eqGraph'
import {
  EQ_BAND_LFO_IDS,
  eqBandLfoKind,
  eqModuleHasLiveCurve,
  liveEqBandsFromParams,
} from '../../audio/fx/lfo'
import { filterMagnitudeDb, filterMixMagnitudeDb, filterModuleIsAudible } from '../../audio/fx/filterResponse'
import { isPrimaryPointerDown, isPrimaryPointerHeld } from '../../audio/engine/pointerDrag'
import { loadSpectrumPrefs, persistSpectrumPrefs, subscribeSpectrumPrefs, type SpectrumLayer, type SpectrumPrefs } from '../../audio/engine/spectrumPrefs'
import { SPECTRUM_HZ_LABEL_OFFSET, SPECTRUM_PLOT_PAD } from '../../audio/engine/spectrumPlotLayout'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
  meterRange?: MeterRange
}

function emptyBands(n: number): Float32Array {
  return new Float32Array(n).fill(-100)
}

const TONE_GAIN_STEPS = 128

/** Log-spaced copy of the EQ/filter correction, reused to ceiling the FFT line. */
function fillToneGainGrid(
  live: ReturnType<typeof engine.getSnapshot>,
  sampleRate: number,
  minHz: number,
  maxHz: number,
  hzOut: Float32Array,
  dbOut: Float32Array,
): void {
  const n = Math.min(hzOut.length, dbOut.length)
  const lo = Math.max(1, minHz)
  const hi = Math.max(lo * 1.01, maxHz)
  const log0 = Math.log(lo)
  const log1 = Math.log(hi)
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const hz = Math.exp(log0 + (log1 - log0) * t)
    hzOut[i] = hz
    dbOut[i] = chainToneGainAtHz(live, hz, sampleRate)
  }
}

/** Per-bin attack/release. A new FFT size snaps to the current frame. */
function followSpectrumLine(
  prev: Float32Array | null,
  target: Float32Array,
  attackPerSec: number,
  releasePerSec: number,
  dtSec: number,
): Float32Array {
  if (!prev || prev.length !== target.length) {
    const next = new Float32Array(target.length)
    next.set(target)
    return next
  }
  followBandsOverTime(prev, target, attackPerSec, releasePerSec, dtSec)
  return prev
}

function dbToY(db: number, top: number, bottom: number, minDb: number): number {
  const span = 0 - minDb
  const t = Math.min(1, Math.max(0, span > 0 ? (0 - db) / span : 1))
  return top + t * (bottom - top)
}

/** Frequencies spaced evenly in the active plot scale, so the EQ curve matches bars and labels. */
function plotFreqs(count: number, minHz: number, maxHz: number, scale: FreqScaleKind): number[] {
  const n = Math.max(2, count)
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(xToHz(i / (n - 1), minHz, maxHz, 0, 1, scale))
  return out
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

function chainToneGainAtHz(
  live: ReturnType<typeof engine.getSnapshot>,
  hz: number,
  sampleRate: number,
): number {
  let db = 0
  for (const mod of live.chain) {
    if (mod.bypassed) continue
    if (mod.type === 'eq') {
      const st = live.eqById[mod.instanceId]
      if (!st) continue
      const bands = [
        ...liveEqBandsFromParams(
          st.bands,
          live.liveParams,
          eqInstanceUsesSharedLfo(live.chain, mod.instanceId),
        ),
        ...combAsEqBands({
          ...st.comb,
          teeth: live.liveParams.eqcfTeeth ?? st.comb.teeth,
          gain: live.liveParams.eqcfGain ?? st.comb.gain,
          spacing: live.liveParams.eqcfSpacing ?? st.comb.spacing,
          frequency: live.liveParams.eqcfFreq ?? st.comb.frequency,
        }),
      ]
      db += eqMagnitudeDb(bands, hz, sampleRate)
    }
    if (mod.type === 'filter') {
      db += filterMixMagnitudeDb(
        filterMagnitudeDb(live.liveParams, hz, sampleRate),
        live.liveParams.filterMix,
      )
    }
  }
  return db
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
  const n = analyser.frequencyBinCount
  if (!scratch.time || scratch.time.length !== fftSize) scratch.time = new Float32Array(fftSize)
  if (!scratch.bins || scratch.bins.length !== n) scratch.bins = new Float32Array(n)
  analyser.getFloatTimeDomainData(scratch.time as Float32Array<ArrayBuffer>)
  timeDomainToDb(scratch.time, scratch.bins, scratch.fft)
  return bandPeakDb(scratch.bins, sampleRate, bandCount, minHz, spectrumMaxHz(sampleRate, SPECTRUM_AXIS_MAX_HZ))
}

/** Banded FFT observer — never sits in the processing chain. */
export function Spectrum({ active, meterRange = 'normal' }: Props) {
  const snap = useEngine()
  const eqMods = snap.chain.filter((m) => m.type === 'eq')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [freqScale, setFreqScale] = useState<FreqScaleKind>(() => loadFreqScale())
  const freqScaleRef = useRef(freqScale)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadSpectrumPrefs())
  const [eqFocusRaw, setEqFocusRaw] = useState<string>(() => loadEqOverlayFocus())
  const eqFocus = clampEqOverlayFocus(eqFocusRaw, snap.chain)
  const [hover, setHover] = useState<{ x: number; y: number; label: string; flip: boolean } | null>(null)
  const [selectedBand, setSelectedBand] = useState<EqBandSelection | null>(null)
  const prefsRef = useRef(prefs)
  const eqFocusRef = useRef(eqFocus)
  const meterMinRef = useRef(meterDbMin(meterRange))
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
  } | null>(null)

  useEffect(() => {
    meterMinRef.current = meterDbMin(meterRange)
  }, [meterRange])

  useEffect(() => {
    freqScaleRef.current = freqScale
    persistFreqScale(freqScale)
  }, [freqScale])

  useEffect(() => subscribeEqOverlayFocus(setEqFocusRaw), [])
  useEffect(() => subscribeEqBandSelection(setSelectedBand), [])

  useEffect(() => subscribeSpectrumPrefs(setPrefs), [])

  useEffect(() => {
    eqFocusRef.current = eqFocus
  }, [eqFocus])

  useEffect(() => {
    prefsRef.current = prefs
    persistSpectrumPrefs(prefs)
  }, [prefs])

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
    engine.setSpectrumFftSize(spectrumFftSizeForBands(prefsRef.current.bands))
    let frame = 0
    const preScratch = { bins: null as Float32Array | null, time: null as Float32Array | null, fft: { window: null, real: null, imag: null } }
    const postScratch = { bins: null as Float32Array | null, time: null as Float32Array | null, fft: { window: null, real: null, imag: null } }
    const meterLeft = { data: null as Float32Array | null }
    const meterRight = { data: null as Float32Array | null }
    let alignDb = 0
    let gainsBuf: Float32Array | null = null
    let preLineFast: Float32Array | null = null
    let preLineSlow: Float32Array | null = null
    let postLineFast: Float32Array | null = null
    let postLineSlow: Float32Array | null = null
    let lineXY = new Float32Array(4096)
    const gainHz = new Float32Array(TONE_GAIN_STEPS)
    const gainDb = new Float32Array(TONE_GAIN_STEPS)
    let lastTs = 0
    const tick = (now: number) => {
      const dt = lastTs === 0 ? 1 / 60 : Math.min(0.05, Math.max(0, (now - lastTs) / 1000))
      lastTs = now
      if (isDocumentHidden()) {
        lastTs = 0
        frame = requestAnimationFrame(tick)
        return
      }
      engine.setSpectrumFftSize(spectrumFftSizeForBands(prefsRef.current.bands))
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
        const colors = readThemeColors()
        const { layer, bands, regionColors, showBars, showLine, follow, fall } = prefsRef.current
        const ballistics = spectrumFallBallistics(fall)
        const display = spectrumDisplayUses(follow)
        ctx.clearRect(0, 0, width, height)
        const sr = live.sampleRate || 44100
        const maxHz = spectrumMaxHz(sr, SPECTRUM_AXIS_MAX_HZ)
        const minHz = EQ_MIN_HZ
        const padL = SPECTRUM_PLOT_PAD.left * dpr
        const padR = SPECTRUM_PLOT_PAD.right * dpr
        const padT = SPECTRUM_PLOT_PAD.top * dpr
        const padB = SPECTRUM_PLOT_PAD.bottom * dpr
        const left = padL
        const right = width - padR
        const top = padT
        const bottom = height - padB
        const plotW = Math.max(1, right - left)

        const plotH = Math.max(1, bottom - top)
        const dbFloor = meterMinRef.current
        const dbMarks = spectrumDbScaleMarks(dbFloor, plotH / dpr)

        ctx.fillStyle = colors.textMuted
        ctx.font = `${8 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (const db of dbMarks) {
          const y = dbToY(db, top, bottom, dbFloor)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, db === 0 || db === -6 || db === -12 ? 1 : 0.75)
          ctx.lineWidth = dpr * (db === 0 || db === -6 || db === -12 ? 0.7 : 0.45)
          ctx.beginPath()
          ctx.moveTo(left, y)
          ctx.lineTo(right, y)
          ctx.stroke()
          ctx.fillStyle = colors.textMuted
          ctx.fillText(`${db}`, left - 5 * dpr, y)
        }
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.9)
        ctx.font = `${7 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.fillText('dB', 4 * dpr, top - 3 * dpr)

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const hzTicks = FREQ_SCALE_HZ.filter((hz) => hz <= maxHz + 1).map((hz) => {
          const major = freqTickIsMajor(hz)
          ctx.font = `${(major ? 8 : 7) * dpr}px ui-sans-serif, system-ui, sans-serif`
          const label = formatFreqTick(hz)
          return {
            hz,
            major,
            x: hzToX(hz, minHz, maxHz, left, right, scale),
            width: ctx.measureText(label).width,
            label,
          }
        })
        const hzLabelOn = visibleAxisLabelIndices(hzTicks, 6 * dpr)
        for (let i = 0; i < hzTicks.length; i++) {
          const tick = hzTicks[i]!
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, tick.major ? 0.85 : 0.4)
          ctx.lineWidth = dpr * (tick.major ? 0.7 : 0.35)
          ctx.beginPath()
          ctx.moveTo(tick.x, top)
          ctx.lineTo(tick.x, bottom)
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

        let postEqGains: Float32Array | null = null
        let preCap: Float32Array | null = null

        const drawLayer = (
          peaks: Float32Array | null,
          fast: Float32Array,
          slow: Float32Array,
          style: 'pre' | 'post',
        ) => {
          if (!peaks) return
          followBandsOverTime(fast, peaks, ballistics.peak.attack, ballistics.peak.release, dt)
          followBandsOverTime(slow, peaks, ballistics.slow.attack, ballistics.slow.release, dt)
          if (style === 'post' && postEqGains && preCap) {
            capBandsByEqGain(fast, preCap, postEqGains)
            capBandsByEqGain(slow, preCap, postEqGains)
          }
          const edges = logBandEdgesHz(minHz, maxHz, bands)
          const gap = Math.max(1, Math.floor((plotW / bands) * 0.12))
          const plotBox = { left, right, top, bottom }
          const wantPeak = display.lines.includes('peak')
          const wantSlow = display.lines.includes('slow')
          const bodySrc = display.barBody === 'slow' ? slow : fast
          const capSrc = display.barCap === 'slow' ? slow : fast
          const alpha = style === 'pre' ? (layer === 'both' ? 0.22 : 0.42) : layer === 'both' ? 0.55 : 0.42
          const lineAlpha = style === 'pre' ? (layer === 'both' ? 0.55 : 0.85) : 0.95
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
              const bodyDb = alignedBandDb(bodySrc[i] ?? -100, alignDb)
              const capDb = alignedBandDb(capSrc[i] ?? -100, alignDb)
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
            if (lineXY.length < src.length * 2) lineXY = new Float32Array(src.length * 2)
            const count = writeSpectrumBinLine(src, sr, minHz, maxHz, plotBox, lineXY, 0, dbFloor, alignDb, scale)
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

        const toneAudible = live.chain.some((mod) => {
          if (mod.type === 'filter') {
            return filterModuleIsAudible(mod.bypassed, live.liveParams.filterMix)
          }
          if (mod.type !== 'eq') return false
          const st = live.eqById[mod.instanceId]
          return eqModuleIsAudible(mod.bypassed, st?.bands ?? [], Boolean(st?.comb.enabled))
        })
        const showPre = layer === 'pre' || layer === 'both'
        const showPost = layer === 'post' || layer === 'both'
        const prePeaks = readAnalyserPeaks(engine.getAnalyser('pre'), sr, bands, minHz, preScratch)
        const postPeaks = readAnalyserPeaks(engine.getAnalyser('eq'), sr, bands, minHz, postScratch)
        if (postPeaks && prePeaks && toneAudible) {
          const edges = logBandEdgesHz(minHz, maxHz, bands)
          if (!gainsBuf || gainsBuf.length !== bands) gainsBuf = new Float32Array(bands)
          const gains = gainsBuf
          for (let i = 0; i < bands; i++) {
            const lo = edges[i] ?? minHz
            const hi = edges[i + 1] ?? maxHz
            const center = bandCenterHz(edges, i)
            gains[i] = eqGainForSpectrumBand(
              chainToneGainAtHz(live, center, sr),
              chainToneGainAtHz(live, lo, sr),
              chainToneGainAtHz(live, hi, sr),
            )
          }
          capBandsByEqGain(postPeaks, prePeaks, gains)
          postEqGains = gains
          preCap = prePeaks
          if (
            postScratch.bins &&
            preScratch.bins &&
            postScratch.bins.length === preScratch.bins.length
          ) {
            fillToneGainGrid(live, sr, minHz, maxHz, gainHz, gainDb)
            const gainAt = (hz: number) => logGridDbAt(hz, gainHz, gainDb)
            capSpectrumBins(postScratch.bins, preScratch.bins, sr, gainAt)
          }
        }
        const lineAttack = ballistics.peak.attack
        const lineRelease = ballistics.peak.release
        const slowAttack = ballistics.slow.attack
        const slowRelease = ballistics.slow.release
        if (showPre && preScratch.bins) {
          preLineFast = followSpectrumLine(preLineFast, preScratch.bins, lineAttack, lineRelease, dt)
          preLineSlow = followSpectrumLine(preLineSlow, preScratch.bins, slowAttack, slowRelease, dt)
        }
        if (showPost && postScratch.bins) {
          const followedFast = followSpectrumLine(postLineFast, postScratch.bins, lineAttack, lineRelease, dt)
          const followedSlow = followSpectrumLine(postLineSlow, postScratch.bins, slowAttack, slowRelease, dt)
          postLineFast = followedFast
          postLineSlow = followedSlow
          if (postEqGains && preScratch.bins && followedFast.length === preScratch.bins.length) {
            const gainAt = (hz: number) => logGridDbAt(hz, gainHz, gainDb)
            capSpectrumBins(followedFast, preScratch.bins, sr, gainAt)
            capSpectrumBins(followedSlow, preScratch.bins, sr, gainAt)
          }
        }
        const { left: meterL, right: meterR } = engine.getChannelAnalysers()
        const meterDb = louderPeakDb(timeDomainPeakDb(meterL, meterLeft), timeDomainPeakDb(meterR ?? meterL, meterRight))
        const guide = showPost ? postPeaks : prePeaks
        alignDb = followEnvelope(alignDb, spectrumMeterAlignDb(maxBandDb(guide), meterDb), 0.55, 0.22)
        if (showPre) {
          drawLayer(prePeaks, preFast.current, preSlow.current, 'pre')
        }
        if (showPost) {
          drawLayer(postPeaks, postFast.current, postSlow.current, 'post')
        }

        const eqs = live.chain.filter((m) => m.type === 'eq')
        const overlayFocus = eqFocusRef.current
        const freqs = plotFreqs(Math.floor(plotW), minHz, maxHz, scale)
        for (let ei = 0; ei < eqs.length; ei++) {
          const mod = eqs[ei]
          if (!mod) continue
          const st = live.eqById[mod.instanceId]
          if (!st) continue
          const hasShape = st.bands.some((b) => b.type !== 'off') || st.comb.enabled
          if (!hasShape) continue
          const modulate = eqInstanceUsesSharedLfo(live.chain, mod.instanceId)
          const storedBands = [...st.bands, ...combAsEqBands(st.comb)]
          const liveBands = [
            ...liveEqBandsFromParams(st.bands, live.liveParams, modulate),
            ...combAsEqBands(
              modulate
                ? {
                    ...st.comb,
                    teeth: live.liveParams.eqcfTeeth ?? st.comb.teeth,
                    gain: live.liveParams.eqcfGain ?? st.comb.gain,
                    spacing: live.liveParams.eqcfSpacing ?? st.comb.spacing,
                    frequency: live.liveParams.eqcfFreq ?? st.comb.frequency,
                  }
                : st.comb,
            ),
          ]
          const tone = eqTone(ei, colors)
          const focused = eqOverlayIncludes(overlayFocus, mod.instanceId)
          const xAt = (i: number) => hzToX(freqs[i] ?? minHz, minHz, maxHz, left, right, scale)
          const yAt = (db: number) => spectrumEqOverlayY(db, top, bottom)
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          const showLive = modulate && eqModuleHasLiveCurve(live.fxLfos, st.comb.enabled)
          const processing = showLive ? liveBands : storedBands
          const activeCount = storedBands.filter((band) => bandIsActive(band)).length
          const ghost =
            showLive &&
            activeCount > 1 &&
            eqResponsesDiverge(storedBands, liveBands, freqs, sr)
          if (ghost) {
            const ghostStyle = eqResponseCurveStyle('live', mod.bypassed, dpr)
            ctx.setLineDash([4 * dpr, 3 * dpr])
            ctx.strokeStyle = colorWithAlpha(tone.curve, ghostStyle.alpha * (focused ? 1 : 0.28))
            ctx.lineWidth = ghostStyle.width
            strokeEqMagnitude(ctx, storedBands, freqs, sr, xAt, yAt)
          }
          const storedStyle = eqResponseCurveStyle('stored', mod.bypassed, dpr)
          ctx.setLineDash(mod.bypassed ? [5 * dpr, 4 * dpr] : [])
          ctx.strokeStyle = colorWithAlpha(tone.curve, storedStyle.alpha * (focused ? 1 : 0.28))
          ctx.lineWidth = storedStyle.width * (focused ? 1 : 0.85)
          strokeEqMagnitude(ctx, processing, freqs, sr, xAt, yAt)
          ctx.restore()
        }
        const filterMod = live.chain.find((m) => m.type === 'filter')
        if (filterMod && filterModuleIsAudible(filterMod.bypassed, live.liveParams.filterMix)) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(left, top, plotW, plotH)
          ctx.clip()
          const filterStyle = processorCurveStyle('filter', filterMod.bypassed, dpr)
          const filterInk = filterCurveColor(colors.accentSecondary, colors.textPrimary)
          ctx.lineCap = 'butt'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          for (let i = 0; i < freqs.length; i++) {
            const hz = freqs[i] ?? minHz
            const db = filterMixMagnitudeDb(
              filterMagnitudeDb(live.liveParams, hz, sr),
              live.liveParams.filterMix,
            )
            const x = hzToX(hz, minHz, maxHz, left, right, scale)
            const y = spectrumEqOverlayY(db, top, bottom)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.setLineDash([])
          ctx.strokeStyle = colorWithAlpha(filterInk, 0.22)
          ctx.lineWidth = Math.max(1, dpr)
          ctx.stroke()
          ctx.setLineDash(filterStyle.dash)
          ctx.strokeStyle = colorWithAlpha(filterInk, filterStyle.alpha)
          ctx.lineWidth = filterStyle.width
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = colorWithAlpha(colors.textPrimary, 0.82)
        ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`
        for (let i = 0; i < noteTicks.length; i++) {
          if (!noteLabelOn.has(i)) continue
          const tick = noteTicks[i]!
          ctx.fillText(tick.label, tick.x, top - 6 * dpr)
        }
        ctx.textBaseline = 'top'
        ctx.fillStyle = colors.textMuted
        for (let i = 0; i < hzTicks.length; i++) {
          if (!hzLabelOn.has(i)) continue
          const tick = hzTicks[i]!
          ctx.font = `${(tick.major ? 8 : 7) * dpr}px ui-sans-serif, system-ui, sans-serif`
          ctx.fillText(tick.label, tick.x, bottom + SPECTRUM_HZ_LABEL_OFFSET * dpr)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      engine.setSpectrumFftSize(ANALYSER_FFT_IDLE)
    }
  }, [active, meterRange])

  const onNodePointerDown = (
    instanceId: string,
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!isPrimaryPointerDown(event)) return
    event.preventDefault()
    event.stopPropagation()
    selectEqBand({ instanceId, index })
    event.currentTarget.setPointerCapture(event.pointerId)
    const bands = snap.eqById[instanceId]?.bands ?? snap.eqBands
    drag.current = {
      index,
      instanceId,
      pointerId: event.pointerId,
      q0: bands[index]?.q ?? 1,
      y0: event.clientY,
    }
  }

  const onNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    const plot = plotRef.current
    if (!d || d.pointerId !== event.pointerId || !plot) return
    if (!isPrimaryPointerHeld(event)) {
      drag.current = null
      return
    }
    const rect = plot.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const band = (snap.eqById[d.instanceId]?.bands ?? snap.eqBands)[d.index]
    if (!band) return
    const plotMaxHz = spectrumMaxHz(snap.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
    const frequency = xToFreq(x, rect.width, plotMaxHz, EQ_MIN_HZ, freqScaleRef.current)
    const db = eqYToDb(y, rect.height, SPECTRUM_EQ_MIN_DB, SPECTRUM_EQ_MAX_DB)
    engine.setEqBand(d.index, eqBandDragPatch(band, frequency, db, d.q0, d.y0 - event.clientY), d.instanceId)
  }

  const onNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  if (!active) return null
  const eqCurveOn = eqMods.some((mod) => {
    const st = snap.eqById[mod.instanceId]
    if (!st) return false
    return st.bands.some((band) => band.type !== 'off') || st.comb.enabled
  })
  const filterCurveOn = snap.chain.some(
    (mod) => mod.type === 'filter' && filterModuleIsAudible(mod.bypassed, snap.liveParams.filterMix),
  )
  const showResponseKey = shouldShowResponseLegend(eqCurveOn, filterCurveOn)
  return (
    <div className={styles.wrap} role="region" aria-label="Spectrum analyzer">
      <div
        className={styles.chrome}
      >
        <div className={styles.chromeLeft}>
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
            Bands
            <select
              aria-label="FFT band count"
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
            Fall
            <select
              aria-label="Spectrum fall speed"
              title="Visual decay of the spectrum bars and line. Does not change the audio."
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
        </div>
        <div className={styles.chromeRight}>
          {showResponseKey ? (
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
        </div>
      </div>
      <div className={styles.stage}>
        {prefs.legendOpen ? (
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
                {prefs.layer === 'both' ? <li>Before / after when EQ is on</li> : null}
              </ul>
            )}
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-hidden="true"
          onDoubleClick={(event) => {
            if (drag.current) return
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            const left = SPECTRUM_PLOT_PAD.left
            const right = rect.width - SPECTRUM_PLOT_PAD.right
            const top = SPECTRUM_PLOT_PAD.top
            const bottom = rect.height - SPECTRUM_PLOT_PAD.bottom
            if (x < left || x > right || y < top || y > bottom) return
            const live = engine.getSnapshot()
            const plotMax = spectrumMaxHz(live.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
            const bell = bellFromPlotPoint(
              x - left,
              y - top,
              Math.max(1, right - left),
              Math.max(1, bottom - top),
              plotMax,
              EQ_MIN_HZ,
              freqScaleRef.current,
            )
            const focus = eqFocusRef.current
            const target =
              focus !== 'all' && eqMods.some((mod) => mod.instanceId === focus)
                ? focus
                : (eqMods[0]?.instanceId ?? null)
            placeEqBell(target, live.chain.length, bell)
          }}
          onPointerMove={(event) => {
            if (drag.current) return
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            const sr = engine.getSnapshot().sampleRate || 44100
            const maxHz = spectrumMaxHz(sr, SPECTRUM_AXIS_MAX_HZ)
            const left = SPECTRUM_PLOT_PAD.left
            const right = rect.width - SPECTRUM_PLOT_PAD.right
            const top = SPECTRUM_PLOT_PAD.top
            const bottom = rect.height - SPECTRUM_PLOT_PAD.bottom
            if (x < left || x > right || y < top || y > bottom) {
              setHover(null)
              return
            }
            const hz = xToHz(x, EQ_MIN_HZ, maxHz, left, right, freqScaleRef.current)
            setHover({ x, y, label: formatHoverFreq(hz), flip: x > rect.width * 0.68 })
          }}
          onPointerLeave={() => setHover(null)}
        />
        <div
          ref={plotRef}
          className={styles.plot}
          style={{
            left: SPECTRUM_PLOT_PAD.left,
            right: SPECTRUM_PLOT_PAD.right,
            top: SPECTRUM_PLOT_PAD.top,
            bottom: SPECTRUM_PLOT_PAD.bottom,
          }}
        >
          {eqMods.flatMap((mod) => {
            if (!eqOverlayIncludes(eqFocus, mod.instanceId)) return []
            const bands = snap.eqById[mod.instanceId]?.bands ?? []
            const modulate = eqInstanceUsesSharedLfo(snap.chain, mod.instanceId)
            const liveBands = liveEqBandsFromParams(bands, snap.liveParams, modulate)
            const eqName = eqMods.length > 1 ? moduleLabel(mod, snap.chain) : 'EQ'
            return liveBands.map((band, index) => {
            if (band.type === 'off') return null
            const plotMaxHz = spectrumMaxHz(snap.sampleRate || 44100, SPECTRUM_AXIS_MAX_HZ)
            const xPct = freqToX(band.frequency, 1, plotMaxHz, EQ_MIN_HZ, freqScale) * 100
            const yPct = spectrumEqOverlayY(
              eqNodePlotDb(liveBands, band.frequency, snap.sampleRate || 44100),
              0,
              100,
            )
            const selected =
              selectedBand?.instanceId === mod.instanceId && selectedBand.index === index
            const dim = mod.bypassed || band.bypassed
            const ids = EQ_BAND_LFO_IDS[index]
            const bank = snap.fxLfos[eqBandLfoKind(index)]
            const mapped = Boolean(
              modulate &&
                ids &&
                bank?.some(
                  (l) => l.target === ids.freq || l.target === ids.gain || l.target === ids.q,
                ),
            )
            const tone = eqTone(eqColorIndex(snap.chain, mod.instanceId), readThemeColors())
            const freqColor = eqBandColorForHz(band.frequency)
            const nodeColor = prefs.eqFreqColors ? freqColor : tone.node
            const curveColor = prefs.eqFreqColors ? freqColor : tone.curve
            return (
              <button
                key={`${mod.instanceId}-${index}`}
                type="button"
                className={`${styles.node} ${selected ? styles.nodeOn : ''} ${dim ? styles.nodeOff : ''} ${mapped ? styles.nodeLfo : ''}`}
                style={
                  {
                    left: `${xPct}%`,
                    top: `${Math.min(100, Math.max(0, yPct))}%`,
                    background: dim ? undefined : nodeColor,
                    borderColor: curveColor,
                    '--eq-curve': curveColor,
                    '--eq-node-selected': nodeColor,
                    zIndex: selected ? 4 : 2,
                  } as CSSProperties
                }
                title={`${eqName} band ${index + 1} ${band.type}`}
                aria-label={`${eqName} band ${index + 1} ${band.type}`}
                onPointerDown={(event) => onNodePointerDown(mod.instanceId, index, event)}
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onPointerCancel={onNodePointerUp}
              >
                {eqMods.length > 1 ? `${eqColorIndex(snap.chain, mod.instanceId) + 1}.${index + 1}` : index + 1}
              </button>
            )
          })
          })}
        </div>
        {hover ? (
          <div
            className={`${styles.cursorReadout} ${hover.flip ? styles.cursorReadoutFlip : ''}`}
            style={{ left: hover.x, top: hover.y }}
          >
            {hover.label}
          </div>
        ) : null}
      </div>
    </div>
  )
}
