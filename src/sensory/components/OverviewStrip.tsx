import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isDocumentHidden } from '../../app/frameBudget'
import { computeMinMax, computeMinMaxCached } from '../../audio/engine/peaks'
import { fullPlayRegion } from '../../audio/parameters/mapping'
import { engine, useEngine } from '../../hooks/useEngine'
import { useI18n } from '../../i18n'
import { colorWithAlpha, readThemeColors, subscribeThemeChange } from '../../theme'
import { regionFromDrag, workingTimeFromSource } from '../visualization/sampleRegion'
import styles from './OverviewStrip.module.css'

type Props = {
  duration: number
  loaded: boolean
  contentRev: number
  onRegionCommit: () => void
}

function sourceTimes(duration: number) {
  const source = engine.getSourceBuffer() ?? engine.getBuffer()
  const working = engine.getBuffer()
  const prep = engine.getPrep()
  const sourceDur = source?.duration || duration
  const workDur = working?.duration || duration
  const trimmed = Boolean(source && working && source !== working)
  const windowStart = trimmed ? prep.windowStart : 0
  const snap = engine.getSnapshot()
  return {
    source,
    sourceDur,
    workDur,
    windowStart,
    start: windowStart + snap.params.start,
    end: windowStart + snap.params.end,
  }
}

export function OverviewStrip({ duration, loaded, contentRev, onRegionCommit }: Props) {
  const { t } = useI18n()
  const snap = useEngine()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const lastTap = useRef(0)
  const drag = useRef<{ pointerId: number; originFrac: number; moved: boolean; mode: 'select' | 'start' | 'end' } | null>(
    null,
  )


  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
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
      const view = sourceTimes(duration)
      const colors = readThemeColors()
      if (!view.source || view.sourceDur <= 0) return
      const data = view.source.getChannelData(0)
      const mips = engine.getSourceMips()[0] ?? []
      const peaks = mips.length
        ? computeMinMaxCached(data, mips, 0, data.length, width)
        : computeMinMax(data, 0, data.length, width)
      const mid = height / 2
      const half = height * 0.42
      ctx.fillStyle = colorWithAlpha(colors.waveform, 0.42)
      for (let x = 0; x < width; x++) {
        const hi = peaks.max[x] ?? 0
        const lo = peaks.min[x] ?? 0
        ctx.fillRect(x, mid - hi * half, 1, Math.max(1, (hi - lo) * half))
      }
      const sel0 = (view.start / view.sourceDur) * width
      const sel1 = (view.end / view.sourceDur) * width
      ctx.fillStyle = 'rgba(0,0,0,0.42)'
      ctx.fillRect(0, 0, sel0, height)
      ctx.fillRect(sel1, 0, width - sel1, height)
      ctx.fillStyle = colorWithAlpha(colors.selection || colors.playhead, 0.22)
      ctx.fillRect(sel0, 0, Math.max(dpr, sel1 - sel0), height)
      ctx.fillStyle = colors.playhead || colors.selectionBorder
      ctx.fillRect(sel0, 0, Math.max(1, dpr), height)
      ctx.fillRect(sel1, 0, Math.max(1, dpr), height)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    const unsub = subscribeThemeChange(draw)
    return () => {
      ro.disconnect()
      unsub()
    }
  }, [duration, loaded, contentRev, snap.params.start, snap.params.end])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (!isDocumentHidden()) {
        const el = playheadRef.current
        const view = sourceTimes(duration)
        if (el && view.sourceDur > 0) {
          const now = engine.getPlayheadSeconds() + view.windowStart
          el.style.left = `${(now / view.sourceDur) * 100}%`
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration])

  const fracAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
  }

  const applySelect = (aFrac: number, bFrac: number) => {
    const view = sourceTimes(duration)
    const a = workingTimeFromSource(aFrac * view.sourceDur, view.windowStart, view.workDur)
    const b = workingTimeFromSource(bFrac * view.sourceDur, view.windowStart, view.workDur)
    const region = regionFromDrag(a, b, view.workDur)
    engine.setRegion(region.start, region.end)
  }

  const seekAt = (frac: number) => {
    const view = sourceTimes(duration)
    engine.seekSeconds(workingTimeFromSource(frac * view.sourceDur, view.windowStart, view.workDur))
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
    if (state.moved) {
      onRegionCommit()
      return
    }
    const now = performance.now()
    if (now - lastTap.current < 380) {
      lastTap.current = 0
      const view = sourceTimes(duration)
      const full = fullPlayRegion(view.workDur)
      engine.setRegion(full.start, full.end)
      onRegionCommit()
      return
    }
    lastTap.current = now
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loaded || duration <= 0 || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const frac = fracAt(event)
    const view = sourceTimes(duration)
    const startF = view.start / view.sourceDur
    const endF = view.end / view.sourceDur
    const edge = 0.018
    let mode: 'select' | 'start' | 'end' = 'select'
    if (Math.abs(frac - startF) < edge) mode = 'start'
    else if (Math.abs(frac - endF) < edge) mode = 'end'
    drag.current = { pointerId: event.pointerId, originFrac: frac, moved: false, mode }
    if (mode === 'select') seekAt(frac)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (event.buttons === 0) {
      endDrag(event)
      return
    }
    const next = fracAt(event)
    if (Math.abs(next - state.originFrac) > 0.006) state.moved = true
    if (!state.moved) return
    const view = sourceTimes(duration)
    const startF = view.start / view.sourceDur
    const endF = view.end / view.sourceDur
    if (state.mode === 'start') applySelect(next, endF)
    else if (state.mode === 'end') applySelect(startF, next)
    else applySelect(state.originFrac, next)
  }

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      aria-label={t.sensory.overviewDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => {
        if (!loaded) return
        const view = sourceTimes(duration)
        const full = fullPlayRegion(view.workDur)
        engine.setRegion(full.start, full.end)
        onRegionCommit()
      }}
    >
      <canvas ref={canvasRef} className={styles.strip} />
      <div ref={playheadRef} className={styles.playhead} aria-hidden="true" />
    </div>
  )
}
