import { useEffect, useRef } from 'react'

type Props = {
  balance: number
  width: number
  correlation: number
}

/**
 * Listener's head, seen from above. Front is the top of the picture.
 * The marker is the heard image: left on the left, right on the right.
 * Spread follows stereo width. A hollow marker is low correlation.
 */
export function HeadSpace({ balance, width, correlation }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const size = canvas.clientWidth || 160
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(size * ratio)
    canvas.height = Math.floor(size * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const styles = getComputedStyle(canvas)
    const ink = styles.color || '#fff'
    const accent = styles.getPropertyValue('--accent-primary').trim() || ink
    const muted = styles.getPropertyValue('--text-muted').trim() || ink
    const warning = styles.getPropertyValue('--warning').trim() || accent
    const panel = styles.backgroundColor || '#111'
    ctx.fillStyle = panel
    ctx.fillRect(0, 0, size, size)
    const cx = size / 2
    const cy = size * 0.56
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
    ctx.fillText('front', cx, 12)
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
  }, [balance, width, correlation])

  const side = Math.abs(balance) < 0.03 ? 'center' : balance < 0 ? 'left' : 'right'
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Head view. The heard image is toward the ${side}. Front is the top. Left ear is on the left.`}
      style={{
        width: '100%',
        maxWidth: 180,
        height: 160,
        display: 'block',
        margin: '0 auto',
        background: 'var(--bg-control)',
        color: 'var(--text-primary)',
        borderRadius: 8,
      }}
    />
  )
}
