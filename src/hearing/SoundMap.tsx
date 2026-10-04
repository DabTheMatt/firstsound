import { useEffect, useRef } from 'react'
import type { SoundMapColumn } from './analyze'
import { HEARING_BANDS } from './bands'

type Props = {
  columns: SoundMapColumn[] | null
  playhead: number | null
  origin: number
  duration: number
}

/** Static time × band × energy picture. One draw when the data changes, not a private animation loop. */
export function SoundMap({ columns, playhead, origin, duration }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const width = canvas.clientWidth || 280
    const height = canvas.clientHeight || 168
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const styles = getComputedStyle(canvas)
    const ink = styles.color || '#fff'
    const panel = styles.backgroundColor || '#111'
    ctx.fillStyle = panel
    ctx.fillRect(0, 0, width, height)
    const gutter = 72
    const rows = HEARING_BANDS.length
    const rowH = (height - 8) / rows
    ctx.font = '10px sans-serif'
    ctx.textBaseline = 'middle'
    HEARING_BANDS.forEach((band, index) => {
      const y = 4 + (rows - 1 - index) * rowH
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.8
      ctx.fillText(band.label, 4, y + rowH / 2)
      ctx.globalAlpha = 0.18
      ctx.fillRect(gutter, y, width - gutter - 4, rowH - 1)
      ctx.globalAlpha = 1
    })
    if (!columns || columns.length === 0) {
      ctx.globalAlpha = 0.7
      ctx.fillStyle = ink
      ctx.fillText('No spectral columns yet', gutter + 8, height / 2)
      return
    }
    let max = 1e-8
    for (const column of columns) for (const power of column.power) if (power > max) max = power
    const plotW = width - gutter - 4
    columns.forEach((column, col) => {
      const x = gutter + (col / columns.length) * plotW
      const cellW = Math.max(1, plotW / columns.length - 0.5)
      column.power.forEach((power, index) => {
        const y = 4 + (rows - 1 - index) * rowH
        const norm = Math.max(0, Math.min(1, Math.log10(1 + power) / Math.log10(1 + max)))
        ctx.globalAlpha = 0.15 + norm * 0.85
        ctx.fillStyle = ink
        ctx.fillRect(x, y + 1, cellW, rowH - 3)
        if (norm > 0.72) {
          ctx.globalAlpha = 1
          const mark = HEARING_BANDS[index]?.hatch
          ctx.fillText(mark === 'dots' ? '·' : mark === 'sparse' ? '°' : '▮', x + 1, y + rowH / 2)
        }
      })
    })
    ctx.globalAlpha = 1
    if (playhead !== null && duration > 0) {
      const t = (playhead - origin) / duration
      if (t >= 0 && t <= 1) {
        const x = gutter + t * plotW
        ctx.strokeStyle = ink
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(x, 2)
        ctx.lineTo(x, height - 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }, [columns, playhead, origin, duration])

  return (
    <canvas
      ref={ref}
      className="hearing-sound-map"
      role="img"
      aria-label="Sound map. Rows are labeled frequency regions. Brightness shows energy over time."
      style={{ width: '100%', height: 168, color: 'var(--text-primary)', background: 'var(--bg-app)' }}
    />
  )
}
