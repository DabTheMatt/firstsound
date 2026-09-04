import { useEffect, useRef } from 'react'
import {
  buildLimiterWavePreview,
  dbToAmplitude,
  LIMITER_PREVIEW_SECONDS,
  limiterSettings,
  type LimiterWavePreview,
} from '../../audio/fx/limiter'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import styles from './EqCurve.module.css'

export function LimiterPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let cacheKey = ''
    let preview: LimiterWavePreview | null = null

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

      const snap = engine.getSnapshot()
      const settings = limiterSettings(snap.params)
      const limiterOn = snap.chain.some((m) => m.type === 'limiter' && !m.bypassed)
      const mono = engine.getMono()
      const buffer = engine.getBuffer()
      const sampleRate = buffer?.sampleRate ?? (snap.sourceSampleRate || 48000)
      const duration = buffer?.duration ?? (mono ? mono.length / sampleRate : 0)
      const playhead = engine.getPlayheadSeconds()
      // Quantize so we rebuild envelopes ~30×/s while playing, not every paint.
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
        limiterOn ? 'on' : 'off',
      ].join('|')

      if (!mono || mono.length === 0) {
        preview = null
        cacheKey = ''
      } else if (key !== cacheKey) {
        preview = buildLimiterWavePreview(
          mono,
          sampleRate,
          startSec,
          LIMITER_PREVIEW_SECONDS,
          buckets,
          settings,
          limiterOn,
        )
        cacheKey = key
      }

      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)

      const padX = 8 * dpr
      const padT = 16 * dpr
      const padB = 8 * dpr
      const plotW = Math.max(8, width - padX * 2)
      const plotH = Math.max(8, height - padT - padB)
      const left = padX
      const mid = padT + plotH / 2

      const threshAmp = dbToAmplitude(settings.threshold)
      const ceilingAmp = dbToAmplitude(settings.ceiling)
      const inPeak = Math.max(preview?.peak ?? 0, threshAmp * 1.15, ceilingAmp * 1.15, 0.12)
      const scale = 1 / inPeak
      const amp = (plotH / 2) * 0.92 * scale
      const gr = limiterOn ? Math.max(0, -engine.getLimiterReduction()) : 0

      ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.45)
      ctx.lineWidth = Math.max(1, dpr * 0.6)
      ctx.beginPath()
      ctx.moveTo(left, mid)
      ctx.lineTo(left + plotW, mid)
      ctx.stroke()

      drawThresholdLines(ctx, left, plotW, mid, amp, threshAmp, ceilingAmp, colors, dpr)

      if (preview && preview.durationSec > 0) {
        drawEnvelope(
          ctx,
          preview.inMin,
          preview.inMax,
          left,
          plotW,
          mid,
          amp,
          colorWithAlpha(colors.waveform || colors.textMuted, 0.4),
        )
        drawEnvelope(
          ctx,
          preview.outMin,
          preview.outMax,
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
      const windowLabel = preview
        ? `${Math.min(LIMITER_PREVIEW_SECONDS, preview.durationSec).toFixed(1)} s`
        : `${LIMITER_PREVIEW_SECONDS} s`
      ctx.fillText(`${windowLabel} · ${gr.toFixed(1)} dB GR`, width - padX, 3 * dpr)
      ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.9)
      ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(
        `th ${settings.threshold.toFixed(0)} · ceil ${settings.ceiling.toFixed(1)}`,
        width - padX,
        padT + 2 * dpr,
      )

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.wrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Next 10 seconds of sample with limiter threshold overlay"
      />
    </div>
  )
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
