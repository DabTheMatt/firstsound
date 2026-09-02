import { useEffect, useRef } from 'react'
import {
  crushSample,
  dbToAmplitude,
  downsampleScope,
  LIMITER_SCOPE_POINTS,
  limiterSettings,
  peakAmplitude,
} from '../../audio/fx/limiter'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import styles from './EqCurve.module.css'

const LIVE_FLOOR = 0.02

export function LimiterPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const scopeIn = new Float32Array(LIMITER_SCOPE_POINTS)
    const scopeOut = new Float32Array(LIMITER_SCOPE_POINTS)

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
      const thresh = Math.min(0.98, dbToAmplitude(settings.threshold))
      const live = readLiveInput()
      if (peakAmplitude(live) >= LIVE_FLOOR) {
        downsampleScope(live, LIMITER_SCOPE_POINTS, scopeIn)
      } else {
        fillPreviewSine(scopeIn, 0.9)
      }

      const limiterOn = snap.chain.some((m) => m.type === 'limiter' && !m.bypassed)
      for (let i = 0; i < scopeIn.length; i++) {
        const x = scopeIn[i] ?? 0
        scopeOut[i] = limiterOn ? crushSample(x, thresh, settings.ratio) : x
      }

      const inPeak = Math.max(peakAmplitude(scopeIn), thresh * 1.15, 0.12)
      const scale = 1 / inPeak
      const gr = limiterOn ? Math.max(0, -engine.getLimiterReduction()) : 0

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
      const amp = (plotH / 2) * 0.92 * scale

      ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.45)
      ctx.lineWidth = Math.max(1, dpr * 0.6)
      ctx.beginPath()
      ctx.moveTo(left, mid)
      ctx.lineTo(left + plotW, mid)
      ctx.stroke()

      const yTh = thresh * amp
      ctx.strokeStyle = colorWithAlpha(colors.eqCurve || colors.accent, 0.75)
      ctx.setLineDash([5 * dpr, 4 * dpr])
      ctx.beginPath()
      ctx.moveTo(left, mid - yTh)
      ctx.lineTo(left + plotW, mid - yTh)
      ctx.moveTo(left, mid + yTh)
      ctx.lineTo(left + plotW, mid + yTh)
      ctx.stroke()
      ctx.setLineDash([])

      drawWave(
        ctx,
        scopeIn,
        left,
        plotW,
        mid,
        amp,
        colorWithAlpha(colors.waveform || colors.textMuted, 0.5),
        Math.max(1.2, dpr),
      )
      drawWave(
        ctx,
        scopeOut,
        left,
        plotW,
        mid,
        amp,
        colors.eqCurve || colors.accent,
        Math.max(1.8, dpr * 1.4),
      )

      ctx.font = `${Math.round(9 * dpr)}px ui-sans-serif, system-ui, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.fillText('In', left, 3 * dpr)
      ctx.fillStyle = colors.eqCurve || colors.accent
      ctx.fillText('Out', left + 22 * dpr, 3 * dpr)
      ctx.textAlign = 'right'
      ctx.fillStyle = colors.textMuted
      ctx.fillText(`${gr.toFixed(1)} dB GR`, width - padX, 3 * dpr)
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

function readLiveInput(): Float32Array {
  const taps = ['limiterPre', 'pre', 'eq', 'post'] as const
  for (const tap of taps) {
    const analyser = engine.getAnalyser(tap)
    if (!analyser) continue
    const buf = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buf)
    if (peakAmplitude(buf) >= LIVE_FLOOR) return buf
  }
  return new Float32Array(0)
}

/** Two coarse cycles so crushed tops stay obvious without a busy scope. */
function fillPreviewSine(out: Float32Array, amp: number): void {
  const n = out.length
  for (let i = 0; i < n; i++) {
    out[i] = amp * Math.sin((i / Math.max(1, n)) * Math.PI * 4)
  }
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
