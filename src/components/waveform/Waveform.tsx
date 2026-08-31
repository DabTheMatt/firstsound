import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatTimecode } from '../../audio/engine/formatTime'
import { computeMinMax } from '../../audio/engine/peaks'
import { engine } from '../../hooks/useEngine'
import { Overview } from './Overview'
import {
  fitView,
  fracToTime,
  panView,
  timeToFrac,
  verticalGain,
  type View,
  zoomAround,
  zoomToSelection,
} from './viewport'
import styles from './Waveform.module.css'

type Props = {
  duration: number
  start: number
  end: number
  loaded: boolean
  onLoadDemo: () => void
}

type DragMode = 'start' | 'end' | 'move' | null
const HANDLE_PX = 18

export function Waveform({ duration, start, end, loaded, onLoadDemo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  // The parent keys this component by the loaded sample, so a fresh file remounts
  // with the whole sample in view — no reset effect required.
  const [view, setViewState] = useState<View>(() => fitView(duration || 1))
  const [normalizeView, setNormalizeView] = useState(false)
  const viewRef = useRef(view)
  const stateRef = useRef({ start, end, duration, normalizeView })

  const setView = (next: View) => {
    viewRef.current = next
    setViewState(next)
  }

  useEffect(() => {
    stateRef.current = { start, end, duration, normalizeView }
  }, [start, end, duration, normalizeView])

  // Redraw the visible window (canvas) on view / normalize / data / resize change.
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
      if (!mono || mono.length === 0 || duration <= 0) return
      const samplesPerSec = mono.length / duration
      const s = Math.floor(view.start * samplesPerSec)
      const e = Math.max(s + 1, Math.floor(view.end * samplesPerSec))
      const { min, max, peak } = computeMinMax(mono, s, e, width)
      const gain = normalizeView ? verticalGain(peak) : 1
      const mid = height / 2
      const half = height * 0.46
      ctx.fillStyle = '#9aa0a3'
      for (let x = 0; x < width; x++) {
        const hi = Math.max(-1, Math.min(1, (max[x] ?? 0) * gain))
        const lo = Math.max(-1, Math.min(1, (min[x] ?? 0) * gain))
        const top = mid - hi * half
        const bottom = mid - lo * half
        ctx.fillRect(x, top, 1, Math.max(1, bottom - top))
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [view, normalizeView, loaded, duration])

  // Playhead is refs + rAF only — never re-renders the waveform.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const el = playheadRef.current
      if (el) {
        const frac = timeToFrac(engine.getPlayheadSeconds(), viewRef.current)
        if (frac >= 0 && frac <= 1) {
          el.style.display = ''
          el.style.left = `${frac * 100}%`
        } else {
          el.style.display = 'none'
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Native wheel listener so we can preventDefault (zoom / pan) reliably.
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const onWheel = (event: WheelEvent) => {
      const { duration: d } = stateRef.current
      if (d <= 0) return
      event.preventDefault()
      const rect = overlay.getBoundingClientRect()
      const v = viewRef.current
      if (event.shiftKey) {
        const span = v.end - v.start
        const delta = ((event.deltaX || event.deltaY) / rect.width) * span
        setView(panView(v, delta, d))
      } else {
        const focus = fracToTime((event.clientX - rect.left) / rect.width, v)
        setView(zoomAround(v, event.deltaY > 0 ? 1.2 : 1 / 1.2, focus, d))
      }
    }
    overlay.addEventListener('wheel', onWheel, { passive: false })
    return () => overlay.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard: F = Fit sample, Z = Zoom to selection (plain keys, not shortcuts-for-undo).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const { start: s, end: e, duration: d } = stateRef.current
      if (d <= 0) return
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setView(fitView(d))
      } else if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault()
        setView(zoomToSelection(s, e, d))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pointers = useRef(new Map<number, number>())
  const drag = useRef<{ mode: DragMode; span: number; originT: number; origin: { start: number; end: number } } | null>(null)
  const pinch = useRef<{ dist: number; view: View; focus: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0) return
    const overlay = overlayRef.current
    if (!overlay) return
    event.preventDefault()
    overlay.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, event.clientX)

    if (pointers.current.size === 2) {
      drag.current = null
      const xs = [...pointers.current.values()]
      const rect = overlay.getBoundingClientRect()
      const midFrac = (( (xs[0] + xs[1]) / 2 ) - rect.left) / rect.width
      pinch.current = {
        dist: Math.max(1, Math.abs(xs[0] - xs[1])),
        view: viewRef.current,
        focus: fracToTime(midFrac, viewRef.current),
      }
      return
    }

    const rect = overlay.getBoundingClientRect()
    const width = rect.width
    const x = event.clientX - rect.left
    const startX = timeToFrac(start, viewRef.current) * width
    const endX = timeToFrac(end, viewRef.current) * width
    const t = fracToTime(x / width, viewRef.current)
    let mode: DragMode = 'move'
    if (Math.abs(x - startX) < HANDLE_PX) mode = 'start'
    else if (Math.abs(x - endX) < HANDLE_PX) mode = 'end'
    else if (x < startX || x > endX) {
      engine.setParam('start', t)
      mode = 'start'
    }
    drag.current = { mode, span: end - start, originT: t, origin: { start, end } }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    // Mouse released outside the window: stop dragging instead of "sticking".
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      endPointer(event)
      return
    }
    pointers.current.set(event.pointerId, event.clientX)
    const overlay = overlayRef.current
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()

    if (pinch.current && pointers.current.size >= 2) {
      const xs = [...pointers.current.values()]
      const dist = Math.max(1, Math.abs(xs[0] - xs[1]))
      const factor = pinch.current.dist / dist
      setView(zoomAround(pinch.current.view, factor, pinch.current.focus, duration))
      return
    }
    if (!drag.current) return
    const next = fracToTime((event.clientX - rect.left) / rect.width, viewRef.current)
    const { mode, span, originT, origin } = drag.current
    if (mode === 'start') engine.setParam('start', next)
    else if (mode === 'end') engine.setParam('end', next)
    else {
      const delta = next - originT
      const maxStart = Math.max(0, duration - span)
      const s = Math.min(maxStart, Math.max(0, origin.start + delta))
      engine.setRegion(s, s + span)
    }
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      overlayRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  const onDoubleClick = () => {
    if (duration <= 0) return
    const full = start <= 0.001 && end >= duration - 0.001
    setView(full ? fitView(duration) : zoomToSelection(start, end, duration))
  }

  const pct = (t: number) => timeToFrac(t, view) * 100
  const startPct = pct(start)
  const endPct = pct(end)
  const regionLeft = Math.max(0, Math.min(100, startPct))
  const regionRight = Math.max(0, Math.min(100, endPct))

  const ticks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((p) => formatTimecode(view.start + (view.end - view.start) * p))
  }, [view])

  const zoomBy = (factor: number) => {
    setView(zoomAround(viewRef.current, factor, (view.start + view.end) / 2, duration))
  }

  return (
    <div className={styles.editor}>
      {loaded && duration > 0 ? (
        <div className={styles.toolbar}>
          <button type="button" className={styles.tool} onClick={() => setView(fitView(duration))}>
            Fit
          </button>
          <button
            type="button"
            className={styles.tool}
            onClick={() => setView(zoomToSelection(start, end, duration))}
          >
            Zoom to Selection
          </button>
          <button
            type="button"
            className={`${styles.tool} ${normalizeView ? styles.toolActive : ''}`}
            aria-pressed={normalizeView}
            onClick={() => setNormalizeView((n) => !n)}
          >
            Normalize View
          </button>
          <div className={styles.spacer} />
          <button type="button" className={styles.iconTool} aria-label="Zoom out" onClick={() => zoomBy(1.4)}>
            −
          </button>
          <button type="button" className={styles.iconTool} aria-label="Zoom in" onClick={() => zoomBy(1 / 1.4)}>
            +
          </button>
        </div>
      ) : null}

      <div className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <div
          ref={overlayRef}
          className={styles.overlay}
          onPointerDown={loaded ? onPointerDown : undefined}
          onPointerMove={loaded ? onPointerMove : undefined}
          onPointerUp={loaded ? endPointer : undefined}
          onPointerCancel={loaded ? endPointer : undefined}
          onDoubleClick={loaded ? onDoubleClick : undefined}
        >
          {loaded && duration > 0 ? (
            <>
              <div
                className={styles.region}
                style={{ left: `${regionLeft}%`, width: `${Math.max(0, regionRight - regionLeft)}%` }}
              />
              {startPct >= 0 && startPct <= 100 ? (
                <button
                  type="button"
                  className={styles.handle}
                  style={{ left: `${startPct}%` }}
                  aria-label="Region start"
                />
              ) : null}
              {endPct >= 0 && endPct <= 100 ? (
                <button
                  type="button"
                  className={styles.handle}
                  style={{ left: `${endPct}%` }}
                  aria-label="Region end"
                />
              ) : null}
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

      {loaded && duration > 0 ? (
        <Overview duration={duration} start={start} end={end} view={view} onScrub={setView} />
      ) : null}
    </div>
  )
}
