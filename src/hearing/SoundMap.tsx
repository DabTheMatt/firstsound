import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../i18n'
import { hearingUi } from '../i18n/hearingUi'
import type { SoundMapColumn } from './analyze'
import { HEARING_BANDS, type HearingBandId } from './bands'
import type { TransientMark } from './events'
import { soundMapLevel } from './levels'
import type { ReverbSpacePicture } from './reverbDepth'
import { smearSoundMap } from './soundMapHear'
import styles from './HearingAccessLayer.module.css'

const DRY: ReverbSpacePicture = { engaged: false, size: 0, distance: 0, wet: 0, decay: 0 }

type Props = {
  columns: SoundMapColumn[] | null
  playhead: number | null
  origin: number
  duration: number
  transients?: readonly TransientMark[]
  onTransient?: (time: number) => void
  /** Wet smears later columns and dulls highs. Wet 0 leaves the columns as measured. */
  space?: ReverbSpacePicture
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

/**
 * Time × band × energy. Band cells sit edge to edge.
 * Attacks are vertical lines at their measured time, not a square grid.
 * One draw when the data changes, not a private animation loop.
 */
export function SoundMap({ columns, playhead, origin, duration, transients = [], onTransient, space = DRY }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { locale } = useI18n()
  const copy = useMemo(() => hearingUi(locale), [locale])
  const engaged = space.engaged
  const wet = space.wet
  const decay = space.decay
  const distance = space.distance

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
    const gutter = 84
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
      ctx.fillText(copy.band(band.id, band.label), 4, y + rowH / 2)
      ctx.globalAlpha = 0.05
      ctx.fillStyle = tone
      ctx.fillRect(gutter, y, width - gutter - 4, rowH - 1)
      ctx.globalAlpha = 1
    })
    if (!columns || columns.length === 0) {
      ctx.globalAlpha = 0.7
      ctx.fillStyle = ink
      ctx.fillText(copy.soundMapEmpty, gutter + 8, height / 2)
      return
    }
    const plotW = width - gutter - 4
    const painted = smearSoundMap(columns, { engaged, size: 0, distance, wet, decay }) ?? columns
    const cellW = plotW / painted.length
    painted.forEach((column, col) => {
      const x = gutter + col * cellW
      column.power.forEach((power, index) => {
        const band = HEARING_BANDS[index]
        const y = lane + (rows - 1 - index) * rowH
        const tone = band ? computed.getPropertyValue(BAND_VAR[band.id]).trim() || ink : ink
        const norm = soundMapLevel(power)
        if (norm <= 0) return
        ctx.globalAlpha = 0.15 + norm * 0.85
        ctx.fillStyle = tone
        ctx.fillRect(x, y + 1, cellW + 0.5, Math.max(1, rowH - 2))
      })
    })
    ctx.globalAlpha = 1
    const span = Math.max(0.0001, duration)
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.7
    ctx.fillText(copy.soundMapTime, 4, lane / 2)
    ctx.globalAlpha = 1
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.25
    transients.forEach((mark) => {
      const t = (mark.time - origin) / span
      if (t < 0 || t > 1) return
      const x = gutter + t * plotW
      ctx.beginPath()
      ctx.moveTo(x, lane)
      ctx.lineTo(x, height - 2)
      ctx.stroke()
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
  }, [columns, playhead, origin, duration, transients, engaged, wet, decay, distance, copy])

  const pickTransient = (clientX: number) => {
    const canvas = ref.current
    if (!canvas || !onTransient || transients.length === 0 || duration <= 0) return
    const rect = canvas.getBoundingClientRect()
    const gutter = 84
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
      aria-label={copy.soundMapAria}
      onClick={(event) => pickTransient(event.clientX)}
      style={{ width: '100%', height: 184, color: 'var(--text-primary)', background: 'transparent', cursor: onTransient && transients.length ? 'pointer' : undefined }}
    />
  )
}
