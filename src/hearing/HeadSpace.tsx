import { useEffect, useRef } from 'react'
import styles from './HearingAccessLayer.module.css'
import { distanceWord, headLayout, roomWord, type ReverbSpacePicture } from './reverbDepth'
import { useElementBox } from './useElementBox'

const DRY: ReverbSpacePicture = { engaged: false, size: 0, distance: 0, wet: 0, decay: 0 }

type Props = {
  balance: number
  width: number
  correlation: number
  /** Room size, source distance, wet mix, and tail length. */
  space?: ReverbSpacePicture
  /** Stretch into the leftover focus area. */
  fill?: boolean
}

/**
 * Listener's head, seen from above. Front is the top of the picture.
 * A larger room draws a smaller head. The source sits in front of the head
 * and moves to the front wall with reverb distance. Wet draws the reflections.
 */
export function HeadSpace({ balance, width, correlation, space = DRY, fill = false }: Props) {
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
    const layout = headLayout(widthPx, heightPx, balance, space.size, space.distance)
    const { headRadius: head, headX: cx, headY: cy, sourceX: x, sourceY: y } = layout
    if (space.engaged) {
      ctx.globalAlpha = 0.35 + space.wet * 0.5
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.strokeRect(layout.roomX, layout.roomY, layout.roomW, layout.roomH)
      const echoes = space.wet > 0.02 ? 2 + Math.round(space.decay * 6) : 0
      for (let i = 0; i < echoes; i++) {
        const t = (i + 1) / (echoes + 1)
        const ey = layout.roomY + 10 + t * (layout.roomH - 20)
        ctx.globalAlpha = space.wet * (0.55 - t * 0.4)
        ctx.fillStyle = muted
        ctx.fillRect(layout.roomX + 5, ey, 3, 3)
        ctx.fillRect(layout.roomX + layout.roomW - 8, ey, 3, 3)
      }
    }
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
    ctx.fillText('front', cx, layout.roomY + 11)
    ctx.fillText('L', cx - head * 1.35, cy)
    ctx.fillText('R', cx + head * 1.35, cy)
    const spread = Math.max(6, Math.min(layout.roomW * 0.7, 8 + width * head * 2.2))
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
      ctx.arc(x, y, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = muted
    ctx.beginPath()
    ctx.moveTo(cx, cy - head)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }, [balance, width, correlation, space.engaged, space.size, space.distance, space.wet, space.decay, box.width, box.height])

  const side = Math.abs(balance) < 0.03 ? 'center' : balance < 0 ? 'left' : 'right'
  const room = space.engaged ? roomWord(space.size) : 'none'
  const distance = space.engaged ? distanceWord(space.distance) : 'close'
  return (
    <div className={fill ? styles.spaceFillSlot : styles.spaceInline}>
      <canvas
        ref={ref}
        role="img"
        aria-label={`Head view. Room is ${room}. Source is ${distance} and ${side}, in front of the head. Front is up. A larger room draws a smaller head. Distance follows reverb distance. Wet draws the reflections.`}
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
