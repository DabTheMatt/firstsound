import { useEffect, useRef } from 'react'
import { computeMinMax } from '../../audio/engine/peaks'
import { engine, useEngine } from '../../hooks/useEngine'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './TrackLanes.module.css'

export function TrackLanes({
  variant = 'mixer',
  onOpenWave,
}: {
  variant?: 'mixer' | 'editor'
  onOpenWave?: (trackId: string) => void
}) {
  const snap = useEngine()
  const tracks = snap.tracks
  const selectedId = snap.selectedTrackId
  const editor = variant === 'editor'

  return (
    <div className={`${styles.lanes} ${editor ? styles.lanesEditor : ''}`} aria-label="Tracks">
      <header className={styles.head}>
        <h2 className={styles.title}>{editor ? 'Multi-track' : 'Tracks'}</h2>
        <p className={styles.lead}>
          {editor
            ? 'All lanes play together. Select a lane to edit it. WAVE opens the editor.'
            : 'Select a lane to edit its sample. Playback follows mute and solo, not the selection.'}
        </p>
      </header>
      <div className={styles.list}>
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`${styles.lane} ${editor ? styles.laneTall : ''} ${track.id === selectedId ? styles.laneOn : ''} ${track.muted ? styles.laneMuted : ''}`}
          >
            <button
              type="button"
              className={styles.laneHit}
              aria-pressed={track.id === selectedId}
              onClick={() => engine.selectTrack(track.id)}
            >
              <span className={styles.meta}>
                <span className={styles.name}>{track.name}</span>
                <span className={styles.file}>{track.fileName ?? 'No sample'}</span>
              </span>
              <LaneWave
                trackId={track.id}
                start={track.start}
                end={track.end}
                selected={track.id === selectedId}
                contentRev={snap.bufferRev}
              />
            </button>
            <div className={styles.laneEnd}>
              <button
                type="button"
                className={styles.waveBtn}
                aria-label={`Open waveform for ${track.name}`}
                title="Waveform"
                onClick={() => {
                  engine.selectTrack(track.id)
                  onOpenWave?.(track.id)
                }}
              >
                <svg viewBox="0 0 18 10" width="18" height="10" aria-hidden="true">
                  <path
                    d="M1 5c1.4-4 2.2 4 3.6 0s2.2 4 3.6 0 2.2 4 3.6 0 2.2 4 3.6 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>WAVE</span>
              </button>
              <button
                type="button"
                className={track.muted ? styles.toggleOn : styles.toggle}
                aria-pressed={track.muted}
                aria-label={`Mute ${track.name}`}
                onClick={() => engine.setTrack(track.id, { muted: !track.muted })}
              >
                M
              </button>
              <button
                type="button"
                className={track.solo ? styles.toggleSolo : styles.toggle}
                aria-pressed={track.solo}
                aria-label={`Solo ${track.name}`}
                onClick={() => engine.setTrack(track.id, { solo: !track.solo })}
              >
                S
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LaneWave({
  trackId,
  start,
  end,
  selected,
  contentRev,
}: {
  trackId: string
  start: number
  end: number
  selected: boolean
  contentRev: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const buffer = engine.getTrackBuffer(trackId)
      const duration = buffer?.duration ?? 0
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
  }, [trackId, start, end, selected, contentRev])

  return <canvas ref={canvasRef} className={styles.wave} aria-hidden />
}
