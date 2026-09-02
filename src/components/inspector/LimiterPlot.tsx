import { useEffect, useRef } from 'react'
import {
  dbToAmplitude,
  downsampleScope,
  LIMITER_SCOPE_POINTS,
  limiterSettings,
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
    const scopeIn = new Float32Array(LIMITER_SCOPE_POINTS)
    const scopeOut = new Float32Array(LIMITER_SCOPE_POINTS)

    const readScope = (tap: 'limiterPre' | 'limiterPost', dest: Float32Array) => {
      const analyser = engine.getAnalyser(tap)
      if (!analyser) {
        dest.fill(0)
        return
      }
      const buf = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buf)
      downsampleScope(buf, dest.length, dest)
    }

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
      readScope('limiterPre', scopeIn)
      readScope('limiterPost', scopeOut)
      const settings = limiterSettings(engine.getSnapshot().params)
      const thresh = Math.min(0.98, dbToAmplitude(settings.threshold))
      const gr = engine.getLimiterReduction()

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
      const amp = (plotH / 2) * 0.92

      ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.55)
      ctx.lineWidth = Math.max(1, dpr * 0.6)
      ctx.beginPath()
      ctx.moveTo(left, mid)
      ctx.lineTo(left + plotW, mid)
      ctx.stroke()

      const yTh = thresh * amp
      ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.7)
      ctx.setLineDash([4 * dpr, 3 * dpr])
      ctx.beginPath()
      ctx.moveTo(left, mid - yTh)
      ctx.lineTo(left + plotW, mid - yTh)
      ctx.moveTo(left, mid + yTh)
      ctx.lineTo(left + plotW, mid + yTh)
      ctx.stroke()
      ctx.setLineDash([])

      drawWave(ctx, scopeIn, left, plotW, mid, amp, colorWithAlpha(colors.waveform || colors.textMuted, 0.55), dpr)
      drawWave(ctx, scopeOut, left, plotW, mid, amp, colors.eqCurve || colors.accent, Math.max(1.6, dpr * 1.35))

      ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.fillText('In', left, 3 * dpr)
      ctx.fillStyle = colors.eqCurve || colors.accent
      ctx.fillText('Out', left + 22 * dpr, 3 * dpr)
      ctx.textAlign = 'right'
      ctx.fillText(`${(-gr).toFixed(1)} dB GR`, width - padX, 3 * dpr)
      ctx.fillStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.85)
      ctx.font = `${Math.round(8 * dpr)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(`${settings.threshold.toFixed(0)} dB`, width - padX, padT + 2 * dpr)

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
        aria-label="Limiter waveform crushed at threshold"
      />
    </div>
  )
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  left: number,
  plotW: number,
  mid: number,
  amp: number,
  color: string,
  lineWidth: number,
): void {
  const n = samples.length
  if (n < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, lineWidth)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const x = left + (i / (n - 1)) * plotW
    const y = mid - (samples[i] ?? 0) * amp
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}
