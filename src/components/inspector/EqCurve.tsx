import { useEffect, useRef } from 'react'
import type { EqBand } from '../../audio/engine/eqBands'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './EqCurve.module.css'

type Props = {
  bands: EqBand[]
  sampleRate: number
  selectedBand?: number
}

const MIN_DB = -48
const MAX_DB = 18
const MIN_HZ = 20
const MAX_HZ = 20000

function freqToX(hz: number, width: number, maxHz: number): number {
  const t = Math.log(Math.min(maxHz, Math.max(MIN_HZ, hz)) / MIN_HZ) / Math.log(maxHz / MIN_HZ)
  return t * width
}

export function EqCurve({ bands, sampleRate, selectedBand = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sr = sampleRate || 48000

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const colors = readThemeColors()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = colors.bgApp
      ctx.fillRect(0, 0, width, height)
      const zeroY = ((MAX_DB - 0) / (MAX_DB - MIN_DB)) * height
      ctx.strokeStyle = colors.borderSubtle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, zeroY)
      ctx.lineTo(width, zeroY)
      ctx.stroke()
      const nyquist = Math.min(MAX_HZ, sr / 2)
      const freqs = logFreqAxis(width, MIN_HZ, nyquist)
      ctx.beginPath()
      ctx.strokeStyle = colors.eqCurve
      ctx.lineWidth = Math.max(1.5, dpr)
      for (let x = 0; x < width; x++) {
        const db = eqMagnitudeDb(bands, freqs[x] ?? MIN_HZ, sr)
        const y = ((MAX_DB - db) / (MAX_DB - MIN_DB)) * height
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      for (let i = 0; i < bands.length; i++) {
        const band = bands[i]
        if (!band || band.type === 'off') continue
        const x = freqToX(band.frequency, width, nyquist)
        const db = eqMagnitudeDb(bands, band.frequency, sr)
        const y = ((MAX_DB - db) / (MAX_DB - MIN_DB)) * height
        const selected = i === selectedBand
        ctx.beginPath()
        ctx.fillStyle = selected ? colors.eqNodeSelected : colors.textMuted
        ctx.strokeStyle = selected ? colors.eqCurve : colors.borderSubtle
        ctx.lineWidth = Math.max(1, dpr)
        ctx.arc(x, y, (selected ? 5 : 3.5) * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = colors.textMuted
      ctx.font = `${10 * dpr}px sans-serif`
      ctx.fillText('20', 4, height - 4)
      ctx.fillText('1k', width * 0.5 - 8, height - 4)
      ctx.fillText('20k', width - 28 * dpr, height - 4)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [bands, sr, selectedBand])

  return <canvas ref={canvasRef} className={styles.canvas} aria-label="EQ correction curve" />
}
