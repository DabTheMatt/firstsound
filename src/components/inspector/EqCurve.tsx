import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { CombFilterState } from '../../audio/engine/comb'
import { combAsEqBands } from '../../audio/engine/comb'
import { EQ_MAX_HZ, EQ_MIN_HZ, type EqBand } from '../../audio/engine/eqBands'
import {
  dbToY,
  eqBandDragPatch,
  eqNodePlotDb,
  eqResponseCurveStyle,
  EQ_MINI_BAND_COUNT,
  EQ_PLOT_MAX_DB,
  EQ_PLOT_MIN_DB,
  freqToX,
  strokeEqMagnitude,
  xToFreq,
  yToDb,
} from '../../audio/engine/eqPlot'
import { logFreqAxis } from '../../audio/engine/eqResponse'
import { eqModuleHasLiveCurve, liveEqBandsFromParams } from '../../audio/fx/lfo'
import { bandPeakDb, logBandEdgesHz, spectrumMaxHz } from '../../audio/engine/spectrumBands'
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
  onSelectBand?: (index: number) => void
  onDragBand?: (index: number, patch: Partial<EqBand>) => void
}

export { dbToY, freqToX, xToFreq, yToDb }

export function EqCurve({
  bands,
  sampleRate,
  selectedBand = 0,
  comb,
  toneIndex = 0,
  modulate = true,
  onSelectBand,
  onDragBand,
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
      const analyser = engine.getAnalyser('pre') ?? engine.getAnalyser('eq')
      if (analyser) {
        const bins = new Float32Array(analyser.frequencyBinCount)
        analyser.getFloatFrequencyData(bins)
        const fftSr = engine.getSnapshot().sampleRate || sr
        const plotMax = spectrumMaxHz(fftSr, EQ_MAX_HZ)
        const peaks = bandPeakDb(bins, fftSr, EQ_MINI_BAND_COUNT, EQ_MIN_HZ, plotMax)
        const edges = logBandEdgesHz(EQ_MIN_HZ, plotMax, EQ_MINI_BAND_COUNT)
        const gap = Math.max(1, Math.floor((width / EQ_MINI_BAND_COUNT) * 0.12))
        const zeroY = dbToY(0, height)
        ctx.fillStyle = colorWithAlpha(colors.spectrum, 0.42)
        for (let i = 0; i < EQ_MINI_BAND_COUNT; i++) {
          const x0 = freqToX(edges[i] ?? EQ_MIN_HZ, width, EQ_MAX_HZ)
          const x1 = freqToX(edges[i + 1] ?? plotMax, width, EQ_MAX_HZ)
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
      const plotBands = comb ? [...bands, ...combAsEqBands(comb)] : bands
      const freqs = logFreqAxis(width, EQ_MIN_HZ, EQ_MAX_HZ)
      const tone = eqTone(toneIndex, colors)
      const yAt = (db: number) => Math.min(height, Math.max(0, dbToY(db, height)))
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width, height)
      ctx.clip()
      const storedStyle = eqResponseCurveStyle('stored', false, dpr)
      ctx.strokeStyle = colorWithAlpha(tone.curve, storedStyle.alpha)
      ctx.lineWidth = Math.max(1.5, storedStyle.width)
      strokeEqMagnitude(ctx, plotBands, freqs, sr, (i) => i, yAt)
      if (modulate && eqModuleHasLiveCurve(live.fxLfos, Boolean(comb?.enabled))) {
        const liveComb = comb
          ? {
              ...comb,
              teeth: live.liveParams.eqcfTeeth ?? comb.teeth,
              gain: live.liveParams.eqcfGain ?? comb.gain,
              spacing: live.liveParams.eqcfSpacing ?? comb.spacing,
              frequency: live.liveParams.eqcfFreq ?? comb.frequency,
            }
          : undefined
        const liveBands = [
          ...liveEqBandsFromParams(bands, live.liveParams, true),
          ...(liveComb ? combAsEqBands(liveComb) : []),
        ]
        const liveStyle = eqResponseCurveStyle('live', false, dpr)
        ctx.strokeStyle = colorWithAlpha(tone.curve, liveStyle.alpha)
        ctx.lineWidth = Math.max(0.75, liveStyle.width)
        strokeEqMagnitude(ctx, liveBands, freqs, sr, (i) => i, yAt)
      }
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
    event.preventDefault()
    event.stopPropagation()
    onSelectBand?.(index)
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
    const rect = wrap.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const band = bands[d.index]
    if (!band) return
    const frequency = xToFreq(x, rect.width, EQ_MAX_HZ)
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
    <div ref={wrapRef} className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="EQ correction curve" />
      {bands.map((band, index) => {
        if (band.type === 'off') return null
        const xPct = freqToX(band.frequency, 1, EQ_MAX_HZ) * 100
        const liveBands = liveEqBandsFromParams(bands, engine.getSnapshot().liveParams, modulate)
        const yPct =
          dbToY(eqNodePlotDb(liveBands, band.frequency, sr, EQ_PLOT_MIN_DB, EQ_PLOT_MAX_DB), 1) * 100
        const selected = index === selectedBand
        const colors = readThemeColors()
        const tone = eqTone(toneIndex, colors)
        return (
          <button
            key={index}
            type="button"
            className={`${styles.node} ${selected ? styles.nodeOn : ''} ${band.bypassed ? styles.nodeOff : ''}`}
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
        )
      })}
    </div>
  )
}
