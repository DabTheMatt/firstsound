import { useEffect, useRef } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import { engine, useEngine } from '../../hooks/useEngine'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './TrackLanes.module.css'

export function TrackLanes() {
  const snap = useEngine()
  const tracks = snap.tracks
  const selectedId = snap.selectedTrackId
  const duration = snap.duration

  return (
    <div className={styles.lanes} aria-label="Tracks">
      <header className={styles.head}>
        <h2 className={styles.title}>Tracks</h2>
        <p className={styles.lead}>Click a lane to select it. The mixer strip follows.</p>
      </header>
      <div className={styles.list}>
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            className={`${styles.lane} ${track.id === selectedId ? styles.laneOn : ''} ${track.muted ? styles.laneMuted : ''}`}
            aria-pressed={track.id === selectedId}
            onClick={() => engine.selectTrack(track.id)}
          >
            <span className={styles.meta}>
              <span className={styles.name}>{track.name}</span>
              <span className={styles.flags}>
                {track.muted ? 'M' : ''}
                {track.solo ? 'S' : ''}
              </span>
            </span>
            <LaneWave
              start={track.start}
              end={track.end}
              duration={duration}
              selected={track.id === selectedId}
              contentRev={snap.bufferRev}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function LaneWave({
  start,
  end,
  duration,
  selected,
  contentRev,
}: {
  start: number
  end: number
  duration: number
  selected: boolean
  contentRev: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const buffer = engine.getBuffer()
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
      ctx.clearRect(0, 0, width, height)
      const colors = readThemeColors()
      if (!buffer || duration <= 0) return
      const data = buffer.getChannelData(0)
      const { min, max } = computeMinMax(data, 0, data.length, width)
      const mid = height / 2
      const half = height * 0.42
      const selA = Math.min(start, end)
      const selB = Math.max(start, end)
      let lastSelected: boolean | null = null
      for (let x = 0; x < width; x++) {
        const t = (x / width) * duration
        const inRegion = t >= selA && t <= selB
        if (inRegion !== lastSelected) {
          ctx.fillStyle = inRegion
            ? colors.waveformSelected
            : selected
              ? colors.waveform
              : colors.waveform
          ctx.globalAlpha = inRegion ? 1 : 0.28
          lastSelected = inRegion
        }
        const hi = Math.max(-1, Math.min(1, max[x] ?? 0))
        const lo = Math.max(-1, Math.min(1, min[x] ?? 0))
        ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half || 1))
      }
      ctx.globalAlpha = 1
    }
    draw()
    const unsub = subscribeThemeChange(draw)
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => {
      unsub()
      ro.disconnect()
    }
  }, [start, end, duration, selected, contentRev])

  return <canvas ref={canvasRef} className={styles.wave} aria-hidden />
}
