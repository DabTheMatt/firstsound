import { useEffect, useRef, useState } from 'react'
import { fallHoldDb } from '../../app/editorState'
import { compressorCurveDb, compressorSettings, type CompressorSettings } from '../../audio/fx/compressor'
import { COMPRESSOR_NEEDLE_SPAN_DB, compressorNeedleRadians } from '../../audio/fx/compressorNeedle'
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
  peakAmplitude,
  type LimiterSettings,
  type LimiterWavePreview,
} from '../../audio/fx/limiter'
import { paintIntervalMs } from '../../app/frameBudget'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import { Segmented } from '../controls/Segmented'
import styles from './EqCurve.module.css'

const GR_MAX = 24

export type LimiterPlotMode = 'curve' | 'wave' | 'needle'
export type LimiterPlotKind = 'compressor' | 'limiter'

const LIMITER_PLOT_MODES: { value: LimiterPlotMode; label: string; title: string }[] = [
  { value: 'curve', label: 'Curve', title: 'Transfer curve with knee' },
  { value: 'wave', label: 'Wave', title: 'Next 10 seconds of sample with threshold overlay' },
]

const COMPRESSOR_PLOT_MODES: { value: LimiterPlotMode; label: string; title: string }[] = [
  { value: 'curve', label: 'Curve', title: 'Threshold, ratio, and knee' },
  { value: 'needle', label: 'Needle', title: 'Gain reduction as a moving needle' },
]

export function LimiterPlot({ kind = 'compressor' }: { kind?: LimiterPlotKind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<LimiterPlotMode>(kind === 'compressor' ? 'curve' : 'wave')
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
    let holdIn = Number.NEGATIVE_INFINITY
    let holdOut = Number.NEGATIVE_INFINITY
    let holdGr = 0
    let painted = 0
    let cacheKey = ''
    let preview: LimiterWavePreview | null = null

    const preTap = (): 'compressorPre' | 'limiterPre' =>
      kindRef.current === 'compressor' ? 'compressorPre' : 'limiterPre'
    const postTap = (): 'compressorPost' | 'limiterPost' =>
      kindRef.current === 'compressor' ? 'compressorPost' : 'limiterPost'

    const peakScratch = new Map<string, Float32Array>()
    const readPeakDb = (
      tap: 'compressorPre' | 'limiterPre' | 'compressorPost' | 'limiterPost',
    ): number => {
      const analyser = engine.getAnalyser(tap)
      if (!analyser) return Number.NEGATIVE_INFINITY
      let buf = peakScratch.get(tap)
      if (!buf || buf.length !== analyser.fftSize) {
        buf = new Float32Array(analyser.fftSize)
        peakScratch.set(tap, buf)
      }
      analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>)
      return amplitudeToDb(peakAmplitude(buf))
    }

    const settingsFor = (params: Parameters<typeof compressorSettings>[0]): LimiterSettings | CompressorSettings =>
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
      const playing = snap.playing
      if (painted > 0 && now - painted < paintIntervalMs(playing)) {
        frame = requestAnimationFrame(draw)
        return
      }
      const dtPaint = painted > 0 ? (now - painted) / 1000 : 0.016
      painted = now
      const settings = settingsFor(snap.params)
      const active = moduleOn(snap)
      const colors = readThemeColors()
      const compressor = kindRef.current === 'compressor'
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)

      const showNeedle = compressor && modeRef.current === 'needle'
      if (showNeedle || compressor || modeRef.current === 'curve') {
        const dt = Math.min(0.08, Math.max(0.001, dtPaint))
        holdIn = fallHoldDb(holdIn, readPeakDb(preTap()), dt, 18)
        holdOut = fallHoldDb(holdOut, readPeakDb(postTap()), dt, 18)
        if (compressor) {
          const target = reductionDb()
          const k = 1 - Math.exp(-dt / 0.05)
          holdGr = holdGr + (target - holdGr) * k
          if (Math.abs(target) < 0.05 && Math.abs(holdGr) < 0.05) holdGr = 0
        } else {
          holdGr = fallHoldDb(holdGr, Math.max(0, -reductionDb()), dt, 24)
        }
        if (showNeedle) drawCompressorNeedle(ctx, width, height, dpr, holdGr, colors)
        else drawCompressorCurve(ctx, width, height, dpr, settings, holdIn, holdOut, holdGr, colors, compressor)
      } else {
        const result = drawWavePreview(
          ctx,
          width,
          height,
          dpr,
          settings as LimiterSettings,
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
  const modes = kind === 'compressor' ? COMPRESSOR_PLOT_MODES : LIMITER_PLOT_MODES

  return (
    <div className={styles.plotStack}>
      <Segmented label={label} value={mode} options={modes} onChange={setMode} />
      <div className={styles.wrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label={
            kind === 'compressor' && mode === 'needle'
              ? 'Compressor gain-reduction needle'
              : kind === 'compressor'
                ? 'Compressor transfer curve, input, output, and gain reduction'
                : mode === 'curve'
                  ? 'Transfer curve with soft-knee region'
                  : 'Next 10 seconds of sample with threshold overlay'
          }
        />
      </div>
    </div>
  )
}

function drawCompressorNeedle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  holdGr: number,
  colors: ReturnType<typeof readThemeColors>,
): void {
  const cx = width / 2
  const cy = height * 0.78
  const radius = Math.min(width * 0.4, height * 0.58)
  const left = compressorNeedleRadians(-COMPRESSOR_NEEDLE_SPAN_DB)
  const right = compressorNeedleRadians(0)
  const face = colorWithAlpha(colors.textPrimary, 0.06)
  ctx.fillStyle = face
  const pad = 8 * dpr
  ctx.beginPath()
  ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 8 * dpr)
  ctx.fill()

  ctx.strokeStyle = colorWithAlpha(colors.textMuted, 0.55)
  ctx.lineWidth = Math.max(1.2, dpr * 1.1)
  ctx.beginPath()
  ctx.arc(cx, cy, radius, left, right)
  ctx.stroke()

  const marks = [0, -3, -6, -12, -18, -24]
  ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const db of marks) {
    const angle = compressorNeedleRadians(db)
    const major = db % 6 === 0
    const inner = radius * (major ? 0.82 : 0.9)
    const outer = radius * 1.02
    ctx.strokeStyle = colorWithAlpha(colors.textPrimary, major ? 0.7 : 0.35)
    ctx.lineWidth = Math.max(1, dpr * (major ? 1.1 : 0.7))
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.stroke()
    if (major) {
      const labelR = radius * 1.18
      ctx.fillText(
        `${db}`,
        cx + Math.cos(angle) * labelR,
        cy + Math.sin(angle) * labelR,
      )
    }
  }

  const angle = compressorNeedleRadians(holdGr)
  const tip = radius * 0.78
  ctx.strokeStyle = colors.textPrimary
  ctx.lineWidth = Math.max(1.4, dpr * 1.3)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(angle) * tip, cy + Math.sin(angle) * tip)
  ctx.stroke()
  ctx.fillStyle = colors.eqCurve || colors.accent
  ctx.beginPath()
  ctx.arc(cx + Math.cos(angle) * tip, cy + Math.sin(angle) * tip, 2.2 * dpr, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = colors.textPrimary
  ctx.beginPath()
  ctx.arc(cx, cy, 3.2 * dpr, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = `${Math.round(11 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = colors.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(holdGr.toFixed(1), cx, 12 * dpr)
  ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = colors.textMuted
  ctx.fillText('GR', cx, 24 * dpr)
}

function drawCompressorCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  settings: LimiterSettings | CompressorSettings,
  holdIn: number,
  holdOut: number,
  holdGr: number,
  colors: ReturnType<typeof readThemeColors>,
  liveReduction = false,
): void {
  const padL = 28 * dpr
  const padR = 16 * dpr
  const padT = 16 * dpr
  const padB = 18 * dpr
  const grW = liveReduction ? 14 * dpr : 8 * dpr
  const plotW = Math.max(8, width - padL - padR - grW - 8 * dpr)
  const plotH = Math.max(8, height - padT - padB)
  const left = padL
  const top = padT
  const grX = left + plotW + 6 * dpr
  const knee = compressorKneeRange(settings.threshold, settings.knee)
  const plotMin = liveReduction ? -60 : LIMITER_PLOT_MIN_DB
  const plotMax = liveReduction ? 0 : LIMITER_PLOT_MAX_DB
  const span = plotMax - plotMin
  const tOf = (db: number) => {
    const v = Math.min(plotMax, Math.max(plotMin, db))
    return (v - plotMin) / span
  }
  const xOf = (db: number) => left + tOf(db) * plotW
  const yOf = (db: number) => top + (1 - tOf(db)) * plotH
  const outputAt = (db: number) =>
    liveReduction ? compressorCurveDb(db, settings as CompressorSettings) : limiterOutputDb(db, settings as LimiterSettings)

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
  ctx.moveTo(xOf(plotMin), yOf(plotMin))
  ctx.lineTo(xOf(plotMax), yOf(plotMax))
  ctx.stroke()

  ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.55)
  ctx.beginPath()
  ctx.moveTo(xOf(settings.threshold), top)
  ctx.lineTo(xOf(settings.threshold), top + plotH)
  if (!liveReduction && 'ceiling' in settings) {
    ctx.moveTo(left, yOf(settings.ceiling))
    ctx.lineTo(left + plotW, yOf(settings.ceiling))
  }
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = colors.eqCurve || colors.accent
  ctx.lineWidth = Math.max(1.6, dpr * 1.4)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const steps = Math.max(32, Math.floor(plotW))
  for (let i = 0; i <= steps; i++) {
    const db = plotMin + (i / steps) * (plotMax - plotMin)
    const x = xOf(db)
    const y = yOf(outputAt(db))
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  if (Number.isFinite(holdIn) && holdIn > plotMin + 0.5) {
    const inX = xOf(holdIn)
    const outY = yOf(Number.isFinite(holdOut) ? holdOut : outputAt(holdIn))
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
  const grAmount = liveReduction ? Math.max(0, -holdGr) : Math.max(0, holdGr)
  const grScale = liveReduction ? 20 : GR_MAX
  const grT = Math.min(1, grAmount / grScale)
  const grH = plotH * grT
  if (grH > 0.5) {
    ctx.fillStyle = colors.eqCurve || colors.accent
    ctx.fillRect(grX, liveReduction ? top : top + plotH - grH, grW, grH)
  }
  if (liveReduction) {
    ctx.font = `${Math.round(7 * dpr)}px ui-sans-serif, system-ui, sans-serif`
    ctx.fillStyle = colors.textMuted
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    for (const mark of [0, -6, -12, -20]) {
      const y = top + (Math.min(grScale, -mark) / grScale) * plotH
      ctx.fillText(`${mark}`, grX + grW + 2 * dpr, y)
    }
  }

  ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  const inLabel = Number.isFinite(holdIn) ? `IN ${holdIn.toFixed(1)}` : 'IN'
  ctx.fillText(inLabel, left, 2 * dpr)
  ctx.textAlign = 'right'
  ctx.fillStyle = colors.eqCurve || colors.accent
  const grLabel = liveReduction ? `${holdGr.toFixed(1)} GR` : `${grAmount.toFixed(1)} dB GR`
  ctx.fillText(grLabel, grX - 4 * dpr, 2 * dpr)
  ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.9)
  ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
  const kneeLabel =
    knee.width > 0.05
      ? `th ${settings.threshold.toFixed(0)} · ${settings.ratio.toFixed(1)}:1 · knee ${knee.width.toFixed(0)}`
      : `th ${settings.threshold.toFixed(0)} · ${settings.ratio.toFixed(1)}:1 · hard`
  if (!liveReduction) ctx.fillText(kneeLabel, width - 4 * dpr, padT + 2 * dpr)
  ctx.fillStyle = colors.textMuted
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  const outLabel = Number.isFinite(holdOut) ? `OUT ${holdOut.toFixed(1)}` : 'OUT'
  ctx.fillText(outLabel, left, height - 2 * dpr)
  if (liveReduction) {
    ctx.textAlign = 'right'
    ctx.fillText(kneeLabel, left + plotW, height - 2 * dpr)
  }
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
  const playhead = engine.getSourcePlayheadSeconds()
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
