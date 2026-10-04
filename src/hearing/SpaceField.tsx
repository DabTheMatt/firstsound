import { useEffect, useRef } from 'react'
import type { SpaceBucket } from './analyze'
import { applyPanToBalance } from './effectViz'

type Props = {
  buckets: SpaceBucket[]
  playhead: number | null
  origin: number
  duration: number
  panPct?: number
  leftDb?: number
  rightDb?: number
}

/**
 * Time runs top to bottom. Left is the left edge, right is the right edge.
 * Mark length is stereo width. A hollow mark is low correlation.
 * Pan and channel gain move each mark with the output stage.
 */
export function SpaceField({ buckets, playhead, origin, duration, panPct = 0, leftDb = 0, rightDb = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const width = canvas.clientWidth || 280
    const height = canvas.clientHeight || 180
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
    const padX = 16
    const padTop = 8
    const padBottom = 18
    const plotW = Math.max(1, width - padX * 2)
    const plotH = Math.max(1, height - padTop - padBottom)
    ctx.font = '10px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.75
    ctx.textAlign = 'left'
    ctx.fillText('L', 4, height - 8)
    ctx.textAlign = 'center'
    ctx.fillText('C', width / 2, height - 8)
    ctx.textAlign = 'right'
    ctx.fillText('R', width - 4, height - 8)
    ctx.globalAlpha = 0.25
    ctx.fillRect(width / 2, padTop, 1, plotH)
    const span = Math.max(0.0001, duration)
    const placed = buckets.map((bucket) => ({
      ...bucket,
      balance: applyPanToBalance(bucket.balance, panPct, leftDb, rightDb),
    }))
    placed.forEach((bucket) => {
      const y = padTop + ((bucket.time - origin) / span) * plotH
      const x = padX + ((bucket.balance + 1) / 2) * plotW
      const spread = Math.max(4, bucket.width * plotW * 0.45)
      const low = bucket.correlation < 0.2
      ctx.globalAlpha = low ? 1 : 0.85
      ctx.strokeStyle = ink
      ctx.fillStyle = ink
      ctx.lineWidth = 1.25
      if (low) {
        ctx.strokeRect(x - spread / 2, y - 3, spread, 6)
      } else {
        ctx.beginPath()
        ctx.moveTo(x - spread / 2, y)
        ctx.lineTo(x + spread / 2, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    if (playhead !== null && duration > 0) {
      const y = padTop + ((playhead - origin) / span) * plotH
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = ink
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(padX, y)
      ctx.lineTo(width - padX, y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }, [buckets, playhead, origin, duration, panPct, leftDb, rightDb])

  return (
    <canvas
      ref={ref}
      className="hearing-space-field"
      role="img"
      aria-label="Stereo field. Left is the left side, right is the right side. Time runs from top to bottom. Longer marks are wider. Hollow marks have low correlation. Pan and channel gain move the marks."
      style={{ width: '100%', height: 180, display: 'block', background: 'var(--bg-control)', color: 'var(--text-primary)', borderRadius: 8 }}
    />
  )
}
