import { useEffect, useRef } from 'react'
import type { SoundMapColumn } from './analyze'
import { HEARING_BANDS, type HearingBandId } from './bands'
import type { TransientMark } from './events'
import styles from './HearingAccessLayer.module.css'

type Props = {
  columns: SoundMapColumn[] | null
  playhead: number | null
  origin: number
  duration: number
  transients?: readonly TransientMark[]
  onTransient?: (time: number) => void
}

const BAND_VAR: Record<HearingBandId, string> = {
  sub: '--hearing-sub',
  bass: '--hearing-bass',
  lowMid: '--hearing-lowMid',
  mid: '--hearing-mid',
  highMid: '--hearing-highMid',
  high: '--hearing-high',
  air: '--hearing-air',
}

/** Static time × band × energy picture. One draw when the data changes, not a private animation loop. */
export function SoundMap({ columns, playhead, origin, duration, transients = [], onTransient }: Props) {
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
    const computed = getComputedStyle(canvas)
    const ink = computed.color || '#fff'
    const panel = computed.backgroundColor || '#111'
    const accent = computed.getPropertyValue('--accent-primary').trim() || ink
    ctx.fillStyle = panel
    ctx.fillRect(0, 0, width, height)
    const gutter = 72
    const lane = 16
    const rows = HEARING_BANDS.length
    const rowH = (height - lane - 6) / rows
    ctx.font = '10px sans-serif'
    ctx.textBaseline = 'middle'
    HEARING_BANDS.forEach((band, index) => {
      const y = lane + (rows - 1 - index) * rowH
      const tone = computed.getPropertyValue(BAND_VAR[band.id]).trim() || ink
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.9
      ctx.fillText(band.label, 4, y + rowH / 2)
      ctx.globalAlpha = 0.16
      ctx.fillStyle = tone
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
        const band = HEARING_BANDS[index]
        const y = lane + (rows - 1 - index) * rowH
        const tone = band ? computed.getPropertyValue(BAND_VAR[band.id]).trim() || ink : ink
        const norm = Math.max(0, Math.min(1, Math.log10(1 + power) / Math.log10(1 + max)))
        ctx.globalAlpha = 0.12 + norm * 0.88
        ctx.fillStyle = tone
        ctx.fillRect(x, y + 1, cellW, rowH - 3)
        if (norm > 0.72 && band) {
          ctx.globalAlpha = 1
          ctx.fillStyle = ink
          const mark = band.hatch
          ctx.fillText(mark === 'dots' ? '·' : mark === 'sparse' ? '°' : '▮', x + 1, y + rowH / 2)
        }
      })
    })
    ctx.globalAlpha = 1
    const span = Math.max(0.0001, duration)
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.7
    ctx.fillText('T', 4, lane / 2)
    ctx.globalAlpha = 1
    transients.forEach((mark) => {
      const t = (mark.time - origin) / span
      if (t < 0 || t > 1) return
      const x = gutter + t * plotW
      ctx.strokeStyle = ink
      ctx.fillStyle = accent
      ctx.lineWidth = 1.25
      ctx.fillRect(x - 5, 3, 10, 10)
      ctx.strokeRect(x - 5, 3, 10, 10)
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(x, lane)
      ctx.lineTo(x, height - 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    })
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
  }, [columns, playhead, origin, duration, transients])

  const pickTransient = (clientX: number) => {
    const canvas = ref.current
    if (!canvas || !onTransient || transients.length === 0 || duration <= 0) return
    const rect = canvas.getBoundingClientRect()
    const gutter = 72
    const plotW = Math.max(1, rect.width - gutter - 4)
    const x = clientX - rect.left
    let best: TransientMark | null = null
    let bestDx = 22
    for (const mark of transients) {
      const markX = gutter + ((mark.time - origin) / duration) * plotW
      const dx = Math.abs(markX - x)
      if (dx < bestDx) {
        best = mark
        bestDx = dx
      }
    }
    if (best) onTransient(best.time)
  }

  return (
    <canvas
      ref={ref}
      className={`${styles.palette} hearing-sound-map`}
      role="img"
      aria-label="Sound map. Rows are labeled frequency regions. Color follows the theme and is paired with the label. Squares along the top are transients. Choose a square to frame it on the waveform."
      onClick={(event) => pickTransient(event.clientX)}
      style={{ width: '100%', height: 184, color: 'var(--text-primary)', background: 'var(--bg-app)', cursor: onTransient && transients.length ? 'pointer' : undefined }}
    />
  )
}
