import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { CombFilterState } from '../../audio/engine/comb'
import { combAsEqBands } from '../../audio/engine/comb'
import {
  bandUsesGain,
  bandUsesWidth,
  EQ_MAX_HZ,
  EQ_MIN_HZ,
  type EqBand,
} from '../../audio/engine/eqBands'
import { eqMagnitudeDb, logFreqAxis } from '../../audio/engine/eqResponse'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './EqCurve.module.css'

type Props = {
  bands: EqBand[]
  sampleRate: number
  selectedBand?: number
  comb?: CombFilterState
  onSelectBand?: (index: number) => void
  onDragBand?: (index: number, patch: Partial<EqBand>) => void
}

const MIN_DB = -48
const MAX_DB = 18

export function freqToX(hz: number, width: number, maxHz: number): number {
  const hi = Math.max(maxHz, EQ_MIN_HZ * 1.01)
  const t = Math.log(Math.min(hi, Math.max(EQ_MIN_HZ, hz)) / EQ_MIN_HZ) / Math.log(hi / EQ_MIN_HZ)
  return t * width
}

export function xToFreq(x: number, width: number, maxHz: number): number {
  const hi = Math.max(maxHz, EQ_MIN_HZ * 1.01)
  const t = Math.min(1, Math.max(0, x / Math.max(1, width)))
  return EQ_MIN_HZ * (hi / EQ_MIN_HZ) ** t
}

export function dbToY(db: number, height: number): number {
  return ((MAX_DB - db) / (MAX_DB - MIN_DB)) * height
}

export function yToDb(y: number, height: number): number {
  return MAX_DB - (y / Math.max(1, height)) * (MAX_DB - MIN_DB)
}

function nodeDb(band: EqBand): number {
  if (bandUsesGain(band.type)) return band.gain
  if (bandUsesWidth(band.type)) return Math.min(12, Math.max(-12, (Math.log(band.q) - Math.log(0.7)) * 6))
  return 0
}

export function EqCurve({
  bands,
  sampleRate,
  selectedBand = 0,
  comb,
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
      const zeroY = dbToY(0, height)
      ctx.strokeStyle = colors.borderSubtle
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, zeroY)
      ctx.lineTo(width, zeroY)
      ctx.stroke()
      const plotBands = comb ? [...bands, ...combAsEqBands(comb)] : bands
      const freqs = logFreqAxis(width, EQ_MIN_HZ, EQ_MAX_HZ)
      ctx.beginPath()
      ctx.strokeStyle = colors.eqCurve
      ctx.lineWidth = Math.max(1.5, dpr)
      for (let x = 0; x < width; x++) {
        const db = eqMagnitudeDb(plotBands, freqs[x] ?? EQ_MIN_HZ, sr)
        const y = dbToY(db, height)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.fillStyle = colors.textMuted
      ctx.font = `${10 * dpr}px sans-serif`
      ctx.fillText('10', 4, height - 4)
      ctx.fillText('1k', width * 0.5 - 8, height - 4)
      ctx.fillText('25k', width - 28 * dpr, height - 4)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [bands, sr, selectedBand, comb])

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
    const patch: Partial<EqBand> = { frequency }
    if (bandUsesGain(band.type)) patch.gain = Math.min(18, Math.max(-18, db))
    else if (bandUsesWidth(band.type)) {
      const dy = d.y0 - event.clientY
      patch.q = Math.min(20, Math.max(0.1, d.q0 * 2 ** (dy / 80)))
    } else {
      const dy = d.y0 - event.clientY
      patch.q = Math.min(20, Math.max(0.1, d.q0 * 2 ** (dy / 90)))
    }
    onDragBand?.(d.index, patch)
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
        const yPct = dbToY(nodeDb(band), 1) * 100
        const selected = index === selectedBand
        return (
          <button
            key={index}
            type="button"
            className={`${styles.node} ${selected ? styles.nodeOn : ''}`}
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
            aria-label={`EQ band ${index + 1} ${band.type}`}
            onPointerDown={(event) => onNodePointerDown(index, event)}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onPointerCancel={onNodePointerUp}
          />
        )
      })}
    </div>
  )
}
