import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { computePeaks } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import styles from './Waveform.module.css'

type Props = {
  duration: number
  start: number
  end: number
  loaded: boolean
  onLoadDemo: () => void
}

type DragMode = 'start' | 'end' | 'move' | null

function xToTime(x: number, width: number, duration: number): number {
  if (width <= 0 || duration <= 0) return 0
  return Math.min(duration, Math.max(0, (x / width) * duration))
}

export function Waveform({ duration, start, end, loaded, onLoadDemo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const regionRef = useRef({ start, end, duration })

  useEffect(() => {
    regionRef.current = { start, end, duration }
  }, [start, end, duration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const mono = engine.getMono()
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
      if (!mono || mono.length === 0) return
      const peaks = computePeaks(mono, width)
      ctx.fillStyle = '#9aa0a3'
      const mid = height / 2
      for (let x = 0; x < peaks.length; x++) {
        const h = (peaks[x] ?? 0) * (height * 0.86)
        ctx.fillRect(x, mid - h / 2, 1, Math.max(1, h))
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [loaded, duration])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = playheadRef.current
      const { duration: d } = regionRef.current
      if (el && d > 0) {
        el.style.left = `${(engine.getPlayheadSeconds() / d) * 100}%`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0) return
    const overlay = overlayRef.current
    if (!overlay) return
    event.preventDefault()
    overlay.setPointerCapture(event.pointerId)
    const rect = overlay.getBoundingClientRect()
    const t = xToTime(event.clientX - rect.left, rect.width, duration)
    const startX = (start / duration) * rect.width
    const endX = (end / duration) * rect.width
    const x = event.clientX - rect.left
    const handlePx = 18
    let mode: DragMode = 'move'
    if (Math.abs(x - startX) < handlePx) mode = 'start'
    else if (Math.abs(x - endX) < handlePx) mode = 'end'
    else if (x < startX || x > endX) {
      engine.setParam('start', t)
      mode = 'start'
    }
    const origin = { t, start, end }

    const move = (moveEvent: PointerEvent) => {
      const next = xToTime(moveEvent.clientX - rect.left, rect.width, duration)
      if (mode === 'start') engine.setParam('start', next)
      else if (mode === 'end') engine.setParam('end', next)
      else {
        const span = origin.end - origin.start
        const delta = next - origin.t
        const maxStart = Math.max(0, duration - span)
        const s = Math.min(maxStart, Math.max(0, origin.start + delta))
        engine.setRegion(s, s + span)
      }
    }
    const up = (upEvent: PointerEvent) => {
      overlay.releasePointerCapture(upEvent.pointerId)
      overlay.removeEventListener('pointermove', move)
      overlay.removeEventListener('pointerup', up)
      overlay.removeEventListener('pointercancel', up)
    }
    overlay.addEventListener('pointermove', move)
    overlay.addEventListener('pointerup', up)
    overlay.addEventListener('pointercancel', up)
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => formatTimecode(duration * p))

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div
        ref={overlayRef}
        className={styles.overlay}
        onPointerDown={loaded ? onPointerDown : undefined}
      >
        {loaded && duration > 0 ? (
          <>
            <div
              className={styles.region}
              style={{
                left: `${(start / duration) * 100}%`,
                width: `${((end - start) / duration) * 100}%`,
              }}
            />
            <button
              type="button"
              className={styles.handle}
              style={{ left: `${(start / duration) * 100}%` }}
              aria-label="Region start"
            />
            <button
              type="button"
              className={styles.handle}
              style={{ left: `${(end / duration) * 100}%` }}
              aria-label="Region end"
            />
            <div ref={playheadRef} className={styles.playhead} />
          </>
        ) : (
          <div className={styles.empty}>
            <span>Load a sample to begin</span>
            <button type="button" className={styles.demo} onClick={onLoadDemo}>
              Load demo tone
            </button>
          </div>
        )}
      </div>
      <div className={styles.ruler}>
        {ticks.map((label, index) => (
          <span key={index}>{loaded ? label : '—'}</span>
        ))}
      </div>
    </div>
  )
}
