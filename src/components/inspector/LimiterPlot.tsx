import { useEffect, useRef } from 'react'
import { fallHoldDb } from '../../app/editorState'
import {
  amplitudeToDb,
  LIMITER_PLOT_MAX_DB,
  LIMITER_PLOT_MIN_DB,
  limiterOutputDb,
  limiterSettings,
  peakAmplitude,
} from '../../audio/fx/limiter'
import { engine } from '../../hooks/useEngine'
import { colorWithAlpha, readThemeColors } from '../../theme'
import styles from './EqCurve.module.css'

const GR_MAX = 24

export function LimiterPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let last = performance.now()
    let holdIn = Number.NEGATIVE_INFINITY
    let holdOut = Number.NEGATIVE_INFINITY
    let holdGr = 0

    const readPeakDb = (tap: 'limiterPre' | 'limiterPost'): number => {
      const analyser = engine.getAnalyser(tap)
      if (!analyser) return Number.NEGATIVE_INFINITY
      const buf = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buf)
      return amplitudeToDb(peakAmplitude(buf))
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
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        frame = requestAnimationFrame(draw)
        return
      }
      const dt = Math.min(0.08, Math.max(0, (now - last) / 1000))
      last = now
      const snap = engine.getSnapshot()
      const settings = limiterSettings(snap.params)
      holdIn = fallHoldDb(holdIn, readPeakDb('limiterPre'), dt, 18)
      holdOut = fallHoldDb(holdOut, readPeakDb('limiterPost'), dt, 18)
      holdGr = fallHoldDb(holdGr, Math.max(0, -engine.getLimiterReduction()), dt, 24)

      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)

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

      const xOf = (db: number) => left + dbToT(db) * plotW
      const yOf = (db: number) => top + (1 - dbToT(db)) * plotH

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
      ctx.beginPath()
      const steps = Math.max(32, Math.floor(plotW))
      for (let i = 0; i <= steps; i++) {
        const db =
          LIMITER_PLOT_MIN_DB + (i / steps) * (LIMITER_PLOT_MAX_DB - LIMITER_PLOT_MIN_DB)
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
      ctx.fillText(`${(-engine.getLimiterReduction()).toFixed(1)} dB GR`, width - 4 * dpr, 3 * dpr)
      ctx.fillStyle = colors.textMuted
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Out ↑', left, height - 2 * dpr)

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
        aria-label="Limiter input-output curve and gain reduction"
      />
    </div>
  )
}

function dbToT(db: number): number {
  const v = Math.min(LIMITER_PLOT_MAX_DB, Math.max(LIMITER_PLOT_MIN_DB, db))
  return (v - LIMITER_PLOT_MIN_DB) / (LIMITER_PLOT_MAX_DB - LIMITER_PLOT_MIN_DB)
}
