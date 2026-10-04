import { useEffect, useRef } from 'react'
import type { SpaceBucket } from './analyze'

type Props = {
  buckets: SpaceBucket[]
  playhead: number | null
  origin: number
  duration: number
}

/**
 * Time runs left to right. Left is the top edge, right is the bottom edge.
 * Mark length is stereo width. A hollow mark is low correlation.
 */
export function SpaceField({ buckets, playhead, origin, duration }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const width = canvas.clientWidth || 280
    const height = canvas.clientHeight || 140
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
    const gutter = 28
    const plotW = Math.max(1, width - gutter - 8)
    const plotH = height - 16
    ctx.font = '10px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.75
    ctx.fillText('L', 6, 10)
    ctx.fillText('C', 6, height / 2)
    ctx.fillText('R', 6, height - 10)
    ctx.globalAlpha = 0.25
    ctx.fillRect(gutter, height / 2, plotW, 1)
    const span = Math.max(0.0001, duration)
    buckets.forEach((bucket) => {
      const x = gutter + ((bucket.time - origin) / span) * plotW
      const y = ((bucket.balance + 1) / 2) * plotH + 8
      const spread = Math.max(3, bucket.width * plotH * 0.45)
      const low = bucket.correlation < 0.2
      ctx.globalAlpha = low ? 1 : 0.85
      ctx.strokeStyle = ink
      ctx.fillStyle = ink
      ctx.lineWidth = 1.25
      if (low) {
        ctx.strokeRect(x - 3, y - spread / 2, 6, spread)
      } else {
        ctx.beginPath()
        ctx.moveTo(x, y - spread / 2)
        ctx.lineTo(x, y + spread / 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    if (playhead !== null && duration > 0) {
      const x = gutter + ((playhead - origin) / span) * plotW
      ctx.globalAlpha = 0.9
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(x, 4)
      ctx.lineTo(x, height - 4)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }, [buckets, playhead, origin, duration])

  return (
    <canvas
      ref={ref}
      className="hearing-space-field"
      role="img"
      aria-label="Stereo field over time. Left is the top, right is the bottom. Longer marks are wider. Hollow marks have low correlation."
      style={{ width: '100%', height: 140, display: 'block', background: 'var(--bg-control)', color: 'var(--text-primary)', borderRadius: 8 }}
    />
  )
}
