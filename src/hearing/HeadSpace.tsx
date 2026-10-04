import { useEffect, useRef } from 'react'
import styles from './HearingAccessLayer.module.css'
import { useElementBox } from './useElementBox'

type Props = {
  balance: number
  width: number
  correlation: number
  /** Stretch into the leftover focus area. */
  fill?: boolean
}

/**
 * Listener's head, seen from above. Front is the top of the picture.
 * The marker is the heard image at the playhead.
 * Spread follows stereo width. A hollow marker is low correlation.
 */
export function HeadSpace({ balance, width, correlation, fill = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const box = useElementBox(ref)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const widthPx = canvas.clientWidth || 160
    const heightPx = canvas.clientHeight || 160
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(widthPx * ratio)
    canvas.height = Math.floor(heightPx * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const stylesCss = getComputedStyle(canvas)
    const ink = stylesCss.color || '#fff'
    const accent = stylesCss.getPropertyValue('--accent-primary').trim() || ink
    const muted = stylesCss.getPropertyValue('--text-muted').trim() || ink
    const warning = stylesCss.getPropertyValue('--warning').trim() || accent
    const panel = stylesCss.backgroundColor || '#111'
    ctx.fillStyle = panel
    ctx.fillRect(0, 0, widthPx, heightPx)
    const size = Math.max(48, Math.min(widthPx, heightPx))
    const ox = (widthPx - size) / 2
    const oy = (heightPx - size) / 2
    const cx = ox + size / 2
    const cy = oy + size * 0.56
    const head = size * 0.22
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.ellipse(cx, cy, head * 0.82, head, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx - head * 0.95, cy, head * 0.18, head * 0.32, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx + head * 0.95, cy, head * 0.18, head * 0.32, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.7
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('front', cx, oy + 12)
    ctx.fillText('L', cx - head * 1.35, cy)
    ctx.fillText('R', cx + head * 1.35, cy)
    const x = cx + Math.max(-1, Math.min(1, balance)) * head * 1.15
    const y = cy - head * 1.35
    const spread = Math.max(6, Math.min(size * 0.7, 8 + width * head * 2.2))
    const low = correlation < 0.2
    ctx.globalAlpha = 1
    ctx.strokeStyle = low ? warning : accent
    ctx.fillStyle = accent
    ctx.lineWidth = 1.5
    if (low) {
      ctx.strokeRect(x - spread / 2, y - 5, spread, 10)
    } else {
      ctx.beginPath()
      ctx.moveTo(x - spread / 2, y)
      ctx.lineTo(x + spread / 2, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = muted
    ctx.beginPath()
    ctx.moveTo(cx, cy - head * 0.2)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }, [balance, width, correlation, box.width, box.height])

  const side = Math.abs(balance) < 0.03 ? 'center' : balance < 0 ? 'left' : 'right'
  return (
    <div className={fill ? styles.spaceFillSlot : styles.spaceInline}>
      <canvas
        ref={ref}
        role="img"
        aria-label={`Head view. Heard image is ${side}. Front is up.`}
        style={
          fill
            ? undefined
            : {
                width: '100%',
                maxWidth: 180,
                height: 160,
                display: 'block',
                margin: '0 auto',
                background: 'var(--bg-control)',
                color: 'var(--text-primary)',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
              }
        }
      />
    </div>
  )
}
