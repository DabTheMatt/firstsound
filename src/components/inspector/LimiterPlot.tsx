import { useEffect, useRef, useState } from 'react'
import { fallHoldDb } from '../../app/editorState'
import { compressorSettings } from '../../audio/fx/compressor'
import {
  amplitudeToDb,
  buildLimiterWavePreview,
  compressorKneeRange,
  dbToAmplitude,
  LIMITER_PLOT_MAX_DB,
  LIMITER_PLOT_MIN_DB,
  LIMITER_PREVIEW_SECONDS,
  limiterBrickwallSettings,
  limiterOutputDb,
  limiterPlotT,
  peakAmplitude,
  type LimiterSettings,
  type LimiterWavePreview,
} from '../../audio/fx/limiter'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import { Segmented } from '../controls/Segmented'
import styles from './EqCurve.module.css'

const GR_MAX = 24

export type LimiterPlotMode = 'curve' | 'wave'
export type LimiterPlotKind = 'compressor' | 'limiter'

const PLOT_MODES: { value: LimiterPlotMode; label: string; title: string }[] = [
  { value: 'curve', label: 'Curve', title: 'Compressor transfer curve with knee' },
  { value: 'wave', label: 'Wave', title: 'Next 10 seconds of sample with threshold overlay' },
]

export function LimiterPlot({ kind = 'compressor' }: { kind?: LimiterPlotKind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<LimiterPlotMode>('curve')
  const modeRef = useRef(mode)
  const kindRef = useRef(kind)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    kindRef.current = kind
  }, [kind])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let last = performance.now()
    let holdIn = Number.NEGATIVE_INFINITY
    let holdOut = Number.NEGATIVE_INFINITY
    let holdGr = 0
    let cacheKey = ''
    let preview: LimiterWavePreview | null = null

    const preTap = (): 'compressorPre' | 'limiterPre' =>
      kindRef.current === 'compressor' ? 'compressorPre' : 'limiterPre'
    const postTap = (): 'compressorPost' | 'limiterPost' =>
      kindRef.current === 'compressor' ? 'compressorPost' : 'limiterPost'

    const readPeakDb = (
      tap: 'compressorPre' | 'limiterPre' | 'compressorPost' | 'limiterPost',
    ): number => {
      const analyser = engine.getAnalyser(tap)
      if (!analyser) return Number.NEGATIVE_INFINITY
      const buf = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buf)
      return amplitudeToDb(peakAmplitude(buf))
    }

    const settingsFor = (params: Parameters<typeof compressorSettings>[0]): LimiterSettings =>
      kindRef.current === 'compressor' ? compressorSettings(params) : limiterBrickwallSettings(params)

    const moduleOn = (snap: ReturnType<typeof engine.getSnapshot>): boolean =>
      snap.chain.some((m) => m.type === kindRef.current && !m.bypassed)

    const reductionDb = (): number =>
      kindRef.current === 'compressor' ? engine.getCompressorReduction() : engine.getLimiterReduction()

    const draw = (now: number) => {
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

      const snap = engine.getSnapshot()
      const settings = settingsFor(snap.params)
      const active = moduleOn(snap)
      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)

      if (modeRef.current === 'curve') {
        const dt = Math.min(0.08, Math.max(0, (now - last) / 1000))
        last = now
        holdIn = fallHoldDb(holdIn, readPeakDb(preTap()), dt, 18)
        holdOut = fallHoldDb(holdOut, readPeakDb(postTap()), dt, 18)
        holdGr = fallHoldDb(holdGr, Math.max(0, -reductionDb()), dt, 24)
        drawCompressorCurve(ctx, width, height, dpr, settings, holdIn, holdOut, holdGr, colors)
      } else {
        last = now
        const result = drawWavePreview(
          ctx,
          width,
          height,
          dpr,
          settings,
          active,
          colors,
          preview,
          cacheKey,
          reductionDb,
        )
        preview = result.preview
        cacheKey = result.cacheKey
      }

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  const label = kind === 'compressor' ? 'Compressor preview' : 'Limiter preview'

  return (
    <div className={styles.plotStack}>
      <Segmented label={label} value={mode} options={PLOT_MODES} onChange={setMode} />
      <div className={styles.wrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label={
            mode === 'curve'
              ? 'Transfer curve with soft-knee region'
              : 'Next 10 seconds of sample with threshold overlay'
          }
        />
      </div>
    </div>
  )
}

function drawCompressorCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  settings: LimiterSettings,
  holdIn: number,
  holdOut: number,
  holdGr: number,
  colors: ReturnType<typeof readThemeColors>,
): void {
  const padL = 22 * dpr
  const padR = 16 * dpr
  const padT = 16 * dpr
  const padB = 14 * dpr
  const grW = 8 * dpr
  const plotW = Math.max(8, width - padL - padR - grW - 6 * dpr)
  const plotH = Math.max(8, height - padT - padB)
  const left = padL
  const top = padT
  const grX = left + plotW + 5 * dpr
  const knee = compressorKneeRange(settings.threshold, settings.knee)

  const xOf = (db: number) => left + limiterPlotT(db) * plotW
  const yOf = (db: number) => top + (1 - limiterPlotT(db)) * plotH

  ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.45)
  ctx.lineWidth = Math.max(1, dpr * 0.6)
  for (const db of [0, -6, -12, -24, -36]) {
    ctx.beginPath()
    ctx.moveTo(xOf(db), top)
    ctx.lineTo(xOf(db), top + plotH)
    ctx.moveTo(left, yOf(db))
    ctx.lineTo(left + plotW, yOf(db))
    ctx.stroke()
  }

  if (knee.width > 0.05) {
    const x0 = xOf(knee.lo)
    const x1 = xOf(knee.hi)
    ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.14)
    ctx.fillRect(x0, top, Math.max(1, x1 - x0), plotH)
    ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.35)
    ctx.setLineDash([2 * dpr, 3 * dpr])
    ctx.beginPath()
    ctx.moveTo(x0, top)
    ctx.lineTo(x0, top + plotH)
    ctx.moveTo(x1, top)
    ctx.lineTo(x1, top + plotH)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.strokeStyle = colorWithAlpha(colors.textMuted, 0.45)
  ctx.setLineDash([3 * dpr, 3 * dpr])
  ctx.beginPath()
  ctx.moveTo(xOf(LIMITER_PLOT_MIN_DB), yOf(LIMITER_PLOT_MIN_DB))
  ctx.lineTo(xOf(LIMITER_PLOT_MAX_DB), yOf(LIMITER_PLOT_MAX_DB))
  ctx.stroke()

  ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.55)
  ctx.beginPath()
  ctx.moveTo(xOf(settings.threshold), top)
  ctx.lineTo(xOf(settings.threshold), top + plotH)
  ctx.moveTo(left, yOf(settings.ceiling))
  ctx.lineTo(left + plotW, yOf(settings.ceiling))
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = colors.eqCurve || colors.accent
  ctx.lineWidth = Math.max(1.6, dpr * 1.4)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const steps = Math.max(32, Math.floor(plotW))
  for (let i = 0; i <= steps; i++) {
    const db = LIMITER_PLOT_MIN_DB + (i / steps) * (LIMITER_PLOT_MAX_DB - LIMITER_PLOT_MIN_DB)
    const x = xOf(db)
    const y = yOf(limiterOutputDb(db, settings))
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  if (Number.isFinite(holdIn)) {
    const inX = xOf(holdIn)
    const outY = yOf(Number.isFinite(holdOut) ? holdOut : limiterOutputDb(holdIn, settings))
    ctx.strokeStyle = colorWithAlpha(colors.waveform || colors.textMuted, 0.55)
    ctx.lineWidth = Math.max(1, dpr * 0.7)
    ctx.beginPath()
    ctx.moveTo(inX, top)
    ctx.lineTo(inX, top + plotH)
    ctx.moveTo(left, outY)
    ctx.lineTo(left + plotW, outY)
    ctx.stroke()
    ctx.fillStyle = colors.eqCurve || colors.accent
    ctx.beginPath()
    ctx.arc(inX, outY, 3.4 * dpr, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.35)
  ctx.fillRect(grX, top, grW, plotH)
  const grT = Math.min(1, Math.max(0, holdGr / GR_MAX))
  const grH = plotH * grT
  ctx.fillStyle = colors.eqCurve || colors.accent
  ctx.fillRect(grX, top + plotH - grH, grW, grH)

  ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.fillText('In →', left, 3 * dpr)
  ctx.textAlign = 'right'
  ctx.fillStyle = colors.eqCurve || colors.accent
  ctx.fillText(`${holdGr.toFixed(1)} dB GR`, width - 4 * dpr, 3 * dpr)
  ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.9)
  ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  const kneeLabel =
    knee.width > 0.05
      ? `th ${settings.threshold.toFixed(0)} · knee ${knee.width.toFixed(0)}`
      : `th ${settings.threshold.toFixed(0)} · hard`
  ctx.fillText(kneeLabel, width - 4 * dpr, padT + 2 * dpr)
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Out ↑', left, height - 2 * dpr)
}

function drawWavePreview(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  settings: LimiterSettings,
  moduleOn: boolean,
  colors: ReturnType<typeof readThemeColors>,
  preview: LimiterWavePreview | null,
  cacheKey: string,
  reductionDb: () => number,
): { preview: LimiterWavePreview | null; cacheKey: string } {
  const snap = engine.getSnapshot()
  const mono = engine.getMono()
  const buffer = engine.getBuffer()
  const sampleRate = buffer?.sampleRate ?? (snap.sourceSampleRate || 48000)
  const duration = buffer?.duration ?? (mono ? mono.length / sampleRate : 0)
  const playhead = engine.getPlayheadSeconds()
  let startSec = Math.max(0, Math.floor(playhead * 30) / 30)
  if (duration > 0 && startSec >= duration - 0.01) {
    startSec = Math.max(0, duration - LIMITER_PREVIEW_SECONDS)
  }
  const buckets = Math.max(32, width)
  const key = [
    snap.bufferRev,
    startSec.toFixed(4),
    buckets,
    settings.inputGain,
    settings.threshold,
    settings.knee,
    settings.ratio,
    settings.makeupGain,
    settings.ceiling,
    moduleOn ? 'on' : 'off',
  ].join('|')

  let nextPreview = preview
  let nextKey = cacheKey
  if (!mono || mono.length === 0) {
    nextPreview = null
    nextKey = ''
  } else if (key !== cacheKey) {
    nextPreview = buildLimiterWavePreview(
      mono,
      sampleRate,
      startSec,
      LIMITER_PREVIEW_SECONDS,
      buckets,
      settings,
      moduleOn,
    )
    nextKey = key
  }

  const padX = 8 * dpr
  const padT = 16 * dpr
  const padB = 8 * dpr
  const plotW = Math.max(8, width - padX * 2)
  const plotH = Math.max(8, height - padT - padB)
  const left = padX
  const mid = padT + plotH / 2

  const threshAmp = dbToAmplitude(settings.threshold)
  const ceilingAmp = dbToAmplitude(settings.ceiling)
  const inPeak = Math.max(nextPreview?.peak ?? 0, threshAmp * 1.15, ceilingAmp * 1.15, 0.12)
  const scale = 1 / inPeak
  const amp = (plotH / 2) * 0.92 * scale
  const gr = moduleOn ? Math.max(0, -reductionDb()) : 0

  ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.45)
  ctx.lineWidth = Math.max(1, dpr * 0.6)
  ctx.beginPath()
  ctx.moveTo(left, mid)
  ctx.lineTo(left + plotW, mid)
  ctx.stroke()

  drawThresholdLines(ctx, left, plotW, mid, amp, threshAmp, ceilingAmp, colors, dpr)

  if (nextPreview && nextPreview.durationSec > 0) {
    drawEnvelope(
      ctx,
      nextPreview.inMin,
      nextPreview.inMax,
      left,
      plotW,
      mid,
      amp,
      colorWithAlpha(colors.waveform || colors.textMuted, 0.4),
    )
    drawEnvelope(
      ctx,
      nextPreview.outMin,
      nextPreview.outMax,
      left,
      plotW,
      mid,
      amp,
      colors.eqCurve || colors.accent,
    )
  } else {
    ctx.fillStyle = colors.textMuted
    ctx.font = `${Math.round(10 * dpr)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Load a sample to preview the next 10 s', width / 2, mid)
  }

  ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = colors.textMuted
  ctx.fillText('In', left, 3 * dpr)
  ctx.fillStyle = colors.eqCurve || colors.accent
  ctx.fillText('Out', left + 22 * dpr, 3 * dpr)
  ctx.textAlign = 'right'
  ctx.fillStyle = colors.textMuted
  const windowLabel = nextPreview
    ? `${Math.min(LIMITER_PREVIEW_SECONDS, nextPreview.durationSec).toFixed(1)} s`
    : `${LIMITER_PREVIEW_SECONDS} s`
  ctx.fillText(`${windowLabel} · ${gr.toFixed(1)} dB GR`, width - padX, 3 * dpr)
  ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.9)
  ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText(
    `th ${settings.threshold.toFixed(0)} · ceil ${settings.ceiling.toFixed(1)}`,
    width - padX,
    padT + 2 * dpr,
  )

  return { preview: nextPreview, cacheKey: nextKey }
}

function drawThresholdLines(
  ctx: CanvasRenderingContext2D,
  left: number,
  plotW: number,
  mid: number,
  amp: number,
  threshAmp: number,
  ceilingAmp: number,
  colors: ReturnType<typeof readThemeColors>,
  dpr: number,
): void {
  const yTh = threshAmp * amp
  const yCeil = ceilingAmp * amp
  ctx.setLineDash([5 * dpr, 4 * dpr])
  ctx.lineWidth = Math.max(1, dpr * 0.7)
  ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.75)
  ctx.beginPath()
  ctx.moveTo(left, mid - yTh)
  ctx.lineTo(left + plotW, mid - yTh)
  ctx.moveTo(left, mid + yTh)
  ctx.lineTo(left + plotW, mid + yTh)
  ctx.stroke()

  ctx.strokeStyle = colorWithAlpha(colors.playhead || colors.textMuted, 0.7)
  ctx.setLineDash([2 * dpr, 3 * dpr])
  ctx.beginPath()
  ctx.moveTo(left, mid - yCeil)
  ctx.lineTo(left + plotW, mid - yCeil)
  ctx.moveTo(left, mid + yCeil)
  ctx.lineTo(left + plotW, mid + yCeil)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  min: Float32Array,
  max: Float32Array,
  left: number,
  plotW: number,
  mid: number,
  amp: number,
  color: string,
): void {
  const n = Math.min(min.length, max.length)
  if (n < 1) return
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const x = left + (i / n) * plotW
    const w = Math.max(1, plotW / n)
    const hi = Math.max(-1, Math.min(1, max[i] ?? 0))
    const lo = Math.max(-1, Math.min(1, min[i] ?? 0))
    const top = mid - hi * amp
    const bottom = mid - lo * amp
    ctx.fillRect(x, top, w, Math.max(1, bottom - top))
  }
}
