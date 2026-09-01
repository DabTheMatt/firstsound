import { useEffect, useRef } from 'react'
import { decimateWave, samplesToAppend, scrollWave } from '../../audio/engine/waveScroll'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import styles from './EqCurve.module.css'

export function LimiterWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let last = performance.now()
    let historyIn: Float32Array | null = null
    let historyOut: Float32Array | null = null
    const scratchIn = new Float32Array(new ArrayBuffer(512 * 4))
    const scratchOut = new Float32Array(new ArrayBuffer(512 * 4))

    const readTap = (tap: 'limiterPre' | 'limiterPost'): Float32Array | null => {
      const analyser = engine.getAnalyser(tap)
      if (!analyser) return null
      const buf = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buf)
      return buf
    }

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
      if (!historyIn || historyIn.length !== width) {
        historyIn = new Float32Array(width)
        historyOut = new Float32Array(width)
      }
      const ctx = canvas.getContext('2d')
      if (!ctx || !historyIn || !historyOut) {
        frame = requestAnimationFrame(draw)
        return
      }
      const dt = Math.min(0.08, Math.max(0, (now - last) / 1000))
      last = now
      const n = Math.min(scratchIn.length, samplesToAppend(dt, width))
      const timeIn = readTap('limiterPre')
      const timeOut = readTap('limiterPost')
      const sliceNewest = (buf: Float32Array | null, out: Float32Array) => {
        if (!buf || buf.length === 0) {
          out.fill(0, 0, n)
          return
        }
        decimateWave(buf, n, out)
      }
      sliceNewest(timeIn, scratchIn)
      sliceNewest(timeOut, scratchOut)
      scrollWave(historyIn, scratchIn.subarray(0, n))
      scrollWave(historyOut, scratchOut.subarray(0, n))

      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = colorWithAlpha(colors.borderSubtle || colors.textMuted, 0.55)
      ctx.lineWidth = Math.max(1, dpr * 0.6)
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      const pad = height * 0.1
      const amp = (height - pad * 2) / 2
      const mid = height / 2
      drawTrace(
        ctx,
        historyIn,
        width,
        mid,
        amp,
        colorWithAlpha(colors.waveform || colors.textMuted, 0.95),
        Math.max(2, dpr * 1.6),
      )
      drawTrace(ctx, historyOut, width, mid, amp, colors.eqCurve || colors.accent, Math.max(2.4, dpr * 2))

      const gr = engine.getLimiterReduction()
      ctx.font = `${Math.round(10 * dpr)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillStyle = colors.textMuted
      ctx.textBaseline = 'top'
      ctx.fillText('In', 6 * dpr, 5 * dpr)
      ctx.fillStyle = colors.eqCurve || colors.accent
      ctx.fillText('Out', 28 * dpr, 5 * dpr)
      ctx.fillStyle = colors.textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(`${gr.toFixed(1)} dB GR`, width - 6 * dpr, 5 * dpr)
      ctx.textAlign = 'left'

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Limiter input and output waveform" />
    </div>
  )
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  history: Float32Array,
  width: number,
  mid: number,
  amp: number,
  color: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, lineWidth)
  ctx.beginPath()
  const last = Math.max(1, history.length - 1)
  for (let x = 0; x < width; x++) {
    const i = Math.min(history.length - 1, Math.round((x / Math.max(1, width - 1)) * last))
    const y = mid - (history[i] ?? 0) * amp
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}
