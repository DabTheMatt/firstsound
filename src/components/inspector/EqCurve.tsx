import { Fragment, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { CombFilterState } from '../../audio/engine/comb'
import { combAsEqBands } from '../../audio/engine/comb'
import { EQ_MIN_HZ, bandUsesGain, eqStripKey, type EqBand } from '../../audio/engine/eqBands'
import { EQ_BAND_LFO_IDS } from '../../audio/fx/lfo'
import {
  dbToY,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  EQ_MINI_BAND_COUNT,
  EQ_PLOT_MAX_DB,
  EQ_PLOT_MIN_DB,
  displayFrequencies,
  freqToX,
  layoutMagnitudeCurve,
  responseSampleCount,
  strokeMagnitudeVertices,
  xToFreq,
  yToDb,
} from '../../audio/engine/eqPlot'
import { eqMagnitudeDb } from '../../audio/engine/eqResponse'
import { eqModulationCenter, eqModulationGuides } from '../modulation/modulationModel'
import { bandPeakDb, logBandEdgesHz, spectrumMaxHz } from '../../audio/engine/spectrumBands'
import { measureSpectrumDb, SPECTRUM_ANALYSIS_FFT, type SpectrumFftScratch } from '../../audio/engine/spectrumFft'
import { isPrimaryPointerDown, isPrimaryPointerHeld } from '../../audio/engine/pointerDrag'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, eqTone, readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './EqCurve.module.css'

type Props = {
  bands: EqBand[]
  sampleRate: number
  selectedBand?: number
  comb?: CombFilterState
  toneIndex?: number
  modulate?: boolean
  layout?: 'inset' | 'fill'
  touch?: boolean
  onSelectBand?: (index: number) => void
  onDragBand?: (index: number, patch: Partial<EqBand>) => void
  onInteract?: () => void
  /** Fill the parent. Phone workspace uses this instead of the 188px inspector plot. */
  fill?: boolean
}

export { dbToY, freqToX, xToFreq, yToDb }

export function EqCurve({
  bands,
  sampleRate,
  selectedBand = 0,
  comb,
  toneIndex = 0,
  modulate = true,
  layout = 'inset',
  touch = false,
  onSelectBand,
  onDragBand,
  onInteract,
  fill = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sr = sampleRate || 48000
  const drag = useRef<{
    index: number
    pointerId: number
    q0: number
    y0: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const time = { buf: null as Float32Array | null }
    const bins = { buf: null as Float32Array | null }
    const fft: SpectrumFftScratch = { window: null, real: null, imag: null }
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(draw)
        return
      }
      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)
      const analyser = engine.getAnalyser('pre') ?? engine.getAnalyser('post')
      if (analyser) {
        const fftSize = analyser.fftSize
        const binCount = SPECTRUM_ANALYSIS_FFT >> 1
        if (!time.buf || time.buf.length !== fftSize) time.buf = new Float32Array(fftSize)
        if (!bins.buf || bins.buf.length !== binCount) bins.buf = new Float32Array(binCount)
        analyser.getFloatTimeDomainData(time.buf as Float32Array<ArrayBuffer>)
        measureSpectrumDb(time.buf, bins.buf, fft)
        const fftSr = engine.getSnapshot().sampleRate || sr
        const plotMax = spectrumMaxHz(fftSr)
        const peaks = bandPeakDb(bins.buf, fftSr, EQ_MINI_BAND_COUNT, EQ_MIN_HZ, plotMax)
        const edges = logBandEdgesHz(EQ_MIN_HZ, plotMax, EQ_MINI_BAND_COUNT)
        const gap = Math.max(1, Math.floor((width / EQ_MINI_BAND_COUNT) * 0.12))
        const zeroY = dbToY(0, height)
        ctx.fillStyle = colorWithAlpha(colors.spectrum, 0.42)
        for (let i = 0; i < EQ_MINI_BAND_COUNT; i++) {
          const x0 = freqToX(edges[i] ?? EQ_MIN_HZ, width, plotMax)
          const x1 = freqToX(edges[i + 1] ?? plotMax, width, plotMax)
          const mag = peaks[i] ?? -100
          const t = Math.min(1, Math.max(0, (0 - mag) / 90))
          const y = zeroY + t * (height - zeroY)
          const bandW = Math.max(1, x1 - x0)
          ctx.fillRect(x0 + gap / 2, y, Math.max(1, bandW - gap), height - y)
        }
      }
      const zeroY = dbToY(0, height)
      ctx.strokeStyle = colors.borderSubtle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, zeroY)
      ctx.lineTo(width, zeroY)
      ctx.stroke()
      const live = engine.getSnapshot()
      const plotMax = spectrumMaxHz(live.sampleRate || sr)
      const plotBands = comb ? [...bands, ...combAsEqBands(comb)] : bands
      const freqs = displayFrequencies(responseSampleCount(width), EQ_MIN_HZ, plotMax, 'log')
      const tone = eqTone(toneIndex, colors)
      const plot = { left: 0, right: width, top: 0, bottom: height }
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width, height)
      ctx.clip()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      const processing = plotBands
      const storedStyle = eqResponseCurveStyle('stored', false, dpr)
      const eqVerts = layoutMagnitudeCurve(
        freqs,
        (hz) => eqMagnitudeDb(processing, hz, sr),
        plot,
        EQ_MIN_HZ,
        plotMax,
        EQ_PLOT_MIN_DB,
        EQ_PLOT_MAX_DB,
        'log',
      )
      ctx.strokeStyle = colorWithAlpha(tone.curve, storedStyle.alpha)
      ctx.lineWidth = Math.max(1.5, storedStyle.width)
      strokeMagnitudeVertices(ctx, eqVerts)
      ctx.restore()
      ctx.fillStyle = colors.textMuted
      ctx.font = `${10 * dpr}px sans-serif`
      ctx.fillText('10', 4, height - 4)
      ctx.fillText('1k', width * 0.5 - 8, height - 4)
      ctx.fillText('25k', width - 28 * dpr, height - 4)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    const unsub = subscribeThemeChange(() => undefined)
    return () => {
      cancelAnimationFrame(frame)
      unsub()
    }
  }, [bands, sr, selectedBand, comb, toneIndex, modulate])

  const onNodePointerDown = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isPrimaryPointerDown(event)) return
    event.preventDefault()
    event.stopPropagation()
    onSelectBand?.(index)
    onInteract?.()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      index,
      pointerId: event.pointerId,
      q0: bands[index]?.q ?? 1,
      y0: event.clientY,
    }
  }

  const onNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    const wrap = wrapRef.current
    if (!d || d.pointerId !== event.pointerId || !wrap) return
    if (!isPrimaryPointerHeld(event)) {
      drag.current = null
      return
    }
    const rect = wrap.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const band = bands[d.index]
    if (!band) return
    const plotMax = spectrumMaxHz(sr)
    const frequency = xToFreq(x, rect.width, plotMax)
    const db = yToDb(y, rect.height)
    onDragBand?.(d.index, eqBandDragPatch(band, frequency, db, d.q0, d.y0 - event.clientY))
  }

  const onNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${fill || layout === 'fill' ? styles.fill : ''}`}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="EQ correction curve" />
      {bands.map((band, index) => {
        if (band.type === 'off') return null
        const plotMax = spectrumMaxHz(sr)
        const xPct = freqToX(band.frequency, 1, plotMax) * 100
        const yPct = dbToY(eqNodePlotDb(bands, band.frequency, sr, EQ_PLOT_MIN_DB, EQ_PLOT_MAX_DB), 1) * 100
        const selected = index === selectedBand
        const snap = engine.getSnapshot()
        const guides = selected && modulate
          ? eqModulationGuides(
              snap.fxLfos,
              index,
              band,
              eqModulationCenter(snap.automation, index, band, snap.transportSec, snap.playing),
            )
          : null
        const freqGuide = guides?.frequency
        const gainGuide = guides?.gain && bandUsesGain(band.type) ? guides.gain : null
        const colors = readThemeColors()
        const tone = eqTone(toneIndex, colors)
        const freqX0 = freqGuide ? freqToX(freqGuide.minHz, 1, plotMax) * 100 : 0
        const freqX1 = freqGuide ? freqToX(freqGuide.maxHz, 1, plotMax) * 100 : 0
        const gainY0 = gainGuide ? dbToY(gainGuide.minDb, 1) * 100 : 0
        const gainY1 = gainGuide ? dbToY(gainGuide.maxDb, 1) * 100 : 0
        const ids = EQ_BAND_LFO_IDS[index]
        const liveHz = ids ? snap.liveParams[ids.freq] : null
        const liveDb = ids ? snap.liveParams[ids.gain] : null
        const liveFreqX = freqGuide && liveHz != null && Number.isFinite(liveHz) ? freqToX(liveHz, 1, plotMax) * 100 : null
        const liveGainY = gainGuide && liveDb != null && Number.isFinite(liveDb) ? dbToY(liveDb, 1) * 100 : null
        return (
          <Fragment key={eqStripKey('curve', band)}>
          {freqGuide ? (
            <span
              className={styles.modH}
              aria-hidden="true"
              style={{ left: `${Math.min(freqX0, freqX1)}%`, width: `${Math.abs(freqX1 - freqX0)}%`, top: `${yPct}%` }}
            />
          ) : null}
          {gainGuide ? (
            <span
              className={styles.modV}
              aria-hidden="true"
              style={{
                left: `${xPct}%`,
                top: `${Math.min(gainY0, gainY1)}%`,
                height: `${Math.abs(gainY1 - gainY0)}%`,
              }}
            />
          ) : null}
          {liveFreqX != null ? (
            <span className={styles.modLive} aria-hidden="true" style={{ left: `${liveFreqX}%`, top: `${yPct}%` }} />
          ) : null}
          {liveGainY != null ? (
            <span className={styles.modLive} aria-hidden="true" style={{ left: `${xPct}%`, top: `${liveGainY}%` }} />
          ) : null}
          <button
            type="button"
            className={`${styles.node} ${touch ? styles.nodeTouch : ''} ${selected ? styles.nodeOn : ''} ${band.bypassed ? styles.nodeOff : ''}`}
            style={{
              left: `${xPct}%`,
              top: `${yPct}%`,
              background: band.bypassed ? undefined : tone.node,
              borderColor: tone.curve,
              ['--eq-curve' as string]: tone.curve,
              ['--eq-node-selected' as string]: tone.node,
            }}
            aria-label={`EQ band ${index + 1} ${band.type}`}
            onPointerDown={(event) => onNodePointerDown(index, event)}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onPointerCancel={onNodePointerUp}
          >
            {index + 1}
          </button>
          </Fragment>
        )
      })}
    </div>
  )
}
