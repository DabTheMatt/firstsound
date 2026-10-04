import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { onPointerReset } from '../../app/pointerSession'
import type { CombFilterState } from '../../audio/engine/comb'
import { combAsEqBands } from '../../audio/engine/comb'
import { EQ_MIN_HZ, eqStripKey, type EqBand } from '../../audio/engine/eqBands'
import { liveEqBandsFromParams } from '../../audio/fx/lfo'
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
import { eqNodeAnchorBands, eqNodeMotion } from '../modulation/modulationModel'
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
  live?: Record<string, number> | null
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
  live,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    return onPointerReset(() => {
      drag.current = null
      setDragIndex(null)
    })
  }, [])

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
      const after = engine.getAnalyser('eq')
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
        if (after && after !== analyser) {
          if (time.buf.length !== after.fftSize) time.buf = new Float32Array(after.fftSize)
          after.getFloatTimeDomainData(time.buf as Float32Array<ArrayBuffer>)
          measureSpectrumDb(time.buf, bins.buf, fft)
          const afterPeaks = bandPeakDb(bins.buf, fftSr, EQ_MINI_BAND_COUNT, EQ_MIN_HZ, plotMax)
          ctx.strokeStyle = colorWithAlpha(colors.spectrumLine, 0.9)
          ctx.lineWidth = 1.25
          ctx.beginPath()
          for (let i = 0; i < EQ_MINI_BAND_COUNT; i++) {
            const x0 = freqToX(edges[i] ?? EQ_MIN_HZ, width, plotMax)
            const x1 = freqToX(edges[i + 1] ?? plotMax, width, plotMax)
            const mag = afterPeaks[i] ?? -100
            const y = zeroY + Math.min(1, Math.max(0, (0 - mag) / 90)) * (height - zeroY)
            const x = (x0 + x1) / 2
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
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
      const shaped = modulate ? liveEqBandsFromParams(bands, live.liveParams) : bands
      const plotBands = comb ? [...shaped, ...combAsEqBands(comb)] : shaped
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
    setDragIndex(index)
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
      setDragIndex(null)
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
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null
      setDragIndex(null)
    }
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
        const snap = engine.getSnapshot()
        const motion = eqNodeMotion({
          band,
          index,
          lfos: snap.fxLfos,
          automation: snap.automation,
          live: (live ?? snap.liveParams) as typeof snap.liveParams,
          timeSec: snap.transportSec,
          playing: snap.playing,
          dragging: dragIndex === index,
          modulate,
        })
        const liveBands = modulate ? liveEqBandsFromParams(bands, (live ?? snap.liveParams) as typeof snap.liveParams) : bands
        const anchor = eqNodeAnchorBands(liveBands, index, motion.frequencyHz, motion.gainDb, motion.q)
        const xPct = freqToX(motion.frequencyHz, 1, plotMax) * 100
        const yPct = dbToY(eqNodePlotDb(anchor, motion.frequencyHz, sr, EQ_PLOT_MIN_DB, EQ_PLOT_MAX_DB), 1) * 100
        const selected = index === selectedBand
        const colors = readThemeColors()
        const tone = eqTone(toneIndex, colors)
        return (
          <Fragment key={eqStripKey('curve', band)}>
          <button
            type="button"
            data-eq-node=""
            data-q-live={motion.qLive ? 'true' : 'false'}
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
