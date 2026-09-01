import { useEffect, useRef } from 'react'
import type { EqBand } from '../../audio/engine/eqBands'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import styles from './EqCurve.module.css'

type Props = {
  bands: EqBand[]
  sampleRate: number
}

const MIN_DB = -48
const MAX_DB = 18

export function EqCurve({ bands, sampleRate }: Props) {
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
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#151717'
      ctx.fillRect(0, 0, width, height)
      const zeroY = ((MAX_DB - 0) / (MAX_DB - MIN_DB)) * height
      ctx.strokeStyle = '#2c2f31'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, zeroY)
      ctx.lineTo(width, zeroY)
      ctx.stroke()
      const freqs = logFreqAxis(width, 20, Math.min(20000, sr / 2))
      ctx.beginPath()
      ctx.strokeStyle = '#c4a574'
      ctx.lineWidth = Math.max(1.5, dpr)
      for (let x = 0; x < width; x++) {
        const db = eqMagnitudeDb(bands, freqs[x] ?? 20, sr)
        const y = ((MAX_DB - db) / (MAX_DB - MIN_DB)) * height
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.fillStyle = '#9aa0a3'
      ctx.font = `${10 * dpr}px sans-serif`
      ctx.fillText('20', 4, height - 4)
      ctx.fillText('1k', width * 0.5 - 8, height - 4)
      ctx.fillText('20k', width - 28 * dpr, height - 4)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [bands, sr])

  return <canvas ref={canvasRef} className={styles.canvas} aria-label="EQ correction curve" />
}
