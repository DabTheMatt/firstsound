import { useEffect, useRef } from 'react'
import type { SpaceBucket } from './analyze'
import { applyPanToBalance } from './effectViz'
import styles from './HearingAccessLayer.module.css'
import type { ReverbSpacePicture } from './reverbDepth'
import { useElementBox } from './useElementBox'

const DRY: ReverbSpacePicture = { engaged: false, size: 0, distance: 0, wet: 0, decay: 0 }

type Props = {
  buckets: SpaceBucket[]
  playhead: number | null
  origin: number
  duration: number
  panPct?: number
  leftDb?: number
  rightDb?: number
  /** Room size and source distance. Wet does not move the marks. */
  space?: ReverbSpacePicture
}

/**
 * Time runs top to bottom. Mark length is stereo width.
 * A hollow mark is low correlation. Pan and channel gain move each mark.
 * The right edge is the room: its length is room size, and the dot is source distance.
 */
export function SpaceField({
  buckets,
  playhead,
  origin,
  duration,
  panPct = 0,
  leftDb = 0,
  rightDb = 0,
  space = DRY,
  fill = false,
}: Props & { fill?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const box = useElementBox(ref)

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
    const accent = styles.getPropertyValue('--accent-primary').trim() || ink
    const panel = styles.backgroundColor || '#111'
    ctx.fillStyle = panel
    ctx.fillRect(0, 0, width, height)
    const padX = 16
    const padTop = 8
    const padBottom = 18
    const gaugeGutter = 36
    const plotW = Math.max(1, width - padX - gaugeGutter)
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
    ctx.fillText('R', padX + plotW, height - 8)
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
      if (space.engaged && space.wet > 0.02) {
        const tail = (6 + space.decay * 36) * space.wet
        ctx.globalAlpha = 0.28 * space.wet
        ctx.strokeStyle = accent
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, Math.min(padTop + plotH, y + tail))
        ctx.stroke()
      }
      ctx.globalAlpha = low ? 1 : 0.85
      ctx.strokeStyle = low ? ink : accent
      ctx.fillStyle = accent
      ctx.lineWidth = 1.2
      if (low) {
        ctx.strokeRect(x - spread / 2, y - 3, spread, 6)
      } else {
        ctx.beginPath()
        ctx.moveTo(x - spread / 2, y)
        ctx.lineTo(x + spread / 2, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    const size01 = space.engaged ? Math.max(0, Math.min(1, space.size)) : 0
    const distance01 = space.engaged ? Math.max(0, Math.min(1, space.distance)) : 0
    const roomSpan = plotH * (0.34 + size01 * 0.66)
    const roomTop = padTop + (plotH - roomSpan) / 2
    const roomBot = roomTop + roomSpan
    const gaugeX = width - 10
    const gaugeY = roomBot - distance01 * roomSpan
    ctx.globalAlpha = space.engaged ? 0.28 + space.wet * 0.45 : 0.2
    ctx.strokeStyle = ink
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gaugeX, roomTop)
    ctx.lineTo(gaugeX, roomBot)
    ctx.stroke()
    ctx.globalAlpha = 0.9
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(gaugeX, gaugeY, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = ink
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('far', gaugeX - 6, roomTop)
    ctx.textBaseline = 'bottom'
    ctx.fillText('close', gaugeX - 6, roomBot)
    if (playhead !== null && duration > 0) {
      const y = padTop + ((playhead - origin) / span) * plotH
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = ink
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(padX, y)
      ctx.lineTo(padX + plotW, y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }, [buckets, playhead, origin, duration, panPct, leftDb, rightDb, space.engaged, space.size, space.distance, space.wet, space.decay, box.width, box.height])

  return (
    <div className={fill ? styles.spaceFillSlot : styles.spaceInline}>
      <canvas
        ref={ref}
        className="hearing-space-field"
        role="img"
        aria-label="Stereo field over time. Wider marks are wider images. Hollow marks are low correlation. A short tail under a mark is reverb wet. The right edge is the room: a longer line is a larger room, and the dot is how far the source sits in front of the listener."
        style={
          fill
            ? undefined
            : {
                width: '100%',
                height: 180,
                display: 'block',
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
