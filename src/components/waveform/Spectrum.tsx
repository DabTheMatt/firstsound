import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { combAsEqBands } from '../../audio/engine/comb'
import {
  dbToY as eqDbToY,
  eqBandDragPatch,
  eqResponseCurveStyle,
  freqToX,
  nodeDisplayDb,
  SPECTRUM_EQ_MAX_DB,
  SPECTRUM_EQ_MIN_DB,
  strokeEqMagnitude,
  xToFreq,
  yToDb as eqYToDb,
} from '../../audio/engine/eqPlot'
import { EQ_MAX_HZ, EQ_MIN_HZ, bandUsesGain, bandUsesWidth, eqModuleIsAudible } from '../../audio/engine/eqBands'
import {
  DB_SCALE,
  FREQ_SCALE_HZ,
  formatFreqTick,
  formatHoverFreq,
  hzFromLogAxis,
  musicalScaleHz,
} from '../../audio/engine/pitchScale'
import {
  FAST_ATTACK,
  FAST_RELEASE,
  SLOW_ATTACK,
  SLOW_RELEASE,
  SPECTRUM_BAND_CHOICES,
  SPECTRUM_BAND_COUNT,
  SPECTRUM_FOLLOW_MODES,
          bandPeakDb,
          capBandsByEqGain,
          clampSpectrumBandCount,
  clampSpectrumFollowMode,
  followBands,
  logBandEdgesHz,
  type SpectrumBandCount,
  type SpectrumFollowMode,
} from '../../audio/engine/spectrumBands'
import { bandCenterHz, eqBandColorForHz, regionForHz, SPECTRUM_REGIONS } from '../../audio/engine/spectrumRegions'
import { fillSpectrumEnvelope, spectrumEnvelopePoints, strokeSpectrumEnvelope } from '../../audio/engine/spectrumEnvelope'
import { engine, useEngine } from '../../hooks/useEngine'
import { colorWithAlpha, eqTone, readThemeColors } from '../../theme'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import {
  EQ_BAND_LFO_IDS,
  eqBandLfoKind,
  eqModuleHasLiveCurve,
  liveEqBandsFromParams,
} from '../../audio/fx/lfo'
import styles from './Spectrum.module.css'

type Props = {
  active: boolean
}

type Layer = 'pre' | 'post' | 'both'

const SPECTRUM_PREF_KEY = 'field.spectrum'

/** Matches canvas padding so EQ nodes sit on the plotted curve. */
export const SPECTRUM_PLOT_PAD = { left: 36, right: 10, top: 22, bottom: 28 }

type SpectrumPrefs = {
  layer: Layer
  bands: SpectrumBandCount
  regionColors: boolean
  legendOpen: boolean
  showBars: boolean
  showLine: boolean
  follow: SpectrumFollowMode
}

function loadPrefs(): SpectrumPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(SPECTRUM_PREF_KEY) ?? 'null') as Partial<SpectrumPrefs> | null
    return {
      layer: raw?.layer === 'pre' || raw?.layer === 'post' || raw?.layer === 'both' ? raw.layer : 'both',
      bands: clampSpectrumBandCount(raw?.bands ?? SPECTRUM_BAND_COUNT),
      regionColors: raw?.regionColors !== false,
      legendOpen: raw?.legendOpen !== false,
      showBars: raw?.showBars !== false,
      showLine: raw?.showLine !== false,
      follow: clampSpectrumFollowMode(raw?.follow),
    }
  } catch {
    return {
      layer: 'both',
      bands: SPECTRUM_BAND_COUNT,
      regionColors: true,
      legendOpen: true,
      showBars: true,
      showLine: true,
      follow: 'peak',
    }
  }
}

function persistPrefs(prefs: SpectrumPrefs): void {
  try {
    localStorage.setItem(SPECTRUM_PREF_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
}

function emptyBands(n: number): Float32Array {
  return new Float32Array(n).fill(-100)
}

function dbToY(db: number, top: number, bottom: number): number {
  const t = Math.min(1, Math.max(0, (0 - db) / 100))
  return top + t * (bottom - top)
}

function hzToX(hz: number, minHz: number, maxHz: number, left: number, right: number): number {
  const t = Math.log(Math.max(minHz, hz) / minHz) / Math.log(maxHz / minHz)
  return left + t * (right - left)
}

function chainEqGainAtHz(
  live: ReturnType<typeof engine.getSnapshot>,
  hz: number,
  sampleRate: number,
): number {
  let db = 0
  for (const mod of live.chain) {
    if (mod.type !== 'eq' || mod.bypassed) continue
    const st = live.eqById[mod.instanceId]
    if (!st) continue
    const bands = [
      ...liveEqBandsFromParams(st.bands, live.liveParams),
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
  return db
}

function readAnalyserPeaks(
  analyser: AnalyserNode | null,
  sampleRate: number,
  bandCount: number,
  minHz: number,
): Float32Array | null {
  if (!analyser) return null
  const bins = new Float32Array(analyser.frequencyBinCount)
  analyser.getFloatFrequencyData(bins)
  return bandPeakDb(bins, sampleRate, bandCount, minHz)
}

/** Banded FFT observer — never sits in the processing chain. */
export function Spectrum({ active }: Props) {
  const snap = useEngine()
  const eqMods = snap.chain.filter((m) => m.type === 'eq')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [prefs, setPrefs] = useState<SpectrumPrefs>(() => loadPrefs())
  const [hover, setHover] = useState<{ x: number; y: number; label: string; flip: boolean } | null>(null)
  const [selectedBand, setSelectedBand] = useState<{ instanceId: string; index: number } | null>(null)
  const prefsRef = useRef(prefs)
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
    prefsRef.current = prefs
    persistPrefs(prefs)
    preFast.current = emptyBands(prefs.bands)
    preSlow.current = emptyBands(prefs.bands)
    postFast.current = emptyBands(prefs.bands)
    postSlow.current = emptyBands(prefs.bands)
  }, [prefs])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const tick = () => {
      const live = engine.getSnapshot()
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
        const { layer, bands, regionColors, showBars, showLine, follow } = prefsRef.current
        ctx.clearRect(0, 0, width, height)
        const sr = live.sampleRate || 44100
        const nyquist = sr / 2
        const minHz = EQ_MIN_HZ
        const maxHz = EQ_MAX_HZ
        const padL = SPECTRUM_PLOT_PAD.left * dpr
        const padR = SPECTRUM_PLOT_PAD.right * dpr
        const padT = SPECTRUM_PLOT_PAD.top * dpr
        const padB = SPECTRUM_PLOT_PAD.bottom * dpr
        const left = padL
        const right = width - padR
        const top = padT
        const bottom = height - padB
        const plotW = Math.max(1, right - left)

        ctx.fillStyle = colors.textMuted
        ctx.font = `${10 * dpr}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (const db of DB_SCALE) {
          const y = dbToY(db, top, bottom)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, 0.9)
          ctx.lineWidth = dpr * 0.5
          ctx.beginPath()
          ctx.moveTo(left, y)
          ctx.lineTo(right, y)
          ctx.stroke()
          ctx.fillStyle = colors.textMuted
          ctx.fillText(`${db}`, left - 6 * dpr, y)
        }

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        for (const hz of FREQ_SCALE_HZ) {
          if (hz > maxHz) continue
          const x = hzToX(hz, minHz, maxHz, left, right)
          ctx.strokeStyle = colorWithAlpha(colors.borderSubtle, 0.7)
          ctx.beginPath()
          ctx.moveTo(x, top)
          ctx.lineTo(x, bottom)
          ctx.stroke()
          ctx.fillStyle = colors.textMuted
          ctx.fillText(formatFreqTick(hz), x, bottom + 4 * dpr)
        }

        ctx.textBaseline = 'bottom'
        ctx.fillStyle = colorWithAlpha(colors.textMuted, 0.85)
        for (const tick of musicalScaleHz(minHz, maxHz)) {
          const x = hzToX(tick.hz, minHz, maxHz, left, right)
          ctx.fillText(tick.label, x, top - 2 * dpr)
        }

        const drawLayer = (
          peaks: Float32Array | null,
          fast: Float32Array,
          slow: Float32Array,
          style: 'pre' | 'post',
        ) => {
          if (!peaks) return
          followBands(fast, peaks, FAST_ATTACK, FAST_RELEASE)
          followBands(slow, peaks, SLOW_ATTACK, SLOW_RELEASE)
          const edges = logBandEdgesHz(minHz, Math.min(nyquist, maxHz), bands)
          const gap = Math.max(1, Math.floor((plotW / bands) * 0.12))
          const plotBox = { left, right, top, bottom }
          const slowPts = spectrumEnvelopePoints(slow, edges, minHz, maxHz, plotBox)
          const fastPts = spectrumEnvelopePoints(fast, edges, minHz, maxHz, plotBox)
          const wantPeak = follow === 'peak' || follow === 'both'
          const wantSlow = follow === 'slow' || follow === 'both'
          const alpha = style === 'pre' ? (layer === 'both' ? 0.22 : 0.42) : layer === 'both' ? 0.55 : 0.42
          const lineAlpha = style === 'pre' ? (layer === 'both' ? 0.55 : 0.85) : 0.95
          const fill = regionColors ? undefined : colors.spectrum
          const line = regionColors ? undefined : colors.spectrumLine
          const dashed = style === 'pre' && layer === 'both'
          const peakStroke = colorWithAlpha(style === 'pre' ? colors.textMuted : colors.spectrumLine, lineAlpha)
          const slowStroke =
            follow === 'both'
              ? colorWithAlpha(colors.accent, style === 'pre' ? 0.7 : 0.95)
              : peakStroke
          if (showBars) {
            for (let i = 0; i < bands; i++) {
              const x0 = hzToX(edges[i] ?? minHz, minHz, maxHz, left, right)
              const x1 = hzToX(edges[i + 1] ?? Math.min(nyquist, maxHz), minHz, maxHz, left, right)
              const bandW = Math.max(1, x1 - x0)
              const center = bandCenterHz(edges, i)
              const region = regionForHz(center)
              const barFill = fill ?? region.color
              const barLine = line ?? region.color
              const slowDb = slow[i] ?? -100
              const fastDb = fast[i] ?? -100
              const slowY = dbToY(slowDb, top, bottom)
              const fastY = dbToY(fastDb, top, bottom)
              const slowH = bottom - slowY
              const fastH = bottom - fastY
              ctx.fillStyle = colorWithAlpha(barFill, alpha)
              ctx.fillRect(x0 + gap / 2, bottom - slowH, Math.max(1, bandW - gap), slowH)
              if (style === 'post' || layer !== 'both') {
                ctx.fillStyle = barLine
                ctx.fillRect(x0 + gap / 2, fastY, Math.max(1, bandW - gap), Math.max(2, dpr))
                ctx.fillStyle = colorWithAlpha(barLine, 0.35)
                ctx.fillRect(x0 + gap / 2, fastY, Math.max(1, bandW - gap), Math.min(fastH, 8 * dpr))
              }
            }
          } else {
            const area = style === 'pre' ? colors.spectrum : colors.spectrumLine
            ctx.fillStyle = colorWithAlpha(area, style === 'pre' ? (layer === 'both' ? 0.08 : 0.16) : 0.18)
            fillSpectrumEnvelope(ctx, follow === 'peak' ? fastPts : slowPts, bottom)
          }
          const strokeFollow = (pts: typeof fastPts, color: string, width: number) => {
            if (!showLine) return
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            ctx.strokeStyle = color
            ctx.lineWidth = width
            ctx.setLineDash(dashed ? [4 * dpr, 3 * dpr] : [])
            strokeSpectrumEnvelope(ctx, pts)
            ctx.setLineDash([])
          }
          if (wantPeak) {
            strokeFollow(fastPts, peakStroke, Math.max(1.2, dpr * (style === 'pre' ? 1.15 : 1.75)))
          }
          if (wantSlow) {
            strokeFollow(slowPts, slowStroke, Math.max(1, dpr * (follow === 'both' ? 1.2 : style === 'pre' ? 1.15 : 1.65)))
          }
        }

        const eqAudible = live.chain.some((mod) => {
          if (mod.type !== 'eq') return false
          const st = live.eqById[mod.instanceId]
          return eqModuleIsAudible(mod.bypassed, st?.bands ?? [], Boolean(st?.comb.enabled))
        })
        const showPre = layer === 'pre' || (layer === 'both' && eqAudible)
        const showPost = layer === 'post' || layer === 'both'
        const prePeaks = readAnalyserPeaks(engine.getAnalyser('pre'), sr, bands, minHz)
        const postPeaks = readAnalyserPeaks(engine.getAnalyser('eq'), sr, bands, minHz)
        if (postPeaks && prePeaks && eqAudible) {
          const edges = logBandEdgesHz(minHz, Math.min(nyquist, maxHz), bands)
          const gains = new Float32Array(bands)
          for (let i = 0; i < bands; i++) {
            gains[i] = chainEqGainAtHz(live, bandCenterHz(edges, i), sr)
          }
          capBandsByEqGain(postPeaks, prePeaks, gains)
        }
        if (showPre) {
          drawLayer(prePeaks, preFast.current, preSlow.current, 'pre')
        }
        if (showPost) {
          drawLayer(postPeaks, postFast.current, postSlow.current, 'post')
        }

        const eqs = live.chain.filter((m) => m.type === 'eq')
        const freqs = logFreqAxis(Math.floor(plotW), minHz, maxHz)
        for (let ei = 0; ei < eqs.length; ei++) {
          const mod = eqs[ei]
          if (!mod) continue
          const st = live.eqById[mod.instanceId]
          if (!st) continue
          const hasShape = st.bands.some((b) => b.type !== 'off') || st.comb.enabled
          if (!hasShape) continue
          const storedBands = [...st.bands, ...combAsEqBands(st.comb)]
          const liveBands = [
            ...liveEqBandsFromParams(st.bands, live.liveParams),
            ...combAsEqBands({
              ...st.comb,
              teeth: live.liveParams.eqcfTeeth ?? st.comb.teeth,
              gain: live.liveParams.eqcfGain ?? st.comb.gain,
              spacing: live.liveParams.eqcfSpacing ?? st.comb.spacing,
              frequency: live.liveParams.eqcfFreq ?? st.comb.frequency,
            }),
          ]
          const tone = eqTone(ei, colors)
          const xAt = (i: number) => left + (i / Math.max(1, freqs.length - 1)) * plotW
          const yAt = (db: number) => dbToY(db, top, bottom)
          const storedStyle = eqResponseCurveStyle('stored', mod.bypassed, dpr)
          ctx.setLineDash(mod.bypassed ? [5 * dpr, 4 * dpr] : [])
          ctx.strokeStyle = colorWithAlpha(tone.curve, storedStyle.alpha)
          ctx.lineWidth = storedStyle.width
          strokeEqMagnitude(ctx, storedBands, freqs, sr, xAt, yAt)
          if (eqModuleHasLiveCurve(live.fxLfos, st.comb.enabled)) {
            const liveStyle = eqResponseCurveStyle('live', mod.bypassed, dpr)
            ctx.strokeStyle = colorWithAlpha(tone.curve, liveStyle.alpha)
            ctx.lineWidth = liveStyle.width
            strokeEqMagnitude(ctx, liveBands, freqs, sr, xAt, yAt)
          }
          ctx.setLineDash([])
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])

  const onNodePointerDown = (
    instanceId: string,
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedBand({ instanceId, index })
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
    const rect = plot.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const band = (snap.eqById[d.instanceId]?.bands ?? snap.eqBands)[d.index]
    if (!band) return
    const frequency = xToFreq(x, rect.width, EQ_MAX_HZ)
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
  return (
    <div className={styles.wrap}>
      <div className={styles.chrome}>
        <div className={styles.chromeLeft}>
          <label className={styles.bands}>
            Layer
            <select
              aria-label="EQ spectrum layer"
              value={prefs.layer}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, layer: event.target.value as Layer }))
              }
            >
              <option value="pre">Before</option>
              <option value="post">After</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className={styles.bands}>
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
          <label className={styles.bands}>
            Follow
            <select
              aria-label="Spectrum envelope follow"
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
                  <li>{prefs.follow === 'both' ? 'Slow line (accent)' : 'Slow line'}</li>
                ) : null}
                {prefs.layer === 'both' ? <li>Before / after when EQ is on</li> : null}
              </ul>
            )}
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label="Spectrum analyzer"
          onPointerMove={(event) => {
            if (drag.current) return
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            const sr = engine.getSnapshot().sampleRate || 44100
            const nyquist = sr / 2
            const left = SPECTRUM_PLOT_PAD.left
            const right = rect.width - SPECTRUM_PLOT_PAD.right
            const top = SPECTRUM_PLOT_PAD.top
            const bottom = rect.height - SPECTRUM_PLOT_PAD.bottom
            if (x < left || x > right || y < top || y > bottom) {
              setHover(null)
              return
            }
            const hz = hzFromLogAxis((x - left) / Math.max(1, right - left), EQ_MIN_HZ, nyquist)
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
            const bands = snap.eqById[mod.instanceId]?.bands ?? []
            const liveBands = liveEqBandsFromParams(bands, snap.liveParams)
            return liveBands.map((band, index) => {
            if (band.type === 'off') return null
            const xPct = freqToX(band.frequency, 1, EQ_MAX_HZ) * 100
            const yPct =
              bandUsesGain(band.type) || bandUsesWidth(band.type)
                ? eqDbToY(nodeDisplayDb(band), 1, SPECTRUM_EQ_MIN_DB, SPECTRUM_EQ_MAX_DB) * 100
                : dbToY(0, 0, 1) * 100
            const selected =
              selectedBand?.instanceId === mod.instanceId && selectedBand.index === index
            const dim = mod.bypassed || band.bypassed
            const ids = EQ_BAND_LFO_IDS[index]
            const bank = snap.fxLfos[eqBandLfoKind(index)]
            const mapped = Boolean(
              ids &&
                bank?.some(
                  (l) => l.target === ids.freq || l.target === ids.gain || l.target === ids.q,
                ),
            )
            const stored = bands[index]
            const color = eqBandColorForHz(stored?.frequency ?? band.frequency)
            return (
              <button
                key={`${mod.instanceId}-${index}`}
                type="button"
                className={`${styles.node} ${selected ? styles.nodeOn : ''} ${dim ? styles.nodeOff : ''} ${mapped ? styles.nodeLfo : ''}`}
                style={{
                  left: `${xPct}%`,
                  top: `${Math.min(100, Math.max(0, yPct))}%`,
                  background: dim ? undefined : color,
                  borderColor: color,
                }}
                aria-label={`EQ ${mod.instanceId} band ${index + 1} ${band.type}`}
                onPointerDown={(event) => onNodePointerDown(mod.instanceId, index, event)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onPointerCancel={onNodePointerUp}
              >
                {index + 1}
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
