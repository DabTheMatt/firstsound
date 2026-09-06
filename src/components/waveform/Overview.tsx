import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { clampView, resizeViewEdge, timeToFrac, type View } from './viewport'
import { readThemeColors, subscribeThemeChange } from '../../theme'
import styles from './Overview.module.css'

type Props = {
  duration: number
  start: number
  end: number
  view: View
  onScrub: (view: View) => void
  contentRev?: number
  silence?: { startSec: number; endSec: number } | null
}

/**
 * Minimap of the whole file (independent of zoom). Shows the current viewport,
 * the selection and the playhead; dragging pans the main viewport. Edge handles
 * shrink/grow the frame to zoom the waveform view.
 */
export function Overview({ duration, start, end, view, onScrub, contentRev = 0, silence }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>({ start: 0, end: 0 })
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const mono = engine.getMono() ?? engine.getSourceMono()
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
      const mips = engine.getBuffer() === engine.getSourceBuffer() ? engine.getSourceMips()[0] : undefined
      const { min, max } = mips?.length
        ? computeMinMaxCached(mono, mips, 0, mono.length, width)
        : computeMinMax(mono, 0, mono.length, width)
      const mid = height / 2
      const half = height * 0.44
      ctx.fillStyle = readThemeColors().waveformSecondary
      for (let x = 0; x < width; x++) {
        const top = mid - (max[x] ?? 0) * half
        const bottom = mid - (min[x] ?? 0) * half
        ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [duration, contentRev])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        frame = requestAnimationFrame(tick)
        return
      }
      const el = playheadRef.current
      if (el && duration > 0) {
        el.style.left = `${(engine.getPlayheadSeconds() / duration) * 100}%`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  const scrubTo = (clientX: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const span = view.end - view.start
    const center = frac * duration
    onScrub(clampView({ start: center - span / 2, end: center + span / 2 }, duration, span))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const up = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      target.removeEventListener('lostpointercapture', up)
    }
    const move = (e: PointerEvent) => {
      if (e.buttons === 0) {
        up(e)
        return
      }
      scrubTo(e.clientX, target)
    }
    scrubTo(event.clientX, target)
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    target.addEventListener('lostpointercapture', up)
  }

  const onResizeEdge = (edge: 'start' | 'end', event: ReactPointerEvent<HTMLButtonElement>) => {
    if (duration <= 0) return
    event.preventDefault()
    event.stopPropagation()
    const host = event.currentTarget.closest(`.${styles.overview}`)
    if (!(host instanceof HTMLElement)) return
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    const apply = (clientX: number) => {
      const rect = host.getBoundingClientRect()
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      onScrub(resizeViewEdge(viewRef.current, edge, frac * duration, duration))
    }
    const up = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      target.removeEventListener('lostpointercapture', up)
    }
    const move = (e: PointerEvent) => {
      if (e.buttons === 0) {
        up(e)
        return
      }
      apply(e.clientX)
    }
    apply(event.clientX)
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
    target.addEventListener('lostpointercapture', up)
  }

  const viewLeft = duration > 0 ? Math.max(0, timeToFrac(view.start, { start: 0, end: duration }) * 100) : 0
  const viewWidth =
    duration > 0 ? Math.min(100, ((view.end - view.start) / duration) * 100) : 100
  const selLeft = duration > 0 ? (start / duration) * 100 : 0
  const selWidth = duration > 0 ? ((end - start) / duration) * 100 : 0

  return (
    <div className={styles.overview} onPointerDown={onPointerDown}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {duration > 0 ? (
        <>
          <div
            className={styles.selection}
            style={{ left: `${selLeft}%`, width: `${selWidth}%` }}
          />
          <div
            className={styles.viewport}
            style={{ left: `${viewLeft}%`, width: `${viewWidth}%` }}
          >
            <button
              type="button"
              className={`${styles.edge} ${styles.edgeL}`}
              aria-label="Zoom view start"
              title="Drag to zoom"
              onPointerDown={(e) => onResizeEdge('start', e)}
            />
            <button
              type="button"
              className={`${styles.edge} ${styles.edgeR}`}
              aria-label="Zoom view end"
              title="Drag to zoom"
              onPointerDown={(e) => onResizeEdge('end', e)}
            />
          </div>
          <div ref={playheadRef} className={styles.playhead} />
          {silence ? (
            <div
              className={styles.silence}
              style={{
                left: `${(silence.startSec / duration) * 100}%`,
                width: `${((silence.endSec - silence.startSec) / duration) * 100}%`,
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
